class AIToolboxContent {
  constructor() {
    this.initialized = false;
    this.selectedText = '';
    this.contextMenuEnabled = true;
    this.overlayVisible = false;
    this.init();
  }

  init() {
    if (this.initialized) {
      return;
    }

    this.setupEventListeners();
    this.setupMessageListeners();
    this.initialized = true;

    console.log('AI Toolbox content script initialized');
  }

  setupEventListeners() {
    document.addEventListener('mouseup', () => {
      setTimeout(() => {
        this.handleTextSelection();
      }, 10);
    });

    document.addEventListener('keyup', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        setTimeout(() => {
          this.handleTextSelection();
        }, 10);
      }
    });

    document.addEventListener('contextmenu', (e) => {
      this.handleContextMenu(e);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlayVisible) {
        this.hideOverlay();
      }
    });

    document.addEventListener('click', (e) => {
      if (this.overlayVisible && !e.target.closest('.ai-toolbox-overlay')) {
        this.hideOverlay();
      }
    });
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'showProcessingOverlay':
          this.showProcessingOverlay(request.template, request.selectedText);
          sendResponse({ success: true });
          break;
        case 'showResultOverlay':
          this.showResultOverlay(
            request.template,
            request.selectedText,
            request.result
          );
          sendResponse({ success: true });
          break;
        case 'showErrorOverlay':
          this.showErrorOverlay(
            request.template,
            request.selectedText,
            request.error
          );
          sendResponse({ success: true });
          break;
        case 'showError':
          this.showErrorOverlay({ name: 'AI Toolbox' }, '', request.message);
          sendResponse({ success: true });
          break;
        default:
          sendResponse({ error: 'Unknown action' });
      }
      return true;
    });
  }

  handleTextSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && selectedText !== this.selectedText) {
      this.selectedText = selectedText;
      this.notifySelectionChange(selectedText);
    } else if (!selectedText) {
      this.selectedText = '';
    }
  }

  handleContextMenu() {
    if (this.selectedText) {
      chrome.runtime.sendMessage({
        action: 'updateContextMenu',
        selectedText: this.selectedText,
        pageUrl: window.location.href,
        pageTitle: document.title,
      });
    }
  }

  insertText(text, position = null) {
    // `selectedText` tracks the *live* selection, which is gone by now:
    // moving focus into the overlay collapses it, and the mouseup handler
    // then clears the field. A non-collapsed saved range is the durable
    // record that the user did have something selected when they invoked us.
    const hadSelection =
      this.selectedText || (this.savedRange && !this.savedRange.collapsed);

    if (position && position.range) {
      this.insertAtRange(text, position.range);
    } else if (hadSelection) {
      this.replaceSelection(text);
    } else {
      this.insertAtCursor(text);
    }
  }

  insertAtRange(text, rangeData) {
    try {
      const startNode = this.getNodeFromPath(rangeData.startContainer);
      const endNode = this.getNodeFromPath(rangeData.endContainer);

      if (!startNode || !endNode) {
        return false;
      }

      const range = document.createRange();
      range.setStart(startNode, rangeData.startOffset);
      range.setEnd(endNode, rangeData.endOffset);

      range.deleteContents();
      range.insertNode(document.createTextNode(text));

      return true;
    } catch (error) {
      console.error('Failed to insert text at range:', error);
      return false;
    }
  }

  getNodeFromPath(path) {
    let node = document.body;
    for (const index of path) {
      if (node.childNodes[index]) {
        node = node.childNodes[index];
      } else {
        return null;
      }
    }
    return node;
  }

  replaceSelection(text) {
    const selection = window.getSelection();
    // The range saved when the overlay opened wins: focusing the overlay's
    // Insert Text button collapses whatever the user had selected on the page.
    const range =
      this.savedRange ||
      (selection.rangeCount > 0 ? selection.getRangeAt(0) : null);
    if (!range) {
      return false;
    }

    range.deleteContents();
    range.insertNode(document.createTextNode(text));

    selection.removeAllRanges();
    return true;
  }

  // Only these input types expose selectionStart/selectionEnd; reading them
  // on any other type (number, email, date, ...) throws InvalidStateError.
  static SELECTABLE_INPUT_TYPES = new Set([
    'text',
    'search',
    'url',
    'tel',
    'password',
  ]);

  insertAtCursor(text) {
    // The overlay now takes focus when it opens, so document.activeElement is
    // the Insert Text button by the time this runs. The field the user
    // invoked from is the one remembered in mountOverlay.
    const activeElement = this.previouslyFocused || document.activeElement;

    if (
      activeElement &&
      (activeElement.tagName === 'TEXTAREA' ||
        (activeElement.tagName === 'INPUT' &&
          AIToolboxContent.SELECTABLE_INPUT_TYPES.has(
            (activeElement.type || 'text').toLowerCase()
          )))
    ) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const currentValue = activeElement.value;

      activeElement.value =
        currentValue.substring(0, start) + text + currentValue.substring(end);
      activeElement.selectionStart = activeElement.selectionEnd =
        start + text.length;
      activeElement.focus();

      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    } else if (activeElement && activeElement.isContentEditable) {
      // Focusing the overlay collapsed the host page's selection, so the
      // range saved at open time is the only record of where to write.
      activeElement.focus();
      const selection = window.getSelection();
      const range = this.savedRange || selection.getRangeAt?.(0);
      if (range) {
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }
    }

    this.showInsertionToast(text);
    return false;
  }

  // Builds the shared overlay shell (header, close button, mount, reveal
  // animation) and returns it so callers can wire up their own body actions.
  mountOverlay(title, bodyHtml, extraClass = '') {
    this.hideOverlay();

    // Remembered before focus moves into the overlay, so dismissing returns
    // the caret to the field the user invoked the toolbox from — which is
    // also where Insert Text writes.
    this.previouslyFocused = document.activeElement;

    // Same reason, for contenteditable hosts: the caret position survives as
    // a Range even after focus leaves.
    const selection = window.getSelection();
    this.savedRange =
      selection && selection.rangeCount > 0
        ? selection.getRangeAt(0).cloneRange()
        : null;

    const titleId = 'ai-toolbox-title';
    const overlay = this.createOverlay();
    // This is a modal over someone else's page, so it has to declare itself:
    // without role/aria-modal a screen reader reads it as loose divs mixed
    // into the host page's content.
    overlay.innerHTML = `
      <div class="ai-toolbox-overlay${extraClass ? ` ${extraClass}` : ''}"
           role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <div class="ai-toolbox-header">
          <h3 id="${titleId}">${this.escapeHtml(title)}</h3>
          <button class="ai-toolbox-close" aria-label="Close AI Toolbox">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="ai-toolbox-content">
          ${bodyHtml}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayVisible = true;

    overlay
      .querySelectorAll('.ai-toolbox-close, [data-action="close"]')
      .forEach((btn) => {
        btn.addEventListener('click', () => this.hideOverlay());
      });

    overlay.addEventListener('keydown', (e) => this.trapFocus(overlay, e));

    setTimeout(() => {
      overlay.classList.add('visible');
      // Focus the first action rather than the close button: on the result
      // overlay that is Insert Text, the reason the overlay opened.
      const first = overlay.querySelector(
        '.ai-toolbox-content button, .ai-toolbox-close'
      );
      first?.focus();
    }, 10);

    return overlay;
  }

  // Tab stays inside the overlay while it is up. The host page behind is
  // still fully interactive otherwise, and focus escaping into it silently
  // is worse here than in an extension page — it is someone else's DOM.
  trapFocus(overlay, e) {
    if (e.key !== 'Tab') {
      return;
    }

    const items = [...overlay.querySelectorAll('button, [href], [tabindex]')];
    if (items.length === 0) {
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  templateRow(template) {
    return `
      <div class="ai-toolbox-template">
        <strong>Template:</strong> ${this.escapeHtml(template?.name)}
      </div>
    `;
  }

  showProcessingOverlay(template, selectedText) {
    const text = String(selectedText || '');
    this.mountOverlay(
      'Processing with AI Toolbox',
      `
        ${this.templateRow(template)}
        <div class="ai-toolbox-input">
          <strong>Selected Text:</strong>
          <div class="ai-toolbox-text">${this.escapeHtml(text.substring(0, 200))}${text.length > 200 ? '...' : ''}</div>
        </div>
        <div class="ai-toolbox-status" role="status">
          <div class="ai-toolbox-spinner" aria-hidden="true"></div>
          <span>Processing...</span>
        </div>
      `
    );
  }

  showResultOverlay(template, selectedText, result) {
    const overlay = this.mountOverlay(
      'AI Processing Complete',
      `
        ${this.templateRow(template)}
        <div class="ai-toolbox-result">
          <strong>Result:</strong>
          <div class="ai-toolbox-text ai-toolbox-result-text">${this.escapeHtml(result)}</div>
        </div>
        <div class="ai-toolbox-actions">
          <button class="ai-toolbox-btn ai-toolbox-btn-primary" data-action="insert">Insert Text</button>
          <button class="ai-toolbox-btn ai-toolbox-btn-secondary" data-action="copy">Copy to Clipboard</button>
          <button class="ai-toolbox-btn ai-toolbox-btn-secondary" data-action="close">Close</button>
        </div>
      `
    );

    overlay
      .querySelector('[data-action="insert"]')
      .addEventListener('click', () => {
        this.insertText(result);
        this.hideOverlay();
      });

    overlay
      .querySelector('[data-action="copy"]')
      .addEventListener('click', () => {
        navigator.clipboard
          .writeText(result)
          .then(() => {
            this.showToast('Result copied to clipboard', 'success');
          })
          .catch(() => {
            this.showToast('Failed to copy result', 'error');
          });
      });
  }

  showErrorOverlay(template, selectedText, error) {
    this.mountOverlay(
      'AI Processing Failed',
      `
        ${this.templateRow(template)}
        <div class="ai-toolbox-error-message">
          <strong>Error:</strong> ${this.escapeHtml(error)}
        </div>
        <div class="ai-toolbox-actions">
          <button class="ai-toolbox-btn ai-toolbox-btn-secondary" data-action="close">Close</button>
        </div>
      `,
      'ai-toolbox-error'
    );
  }

  createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'ai-toolbox-overlay-container';
    overlay.setAttribute('data-ai-toolbox', 'true');
    return overlay;
  }

  hideOverlay() {
    const overlay = document.querySelector('.ai-toolbox-overlay-container');
    if (overlay) {
      overlay.classList.remove('visible');
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        this.overlayVisible = false;
      }, 200);
      // Hand the host page its caret back rather than dropping focus to
      // <body>, which would lose the user's place in whatever they were
      // writing.
      this.previouslyFocused?.focus?.();
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `ai-toolbox-toast ai-toolbox-toast-${type}`;
    toast.textContent = message;
    toast.style.cursor = 'pointer';

    // Make toast clickable to close
    const closeToast = () => {
      toast.classList.remove('visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 200);
    };

    toast.addEventListener('click', closeToast);

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);

    // Auto-close after 4 seconds
    setTimeout(closeToast, 4000);
  }

  showInsertionToast(text) {
    const shortText = text.length > 50 ? text.substring(0, 50) + '...' : text;
    this.showToast(`Text ready to insert: "${shortText}"`, 'info');
  }

  notifySelectionChange(selectedText) {
    chrome.runtime.sendMessage({
      action: 'textSelected',
      selectedText,
      pageUrl: window.location.href,
    });
  }

  escapeHtml(text) {
    if (!text) {
      return '';
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  cleanup() {
    this.hideOverlay();
    const toasts = document.querySelectorAll('.ai-toolbox-toast');
    toasts.forEach((toast) => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  }
}

const aiToolboxContent = new AIToolboxContent();

window.addEventListener('beforeunload', () => {
  aiToolboxContent.cleanup();
});
