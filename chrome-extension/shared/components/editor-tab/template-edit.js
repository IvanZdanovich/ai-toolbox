import templateManager from '../../template-manager.js';
import aiService from '../../ai-service.js';
import {
  downloadAsJson,
  extractVariables,
  sanitizeText,
  variableLabel,
  variablePlaceholder,
} from '../../helpers.js';
import { EXTENSION_VERSION } from '../../constants.js';
import Toast from '../toast.js';

export function templateEditHTML() {
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
        <textarea data-role="template-prompt" class="form-textarea" required maxlength="2000" rows="6" data-voice></textarea>
      </div>

      <div data-role="template-variables" class="template-variables"></div>

      <div class="editor-actions">
        <button type="submit" class="btn btn-primary" data-role="template-save-btn">Save Template</button>
      </div>
    </form>
  `;
}

export const templateEditMethods = {
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

    this.q('[data-role="generate-prompt-btn"]').addEventListener('click', () =>
      this.generatePrompt()
    );

    this.q('[data-role="template-form"]').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTemplate();
    });

    this.q('[data-role="editor-duplicate-btn"]').addEventListener('click', () =>
      this.duplicateTemplate()
    );

    this.q('[data-role="editor-export-btn"]').addEventListener('click', () =>
      this.exportTemplate()
    );
  },

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
  },

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
  },

  updateTemplateVariables(prompt) {
    const container = this.q('[data-role="template-variables"]');
    const variables = extractVariables(prompt);

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
  },

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
  },

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
  },

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
        this.currentTemplate =
          await templateManager.createTemplate(templateData);
        this.id = this.currentTemplate.id;
        this.setTitle('Edit Template');
      }

      this.updateEditHeaderActions();
    } catch (error) {
      console.error('Failed to save template:', error);
      Toast.show(`Failed to save template: ${error.message}`, 'error');
    }
  },
};
