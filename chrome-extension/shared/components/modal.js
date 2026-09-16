import { sanitizeText } from '../helpers.js';

// Elements that can hold focus inside a dialog. Narrow on purpose: the
// dialog's own markup is the only thing this runs against.
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]';

class Modal {
  confirm(title, message, options = {}) {
    return new Promise((resolve) => {
      const modal = this.createConfirmModal(title, message, options, resolve);
      document.body.appendChild(modal);

      setTimeout(() => {
        modal.classList.add('show');
      }, 10);

      // Cancel, not confirm: the confirm button is destructive in every
      // current call site, and focusing it means a stray Enter deletes.
      const cancelBtn = modal.querySelector('.cancel-btn');
      const confirmBtn = modal.querySelector('.confirm-btn');
      (cancelBtn || confirmBtn)?.focus();
    });
  }

  // Keeps Tab inside the dialog. Without it, focus walks out into the page
  // behind, which is still visible through the 50%-opaque overlay and still
  // clickable.
  trapFocus(modal, e) {
    if (e.key !== 'Tab') {
      return;
    }

    const items = [...modal.querySelectorAll(FOCUSABLE)];
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

  // Removes a detached dialog and wires Escape to dismiss it with cancelValue.
  dismissable(modal, resolve, cancelValue) {
    // Restored on close so the keyboard user returns to the control they
    // opened the dialog from rather than the top of the document.
    const previouslyFocused = document.activeElement;

    const cleanup = () => {
      document.removeEventListener('keydown', onKeydown);
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 200);
      previouslyFocused?.focus?.();
    };

    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(cancelValue);
        return;
      }
      this.trapFocus(modal, e);
    };

    document.addEventListener('keydown', onKeydown);
    return cleanup;
  }

  createConfirmModal(title, message, options, resolve) {
    const titleId = `modal-title-${Date.now()}`;
    const bodyId = `modal-body-${Date.now()}`;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" role="alertdialog" aria-modal="true"
           aria-labelledby="${titleId}" aria-describedby="${bodyId}">
        <div class="modal-header">
          <h2 class="modal-title" id="${titleId}">${sanitizeText(title)}</h2>
        </div>
        <div class="modal-body">
          <p id="${bodyId}">${sanitizeText(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary cancel-btn">${options.cancelText || 'Cancel'}</button>
          <button class="btn ${options.confirmClass || 'btn-primary'} confirm-btn">${options.confirmText || 'Confirm'}</button>
        </div>
      </div>
    `;

    const cleanup = this.dismissable(modal, resolve, false);

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    modal.querySelector('.confirm-btn').addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    // Removed click-outside behavior to prevent auto-closing

    return modal;
  }
}

const modal = new Modal();
export default modal;
