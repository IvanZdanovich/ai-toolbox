import templateManager from '../template-manager.js';
import workflowManager, {
  extractWorkflowVariables,
} from '../workflow-manager.js';
import agentRuntime from '../agent-runtime.js';
import historyManager from '../history-manager.js';
import aiService from '../ai-service.js';
import { AGENT_TOOLS } from '../agent-tools.js';
import {
  copyToClipboard,
  downloadAsJson,
  sanitizeText,
  truncateText,
  variableLabel,
  variablePlaceholder,
} from '../helpers.js';
import {
  EXTENSION_VERSION,
  HISTORY_STATUS,
  LIMITS,
  RUN_STATUS,
  WORKFLOW_STEP_TYPES,
} from '../constants.js';
import Toast from './toast.js';

let uidCounter = 0;

// A template/workflow editor or runner, rendered as one <section> that the
// side panel mounts alongside a nav tab — so several of these can be open
// and switched between at once, instead of one modal blocking everything.
class EditorTab {
  constructor({
    type,
    mode,
    id = null,
    prefillInputs = null,
    templates = [],
    onTitleChange = null,
  }) {
    this.type = type; // 'template' | 'workflow'
    this.mode = mode; // 'edit' | 'run'
    this.id = id;
    this.prefillInputs = prefillInputs;
    this.templates = templates;
    this.onTitleChange = onTitleChange;

    this.uid = `editor-tab-${++uidCounter}`;
    this.title = 'Loading…';

    this.currentTemplate = null;
    this.currentWorkflow = null;
    this.workflowDraftSteps = [];
    this.runController = null;
    this.root = null;
  }

  setTitle(text) {
    this.title = text;
    const titleEl = this.root?.querySelector('.editor-tab-title');
    if (titleEl) {
      titleEl.textContent = text;
    }
    this.onTitleChange?.(this);
  }

  // Called when the tab is closed, so an in-flight workflow run is aborted.
  destroy() {
    this.runController?.abort();
  }

  q(selector) {
    return this.root.querySelector(selector);
  }

  qa(selector) {
    return this.root.querySelectorAll(selector);
  }

  render() {
    const section = document.createElement('section');
    section.className = 'section editor-tab-section';
    section.id = this.uid;
    section.innerHTML = this.skeletonHTML();
    this.root = section;

    this.init().catch((error) => {
      console.error('Failed to initialize editor tab:', error);
      Toast.show('Failed to open editor', 'error');
    });

    return section;
  }

  skeletonHTML() {
    const header = `
      <div class="editor-tab-header">
        <h3 class="editor-tab-title">${sanitizeText(this.title)}</h3>
        <div class="editor-tab-actions">
          <button type="button" class="btn btn-secondary btn-small hidden" data-role="editor-duplicate-btn" title="Duplicate">
            <svg class="icon icon--sm"><use href="#icon-copy"></use></svg>Duplicate
          </button>
          <button type="button" class="btn btn-secondary btn-small hidden" data-role="editor-export-btn" title="Export">
            <svg class="icon icon--sm"><use href="#icon-export"></use></svg>Export
          </button>
        </div>
      </div>
    `;

    if (this.type === 'template' && this.mode === 'edit') {
      return header + this.templateEditHTML();
    }
    if (this.type === 'template' && this.mode === 'run') {
      return header + this.templateRunHTML();
    }
    if (this.type === 'workflow' && this.mode === 'edit') {
      return header + this.workflowEditHTML();
    }
    if (this.type === 'workflow' && this.mode === 'run') {
      return header + this.workflowRunHTML();
    }
    return header + '<p>Unknown editor request.</p>';
  }

  templateEditHTML() {
    return `
      <form data-role="template-form">
        <div class="form-group">
          <label class="form-label">Template Name</label>
          <input type="text" data-role="template-name" class="form-input" required maxlength="50" />
        </div>

        <div class="form-group">
          <div class="form-label-group">
            <label class="form-label">Description (optional)</label>
            <button type="button" class="btn btn-small btn-secondary generate-btn" data-role="generate-description-btn" title="Generate description from template name">
              <svg class="icon icon--sm"><use href="#icon-magic"></use></svg>Generate
            </button>
          </div>
          <input type="text" data-role="template-description" class="form-input" maxlength="200" />
        </div>

        <div class="form-group">
          <div class="form-label-group">
            <label class="form-label">Prompt</label>
            <button type="button" class="btn btn-small btn-secondary generate-btn" data-role="generate-prompt-btn" title="Generate prompt from template name and description">
              <svg class="icon icon--sm"><use href="#icon-magic"></use></svg>Generate
            </button>
          </div>
          <p class="form-help">Use {variable_name} for dynamic inputs</p>
          <textarea data-role="template-prompt" class="form-textarea" required maxlength="2000" rows="6"></textarea>
        </div>

        <div data-role="template-variables" class="template-variables"></div>

        <div class="editor-actions">
          <button type="submit" class="btn btn-primary" data-role="template-save-btn">Save Template</button>
        </div>
      </form>
    `;
  }

  templateRunHTML() {
    return `
      <form data-role="execute-form">
        <div data-role="execute-inputs" class="execute-inputs"></div>

        <div data-role="execute-result" class="execute-result hidden">
          <div class="result-header">
            <h3>Result</h3>
            <button type="button" class="btn btn-small btn-secondary" data-role="copy-result-btn">Copy</button>
          </div>
          <div data-role="result-content" class="result-content"></div>
          <div data-role="result-meta" class="result-meta"></div>
        </div>

        <div data-role="execute-loading" class="execute-loading hidden">
          <div class="loading"></div>
          <p>Processing template...</p>
        </div>

        <div data-role="execute-error" class="execute-error hidden">
          <p class="error-message"></p>
        </div>

        <div class="editor-actions">
          <button type="submit" class="btn btn-primary" data-role="execute-run-btn">Run Template</button>
        </div>
      </form>
    `;
  }

  workflowEditHTML() {
    return `
      <form data-role="workflow-form">
        <div class="form-group">
          <label class="form-label">Workflow Name</label>
          <input type="text" data-role="workflow-name" class="form-input" required maxlength="50" />
        </div>

        <div class="form-group">
          <label class="form-label">Description (optional)</label>
          <input type="text" data-role="workflow-description" class="form-input" maxlength="200" />
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

  workflowRunHTML() {
    return `
      <form data-role="run-form">
        <div data-role="run-inputs" class="execute-inputs"></div>

        <div data-role="run-timeline" class="run-timeline hidden"></div>

        <div data-role="run-result" class="execute-result hidden">
          <div class="result-header">
            <h3>Result</h3>
            <button type="button" class="btn btn-small btn-secondary" data-role="copy-run-result-btn">Copy</button>
          </div>
          <div data-role="run-result-content" class="result-content"></div>
          <div data-role="run-result-meta" class="result-meta"></div>
        </div>

        <div data-role="run-error" class="execute-error hidden">
          <p class="error-message"></p>
        </div>

        <div class="editor-actions">
          <button type="button" class="btn btn-danger hidden" data-role="run-stop-btn">Stop</button>
          <button type="submit" class="btn btn-primary" data-role="run-start-btn">Run Workflow</button>
        </div>
      </form>
    `;
  }

  async init() {
    if (this.type === 'template' && this.mode === 'edit') {
      await this.initTemplateEdit();
    } else if (this.type === 'template' && this.mode === 'run') {
      await this.initTemplateRun();
    } else if (this.type === 'workflow' && this.mode === 'edit') {
      await this.initWorkflowEdit();
    } else if (this.type === 'workflow' && this.mode === 'run') {
      await this.initWorkflowRun();
    } else {
      this.setTitle('Unknown editor request');
    }
  }

  // === Template editor ===

  async initTemplateEdit() {
    if (this.id) {
      this.currentTemplate = await templateManager.getTemplate(this.id);
      if (!this.currentTemplate) {
        this.setTitle('Template not found');
        Toast.show('Template not found', 'error');
        return;
      }
    }

    this.setTitle(this.currentTemplate ? 'Edit Template' : 'Create Template');
    this.updateEditHeaderActions();

    if (this.currentTemplate) {
      this.q('[data-role="template-name"]').value = this.currentTemplate.name;
      this.q('[data-role="template-description"]').value =
        this.currentTemplate.description || '';
      this.q('[data-role="template-prompt"]').value =
        this.currentTemplate.prompt;
      this.updateTemplateVariables(this.currentTemplate.prompt);
    } else {
      this.updateTemplateVariables('');
    }

    this.q('[data-role="template-prompt"]').addEventListener('input', (e) => {
      this.updateTemplateVariables(e.target.value);
    });

    this.q('[data-role="generate-description-btn"]').addEventListener(
      'click',
      () => this.generateDescription()
    );

    this.q('[data-role="generate-prompt-btn"]').addEventListener(
      'click',
      () => this.generatePrompt()
    );

    this.q('[data-role="template-form"]').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTemplate();
    });

    this.q('[data-role="editor-duplicate-btn"]').addEventListener(
      'click',
      () => this.duplicateTemplate()
    );

    this.q('[data-role="editor-export-btn"]').addEventListener(
      'click',
      () => this.exportTemplate()
    );
  }

  // Shown once the template/workflow being edited already exists — there is
  // nothing to duplicate or export before the first save.
  updateEditHeaderActions() {
    const show = Boolean(this.currentTemplate || this.currentWorkflow);
    this.q('[data-role="editor-duplicate-btn"]').classList.toggle(
      'hidden',
      !show
    );
    this.q('[data-role="editor-export-btn"]').classList.toggle(
      'hidden',
      !show
    );
  }

  async duplicateTemplate() {
    if (!this.currentTemplate) {
      return;
    }

    try {
      // Duplicating creates a new template under the hood, so the side
      // panel's TEMPLATE_CREATED listener already shows a success toast.
      await templateManager.duplicateTemplate(this.currentTemplate.id);
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      Toast.show(`Failed to duplicate template: ${error.message}`, 'error');
    }
  }

  async exportTemplate() {
    if (!this.currentTemplate) {
      return;
    }

    try {
      const exportData = {
        templates: [this.currentTemplate],
        exportedAt: new Date().toISOString(),
        version: EXTENSION_VERSION,
      };

      const filename = `${this.currentTemplate.name
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()}-template.json`;
      downloadAsJson(exportData, filename);
      Toast.show('Template exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export template:', error);
      Toast.show('Failed to export template', 'error');
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

  updateTemplateVariables(prompt) {
    const container = this.q('[data-role="template-variables"]');
    const variables = this.extractVariables(prompt);

    if (variables.length === 0) {
      container.innerHTML = '';
      return;
    }

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
    const nameInput = this.q('[data-role="template-name"]');
    const descriptionInput = this.q('[data-role="template-description"]');
    const generateBtn = this.q('[data-role="generate-description-btn"]');

    const templateName = nameInput.value.trim();
    if (!templateName) {
      Toast.show('Please enter a template name first', 'warning');
      nameInput.focus();
      return;
    }

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
      generateBtn.disabled = false;
      generateBtn.innerHTML = originalText;
    }
  }

  async generatePrompt() {
    const nameInput = this.q('[data-role="template-name"]');
    const descriptionInput = this.q('[data-role="template-description"]');
    const promptInput = this.q('[data-role="template-prompt"]');
    const generateBtn = this.q('[data-role="generate-prompt-btn"]');

    const templateName = nameInput.value.trim();
    if (!templateName) {
      Toast.show('Please enter a template name first', 'warning');
      nameInput.focus();
      return;
    }

    const description = descriptionInput.value.trim();

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

      const generatedPrompt = result?.result || result;

      if (
        generatedPrompt &&
        typeof generatedPrompt === 'string' &&
        generatedPrompt.trim()
      ) {
        promptInput.value = generatedPrompt.trim();
        promptInput.dispatchEvent(new Event('input', { bubbles: true }));
        Toast.show('Prompt generated successfully', 'success');
      } else {
        throw new Error('Empty response from AI service');
      }
    } catch (error) {
      console.error('Failed to generate prompt:', error);
      Toast.show(`Failed to generate prompt: ${error.message}`, 'error');
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = originalText;
    }
  }

  async saveTemplate() {
    const templateData = {
      name: this.q('[data-role="template-name"]').value.trim(),
      description: this.q('[data-role="template-description"]').value.trim(),
      prompt: this.q('[data-role="template-prompt"]').value.trim(),
    };

    const variableGroups = this.qa('.variable-group');
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
      // The side panel's own TEMPLATE_CREATED/UPDATED listeners already show
      // a success toast for these, so this only needs to handle failures.
      if (this.currentTemplate) {
        this.currentTemplate = await templateManager.updateTemplate(
          this.currentTemplate.id,
          templateData
        );
      } else {
        this.currentTemplate = await templateManager.createTemplate(
          templateData
        );
        this.id = this.currentTemplate.id;
        this.setTitle('Edit Template');
      }

      this.updateEditHeaderActions();
    } catch (error) {
      console.error('Failed to save template:', error);
      Toast.show(`Failed to save template: ${error.message}`, 'error');
    }
  }

  // === Template run ===

  async initTemplateRun() {
    this.currentTemplate = this.id
      ? await templateManager.getTemplate(this.id)
      : null;

    if (!this.currentTemplate) {
      this.setTitle('Template not found');
      Toast.show('Template not found', 'error');
      return;
    }

    this.setTitle(`Run: ${this.currentTemplate.name}`);

    let prefillValues = {};
    if (this.prefillInputs) {
      prefillValues = this.prefillInputs;
    }

    const inputsContainer = this.q('[data-role="execute-inputs"]');
    if (this.currentTemplate.inputs && this.currentTemplate.inputs.length > 0) {
      inputsContainer.innerHTML = this.currentTemplate.inputs
        .map(
          (input) => `
        <div class="form-group">
          <label class="form-label">${sanitizeText(input.label)}</label>
          <textarea name="${sanitizeText(input.name)}" class="form-textarea"
                    placeholder="${sanitizeText(input.placeholder)}" rows="2">${sanitizeText(prefillValues[input.name] ?? input.defaultValue ?? '')}</textarea>
        </div>
      `
        )
        .join('');
    } else {
      inputsContainer.innerHTML =
        '<p>This template has no variables to fill.</p>';
    }

    this.q('[data-role="execute-form"]').addEventListener('submit', (e) => {
      e.preventDefault();
      this.executeTemplate();
    });

    this.q('[data-role="copy-result-btn"]').addEventListener('click', () => {
      this.copyResult();
    });
  }

  async executeTemplate() {
    if (!this.currentTemplate) {
      return;
    }

    const form = this.q('[data-role="execute-form"]');
    const formData = new FormData(form);
    const inputs = Object.fromEntries(formData.entries());

    const loadingEl = this.q('[data-role="execute-loading"]');
    const errorEl = this.q('[data-role="execute-error"]');
    const resultEl = this.q('[data-role="execute-result"]');
    const runBtn = this.q('[data-role="execute-run-btn"]');

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

      this.q('[data-role="result-content"]').textContent = result.result;
      this.q('[data-role="result-meta"]').innerHTML = `
        <span>Provider: ${result.provider}</span>
        <span>Duration: ${result.duration}ms</span>
      `;

      await historyManager.addHistoryEntry(
        this.currentTemplate.id,
        this.currentTemplate.name,
        inputs,
        result.result,
        HISTORY_STATUS.COMPLETED,
        result.duration
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
    const resultContent = this.q('[data-role="result-content"]').textContent;
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

  // === Workflow editor ===

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

    this.q('[data-role="editor-duplicate-btn"]').addEventListener(
      'click',
      () => this.duplicateWorkflow()
    );

    this.q('[data-role="editor-export-btn"]').addEventListener(
      'click',
      () => this.exportWorkflow()
    );
  }

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
  }

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
  }

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
  }

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
  }

  // === Workflow run ===

  async initWorkflowRun() {
    this.currentWorkflow = this.id
      ? await workflowManager.getWorkflow(this.id)
      : null;

    if (!this.currentWorkflow) {
      this.setTitle('Workflow not found');
      Toast.show('Workflow not found', 'error');
      return;
    }

    this.setTitle(`Run: ${this.currentWorkflow.name}`);

    const variables = extractWorkflowVariables(this.currentWorkflow);
    const inputsContainer = this.q('[data-role="run-inputs"]');
    inputsContainer.innerHTML =
      variables.length > 0
        ? variables
            .map(
              (variable) => `
        <div class="form-group">
          <label class="form-label">${sanitizeText(variableLabel(variable))}</label>
          <textarea name="${sanitizeText(variable)}"
            class="form-textarea" rows="2"
            placeholder="${sanitizeText(variablePlaceholder(variable))}"></textarea>
        </div>`
            )
            .join('')
        : '<p>This workflow takes no inputs — just run it.</p>';

    this.resetRunUi(this.currentWorkflow);

    this.q('[data-role="run-form"]').addEventListener('submit', (e) => {
      e.preventDefault();
      this.runWorkflow();
    });

    this.q('[data-role="run-stop-btn"]').addEventListener('click', () => {
      this.runController?.abort();
    });

    this.q('[data-role="copy-run-result-btn"]').addEventListener(
      'click',
      () => {
        const content = this.q('[data-role="run-result-content"]').textContent;
        copyToClipboard(content)
          .then(() => Toast.show('Result copied to clipboard', 'success'))
          .catch(() => Toast.show('Failed to copy result', 'error'));
      }
    );
  }

  resetRunUi(workflow) {
    const timeline = this.q('[data-role="run-timeline"]');
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

    this.q('[data-role="run-result"]').classList.add('hidden');
    this.q('[data-role="run-error"]').classList.add('hidden');
    this.q('[data-role="run-stop-btn"]').classList.add('hidden');

    const startBtn = this.q('[data-role="run-start-btn"]');
    startBtn.disabled = false;
    startBtn.textContent = 'Run Workflow';
  }

  updateRunStep(stepId, status, detail) {
    const element = this.q(
      `[data-role="run-timeline"] .run-step[data-step-id="${stepId}"]`
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
      new FormData(this.q('[data-role="run-form"]')).entries()
    );

    const startBtn = this.q('[data-role="run-start-btn"]');
    const stopBtn = this.q('[data-role="run-stop-btn"]');
    const errorEl = this.q('[data-role="run-error"]');
    const resultEl = this.q('[data-role="run-result"]');

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

      this.q('[data-role="run-result-content"]').textContent = run.output;
      this.q('[data-role="run-result-meta"]').innerHTML = `
        <span>Steps: ${run.steps.length}</span>
        <span>Duration: ${Math.round(run.duration / 100) / 10}s</span>
      `;
      resultEl.classList.remove('hidden');

      await historyManager.addHistoryEntry(
        workflow.id,
        `${workflow.name} (workflow)`,
        inputs,
        run.output,
        HISTORY_STATUS.COMPLETED,
        run.duration
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
}

export default EditorTab;
