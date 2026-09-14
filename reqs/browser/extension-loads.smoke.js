/**
 * The extension loads in a real browser — smoke.
 *
 * Everything under reqs/unit, reqs/integration and reqs/e2e runs in jsdom with
 * chrome.* doubled, so none of it can fail when Chrome rejects the manifest,
 * when a module specifier that Vitest resolved 404s in the browser, or when
 * the service worker never registers. That is what this level is for, and why
 * it is the only one that needs a browser.
 *
 * Run with `npm run test:smoke` (needs the chrome-devtools CLI; see
 * .claude/skills/chrome-devtools-cli). Not part of `npm test` or CI.
 *
 * Origin: layout.adr-5.
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  closeBrowser,
  consoleErrors,
  isAvailable,
  launchBrowser,
  openPage,
  serviceWorkers,
  waitFor,
} from '../support/chrome-cli.driver.js';

const available = isAvailable();
let extensionId;

describe(
  'The extension in a real browser',
  { skip: !available && 'chrome-devtools CLI not installed' },
  () => {
    before(() => {
      extensionId = launchBrowser();
    });

    after(() => {
      closeBrowser();
    });

    it('is accepted by Chrome and registers its background worker', () => {
      const workers = serviceWorkers();

      assert.ok(
        workers.some((worker) => worker.url.includes(extensionId)),
        'Chrome registered no service worker for the extension'
      );
    });

    it('boots the side panel with no console error', async () => {
      const page = openPage(
        `chrome-extension://${extensionId}/sidepanel/sidepanel.html`
      );

      await waitFor(page, () => Boolean(window.aiToolboxSidePanel?.settings));

      assert.deepEqual(consoleErrors(page), []);
    });

    it('seeds the starter templates on a first run', async () => {
      const page = openPage(
        `chrome-extension://${extensionId}/sidepanel/sidepanel.html`
      );

      const names = await waitFor(page, () => {
        const cards = document.querySelectorAll(
          '#templatesList .template-card'
        );
        return cards.length
          ? [...cards].map((card) => card.querySelector('h3').textContent)
          : null;
      });

      assert.ok(names.includes('Social Media Post'), names.join(', '));
    });

    it('seeds the starter workflows on a first run', async () => {
      const page = openPage(
        `chrome-extension://${extensionId}/sidepanel/sidepanel.html`
      );

      const names = await waitFor(page, () => {
        const app = window.aiToolboxSidePanel;
        return app?.workflows?.length
          ? app.workflows.map((workflow) => workflow.name)
          : null;
      });

      assert.ok(names.includes('Research Brief'), names.join(', '));
    });

    it('boots the settings page with every provider offered', async () => {
      const page = openPage(
        `chrome-extension://${extensionId}/settings/settings.html`
      );

      const providers = await waitFor(page, () => {
        const select = document.getElementById('aiProvider');
        return select?.options.length
          ? [...select.options].map((option) => option.value)
          : null;
      });

      assert.ok(providers.includes('openai'), providers.join(', '));
      assert.ok(providers.includes('ollama'), providers.join(', '));
      assert.deepEqual(consoleErrors(page), []);
    });

    it('loads every page module Chrome has to resolve without a bundler', async () => {
      const page = openPage(
        `chrome-extension://${extensionId}/sidepanel/sidepanel.html`
      );

      // A 404 on a module specifier shows up as a failed request, not as a
      // thrown error, so the booted app object is what proves the graph resolved.
      const booted = await waitFor(page, () =>
        Boolean(
          window.aiToolboxSidePanel &&
          document.getElementById('templatesList') &&
          document.getElementById('toastContainer')
        )
      );

      assert.equal(booted, true);
    });
  }
);
