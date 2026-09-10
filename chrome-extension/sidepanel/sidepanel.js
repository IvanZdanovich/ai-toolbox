import templateManager from '../shared/template-manager.js';
import workflowManager, {
  extractWorkflowVariables,
} from '../shared/workflow-manager.js';
import agentRuntime from '../shared/agent-runtime.js';
import historyManager from '../shared/history-manager.js';
import aiService from '../shared/ai-service.js';
import storage from '../shared/storage.js';
import { AGENT_TOOLS } from '../shared/agent-tools.js';
import IconHelper from '../shared/icon-helper.js';
import {
  formatRelativeTime,
  truncateText,
  debounce,
  copyToClipboard,
  downloadAsJson,
  sanitizeText,
  variableLabel,
  variablePlaceholder,
} from '../shared/helpers.js';
import {
  EVENTS,
  HISTORY_STATUS,
  EXTENSION_VERSION,
  LIMITS,
  RUN_STATUS,
  WORKFLOW_STEP_TYPES,
} from '../shared/constants.js';
import Toast from '../shared/components/toast.js';
import Modal from '../shared/components/modal.js';

class SidePanelApp {
  constructor() {
    this.currentSection = 'templates';
    this.templates = [];
    this.workflows = [];
    this.history = [];
    this.settings = null;
    this.currentTemplate = null;
    this.currentWorkflow = null;
    // Working copy of the steps being edited; the DOM is rebuilt from it
    // whenever the shape changes (add, remove, reorder, type switch).
    this.workflowDraftSteps = [];
    this.runController = null;
    this.searchTimeout = null;

    this.init();
  }

  async init() {
    try {
      console.log('SidePanelApp: Starting initialization...');

      await Promise.all([
        templateManager.init(),
        workflowManager.init(),
        historyManager.init(),
        aiService.init(),
      ]);

      await this.loadData();
      await this.restoreUIState();
      this.setupEventListeners();
      this.render();

      // Validate storage persistence
      const validation = await storage.validatePersistence();
      if (validation) {
        console.log('SidePanelApp: Storage validation completed', validation);
      }

      console.log('SidePanelApp initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SidePanelApp:', error);
      Toast.show('Failed to initialize application', 'error');
    }
  }

  async loadData() {
    try {
      this.templates = await templateManager.getAllTemplates();
      this.workflows = await workflowManager.getAllWorkflows();
      this.history = await historyManager.getAllHistory();
      this.settings = await storage.getSettings();
    } catch (error) {
      console.error('Failed to load data:', error);
      throw error;
    }
  }

  async restoreUIState() {
    try {
      const result = await chrome.storage.local.get(['last_active_section']);

      // Restore the last active section
      const lastSection = result.last_active_section;
      if (
        lastSection &&
        ['templates', 'workflows', 'history'].includes(lastSection)
      ) {
        this.currentSection = lastSection;
        console.log('SidePanelApp: Restored last active section:', lastSection);
      }

      // Mark that we're now on the sidepanel
      await chrome.storage.local.set({ last_active_page: 'sidepanel' });
    } catch (error) {
      console.error('Failed to restore UI state:', error);
      // Keep default section if restore fails
    }
  }

  setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        this.switchSection(e.target.dataset.section);
      });
    });

    // Footer buttons
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.openSettingsPage();
    });

    // Template section
    document
      .getElementById('createTemplateBtn')
      .addEventListener('click', () => {
        this.showTemplateModal();
      });

    document.getElementById('templateSearch').addEventListener(
      'input',
      debounce((e) => this.searchTemplates(e.target.value), 300)
    );

    // Workflows section
    document
      .getElementById('createWorkflowBtn')
      .addEventListener('click', () => {
        this.showWorkflowModal();
      });

    document.getElementById('workflowSearch').addEventListener(
      'input',
      debounce((e) => this.searchWorkflows(e.target.value), 300)
    );

    // History section
    document.getElementById('historySearch').addEventListener(
      'input',
      debounce((e) => this.searchHistory(e.target.value), 300)
    );

    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
      this.clearHistory();
    });

    this.setupModalEventListeners();
    this.setupManagerEventListeners();
  }

  setupModalEventListeners() {
    // Template modal
    document
      .getElementById('templateModalClose')
      .addEventListener('click', () => {
        Modal.hide('template');
      });

    document
      .getElementById('templateModalCancel')
      .addEventListener('click', () => {
        Modal.hide('template');
      });

    document.getElementById('templateForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTemplate();
    });

    document.getElementById('templatePrompt').addEventListener('input', (e) => {
      this.updateTemplateVariables(e.target.value);
    });

    // Generate buttons
    document
      .getElementById('generateDescriptionBtn')
      .addEventListener('click', () => {
        this.generateDescription();
      });

    document
      .getElementById('generatePromptBtn')
      .addEventListener('click', () => {
        this.generatePrompt();
      });

    // Execute modal
    document
      .getElementById('executeModalClose')
      .addEventListener('click', () => {
        Modal.hide('execute');
      });

    document
      .getElementById('executeModalCancel')
      .addEventListener('click', () => {
        Modal.hide('execute');
      });

    document.getElementById('executeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.executeTemplate();
    });

    document.getElementById('copyResultBtn').addEventListener('click', () => {
      this.copyResult();
    });

    this.setupWorkflowModalEventListeners();
  }

  setupWorkflowModalEventListeners() {
    document
      .getElementById('workflowModalClose')
      .addEventListener('click', () => {
        Modal.hide('workflow');
      });

    document
      .getElementById('workflowModalCancel')
      .addEventListener('click', () => {
        Modal.hide('workflow');
      });

    document.getElementById('workflowForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveWorkflow();
    });

    document.getElementById('addStepBtn').addEventListener('click', () => {
      this.addWorkflowStep();
    });

    // Run modal
    document.getElementById('runModalClose').addEventListener('click', () => {
      this.closeRunModal();
    });

    document.getElementById('runModalCancel').addEventListener('click', () => {
      this.closeRunModal();
    });

    document.getElementById('runModalStop').addEventListener('click', () => {
      this.runController?.abort();
    });

    document.getElementById('runForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.runWorkflow();
    });

    document
      .getElementById('copyRunResultBtn')
      .addEventListener('click', () => {
        const content = document.getElementById('runResultContent').textContent;
        copyToClipboard(content)
          .then(() => Toast.show('Result copied to clipboard', 'success'))
          .catch(() => Toast.show('Failed to copy result', 'error'));
      });
  }

  setupManagerEventListeners() {
    // Template manager events
    templateManager.on(EVENTS.TEMPLATE_CREATED, (template) => {
      this.templates.push(template);
      this.renderTemplates();
      Toast.show('Template created successfully', 'success');
    });

    templateManager.on(EVENTS.TEMPLATE_UPDATED, (template) => {
      const index = this.templates.findIndex((t) => t.id === template.id);
      if (index !== -1) {
        this.templates[index] = template;
        this.renderTemplates();
      }
      Toast.show('Template updated successfully', 'success');
    });

    templateManager.on(EVENTS.TEMPLATE_DELETED, (template) => {
      this.templates = this.templates.filter((t) => t.id !== template.id);
      this.renderTemplates();
      Toast.show('Template deleted successfully', 'success');
    });

    // Workflow manager events
    workflowManager.on(EVENTS.WORKFLOW_CREATED, (workflow) => {
      this.workflows.push(workflow);
      this.renderWorkflows();
      Toast.show('Workflow created successfully', 'success');
    });

    workflowManager.on(EVENTS.WORKFLOW_UPDATED, (workflow) => {
      const index = this.workflows.findIndex((w) => w.id === workflow.id);
      if (index !== -1) {
        this.workflows[index] = workflow;
        this.renderWorkflows();
      }
      Toast.show('Workflow updated successfully', 'success');
    });

    workflowManager.on(EVENTS.WORKFLOW_DELETED, (workflow) => {
      this.workflows = this.workflows.filter((w) => w.id !== workflow.id);
      this.renderWorkflows();
      Toast.show('Workflow deleted successfully', 'success');
    });

    // History manager events
    historyManager.on(EVENTS.HISTORY_UPDATED, () => {
      this.loadData().then(() => {
        if (this.currentSection === 'history') {
          this.renderHistory();
        }
      });
    });
  }

  switchSection(section) {
    if (section === this.currentSection) {
      return;
    }

    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.section === section);
    });

    document.querySelectorAll('.section').forEach((sec) => {
      sec.classList.toggle('active', sec.id === section);
    });

    this.currentSection = section;

    // Save current section to storage for persistence
    chrome.storage.local.set({ last_active_section: section });

    if (section === 'templates') {
      this.renderTemplates();
    } else if (section === 'workflows') {
      this.renderWorkflows();
    } else if (section === 'history') {
      this.renderHistory();
    }
  }

  render() {
    this.renderTemplates();
    this.renderWorkflows();
    this.renderHistory();
  }

  renderTemplates() {
    const container = document.getElementById('templatesList');
    const emptyState = document.getElementById('templatesEmpty');

    if (this.templates.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    container.innerHTML = this.templates
      .map(
        (template) => `
      <div class="template-card" data-template-id="${template.id}">
        <div class="template-card-header">
          <h3 class="template-card-title">${sanitizeText(template.name)}</h3>
          <div class="template-card-actions">
            <button class="action-btn edit" data-action="edit" title="Edit template">
              ${IconHelper.iconHTML('edit', 'sm')}
            </button>
            <button class="action-btn duplicate" data-action="duplicate" title="Duplicate template">
              ${IconHelper.iconHTML('copy', 'sm')}
            </button>
            <button class="action-btn export" data-action="export" title="Export template">
              ${IconHelper.iconHTML('export', 'sm')}
            </button>
            <button class="action-btn delete" data-action="delete" title="Delete template">
              ${IconHelper.iconHTML('delete', 'sm', 'error')}
            </button>
          </div>
        </div>
        ${template.description ? `<p class="template-card-description">${sanitizeText(template.description)}</p>` : ''}
        <p class="template-card-meta">
          Variables: ${template.inputs.length} • 
          Created: ${formatRelativeTime(template.createdAt)}
        </p>
      </div>
    `
      )
      .join('');

    this.setupTemplateCardEventListeners(container);
  }

  renderHistory() {
    const container = document.getElementById('historyList');
    const emptyState = document.getElementById('historyEmpty');

    if (this.history.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    container.innerHTML = this.history
      .map(
        (entry) => `
      <div class="history-entry" data-entry-id="${entry.id}">
        <div class="history-entry-header">
          <h4 class="history-entry-title">${sanitizeText(entry.templateName)}</h4>
          <div class="history-entry-time">
            <span class="status-badge ${entry.status}">${entry.status}</span>
            ${formatRelativeTime(entry.timestamp)}
          </div>
        </div>
        ${
          Object.keys(entry.inputs).length > 0
            ? `
          <div class="history-entry-inputs">
            ${Object.entries(entry.inputs)
              .map(
                ([key, value]) =>
                  `<strong>${sanitizeText(key)}:</strong> ${sanitizeText(truncateText(String(value), 50))}`
              )
              .join(' • ')}
          </div>
        `
            : ''
        }
        <div class="history-entry-result">
          ${entry.result ? sanitizeText(truncateText(entry.result, 150)) : 'No result'}
        </div>
        <div class="history-entry-actions">
          <button class="btn btn-small btn-secondary" data-action="copy">Copy Result</button>
          <button class="btn btn-small btn-secondary" data-action="rerun">Rerun</button>
          <button class="btn btn-small btn-secondary" data-action="delete">${IconHelper.iconHTML('delete', 'sm')}</button>
        </div>
      </div>
    `
      )
      .join('');

    this.setupHistoryEventListeners(container);
  }

  setupTemplateCardEventListeners(container) {
    container.querySelectorAll('.template-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.template-card-actions')) {
          this.executeTemplateById(card.dataset.templateId);
        }
      });

      card.querySelectorAll('.action-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const templateId = card.dataset.templateId;

          switch (action) {
            case 'edit':
              this.editTemplate(templateId);
              break;
            case 'duplicate':
              this.duplicateTemplate(templateId);
              break;
            case 'export':
              this.exportTemplate(templateId);
              break;
            case 'delete':
              this.deleteTemplate(templateId);
              break;
          }
        });
      });
    });
  }

  renderWorkflows() {
    const container = document.getElementById('workflowsList');
    const emptyState = document.getElementById('workflowsEmpty');

    if (this.workflows.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    container.innerHTML = this.workflows
      .map((workflow) => {
        const agentSteps = workflow.steps.filter(
          (step) => step.type === WORKFLOW_STEP_TYPES.AGENT
        ).length;

        return `
      <div class="template-card workflow-card" data-workflow-id="${workflow.id}">
        <div class="template-card-header">
          <h3 class="template-card-title">${sanitizeText(workflow.name)}</h3>
          <div class="template-card-actions">
            <button class="action-btn edit" data-action="edit" title="Edit workflow">${IconHelper.iconHTML('edit', 'sm')}</button>
            <button class="action-btn duplicate" data-action="duplicate" title="Duplicate workflow">${IconHelper.iconHTML('copy', 'sm')}</button>
            <button class="action-btn export" data-action="export" title="Export workflow">${IconHelper.iconHTML('export', 'sm')}</button>
            <button class="action-btn delete" data-action="delete" title="Delete workflow">${IconHelper.iconHTML('delete', 'sm', 'error')}</button>
          </div>
        </div>
        ${workflow.description ? `<p class="template-card-description">${sanitizeText(workflow.description)}</p>` : ''}
        <div class="workflow-card-steps">
          ${workflow.steps
            .map(
              (step) =>
                `<span class="step-chip step-chip-${step.type}" title="${sanitizeText(step.name)}">${sanitizeText(step.name)}</span>`
            )
            .join('<span class="step-arrow">→</span>')}
        </div>
        <p class="template-card-meta">
          ${workflow.steps.length} step${workflow.steps.length === 1 ? '' : 's'}${agentSteps > 0 ? ` • ${agentSteps} agent` : ''} •
          Created: ${formatRelativeTime(workflow.createdAt)}
        </p>
      </div>
    `;
      })
      .join('');

    this.setupWorkflowCardEventListeners(container);
  }

  setupWorkflowCardEventListeners(container) {
    container.querySelectorAll('.workflow-card').forEach((card) => {
      const workflowId = card.dataset.workflowId;

      card.addEventListener('click', (e) => {
        if (!e.target.closest('.template-card-actions')) {
          this.showRunModal(workflowId);
        }
      });

      card.querySelectorAll('.action-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();

          try {
            switch (btn.dataset.action) {
              case 'edit': {
                const workflow = await workflowManager.getWorkflow(workflowId);
                if (workflow) {
                  this.showWorkflowModal(workflow);
                }
                break;
              }
              case 'duplicate':
                await workflowManager.duplicateWorkflow(workflowId);
                break;
              case 'export':
                await this.exportWorkflow(workflowId);
                break;
              case 'delete':
                await this.deleteWorkflow(workflowId);
                break;
            }
          } catch (error) {
            console.error('Workflow action failed:', error);
            Toast.show(error.message, 'error');
          }
        });
      });
    });
  }

  async searchWorkflows(query) {
    try {
      this.workflows = await workflowManager.searchWorkflows(query);
      this.renderWorkflows();
    } catch (error) {
      console.error('Workflow search failed:', error);
      Toast.show('Workflow search failed', 'error');
    }
  }

  async exportWorkflow(workflowId) {
    const data = await workflowManager.exportWorkflows([workflowId]);
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
  }

  async deleteWorkflow(workflowId) {
    const confirmed = await Modal.confirm(
      'Delete Workflow',
      'Are you sure you want to delete this workflow? This action cannot be undone.',
      { confirmText: 'Delete', confirmClass: 'btn-danger' }
    );

    if (confirmed) {
      await workflowManager.deleteWorkflow(workflowId);
    }
  }

  // === Workflow editor ===

  showWorkflowModal(workflow = null) {
    this.currentWorkflow = workflow;

    document.getElementById('workflowModalTitle').textContent = workflow
      ? 'Edit Workflow'
      : 'Create Workflow';
    document.getElementById('workflowName').value = workflow?.name || '';
    document.getElementById('workflowDescription').value =
      workflow?.description || '';

    this.workflowDraftSteps = workflow
      ? workflow.steps.map((step) => ({
          ...step,
          tools: [...(step.tools || [])],
        }))
      : [this.blankStep(0)];

    this.renderWorkflowSteps();
    Modal.show('workflow');
  }

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
  }

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
  }

  // Reads the editor fields back into the draft, so a re-render never discards
  // what the user has typed.
  syncWorkflowStepsFromDom() {
    document
      .querySelectorAll('#workflowSteps .workflow-step')
      .forEach((element) => {
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
      });
  }

  renderWorkflowSteps() {
    const container = document.getElementById('workflowSteps');
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
            <button type="button" class="action-btn delete" data-step-action="remove" title="Remove step">${IconHelper.iconHTML('delete', 'sm')}</button>
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
      // <select> ignores a `selected` attribute set before its options exist in
      // some render orders, so the value is applied after insertion.
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
  }

  async saveWorkflow() {
    this.syncWorkflowStepsFromDom();

    const data = {
      name: document.getElementById('workflowName').value.trim(),
      description: document.getElementById('workflowDescription').value.trim(),
      steps: this.workflowDraftSteps,
    };

    try {
      if (this.currentWorkflow) {
        await workflowManager.updateWorkflow(this.currentWorkflow.id, data);
      } else {
        await workflowManager.createWorkflow(data);
      }

      Modal.hide('workflow');
      this.currentWorkflow = null;
    } catch (error) {
      console.error('Failed to save workflow:', error);
      Toast.show(`Failed to save workflow: ${error.message}`, 'error');
    }
  }

  // === Workflow runs ===

  async showRunModal(workflowId) {
    const workflow = await workflowManager.getWorkflow(workflowId);
    if (!workflow) {
      Toast.show('Workflow not found', 'error');
      return;
    }

    this.currentWorkflow = workflow;
    document.getElementById('runModalTitle').textContent =
      `Run: ${workflow.name}`;

    const variables = extractWorkflowVariables(workflow);
    const inputsContainer = document.getElementById('runInputs');
    inputsContainer.innerHTML =
      variables.length > 0
        ? variables
            .map(
              (variable) => `
        <div class="form-group">
          <label class="form-label" for="run_${sanitizeText(variable)}">${sanitizeText(variableLabel(variable))}</label>
          <textarea id="run_${sanitizeText(variable)}" name="${sanitizeText(variable)}"
            class="form-textarea" rows="2"
            placeholder="${sanitizeText(variablePlaceholder(variable))}"></textarea>
        </div>`
            )
            .join('')
        : '<p>This workflow takes no inputs — just run it.</p>';

    this.resetRunUi(workflow);
    Modal.show('run');
  }

  resetRunUi(workflow) {
    const timeline = document.getElementById('runTimeline');
    timeline.classList.remove('hidden');
    timeline.innerHTML = workflow.steps
      .map(
        (step) => `
      <div class="run-step" data-step-id="${step.id}">
        <span class="run-step-status" data-status="${RUN_STATUS.PENDING}">○</span>
        <div class="run-step-body">
          <span class="run-step-name">${sanitizeText(step.name)}</span>
          <span class="run-step-detail"></span>
        </div>
      </div>`
      )
      .join('');

    document.getElementById('runResult').classList.add('hidden');
    document.getElementById('runError').classList.add('hidden');
    document.getElementById('runModalStop').classList.add('hidden');

    const startBtn = document.getElementById('runModalStart');
    startBtn.disabled = false;
    startBtn.textContent = 'Run Workflow';
  }

  updateRunStep(stepId, status, detail) {
    const element = document.querySelector(
      `#runTimeline .run-step[data-step-id="${stepId}"]`
    );
    if (!element) {
      return;
    }

    const icons = {
      [RUN_STATUS.PENDING]: '○',
      [RUN_STATUS.RUNNING]: '◐',
      [RUN_STATUS.COMPLETED]: '●',
      [RUN_STATUS.FAILED]: '✕',
    };

    const statusEl = element.querySelector('.run-step-status');
    statusEl.dataset.status = status;
    statusEl.textContent = icons[status] || '○';

    if (detail !== undefined) {
      element.querySelector('.run-step-detail').textContent = detail;
    }
  }

  async runWorkflow() {
    const workflow = this.currentWorkflow;
    if (!workflow || this.runController) {
      return;
    }

    const inputs = Object.fromEntries(
      new FormData(document.getElementById('runForm')).entries()
    );

    const startBtn = document.getElementById('runModalStart');
    const stopBtn = document.getElementById('runModalStop');
    const errorEl = document.getElementById('runError');
    const resultEl = document.getElementById('runResult');

    this.resetRunUi(workflow);
    startBtn.disabled = true;
    startBtn.textContent = 'Running…';
    stopBtn.classList.remove('hidden');
    this.runController = new AbortController();

    try {
      const run = await agentRuntime.runWorkflow(workflow, inputs, {
        signal: this.runController.signal,
        onEvent: (event) => this.handleRunEvent(event),
      });

      document.getElementById('runResultContent').textContent = run.output;
      document.getElementById('runResultMeta').innerHTML = `
        <span>Steps: ${run.steps.length}</span>
        <span>Duration: ${Math.round(run.duration / 100) / 10}s</span>
      `;
      resultEl.classList.remove('hidden');

      await historyManager.addHistoryEntry(
        workflow.id,
        `${workflow.name} (workflow)`,
        inputs,
        run.output,
        HISTORY_STATUS.COMPLETED
      );

      Toast.show('Workflow completed', 'success');
    } catch (error) {
      console.error('Workflow run failed:', error);
      errorEl.querySelector('.error-message').textContent = error.message;
      errorEl.classList.remove('hidden');

      await historyManager.addHistoryEntry(
        workflow.id,
        `${workflow.name} (workflow)`,
        inputs,
        '',
        HISTORY_STATUS.FAILED
      );
    } finally {
      this.runController = null;
      stopBtn.classList.add('hidden');
      startBtn.disabled = false;
      startBtn.textContent = 'Run Workflow';
    }
  }

  handleRunEvent(event) {
    switch (event.type) {
      case 'step-start':
        this.updateRunStep(event.step.id, RUN_STATUS.RUNNING, 'working…');
        break;
      case 'step-complete':
        this.updateRunStep(
          event.step.id,
          RUN_STATUS.COMPLETED,
          `${truncateText(event.result.output.replace(/\s+/g, ' '), 60) || 'done'}`
        );
        break;
      case 'step-error':
        this.updateRunStep(
          event.step.id,
          RUN_STATUS.FAILED,
          event.result.error
        );
        break;
      case 'agent-iteration':
        this.updateRunStep(
          event.step.id,
          RUN_STATUS.RUNNING,
          `thinking (${event.iteration}/${event.maxIterations})…`
        );
        break;
      case 'tool-call':
        this.updateRunStep(
          event.step.id,
          RUN_STATUS.RUNNING,
          `calling ${event.tool}…`
        );
        break;
      case 'tool-error':
        this.updateRunStep(
          event.step.id,
          RUN_STATUS.RUNNING,
          `${event.tool} failed: ${truncateText(event.error, 40)}`
        );
        break;
    }
  }

  closeRunModal() {
    this.runController?.abort();
    Modal.hide('run');
  }

  setupHistoryEventListeners(container) {
    container.querySelectorAll('.history-entry').forEach((entry) => {
      entry.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const entryId = entry.dataset.entryId;
          const historyEntry = this.history.find((h) => h.id === entryId);

          switch (action) {
            case 'copy':
              if (historyEntry && historyEntry.result) {
                copyToClipboard(historyEntry.result)
                  .then(() => {
                    Toast.show('Result copied to clipboard', 'success');
                  })
                  .catch(() => {
                    Toast.show('Failed to copy result', 'error');
                  });
              }
              break;
            case 'rerun':
              if (historyEntry) {
                this.rerunFromHistory(historyEntry);
              }
              break;
            case 'delete':
              this.deleteHistoryEntry(entryId);
              break;
          }
        });
      });
    });
  }

  async searchTemplates(query) {
    try {
      const results = await templateManager.searchTemplates(query);
      this.templates = results;
      this.renderTemplates();
    } catch (error) {
      console.error('Search failed:', error);
      Toast.show('Search failed', 'error');
    }
  }

  async searchHistory(query) {
    try {
      const results = await historyManager.searchHistory(query);
      this.history = results;
      this.renderHistory();
    } catch (error) {
      console.error('History search failed:', error);
      Toast.show('History search failed', 'error');
    }
  }

  // Template methods (copied from popup.js)
  showTemplateModal(template = null) {
    this.currentTemplate = template;
    const title = document.getElementById('templateModalTitle');
    const form = document.getElementById('templateForm');

    if (template) {
      title.textContent = 'Edit Template';
      document.getElementById('templateName').value = template.name;
      document.getElementById('templateDescription').value =
        template.description || '';
      document.getElementById('templatePrompt').value = template.prompt;
      this.updateTemplateVariables(template.prompt);
    } else {
      title.textContent = 'Create Template';
      form.reset();
      this.updateTemplateVariables('');
    }

    Modal.show('template');
  }

  updateTemplateVariables(prompt) {
    const container = document.getElementById('templateVariables');
    const variables = this.extractVariables(prompt);

    if (variables.length === 0) {
      container.innerHTML = '';
      return;
    }

    // Get existing input definitions if editing a template
    const existingInputs = this.currentTemplate?.inputs || [];
    const existingInputMap = new Map(
      existingInputs.map((input) => [input.name, input])
    );

    container.innerHTML = `
      <div class="variables-header">
        <h4>Template Variables</h4>
        <p class="form-help">Configure how each variable appears and behaves</p>
      </div>
      ${variables
        .map((variable) => {
          const existingInput = existingInputMap.get(variable);
          const label = existingInput?.label || variableLabel(variable);
          const defaultValue = existingInput?.defaultValue || '';
          const placeholder =
            existingInput?.placeholder || variablePlaceholder(variable);

          return `
        <div class="variable-group">
          <label class="form-label" title="Variable: {${sanitizeText(variable)}}">{${sanitizeText(variable)}}</label>
          <div class="variable-inputs">
            <div class="variable-input-wrapper">
              <span class="input-mini-label">Label</span>
              <input type="text" class="form-input"
                     data-variable="${sanitizeText(variable)}"
                     data-field="label"
                     placeholder="e.g., Topic"
                     value="${sanitizeText(label)}"
                     title="The label shown above the input field">
            </div>
            <div class="variable-input-wrapper">
              <span class="input-mini-label">Placeholder (hint text)</span>
              <input type="text" class="form-input"
                     data-variable="${sanitizeText(variable)}"
                     data-field="placeholder"
                     placeholder="e.g., Message"
                     value="${sanitizeText(placeholder)}"
                     title="Hint text shown inside the empty input">
            </div>
            <div class="variable-input-wrapper">
              <span class="input-mini-label">Default Value</span>
              <input type="text" class="form-input"
                     data-variable="${sanitizeText(variable)}"
                     data-field="defaultValue"
                     placeholder="e.g., Addressee"
                     value="${sanitizeText(defaultValue)}"
                     title="Pre-filled value that users can override">
            </div>
          </div>
        </div>
      `;
        })
        .join('')}
    `;
  }

  async generateDescription() {
    const nameInput = document.getElementById('templateName');
    const descriptionInput = document.getElementById('templateDescription');
    const generateBtn = document.getElementById('generateDescriptionBtn');

    const templateName = nameInput.value.trim();
    if (!templateName) {
      Toast.show('Please enter a template name first', 'warning');
      nameInput.focus();
      return;
    }

    // Disable button and show loading state
    generateBtn.disabled = true;
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<span class="btn-icon">⏳</span>Generating...';

    try {
      const prompt = `Generate a concise, professional description (max 50 words) for a template named "${templateName}". The description should explain what this template does and when to use it. Return only the description text without quotes or extra formatting.`;

      const response = await aiService.processTemplate(
        {
          name: 'Generate Description',
          prompt: prompt,
          inputs: [],
        },
        {}
      );

      // AI service returns { result, duration, provider, ... }
      const result = response?.result || response;

      if (result && typeof result === 'string' && result.trim()) {
        descriptionInput.value = result.trim();
        Toast.show('Description generated successfully', 'success');
      } else {
        throw new Error('Empty response from AI service');
      }
    } catch (error) {
      console.error('Failed to generate description:', error);
      Toast.show(`Failed to generate description: ${error.message}`, 'error');
    } finally {
      // Re-enable button and restore text
      generateBtn.disabled = false;
      generateBtn.innerHTML = originalText;
    }
  }

  async generatePrompt() {
    const nameInput = document.getElementById('templateName');
    const descriptionInput = document.getElementById('templateDescription');
    const promptInput = document.getElementById('templatePrompt');
    const generateBtn = document.getElementById('generatePromptBtn');

    const templateName = nameInput.value.trim();
    if (!templateName) {
      Toast.show('Please enter a template name first', 'warning');
      nameInput.focus();
      return;
    }

    const description = descriptionInput.value.trim();

    // Disable button and show loading state
    generateBtn.disabled = true;
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<span class="btn-icon">⏳</span>Generating...';

    try {
      let promptTemplate = `Generate a professional AI prompt template for a template named "${templateName}".`;

      if (description) {
        promptTemplate += ` Description: ${description}.`;
      }

      promptTemplate += `

Requirements:
1. Create a clear, effective prompt that accomplishes the template's purpose
2. Use {variable_name} syntax for any dynamic inputs (e.g., {topic}, {style}, {audience})
3. Include 1-4 relevant variables that users would want to customize
4. Make the prompt specific and actionable
5. Keep it concise (max 200 words)
6. Return ONLY the prompt template without any explanations or formatting

Example format: "Write an email about {topic} for {audience}. Include key points about {details}."

Generate the prompt template now:`;

      const result = await aiService.processTemplate(
        {
          name: 'Generate Prompt',
          prompt: promptTemplate,
          inputs: [],
        },
        {}
      );

      // AI service returns { result, duration, provider, ... }
      const generatedPrompt = result?.result || result;

      if (
        generatedPrompt &&
        typeof generatedPrompt === 'string' &&
        generatedPrompt.trim()
      ) {
        promptInput.value = generatedPrompt.trim();
        // Trigger the input event to update variables display
        promptInput.dispatchEvent(new Event('input', { bubbles: true }));
        Toast.show('Prompt generated successfully', 'success');
      } else {
        throw new Error('Empty response from AI service');
      }
    } catch (error) {
      console.error('Failed to generate prompt:', error);
      Toast.show(`Failed to generate prompt: ${error.message}`, 'error');
    } finally {
      // Re-enable button and restore text
      generateBtn.disabled = false;
      generateBtn.innerHTML = originalText;
    }
  }

  extractVariables(prompt) {
    const variables = [];
    const regex = /\{([^}]+)\}/g;
    let match;

    while ((match = regex.exec(prompt)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  async saveTemplate() {
    const templateData = {
      name: document.getElementById('templateName').value.trim(),
      description: document.getElementById('templateDescription').value.trim(),
      prompt: document.getElementById('templatePrompt').value.trim(),
    };

    // Group inputs by variable name
    const variableGroups = document.querySelectorAll('.variable-group');
    if (variableGroups.length > 0) {
      const inputsMap = new Map();

      variableGroups.forEach((group) => {
        const inputs = group.querySelectorAll('[data-variable]');
        const variable = inputs[0]?.dataset.variable;

        if (variable) {
          const inputData = {
            name: variable,
            label: '',
            placeholder: '',
            defaultValue: '',
          };

          inputs.forEach((input) => {
            const field = input.dataset.field;
            if (field) {
              inputData[field] = input.value.trim();
            }
          });

          // Set defaults if not provided
          if (!inputData.label) {
            inputData.label = variableLabel(variable);
          }
          if (!inputData.placeholder) {
            inputData.placeholder = variablePlaceholder(variable);
          }

          inputsMap.set(variable, inputData);
        }
      });

      templateData.inputs = Array.from(inputsMap.values());
    }

    try {
      if (this.currentTemplate) {
        await templateManager.updateTemplate(
          this.currentTemplate.id,
          templateData
        );
      } else {
        await templateManager.createTemplate(templateData);
      }

      Modal.hide('template');
      this.currentTemplate = null;
    } catch (error) {
      console.error('Failed to save template:', error);
      Toast.show(`Failed to save template: ${error.message}`, 'error');
    }
  }

  async editTemplate(templateId) {
    const template = await templateManager.getTemplate(templateId);
    if (template) {
      this.showTemplateModal(template);
    }
  }

  async duplicateTemplate(templateId) {
    try {
      await templateManager.duplicateTemplate(templateId);
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      Toast.show(`Failed to duplicate template: ${error.message}`, 'error');
    }
  }

  async exportTemplate(templateId) {
    try {
      const template = await templateManager.getTemplate(templateId);
      if (!template) {
        Toast.show('Template not found', 'error');
        return;
      }

      const exportData = {
        templates: [template],
        exportedAt: new Date().toISOString(),
        version: EXTENSION_VERSION,
      };

      const sanitizedName = template.name
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();

      const filename = `${sanitizedName}-template.json`;
      downloadAsJson(exportData, filename);

      Toast.show('Template exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export template:', error);
      Toast.show('Failed to export template', 'error');
    }
  }

  async deleteTemplate(templateId) {
    const confirmed = await Modal.confirm(
      'Delete Template',
      'Are you sure you want to delete this template? This action cannot be undone.',
      { confirmText: 'Delete', confirmClass: 'btn-danger' }
    );

    if (confirmed) {
      try {
        await templateManager.deleteTemplate(templateId);
      } catch (error) {
        console.error('Failed to delete template:', error);
        Toast.show(`Failed to delete template: ${error.message}`, 'error');
      }
    }
  }

  async executeTemplateById(templateId) {
    const template = await templateManager.getTemplate(templateId);
    if (template) {
      this.showExecuteModal(template);
    }
  }

  showExecuteModal(template) {
    this.currentTemplate = template;

    const loadingEl = document.getElementById('executeLoading');
    const resultEl = document.getElementById('executeResult');
    const errorEl = document.getElementById('executeError');
    const runBtn = document.getElementById('executeModalRun');

    loadingEl.classList.add('hidden');
    resultEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    runBtn.disabled = false;
    runBtn.textContent = 'Run Template';

    const title = document.getElementById('executeModalTitle');
    const inputsContainer = document.getElementById('executeInputs');

    title.textContent = `Execute: ${template.name}`;

    if (template.inputs && template.inputs.length > 0) {
      inputsContainer.innerHTML = template.inputs
        .map(
          (input) => `
        <div class="form-group">
          <label class="form-label" for="input_${sanitizeText(input.name)}">${sanitizeText(input.label)}</label>
          <textarea id="input_${sanitizeText(input.name)}" name="${sanitizeText(input.name)}" class="form-textarea"
                    placeholder="${sanitizeText(input.placeholder)}" rows="2">${sanitizeText(input.defaultValue || '')}</textarea>
        </div>
      `
        )
        .join('');
    } else {
      inputsContainer.innerHTML =
        '<p>This template has no variables to fill.</p>';
    }

    Modal.show('execute');
  }

  async executeTemplate() {
    if (!this.currentTemplate) {
      return;
    }

    const form = document.getElementById('executeForm');
    const formData = new FormData(form);
    const inputs = Object.fromEntries(formData.entries());

    const loadingEl = document.getElementById('executeLoading');
    const errorEl = document.getElementById('executeError');
    const resultEl = document.getElementById('executeResult');
    const runBtn = document.getElementById('executeModalRun');

    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    resultEl.classList.add('hidden');
    runBtn.disabled = true;
    runBtn.textContent = 'Processing...';

    try {
      const result = await aiService.processTemplate(
        this.currentTemplate,
        inputs
      );

      document.getElementById('resultContent').textContent = result.result;
      document.getElementById('resultMeta').innerHTML = `
        <span>Provider: ${result.provider}</span>
        <span>Duration: ${result.duration}ms</span>
      `;

      await historyManager.addHistoryEntry(
        this.currentTemplate.id,
        this.currentTemplate.name,
        inputs,
        result.result,
        HISTORY_STATUS.COMPLETED
      );

      resultEl.classList.remove('hidden');
      Toast.show('Template executed successfully', 'success');
    } catch (error) {
      console.error('Template execution failed:', error);
      errorEl.querySelector('.error-message').textContent = error.message;
      errorEl.classList.remove('hidden');

      await historyManager.addHistoryEntry(
        this.currentTemplate.id,
        this.currentTemplate.name,
        inputs,
        '',
        HISTORY_STATUS.FAILED
      );
    } finally {
      loadingEl.classList.add('hidden');
      runBtn.disabled = false;
      runBtn.textContent = 'Run Template';
    }
  }

  copyResult() {
    const resultContent = document.getElementById('resultContent').textContent;
    if (resultContent) {
      copyToClipboard(resultContent)
        .then(() => {
          Toast.show('Result copied to clipboard', 'success');
        })
        .catch(() => {
          Toast.show('Failed to copy result', 'error');
        });
    }
  }

  async rerunFromHistory(historyEntry) {
    const template = await templateManager.getTemplate(historyEntry.templateId);
    if (template) {
      // showExecuteModal() builds the fields synchronously via innerHTML,
      // so they are queryable as soon as it returns.
      this.showExecuteModal(template);

      Object.entries(historyEntry.inputs).forEach(([key, value]) => {
        const input = document.getElementById(`input_${key}`);
        if (input) {
          input.value = value;
        }
      });
    }
  }

  async deleteHistoryEntry(entryId) {
    const confirmed = await Modal.confirm(
      'Delete History Entry',
      'Are you sure you want to delete this history entry?'
    );

    if (confirmed) {
      try {
        await historyManager.deleteHistoryEntry(entryId);
      } catch (error) {
        console.error('Failed to delete history entry:', error);
        Toast.show('Failed to delete history entry', 'error');
      }
    }
  }

  async clearHistory() {
    const confirmed = await Modal.confirm(
      'Clear All History',
      'Are you sure you want to clear all history? This cannot be undone.',
      { confirmText: 'Clear All', confirmClass: 'btn-danger' }
    );

    if (confirmed) {
      try {
        const clearedCount = await historyManager.clearHistory();
        Toast.show(`Cleared ${clearedCount} history entries`, 'success');
      } catch (error) {
        console.error('Failed to clear history:', error);
        Toast.show('Failed to clear history', 'error');
      }
    }
  }

  // Settings methods
  async openSettingsPage() {
    try {
      // Save current state
      await chrome.storage.local.set({ last_active_page: 'settings' });

      // Ask background script to update the sidepanel path
      await chrome.runtime.sendMessage({
        action: 'setSidePanelPath',
        path: 'settings/settings.html?from=sidepanel',
      });

      // Navigate to settings
      window.location.href = chrome.runtime.getURL(
        'settings/settings.html?from=sidepanel'
      );
    } catch (error) {
      console.error('Failed to open settings page:', error);
      // Fall back to simple navigation
      window.location.href = chrome.runtime.getURL(
        'settings/settings.html?from=sidepanel'
      );
    }
  }

  // Cleanup method for when the side panel is closed
  cleanup() {
    // Reserved for future cleanup needs
  }
}

// Initialize the app when the sidepanel loads
document.addEventListener('DOMContentLoaded', () => {
  const app = new SidePanelApp();

  // Expose app for debugging
  window.aiToolboxSidePanel = app;

  // Cleanup when page unloads
  window.addEventListener('beforeunload', () => {
    app.cleanup();
  });
});
