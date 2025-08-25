import aiService from '../shared/ai-service.js';
import storage from '../shared/storage.js';
import { downloadAsJson, parseJsonFile } from '../shared/helpers.js';
import Toast from '../popup/components/toast.js';

class SettingsPage {
  constructor() {
    this.settings = null;
    this.init();
  }

  async init() {
    try {
      console.log('SettingsPage: Starting initialization...');
      
      await Promise.all([
        aiService.init(),
        this.loadSettings()
      ]);
      
      this.setupEventListeners();
      this.populateForm();
      
      console.log('SettingsPage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SettingsPage:', error);
      Toast.show('Failed to initialize settings page', 'error');
    }
  }

  async loadSettings() {
    try {
      this.settings = await storage.getSettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
      this.goBack();
    });

    // Form submission
    document.getElementById('settingsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });

    // AI Provider change
    document.getElementById('aiProvider').addEventListener('change', (e) => {
      this.updateApiKeyVisibility(e.target.value);
    });

    // Test connection
    document.getElementById('testConnectionBtn').addEventListener('click', () => {
      this.testConnection();
    });

    // Data export/import
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

  populateForm() {
    const providerSelect = document.getElementById('aiProvider');
    const apiKeyInput = document.getElementById('apiKey');
    const providers = aiService.getAvailableProviders();
    
    // Populate AI providers
    providerSelect.innerHTML = providers.map(provider => 
      `<option value="${provider.id}">${provider.name}</option>`
    ).join('');
    
    // Set current values
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
        
        if (percentUsed > 90) {
          barClass = 'error';
        } else if (percentUsed > 75) {
          barClass = 'warning';
        }
        
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
      testBtn.textContent = 'Test';
    }
  }

  async saveSettings() {
    const provider = document.getElementById('aiProvider').value;
    const apiKey = document.getElementById('apiKey').value;
    
    try {
      await aiService.updateSettings({ provider, apiKey });
      this.settings = await storage.getSettings();
      Toast.show('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Toast.show('Failed to save settings', 'error');
    }
  }


  async exportData() {
    try {
      const { templateManager } = await import('../shared/template-manager.js');
      const { historyManager } = await import('../shared/history-manager.js');
      
      await Promise.all([
        templateManager.init(),
        historyManager.init()
      ]);

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
    if (!file) {
      return;
    }
    
    try {
      const data = await parseJsonFile(file);
      
      if (data.templates) {
        const { templateManager } = await import('../shared/template-manager.js');
        await templateManager.init();
        
        const result = await templateManager.importTemplates(data);
        if (result.imported.length > 0) {
          Toast.show(`Imported ${result.imported.length} templates`, 'success');
        }
        if (result.errors.length > 0) {
          console.warn('Import errors:', result.errors);
          Toast.show(`${result.errors.length} templates failed to import`, 'warning');
        }
      }
    } catch (error) {
      console.error('Import failed:', error);
      Toast.show('Failed to import data', 'error');
    } finally {
      document.getElementById('importFileInput').value = '';
    }
  }

  goBack() {
    // Try to determine where to go back to
    const referrer = document.referrer;
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');

    if (from === 'popup') {
      // Go back to popup in new tab
      chrome.tabs.create({
        url: chrome.runtime.getURL('popup/popup.html')
      });
    } else if (from === 'sidepanel') {
      // Go back to sidepanel in current window
      window.location.href = '../sidepanel/sidepanel.html';
    } else if (referrer && referrer.includes(chrome.runtime.getURL(''))) {
      // Go back to previous extension page
      window.history.back();
    } else {
      // Default fallback - go to sidepanel if we're in sidepanel context, otherwise popup
      if (window.location.href.includes('chrome-extension://')) {
        window.location.href = '../sidepanel/sidepanel.html';
      } else {
        chrome.tabs.create({
          url: chrome.runtime.getURL('popup/popup.html')
        });
      }
    }
  }
}

// Initialize the settings page when the DOM loads
document.addEventListener('DOMContentLoaded', () => {
  const settingsPage = new SettingsPage();
  
  // Expose for debugging
  window.settingsPage = settingsPage;
});