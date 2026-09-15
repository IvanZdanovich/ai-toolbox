/**
 * Workflow manager — integration.
 *
 * Primary module: chrome-extension/shared/workflow-manager.js, whose contract
 * is with storage.js (what reaches chrome.storage.sync, and what comes back
 * out of it) and with agent-tools.js (which tool names an agent step may
 * name). Both stay real; only chrome.storage — the platform edge — is
 * doubled, so a changed persisted shape, a dropped chunk or a renamed tool
 * fails here rather than in the browser.
 *
 * Origin: layout.adr-4.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  chromeMock,
  installChromeMock,
  uninstallChromeMock,
  testUtils,
} from '../support/chrome-api.mock.js';
import { STORAGE_KEYS } from '../../chrome-extension/constraints/storage.constraints.js';
import {
  MAX_WORKFLOWS,
  MAX_WORKFLOW_STEPS,
} from '../../chrome-extension/constraints/workflow.constraints.js';
import { DEFAULT_AGENT_ITERATIONS } from '../../chrome-extension/constraints/agent.constraints.js';
import { MAX_TEMPLATE_PROMPT_LENGTH } from '../../chrome-extension/constraints/template.constraints.js';
import { STORAGE_CHUNK_SIZE } from '../../chrome-extension/constraints/storage.constraints.js';

const WORKFLOW_MANAGER = '../../chrome-extension/shared/workflow-manager.js';
const STORAGE = '../../chrome-extension/shared/storage.js';

// A fresh manager and a fresh storage cache, the way a reopened page gets
// them — the modules are singletons, so only a module reset separates runs.
async function freshManager() {
  vi.resetModules();
  return (await import(WORKFLOW_MANAGER)).default;
}

function promptStep(overrides = {}) {
  return {
    name: 'Draft',
    type: 'prompt',
    outputKey: 'draft',
    prompt: 'Write about {topic}',
    ...overrides,
  };
}

describe('WorkflowManager: Given the workflow manager against the real storage module', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.restoreAllMocks();
  });

  describe('WorkflowManager: When the library is seeded on first run', () => {
    it('WorkflowManager: Then it writes the starter workflows to storage on a first run', async () => {
      const manager = await freshManager();

      await manager.init();

      const stored = testUtils.getStorageState()[STORAGE_KEYS.WORKFLOWS];
      expect(stored.length).toBeGreaterThan(0);
      expect(stored.map((workflow) => workflow.name)).toContain(
        'Research Brief'
      );
    });

    it('WorkflowManager: Then it records the seeded flag so an emptied list is not re-seeded', async () => {
      const manager = await freshManager();
      await manager.init();
      const seeded = await manager.getAllWorkflows();
      for (const workflow of seeded) {
        await manager.deleteWorkflow(workflow.id);
      }

      const reopened = await freshManager();
      await reopened.init();

      expect(await reopened.getAllWorkflows()).toHaveLength(0);
    });

    it('WorkflowManager: Then it leaves workflows already in storage untouched', async () => {
      testUtils.setStorageState({
        [STORAGE_KEYS.WORKFLOWS]: [
          {
            id: 'w1',
            name: 'Mine',
            description: '',
            steps: [promptStep({ id: 's1' })],
          },
        ],
      });
      const manager = await freshManager();

      await manager.init();

      const all = await manager.getAllWorkflows();
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe('Mine');
      expect(testUtils.getStorageState()[STORAGE_KEYS.WORKFLOWS_SEEDED]).toBe(
        true
      );
    });
  });

  describe('WorkflowManager: When a workflow is persisted and read back', () => {
    it('WorkflowManager: Then it hands a created workflow to the next session through storage', async () => {
      const manager = await freshManager();
      await manager.init();

      const created = await manager.createWorkflow({
        name: 'Summarize',
        steps: [promptStep()],
      });

      const reopened = await freshManager();
      const found = await reopened.getWorkflow(created.id);
      expect(found.name).toBe('Summarize');
      expect(found.steps[0].outputKey).toBe('draft');
    });

    it('WorkflowManager: Then it carries a workflow too large for one sync item through chunked storage', async () => {
      const manager = await freshManager();
      await manager.init();
      const longPrompt = `{topic} ${'x'.repeat(MAX_TEMPLATE_PROMPT_LENGTH - 20)}`;
      const steps = Array.from({ length: 4 }, (_, index) =>
        promptStep({
          name: `Step ${index + 1}`,
          outputKey: `step_${index + 1}`,
          prompt: longPrompt,
        })
      );

      const created = await manager.createWorkflow({ name: 'Big', steps });

      // Big enough that storage.js had to split it, or the case proves nothing.
      expect(JSON.stringify(created).length).toBeGreaterThan(
        STORAGE_CHUNK_SIZE
      );
      const reopened = await freshManager();
      const found = await reopened.getWorkflow(created.id);
      expect(found.steps).toHaveLength(4);
      expect(found.steps[3].prompt).toBe(longPrompt);
    });

    it('WorkflowManager: Then it keeps the in-memory list in step with a failed storage write', async () => {
      const manager = await freshManager();
      await manager.init();
      const before = (await manager.getAllWorkflows()).length;
      vi.spyOn(chromeMock.storage.sync, 'set').mockRejectedValue(
        new Error('QUOTA_BYTES quota exceeded')
      );

      await expect(
        manager.createWorkflow({ name: 'Doomed', steps: [promptStep()] })
      ).rejects.toThrow(/storage quota/i);

      expect(await manager.getAllWorkflows()).toHaveLength(before);
    });

    it('WorkflowManager: Then it reloads what another page wrote once Chrome reports the change', async () => {
      vi.resetModules();
      const manager = (await import(WORKFLOW_MANAGER)).default;
      // Same module instance the manager reads through; the side panel is what
      // subscribes in the real extension, and that subscription is what drops
      // the cached copy a refresh would otherwise return.
      const storage = (await import(STORAGE)).default;
      await manager.init();
      storage.onChanged(() => {});
      const written = [
        {
          id: 'w9',
          name: 'From another page',
          description: '',
          steps: [promptStep({ id: 's9' })],
        },
      ];
      await chromeMock.storage.sync.set({ [STORAGE_KEYS.WORKFLOWS]: written });
      chromeMock.storage.onChanged._trigger(
        { [STORAGE_KEYS.WORKFLOWS]: { newValue: written } },
        'sync'
      );

      await manager.refresh();

      expect((await manager.getAllWorkflows())[0].name).toBe(
        'From another page'
      );
    });
  });

  describe('WorkflowManager: When a step is validated against the tool registry', () => {
    it('WorkflowManager: Then it persists only the tools the registry defines', async () => {
      const manager = await freshManager();
      await manager.init();

      const created = await manager.createWorkflow({
        name: 'Bad tool',
        steps: [
          promptStep({
            type: 'agent',
            tools: ['read_page', 'delete_everything'],
          }),
        ],
      });

      const reopened = await freshManager();
      expect((await reopened.getWorkflow(created.id)).steps[0].tools).toEqual([
        'read_page',
      ]);
    });

    it('WorkflowManager: Then it refuses an agent step once every tool it names is unknown', async () => {
      const manager = await freshManager();
      await manager.init();

      await expect(
        manager.createWorkflow({
          name: 'All bad',
          steps: [promptStep({ type: 'agent', tools: ['delete_everything'] })],
        })
      ).rejects.toThrow(/at least one tool/);
    });

    it('WorkflowManager: Then it refuses an agent step with no tool enabled', async () => {
      const manager = await freshManager();
      await manager.init();

      await expect(
        manager.createWorkflow({
          name: 'No tools',
          steps: [promptStep({ type: 'agent', tools: [] })],
        })
      ).rejects.toThrow(/at least one tool/);
    });

    it('WorkflowManager: Then it persists an agent step with the default iteration budget filled in', async () => {
      const manager = await freshManager();
      await manager.init();

      const created = await manager.createWorkflow({
        name: 'Researcher',
        steps: [promptStep({ type: 'agent', tools: ['fetch_url'] })],
      });

      const reopened = await freshManager();
      const stored = await reopened.getWorkflow(created.id);
      expect(stored.steps[0].maxIterations).toBe(DEFAULT_AGENT_ITERATIONS);
      expect(stored.steps[0].tools).toEqual(['fetch_url']);
    });

    it('WorkflowManager: Then it refuses two steps writing to the same output key', async () => {
      const manager = await freshManager();
      await manager.init();

      await expect(
        manager.createWorkflow({
          name: 'Collision',
          steps: [promptStep(), promptStep()],
        })
      ).rejects.toThrow(/duplicate output key/);
    });

    it('WorkflowManager: Then it refuses a workflow with more steps than the constraint allows', async () => {
      const manager = await freshManager();
      await manager.init();
      const steps = Array.from({ length: MAX_WORKFLOW_STEPS + 1 }, (_, i) =>
        promptStep({ outputKey: `step_${i}` })
      );

      await expect(
        manager.createWorkflow({ name: 'Too long', steps })
      ).rejects.toThrow(String(MAX_WORKFLOW_STEPS));
    });

    it('WorkflowManager: Then it refuses a template step that names no template', async () => {
      const manager = await freshManager();
      await manager.init();

      await expect(
        manager.createWorkflow({
          name: 'Dangling template step',
          steps: [promptStep({ type: 'template', templateId: '' })],
        })
      ).rejects.toThrow(/choose a template/);
    });
  });

  describe('WorkflowManager: When the library limit is reached', () => {
    it('WorkflowManager: Then it stops creating once the stored workflows reach the cap', async () => {
      const manager = await freshManager();
      testUtils.setStorageState({
        [STORAGE_KEYS.WORKFLOWS]: Array.from(
          { length: MAX_WORKFLOWS },
          (_, i) => ({
            id: `w${i}`,
            name: `Workflow ${i}`,
            description: '',
            steps: [promptStep({ id: `s${i}` })],
          })
        ),
        [STORAGE_KEYS.WORKFLOWS_SEEDED]: true,
      });
      await manager.init();

      await expect(
        manager.createWorkflow({ name: 'One too many', steps: [promptStep()] })
      ).rejects.toThrow(String(MAX_WORKFLOWS));
    });

    it('WorkflowManager: Then it gives a duplicate its own step ids so editing the copy cannot touch the original', async () => {
      const manager = await freshManager();
      await manager.init();
      const original = await manager.createWorkflow({
        name: 'Original',
        steps: [promptStep()],
      });

      const copy = await manager.duplicateWorkflow(original.id);

      expect(copy.name).toContain('(Copy)');
      expect(copy.steps[0].id).not.toBe(original.steps[0].id);
      const reopened = await freshManager();
      expect((await reopened.getWorkflow(original.id)).steps[0].id).toBe(
        original.steps[0].id
      );
    });
  });

  describe('WorkflowManager: When workflows are imported', () => {
    it('WorkflowManager: Then it imports the valid workflows and reports the ones it rejected', async () => {
      const manager = await freshManager();
      await manager.init();

      const result = await manager.importWorkflows({
        workflows: [
          { name: 'Good', steps: [promptStep()] },
          { name: '', steps: [promptStep()] },
        ],
      });

      expect(result.imported).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      const reopened = await freshManager();
      expect(
        (await reopened.getAllWorkflows()).some(
          (workflow) => workflow.name === 'Good'
        )
      ).toBe(true);
    });

    it('WorkflowManager: Then it rejects an import payload that is not a workflow export', async () => {
      const manager = await freshManager();
      await manager.init();

      await expect(manager.importWorkflows({ templates: [] })).rejects.toThrow(
        /Invalid import data/
      );
    });
  });
});
