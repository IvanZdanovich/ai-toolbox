import workflowManager from '../../workflow-manager.js';
import { AGENT_TOOLS } from '../../agent-tools.js';
import { downloadAsJson, sanitizeText } from '../../helpers.js';
import { LIMITS, WORKFLOW_STEP_TYPES } from '../../constants.js';
import Toast from '../toast.js';

// `uid` namespaces the label/input ids — see templateEditHTML.
export function workflowEditHTML(uid) {
  return `
    <form data-role="workflow-form">
      <div class="form-group">
        <label class="form-label" for="${uid}-wf-name">Workflow Name</label>
        <input type="text" id="${uid}-wf-name" data-role="workflow-name" class="form-input" required maxlength="${LIMITS.MAX_TEMPLATE_NAME_LENGTH}" />
      </div>

      <div class="form-group">
        <label class="form-label" for="${uid}-wf-description">Description (optional)</label>
        <input type="text" id="${uid}-wf-description" data-role="workflow-description" class="form-input" maxlength="${LIMITS.MAX_TEMPLATE_DESCRIPTION_LENGTH}" />
      </div>

      <div class="workflow-steps-header">
        <h4>Steps</h4>
        <button type="button" class="btn btn-small btn-secondary" data-role="add-step-btn">
          <svg class="icon icon--sm"><use href="#icon-add"></use></svg>Add Step
        </button>
      </div>
      <p class="form-help">
        Steps run in order. Reference an earlier step with
        <code>{steps.output_key}</code> or <code>{previous}</code>; any
        other <code>{placeholder}</code> is filled in when you run the
        workflow.
      </p>

      <div data-role="workflow-steps" class="workflow-steps"></div>

      <div class="editor-actions">
        <button type="submit" class="btn btn-primary" data-role="workflow-save-btn">Save Workflow</button>
      </div>
    </form>
  `;
}

export const workflowEditMethods = {
  async initWorkflowEdit() {
    if (this.id) {
      this.currentWorkflow = await workflowManager.getWorkflow(this.id);
      if (!this.currentWorkflow) {
        this.setTitle('Workflow not found');
        Toast.show('Workflow not found', 'error');
        return;
      }
    }

    this.setTitle(this.currentWorkflow ? 'Edit Workflow' : 'Create Workflow');
    this.updateEditHeaderActions();

    if (this.currentWorkflow) {
      this.q('[data-role="workflow-name"]').value = this.currentWorkflow.name;
      this.q('[data-role="workflow-description"]').value =
        this.currentWorkflow.description || '';
    }

    this.workflowDraftSteps = this.currentWorkflow
      ? this.currentWorkflow.steps.map((step) => ({
          ...step,
          tools: [...(step.tools || [])],
        }))
      : [this.blankStep(0)];

    this.renderWorkflowSteps();

    this.q('[data-role="add-step-btn"]').addEventListener('click', () => {
      this.addWorkflowStep();
    });

    this.q('[data-role="workflow-form"]').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveWorkflow();
    });

    this.q('[data-role="editor-duplicate-btn"]').addEventListener('click', () =>
      this.duplicateWorkflow()
    );

    this.q('[data-role="editor-export-btn"]').addEventListener('click', () =>
      this.exportWorkflow()
    );
  },

  async duplicateWorkflow() {
    if (!this.currentWorkflow) {
      return;
    }

    try {
      // Duplicating creates a new workflow under the hood, so the side
      // panel's WORKFLOW_CREATED listener already shows a success toast.
      await workflowManager.duplicateWorkflow(this.currentWorkflow.id);
    } catch (error) {
      console.error('Failed to duplicate workflow:', error);
      Toast.show(`Failed to duplicate workflow: ${error.message}`, 'error');
    }
  },

  async exportWorkflow() {
    if (!this.currentWorkflow) {
      return;
    }

    try {
      const data = await workflowManager.exportWorkflows([
        this.currentWorkflow.id,
      ]);
      const workflow = data.workflows[0];
      if (!workflow) {
        Toast.show('Workflow not found', 'error');
        return;
      }

      const filename = `${workflow.name
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()}-workflow.json`;
      downloadAsJson(data, filename);
      Toast.show('Workflow exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export workflow:', error);
      Toast.show('Failed to export workflow', 'error');
    }
  },

  blankStep(index) {
    return {
      name: `Step ${index + 1}`,
      type: WORKFLOW_STEP_TYPES.PROMPT,
      outputKey: `step_${index + 1}`,
      prompt: '',
      tools: [],
      maxIterations: LIMITS.DEFAULT_AGENT_ITERATIONS,
      templateId: '',
    };
  },

  addWorkflowStep() {
    this.syncWorkflowStepsFromDom();

    if (this.workflowDraftSteps.length >= LIMITS.MAX_WORKFLOW_STEPS) {
      Toast.show(
        `A workflow can have at most ${LIMITS.MAX_WORKFLOW_STEPS} steps`,
        'warning'
      );
      return;
    }

    this.workflowDraftSteps.push(
      this.blankStep(this.workflowDraftSteps.length)
    );
    this.renderWorkflowSteps();
  },

  syncWorkflowStepsFromDom() {
    this.qa('[data-role="workflow-steps"] .workflow-step').forEach(
      (element) => {
        const step = this.workflowDraftSteps[Number(element.dataset.index)];
        if (!step) {
          return;
        }

        element.querySelectorAll('[data-field]').forEach((field) => {
          step[field.dataset.field] = field.value;
        });

        const tools = element.querySelectorAll('.step-tool:checked');
        if (element.querySelector('.step-tool')) {
          step.tools = Array.from(tools).map((tool) => tool.dataset.tool);
        }
      }
    );
  },

  renderWorkflowSteps() {
    const container = this.q('[data-role="workflow-steps"]');
    const templateOptions = this.templates
      .map(
        (template) =>
          `<option value="${template.id}">${sanitizeText(template.name)}</option>`
      )
      .join('');

    container.innerHTML = this.workflowDraftSteps
      .map((step, index) => {
        const typeOptions = [
          [WORKFLOW_STEP_TYPES.PROMPT, 'Prompt — one model call'],
          [WORKFLOW_STEP_TYPES.AGENT, 'Agent — tool-calling loop'],
          [WORKFLOW_STEP_TYPES.TEMPLATE, 'Template — run a saved template'],
        ]
          .map(
            ([value, label]) =>
              `<option value="${value}"${step.type === value ? ' selected' : ''}>${label}</option>`
          )
          .join('');

        const body =
          step.type === WORKFLOW_STEP_TYPES.TEMPLATE
            ? `<div class="workflow-field">
                 <span class="input-mini-label">Template</span>
                 <select class="form-input" data-field="templateId">
                   <option value="">Choose a template…</option>
                   ${templateOptions}
                 </select>
               </div>`
            : `<div class="workflow-field">
                 <span class="input-mini-label">${step.type === WORKFLOW_STEP_TYPES.AGENT ? 'Goal for the agent' : 'Prompt'}</span>
                 <textarea class="form-textarea" data-field="prompt" rows="4"
                   maxlength="${LIMITS.MAX_TEMPLATE_PROMPT_LENGTH}">${sanitizeText(step.prompt || '')}</textarea>
               </div>`;

        const agentOptions =
          step.type === WORKFLOW_STEP_TYPES.AGENT
            ? `<div class="workflow-field">
                 <span class="input-mini-label">Tools the agent may call</span>
                 <div class="step-tools">
                   ${Object.values(AGENT_TOOLS)
                     .map(
                       (tool) => `
                     <label class="step-tool-label" title="${sanitizeText(tool.description)}">
                       <input type="checkbox" class="step-tool" data-tool="${tool.name}"
                         ${(step.tools || []).includes(tool.name) ? 'checked' : ''} />
                       ${sanitizeText(tool.label)}
                     </label>`
                     )
                     .join('')}
                 </div>
               </div>
               <div class="workflow-field">
                 <span class="input-mini-label">Max tool iterations</span>
                 <input type="number" class="form-input" data-field="maxIterations"
                   min="1" max="${LIMITS.MAX_AGENT_ITERATIONS}"
                   value="${step.maxIterations || LIMITS.DEFAULT_AGENT_ITERATIONS}" />
               </div>`
            : '';

        return `
      <div class="workflow-step" data-index="${index}">
        <div class="workflow-step-header">
          <span class="workflow-step-index">${index + 1}</span>
          <input type="text" class="form-input workflow-step-name" data-field="name"
            maxlength="50" value="${sanitizeText(step.name || '')}" placeholder="Step name" />
          <div class="template-card-actions workflow-step-actions">
            <button type="button" class="action-btn" data-step-action="up" title="Move up" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="action-btn" data-step-action="down" title="Move down" ${index === this.workflowDraftSteps.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="action-btn delete" data-step-action="remove" title="Remove step">
              <svg class="icon icon--sm"><use href="#icon-delete"></use></svg>
            </button>
          </div>
        </div>
        <div class="workflow-step-fields">
          <div class="workflow-field">
            <span class="input-mini-label">Type</span>
            <select class="form-input" data-field="type">${typeOptions}</select>
          </div>
          <div class="workflow-field">
            <span class="input-mini-label">Output key — reference as {steps.key}</span>
            <input type="text" class="form-input" data-field="outputKey"
              value="${sanitizeText(step.outputKey || '')}" placeholder="e.g., findings" />
          </div>
          ${body}
          ${agentOptions}
        </div>
      </div>`;
      })
      .join('');

    if (
      this.workflowDraftSteps.some(
        (step) => step.type === WORKFLOW_STEP_TYPES.TEMPLATE
      )
    ) {
      container
        .querySelectorAll('[data-field="templateId"]')
        .forEach((select) => {
          const index = Number(select.closest('.workflow-step').dataset.index);
          select.value = this.workflowDraftSteps[index].templateId || '';
        });
    }

    container.querySelectorAll('[data-field="type"]').forEach((select) => {
      select.addEventListener('change', () => {
        this.syncWorkflowStepsFromDom();
        this.renderWorkflowSteps();
      });
    });

    container.querySelectorAll('[data-step-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.closest('.workflow-step').dataset.index);
        this.syncWorkflowStepsFromDom();

        const steps = this.workflowDraftSteps;
        switch (button.dataset.stepAction) {
          case 'up':
            [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]];
            break;
          case 'down':
            [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]];
            break;
          case 'remove':
            if (steps.length === 1) {
              Toast.show('A workflow needs at least one step', 'warning');
              return;
            }
            steps.splice(index, 1);
            break;
        }

        this.renderWorkflowSteps();
      });
    });
  },

  async saveWorkflow() {
    this.syncWorkflowStepsFromDom();

    const data = {
      name: this.q('[data-role="workflow-name"]').value.trim(),
      description: this.q('[data-role="workflow-description"]').value.trim(),
      steps: this.workflowDraftSteps,
    };

    try {
      // The side panel's own WORKFLOW_CREATED/UPDATED listeners already show
      // a success toast for these, so this only needs to handle failures.
      if (this.currentWorkflow) {
        this.currentWorkflow = await workflowManager.updateWorkflow(
          this.currentWorkflow.id,
          data
        );
      } else {
        this.currentWorkflow = await workflowManager.createWorkflow(data);
        this.id = this.currentWorkflow.id;
        this.setTitle('Edit Workflow');
      }

      this.updateEditHeaderActions();
    } catch (error) {
      console.error('Failed to save workflow:', error);
      Toast.show(`Failed to save workflow: ${error.message}`, 'error');
    }
  },
};
