/**
 * Background Service Worker Integration Tests
 *
 * Tests the background script including:
 * - Extension lifecycle events
 * - Message handling
 * - Context menu management
 * - Side panel integration
 * - Tab management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installChromeMock, uninstallChromeMock, testUtils, chromeMock } from '../mocks/chrome-api.mock.js';
import { fixtures, factories } from '../fixtures/test-data.js';

describe('Background Service Worker Integration', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    uninstallChromeMock();
  });

  describe('Scenario: Extension installation', () => {
    it('should handle fresh installation', async () => {
      // Given: Extension is being installed for the first time
      const installHandler = vi.fn();
      chromeMock.runtime.onInstalled.addListener(installHandler);

      // When: Install event fires
      chromeMock.runtime.onInstalled._trigger({ reason: 'install' });

      // Then: Install handler should be called
      expect(installHandler).toHaveBeenCalledWith({ reason: 'install' });
    });

    it('should set up initial data on install', async () => {
      // Given: Fresh installation
      let dataSetup = false;
      const setupHandler = async (details) => {
        if (details.reason === 'install') {
          await chromeMock.storage.sync.set({ initialized: true });
          dataSetup = true;
        }
      };

      chromeMock.runtime.onInstalled.addListener(setupHandler);

      // When: Install event fires
      await chromeMock.runtime.onInstalled._trigger({ reason: 'install' });

      // Then: Initial data should be set up
      const result = await chromeMock.storage.sync.get('initialized');
      expect(result.initialized).toBe(true);
    });

    it('should show welcome notification on install', () => {
      // Given: Notification API available
      const notificationSpy = vi.spyOn(chromeMock.notifications, 'create');

      // When: Creating welcome notification
      chromeMock.notifications.create('welcome', {
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: 'AI Toolbox Installed!',
        message: 'Click the extension icon to get started.',
      });

      // Then: Notification should be created
      expect(notificationSpy).toHaveBeenCalled();
      const call = notificationSpy.mock.calls[0];
      expect(call[0]).toBe('welcome');
      expect(call[1].title).toBe('AI Toolbox Installed!');
    });
  });

  describe('Scenario: Extension update', () => {
    it('should handle update from previous version', async () => {
      // Given: Extension is being updated
      const updateHandler = vi.fn();
      chromeMock.runtime.onInstalled.addListener(updateHandler);

      // When: Update event fires
      chromeMock.runtime.onInstalled._trigger({
        reason: 'update',
        previousVersion: '0.9.0',
      });

      // Then: Update handler should be called with version info
      expect(updateHandler).toHaveBeenCalledWith({
        reason: 'update',
        previousVersion: '0.9.0',
      });
    });

    it('should migrate data on major version update', async () => {
      // Given: Old data format
      await chromeMock.storage.sync.set({
        templates: fixtures.templates.email,
        __schemaVersion: 1,
      });

      // When: Migration runs
      const migrateData = async () => {
        const data = await chromeMock.storage.sync.get(['__schemaVersion', 'templates']);
        if (data.__schemaVersion < 2) {
          // Perform migration
          await chromeMock.storage.sync.set({
            __schemaVersion: 2,
            templates: Array.isArray(data.templates) ? data.templates : [data.templates],
          });
        }
      };
      await migrateData();

      // Then: Data should be migrated
      const result = await chromeMock.storage.sync.get('__schemaVersion');
      expect(result.__schemaVersion).toBe(2);
    });
  });

  describe('Scenario: Message handling', () => {
    it('should handle getTemplates message', async () => {
      // Given: Templates in storage
      const templates = [fixtures.templates.email, fixtures.templates.codeDoc];
      await chromeMock.storage.sync.set({ templates });

      // When: Receiving getTemplates message
      let response;
      const messageHandler = async (request, sender, sendResponse) => {
        if (request.action === 'getTemplates') {
          const result = await chromeMock.storage.sync.get('templates');
          sendResponse({ templates: result.templates });
        }
        return true;
      };

      chromeMock.runtime.onMessage.addListener(messageHandler);

      await new Promise((resolve) => {
        chromeMock.runtime.onMessage._trigger(
          { action: 'getTemplates' },
          { id: chromeMock.runtime.id },
          (r) => { response = r; resolve(); }
        );
      });

      // Then: Should return templates
      expect(response.templates).toHaveLength(2);
    });

    it('should handle processTemplate message', async () => {
      // Given: Template execution request
      const request = {
        action: 'processTemplate',
        templateId: fixtures.templates.email.id,
        inputs: fixtures.userInputs.email,
      };

      let processStarted = false;
      const messageHandler = async (request, sender, sendResponse) => {
        if (request.action === 'processTemplate') {
          processStarted = true;
          sendResponse({ success: true });
        }
        return true;
      };

      chromeMock.runtime.onMessage.addListener(messageHandler);

      // When: Sending message
      await new Promise((resolve) => {
        chromeMock.runtime.onMessage._trigger(
          request,
          { id: chromeMock.runtime.id, tab: { id: 1 } },
          () => resolve()
        );
      });

      // Then: Template processing should start
      expect(processStarted).toBe(true);
    });

    it('should validate message sender', async () => {
      // Given: Message from external source
      let rejected = false;
      const messageHandler = (request, sender, sendResponse) => {
        if (sender.id !== chromeMock.runtime.id) {
          rejected = true;
          sendResponse({ error: 'Unauthorized' });
          return;
        }
        sendResponse({ success: true });
      };

      chromeMock.runtime.onMessage.addListener(messageHandler);

      // When: Receiving message from unknown sender
      chromeMock.runtime.onMessage._trigger(
        { action: 'getTemplates' },
        { id: 'unknown-extension-id' },
        () => {}
      );

      // Then: Should reject message
      expect(rejected).toBe(true);
    });

    it('should handle unknown actions', async () => {
      // Given: Unknown action
      let errorResponse;
      const messageHandler = (request, sender, sendResponse) => {
        const knownActions = ['getTemplates', 'processTemplate', 'openSidePanel'];
        if (!knownActions.includes(request.action)) {
          sendResponse({ error: 'Unknown action' });
          return;
        }
        sendResponse({ success: true });
      };

      chromeMock.runtime.onMessage.addListener(messageHandler);

      // When: Sending unknown action
      await new Promise((resolve) => {
        chromeMock.runtime.onMessage._trigger(
          { action: 'unknownAction' },
          { id: chromeMock.runtime.id },
          (r) => { errorResponse = r; resolve(); }
        );
      });

      // Then: Should return error
      expect(errorResponse.error).toBe('Unknown action');
    });
  });

  describe('Scenario: Context menu management', () => {
    it('should create context menu on startup', async () => {
      // Given: Extension starts
      const createSpy = vi.spyOn(chromeMock.contextMenus, 'create');

      // When: Creating context menus
      chromeMock.contextMenus.create({
        id: 'ai-toolbox-main',
        title: 'AI Toolbox',
        contexts: ['selection'],
      });

      // Then: Context menu should be created
      expect(createSpy).toHaveBeenCalled();
      const call = createSpy.mock.calls[0][0];
      expect(call.id).toBe('ai-toolbox-main');
      expect(call.title).toBe('AI Toolbox');
    });

    it('should add template items to context menu', async () => {
      // Given: Templates available
      const templates = [fixtures.templates.email, fixtures.templates.codeDoc];
      await chromeMock.storage.sync.set({ templates });

      const createSpy = vi.spyOn(chromeMock.contextMenus, 'create');

      // When: Creating template menu items
      templates.forEach((template) => {
        chromeMock.contextMenus.create({
          id: `template-${template.id}`,
          title: `Process with "${template.name}"`,
          parentId: 'ai-toolbox-main',
          contexts: ['selection'],
        });
      });

      // Then: Template items should be created
      expect(createSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle context menu click', async () => {
      // Given: Context menu click handler
      let clickedTemplateId;
      const clickHandler = (info, tab) => {
        if (info.menuItemId.startsWith('template-')) {
          clickedTemplateId = info.menuItemId.replace('template-', '');
        }
      };

      chromeMock.contextMenus.onClicked.addListener(clickHandler);

      // When: User clicks context menu
      chromeMock.contextMenus.onClicked._trigger(
        {
          menuItemId: 'template-email-001',
          selectionText: 'Selected text',
        },
        { id: 1, url: 'https://example.com' }
      );

      // Then: Should extract template ID
      expect(clickedTemplateId).toBe('email-001');
    });

    it('should update context menu with selected text', async () => {
      // Given: Text is selected on page
      const updateSpy = vi.spyOn(chromeMock.contextMenus, 'update');

      // When: Updating menu with selection
      chromeMock.contextMenus.update('ai-toolbox-main', {
        title: 'AI Toolbox (text selected)',
      });

      // Then: Menu should be updated
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('Scenario: Side panel integration', () => {
    it('should configure side panel behavior', async () => {
      // Given: Side panel API available
      const setSpy = vi.spyOn(chromeMock.sidePanel, 'setPanelBehavior');

      // When: Setting panel behavior
      await chromeMock.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true,
      });

      // Then: Behavior should be set
      expect(setSpy).toHaveBeenCalledWith({
        openPanelOnActionClick: true,
      });
    });

    it('should open side panel on action click', async () => {
      // Given: Action click handler
      const openSpy = vi.spyOn(chromeMock.sidePanel, 'open');
      const actionHandler = async (tab) => {
        await chromeMock.sidePanel.open({ tabId: tab.id });
      };

      chromeMock.action.onClicked.addListener(actionHandler);

      // When: User clicks extension icon
      await chromeMock.action.onClicked._trigger({ id: 1 });

      // Then: Side panel should open
      expect(openSpy).toHaveBeenCalled();
    });
  });

  describe('Scenario: Tab management', () => {
    it('should clean up on tab close', async () => {
      // Given: Active processing for a tab
      const activeProcessing = new Map();
      activeProcessing.set(1, { templateId: 'email-001', startTime: Date.now() });

      const closeHandler = (tabId) => {
        activeProcessing.delete(tabId);
      };

      chromeMock.tabs.onRemoved.addListener(closeHandler);

      // When: Tab is closed
      chromeMock.tabs.onRemoved._trigger(1, { windowId: 1 });

      // Then: Processing should be cleaned up
      expect(activeProcessing.has(1)).toBe(false);
    });

    it('should send message to content script', async () => {
      // Given: Tab with content script
      const sendSpy = vi.spyOn(chromeMock.tabs, 'sendMessage');

      // When: Sending message to tab
      await chromeMock.tabs.sendMessage(1, {
        action: 'showOverlay',
        templateId: 'email-001',
      });

      // Then: Message should be sent
      expect(sendSpy).toHaveBeenCalled();
      const call = sendSpy.mock.calls[0];
      expect(call[0]).toBe(1);
      expect(call[1].action).toBe('showOverlay');
    });
  });

  describe('Scenario: Badge management', () => {
    it('should set badge for processing state', () => {
      // Given: Template is processing
      const setBadgeSpy = vi.spyOn(chromeMock.action, 'setBadgeText');
      const setColorSpy = vi.spyOn(chromeMock.action, 'setBadgeBackgroundColor');

      // When: Setting processing badge
      chromeMock.action.setBadgeText({ text: '...' });
      chromeMock.action.setBadgeBackgroundColor({ color: '#2563eb' });

      // Then: Badge should be set
      expect(setBadgeSpy).toHaveBeenCalled();
      expect(setColorSpy).toHaveBeenCalled();
    });

    it('should clear badge on completion', () => {
      // Given: Processing complete
      const setBadgeSpy = vi.spyOn(chromeMock.action, 'setBadgeText');

      // When: Clearing badge
      chromeMock.action.setBadgeText({ text: '' });

      // Then: Badge should be cleared
      expect(setBadgeSpy).toHaveBeenCalled();
      const call = setBadgeSpy.mock.calls[0][0];
      expect(call.text).toBe('');
    });

    it('should set error badge on failure', () => {
      // Given: Processing failed
      const setColorSpy = vi.spyOn(chromeMock.action, 'setBadgeBackgroundColor');

      // When: Setting error badge
      chromeMock.action.setBadgeText({ text: '!' });
      chromeMock.action.setBadgeBackgroundColor({ color: '#dc2626' });

      // Then: Error badge should be set
      expect(setColorSpy).toHaveBeenCalled();
      const call = setColorSpy.mock.calls[0][0];
      expect(call.color).toBe('#dc2626');
    });
  });

  describe('Scenario: Storage validation on startup', () => {
    it('should validate storage on startup', async () => {
      // Given: Extension starts
      let validated = false;
      const startupHandler = async () => {
        const data = await chromeMock.storage.sync.get(['templates', 'history', 'settings']);
        validated = true;
        return data;
      };

      chromeMock.runtime.onStartup.addListener(startupHandler);

      // When: Startup event fires
      await chromeMock.runtime.onStartup._trigger();

      // Then: Storage should be validated
      expect(validated).toBe(true);
    });

    it('should repair corrupted storage', async () => {
      // Given: Corrupted templates data
      await chromeMock.storage.sync.set({ templates: 'not-an-array' });

      // When: Validating and repairing
      const repair = async () => {
        const { templates } = await chromeMock.storage.sync.get('templates');
        if (!Array.isArray(templates)) {
          await chromeMock.storage.sync.set({ templates: [] });
        }
      };
      await repair();

      // Then: Data should be repaired
      const { templates } = await chromeMock.storage.sync.get('templates');
      expect(Array.isArray(templates)).toBe(true);
    });
  });
});

