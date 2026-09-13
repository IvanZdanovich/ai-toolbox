/**
 * Editor Tab Integration Tests
 *
 * The class is composed from four mode-specific files (./template-edit.js,
 * ./template-run.js, ./workflow-edit.js, ./workflow-run.js) mixed onto one
 * prototype in ./index.js. These tests are a wiring smoke test across all
 * four type/mode combinations — confirming each mode renders its markup and
 * initializes without error — not a full behavioral suite per mode.
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
    EditorTab = (await import('../../../../shared/components/editor-tab/index.js'))
      .default;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    delete HTMLElement.prototype.animate;
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
      mockTemplateManager.getTemplate.mockResolvedValue(fixtures.templates.email);

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

  describe('Scenario: Unknown editor request', () => {
    it('should render a fallback message instead of throwing', async () => {
      const tab = await mountAndSettle({ type: 'nonsense', mode: 'nonsense' });

      expect(tab.root.textContent).toContain('Unknown editor request');
    });
  });
});
