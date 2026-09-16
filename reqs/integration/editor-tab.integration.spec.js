/**
 * Editor tab — integration.
 *
 * Primary module: chrome-extension/shared/components/editor-tab/index.js — the
 * directory module the side panel mounts for every edit, run and chat pane.
 * Its contract is with the managers behind it: template-manager and
 * workflow-manager (what it loads and what a run needs), agent-runtime and
 * ai-service (how a run is driven and what comes back), history-manager (what
 * a finished run leaves behind). All of them stay real; only the platform edge
 * is doubled — chrome.* from the mock, and `fetch` for the provider endpoint.
 *
 * A real provider is configured rather than the demo one: the demo provider
 * sleeps for a random interval and fails one call in ten by design, which is
 * exactly what a spec must not depend on.
 *
 * Origin: layout.adr-4.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installChromeMock,
  uninstallChromeMock,
  testUtils,
} from '../support/chrome-api.mock.js';
import { STORAGE_KEYS } from '../../chrome-extension/constraints/storage.constraints.js';

const EDITOR_TAB =
  '../../chrome-extension/shared/components/editor-tab/index.js';
const TEMPLATE_MANAGER = '../../chrome-extension/shared/template-manager.js';
const WORKFLOW_MANAGER = '../../chrome-extension/shared/workflow-manager.js';
const HISTORY_MANAGER = '../../chrome-extension/shared/history-manager.js';
const AI_SERVICE = '../../chrome-extension/shared/ai-service.js';

let chatReplies;
let chatRequests;
let modules;

function modelSays(content) {
  return { choices: [{ message: { content } }] };
}

// The accessible name of a field, however it was given one: a <label for> or
// an aria-label both satisfy the requirement, so the spec asks for the name
// rather than for one particular attribute.
function accessibleName(field) {
  const labelled = field.id
    ? field.ownerDocument.querySelector(`label[for="${field.id}"]`)
    : null;
  return (labelled?.textContent ?? field.getAttribute('aria-label'))?.trim();
}

function installFetchDouble() {
  globalThis.fetch = vi.fn(async (url, init) => {
    chatRequests.push(JSON.parse(init.body));
    const reply = chatReplies.shift();
    if (!reply) {
      return {
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => ({ error: { message: 'No reply queued' } }),
      };
    }
    return { ok: true, status: 200, json: async () => modelSays(reply) };
  });
  return globalThis.fetch;
}

// The toast singleton grabs #toastContainer when it is first imported, so the
// page's container has to exist before the module graph is loaded.
async function loadModules() {
  document.body.innerHTML = '<div id="toastContainer"></div>';
  vi.resetModules();
  const [
    EditorTab,
    templateManager,
    workflowManager,
    historyManager,
    aiService,
  ] = await Promise.all([
    import(EDITOR_TAB).then((m) => m.default),
    import(TEMPLATE_MANAGER).then((m) => m.default),
    import(WORKFLOW_MANAGER).then((m) => m.default),
    import(HISTORY_MANAGER).then((m) => m.default),
    import(AI_SERVICE).then((m) => m.default),
  ]);
  await aiService.init();
  modules = {
    EditorTab,
    templateManager,
    workflowManager,
    historyManager,
    aiService,
  };
  return modules;
}

async function openTab(options) {
  const tab = new modules.EditorTab(options);
  document.body.appendChild(tab.render());
  await vi.waitFor(() => {
    expect(tab.title).not.toBe('Loading…');
  });
  return tab;
}

function fill(tab, name, value) {
  tab.q(`[name="${name}"]`).value = value;
}

function submit(tab, role) {
  tab
    .q(`[data-role="${role}"]`)
    .dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

const promptStep = (overrides = {}) => ({
  name: 'Draft',
  type: 'prompt',
  outputKey: 'draft',
  prompt: 'Write about {topic}',
  ...overrides,
});

describe('EditorTab: Given the editor tab against the real managers behind it', () => {
  beforeEach(async () => {
    installChromeMock();
    testUtils.resetStorage();
    testUtils.setStorageState({
      [STORAGE_KEYS.SETTINGS]: {
        provider: 'openai',
        apiKeys: { openai: 'sk-test' },
      },
      [STORAGE_KEYS.TEMPLATES_SEEDED]: true,
      [STORAGE_KEYS.WORKFLOWS_SEEDED]: true,
    });
    chatReplies = [];
    chatRequests = [];
    installFetchDouble();
    await loadModules();
  });

  afterEach(() => {
    uninstallChromeMock();
    document.body.innerHTML = '';
    delete globalThis.fetch;
    vi.restoreAllMocks();
  });

  describe('EditorTab: When a template is run', () => {
    async function openTemplateRun(overrides = {}, tabOptions = {}) {
      const template = await modules.templateManager.createTemplate({
        name: 'Greeter',
        prompt: 'Say hello to {name}',
        ...overrides,
      });
      const tab = await openTab({
        type: 'template',
        mode: 'run',
        id: template.id,
        ...tabOptions,
      });
      return { template, tab };
    }

    it('EditorTab: Then it offers one field per variable the saved template declares', async () => {
      const { tab } = await openTemplateRun({
        prompt: 'Say {greeting} to {name}',
      });

      const names = [...tab.qa('[data-role="execute-inputs"] textarea')].map(
        (field) => field.name
      );
      expect(names).toEqual(['greeting', 'name']);
    });

    it('EditorTab: Then it gives every field an accessible name, not just a placeholder', async () => {
      const { tab } = await openTemplateRun();

      const field = tab.q('[data-role="execute-inputs"] textarea');
      expect(accessibleName(field)).toBe('Name');
    });

    it('EditorTab: Then it says so when the template it was opened for is gone', async () => {
      const tab = await openTab({
        type: 'template',
        mode: 'run',
        id: 'deleted',
      });

      expect(tab.title).toBe('Template not found');
    });

    it('EditorTab: Then it starts from the values it was opened with', async () => {
      const { tab } = await openTemplateRun(
        {},
        { prefillInputs: { name: 'Ada' } }
      );

      expect(tab.q('[name="name"]').value).toBe('Ada');
    });

    it('EditorTab: Then it shows the provider’s answer as the result', async () => {
      const { tab } = await openTemplateRun();
      chatReplies.push('Hello Ada');
      fill(tab, 'name', 'Ada');

      submit(tab, 'execute-form');

      await vi.waitFor(() => {
        expect(
          tab.q('[data-role="execute-result"]').classList.contains('hidden')
        ).toBe(false);
      });
      expect(tab.q('[data-role="result-content"]').textContent).toBe(
        'Hello Ada'
      );
    });

    it('EditorTab: Then it sends the template prompt with the filled-in values', async () => {
      const { tab } = await openTemplateRun();
      chatReplies.push('Hello Ada');
      fill(tab, 'name', 'Ada');

      submit(tab, 'execute-form');

      await vi.waitFor(() => {
        expect(chatRequests).toHaveLength(1);
      });
      expect(chatRequests[0].messages.at(-1).content).toBe('Say hello to Ada');
    });

    it('EditorTab: Then it records the finished run in history', async () => {
      const { template, tab } = await openTemplateRun();
      chatReplies.push('Hello Ada');
      fill(tab, 'name', 'Ada');

      submit(tab, 'execute-form');

      await vi.waitFor(async () => {
        const history = await modules.historyManager.getAllHistory();
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({
          templateId: template.id,
          templateName: 'Greeter',
          status: 'completed',
          result: 'Hello Ada',
        });
      });
    });

    it('EditorTab: Then it shows the provider’s error and records the run as failed', async () => {
      const { tab } = await openTemplateRun();
      fill(tab, 'name', 'Ada'); // nothing queued: the endpoint answers 500

      submit(tab, 'execute-form');

      await vi.waitFor(() => {
        expect(
          tab.q('[data-role="execute-error"]').classList.contains('hidden')
        ).toBe(false);
      });
      expect(tab.q('.error-message').textContent).toMatch(/No reply queued/);
      const history = await modules.historyManager.getAllHistory();
      expect(history[0].status).toBe('failed');
    });

    it('EditorTab: Then it re-enables the run button once a run ends', async () => {
      const { tab } = await openTemplateRun();
      chatReplies.push('Hello Ada');

      submit(tab, 'execute-form');

      await vi.waitFor(() => {
        expect(tab.q('[data-role="execute-run-btn"]').disabled).toBe(false);
      });
      expect(tab.q('[data-role="execute-run-btn"]').textContent).toBe(
        'Run Template'
      );
    });

    it('EditorTab: Then it renders a template’s input label as text rather than markup', async () => {
      const { tab } = await openTemplateRun({
        name: 'Nasty',
        prompt: 'Do {thing}',
        inputs: [{ name: 'thing', label: '<img src=x onerror=alert(1)>' }],
      });

      expect(tab.q('[data-role="execute-inputs"] img')).toBeNull();
    });
  });

  describe('EditorTab: When a result is followed up', () => {
    it('EditorTab: Then it opens a thread seeded with the run once it completes', async () => {
      const template = await modules.templateManager.createTemplate({
        name: 'Greeter',
        prompt: 'Say hello to {name}',
      });
      const tab = await openTab({
        type: 'template',
        mode: 'run',
        id: template.id,
      });
      chatReplies.push('Hello Ada');
      fill(tab, 'name', 'Ada');

      submit(tab, 'execute-form');

      await vi.waitFor(() => {
        expect(
          tab.q('[data-role="chat-section"]').classList.contains('hidden')
        ).toBe(false);
      });
      expect(tab.q('[data-role="chat-thread"]').textContent).toContain(
        'Hello Ada'
      );
    });

    it('EditorTab: Then it sends the whole thread, so a follow-up keeps the run’s context', async () => {
      const tab = await openTab({ type: 'chat' });
      chatReplies.push('Hi there', 'Still here');
      tab.q('[data-role="chat-input"]').value = 'Hello';

      submit(tab, 'chat-form');
      await vi.waitFor(() => {
        expect(tab.q('[data-role="chat-thread"]').textContent).toContain(
          'Hi there'
        );
      });
      tab.q('[data-role="chat-input"]').value = 'And again';
      submit(tab, 'chat-form');

      await vi.waitFor(() => {
        expect(chatRequests).toHaveLength(2);
      });
      expect(chatRequests[1].messages.map((m) => m.content)).toEqual([
        'Hello',
        'Hi there',
        'And again',
      ]);
    });

    it('EditorTab: Then it hands an unanswered message back so it can be sent again', async () => {
      const tab = await openTab({ type: 'chat' });
      // Nothing queued: the endpoint answers 500.
      tab.q('[data-role="chat-input"]').value = 'Hello';

      submit(tab, 'chat-form');

      await vi.waitFor(() => {
        expect(tab.q('[data-role="chat-input"]').value).toBe('Hello');
      });
      expect(tab.conversation).toHaveLength(0);
    });

    it('EditorTab: Then it titles a chat tab after the first message sent in it', async () => {
      const tab = await openTab({ type: 'chat' });
      chatReplies.push('Hi there');
      tab.q('[data-role="chat-input"]').value = 'Explain otters';

      submit(tab, 'chat-form');

      await vi.waitFor(() => {
        expect(tab.title).toBe('Explain otters');
      });
    });
  });

  describe('EditorTab: When a workflow is run', () => {
    async function openWorkflowRun(steps, tabOptions = {}) {
      const workflow = await modules.workflowManager.createWorkflow({
        name: 'Two step',
        steps,
      });
      const tab = await openTab({
        type: 'workflow',
        mode: 'run',
        id: workflow.id,
        ...tabOptions,
      });
      return { workflow, tab };
    }

    it('EditorTab: Then it offers one field per input its steps reference', async () => {
      const { tab } = await openWorkflowRun([
        promptStep(),
        promptStep({
          outputKey: 'polish',
          prompt: 'Polish {steps.draft} for {audience}',
        }),
      ]);

      const names = [...tab.qa('[data-role="run-inputs"] textarea')].map(
        (field) => field.name
      );
      // {steps.draft} is a reference to an earlier step, not a user input.
      expect(names).toEqual(['topic', 'audience']);
    });

    it('EditorTab: Then it gives every input an accessible name, not just a placeholder', async () => {
      const { tab } = await openWorkflowRun([promptStep()]);

      expect(accessibleName(tab.q('[data-role="run-inputs"] textarea'))).toBe(
        'Topic'
      );
    });

    it('EditorTab: Then it shows a timeline row per step and marks each one done', async () => {
      const { tab } = await openWorkflowRun([
        promptStep(),
        promptStep({ outputKey: 'polish', prompt: 'Polish {previous}' }),
      ]);
      chatReplies.push('draft text', 'polished text');

      submit(tab, 'run-form');

      await vi.waitFor(() => {
        const statuses = [...tab.qa('.run-step-status')].map(
          (element) => element.dataset.status
        );
        expect(statuses).toEqual(['completed', 'completed']);
      });
    });

    it('EditorTab: Then it shows the last step’s output as the run result', async () => {
      const { tab } = await openWorkflowRun([promptStep()]);
      chatReplies.push('the finished piece');

      submit(tab, 'run-form');

      await vi.waitFor(() => {
        expect(tab.q('[data-role="run-result-content"]').textContent).toBe(
          'the finished piece'
        );
      });
    });

    it('EditorTab: Then it records the run in history under the workflow’s name', async () => {
      const { workflow, tab } = await openWorkflowRun([promptStep()]);
      chatReplies.push('output');

      submit(tab, 'run-form');

      await vi.waitFor(async () => {
        const [entry] = await modules.historyManager.getAllHistory();
        expect(entry).toMatchObject({
          templateId: workflow.id,
          templateName: 'Two step (workflow)',
          status: 'completed',
        });
      });
    });

    it('EditorTab: Then it marks the failing step and records the run as failed', async () => {
      const { tab } = await openWorkflowRun([
        promptStep(),
        promptStep({ outputKey: 'polish', prompt: 'Polish {previous}' }),
      ]);
      chatReplies.push('draft text'); // the second call has nothing queued

      submit(tab, 'run-form');

      await vi.waitFor(() => {
        const statuses = [...tab.qa('.run-step-status')].map(
          (element) => element.dataset.status
        );
        expect(statuses).toEqual(['completed', 'failed']);
      });
      expect(
        tab.q('[data-role="run-error"]').classList.contains('hidden')
      ).toBe(false);
      const [entry] = await modules.historyManager.getAllHistory();
      expect(entry.status).toBe('failed');
    });

    it('EditorTab: Then it offers a stop button only while a run is in flight', async () => {
      const { tab } = await openWorkflowRun([promptStep()]);
      chatReplies.push('output');
      expect(
        tab.q('[data-role="run-stop-btn"]').classList.contains('hidden')
      ).toBe(true);

      submit(tab, 'run-form');

      await vi.waitFor(() => {
        expect(
          tab.q('[data-role="run-stop-btn"]').classList.contains('hidden')
        ).toBe(false);
      });
      await vi.waitFor(() => {
        expect(
          tab.q('[data-role="run-stop-btn"]').classList.contains('hidden')
        ).toBe(true);
      });
    });

    it('EditorTab: Then it aborts the run in flight when the tab is closed', async () => {
      const { tab } = await openWorkflowRun([
        promptStep(),
        promptStep({ outputKey: 'polish', prompt: 'Polish {previous}' }),
      ]);
      chatReplies.push('draft text', 'polished text');

      submit(tab, 'run-form');
      await vi.waitFor(() => {
        expect(tab.runController).not.toBeNull();
      });
      const controller = tab.runController;
      tab.destroy();

      expect(controller.signal.aborted).toBe(true);
    });
  });
});
