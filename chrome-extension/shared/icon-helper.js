// SVG Icon Helper Functions
class IconHelper {
  /**
   * Create an SVG icon element
   * @param {string} iconName - The icon name (without 'icon-' prefix)
   * @param {string} size - Icon size class (xs, sm, md, lg, xl)
   * @param {string} color - Icon color class (primary, secondary, success, warning, error, muted)
   * @param {object} attributes - Additional attributes for the icon
   * @returns {SVGElement} SVG icon element
   */
  static createIcon(iconName, size = 'sm', color = '', attributes = {}) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');

    // Set icon classes
    const classes = ['icon', `icon--${size}`];
    if (color) {
      classes.push(`icon--${color}`);
    }
    svg.className = classes.join(' ');

    // Set icon reference
    use.setAttribute('href', `#icon-${iconName}`);
    svg.appendChild(use);

    // Add any additional attributes
    Object.entries(attributes).forEach(([key, value]) => {
      svg.setAttribute(key, value);
    });

    return svg;
  }

  /**
   * Create an icon HTML string
   * @param {string} iconName - The icon name (without 'icon-' prefix)
   * @param {string} size - Icon size class
   * @param {string} color - Icon color class
   * @returns {string} SVG icon HTML string
   */
  static iconHTML(iconName, size = 'sm', color = '') {
    const colorClass = color ? ` icon--${color}` : '';
    return `<svg class="icon icon--${size}${colorClass}"><use href="#icon-${iconName}"></use></svg>`;
  }

  /**
   * Replace emoji icons with SVG icons in text
   * @param {string} text - Text containing emoji icons
   * @returns {string} Text with SVG icons
   */
  static replaceEmojiIcons(text) {
    const emojiMap = {
      '⚙️': 'settings',
      '✨': 'magic',
      '📤': 'export',
      '📥': 'import',
      '☕': 'coffee',
      '⭐': 'star',
      '💡': 'github',
      '🔍': 'search',
      '✏️': 'edit',
      '🗑️': 'delete',
      '📋': 'copy',
      '➕': 'add',
      '❌': 'close',
    };

    let result = text;
    Object.entries(emojiMap).forEach(([emoji, iconName]) => {
      const iconHTML = this.iconHTML(iconName, 'sm');
      result = result.replace(new RegExp(emoji, 'g'), iconHTML);
    });

    return result;
  }

  /**
   * Add icon to button element
   * @param {HTMLElement} button - Button element
   * @param {string} iconName - Icon name
   * @param {string} position - 'before' or 'after' text
   * @param {string} size - Icon size
   */
  static addIconToButton(button, iconName, position = 'before', size = 'sm') {
    const icon = this.createIcon(iconName, size);

    if (position === 'before') {
      button.insertBefore(icon, button.firstChild);
    } else {
      button.appendChild(icon);
    }
  }

  /**
   * Create action button with icon
   * @param {string} iconName - Icon name
   * @param {string} title - Button title/tooltip
   * @param {string} className - Additional CSS classes
   * @param {function} onClick - Click handler
   * @returns {HTMLElement} Button element with icon
   */
  static createActionButton(
    iconName,
    title,
    className = 'action-btn',
    onClick = null
  ) {
    const button = document.createElement('button');
    button.className = className;
    button.title = title;
    button.setAttribute('aria-label', title);

    const icon = this.createIcon(iconName, 'sm');
    button.appendChild(icon);

    if (onClick) {
      button.addEventListener('click', onClick);
    }

    return button;
  }

  /**
   * Update button icon
   * @param {HTMLElement} button - Button element
   * @param {string} newIconName - New icon name
   */
  static updateButtonIcon(button, newIconName) {
    const existingIcon = button.querySelector('svg.icon');
    if (existingIcon) {
      const use = existingIcon.querySelector('use');
      if (use) {
        use.setAttribute('href', `#icon-${newIconName}`);
      }
    }
  }

  /**
   * Add dark theme support to icon
   * @param {SVGElement} icon - Icon element
   */
  static addDarkThemeSupport(icon) {
    // Icons with currentColor automatically support dark theme
    // Additional theme-specific styling can be added here if needed
    icon.style.transition = 'fill 0.2s ease';
  }
}

// Export for use in other modules
export default IconHelper;
