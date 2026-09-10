import aiService from '../shared/ai-service.js';
import storage from '../shared/storage.js';
import { downloadAsJson, parseJsonFile } from '../shared/helpers.js';
import { EXTENSION_VERSION, EMPTY_API_KEYS } from '../shared/constants.js';
import { AI_PROVIDERS, normalizeProviderId } from '../shared/providers.js';
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
        this.selectProvider(e.target.value);
      });
    }

    const refreshModelsBtn = document.getElementById('refreshModelsBtn');
    if (refreshModelsBtn) {
      refreshModelsBtn.addEventListener('click', () => {
        this.refreshModels();
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
    const providers = aiService.getAvailableProviders();
    const currentProvider = normalizeProviderId(this.settings.provider);

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

    this.selectProvider(currentProvider);
    this.updateStorageInfo();
  }

  // Loads every provider-scoped field — key, endpoint, model — for one provider.
  selectProvider(providerId) {
    const provider = aiService
      .getAvailableProviders()
      .find((candidate) => candidate.id === providerId);
    if (!provider) {
      return;
    }

    const config = this.settings.providerConfig?.[providerId] || {};

    document.getElementById('apiKey').value =
      this.getApiKeyForProvider(providerId) || '';
    document.getElementById('baseUrl').value = config.baseUrl || '';
    document.getElementById('baseUrl').placeholder =
      provider.defaultBaseUrl || 'https://api.example.com/v1';
    document.getElementById('model').value =
      config.model || provider.defaultModel || '';

    this.renderModelOptions(provider.models);
    this.updateProviderVisibility(provider);
  }

  renderModelOptions(models) {
    document.getElementById('modelOptions').innerHTML = models
      .map((model) => `<option value="${model}"></option>`)
      .join('');
  }

  async refreshModels() {
    const providerId = document.getElementById('aiProvider').value;
    const button = document.getElementById('refreshModelsBtn');

    button.disabled = true;
    try {
      // Read the endpoint and key currently in the form rather than the saved
      // ones, so listing works before the user hits Save.
      const models = await aiService.withSettings(
        {
          ...this.settings,
          apiKeys: {
            ...this.settings.apiKeys,
            [providerId]: document.getElementById('apiKey').value,
          },
          providerConfig: {
            ...this.settings.providerConfig,
            [providerId]: {
              ...this.settings.providerConfig?.[providerId],
              baseUrl: document.getElementById('baseUrl').value,
            },
          },
        },
        () => aiService.listRemoteModels(providerId)
      );

      this.renderModelOptions(models);
      Toast.show(
        models.length > 0
          ? `Found ${models.length} model${models.length === 1 ? '' : 's'}`
          : 'The endpoint reported no models',
        models.length > 0 ? 'success' : 'warning'
      );
    } catch (error) {
      console.error('Failed to list models:', error);
      Toast.show(`Could not list models: ${error.message}`, 'error');
    } finally {
      button.disabled = false;
    }
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

  updateProviderVisibility(provider) {
    const apiKeyGroup = document.getElementById('apiKeyGroup');
    const apiKeyHelp = document.getElementById('apiKeyHelp');
    const providerDescription = document.getElementById('providerDescription');

    providerDescription.textContent = provider.description || '';
    providerDescription.style.display = provider.description ? 'block' : 'none';

    // Local endpoints take an optional key (some proxies want one), so the
    // field stays available whenever a key could plausibly be used.
    const showApiKey = provider.requiresApiKey || provider.configurableBaseUrl;
    apiKeyGroup.style.display = showApiKey ? 'block' : 'none';
    apiKeyGroup.querySelector('#apiKey').placeholder = provider.requiresApiKey
      ? 'Enter your API key...'
      : 'Optional for this endpoint';

    if (showApiKey && provider.apiKeyUrl) {
      apiKeyHelp.href = provider.apiKeyUrl;
      apiKeyHelp.textContent = provider.local ? 'Setup guide' : 'Get API Key';
      apiKeyHelp.style.display = 'inline';
    } else {
      apiKeyHelp.style.display = 'none';
    }

    document
      .getElementById('baseUrlGroup')
      .classList.toggle('hidden', !provider.configurableBaseUrl);

    const isMock = provider.id === AI_PROVIDERS.MOCK;
    document.getElementById('modelGroup').classList.toggle('hidden', isMock);
    document
      .getElementById('refreshModelsBtn')
      .classList.toggle('hidden', !provider.supportsModelListing);
    document.getElementById('modelHelp').textContent = provider.local
      ? 'Type a model you have pulled locally, or press Refresh to list them.'
      : 'Pick a suggested model or type any id the provider supports.';
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
      const result = await aiService.validateApiKey(provider, apiKey, {
        model: document.getElementById('model').value.trim(),
        baseUrl: document.getElementById('baseUrl').value.trim(),
      });

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
      const apiKeys = { ...EMPTY_API_KEYS, ...this.settings.apiKeys };
      apiKeys[provider] = apiKey;

      const providerConfig = {
        ...this.settings.providerConfig,
        [provider]: {
          ...this.settings.providerConfig?.[provider],
          model: document.getElementById('model').value.trim(),
          baseUrl: document.getElementById('baseUrl').value.trim(),
        },
      };

      // Update settings with new provider, per-provider keys and model/endpoint
      await aiService.updateSettings({
        provider,
        apiKey, // Keep for backward compatibility
        apiKeys,
        providerConfig,
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
      const [{ default: templateManager }, { default: workflowManager }] =
        await Promise.all([
          import('../shared/template-manager.js'),
          import('../shared/workflow-manager.js'),
        ]);

      await Promise.all([templateManager.init(), workflowManager.init()]);

      const templates = await templateManager.exportTemplates();
      const workflows = await workflowManager.exportWorkflows();

      const exportData = {
        templates: templates.templates,
        workflows: workflows.workflows,
        exportedAt: new Date().toISOString(),
        version: EXTENSION_VERSION,
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

      const imported = [];
      const errors = [];

      if (data.templates) {
        const { default: templateManager } =
          await import('../shared/template-manager.js');
        await templateManager.init();

        const result = await templateManager.importTemplates(data);
        imported.push(`${result.imported.length} templates`);
        errors.push(...result.errors);
      }

      if (data.workflows) {
        const { default: workflowManager } =
          await import('../shared/workflow-manager.js');
        await workflowManager.init();

        const result = await workflowManager.importWorkflows(data);
        imported.push(`${result.imported.length} workflows`);
        errors.push(...result.errors);
      }

      if (imported.length > 0) {
        Toast.show(`Imported ${imported.join(' and ')}`, 'success');
      }
      if (errors.length > 0) {
        console.warn('Import errors:', errors);
        Toast.show(`${errors.length} items failed to import`, 'warning');
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

    if (from === 'sidepanel') {
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
      // Default fallback
      window.location.href = '../sidepanel/sidepanel.html';
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
