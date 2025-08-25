class Modal {
  constructor() {
    this.activeModal = null;
    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.hide();
      }
    });
  }

  show(modalId) {
    const modal = document.getElementById(modalId + 'Modal');
    if (!modal) {
      console.error(`Modal ${modalId} not found`);
      return false;
    }

    if (this.activeModal) {
      this.hide();
    }

    this.activeModal = modal;
    modal.classList.remove('hidden');
    
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    const firstInput = modal.querySelector('input, textarea, select, button');
    if (firstInput) {
      firstInput.focus();
    }

    document.body.style.overflow = 'hidden';
    return true;
  }

  hide(modalId = null) {
    let modal = this.activeModal;
    
    if (modalId) {
      modal = document.getElementById(modalId + 'Modal');
    }
    
    if (!modal) return false;

    modal.classList.remove('show');
    
    setTimeout(() => {
      modal.classList.add('hidden');
      if (modal === this.activeModal) {
        this.activeModal = null;
        document.body.style.overflow = '';
      }
    }, 200);

    return true;
  }

  isVisible(modalId = null) {
    if (modalId) {
      const modal = document.getElementById(modalId + 'Modal');
      return modal && !modal.classList.contains('hidden');
    }
    return this.activeModal !== null;
  }

  getActive() {
    return this.activeModal;
  }

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

  createConfirmModal(title, message, options, resolve) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">${this.escapeHtml(title)}</h2>
        </div>
        <div class="modal-body">
          <p>${this.escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary cancel-btn">${options.cancelText || 'Cancel'}</button>
          <button class="btn ${options.confirmClass || 'btn-primary'} confirm-btn">${options.confirmText || 'Confirm'}</button>
        </div>
      </div>
    `;

    const cleanup = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 200);
    };

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

  prompt(title, message, defaultValue = '', options = {}) {
    return new Promise((resolve) => {
      const modal = this.createPromptModal(title, message, defaultValue, options, resolve);
      document.body.appendChild(modal);
      
      setTimeout(() => {
        modal.classList.add('show');
      }, 10);
      
      const input = modal.querySelector('.prompt-input');
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  createPromptModal(title, message, defaultValue, options, resolve) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">${this.escapeHtml(title)}</h2>
        </div>
        <div class="modal-body">
          <p>${this.escapeHtml(message)}</p>
          <input type="text" class="form-input prompt-input" value="${this.escapeHtml(defaultValue)}" placeholder="${this.escapeHtml(options.placeholder || '')}">
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary cancel-btn">${options.cancelText || 'Cancel'}</button>
          <button class="btn btn-primary confirm-btn">${options.confirmText || 'OK'}</button>
        </div>
      </div>
    `;

    const input = modal.querySelector('.prompt-input');
    
    const cleanup = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 200);
    };

    const submit = () => {
      const value = input.value.trim();
      cleanup();
      resolve(value || null);
    };

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    modal.querySelector('.confirm-btn').addEventListener('click', submit);
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        submit();
      }
    });

    // Removed click-outside behavior to prevent auto-closing

    return modal;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

const modal = new Modal();
export default modal;
