/**
 * Content script.
 *
 * chrome-extension/content/content.js imports no other app module — it talks
 * only to the page it is injected into and to the background worker over
 * chrome.runtime — so by LEVEL_BY_WHAT_STAYS_REAL this is a unit spec even
 * though it drives a real DOM: exactly one real app module, with the platform
 * edge doubled from reqs/support/.
 *
 * The module constructs itself on import and exposes nothing, so every case
 * drives it the way the page does: DOM events, and messages from the worker.
 *
 * Origin: layout.adr-4 (COVERAGE_GAPS — content.js had no spec).
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from 'vitest';
import {
  chromeMock,
  installChromeMock,
  uninstallChromeMock,
} from '../../support/chrome-api.mock.js';

const CONTENT = '../../../chrome-extension/content/content.js';

// Injected once per page, as Chrome does it: the script binds its listeners to
// `document`, which outlives any one case here, so re-importing it per case
// would leave every previous instance still listening.
async function bootContentScript() {
  await import(CONTENT);
  await vi.waitFor(() => {
    expect(chromeMock.runtime.onMessage._listeners).not.toHaveLength(0);
  });
}

// Back to a page with nothing selected and no overlay, through the same
// surfaces a user has.
async function resetPage() {
  window.getSelection().removeAllRanges();
  document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  // The script removes an overlay on a timer; let that land before the page is
  // cleared, so its callback cannot fire against the next case's DOM.
  await new Promise((resolve) => setTimeout(resolve, 250));
  document.body.innerHTML = '';
}

// Drive the script the way the worker does: fire the message, collect the
// response the listener sends back.
function sendMessage(request) {
  return new Promise((resolve) => {
    chromeMock.runtime.onMessage._trigger(request, {}, resolve);
  });
}

function selectTextOf(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function overlay() {
  return document.querySelector('.ai-toolbox-overlay-container');
}

describe('Content: Given the content script injected into a page', () => {
  beforeAll(async () => {
    installChromeMock();
    await bootContentScript();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetPage();
  });

  afterAll(() => {
    uninstallChromeMock();
    document.body.innerHTML = '';
  });

  describe('Content: When the worker sends a message', () => {
    it('Content: Then it answers an unknown action instead of failing silently', async () => {
      const response = await sendMessage({ action: 'no-such-action' });

      expect(response.error).toBe('Unknown action');
    });

    it('Content: Then it shows the template name and the result it was sent', async () => {
      await sendMessage({
        action: 'showResultOverlay',
        template: { name: 'Summarize' },
        selectedText: 'some text',
        result: 'a short summary',
      });

      expect(overlay().textContent).toContain('Summarize');
      expect(overlay().textContent).toContain('a short summary');
    });

    it('Content: Then it renders a result as text rather than as markup', async () => {
      await sendMessage({
        action: 'showResultOverlay',
        template: { name: 'Summarize' },
        selectedText: '',
        result: '<img src=x onerror=alert(1)>',
      });

      expect(overlay().querySelector('img')).toBeNull();
      expect(overlay().textContent).toContain('<img');
    });

    it('Content: Then it shows a spinner while a template is still running', async () => {
      await sendMessage({
        action: 'showProcessingOverlay',
        template: { name: 'Summarize' },
        selectedText: 'some text',
      });

      expect(overlay().querySelector('.ai-toolbox-spinner')).not.toBeNull();
    });

    it('Content: Then it shortens a long selection rather than reprinting the whole page', async () => {
      await sendMessage({
        action: 'showProcessingOverlay',
        template: { name: 'Summarize' },
        selectedText: 'x'.repeat(500),
      });

      const shown = overlay().querySelector('.ai-toolbox-text').textContent;
      expect(shown).toHaveLength(203); // 200 characters plus the ellipsis
    });

    it('Content: Then it shows a failure with the error the worker reported', async () => {
      await sendMessage({
        action: 'showErrorOverlay',
        template: { name: 'Summarize' },
        selectedText: '',
        error: 'API key not configured',
      });

      expect(overlay().textContent).toContain('API key not configured');
      expect(overlay().querySelector('.ai-toolbox-error')).not.toBeNull();
    });

    it('Content: Then it replaces the overlay on screen rather than stacking a second one', async () => {
      await sendMessage({
        action: 'showProcessingOverlay',
        template: { name: 'Summarize' },
        selectedText: 'text',
      });

      await sendMessage({
        action: 'showResultOverlay',
        template: { name: 'Summarize' },
        selectedText: 'text',
        result: 'done',
      });

      await vi.waitFor(() => {
        expect(
          document.querySelectorAll('.ai-toolbox-overlay-container')
        ).toHaveLength(1);
      });
      expect(overlay().textContent).toContain('done');
    });
  });

  describe('Content: When the overlay is closed', () => {
    async function showResult() {
      await sendMessage({
        action: 'showResultOverlay',
        template: { name: 'Summarize' },
        selectedText: '',
        result: 'done',
      });
    }

    it('Content: Then it closes on the close button', async () => {
      await showResult();

      overlay().querySelector('.ai-toolbox-close').click();

      await vi.waitFor(() => {
        expect(overlay()).toBeNull();
      });
    });

    it('Content: Then it closes on Escape', async () => {
      await showResult();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      await vi.waitFor(() => {
        expect(overlay()).toBeNull();
      });
    });

    it('Content: Then it closes on a click outside it', async () => {
      await showResult();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      await vi.waitFor(() => {
        expect(overlay()).toBeNull();
      });
    });

    it('Content: Then it stays open on a click inside it', async () => {
      await showResult();

      overlay()
        .querySelector('.ai-toolbox-result-text')
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(overlay()).not.toBeNull();
    });
  });

  describe('Content: When a result is inserted into the page', () => {
    it('Content: Then it replaces the text the user had selected', async () => {
      document.body.innerHTML = '<p id="target">replace me</p>';
      selectTextOf(document.getElementById('target'));
      await sendMessage({
        action: 'showResultOverlay',
        template: { name: 'Rewrite' },
        selectedText: 'replace me',
        result: 'rewritten',
      });

      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      // The script reads the selection on a short delay after mouseup.
      await new Promise((resolve) => setTimeout(resolve, 30));
      overlay().querySelector('[data-action="insert"]').click();

      await vi.waitFor(() => {
        expect(document.getElementById('target').textContent).toBe('rewritten');
      });
    });

    it('Content: Then it inserts at the cursor of a focused text field when nothing is selected', async () => {
      document.body.innerHTML = '<textarea id="editor">ab</textarea>';
      const editor = document.getElementById('editor');
      editor.focus();
      editor.setSelectionRange(1, 1);
      await sendMessage({
        action: 'showResultOverlay',
        template: { name: 'Rewrite' },
        selectedText: '',
        result: 'X',
      });

      overlay().querySelector('[data-action="insert"]').click();

      expect(editor.value).toBe('aXb');
    });

    it('Content: Then it offers the text in a toast when there is nowhere to insert it', async () => {
      document.body.innerHTML = '<input id="amount" type="number" />';
      document.getElementById('amount').focus();
      await sendMessage({
        action: 'showResultOverlay',
        template: { name: 'Rewrite' },
        selectedText: '',
        result: 'X',
      });

      overlay().querySelector('[data-action="insert"]').click();

      await vi.waitFor(() => {
        expect(
          document.querySelector('.ai-toolbox-toast').textContent
        ).toContain('X');
      });
    });
  });

  describe('Content: When the script reports back to the worker', () => {
    it('Content: Then it reports a new selection with the page it was made on', async () => {
      document.body.innerHTML = '<p id="target">interesting text</p>';
      vi.spyOn(chromeMock.runtime, 'sendMessage');
      selectTextOf(document.getElementById('target'));

      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      await vi.waitFor(() => {
        expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'textSelected',
            selectedText: 'interesting text',
          })
        );
      });
    });

    it('Content: Then it reports the same selection only once', async () => {
      document.body.innerHTML = '<p id="target">interesting text</p>';
      selectTextOf(document.getElementById('target'));
      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
      vi.spyOn(chromeMock.runtime, 'sendMessage');

      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('Content: Then it offers the current selection to the context menu', async () => {
      document.body.innerHTML = '<p id="target">interesting text</p>';
      selectTextOf(document.getElementById('target'));
      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
      vi.spyOn(chromeMock.runtime, 'sendMessage');

      document.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'updateContextMenu' })
      );
    });

    it('Content: Then it says nothing to the context menu when no text is selected', async () => {
      vi.spyOn(chromeMock.runtime, 'sendMessage');

      document.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

      expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });
});
