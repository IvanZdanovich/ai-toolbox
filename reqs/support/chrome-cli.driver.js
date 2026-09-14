/**
 * Drives a real Chrome with the unpacked extension loaded, through the
 * `chrome-devtools` CLI, for the smoke checks under `reqs/browser/`.
 *
 * Everything jsdom cannot answer lives behind this: whether Chrome accepts
 * `manifest.json`, whether the service worker registers, whether the page's
 * ES modules resolve without a bundler, and whether the panel boots with no
 * console error. It states no requirement of its own — the smoke checks do.
 *
 * Origin: layout.adr-5.
 */

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = process.env.CHROME_DEVTOOLS_CLI || 'chrome-devtools';

export const EXTENSION_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../chrome-extension'
);

function cli(args, { json = true } = {}) {
  const output = execFileSync(
    CLI,
    json ? [...args, '--output-format=json'] : args,
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000,
    }
  );
  if (!json) {
    return output;
  }
  // The CLI prints node warnings on stdout before its payload.
  const start = output.indexOf('{');
  return start === -1 ? {} : JSON.parse(output.slice(start));
}

/** True when the CLI is installed; the smoke checks skip themselves without it. */
export function isAvailable() {
  try {
    execFileSync(CLI, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * A browser with this project's extension freshly installed. Headful, because
 * an extension's side panel and service worker are what is under test, and
 * isolated, so nothing here touches a real profile.
 */
export function launchBrowser() {
  cli(['start', '--headless=false', '--isolated=true'], { json: false });
  const { message } = cli(['install_extension', EXTENSION_DIR]);
  const id = /Id:\s*(\w+)/.exec(message || '')?.[1];
  if (!id) {
    throw new Error(`Could not read the extension id from: ${message}`);
  }
  return id;
}

export function reloadExtension(extensionId) {
  cli(['reload_extension', extensionId]);
}

export function closeBrowser() {
  cli(['stop'], { json: false });
}

/** Opens a page and returns the id later calls address it by. */
export function openPage(url) {
  cli(['new_page', url]);
  const { pages = [], extensionPages = [] } = cli(['list_pages']);
  const page = [...pages, ...extensionPages].find((entry) => entry.url === url);
  if (!page) {
    throw new Error(`Chrome did not open ${url}`);
  }
  return page.id;
}

export function closePage(pageId) {
  cli(['close_page', String(pageId)]);
}

/**
 * Runs a function in the page and returns its value. The function body is sent
 * as source, so it closes over nothing from this process.
 */
export function evaluate(pageId, fn) {
  const { message } = cli([
    'evaluate_script',
    String(fn),
    '--pageId',
    String(pageId),
  ]);
  const body = /```json\n([\s\S]*?)\n```/.exec(message || '');
  if (!body) {
    throw new Error(`Unexpected evaluate_script output: ${message}`);
  }
  return JSON.parse(body[1]);
}

/** Polls the page until `fn` returns something truthy, or gives up. */
export async function waitFor(pageId, fn, { timeout = 15000 } = {}) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    last = evaluate(pageId, fn);
    if (last) {
      return last;
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error(
    `Timed out waiting for ${fn} — last value: ${JSON.stringify(last)}`
  );
}

export function consoleErrors(pageId) {
  const output = cli(
    ['list_console_messages', String(pageId), '--types', 'error'],
    { json: false }
  );
  return output
    .split('\n')
    .filter((line) => line.includes('[error]'))
    .map((line) => line.trim());
}

export function serviceWorkers() {
  const { extensionServiceWorkers = [] } = cli(['list_pages']);
  return extensionServiceWorkers;
}
