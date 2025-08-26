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
        case 'getSelectedText':
          sendResponse({ text: this.getSelectedText() });
          break;
        case 'insertText':
          this.insertText(request.text, request.position);
          sendResponse({ success: true });
          break;
        case 'showProcessingOverlay':
          this.showProcessingOverlay(request.template, request.selectedText);
          sendResponse({ success: true });
          break;
        case 'hideOverlay':
          this.hideOverlay();
          sendResponse({ success: true });
          break;
        case 'processWithTemplate':
          this.processWithTemplate(request.templateId, request.selectedText);
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

  getSelectedText() {
    const selection = window.getSelection();
    return {
      text: selection.toString().trim(),
      html: this.getSelectionHTML(),
      range: this.getSelectionRange(),
    };
  }

  getSelectionHTML() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
      return '';
    }

    const range = selection.getRangeAt(0);
    const clonedSelection = range.cloneContents();
    const div = document.createElement('div');
    div.appendChild(clonedSelection);
    return div.innerHTML;
  }

  getSelectionRange() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    return {
      startContainer: this.getNodePath(range.startContainer),
      startOffset: range.startOffset,
      endContainer: this.getNodePath(range.endContainer),
      endOffset: range.endOffset,
    };
  }

  getNodePath(node) {
    const path = [];
    while (node && node !== document.body) {
      const index = Array.from(node.parentNode.childNodes).indexOf(node);
      path.unshift(index);
      node = node.parentNode;
    }
    return path;
  }

  insertText(text, position = null) {
    if (position && position.range) {
      this.insertAtRange(text, position.range);
    } else if (this.selectedText) {
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
    if (selection.rangeCount === 0) {
      return false;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));

    selection.removeAllRanges();
    return true;
  }

  insertAtCursor(text) {
    const activeElement = document.activeElement;

    if (
      activeElement &&
      (activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'INPUT')
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
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
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

  showProcessingOverlay(template, selectedText) {
    this.hideOverlay();

    const overlay = this.createOverlay();
    overlay.innerHTML = `
      <div class="ai-toolbox-overlay">
        <div class="ai-toolbox-header">
          <h3>Processing with AI Toolbox</h3>
          <button class="ai-toolbox-close">&times;</button>
        </div>
        <div class="ai-toolbox-content">
          <div class="ai-toolbox-template">
            <strong>Template:</strong> ${this.escapeHtml(template.name)}
          </div>
          <div class="ai-toolbox-input">
            <strong>Selected Text:</strong>
            <div class="ai-toolbox-text">${this.escapeHtml(selectedText.substring(0, 200))}${selectedText.length > 200 ? '...' : ''}</div>
          </div>
          <div class="ai-toolbox-status">
            <div class="ai-toolbox-spinner"></div>
            <span>Processing...</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayVisible = true;

    overlay.querySelector('.ai-toolbox-close').addEventListener('click', () => {
      this.hideOverlay();
    });

    setTimeout(() => {
      overlay.classList.add('visible');
    }, 10);
  }

  showResultOverlay(template, selectedText, result) {
    this.hideOverlay();

    const overlay = this.createOverlay();
    overlay.innerHTML = `
      <div class="ai-toolbox-overlay">
        <div class="ai-toolbox-header">
          <h3>AI Processing Complete</h3>
          <button class="ai-toolbox-close">&times;</button>
        </div>
        <div class="ai-toolbox-content">
          <div class="ai-toolbox-template">
            <strong>Template:</strong> ${this.escapeHtml(template.name)}
          </div>
          <div class="ai-toolbox-result">
            <strong>Result:</strong>
            <div class="ai-toolbox-text ai-toolbox-result-text">${this.escapeHtml(result)}</div>
          </div>
          <div class="ai-toolbox-actions">
            <button class="ai-toolbox-btn ai-toolbox-btn-primary" data-action="insert">Insert Text</button>
            <button class="ai-toolbox-btn ai-toolbox-btn-secondary" data-action="copy">Copy to Clipboard</button>
            <button class="ai-toolbox-btn ai-toolbox-btn-secondary" data-action="close">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayVisible = true;

    const closeBtn = overlay.querySelector('.ai-toolbox-close');
    const insertBtn = overlay.querySelector('[data-action="insert"]');
    const copyBtn = overlay.querySelector('[data-action="copy"]');
    const closeActionBtn = overlay.querySelector('[data-action="close"]');

    closeBtn.addEventListener('click', () => this.hideOverlay());
    closeActionBtn.addEventListener('click', () => this.hideOverlay());

    insertBtn.addEventListener('click', () => {
      this.insertText(result);
      this.hideOverlay();
    });

    copyBtn.addEventListener('click', () => {
      navigator.clipboard
        .writeText(result)
        .then(() => {
          this.showToast('Result copied to clipboard', 'success');
        })
        .catch(() => {
          this.showToast('Failed to copy result', 'error');
        });
    });

    setTimeout(() => {
      overlay.classList.add('visible');
    }, 10);
  }

  showErrorOverlay(template, selectedText, error) {
    this.hideOverlay();

    const overlay = this.createOverlay();
    overlay.innerHTML = `
      <div class="ai-toolbox-overlay ai-toolbox-error">
        <div class="ai-toolbox-header">
          <h3>AI Processing Failed</h3>
          <button class="ai-toolbox-close">&times;</button>
        </div>
        <div class="ai-toolbox-content">
          <div class="ai-toolbox-template">
            <strong>Template:</strong> ${this.escapeHtml(template.name)}
          </div>
          <div class="ai-toolbox-error-message">
            <strong>Error:</strong> ${this.escapeHtml(error)}
          </div>
          <div class="ai-toolbox-actions">
            <button class="ai-toolbox-btn ai-toolbox-btn-secondary" data-action="close">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayVisible = true;

    overlay.querySelector('.ai-toolbox-close').addEventListener('click', () => {
      this.hideOverlay();
    });

    overlay
      .querySelector('[data-action="close"]')
      .addEventListener('click', () => {
        this.hideOverlay();
      });

    setTimeout(() => {
      overlay.classList.add('visible');
    }, 10);
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

  processWithTemplate(templateId, selectedText) {
    chrome.runtime.sendMessage({
      action: 'processTemplate',
      templateId,
      selectedText,
      pageUrl: window.location.href,
    });
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
