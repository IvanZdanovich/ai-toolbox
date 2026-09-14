/**
 * Settings page — integration.
 *
 * Primary module: chrome-extension/settings/settings.js, whose contract is
 * with the page's own markup and with the shared modules it drives —
 * providers.js (what a provider declares), ai-service.js (settings updates,
 * connection tests, model listing) and storage.js (what is persisted). All of
 * them stay real, and the page's real settings.html is mounted rather than a
 * hand-written stand-in, so a renamed field fails here instead of passing
 * against stale markup. Only the platform edge is doubled: chrome.* from the
 * mock, and `fetch` for the provider endpoint.
 *
 * The module constructs itself on import and exposes window.settingsPage,
 * which is the handle every case drives it through.
 *
 * Origin: layout.adr-4.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  installChromeMock,
  uninstallChromeMock,
  testUtils,
} from '../../support/chrome-api.mock.js';
import { STORAGE_KEYS } from '../../../chrome-extension/constraints/storage.constraints.js';
import { AI_PROVIDERS } from '../../../chrome-extension/shared/providers.js';

const SETTINGS = '../../../chrome-extension/settings/settings.js';

const PAGE_HTML = readFileSync(
  resolve(__dirname, '../../../chrome-extension/settings/settings.html'),
  'utf8'
);

function mountPage() {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(PAGE_HTML);
  if (!body) {
    throw new Error('settings.html has no <body> to mount');
  }
  document.body.innerHTML = body[1].replace(/<script[\s\S]*?<\/script>/gi, '');
}

async function bootSettings() {
  mountPage();
  vi.resetModules();
  await import(SETTINGS);
  await vi.waitFor(() => {
    expect(window.settingsPage?.settings).toBeTruthy();
    expect(
      document.getElementById('aiProvider').options.length
    ).toBeGreaterThan(0);
  });
  return window.settingsPage;
}

function field(id) {
  return document.getElementById(id);
}

async function chooseProvider(id) {
  const select = field('aiProvider');
  select.value = id;
  select.dispatchEvent(new Event('change'));
  await vi.waitFor(() => {
    expect(field('aiProvider').value).toBe(id);
  });
}

function storedSettings() {
  return testUtils.getStorageState()[STORAGE_KEYS.SETTINGS];
}

describe('Settings: Given the settings page booted against its real markup', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    uninstallChromeMock();
    document.body.innerHTML = '';
    delete window.settingsPage;
    delete globalThis.fetch;
    vi.restoreAllMocks();
  });

  describe('Settings: When the page boots', () => {
    it('Settings: Then it offers every provider the service knows about', async () => {
      await bootSettings();

      const ids = [...field('aiProvider').options].map(
        (option) => option.value
      );
      expect(ids).toContain(AI_PROVIDERS.OPENAI);
      expect(ids).toContain(AI_PROVIDERS.OLLAMA);
      expect(ids).toContain(AI_PROVIDERS.MOCK);
    });

    it('Settings: Then it opens on the provider the stored settings name', async () => {
      testUtils.setStorageState({
        [STORAGE_KEYS.SETTINGS]: { provider: AI_PROVIDERS.CLAUDE },
      });

      await bootSettings();

      expect(field('aiProvider').value).toBe(AI_PROVIDERS.CLAUDE);
    });

    it('Settings: Then it shows the key that was saved for the selected provider', async () => {
      testUtils.setStorageState({
        [STORAGE_KEYS.SETTINGS]: {
          provider: AI_PROVIDERS.OPENAI,
          apiKeys: { openai: 'sk-saved', claude: 'sk-other' },
        },
      });

      await bootSettings();

      expect(field('apiKey').value).toBe('sk-saved');
    });

    it('Settings: Then it reports how much of the sync quota is in use', async () => {
      await bootSettings();

      await vi.waitFor(() => {
        expect(field('storageInfo').textContent).toMatch(/KB/);
      });
    });
  });

  describe('Settings: When the selected provider changes', () => {
    it('Settings: Then it offers an endpoint field only for a provider whose URL is configurable', async () => {
      await bootSettings();

      await chooseProvider(AI_PROVIDERS.OLLAMA);
      expect(field('baseUrlGroup').classList.contains('hidden')).toBe(false);

      await chooseProvider(AI_PROVIDERS.OPENAI);
      expect(field('baseUrlGroup').classList.contains('hidden')).toBe(true);
    });

    it('Settings: Then it offers model listing only for a provider that supports it', async () => {
      await bootSettings();

      await chooseProvider(AI_PROVIDERS.OLLAMA);
      expect(field('refreshModelsBtn').classList.contains('hidden')).toBe(
        false
      );

      await chooseProvider(AI_PROVIDERS.CLAUDE);
      expect(field('refreshModelsBtn').classList.contains('hidden')).toBe(true);
    });

    it('Settings: Then it hides the model field for the demo provider, which has no models', async () => {
      await bootSettings();

      await chooseProvider(AI_PROVIDERS.MOCK);

      expect(field('modelGroup').classList.contains('hidden')).toBe(true);
    });

    it('Settings: Then it suggests the models the chosen provider declares', async () => {
      await bootSettings();

      await chooseProvider(AI_PROVIDERS.CLAUDE);

      const suggestions = [...field('modelOptions').options].map(
        (option) => option.value
      );
      expect(suggestions.length).toBeGreaterThan(0);
      expect(field('model').value).toBe('claude-sonnet-5');
    });

    it('Settings: Then it carries each provider its own key when the selection changes', async () => {
      testUtils.setStorageState({
        [STORAGE_KEYS.SETTINGS]: {
          provider: AI_PROVIDERS.OPENAI,
          apiKeys: { openai: 'sk-openai', claude: 'sk-claude' },
        },
      });
      await bootSettings();

      await chooseProvider(AI_PROVIDERS.CLAUDE);

      expect(field('apiKey').value).toBe('sk-claude');
    });
  });

  describe('Settings: When settings are saved', () => {
    it('Settings: Then it stores the key under the provider it was entered for', async () => {
      const page = await bootSettings();
      await chooseProvider(AI_PROVIDERS.OPENAI);
      field('apiKey').value = 'sk-new';

      await page.saveSettings();

      expect(storedSettings().apiKeys.openai).toBe('sk-new');
      expect(storedSettings().provider).toBe(AI_PROVIDERS.OPENAI);
    });

    it('Settings: Then it leaves the other providers’ keys in place', async () => {
      testUtils.setStorageState({
        [STORAGE_KEYS.SETTINGS]: {
          provider: AI_PROVIDERS.OPENAI,
          apiKeys: { openai: '', claude: 'sk-claude' },
        },
      });
      const page = await bootSettings();
      field('apiKey').value = 'sk-openai';

      await page.saveSettings();

      expect(storedSettings().apiKeys.claude).toBe('sk-claude');
    });

    it('Settings: Then it stores the endpoint and model against the selected provider', async () => {
      const page = await bootSettings();
      await chooseProvider(AI_PROVIDERS.OLLAMA);
      field('baseUrl').value = 'http://localhost:9999/v1';
      field('model').value = 'llama3.2';

      await page.saveSettings();

      expect(storedSettings().providerConfig.ollama).toMatchObject({
        baseUrl: 'http://localhost:9999/v1',
        model: 'llama3.2',
      });
    });

    it('Settings: Then it saves when the form is submitted, not only from the button handler', async () => {
      await bootSettings();
      await chooseProvider(AI_PROVIDERS.CLAUDE);
      field('apiKey').value = 'sk-submitted';

      field('settingsForm').dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );

      await vi.waitFor(() => {
        expect(storedSettings()?.apiKeys?.claude).toBe('sk-submitted');
      });
    });
  });

  describe('Settings: When a connection is tested', () => {
    it('Settings: Then it reports success against the values in the form', async () => {
      const page = await bootSettings();
      await chooseProvider(AI_PROVIDERS.OPENAI);
      field('apiKey').value = 'sk-unsaved';
      globalThis.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Connection successful' } }],
        }),
      });

      await page.testConnection();

      expect(field('connectionStatus').textContent).toMatch(/successful/i);
      const [, init] = globalThis.fetch.mock.calls[0];
      expect(init.headers.Authorization).toBe('Bearer sk-unsaved');
    });

    it('Settings: Then it does not persist the key it was asked to test', async () => {
      testUtils.setStorageState({
        [STORAGE_KEYS.SETTINGS]: {
          provider: AI_PROVIDERS.OPENAI,
          apiKeys: { openai: 'sk-saved' },
        },
      });
      const page = await bootSettings();
      await chooseProvider(AI_PROVIDERS.OPENAI);
      field('apiKey').value = 'sk-unsaved';
      globalThis.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
      });

      await page.testConnection();

      expect(storedSettings().apiKeys.openai).toBe('sk-saved');
    });

    it('Settings: Then it shows what the provider said when the test fails', async () => {
      const page = await bootSettings();
      await chooseProvider(AI_PROVIDERS.OPENAI);
      field('apiKey').value = 'sk-bad';
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: { message: 'Incorrect API key provided' },
        }),
      });

      await page.testConnection();

      expect(field('connectionStatus').textContent).toMatch(
        /Incorrect API key/
      );
      expect(field('connectionStatus').className).toMatch(/error/);
    });

    it('Settings: Then it reports the provider’s own message, not the wrapper around it', async () => {
      const page = await bootSettings();
      await chooseProvider(AI_PROVIDERS.OPENAI);
      field('apiKey').value = 'sk-bad';
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: { message: 'Incorrect API key provided' },
        }),
      });

      await page.testConnection();

      expect(field('connectionStatus').textContent).not.toMatch(
        /AI processing failed/
      );
    });

    it('Settings: Then it names the endpoint when a local server cannot be reached', async () => {
      const page = await bootSettings();
      await chooseProvider(AI_PROVIDERS.OLLAMA);
      field('model').value = 'llama3.2';
      globalThis.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await page.testConnection();

      const status = field('connectionStatus').textContent;
      expect(status).toContain('localhost:11434');
      expect(status).toMatch(/Is the server running/);
    });

    it('Settings: Then it re-enables the Test button after a failed test', async () => {
      const page = await bootSettings();
      await chooseProvider(AI_PROVIDERS.OPENAI);
      globalThis.fetch.mockRejectedValue(new Error('network down'));

      await page.testConnection();

      expect(field('testConnectionBtn').disabled).toBe(false);
      expect(field('testConnectionBtn').textContent).toBe('Test');
    });
  });

  describe('Settings: When models are listed from an endpoint', () => {
    it('Settings: Then it lists what the endpoint currently in the form is serving', async () => {
      const page = await bootSettings();
      await chooseProvider(AI_PROVIDERS.OLLAMA);
      field('baseUrl').value = 'http://localhost:9999/v1';
      globalThis.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ id: 'qwen3' }, { id: 'llama3.2' }] }),
      });

      await page.refreshModels();

      expect(globalThis.fetch.mock.calls[0][0]).toBe(
        'http://localhost:9999/v1/models'
      );
      const suggestions = [...field('modelOptions').options].map(
        (option) => option.value
      );
      expect(suggestions).toEqual(['llama3.2', 'qwen3']);
    });

    it('Settings: Then it says which endpoint it could not reach', async () => {
      const page = await bootSettings();
      await chooseProvider(AI_PROVIDERS.OLLAMA);
      field('baseUrl').value = 'http://localhost:9999/v1';
      globalThis.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await page.refreshModels();

      expect(field('toastContainer').textContent).toContain(
        'http://localhost:9999/v1'
      );
    });

    it('Settings: Then it keeps the button usable when the endpoint cannot be reached', async () => {
      const page = await bootSettings();
      await chooseProvider(AI_PROVIDERS.OLLAMA);
      globalThis.fetch.mockRejectedValue(new Error('connection refused'));

      await page.refreshModels();

      expect(field('refreshModelsBtn').disabled).toBe(false);
    });
  });

  describe('Settings: When a backup is imported', () => {
    it('Settings: Then it adds the templates and workflows a backup file holds', async () => {
      const page = await bootSettings();
      const backup = {
        templates: [{ name: 'Imported greeter', prompt: 'Hi {name}' }],
        workflows: [
          {
            name: 'Imported flow',
            steps: [
              {
                name: 'Draft',
                type: 'prompt',
                outputKey: 'draft',
                prompt: 'Write {thing}',
              },
            ],
          },
        ],
      };

      await page.importData(
        new File([JSON.stringify(backup)], 'backup.json', {
          type: 'application/json',
        })
      );

      const templateManager = (
        await import('../../../chrome-extension/shared/template-manager.js')
      ).default;
      const workflowManager = (
        await import('../../../chrome-extension/shared/workflow-manager.js')
      ).default;
      expect(
        (await templateManager.getAllTemplates()).some(
          (template) => template.name === 'Imported greeter'
        )
      ).toBe(true);
      expect(
        (await workflowManager.getAllWorkflows()).some(
          (workflow) => workflow.name === 'Imported flow'
        )
      ).toBe(true);
    });

    it('Settings: Then it reports a backup file it cannot read instead of failing silently', async () => {
      const page = await bootSettings();

      await page.importData(
        new File(['not json at all'], 'broken.json', {
          type: 'application/json',
        })
      );

      expect(field('toastContainer').textContent).toMatch(/Failed to import/i);
    });
  });
});
