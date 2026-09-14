/**
 * Side panel — integration.
 *
 * Primary module: chrome-extension/sidepanel/sidepanel.js, whose contract is
 * with the shared managers it composes (template, workflow, history, storage)
 * and with its own markup. Both are kept real: the page's actual
 * sidepanel.html is loaded into jsdom rather than a hand-written stand-in, so
 * a renamed element or a removed container fails here instead of passing
 * against a mock DOM that no longer matches the page.
 *
 * The module boots on DOMContentLoaded and exposes itself as
 * window.aiToolboxSidePanel, which is the handle every case drives it through.
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
import { fixtures } from '../../unit-examples/shared/test-data.examples.js';
import { STORAGE_KEYS } from '../../../chrome-extension/constraints/storage.constraints.js';

const SIDEPANEL = '../../../chrome-extension/sidepanel/sidepanel.js';

const PAGE_HTML = readFileSync(
  resolve(__dirname, '../../../chrome-extension/sidepanel/sidepanel.html'),
  'utf8'
);

// The page's own <body>, minus its <script> tags — the module under test is
// imported directly instead of being loaded by the page.
function mountPage() {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(PAGE_HTML);
  if (!body) {
    throw new Error('sidepanel.html has no <body> to mount');
  }
  document.body.innerHTML = body[1].replace(/<script[\s\S]*?<\/script>/gi, '');
}

async function bootSidePanel() {
  mountPage();
  vi.resetModules();
  await import(SIDEPANEL);
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await vi.waitFor(() => {
    expect(window.aiToolboxSidePanel).toBeDefined();
  });
  const app = window.aiToolboxSidePanel;
  // init() is async and unawaitable from outside; wait for its data load.
  await vi.waitFor(() => {
    expect(app.settings).not.toBeNull();
  });
  return app;
}

describe('Sidepanel: Given the side panel booted against its real markup', () => {
  beforeEach(() => {
    installChromeMock();
    testUtils.resetStorage();
  });

  afterEach(() => {
    uninstallChromeMock();
    document.body.innerHTML = '';
    delete window.aiToolboxSidePanel;
    vi.restoreAllMocks();
  });

  describe('Sidepanel: When the panel boots', () => {
    it('Sidepanel: Then it finds every container its markup promises', async () => {
      const app = await bootSidePanel();

      expect(app).toBeDefined();
      for (const id of [
        'templatesList',
        'workflowsList',
        'historyList',
        'templatesEmpty',
        'workflowsEmpty',
        'historyEmpty',
        'editorTabsRow',
        'toastContainer',
      ]) {
        expect(document.getElementById(id)).not.toBeNull();
      }
    });

    it('Sidepanel: Then it opens on the templates section', async () => {
      const app = await bootSidePanel();

      expect(app.currentSection).toBe('templates');
    });

    it('Sidepanel: Then it loads templates, workflows and history through the real managers', async () => {
      testUtils.setStorageState({
        [STORAGE_KEYS.TEMPLATES]: [fixtures.templates.email],
        [STORAGE_KEYS.TEMPLATES_SEEDED]: true,
        [STORAGE_KEYS.WORKFLOWS_SEEDED]: true,
      });

      const app = await bootSidePanel();

      expect(app.templates.map((t) => t.name)).toContain(
        fixtures.templates.email.name
      );
      expect(Array.isArray(app.workflows)).toBe(true);
      expect(Array.isArray(app.history)).toBe(true);
    });
  });

  describe('Sidepanel: When the panel renders its lists', () => {
    it('Sidepanel: Then it renders one card per stored template', async () => {
      testUtils.setStorageState({
        [STORAGE_KEYS.TEMPLATES]: [
          fixtures.templates.email,
          fixtures.templates.codeDoc,
        ],
        [STORAGE_KEYS.TEMPLATES_SEEDED]: true,
        [STORAGE_KEYS.WORKFLOWS_SEEDED]: true,
      });

      await bootSidePanel();

      const list = document.getElementById('templatesList');
      await vi.waitFor(() => {
        expect(list.children.length).toBeGreaterThan(0);
      });
      expect(list.textContent).toContain(fixtures.templates.email.name);
      expect(list.textContent).toContain(fixtures.templates.codeDoc.name);
    });

    it('Sidepanel: Then it shows the empty state when nothing is stored', async () => {
      testUtils.setStorageState({
        [STORAGE_KEYS.TEMPLATES]: [],
        [STORAGE_KEYS.TEMPLATES_SEEDED]: true,
        [STORAGE_KEYS.WORKFLOWS_SEEDED]: true,
      });

      await bootSidePanel();

      const empty = document.getElementById('templatesEmpty');
      await vi.waitFor(() => {
        expect(empty.classList.contains('hidden')).toBe(false);
      });
    });

    it('Sidepanel: Then it escapes a template name rather than rendering it as markup', async () => {
      testUtils.setStorageState({
        [STORAGE_KEYS.TEMPLATES]: [
          { ...fixtures.templates.email, name: '<img src=x onerror=alert(1)>' },
        ],
        [STORAGE_KEYS.TEMPLATES_SEEDED]: true,
        [STORAGE_KEYS.WORKFLOWS_SEEDED]: true,
      });

      await bootSidePanel();

      const list = document.getElementById('templatesList');
      await vi.waitFor(() => {
        expect(list.children.length).toBeGreaterThan(0);
      });
      expect(list.querySelector('img')).toBeNull();
    });
  });

  describe('Sidepanel: When history is opened', () => {
    async function showHistory(entry) {
      testUtils.setStorageState({
        [STORAGE_KEYS.HISTORY]: [entry],
        [STORAGE_KEYS.TEMPLATES_SEEDED]: true,
        [STORAGE_KEYS.WORKFLOWS_SEEDED]: true,
      });
      await bootSidePanel();
      document.getElementById('tab-history').click();
      const list = document.getElementById('historyList');
      await vi.waitFor(() => {
        expect(list.children.length).toBeGreaterThan(0);
      });
      return list;
    }

    it('Sidepanel: Then it names the delete button, which shows only an icon', async () => {
      const list = await showHistory({
        id: 'h1',
        templateId: 't1',
        templateName: 'Greeter',
        inputs: {},
        result: 'Hello Ada',
        status: 'completed',
        timestamp: new Date().toISOString(),
      });

      const remove = list.querySelector('[data-action="delete"]');
      expect(remove.getAttribute('aria-label')).toBeTruthy();
    });

    it('Sidepanel: Then it offers no copy button for a run that produced nothing', async () => {
      const list = await showHistory({
        id: 'h2',
        templateId: 't1',
        templateName: 'Greeter',
        inputs: {},
        result: '',
        status: 'failed',
        timestamp: new Date().toISOString(),
      });

      expect(list.querySelector('[data-action="copy"]')).toBeNull();
      expect(list.querySelector('[data-action="rerun"]')).not.toBeNull();
    });
  });

  describe('Sidepanel: When the user moves between tabs', () => {
    it('Sidepanel: Then it switches the active section when a nav tab is clicked', async () => {
      const app = await bootSidePanel();

      document.getElementById('tab-history').click();

      await vi.waitFor(() => {
        expect(app.currentSection).toBe('history');
      });
      expect(
        document.getElementById('history').classList.contains('active')
      ).toBe(true);
      expect(
        document.getElementById('templates').classList.contains('active')
      ).toBe(false);
    });

    it('Sidepanel: Then it remembers the section across a reload', async () => {
      const app = await bootSidePanel();
      document.getElementById('tab-workflows').click();
      await vi.waitFor(() => {
        expect(app.currentSection).toBe('workflows');
      });

      const reopened = await bootSidePanel();

      expect(reopened.currentSection).toBe('workflows');
    });
  });
});
