/**
 * Running a template in a real browser — smoke.
 *
 * Drives the shipped side panel the way a person does — open a template, fill
 * its fields, press Run — against the demo provider, so the check needs no API
 * key and no network. What it adds over the jsdom suites is that the click
 * handlers, the module graph, chrome.storage.sync and the real stylesheet are
 * all Chrome's rather than a double's.
 *
 * Run with `npm run test:smoke`. Not part of `npm test` or CI.
 *
 * Origin: layout.adr-5.
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  closeBrowser,
  evaluate,
  isAvailable,
  launchBrowser,
  openPage,
  waitFor,
} from '../support/chrome-cli.driver.js';

const available = isAvailable();
let extensionId;
let page;

// The demo provider fails one call in ten on purpose, so a single run is not a
// reliable signal; a handful of attempts is.
const ATTEMPTS = 5;

describe(
  'Running a template in the shipped side panel',
  { skip: !available && 'chrome-devtools CLI not installed' },
  () => {
    before(async () => {
      extensionId = launchBrowser();
      page = openPage(
        `chrome-extension://${extensionId}/sidepanel/sidepanel.html`
      );
      await waitFor(page, () => Boolean(window.aiToolboxSidePanel?.settings));
    });

    after(() => {
      closeBrowser();
    });

    it('opens a run tab from a template card', async () => {
      evaluate(page, () => {
        document.querySelector('#templatesList .template-card').click();
        return true;
      });

      const title = await waitFor(page, () => {
        const heading = document.querySelector('.editor-tab-title');
        return heading?.textContent.startsWith('Run: ')
          ? heading.textContent
          : null;
      });

      assert.match(title, /^Run: /);
    });

    it('names every field it asks the user to fill', async () => {
      const labels = await waitFor(page, () => {
        const fields = document.querySelectorAll(
          '[data-role="execute-inputs"] textarea'
        );
        return fields.length
          ? [...fields].map((field) => field.getAttribute('aria-label'))
          : null;
      });

      assert.ok(labels.length > 0);
      assert.ok(
        labels.every((label) => label && label.length > 0),
        `unnamed field: ${JSON.stringify(labels)}`
      );
    });

    it('shows the provider’s answer and records the run in history', async () => {
      let result = null;

      for (let attempt = 0; attempt < ATTEMPTS && !result; attempt++) {
        evaluate(page, () => {
          const form = document.querySelector('[data-role="execute-form"]');
          form.querySelector('textarea').value = 'a smoke check';
          form.querySelector('[data-role="execute-run-btn"]').click();
          return true;
        });

        result = await waitFor(
          page,
          () => {
            const panel = document.querySelector(
              '[data-role="execute-result"]'
            );
            const failed = document
              .querySelector('[data-role="execute-error"]')
              ?.classList.contains('hidden');
            if (panel && !panel.classList.contains('hidden')) {
              return document.querySelector('[data-role="result-content"]')
                .textContent;
            }
            // A failed attempt resolves the wait too, so the loop can retry.
            return failed === false ? 'FAILED' : null;
          },
          { timeout: 20000 }
        );

        if (result === 'FAILED') {
          result = null;
        }
      }

      assert.ok(result, `no completed run in ${ATTEMPTS} attempts`);

      const recorded = await waitFor(page, () =>
        window.aiToolboxSidePanel.history.some(
          (entry) => entry.status === 'completed'
        )
      );
      assert.equal(recorded, true);
    });

    it('keeps the run available after the panel is reopened', async () => {
      const reopened = openPage(
        `chrome-extension://${extensionId}/sidepanel/sidepanel.html`
      );

      const persisted = await waitFor(reopened, () =>
        window.aiToolboxSidePanel?.history?.length
          ? window.aiToolboxSidePanel.history.length
          : null
      );

      assert.ok(persisted > 0);
    });
  }
);
