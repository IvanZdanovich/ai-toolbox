/**
 * Workflow Manager Integration Tests
 *
 * Tests the agentic workflow lifecycle including:
 * - Workflow CRUD operations
 * - Step validation (prompt / agent / template steps)
 * - Default workflow seeding
 * - Input variable extraction
 * - Import / export
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  installChromeMock,
  uninstallChromeMock,
  testUtils,
} from '../../support/chrome-api.mock.js';
import { MAX_WORKFLOW_STEPS } from '../../../chrome-extension/constraints/workflow.constraints.js';
import { MAX_AGENT_ITERATIONS } from '../../../chrome-extension/constraints/agent.constraints.js';

vi.mock('../../../chrome-extension/shared/storage.js', () => ({
  default: {
    getWorkflows: vi.fn().mockResolvedValue([]),
    setWorkflows: vi.fn().mockResolvedValue(true),
    getWorkflowsSeeded: vi.fn().mockResolvedValue(true),
    setWorkflowsSeeded: vi.fn().mockResolvedValue(true),
  },
}));

const promptStep = (overrides = {}) => ({
  name: 'Draft',
  type: 'prompt',
  outputKey: 'draft',
  prompt: 'Write about {topic}',
  ...overrides,
});

describe('WorkflowManager: Given the workflow manager over a doubled storage', () => {
  let workflowManager;
  let extractWorkflowVariables;
  let storage;

  beforeEach(async () => {
    installChromeMock();
    testUtils.resetStorage();
    vi.resetModules();

    storage = (await import('../../../chrome-extension/shared/storage.js'))
      .default;
    storage.getWorkflows.mockResolvedValue([]);
    storage.setWorkflows.mockResolvedValue(true);
    // Seeding is off by default so tests start from an empty, predictable list.
    storage.getWorkflowsSeeded.mockResolvedValue(true);
    storage.setWorkflowsSeeded.mockResolvedValue(true);

    const module =
      await import('../../../chrome-extension/shared/workflow-manager.js');
    workflowManager = module.default;
    extractWorkflowVariables = module.extractWorkflowVariables;

    workflowManager.workflows = [];
    workflowManager.initialized = false;
    workflowManager.initPromise = null;
    workflowManager.listeners = new Map();
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.clearAllMocks();
  });

  describe('WorkflowManager: When a workflow is created', () => {
    it('WorkflowManager: Then it creates a multi-step workflow and persist it', async () => {
      const workflow = await workflowManager.createWorkflow({
        name: 'Research Flow',
        description: 'Gather then write',
        steps: [
          {
            name: 'Gather',
            type: 'agent',
            outputKey: 'findings',
            prompt: 'Research {topic}',
            tools: ['fetch_url'],
            maxIterations: 3,
          },
          promptStep({ prompt: 'Summarise {steps.findings}' }),
        ],
      });

      expect(workflow.id).toBeDefined();
      expect(workflow.steps).toHaveLength(2);
      expect(workflow.steps[0].tools).toEqual(['fetch_url']);
      expect(storage.setWorkflows).toHaveBeenCalled();
    });

    it('WorkflowManager: Then it emits a creation event', async () => {
      const listener = vi.fn();
      workflowManager.on('workflow-created', listener);

      await workflowManager.createWorkflow({
        name: 'Flow',
        steps: [promptStep()],
      });

      expect(listener).toHaveBeenCalledOnce();
    });

    it('WorkflowManager: Then it rolls back when the storage write fails', async () => {
      storage.setWorkflows.mockResolvedValue(false);

      await expect(
        workflowManager.createWorkflow({ name: 'Flow', steps: [promptStep()] })
      ).rejects.toThrow('storage quota');

      expect(await workflowManager.getAllWorkflows()).toHaveLength(0);
    });

    it('WorkflowManager: Then it fills in defaults for omitted step fields', async () => {
      const workflow = await workflowManager.createWorkflow({
        name: 'Flow',
        steps: [{ type: 'prompt', prompt: 'Do the thing' }],
      });

      expect(workflow.steps[0].name).toBe('Step 1');
      expect(workflow.steps[0].outputKey).toBe('step_1');
      expect(workflow.steps[0].id).toBeDefined();
    });
  });

  describe('WorkflowManager: When a workflow is validated', () => {
    it('WorkflowManager: Then it rejects a workflow with no steps', async () => {
      await expect(
        workflowManager.createWorkflow({ name: 'Empty', steps: [] })
      ).rejects.toThrow('at least one step');
    });

    it('WorkflowManager: Then it rejects a workflow without a name', async () => {
      await expect(
        workflowManager.createWorkflow({ name: '', steps: [promptStep()] })
      ).rejects.toThrow('name is required');
    });

    it('WorkflowManager: Then it rejects duplicate output keys', async () => {
      await expect(
        workflowManager.createWorkflow({
          name: 'Flow',
          steps: [promptStep(), promptStep({ name: 'Second' })],
        })
      ).rejects.toThrow('duplicate output key');
    });

    it('WorkflowManager: Then it rejects an agent step with no tools enabled', async () => {
      await expect(
        workflowManager.createWorkflow({
          name: 'Flow',
          steps: [
            {
              name: 'Agent',
              type: 'agent',
              outputKey: 'out',
              prompt: 'Go',
              tools: [],
            },
          ],
        })
      ).rejects.toThrow('at least one tool');
    });

    it('WorkflowManager: Then it drops unknown tools rather than storing them', async () => {
      const workflow = await workflowManager.createWorkflow({
        name: 'Flow',
        steps: [
          {
            name: 'Agent',
            type: 'agent',
            outputKey: 'out',
            prompt: 'Go',
            tools: ['read_page', 'launch_missiles'],
          },
        ],
      });

      expect(workflow.steps[0].tools).toEqual(['read_page']);
    });

    it('WorkflowManager: Then it rejects a template step without a template', async () => {
      await expect(
        workflowManager.createWorkflow({
          name: 'Flow',
          steps: [{ name: 'Run', type: 'template', outputKey: 'out' }],
        })
      ).rejects.toThrow('choose a template');
    });

    it('WorkflowManager: Then it rejects an out-of-range iteration budget', async () => {
      await expect(
        workflowManager.createWorkflow({
          name: 'Flow',
          steps: [
            {
              name: 'Agent',
              type: 'agent',
              outputKey: 'out',
              prompt: 'Go',
              tools: ['read_page'],
              maxIterations: MAX_AGENT_ITERATIONS + 1,
            },
          ],
        })
      ).rejects.toThrow('max iterations');
    });

    it('WorkflowManager: Then it rejects a workflow with more than the allowed number of steps', async () => {
      await expect(
        workflowManager.createWorkflow({
          name: 'Flow',
          steps: Array.from({ length: MAX_WORKFLOW_STEPS + 1 }, (_, i) =>
            promptStep({ name: `Step ${i}`, outputKey: `out${i}` })
          ),
        })
      ).rejects.toThrow(`at most ${MAX_WORKFLOW_STEPS} steps`);
    });
  });

  describe('WorkflowManager: When input variables are extracted', () => {
    it('WorkflowManager: Then it treats plain placeholders as run inputs', () => {
      const variables = extractWorkflowVariables({
        steps: [
          { prompt: 'Research {topic} for {audience}' },
          { prompt: 'Rewrite {steps.findings} for {audience}' },
        ],
      });

      expect(variables).toEqual(['topic', 'audience']);
    });

    it('WorkflowManager: Then it does not treat step references as inputs', () => {
      const variables = extractWorkflowVariables({
        steps: [{ prompt: 'Polish {previous} using {steps.critique}' }],
      });

      expect(variables).toEqual([]);
    });
  });

  describe('WorkflowManager: When a workflow is updated or deleted', () => {
    let existing;

    beforeEach(async () => {
      existing = await workflowManager.createWorkflow({
        name: 'Flow',
        steps: [promptStep()],
      });
    });

    it('WorkflowManager: Then it updates steps in place', async () => {
      const updated = await workflowManager.updateWorkflow(existing.id, {
        steps: [promptStep({ prompt: 'Rewritten prompt' })],
      });

      expect(updated.steps[0].prompt).toBe('Rewritten prompt');
      expect(updated.id).toBe(existing.id);
    });

    it('WorkflowManager: Then it rejects an update that breaks validation', async () => {
      await expect(
        workflowManager.updateWorkflow(existing.id, { name: '' })
      ).rejects.toThrow('name is required');

      const unchanged = await workflowManager.getWorkflow(existing.id);
      expect(unchanged.name).toBe('Flow');
    });

    it('WorkflowManager: Then it deletes a workflow', async () => {
      await workflowManager.deleteWorkflow(existing.id);
      expect(await workflowManager.getAllWorkflows()).toHaveLength(0);
    });

    it('WorkflowManager: Then it duplicates a workflow with fresh step ids', async () => {
      const copy = await workflowManager.duplicateWorkflow(existing.id);

      expect(copy.name).toBe('Flow (Copy)');
      expect(copy.id).not.toBe(existing.id);
      expect(copy.steps[0].id).not.toBe(existing.steps[0].id);
    });
  });

  describe('WorkflowManager: When the library is seeded on first run', () => {
    it('WorkflowManager: Then it seeds starter workflows when none exist', async () => {
      storage.getWorkflowsSeeded.mockResolvedValue(false);
      await workflowManager.init();

      const workflows = await workflowManager.getAllWorkflows();
      expect(workflows.length).toBeGreaterThan(0);
      expect(
        workflows.some((workflow) =>
          workflow.steps.some((step) => step.type === 'agent')
        )
      ).toBe(true);
      expect(storage.setWorkflowsSeeded).toHaveBeenCalledWith(true);
    });

    it('WorkflowManager: Then it does not re-seed once the user has emptied the list', async () => {
      storage.getWorkflowsSeeded.mockResolvedValue(true);
      await workflowManager.init();

      expect(await workflowManager.getAllWorkflows()).toHaveLength(0);
    });

    it('WorkflowManager: Then it marks seeded without overwriting existing workflows', async () => {
      storage.getWorkflowsSeeded.mockResolvedValue(false);
      storage.getWorkflows.mockResolvedValue([
        { id: 'w1', name: 'Mine', description: '', steps: [promptStep()] },
      ]);

      await workflowManager.init();

      const workflows = await workflowManager.getAllWorkflows();
      expect(workflows).toHaveLength(1);
      expect(workflows[0].name).toBe('Mine');
      expect(storage.setWorkflowsSeeded).toHaveBeenCalledWith(true);
    });
  });

  describe('WorkflowManager: When workflows are imported or exported', () => {
    it('WorkflowManager: Then it round-trips workflows through export and import', async () => {
      await workflowManager.createWorkflow({
        name: 'Flow',
        steps: [promptStep()],
      });

      const exported = await workflowManager.exportWorkflows();
      expect(exported.workflows).toHaveLength(1);
      expect(exported.version).toBeDefined();

      const result = await workflowManager.importWorkflows(exported);
      expect(result.imported).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(await workflowManager.getAllWorkflows()).toHaveLength(2);
    });

    it('WorkflowManager: Then it reports per-workflow import failures without aborting', async () => {
      const result = await workflowManager.importWorkflows({
        workflows: [
          { name: '', steps: [] },
          { name: 'Good', steps: [promptStep()] },
        ],
      });

      expect(result.imported).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });

    it('WorkflowManager: Then it rejects malformed import data', async () => {
      await expect(workflowManager.importWorkflows({})).rejects.toThrow(
        'Invalid import data'
      );
    });
  });

  describe('WorkflowManager: When workflows are searched', () => {
    beforeEach(async () => {
      await workflowManager.createWorkflow({
        name: 'Research Brief',
        description: 'Gathers sources',
        steps: [promptStep({ prompt: 'Find papers about {topic}' })],
      });
      await workflowManager.createWorkflow({
        name: 'Email Triage',
        description: 'Sorts the inbox',
        steps: [promptStep({ outputKey: 'triage', prompt: 'Sort {inbox}' })],
      });
    });

    it('WorkflowManager: Then it matches on name', async () => {
      const results = await workflowManager.searchWorkflows('research');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Research Brief');
    });

    it('WorkflowManager: Then it matches on step prompt text', async () => {
      const results = await workflowManager.searchWorkflows('papers');
      expect(results).toHaveLength(1);
    });

    it('WorkflowManager: Then it returns everything for an empty query', async () => {
      expect(await workflowManager.searchWorkflows('  ')).toHaveLength(2);
    });
  });
});
