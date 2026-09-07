import aiService from '../shared/ai-service.js';
import storage from '../shared/storage.js';
import { downloadAsJson, parseJsonFile } from '../shared/helpers.js';
import Toast from '../shared/components/toast.js';

class SettingsPage {
  constructor() {
    this.settings = null;
    this.init();
  }

  async init() {
    try {
      console.log('SettingsPage: Starting initialization...');

      // Setup event listeners first, so buttons always work
      this.setupEventListeners();

      await Promise.all([aiService.init(), this.loadSettings()]);

      this.populateForm();

      // Mark that we're on the settings page
      await chrome.storage.local.set({ last_active_page: 'settings' });

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
    console.log('Setting up event listeners...');

    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', async () => {
        console.log('Back button clicked');
        await this.goBack();
      });
    } else {
      console.error('Back button element not found!');
    }

    // Form submission
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', async (e) => {
        console.log('Form submitted');
        e.preventDefault();
        await this.saveSettings();
      });
    } else {
      console.error('Settings form element not found!');
    }

    // Save settings button (backup handler)
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async (e) => {
        console.log('Save button clicked');
        e.preventDefault();
        await this.saveSettings();
      });
    } else {
      console.error('Save settings button element not found!');
    }

    // AI Provider change
    const providerSelect = document.getElementById('aiProvider');
    if (providerSelect) {
      providerSelect.addEventListener('change', (e) => {
        const newProvider = e.target.value;
        this.updateApiKeyVisibility(newProvider);

        // Load the API key for the newly selected provider
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput) {
          const providerApiKey = this.getApiKeyForProvider(newProvider);
          apiKeyInput.value = providerApiKey || '';
        }
      });
    }

    // API Key help link - open in new tab without affecting sidepanel
    const apiKeyHelp = document.getElementById('apiKeyHelp');
    if (apiKeyHelp) {
      apiKeyHelp.addEventListener('click', (e) => {
        e.preventDefault();
        const url = e.target.href;
        if (url && url !== '#') {
          chrome.tabs.create({ url });
        }
      });
    }

    // Test connection
    const testBtn = document.getElementById('testConnectionBtn');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        this.testConnection();
      });
    }

    // Data export/import
    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportData();
      });
    }

    const importBtn = document.getElementById('importDataBtn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const importInput = document.getElementById('importFileInput');
        if (importInput) {
          importInput.click();
        }
      });
    }

    const importFileInput = document.getElementById('importFileInput');
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => {
        this.importData(e.target.files[0]);
      });
    }

    console.log('Event listeners setup complete');
  }

  populateForm() {
    const providerSelect = document.getElementById('aiProvider');
    const apiKeyInput = document.getElementById('apiKey');
    const providers = aiService.getAvailableProviders();
    const currentProvider = this.settings.provider || 'gemini';

    // Build simple HTML string with selected attribute
    const optionsHTML = providers
      .map((provider) => {
        const selected = provider.id === currentProvider ? ' selected' : '';
        return `<option value="${provider.id}"${selected}>${provider.name}</option>`;
      })
      .join('');

    providerSelect.innerHTML = optionsHTML;

    // Ensure the select is visible and has proper styles
    providerSelect.style.color = 'inherit';
    providerSelect.style.webkitTextFillColor = 'inherit';

    // Load API key for current provider
    const currentApiKey = this.getApiKeyForProvider(currentProvider);
    apiKeyInput.value = currentApiKey || '';

    this.updateApiKeyVisibility(currentProvider);
    this.updateStorageInfo();
  }

  getApiKeyForProvider(provider) {
    // Check new apiKeys structure first
    if (this.settings.apiKeys && this.settings.apiKeys[provider]) {
      return this.settings.apiKeys[provider];
    }

    // Fallback to legacy apiKey field if it matches current provider
    if (this.settings.apiKey && provider === this.settings.provider) {
      return this.settings.apiKey;
    }

    return '';
  }

  updateApiKeyVisibility(provider) {
    const apiKeyGroup = document.getElementById('apiKeyGroup');
    const apiKeyHelp = document.getElementById('apiKeyHelp');
    const providerDescription = document.getElementById('providerDescription');
    const providers = aiService.getAvailableProviders();
    const currentProvider = providers.find((p) => p.id === provider);

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
      // Validates against a temporary copy of the settings — testing must not
      // persist an unsaved provider/key the user never confirmed with Save.
      const result = await aiService.validateApiKey(provider, apiKey);

      statusEl.className = `connection-status ${result.valid ? 'success' : 'error'}`;
      statusEl.textContent = result.valid
        ? 'Connection successful!'
        : result.message;
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
      // Initialize apiKeys object if it doesn't exist
      if (!this.settings.apiKeys) {
        this.settings.apiKeys = {
          openai: '',
          claude: '',
          gemini: '',
          llama: '',
          grok: '',
        };
      }

      // Save the API key for the selected provider
      this.settings.apiKeys[provider] = apiKey;

      // Update settings with new provider and per-provider API keys
      await aiService.updateSettings({
        provider,
        apiKey, // Keep for backward compatibility
        apiKeys: this.settings.apiKeys,
      });

      this.settings = await storage.getSettings();
      Toast.show('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Toast.show('Failed to save settings', 'error');
    }
  }

  async exportData() {
    try {
      const templateManagerModule = await import(
        '../shared/template-manager.js'
      );
      const templateManager = templateManagerModule.default;

      await templateManager.init();

      const templates = await templateManager.exportTemplates();

      const exportData = {
        templates: templates.templates,
        exportedAt: new Date().toISOString(),
        version: '0.9.0',
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
        const templateManagerModule = await import(
          '../shared/template-manager.js'
        );
        const templateManager = templateManagerModule.default;
        await templateManager.init();

        const result = await templateManager.importTemplates(data);
        if (result.imported.length > 0) {
          Toast.show(`Imported ${result.imported.length} templates`, 'success');
        }
        if (result.errors.length > 0) {
          console.warn('Import errors:', result.errors);
          Toast.show(
            `${result.errors.length} templates failed to import`,
            'warning'
          );
        }
      }
    } catch (error) {
      console.error('Import failed:', error);
      Toast.show('Failed to import data', 'error');
    } finally {
      document.getElementById('importFileInput').value = '';
    }
  }

  async goBack() {
    // Try to determine where to go back to
    const referrer = document.referrer;
    const urlParams = new URLSearchParams(window.location.search);
    const from = urlParams.get('from');

    if (from === 'popup') {
      // Go back to popup in new tab
      chrome.tabs.create({
        url: chrome.runtime.getURL('popup/popup.html'),
      });
    } else if (from === 'sidepanel') {
      // Reset the sidepanel path to default
      await chrome.storage.local.set({ last_active_page: 'sidepanel' });
      await chrome.runtime.sendMessage({
        action: 'setSidePanelPath',
        path: 'sidepanel/sidepanel.html',
      });

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
          url: chrome.runtime.getURL('popup/popup.html'),
        });
      }
    }
  }
}

// Initialize the settings page
// For ES modules loaded at end of body, DOM is already ready
// But we check document.readyState to be safe
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const settingsPage = new SettingsPage();
    window.settingsPage = settingsPage;
  });
} else {
  // DOM already loaded, initialize immediately
  const settingsPage = new SettingsPage();
  window.settingsPage = settingsPage;
}
