import { sanitizeText } from '../helpers.js';

class Modal {
  confirm(title, message, options = {}) {
    return new Promise((resolve) => {
      const modal = this.createConfirmModal(title, message, options, resolve);
      document.body.appendChild(modal);

      setTimeout(() => {
        modal.classList.add('show');
      }, 10);

      const confirmBtn = modal.querySelector('.confirm-btn');
      if (confirmBtn) {
        confirmBtn.focus();
      }
    });
  }

  // Removes a detached dialog and wires Escape to dismiss it with cancelValue.
  dismissable(modal, resolve, cancelValue) {
    const cleanup = () => {
      document.removeEventListener('keydown', onKeydown);
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 200);
    };

    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(cancelValue);
      }
    };

    document.addEventListener('keydown', onKeydown);
    return cleanup;
  }

  createConfirmModal(title, message, options, resolve) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">${sanitizeText(title)}</h2>
        </div>
        <div class="modal-body">
          <p>${sanitizeText(message)}</p>
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
