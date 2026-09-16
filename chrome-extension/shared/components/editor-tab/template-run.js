import templateManager from '../../template-manager.js';
import aiService from '../../ai-service.js';
import historyManager from '../../history-manager.js';
import { copyToClipboard, sanitizeText } from '../../helpers.js';
import { HISTORY_STATUS } from '../../constants.js';
import Toast from '../toast.js';

export function templateRunHTML() {
  return `
    <form data-role="execute-form">
      <div data-role="execute-inputs" class="execute-inputs"></div>

      <!-- A run takes seconds and swaps content in silently. The live regions
           are what tell a screen reader it started, finished, or failed;
           without them the panel just changes under the user. -->
      <div data-role="execute-result" class="execute-result hidden" aria-live="polite">
        <div class="result-header">
          <h3>Result</h3>
          <button type="button" class="btn btn-small btn-secondary" data-role="copy-result-btn">Copy</button>
        </div>
        <div data-role="result-content" class="result-content"></div>
        <div data-role="result-meta" class="result-meta"></div>
      </div>

      <div data-role="execute-loading" class="execute-loading hidden" role="status">
        <div class="loading" aria-hidden="true"></div>
        <p>Processing template...</p>
      </div>

      <div data-role="execute-error" class="execute-error hidden" role="alert">
        <p class="error-message"></p>
      </div>

      <div class="editor-actions">
        <button type="submit" class="btn btn-primary" data-role="execute-run-btn">Run Template</button>
      </div>
    </form>
  `;
}

export const templateRunMethods = {
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
          <label class="form-label" for="${this.uid}-in-${sanitizeText(input.name)}">${sanitizeText(input.label)}</label>
          <textarea name="${sanitizeText(input.name)}" class="form-textarea"
                    id="${this.uid}-in-${sanitizeText(input.name)}"
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
  },

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
    this.q('[data-role="chat-section"]').classList.add('hidden');
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

      const seedMessages = [];
      if (this.currentTemplate.systemPrompt) {
        seedMessages.push({
          role: 'system',
          content: this.currentTemplate.systemPrompt,
        });
      }
      seedMessages.push({ role: 'user', content: result.processedPrompt });
      seedMessages.push({ role: 'assistant', content: result.result });
      this.initChatThread(seedMessages);
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
  },

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
  },
};
