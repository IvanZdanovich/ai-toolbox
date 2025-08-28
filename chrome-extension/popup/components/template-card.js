import { formatRelativeTime, truncateText, downloadAsJson } from '../../shared/helpers.js';
import IconHelper from '../../shared/icon-helper.js';

class TemplateCard {
  constructor(template, options = {}) {
    this.template = template;
    this.options = {
      showActions: true,
      showDescription: true,
      showMeta: true,
      onClick: null,
      onEdit: null,
      onDuplicate: null,
      onDelete: null,
      onExport: null,
      ...options,
    };
  }

  render() {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.setAttribute('data-template-id', this.template.id);

    card.innerHTML = `
      <div class="template-card-header">
        <h3 class="template-card-title">${this.escapeHtml(this.template.name)}</h3>
        ${this.options.showActions ? this.renderActions() : ''}
      </div>
      ${
        this.options.showDescription && this.template.description
          ? `
        <p class="template-card-description">${this.escapeHtml(this.template.description)}</p>
      `
          : ''
      }
      ${this.options.showMeta ? this.renderMeta() : ''}
    `;

    this.attachEventListeners(card);
    return card;
  }

  renderActions() {
    return `
      <div class="template-card-actions">
        <button class="action-btn edit" data-action="edit" title="Edit template">
          ${IconHelper.iconHTML('edit', 'sm')}
        </button>
        <button class="action-btn duplicate" data-action="duplicate" title="Duplicate template">
          ${IconHelper.iconHTML('copy', 'sm')}
        </button>
        <button class="action-btn export" data-action="export" title="Export template">
          ${IconHelper.iconHTML('export', 'sm')}
        </button>
        <button class="action-btn delete" data-action="delete" title="Delete template">
          ${IconHelper.iconHTML('delete', 'sm', 'error')}
        </button>
      </div>
    `;
  }

  renderMeta() {
    const variableCount = this.template.inputs
      ? this.template.inputs.length
      : 0;
    const createdTime = this.template.createdAt
      ? formatRelativeTime(this.template.createdAt)
      : 'Unknown';

    return `
      <p class="template-card-meta">
        Variables: ${variableCount} • 
        Created: ${createdTime}
      </p>
    `;
  }

  attachEventListeners(card) {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.template-card-actions') && this.options.onClick) {
        this.options.onClick(this.template);
      }
    });

    if (this.options.showActions) {
      const editBtn = card.querySelector('[data-action="edit"]');
      const duplicateBtn = card.querySelector('[data-action="duplicate"]');
      const exportBtn = card.querySelector('[data-action="export"]');
      const deleteBtn = card.querySelector('[data-action="delete"]');

      if (editBtn && this.options.onEdit) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.options.onEdit(this.template);
        });
      }

      if (duplicateBtn && this.options.onDuplicate) {
        duplicateBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.options.onDuplicate(this.template);
        });
      }

      if (exportBtn) {
        exportBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.options.onExport) {
            this.options.onExport(this.template);
          } else {
            this.exportTemplate(this.template);
          }
        });
      }

      if (deleteBtn && this.options.onDelete) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.options.onDelete(this.template);
        });
      }
    }
  }

  update(template) {
    this.template = template;
    const existingCard = document.querySelector(
      `[data-template-id="${template.id}"]`
    );
    if (existingCard) {
      const newCard = this.render();
      existingCard.parentNode.replaceChild(newCard, existingCard);
      return newCard;
    }
    return null;
  }

  destroy() {
    const card = document.querySelector(
      `[data-template-id="${this.template.id}"]`
    );
    if (card && card.parentNode) {
      card.parentNode.removeChild(card);
    }
  }

  exportTemplate(template) {
    try {
      const exportData = {
        templates: [template],
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      const sanitizedName = template.name
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
      
      const filename = `${sanitizedName}-template.json`;
      downloadAsJson(exportData, filename);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static renderList(templates, container, options = {}) {
    if (!container) {
      console.error('Container element is required');
      return [];
    }

    container.innerHTML = '';

    if (templates.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No templates found</h3>
          <p>Create your first template to get started</p>
        </div>
      `;
      return [];
    }

    const cards = templates.map((template) => {
      const card = new TemplateCard(template, options);
      const element = card.render();
      container.appendChild(element);
      return card;
    });

    return cards;
  }

  static createFromTemplate(template, options = {}) {
    return new TemplateCard(template, options);
  }
}

export default TemplateCard;
