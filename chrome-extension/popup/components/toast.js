class Toast {
  constructor() {
    this.container = null;
    this.toasts = new Map();
    this.init();
  }

  init() {
    this.container = document.getElementById('toastContainer');
    if (!this.container) {
      console.warn('Toast container not found');
    }
  }

  show(message, type = 'success', duration = 4000) {
    if (!this.container) {
      console.warn('Toast container not available');
      return;
    }

    const id = this.generateId();
    const toast = this.createToastElement(id, message, type);
    
    this.container.appendChild(toast);
    this.toasts.set(id, toast);

    setTimeout(() => {
      this.animateIn(toast);
    }, 10);

    if (duration > 0) {
      setTimeout(() => {
        this.hide(id);
      }, duration);
    }

    return id;
  }

  hide(id) {
    const toast = this.toasts.get(id);
    if (!toast) return;

    this.animateOut(toast, () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts.delete(id);
    });
  }

  createToastElement(id, message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('data-toast-id', id);
    
    const icon = this.getIcon(type);
    
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${icon}</span>
        <p class="toast-message">${this.escapeHtml(message)}</p>
      </div>
    `;

    // Make entire toast clickable to close
    toast.addEventListener('click', () => {
      this.hide(id);
    });

    // Add hover effect to indicate clickability
    toast.style.cursor = 'pointer';

    return toast;
  }

  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  animateIn(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    
    const animation = toast.animate([
      { opacity: 0, transform: 'translateX(100%)' },
      { opacity: 1, transform: 'translateX(0)' }
    ], {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards'
    });
    
    animation.onfinish = () => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    };
  }

  animateOut(toast, callback) {
    const animation = toast.animate([
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: 'translateX(100%)' }
    ], {
      duration: 200,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards'
    });
    
    animation.onfinish = callback;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  clear() {
    this.toasts.forEach((toast, id) => {
      this.hide(id);
    });
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

const toast = new Toast();
export default toast;