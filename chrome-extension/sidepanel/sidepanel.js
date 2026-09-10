import templateManager from '../shared/template-manager.js';
import workflowManager from '../shared/workflow-manager.js';
import historyManager from '../shared/history-manager.js';
import aiService from '../shared/ai-service.js';
import storage from '../shared/storage.js';
import IconHelper from '../shared/icon-helper.js';
import {
  formatRelativeTime,
  truncateText,
  debounce,
  copyToClipboard,
  downloadAsJson,
  sanitizeText,
} from '../shared/helpers.js';
import {
  EVENTS,
  EXTENSION_VERSION,
  WORKFLOW_STEP_TYPES,
} from '../shared/constants.js';
import Toast from '../shared/components/toast.js';
import Modal from '../shared/components/modal.js';
import EditorTab from '../shared/components/editor-tab.js';

class SidePanelApp {
  constructor() {
    this.currentSection = 'templates';
    this.templates = [];
    this.workflows = [];
    this.history = [];
    this.settings = null;
    this.searchTimeout = null;

    // Open template/workflow editor tabs, keyed by uid.
    this.editorTabs = new Map();

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
      this.setupExternalChangeListener();
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

  // Templates/workflows are now created and edited in their own tab, so this
  // page must pick up changes made there rather than only in its own modals.
  setupExternalChangeListener() {
    const reload = debounce(async () => {
      try {
        await Promise.all([
          templateManager.refresh(),
          workflowManager.refresh(),
          historyManager.refresh(),
        ]);
        await this.loadData();
        this.render();
      } catch (error) {
        console.error('Failed to reload after external change:', error);
      }
    }, 150);

    storage.onChanged(reload);
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

    const expandBtn = document.getElementById('expandBtn');
    if (new URLSearchParams(window.location.search).get('view') === 'fullscreen') {
      expandBtn.classList.add('hidden');
    } else {
      expandBtn.addEventListener('click', () => {
        this.openFullScreen();
      });
    }

    // Template section
    document
      .getElementById('createTemplateBtn')
      .addEventListener('click', () => {
        this.openEditor('template', 'edit');
      });

    document.getElementById('templateSearch').addEventListener(
      'input',
      debounce((e) => this.searchTemplates(e.target.value), 300)
    );

    // Workflows section
    document
      .getElementById('createWorkflowBtn')
      .addEventListener('click', () => {
        this.openEditor('workflow', 'edit');
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

    this.setupManagerEventListeners();
  }

  // Opens a template/workflow editor or runner as its own tab in the second
  // row below the main nav, so several — including several for the same
  // template/workflow — can be open and switched between at once, instead of
  // one modal blocking everything else.
  openEditor(type, mode, id = null, prefillInputs = null) {
    const tab = new EditorTab({
      type,
      mode,
      id,
      prefillInputs,
      templates: this.templates,
      onTitleChange: (t) => this.updateEditorTabLabel(t),
    });

    const sectionEl = tab.render();
    document.querySelector('.sidepanel-content').appendChild(sectionEl);

    const navTab = document.createElement('button');
    navTab.className = 'nav-tab nav-tab-editor';
    navTab.dataset.section = tab.uid;
    navTab.innerHTML = `
      <span class="nav-tab-order"></span>
      <span class="nav-tab-label">${sanitizeText(tab.title)}</span>
      <span class="nav-tab-close" title="Close">${IconHelper.iconHTML('close', 'xs')}</span>
    `;
    navTab.addEventListener('click', (e) => {
      if (e.target.closest('.nav-tab-close')) {
        e.stopPropagation();
        this.closeEditorTab(tab.uid);
        return;
      }
      this.switchSection(tab.uid);
    });
    document.getElementById('editorTabsRow').appendChild(navTab);

    this.editorTabs.set(tab.uid, { tab, navTab, sectionEl });
    this.renumberEditorTabs();

    this.switchSection(tab.uid);
  }

  updateEditorTabLabel(tab) {
    const entry = this.editorTabs.get(tab.uid);
    if (entry) {
      entry.navTab.querySelector('.nav-tab-label').textContent = tab.title;
    }
  }

  // Keeps each open editor tab's badge showing its left-to-right position,
  // and shows/hides the row itself depending on whether any are open.
  renumberEditorTabs() {
    const row = document.getElementById('editorTabsRow');
    row.classList.toggle('hidden', this.editorTabs.size === 0);

    let index = 0;
    row.querySelectorAll('.nav-tab-editor').forEach((navTab) => {
      index += 1;
      navTab.querySelector('.nav-tab-order').textContent = index;
    });
  }

  closeEditorTab(uid) {
    const entry = this.editorTabs.get(uid);
    if (!entry) {
      return;
    }

    entry.tab.destroy();
    entry.navTab.remove();
    entry.sectionEl.remove();
    this.editorTabs.delete(uid);
    this.renumberEditorTabs();

    if (this.currentSection === uid) {
      this.switchSection('templates');
    }
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
          this.openEditor('template', 'run', card.dataset.templateId);
        }
      });

      card.querySelectorAll('.action-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const templateId = card.dataset.templateId;

          switch (action) {
            case 'edit':
              this.openEditor('template', 'edit', templateId);
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
          this.openEditor('workflow', 'run', workflowId);
        }
      });

      card.querySelectorAll('.action-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();

          try {
            switch (btn.dataset.action) {
              case 'edit':
                this.openEditor('workflow', 'edit', workflowId);
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

  async rerunFromHistory(historyEntry) {
    const template = await templateManager.getTemplate(historyEntry.templateId);
    if (template) {
      this.openEditor(
        'template',
        'run',
        historyEntry.templateId,
        historyEntry.inputs
      );
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

  // Opens the side panel UI as a full browser tab
  openFullScreen() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('sidepanel/sidepanel.html?view=fullscreen'),
    });
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

}

// Initialize the app when the sidepanel loads
document.addEventListener('DOMContentLoaded', () => {
  const app = new SidePanelApp();

  // Expose app for debugging
  window.aiToolboxSidePanel = app;
});
