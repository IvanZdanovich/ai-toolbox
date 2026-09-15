/**
 * Every selector the e2e flows reach the shipped UI through, grouped by the
 * surface a user sees rather than by the module that renders it.
 *
 * A case names a surface (`sidePanel.templates.cards`) and never a raw
 * selector string, so a renamed container is one edit here instead of one per
 * case — which is the whole reason the smoke suite's inline `#templatesList`
 * strings are not repeated at this level.
 *
 * It states no requirement: a selector is how the UI is addressed, not what it
 * must do (SUPPORT_NOT_SPEC).
 */

export const sidePanel = {
  sections: {
    templates: '#tab-templates',
    workflows: '#tab-workflows',
    history: '#tab-history',
  },
  templates: {
    create: '#createTemplateBtn',
    search: '#templateSearch',
    list: '#templatesList',
    cards: '#templatesList .template-card',
    empty: '#templatesEmpty',
    card: {
      title: '.template-card-title',
      description: '.template-card-description',
      meta: '.template-card-meta',
      edit: '[data-action="edit"]',
      delete: '[data-action="delete"]',
    },
  },
  workflows: {
    create: '#createWorkflowBtn',
    list: '#workflowsList',
    cards: '#workflowsList .workflow-card',
  },
  history: {
    clear: '#clearHistoryBtn',
    search: '#historySearch',
    list: '#historyList',
    entries: '#historyList .history-entry',
    empty: '#historyEmpty',
    entry: {
      title: '.history-entry-title',
      status: '.status-badge',
      result: '.history-entry-result',
      rerun: '[data-action="rerun"]',
      delete: '[data-action="delete"]',
    },
  },
  footer: {
    settings: '#settingsBtn',
    expand: '#expandBtn',
  },
  toasts: '#toastContainer .toast',
};

export const editorTab = {
  row: '#editorTabsRow',
  tabs: '#editorTabsRow .nav-tab-editor',
  label: '.nav-tab-label',
  close: '.nav-tab-close',
  // Exactly one editor tab carries `active` at a time; it is the one a user
  // is looking at, so it is the one a case addresses.
  open: '.editor-tab-section.active',
  title: '.editor-tab-title',
};

export const confirmModal = {
  overlay: '.modal-overlay',
  title: '.modal-title',
  confirm: '.confirm-btn',
  cancel: '.cancel-btn',
};

export const templateEditor = {
  form: '[data-role="template-form"]',
  name: '[data-role="template-name"]',
  description: '[data-role="template-description"]',
  prompt: '[data-role="template-prompt"]',
  variables: '[data-role="template-variables"]',
  save: '[data-role="template-save-btn"]',
};

export const templateRunner = {
  form: '[data-role="execute-form"]',
  inputs: '[data-role="execute-inputs"]',
  fields: '[data-role="execute-inputs"] textarea',
  run: '[data-role="execute-run-btn"]',
  loading: '[data-role="execute-loading"]',
  result: '[data-role="execute-result"]',
  resultContent: '[data-role="result-content"]',
  resultMeta: '[data-role="result-meta"]',
  error: '[data-role="execute-error"]',
  copy: '[data-role="copy-result-btn"]',
};

export default {
  sidePanel,
  editorTab,
  confirmModal,
  templateEditor,
  templateRunner,
};
