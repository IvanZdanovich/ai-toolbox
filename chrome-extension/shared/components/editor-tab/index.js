import { sanitizeText } from '../../helpers.js';
import Toast from '../toast.js';
import { templateEditHTML, templateEditMethods } from './template-edit.js';
import { templateRunHTML, templateRunMethods } from './template-run.js';
import { workflowEditHTML, workflowEditMethods } from './workflow-edit.js';
import { workflowRunHTML, workflowRunMethods } from './workflow-run.js';

let uidCounter = 0;

// A template/workflow editor or runner, rendered as one <section> that the
// side panel mounts alongside a nav tab — so several of these can be open
// and switched between at once, instead of one modal blocking everything.
//
// Each of the four type/mode combinations (template/workflow x edit/run) is
// implemented in its own file (./template-edit.js, ./template-run.js,
// ./workflow-edit.js, ./workflow-run.js) and mixed onto this prototype below,
// so this file only holds what's shared across all four: lifecycle, DOM
// helpers, and dispatch by type/mode.
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
      return header + templateEditHTML();
    }
    if (this.type === 'template' && this.mode === 'run') {
      return header + templateRunHTML();
    }
    if (this.type === 'workflow' && this.mode === 'edit') {
      return header + workflowEditHTML();
    }
    if (this.type === 'workflow' && this.mode === 'run') {
      return header + workflowRunHTML();
    }
    return header + '<p>Unknown editor request.</p>';
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

  // Shown once the template/workflow being edited already exists — there is
  // nothing to duplicate or export before the first save. Shared by both
  // edit modes.
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
}

Object.assign(
  EditorTab.prototype,
  templateEditMethods,
  templateRunMethods,
  workflowEditMethods,
  workflowRunMethods
);

export default EditorTab;
