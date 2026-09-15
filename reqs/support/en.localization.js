/**
 * The English copy the shipped UI shows, so a case asserts against a named
 * string rather than a quoted one — `l10n.toasts.templateCreated`, not
 * `'Template created successfully'`.
 *
 * The extension has no localization layer yet: these values are transcribed
 * from the markup and the toast calls, and this file is where a real one would
 * be pointed once it exists. A case that copies a string instead of naming it
 * here goes stale silently when the copy is reworded.
 */

export const sections = {
  templates: 'Templates',
  workflows: 'Workflows',
  history: 'History',
};

export const templates = {
  create: 'New Template',
  emptyTitle: 'No templates found',
  searchPlaceholder: 'Ask or search templates…',
};

export const templateEditor = {
  createTitle: 'Create Template',
  editTitle: 'Edit Template',
  save: 'Save Template',
};

export const templateRunner = {
  titlePrefix: 'Run: ',
  run: 'Run Template',
  running: 'Processing...',
  noVariables: 'This template has no variables to fill.',
};

export const history = {
  emptyTitle: 'No history found',
  statusCompleted: 'completed',
  statusFailed: 'failed',
};

export const toasts = {
  templateCreated: 'Template created successfully',
  templateUpdated: 'Template updated successfully',
  templateDeleted: 'Template deleted successfully',
  templateExecuted: 'Template executed successfully',
  resultCopied: 'Result copied to clipboard',
};

export default {
  sections,
  templates,
  templateEditor,
  templateRunner,
  history,
  toasts,
};
