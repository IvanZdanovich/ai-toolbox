// SVG Icon Helper Functions
class IconHelper {
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
}

// Export for use in other modules
export default IconHelper;
