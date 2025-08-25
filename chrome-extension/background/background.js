class AIToolboxBackground {
  constructor() {
    this.contextMenus = new Map();
    this.activeProcessing = new Map();
    this.contextMenusCreating = false;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.setupContextMenus();
    await this.validateStorageOnStartup();
    console.log('AI Toolbox background script initialized');
  }

  setupEventListeners() {
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });

    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });

    chrome.action.onClicked.addListener((tab) => {
      this.handleActionClick(tab);
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabClosed(tabId);
    });

    // Side panel integration
    chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true });
  }

  async handleInstall(details) {
    if (details.reason === 'install') {
      await this.setupInitialData();
      this.showWelcomeNotification();
    } else if (details.reason === 'update') {
      await this.handleUpdate(details.previousVersion);
    }
  }

  async setupInitialData() {
    try {
      const result = await chrome.storage.sync.get(['templates']);
      if (!result.templates) {
        console.log('Setting up initial templates...');
      }
    } catch (error) {
      console.error('Failed to setup initial data:', error);
    }
  }

  showWelcomeNotification() {
    if (chrome.notifications) {
      chrome.notifications.create('welcome', {
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: 'AI Toolbox Installed!',
        message: 'Click the extension icon to get started with AI-powered templates.'
      });
    }
  }

  async handleUpdate(previousVersion) {
    console.log(`Updated from version ${previousVersion}`);
  }

  async handleStartup() {
    await this.setupContextMenus();
    await this.validateStorageOnStartup();
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'updateContextMenu':
          await this.updateContextMenus(request.selectedText);
          sendResponse({ success: true });
          break;

        case 'processTemplate':
          await this.processTemplate(request, sender.tab);
          sendResponse({ success: true });
          break;

        case 'getTemplates': {
          const templates = await this.getTemplates();
          sendResponse({ templates });
          break;
        }

        case 'textSelected':
          await this.handleTextSelection(request, sender.tab);
          sendResponse({ success: true });
          break;

        case 'setBadge':
          this.setBadge(request.text, request.color);
          sendResponse({ success: true });
          break;

        case 'openSidePanel':
          await this.openSidePanel(sender.tab?.id);
          sendResponse({ success: true });
          break;

        case 'getSidePanelState': {
          const state = await this.getSidePanelState(sender.tab?.id);
          sendResponse({ state });
          break;
        }

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  async setupContextMenus() {
    try {
      // Clear existing menus and wait for completion
      await chrome.contextMenus.removeAll();
      
      // Add a small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Check if menus are already being created
      if (this.contextMenusCreating) {
        console.log('Context menus already being created, skipping...');
        return;
      }
      
      this.contextMenusCreating = true;
      
      try {
        chrome.contextMenus.create({
          id: 'ai-toolbox-main',
          title: 'AI Toolbox',
          contexts: ['selection']
        });

        chrome.contextMenus.create({
          id: 'ai-toolbox-separator',
          type: 'separator',
          parentId: 'ai-toolbox-main',
          contexts: ['selection']
        });

        const templates = await this.getTemplates();
        
        if (templates.length === 0) {
          chrome.contextMenus.create({
            id: 'no-templates',
            title: 'No templates available',
            parentId: 'ai-toolbox-main',
            contexts: ['selection'],
            enabled: false
          });
        } else {
          templates.slice(0, 5).forEach((template) => {
            chrome.contextMenus.create({
              id: `template-${template.id}`,
              title: `Process with "${template.name}"`,
              parentId: 'ai-toolbox-main',
              contexts: ['selection']
            });
          });
          
          if (templates.length > 5) {
            chrome.contextMenus.create({
              id: 'more-templates',
              title: `... and ${templates.length - 5} more templates`,
              parentId: 'ai-toolbox-main',
              contexts: ['selection'],
              enabled: false
            });
          }
        }

        chrome.contextMenus.create({
          id: 'open-popup',
          title: 'Open AI Toolbox',
          parentId: 'ai-toolbox-main',
          contexts: ['selection']
        });
        
        console.log('Context menus created successfully');
      } finally {
        this.contextMenusCreating = false;
      }
    } catch (error) {
      console.error('Failed to setup context menus:', error);
      this.contextMenusCreating = false;
    }
  }

  async updateContextMenus(selectedText) {
    if (selectedText && selectedText.length > 0) {
      await this.setupContextMenus();
    }
  }

  async handleContextMenuClick(info, tab) {
    if (info.menuItemId === 'open-popup') {
      chrome.action.openPopup();
      return;
    }

    if (info.menuItemId.startsWith('template-')) {
      const templateId = info.menuItemId.replace('template-', '');
      const selectedText = info.selectionText || '';
      
      await this.processTemplateWithId(templateId, selectedText, tab);
    }
  }

  async processTemplateWithId(templateId, selectedText, tab) {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        this.showError(tab.id, 'Template not found');
        return;
      }

      this.setBadge('⚙️', '#2563eb');
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'showProcessingOverlay',
        template,
        selectedText
      });

      const result = await this.processTemplateWithAI(template, { selected_text: selectedText });
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'showResultOverlay',
        template,
        selectedText,
        result: result.result
      });
      
      this.setBadge('✓', '#059669');
      
      setTimeout(() => {
        this.setBadge('', '');
      }, 3000);
      
    } catch (error) {
      console.error('Failed to process template:', error);
      this.setBadge('✗', '#dc2626');
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'showErrorOverlay',
        template: { name: 'Template' },
        selectedText,
        error: error.message
      });
      
      setTimeout(() => {
        this.setBadge('', '');
      }, 5000);
    }
  }

  async processTemplate(request, tab) {
    const { templateId, selectedText } = request;
    await this.processTemplateWithId(templateId, selectedText, tab);
  }

  async processTemplateWithAI() {
    const mockResponses = [
      "This is a mock AI response generated by the Chrome extension. In a real implementation, this would be processed by your chosen AI provider.",
      "Mock AI processing complete. Your selected text has been analyzed and this is the generated response for demonstration purposes.",
      "Simulated AI result: The template has been successfully processed with your input text. This shows how the extension would work with a real AI service.",
      "Demo response: This is what an AI-generated result would look like when processing your template with the selected text from the webpage."
    ];
    
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
    
    if (Math.random() < 0.1) {
      throw new Error('Simulated AI service error for testing');
    }
    
    const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    
    return {
      result: response,
      provider: 'mock',
      duration: Math.floor(Math.random() * 3000) + 500
    };
  }

  async getTemplates() {
    try {
      const result = await chrome.storage.sync.get(['templates']);
      return result.templates || [];
    } catch (error) {
      console.error('Failed to get templates:', error);
      return [];
    }
  }

  async getTemplate(templateId) {
    const templates = await this.getTemplates();
    return templates.find(t => t.id === templateId);
  }

  async handleTextSelection(request) {
    const { selectedText } = request;
    
    if (selectedText && selectedText.length > 10) {
      this.setBadge(selectedText.length.toString(), '#6b7280');
      
      setTimeout(() => {
        this.setBadge('', '');
      }, 2000);
    }
  }

  setBadge(text, color) {
    if (chrome.action) {
      chrome.action.setBadgeText({ text });
      chrome.action.setBadgeBackgroundColor({ color });
    }
  }

  async showError(tabId, message) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'showError',
        message
      });
    } catch (error) {
      console.error('Failed to show error:', error);
    }
  }

  handleActionClick() {
    console.log('Extension icon clicked');
  }

  handleTabClosed(tabId) {
    if (this.activeProcessing.has(tabId)) {
      this.activeProcessing.delete(tabId);
    }
  }

  async validateStorageOnStartup() {
    try {
      console.log('Background: Validating storage persistence...');
      
      const [templates, history, settings] = await Promise.all([
        chrome.storage.sync.get(['templates']),
        chrome.storage.sync.get(['history']),
        chrome.storage.sync.get(['settings'])
      ]);
      
      const storageInfo = await this.getStorageUsage();
      
      console.log(`Background: Storage validation results:
        - Templates: ${templates.templates?.length || 0} items
        - History: ${history.history?.length || 0} items
        - Settings: ${settings.settings?.provider || 'Not set'}
        - Storage usage: ${Math.round((storageInfo?.bytesInUse || 0) / 1024)}KB / ${Math.round((storageInfo?.quota || 0) / 1024)}KB`);
      
      return {
        templates: templates.templates?.length || 0,
        history: history.history?.length || 0,
        hasSettings: !!settings.settings?.provider,
        storageInfo
      };
    } catch (error) {
      console.error('Background: Storage validation failed:', error);
      return null;
    }
  }

  async getStorageUsage() {
    try {
      return new Promise((resolve) => {
        chrome.storage.sync.getBytesInUse(null, (bytesInUse) => {
          resolve({
            bytesInUse,
            quota: chrome.storage.sync.QUOTA_BYTES,
            percentUsed: (bytesInUse / chrome.storage.sync.QUOTA_BYTES) * 100
          });
        });
      });
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return null;
    }
  }

  async openSidePanel(tabId) {
    try {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        await chrome.sidePanel.open({ tabId });
        console.log('Side panel opened for tab:', tabId);
      } else {
        console.warn('Side panel API not available');
      }
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  }

  async getSidePanelState(tabId) {
    try {
      if (chrome.sidePanel && chrome.sidePanel.getOptions) {
        const options = await chrome.sidePanel.getOptions({ tabId });
        return { enabled: options.enabled, path: options.path };
      }
      return { enabled: true, path: 'sidepanel/sidepanel.html' };
    } catch (error) {
      console.error('Failed to get side panel state:', error);
      return { enabled: false, path: null };
    }
  }

  async cleanup() {
    this.contextMenus.clear();
    this.activeProcessing.clear();
    this.setBadge('', '');
  }
}

const aiToolboxBackground = new AIToolboxBackground();

chrome.runtime.onSuspend?.addListener(() => {
  aiToolboxBackground.cleanup();
});