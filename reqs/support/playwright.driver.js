/**
 * Drives a real Chrome with the unpacked extension loaded, through Playwright,
 * for the flows under `reqs/e2e/`.
 *
 * An MV3 extension can only be loaded into a persistent context, and only a
 * headed one registers a service worker, so the fixtures below own that setup
 * and hand a case two things: the `context` Chrome is running the extension
 * in, and a `sidePanel` page already booted at `sidepanel/sidepanel.html`.
 * Each case file gets its own browser profile directory, so nothing a flow
 * stores leaks into the next file.
 *
 * It states no requirement of its own — the cases assert (DRIVER_STATES_NOTHING).
 *
 * Origin: layout.adr-5.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, test as base, expect } from '@playwright/test';

export const EXTENSION_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../chrome-extension'
);

export const SIDE_PANEL_PATH = 'sidepanel/sidepanel.html';

/** The page URL a real user reaches through Chrome's side panel. */
export function extensionUrl(extensionId, path) {
  return `chrome-extension://${extensionId}/${path}`;
}

/**
 * A Chrome with this project's extension freshly installed, on a throwaway
 * profile so nothing here touches a real one. `channel: 'chromium'` is what
 * makes this work unwatched: the headless shell loads no extension, while the
 * full Chromium's headless mode does. `headless` is Playwright's own option,
 * so `--headed` and `use.headless` reach the browser a flow actually runs in.
 */
async function launchWithExtension(headless) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'ai-toolbox-e2e-'));

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless,
    args: [
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--load-extension=${EXTENSION_DIR}`,
    ],
  });

  return { context, userDataDir };
}

/** The id Chrome assigned the extension, read off its service worker. */
async function readExtensionId(context) {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker'));
  return new URL(worker.url()).host;
}

// All three are worker-scoped: a flow is a sequence a person performs in one
// sitting, so the steps of one file share a browser, an installed extension
// and an open panel, and `beforeAll` — where each step acts — can reach them.
// Playwright gives each spec file its own worker, so files stay isolated.
export const test = base.extend({
  // Named apart from Playwright's built-in `context`, which is test-scoped and
  // cannot be redefined at worker scope — and which is a plain browser with no
  // extension in it, so a case must not reach for it by accident.
  extensionContext: [
    async ({ headless }, use) => {
      const { context, userDataDir } = await launchWithExtension(headless);
      await use(context);
      await context.close();
      rmSync(userDataDir, { recursive: true, force: true });
    },
    { scope: 'worker' },
  ],

  extensionId: [
    async ({ extensionContext }, use) => {
      await use(await readExtensionId(extensionContext));
    },
    { scope: 'worker' },
  ],

  /** The side panel, open and booted — where every flow here starts. */
  sidePanelPage: [
    async ({ extensionContext, extensionId }, use) => {
      const page = await extensionContext.newPage();
      await page.goto(extensionUrl(extensionId, SIDE_PANEL_PATH));
      await page.waitForFunction(() =>
        Boolean(window.aiToolboxSidePanel?.settings)
      );
      await use(page);
      await page.close();
    },
    { scope: 'worker' },
  ],
});

export { expect };
