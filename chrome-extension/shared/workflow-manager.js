import storage from './storage.js';
import { generateId } from './helpers.js';
import {
  LIMITS,
  EVENTS,
  EXTENSION_VERSION,
  WORKFLOW_STEP_TYPES,
} from './constants.js';
import { AGENT_TOOL_NAMES } from './agent-tools.js';

/**
 * Agentic workflows: an ordered list of steps that share one context.
 *
 * Step types:
 *   prompt   — one model call; its text output lands in the shared context
 *   agent    — a tool-calling loop that runs until the model stops asking for
 *              tools or hits its iteration budget
 *   template — runs one of the user's saved templates
 *
 * Steps reference earlier output with {steps.<outputKey>} or {previous}; any
 * other {placeholder} becomes an input the user fills in before the run.
 */

const STEP_REFERENCE = /^(?:steps\.[\w-]+|previous)$/;

export function extractWorkflowVariables(workflow) {
  const variables = [];

  (workflow.steps || []).forEach((step) => {
    const regex = /\{([^}]+)\}/g;
    let match;
    while ((match = regex.exec(step.prompt || '')) !== null) {
      const name = match[1].trim();
      if (!STEP_REFERENCE.test(name) && !variables.includes(name)) {
        variables.push(name);
      }
    }
  });

  return variables;
}

export function validateWorkflow(workflow) {
  const errors = [];

  if (!workflow.name || workflow.name.trim().length === 0) {
    errors.push('Workflow name is required');
  } else if (workflow.name.length > LIMITS.MAX_TEMPLATE_NAME_LENGTH) {
    errors.push(
      `Workflow name must be ${LIMITS.MAX_TEMPLATE_NAME_LENGTH} characters or less`
    );
  }

  if (
    workflow.description &&
    workflow.description.length > LIMITS.MAX_TEMPLATE_DESCRIPTION_LENGTH
  ) {
    errors.push(
      `Workflow description must be ${LIMITS.MAX_TEMPLATE_DESCRIPTION_LENGTH} characters or less`
    );
  }

  const steps = workflow.steps || [];
  if (steps.length === 0) {
    errors.push('A workflow needs at least one step');
  } else if (steps.length > LIMITS.MAX_WORKFLOW_STEPS) {
    errors.push(`A workflow can have at most ${LIMITS.MAX_WORKFLOW_STEPS} steps`);
  }

  const seenKeys = new Set();

  steps.forEach((step, index) => {
    const label = `Step ${index + 1}`;

    if (!Object.values(WORKFLOW_STEP_TYPES).includes(step.type)) {
      errors.push(`${label}: unknown step type "${step.type}"`);
    }

    if (step.type === WORKFLOW_STEP_TYPES.TEMPLATE) {
      if (!step.templateId) {
        errors.push(`${label}: choose a template to run`);
      }
    } else if (!step.prompt || step.prompt.trim().length === 0) {
      errors.push(`${label}: prompt is required`);
    } else if (step.prompt.length > LIMITS.MAX_TEMPLATE_PROMPT_LENGTH) {
      errors.push(
        `${label}: prompt must be ${LIMITS.MAX_TEMPLATE_PROMPT_LENGTH} characters or less`
      );
    }

    if (step.type === WORKFLOW_STEP_TYPES.AGENT) {
      const tools = step.tools || [];
      if (tools.length === 0) {
        errors.push(`${label}: an agent step needs at least one tool enabled`);
      }
      tools.forEach((tool) => {
        if (!AGENT_TOOL_NAMES.includes(tool)) {
          errors.push(`${label}: unknown tool "${tool}"`);
        }
      });

      const iterations = Number(step.maxIterations);
      if (
        step.maxIterations !== undefined &&
        (!Number.isInteger(iterations) ||
          iterations < 1 ||
          iterations > LIMITS.MAX_AGENT_ITERATIONS)
      ) {
        errors.push(
          `${label}: max iterations must be between 1 and ${LIMITS.MAX_AGENT_ITERATIONS}`
        );
      }
    }

    if (!step.outputKey || !/^[\w-]+$/.test(step.outputKey)) {
      errors.push(
        `${label}: output key must be letters, numbers, dashes or underscores`
      );
    } else if (seenKeys.has(step.outputKey)) {
      errors.push(`${label}: duplicate output key "${step.outputKey}"`);
    } else {
      seenKeys.add(step.outputKey);
    }
  });

  return errors;
}

// Fills in the fields the editor may leave off and drops anything unknown, so
// what reaches storage always matches the documented step shape.
function normalizeStep(step, index) {
  const type = step.type || WORKFLOW_STEP_TYPES.PROMPT;
  const normalized = {
    id: step.id || generateId(),
    name: (step.name || `Step ${index + 1}`).trim(),
    type,
    outputKey: (step.outputKey || `step_${index + 1}`).trim(),
    prompt: (step.prompt || '').trim(),
  };

  if (step.provider) {
    normalized.provider = step.provider;
  }
  if (step.model) {
    normalized.model = step.model;
  }

  if (type === WORKFLOW_STEP_TYPES.AGENT) {
    normalized.tools = (step.tools || []).filter((tool) =>
      AGENT_TOOL_NAMES.includes(tool)
    );
    normalized.maxIterations =
      Number(step.maxIterations) || LIMITS.DEFAULT_AGENT_ITERATIONS;
  }

  if (type === WORKFLOW_STEP_TYPES.TEMPLATE) {
    normalized.templateId = step.templateId;
  }

  return normalized;
}

class WorkflowManager {
  constructor() {
    this.workflows = [];
    this.listeners = new Map();
    this.initialized = false;
    this.initPromise = null;
  }

  async init() {
    if (this.initialized) {
      return;
    }

    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          this.workflows = await storage.getWorkflows();
          await this.seedDefaultWorkflows();
          this.initialized = true;
        } catch (error) {
          console.error('Failed to initialize WorkflowManager:', error);
        } finally {
          this.initPromise = null;
        }
      })();
    }

    return this.initPromise;
  }

  async seedDefaultWorkflows() {
    if (await storage.getWorkflowsSeeded()) {
      return;
    }

    // Record the flag either way, so emptying the list later can't re-seed.
    if (this.workflows.length > 0) {
      await storage.setWorkflowsSeeded(true);
      return;
    }

    const now = new Date().toISOString();
    const defaults = [
      {
        name: 'Research Brief',
        description:
          'Agent gathers sources on a topic, then writes a structured brief',
        steps: [
          {
            name: 'Gather findings',
            type: WORKFLOW_STEP_TYPES.AGENT,
            outputKey: 'findings',
            tools: ['fetch_url', 'read_page'],
            maxIterations: 5,
            prompt: `Research this topic and report what you actually found: {topic}

Focus on: {angle}

Use your tools to fetch real sources rather than answering from memory. For each
source, note the URL and the specific claim it supports. Stop once you have three
to five solid findings and summarise them as a bulleted list.`,
          },
          {
            name: 'Write the brief',
            type: WORKFLOW_STEP_TYPES.PROMPT,
            outputKey: 'brief',
            prompt: `Write a research brief on "{topic}" using only these findings:

{steps.findings}

Structure it as:
**Summary** — three sentences a busy reader can act on
**Key findings** — bullets, each with its source URL
**Open questions** — what the sources did not settle
**Recommended next step** — one concrete action

Do not add facts that are missing from the findings.`,
          },
        ],
      },
      {
        name: 'Page to Action Items',
        description:
          'Reads the page in your active tab and turns it into tracked action items',
        steps: [
          {
            name: 'Read the page',
            type: WORKFLOW_STEP_TYPES.AGENT,
            outputKey: 'page_summary',
            tools: ['read_page'],
            maxIterations: 3,
            prompt: `Read the user's current browser tab and summarise it for someone
who has to act on it. Capture decisions, commitments, deadlines and owners.
Extra context from the user: {context}`,
          },
          {
            name: 'Extract action items',
            type: WORKFLOW_STEP_TYPES.PROMPT,
            outputKey: 'actions',
            prompt: `From this summary, produce action items:

{previous}

For each item give: owner (or "unassigned"), the action as a verb phrase, the due
date if one was stated, and a priority of High/Medium/Low. Output a markdown
table, then a one-line note about anything ambiguous. If there are no real
action items, say so plainly instead of inventing any.`,
          },
        ],
      },
      {
        name: 'Draft, Critique, Revise',
        description:
          'A reflection loop: write it, tear it apart, then rewrite it properly',
        steps: [
          {
            name: 'Draft',
            type: WORKFLOW_STEP_TYPES.PROMPT,
            outputKey: 'draft',
            prompt: `Write a first draft of {deliverable}.

Audience: {audience}
Key points to cover: {key_points}

Aim for substance over polish — the next step will critique it.`,
          },
          {
            name: 'Critique',
            type: WORKFLOW_STEP_TYPES.PROMPT,
            outputKey: 'critique',
            prompt: `Critique this draft for a {audience} audience:

{steps.draft}

Be specific and unsparing. List the three weakest parts with the reason each one
fails, any claim that is vague or unsupported, and anything the audience needs
that is missing. Do not rewrite it — only critique.`,
          },
          {
            name: 'Revise',
            type: WORKFLOW_STEP_TYPES.PROMPT,
            outputKey: 'final',
            prompt: `Rewrite the draft, resolving every point in the critique.

DRAFT:
{steps.draft}

CRITIQUE:
{steps.critique}

Return only the finished piece — no commentary about what you changed.`,
          },
        ],
      },
    ].map((workflow) => ({
      id: generateId(),
      ...workflow,
      steps: workflow.steps.map(normalizeStep),
      createdAt: now,
      updatedAt: now,
    }));

    this.workflows = defaults;
    await storage.setWorkflows(this.workflows);
    await storage.setWorkflowsSeeded(true);
  }

  async getAllWorkflows() {
    if (!this.initialized) {
      await this.init();
    }
    return [...this.workflows];
  }

  async getWorkflow(id) {
    if (!this.initialized) {
      await this.init();
    }
    return this.workflows.find((workflow) => workflow.id === id);
  }

  async createWorkflow(data) {
    if (!this.initialized) {
      await this.init();
    }

    const workflow = {
      id: generateId(),
      name: (data.name || '').trim(),
      description: (data.description || '').trim(),
      steps: (data.steps || []).map(normalizeStep),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const errors = validateWorkflow(workflow);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    if (this.workflows.length >= LIMITS.MAX_WORKFLOWS) {
      throw new Error(
        `Maximum number of workflows (${LIMITS.MAX_WORKFLOWS}) reached`
      );
    }

    this.workflows.push(workflow);
    if (!(await storage.setWorkflows(this.workflows))) {
      this.workflows.pop();
      throw new Error('Failed to save workflow — storage quota may be full');
    }

    this.emit(EVENTS.WORKFLOW_CREATED, workflow);
    return workflow;
  }

  async updateWorkflow(id, updates) {
    if (!this.initialized) {
      await this.init();
    }

    const index = this.workflows.findIndex((workflow) => workflow.id === id);
    if (index === -1) {
      throw new Error('Workflow not found');
    }

    const updated = {
      ...this.workflows[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    if (updates.steps) {
      updated.steps = updates.steps.map(normalizeStep);
    }

    const errors = validateWorkflow(updated);
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const previous = this.workflows[index];
    this.workflows[index] = updated;
    if (!(await storage.setWorkflows(this.workflows))) {
      this.workflows[index] = previous;
      throw new Error('Failed to save workflow — storage quota may be full');
    }

    this.emit(EVENTS.WORKFLOW_UPDATED, updated);
    return updated;
  }

  async deleteWorkflow(id) {
    if (!this.initialized) {
      await this.init();
    }

    const index = this.workflows.findIndex((workflow) => workflow.id === id);
    if (index === -1) {
      throw new Error('Workflow not found');
    }

    const deleted = this.workflows.splice(index, 1)[0];
    if (!(await storage.setWorkflows(this.workflows))) {
      this.workflows.splice(index, 0, deleted);
      throw new Error('Failed to delete workflow — storage write failed');
    }

    this.emit(EVENTS.WORKFLOW_DELETED, deleted);
    return deleted;
  }

  async duplicateWorkflow(id) {
    const original = await this.getWorkflow(id);
    if (!original) {
      throw new Error('Workflow not found');
    }

    const suffix = ' (Copy)';
    const name =
      original.name.length + suffix.length <= LIMITS.MAX_TEMPLATE_NAME_LENGTH
        ? original.name + suffix
        : original.name
            .slice(0, LIMITS.MAX_TEMPLATE_NAME_LENGTH - suffix.length)
            .trim() + suffix;

    return this.createWorkflow({
      ...original,
      name,
      // Fresh ids, so editing the copy can't touch the original's steps.
      steps: original.steps.map((step) => ({ ...step, id: undefined })),
    });
  }

  async searchWorkflows(query) {
    if (!this.initialized) {
      await this.init();
    }

    if (!query || query.trim().length === 0) {
      return [...this.workflows];
    }

    const term = query.toLowerCase().trim();
    return this.workflows.filter(
      (workflow) =>
        workflow.name.toLowerCase().includes(term) ||
        workflow.description.toLowerCase().includes(term) ||
        workflow.steps.some((step) =>
          (step.prompt || '').toLowerCase().includes(term)
        )
    );
  }

  async exportWorkflows(ids) {
    const all = await this.getAllWorkflows();
    return {
      workflows: ids ? all.filter((w) => ids.includes(w.id)) : all,
      exportedAt: new Date().toISOString(),
      version: EXTENSION_VERSION,
    };
  }

  async importWorkflows(data) {
    if (!data.workflows || !Array.isArray(data.workflows)) {
      throw new Error('Invalid import data format');
    }

    const imported = [];
    const errors = [];

    for (const candidate of data.workflows) {
      try {
        imported.push(await this.createWorkflow(candidate));
      } catch (error) {
        errors.push(`Failed to import "${candidate.name}": ${error.message}`);
      }
    }

    return { imported, errors };
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) {
      return;
    }
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) {
      return;
    }
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

const workflowManager = new WorkflowManager();
export default workflowManager;