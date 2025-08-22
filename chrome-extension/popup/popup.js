import templateManager from '../shared/template-manager.js';
import historyManager from '../shared/history-manager.js';
import aiService from '../shared/ai-service.js';
import storage from '../shared/storage.js';
import { formatRelativeTime, truncateText, debounce, copyToClipboard, downloadAsJson, parseJsonFile } from '../shared/helpers.js';
import { EVENTS, HISTORY_STATUS } from '../shared/constants.js';
import Toast from './components/toast.js';
import Modal from './components/modal.js';

class PopupApp {
  constructor() {
    this.currentSection = 'templates';
    this.templates = [];
    this.history = [];
    this.settings = null;
    this.currentTemplate = null;
    this.searchTimeout = null;
    
    this.init();
  }

  async init() {
    try {
      console.log('PopupApp: Starting initialization...');
      
      await Promise.all([
        templateManager.init(),
        historyManager.init(),
        aiService.init()
      ]);
      
      await this.loadData();
      this.setupEventListeners();
      this.render();
      
      // Validate storage persistence
      const validation = await storage.validatePersistence();
      if (validation) {
        console.log('PopupApp: Storage validation completed', validation);
      }
      
      console.log('PopupApp initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PopupApp:', error);
      Toast.show('Failed to initialize application', 'error');
    }
  }

  async loadData() {
    try {
      this.templates = await templateManager.getAllTemplates();
      this.history = await historyManager.getAllHistory();
      this.settings = await storage.getSettings();
    } catch (error) {
      console.error('Failed to load data:', error);
      throw error;
    }
  }

  setupEventListeners() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchSection(e.target.dataset.section);
      });
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showSettingsModal();
    });

    document.getElementById('createTemplateBtn').addEventListener('click', () => {
      this.showTemplateModal();
    });

    document.getElementById('templateSearch').addEventListener('input', 
      debounce((e) => this.searchTemplates(e.target.value), 300)
    );

    document.getElementById('historySearch').addEventListener('input',
      debounce((e) => this.searchHistory(e.target.value), 300)
    );

    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
      this.clearHistory();
    });

    this.setupModalEventListeners();
    this.setupManagerEventListeners();
  }

  setupModalEventListeners() {
    const templateModal = document.getElementById('templateModal');
    const executeModal = document.getElementById('executeModal');
    const settingsModal = document.getElementById('settingsModal');

    // Removed click-outside behavior to prevent auto-closing
    // Modals can only be closed via explicit close buttons

    document.getElementById('templateModalClose').addEventListener('click', () => {
      Modal.hide('template');
    });

    document.getElementById('templateModalCancel').addEventListener('click', () => {
      Modal.hide('template');
    });

    document.getElementById('templateForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTemplate();
    });

    document.getElementById('templatePrompt').addEventListener('input', (e) => {
      this.updateTemplateVariables(e.target.value);
    });

    document.getElementById('executeModalClose').addEventListener('click', () => {
      Modal.hide('execute');
    });

    document.getElementById('executeModalCancel').addEventListener('click', () => {
      Modal.hide('execute');
    });

    document.getElementById('executeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.executeTemplate();
    });

    document.getElementById('copyResultBtn').addEventListener('click', () => {
      this.copyResult();
    });

    document.getElementById('settingsModalClose').addEventListener('click', () => {
      Modal.hide('settings');
    });

    document.getElementById('settingsModalCancel').addEventListener('click', () => {
      Modal.hide('settings');
    });

    document.getElementById('settingsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });

    document.getElementById('aiProvider').addEventListener('change', (e) => {
      this.updateApiKeyVisibility(e.target.value);
    });

    document.getElementById('testConnectionBtn').addEventListener('click', () => {
      this.testConnection();
    });

    document.getElementById('exportDataBtn').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('importDataBtn').addEventListener('click', () => {
      document.getElementById('importFileInput').click();
    });

    document.getElementById('importFileInput').addEventListener('change', (e) => {
      this.importData(e.target.files[0]);
    });
  }

  setupManagerEventListeners() {
    templateManager.on(EVENTS.TEMPLATE_CREATED, (template) => {
      this.templates.push(template);
      this.renderTemplates();
      Toast.show('Template created successfully', 'success');
    });

    templateManager.on(EVENTS.TEMPLATE_UPDATED, (template) => {
      const index = this.templates.findIndex(t => t.id === template.id);
      if (index !== -1) {
        this.templates[index] = template;
        this.renderTemplates();
      }
      Toast.show('Template updated successfully', 'success');
    });

    templateManager.on(EVENTS.TEMPLATE_DELETED, (template) => {
      this.templates = this.templates.filter(t => t.id !== template.id);
      this.renderTemplates();
      Toast.show('Template deleted successfully', 'success');
    });

    historyManager.on(EVENTS.HISTORY_UPDATED, (data) => {
      this.loadData().then(() => {
        if (this.currentSection === 'history') {
          this.renderHistory();
        }
      });
    });
  }

  switchSection(section) {
    if (section === this.currentSection) return;
    
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.section === section);
    });
    
    document.querySelectorAll('.section').forEach(sec => {
      sec.classList.toggle('active', sec.id === section);
    });
    
    this.currentSection = section;
    
    if (section === 'templates') {
      this.renderTemplates();
    } else if (section === 'history') {
      this.renderHistory();
    }
  }

  render() {
    this.renderTemplates();
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
    
    container.innerHTML = this.templates.map(template => `
      <div class="template-card" data-template-id="${template.id}">
        <div class="template-card-header">
          <h3 class="template-card-title">${this.escapeHtml(template.name)}</h3>
          <div class="template-card-actions">
            <button class="action-btn edit" data-action="edit" title="Edit template">
              ✏️
            </button>
            <button class="action-btn duplicate" data-action="duplicate" title="Duplicate template">
              📋
            </button>
            <button class="action-btn delete" data-action="delete" title="Delete template">
              🗑️
            </button>
          </div>
        </div>
        ${template.description ? `<p class="template-card-description">${this.escapeHtml(template.description)}</p>` : ''}
        <p class="template-card-meta">
          Variables: ${template.inputs.length} • 
          Created: ${formatRelativeTime(template.createdAt)}
        </p>
      </div>
    `).join('');
    
    container.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.template-card-actions')) {
          this.executeTemplateById(card.dataset.templateId);
        }
      });
      
      card.querySelectorAll('.action-btn').forEach(btn => {
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
            case 'delete':
              this.deleteTemplate(templateId);
              break;
          }
        });
      });
    });
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
    
    container.innerHTML = this.history.map(entry => `
      <div class="history-entry" data-entry-id="${entry.id}">
        <div class="history-entry-header">
          <h4 class="history-entry-title">${this.escapeHtml(entry.templateName)}</h4>
          <div class="history-entry-time">
            <span class="status-badge ${entry.status}">${entry.status}</span>
            ${formatRelativeTime(entry.timestamp)}
          </div>
        </div>
        ${Object.keys(entry.inputs).length > 0 ? `
          <div class="history-entry-inputs">
            ${Object.entries(entry.inputs).map(([key, value]) => 
              `<strong>${key}:</strong> ${truncateText(String(value), 50)}`
            ).join(' • ')}
          </div>
        ` : ''}
        <div class="history-entry-result">
          ${entry.result ? truncateText(entry.result, 150) : 'No result'}
        </div>
        <div class="history-entry-actions">
          <button class="btn btn-small btn-secondary" data-action="copy">Copy Result</button>
          <button class="btn btn-small btn-secondary" data-action="rerun">Rerun</button>
          <button class="btn btn-small btn-secondary" data-action="delete">🗑️</button>
        </div>
      </div>
    `).join('');
    
    container.querySelectorAll('.history-entry').forEach(entry => {
      entry.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          const entryId = entry.dataset.entryId;
          const historyEntry = this.history.find(h => h.id === entryId);
          
          switch (action) {
            case 'copy':
              if (historyEntry && historyEntry.result) {
                copyToClipboard(historyEntry.result).then(() => {
                  Toast.show('Result copied to clipboard', 'success');
                }).catch(() => {
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

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showTemplateModal(template = null) {
    this.currentTemplate = template;
    const title = document.getElementById('templateModalTitle');
    const form = document.getElementById('templateForm');
    
    if (template) {
      title.textContent = 'Edit Template';
      document.getElementById('templateName').value = template.name;
      document.getElementById('templateDescription').value = template.description || '';
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
    
    container.innerHTML = `
      <h4>Template Variables</h4>
      ${variables.map(variable => `
        <div class="variable-group">
          <label class="form-label">${variable}</label>
          <input type="text" class="form-input" 
                 data-variable="${variable}" 
                 placeholder="Label for ${variable}" 
                 value="${variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}">
        </div>
      `).join('')}
    `;
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
      prompt: document.getElementById('templatePrompt').value.trim()
    };
    
    const variableInputs = document.querySelectorAll('#templateVariables [data-variable]');
    if (variableInputs.length > 0) {
      templateData.inputs = Array.from(variableInputs).map(input => ({
        name: input.dataset.variable,
        label: input.value.trim() || input.dataset.variable,
        placeholder: `Enter ${input.dataset.variable.replace(/_/g, ' ')}...`
      }));
    }
    
    try {
      if (this.currentTemplate) {
        await templateManager.updateTemplate(this.currentTemplate.id, templateData);
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

  async deleteTemplate(templateId) {
    if (confirm('Are you sure you want to delete this template?')) {
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
    
    // Reset all states to initial modal state FIRST
    const loadingEl = document.getElementById('executeLoading');
    const resultEl = document.getElementById('executeResult');
    const errorEl = document.getElementById('executeError');
    const runBtn = document.getElementById('executeModalRun');
    
    loadingEl.classList.add('hidden');
    resultEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    runBtn.disabled = false;
    runBtn.textContent = 'Run Template';
    
    // Now set up the modal content
    const title = document.getElementById('executeModalTitle');
    const inputsContainer = document.getElementById('executeInputs');
    
    title.textContent = `Execute: ${template.name}`;
    
    if (template.inputs && template.inputs.length > 0) {
      inputsContainer.innerHTML = template.inputs.map(input => `
        <div class="form-group">
          <label class="form-label" for="input_${input.name}">${input.label}</label>
          <textarea id="input_${input.name}" name="${input.name}" class="form-textarea" 
                    placeholder="${input.placeholder}" rows="2"></textarea>
        </div>
      `).join('');
    } else {
      inputsContainer.innerHTML = '<p>This template has no variables to fill.</p>';
    }
    
    Modal.show('execute');
  }

  async executeTemplate() {
    if (!this.currentTemplate) return;
    
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
      const result = await aiService.processTemplate(this.currentTemplate, inputs);
      
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
      copyToClipboard(resultContent).then(() => {
        Toast.show('Result copied to clipboard', 'success');
      }).catch(() => {
        Toast.show('Failed to copy result', 'error');
      });
    }
  }

  async rerunFromHistory(historyEntry) {
    const template = await templateManager.getTemplate(historyEntry.templateId);
    if (template) {
      this.showExecuteModal(template);
      
      // Small delay to ensure modal is fully rendered before populating inputs
      setTimeout(() => {
        Object.entries(historyEntry.inputs).forEach(([key, value]) => {
          const input = document.getElementById(`input_${key}`);
          if (input) {
            input.value = value;
          }
        });
      }, 150);
    }
  }

  async deleteHistoryEntry(entryId) {
    if (confirm('Are you sure you want to delete this history entry?')) {
      try {
        await historyManager.deleteHistoryEntry(entryId);
      } catch (error) {
        console.error('Failed to delete history entry:', error);
        Toast.show('Failed to delete history entry', 'error');
      }
    }
  }

  async clearHistory() {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      try {
        const clearedCount = await historyManager.clearHistory();
        Toast.show(`Cleared ${clearedCount} history entries`, 'success');
      } catch (error) {
        console.error('Failed to clear history:', error);
        Toast.show('Failed to clear history', 'error');
      }
    }
  }

  async showSettingsModal() {
    Modal.show('settings');
    
    const providerSelect = document.getElementById('aiProvider');
    const apiKeyInput = document.getElementById('apiKey');
    const providers = aiService.getAvailableProviders();
    
    providerSelect.innerHTML = providers.map(provider => 
      `<option value="${provider.id}">${provider.name}</option>`
    ).join('');
    
    providerSelect.value = this.settings.provider;
    apiKeyInput.value = this.settings.apiKey || '';
    
    this.updateApiKeyVisibility(this.settings.provider);
    this.updateStorageInfo();
  }

  updateApiKeyVisibility(provider) {
    const apiKeyGroup = document.getElementById('apiKeyGroup');
    const apiKeyHelp = document.getElementById('apiKeyHelp');
    const providerDescription = document.getElementById('providerDescription');
    const providers = aiService.getAvailableProviders();
    const currentProvider = providers.find(p => p.id === provider);
    
    // Update provider description
    if (currentProvider && currentProvider.description) {
      providerDescription.textContent = currentProvider.description;
      providerDescription.style.display = 'block';
    } else {
      providerDescription.style.display = 'none';
    }
    
    // Update API key visibility
    if (currentProvider && currentProvider.requiresApiKey) {
      apiKeyGroup.style.display = 'block';
      if (currentProvider.apiKeyUrl) {
        apiKeyHelp.href = currentProvider.apiKeyUrl;
        apiKeyHelp.style.display = 'inline';
      } else {
        apiKeyHelp.style.display = 'none';
      }
    } else {
      apiKeyGroup.style.display = 'none';
    }
  }

  async updateStorageInfo() {
    try {
      const storageInfo = await storage.getStorageInfo();
      const storageInfoEl = document.getElementById('storageInfo');
      
      if (storageInfo) {
        const percentUsed = Math.round(storageInfo.percentUsed);
        let barClass = '';
        
        if (percentUsed > 90) barClass = 'error';
        else if (percentUsed > 75) barClass = 'warning';
        
        storageInfoEl.innerHTML = `
          <div class="storage-bar">
            <div class="storage-bar-fill ${barClass}" style="width: ${percentUsed}%"></div>
          </div>
          <div class="storage-text">
            ${Math.round(storageInfo.bytesInUse / 1024)} KB of ${Math.round(storageInfo.quota / 1024)} KB used (${percentUsed}%)
          </div>
        `;
      }
    } catch (error) {
      console.error('Failed to get storage info:', error);
    }
  }

  async testConnection() {
    const provider = document.getElementById('aiProvider').value;
    const apiKey = document.getElementById('apiKey').value;
    const statusEl = document.getElementById('connectionStatus');
    const testBtn = document.getElementById('testConnectionBtn');
    
    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';
    
    try {
      await aiService.updateSettings({ provider, apiKey });
      const result = await aiService.testConnection();
      
      statusEl.className = `connection-status ${result.success ? 'success' : 'error'}`;
      statusEl.textContent = result.success 
        ? 'Connection successful!' 
        : `Connection failed: ${result.error}`;
      statusEl.classList.remove('hidden');
    } catch (error) {
      statusEl.className = 'connection-status error';
      statusEl.textContent = `Test failed: ${error.message}`;
      statusEl.classList.remove('hidden');
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test Connection';
    }
  }

  async saveSettings() {
    const provider = document.getElementById('aiProvider').value;
    const apiKey = document.getElementById('apiKey').value;
    
    try {
      await aiService.updateSettings({ provider, apiKey });
      this.settings = await storage.getSettings();
      Modal.hide('settings');
      Toast.show('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Toast.show('Failed to save settings', 'error');
    }
  }

  async exportData() {
    try {
      const [templates, history] = await Promise.all([
        templateManager.exportTemplates(),
        historyManager.exportHistory()
      ]);
      
      const exportData = {
        templates: templates.templates,
        history: history.history,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };
      
      const filename = `ai-toolbox-backup-${new Date().toISOString().split('T')[0]}.json`;
      downloadAsJson(exportData, filename);
      
      Toast.show('Data exported successfully', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      Toast.show('Failed to export data', 'error');
    }
  }

  async importData(file) {
    if (!file) return;
    
    try {
      const data = await parseJsonFile(file);
      
      if (data.templates) {
        const result = await templateManager.importTemplates(data);
        if (result.imported.length > 0) {
          Toast.show(`Imported ${result.imported.length} templates`, 'success');
        }
        if (result.errors.length > 0) {
          console.warn('Import errors:', result.errors);
          Toast.show(`${result.errors.length} templates failed to import`, 'warning');
        }
      }
      
      await this.loadData();
      this.render();
    } catch (error) {
      console.error('Import failed:', error);
      Toast.show('Failed to import data', 'error');
    } finally {
      document.getElementById('importFileInput').value = '';
    }
  }

  // Debug function to test storage persistence
  async testStoragePersistence() {
    console.log('Testing storage persistence...');
    
    const testData = {
      timestamp: new Date().toISOString(),
      testValue: Math.random().toString(36).substring(7)
    };
    
    await storage.set('test_persistence', testData);
    console.log('Test data saved:', testData);
    
    const retrieved = await storage.get('test_persistence');
    console.log('Test data retrieved:', retrieved);
    
    if (retrieved && retrieved.testValue === testData.testValue) {
      console.log('✅ Storage persistence test PASSED');
      Toast.show('Storage persistence test passed', 'success');
    } else {
      console.log('❌ Storage persistence test FAILED');
      Toast.show('Storage persistence test failed', 'error');
    }
    
    return retrieved;
  }
}

// Initialize the app when the popup loads
document.addEventListener('DOMContentLoaded', () => {
  const app = new PopupApp();
  
  // Expose app and storage testing functions globally for debugging
  window.aiToolboxApp = app;
  window.testStorage = () => app.testStoragePersistence();
  window.validateStorage = () => storage.validatePersistence();
  window.exportAllData = () => storage.exportAllData();
});