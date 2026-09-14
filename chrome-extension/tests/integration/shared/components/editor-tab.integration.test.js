/**
 * Editor Tab Integration Tests
 *
 * The class is composed from five mode-specific files (./template-edit.js,
 * ./template-run.js, ./workflow-edit.js, ./workflow-run.js, ./chat.js) mixed
 * onto one prototype in ./index.js. Most of these tests are a wiring smoke
 * test across the type/mode combinations — confirming each mode renders its
 * markup and initializes without error — except the chat scenarios, which
 * cover ./chat.js behaviorally since its send/seed/failure paths are not
 * observable from a render check.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fixtures } from '../../../fixtures/test-data.js';

const mockTemplateManager = {
  getTemplate: vi.fn(),
  duplicateTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  createTemplate: vi.fn(),
};

const mockWorkflowManager = {
  getWorkflow: vi.fn(),
  duplicateWorkflow: vi.fn(),
  exportWorkflows: vi.fn(),
  updateWorkflow: vi.fn(),
  createWorkflow: vi.fn(),
};

const mockHistoryManager = {
  addHistoryEntry: vi.fn().mockResolvedValue(undefined),
};

const mockAiService = {
  processTemplate: vi.fn(),
  chat: vi.fn(),
};

const mockAgentRuntime = {
  runWorkflow: vi.fn(),
};

vi.mock('../../../../shared/template-manager.js', () => ({
  default: mockTemplateManager,
}));

vi.mock('../../../../shared/workflow-manager.js', () => ({
  default: mockWorkflowManager,
  extractWorkflowVariables: vi.fn(() => []),
}));

vi.mock('../../../../shared/history-manager.js', () => ({
  default: mockHistoryManager,
}));

vi.mock('../../../../shared/ai-service.js', () => ({
  default: mockAiService,
}));

vi.mock('../../../../shared/agent-runtime.js', () => ({
  default: mockAgentRuntime,
}));

describe('Editor Tab Integration', () => {
  let EditorTab;
  let consoleErrorSpy;

  beforeEach(async () => {
    document.body.innerHTML = '<div id="toastContainer"></div>';

    // jsdom has no Web Animations API; Toast.show relies on it for its
    // enter/exit animation, so stub it to finish synchronously.
    HTMLElement.prototype.animate = function stubAnimate() {
      const controls = {};
      Object.defineProperty(controls, 'onfinish', {
        set(fn) {
          if (typeof fn === 'function') fn();
        },
      });
      return controls;
    };

    vi.clearAllMocks();
    vi.resetModules();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    EditorTab = (
      await import('../../../../shared/components/editor-tab/index.js')
    ).default;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    // The animate stub stays installed: Toast schedules its animation on a
    // timer that outlives the test that raised the toast.
  });

  async function mountAndSettle(options) {
    const tab = new EditorTab(options);
    const section = tab.render();
    document.body.appendChild(section);
    await new Promise((resolve) => setTimeout(resolve, 0));
    return tab;
  }

  describe('Scenario: Creating a new template', () => {
    it('should render the edit form without error', async () => {
      const tab = await mountAndSettle({ type: 'template', mode: 'edit' });

      expect(tab.q('[data-role="template-form"]')).not.toBeNull();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: Running an existing template', () => {
    it('should render inputs generated from the template', async () => {
      mockTemplateManager.getTemplate.mockResolvedValue(
        fixtures.templates.email
      );

      const tab = await mountAndSettle({
        type: 'template',
        mode: 'run',
        id: fixtures.templates.email.id,
      });

      expect(tab.q('[data-role="execute-inputs"]').children.length).toBe(
        fixtures.templates.email.inputs.length
      );
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should show an error title when the template no longer exists', async () => {
      mockTemplateManager.getTemplate.mockResolvedValue(null);

      const tab = await mountAndSettle({
        type: 'template',
        mode: 'run',
        id: 'missing',
      });

      expect(tab.title).toBe('Template not found');
    });
  });

  describe('Scenario: Creating a new workflow', () => {
    it('should render one blank step by default', async () => {
      const tab = await mountAndSettle({ type: 'workflow', mode: 'edit' });

      expect(tab.qa('.workflow-step')).toHaveLength(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: Running an existing workflow', () => {
    it('should render the run timeline for each step', async () => {
      const workflow = {
        id: 'wf-1',
        name: 'Demo workflow',
        steps: [
          { id: 'step-1', name: 'Step 1' },
          { id: 'step-2', name: 'Step 2' },
        ],
      };
      mockWorkflowManager.getWorkflow.mockResolvedValue(workflow);

      const tab = await mountAndSettle({
        type: 'workflow',
        mode: 'run',
        id: workflow.id,
      });

      expect(tab.qa('.run-step')).toHaveLength(2);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: Ad-hoc chat tab', () => {
    it('should send the seed text as the first message and show the reply', async () => {
      mockAiService.chat.mockResolvedValue({ content: 'Hi, how can I help?' });

      const tab = await mountAndSettle({
        type: 'chat',
        mode: null,
        prefillInputs: 'What is a workflow?',
      });

      expect(mockAiService.chat).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: 'What is a workflow?' }],
      });
      expect(tab.qa('.chat-message')).toHaveLength(2);
      expect(tab.root.textContent).toContain('Hi, how can I help?');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should title the tab after the first message instead of leaving it "New Chat"', async () => {
      mockAiService.chat.mockResolvedValue({ content: 'Sure.' });

      const tab = await mountAndSettle({
        type: 'chat',
        mode: null,
        prefillInputs: 'Summarize this article',
      });

      expect(tab.title).toBe('Summarize this article');
    });

    it('should open empty and send nothing when no seed text is given', async () => {
      const tab = await mountAndSettle({ type: 'chat', mode: null });

      expect(mockAiService.chat).not.toHaveBeenCalled();
      expect(tab.qa('.chat-message')).toHaveLength(0);
      expect(
        tab.q('[data-role="chat-section"]').classList.contains('hidden')
      ).toBe(false);
    });

    it('should ignore a submit with a blank message', async () => {
      const tab = await mountAndSettle({ type: 'chat', mode: null });

      tab.q('[data-role="chat-input"]').value = '   ';
      await tab.sendChatMessage();

      expect(mockAiService.chat).not.toHaveBeenCalled();
      expect(tab.conversation).toHaveLength(0);
    });

    it('should keep placeholder text out of the assistant bubble when the provider returns nothing', async () => {
      mockAiService.chat.mockResolvedValue({ content: '' });

      const tab = await mountAndSettle({
        type: 'chat',
        mode: null,
        prefillInputs: 'Anything?',
      });

      expect(tab.conversation.at(-1)).toEqual({
        role: 'assistant',
        content: 'No response generated',
      });
    });

    it('should restore the message for retry when the provider call fails', async () => {
      mockAiService.chat.mockRejectedValue(new Error('Provider unavailable'));

      const tab = await mountAndSettle({
        type: 'chat',
        mode: null,
        prefillInputs: 'Will this fail?',
      });

      expect(tab.conversation).toHaveLength(0);
      expect(tab.qa('.chat-message')).toHaveLength(0);
      expect(tab.q('[data-role="chat-input"]').value).toBe('Will this fail?');
      expect(tab.q('[data-role="chat-send-btn"]').disabled).toBe(false);
    });

    it('should not touch the DOM when the tab is closed mid-request', async () => {
      let resolveChat;
      mockAiService.chat.mockReturnValue(
        new Promise((resolve) => {
          resolveChat = resolve;
        })
      );

      const tab = await mountAndSettle({
        type: 'chat',
        mode: null,
        prefillInputs: 'Slow one',
      });

      tab.destroy();
      resolveChat({ content: 'Too late' });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(tab.conversation.at(-1).content).toBe('Slow one');
    });
  });

  describe('Scenario: Following up on a completed run', () => {
    it('should seed the thread with the template run so the reply has context', async () => {
      mockTemplateManager.getTemplate.mockResolvedValue({
        ...fixtures.templates.email,
        systemPrompt: 'You are an email assistant.',
      });
      mockAiService.processTemplate.mockResolvedValue({
        result: 'Dear Customer, ...',
        processedPrompt: 'Write a professional email response to: ...',
        provider: 'mock',
        duration: 12,
      });

      const tab = await mountAndSettle({
        type: 'template',
        mode: 'run',
        id: fixtures.templates.email.id,
      });
      await tab.executeTemplate();

      expect(
        tab.q('[data-role="chat-section"]').classList.contains('hidden')
      ).toBe(false);
      expect(tab.conversation).toEqual([
        { role: 'system', content: 'You are an email assistant.' },
        {
          role: 'user',
          content: 'Write a professional email response to: ...',
        },
        { role: 'assistant', content: 'Dear Customer, ...' },
      ]);
      // The system message seeds the provider call but is never shown.
      expect(tab.qa('.chat-message')).toHaveLength(2);
    });

    it('should leave the thread hidden when the template run fails', async () => {
      mockTemplateManager.getTemplate.mockResolvedValue(
        fixtures.templates.email
      );
      mockAiService.processTemplate.mockRejectedValue(
        new Error('rate limited')
      );

      const tab = await mountAndSettle({
        type: 'template',
        mode: 'run',
        id: fixtures.templates.email.id,
      });
      await tab.executeTemplate();

      expect(
        tab.q('[data-role="chat-section"]').classList.contains('hidden')
      ).toBe(true);
      expect(tab.conversation).toHaveLength(0);
    });
  });

  describe('Scenario: Unknown editor request', () => {
    it('should render a fallback message instead of throwing', async () => {
      const tab = await mountAndSettle({ type: 'nonsense', mode: 'nonsense' });

      expect(tab.root.textContent).toContain('Unknown editor request');
    });
  });
});
