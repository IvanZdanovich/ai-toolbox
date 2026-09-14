import { sanitizeText } from '../../helpers.js';
import Toast from '../toast.js';
import { templateEditHTML, templateEditMethods } from './template-edit.js';
import { templateRunHTML, templateRunMethods } from './template-run.js';
import { workflowEditHTML, workflowEditMethods } from './workflow-edit.js';
import { workflowRunHTML, workflowRunMethods } from './workflow-run.js';
import { chatSectionHTML, chatMethods } from './chat.js';

let uidCounter = 0;

// A template/workflow editor or runner, or an ad-hoc chat, rendered as one
// <section> that the side panel mounts alongside a nav tab — so several of
// these can be open and switched between at once, instead of one modal
// blocking everything.
//
// Each of the four template/workflow x edit/run combinations is implemented
// in its own file (./template-edit.js, ./template-run.js, ./workflow-edit.js,
// ./workflow-run.js) and mixed onto this prototype below, alongside chat.js
// for the plain chat type, so this file only holds what's shared across all
// of them: lifecycle, DOM helpers, and dispatch by type/mode.
class EditorTab {
  constructor({
    type,
    mode,
    id = null,
    prefillInputs = null,
    templates = [],
    onTitleChange = null,
  }) {
    this.type = type; // 'template' | 'workflow' | 'chat'
    this.mode = mode; // 'edit' | 'run', unused for 'chat'
    this.id = id;
    // For type 'chat', prefillInputs is the seed message text (if any)
    // rather than an inputs object.
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

    // Follow-up chat thread shown once a template/workflow run completes.
    this.conversation = [];
    this.chatPending = false;
    this.chatFormBound = false;
  }

  setTitle(text) {
    this.title = text;
    const titleEl = this.root?.querySelector('.editor-tab-title');
    if (titleEl) {
      titleEl.textContent = text;
    }
    this.onTitleChange?.(this);
  }

  // Called when the tab is closed, so an in-flight workflow run is aborted
  // and any pending chat follow-up knows not to touch the removed DOM.
  destroy() {
    this.runController?.abort();
    this.root = null;
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
    section.setAttribute('role', 'tabpanel');
    section.setAttribute('aria-labelledby', `tab-${this.uid}`);
    section.tabIndex = 0;
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
      return header + templateRunHTML() + chatSectionHTML();
    }
    if (this.type === 'workflow' && this.mode === 'edit') {
      return header + workflowEditHTML();
    }
    if (this.type === 'workflow' && this.mode === 'run') {
      return header + workflowRunHTML() + chatSectionHTML();
    }
    if (this.type === 'chat') {
      return header + chatSectionHTML(null);
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
    } else if (this.type === 'chat') {
      await this.initChatTab(this.prefillInputs);
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
  workflowRunMethods,
  chatMethods
);

export default EditorTab;
