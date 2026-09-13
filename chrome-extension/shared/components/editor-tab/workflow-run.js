import workflowManager, {
  extractWorkflowVariables,
} from '../../workflow-manager.js';
import agentRuntime from '../../agent-runtime.js';
import historyManager from '../../history-manager.js';
import {
  copyToClipboard,
  sanitizeText,
  truncateText,
  variableLabel,
  variablePlaceholder,
} from '../../helpers.js';
import { HISTORY_STATUS, RUN_STATUS } from '../../constants.js';
import Toast from '../toast.js';

export function workflowRunHTML() {
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

export const workflowRunMethods = {
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
  },

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
  },

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
  },

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
  },

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
  },
};
