/**
 * Background service worker — integration.
 *
 * Primary module: chrome-extension/background/background.js, whose contract is
 * with the Chrome extension APIs and with shared/storage.js — both kept real
 * except for the platform edge, which the chrome mock supplies. The module
 * constructs itself on import, so each case re-imports it against a fresh mock
 * and then drives it through the listeners it actually registered.
 *
 * Origin: layout.adr-4.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  chromeMock,
  installChromeMock,
  uninstallChromeMock,
  testUtils,
} from '../../support/chrome-api.mock.js';
import { EXTENSION_VERSION } from '../../../chrome-extension/constraints/version.constraints.js';
import { STORAGE_KEYS } from '../../../chrome-extension/constraints/storage.constraints.js';

const BACKGROUND = '../../../chrome-extension/background/background.js';

// Booting the service worker is the subject under test: the module registers
// its listeners and builds its menus as a side effect of being imported.
async function bootBackground() {
  vi.resetModules();
  await import(BACKGROUND);
  // init() is async and cannot be awaited from outside; wait for its last step.
  await vi.waitFor(() => {
    expect(chromeMock.contextMenus.create).toHaveBeenCalled();
  });
}

// Drive the worker the way Chrome does: fire the event, collect the response.
function sendMessage(request, sender = {}) {
  return new Promise((resolve) => {
    chromeMock.runtime.onMessage._trigger(request, sender, resolve);
  });
}

function createdMenus() {
  return chromeMock.contextMenus.create.mock.calls.map(([menu]) => menu);
}

describe('Background: Given the service worker booted against its real collaborators', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
    // The mock's API methods are plain functions; spy on the ones whose calls
    // are the observable outcome here.
    vi.spyOn(chromeMock.contextMenus, 'create');
    vi.spyOn(chromeMock.contextMenus, 'removeAll');
    vi.spyOn(chromeMock.action, 'setBadgeText');
    vi.spyOn(chromeMock.action, 'setBadgeBackgroundColor');
    vi.spyOn(chromeMock.notifications, 'create');
    vi.spyOn(chromeMock.sidePanel, 'setPanelBehavior');
  });

  afterEach(() => {
    uninstallChromeMock();
    vi.restoreAllMocks();
  });

  describe('Background: When the worker boots', () => {
    it('Background: Then it registers a listener for every Chrome event it must answer', async () => {
      await bootBackground();

      expect(chromeMock.runtime.onInstalled._listeners).not.toHaveLength(0);
      expect(chromeMock.runtime.onStartup._listeners).not.toHaveLength(0);
      expect(chromeMock.runtime.onMessage._listeners).not.toHaveLength(0);
      expect(chromeMock.contextMenus.onClicked._listeners).not.toHaveLength(0);
      expect(chromeMock.action.onClicked._listeners).not.toHaveLength(0);
    });

    it('Background: Then it opens the side panel from the toolbar icon rather than a popup', async () => {
      await bootBackground();

      expect(chromeMock.sidePanel.setPanelBehavior).toHaveBeenCalledWith({
        openPanelOnActionClick: true,
      });
    });
  });

  describe('Background: When a context menu item is used', () => {
    it('Background: Then it clears existing menus before rebuilding, so a rebuild cannot duplicate ids', async () => {
      await bootBackground();

      expect(
        chromeMock.contextMenus.removeAll.mock.invocationCallOrder[0]
      ).toBeLessThan(
        chromeMock.contextMenus.create.mock.invocationCallOrder[0]
      );
    });

    it('Background: Then it offers a disabled placeholder when no template is stored', async () => {
      await bootBackground();

      const placeholder = createdMenus().find(
        (menu) => menu.id === 'no-templates'
      );
      expect(placeholder).toBeDefined();
      expect(placeholder.enabled).toBe(false);
    });

    it('Background: Then it lists one entry per stored template, under the root menu', async () => {
      testUtils.setStorageState({
        [STORAGE_KEYS.TEMPLATES]: [
          { id: 't1', name: 'Summarize', prompt: 'Summarize {text}' },
          { id: 't2', name: 'Translate', prompt: 'Translate {text}' },
        ],
      });

      await bootBackground();

      const entries = createdMenus().filter((menu) =>
        String(menu.id).startsWith('template-')
      );
      expect(entries).toHaveLength(2);
      expect(entries[0].parentId).toBe('ai-toolbox-main');
      expect(entries.map((menu) => menu.title).join(' ')).toContain(
        'Summarize'
      );
      expect(
        createdMenus().find((menu) => menu.id === 'no-templates')
      ).toBeUndefined();
    });

    it('Background: Then it caps the listed templates and says how many were left out', async () => {
      testUtils.setStorageState({
        [STORAGE_KEYS.TEMPLATES]: Array.from({ length: 7 }, (_, i) => ({
          id: `t${i}`,
          name: `Template ${i}`,
          prompt: 'x',
        })),
      });

      await bootBackground();

      const entries = createdMenus().filter((menu) =>
        String(menu.id).startsWith('template-')
      );
      expect(entries).toHaveLength(5);
      const overflow = createdMenus().find(
        (menu) => menu.id === 'more-templates'
      );
      expect(overflow.title).toContain('2');
    });
  });

  describe('Background: When a message arrives', () => {
    it('Background: Then it answers a getTemplates request with what storage holds', async () => {
      testUtils.setStorageState({
        [STORAGE_KEYS.TEMPLATES]: [
          { id: 't1', name: 'Summarize', prompt: 'Summarize {text}' },
        ],
      });
      await bootBackground();

      const response = await sendMessage({ action: 'getTemplates' });

      expect(response.templates).toHaveLength(1);
      expect(response.templates[0].name).toBe('Summarize');
    });

    it('Background: Then it reports an unknown action instead of failing silently', async () => {
      await bootBackground();

      const response = await sendMessage({ action: 'no-such-action' });

      expect(response.error).toBe('Unknown action');
    });

    it('Background: Then it applies a setBadge request to the toolbar icon', async () => {
      await bootBackground();

      const response = await sendMessage({
        action: 'setBadge',
        text: '3',
        color: '#059669',
      });

      expect(response.success).toBe(true);
      expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({
        text: '3',
      });
      expect(chromeMock.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#059669',
      });
    });
  });

  describe('Background: When the extension is installed', () => {
    it('Background: Then it announces itself once on a fresh install', async () => {
      await bootBackground();

      chromeMock.runtime.onInstalled._trigger({ reason: 'install' });
      await vi.waitFor(() => {
        expect(chromeMock.notifications.create).toHaveBeenCalled();
      });

      const [id, notification] =
        chromeMock.notifications.create.mock.calls.at(-1);
      expect(id).toBe('welcome');
      expect(notification.title).toContain('AI Toolbox');
    });

    it('Background: Then it resolves the welcome icon absolutely, since the worker runs from /background/', async () => {
      await bootBackground();

      chromeMock.runtime.onInstalled._trigger({ reason: 'install' });
      await vi.waitFor(() => {
        expect(chromeMock.notifications.create).toHaveBeenCalled();
      });

      const [, notification] =
        chromeMock.notifications.create.mock.calls.at(-1);
      expect(notification.iconUrl).not.toMatch(/^icons\//);
      expect(notification.iconUrl).toContain('icons/icon-48.png');
    });

    it('Background: Then it does not announce itself on an update', async () => {
      await bootBackground();
      chromeMock.notifications.create.mockClear();

      chromeMock.runtime.onInstalled._trigger({
        reason: 'update',
        previousVersion: '1.0.0',
      });
      await testUtils.waitFor(10);

      expect(chromeMock.notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('Background: When Chrome starts up', () => {
    it('Background: Then it rebuilds the context menus so they survive a worker restart', async () => {
      await bootBackground();
      chromeMock.contextMenus.removeAll.mockClear();

      chromeMock.runtime.onStartup._trigger();

      await vi.waitFor(() => {
        expect(chromeMock.contextMenus.removeAll).toHaveBeenCalled();
      });
    });
  });

  it('Background: Then it runs against the version the constraints file declares', () => {
    expect(chromeMock.runtime.getManifest().version).toBe(EXTENSION_VERSION);
  });
});
