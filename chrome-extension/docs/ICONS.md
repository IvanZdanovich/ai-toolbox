# SVG Icon System

This extension uses a comprehensive SVG icon system that automatically supports dark/light themes.

## ✅ **Features**

- **🎨 Automatic dark theme support** - Icons inherit text colors via `currentColor`
- **📏 Multiple sizes** - xs, sm, md, lg, xl
- **🎯 Color variants** - primary, secondary, success, warning, error, muted
- **⚡ Reusable** - Single SVG sprite file
- **🔧 Helper functions** - Easy JavaScript integration
- **♿ Accessible** - Proper ARIA support

## 🎨 **Available Icons**

- `settings` - Settings/configuration
- `add` - Add/create new items
- `edit` - Edit existing items
- `delete` - Delete/remove items
- `copy` - Copy/duplicate
- `export` - Export data
- `import` - Import data
- `search` - Search functionality
- `close` - Close/cancel
- `star` - Favorites/rating
- `coffee` - Support/donation
- `github` - GitHub integration
- `magic` - AI/generation features

## 🚀 **Usage Examples**

### HTML Usage
```html
<!-- Basic icon -->
<svg class="icon icon--sm">
  <use href="../icons/icons.svg#icon-settings"></use>
</svg>

<!-- Icon with color -->
<svg class="icon icon--md icon--primary">
  <use href="../icons/icons.svg#icon-add"></use>
</svg>

<!-- Interactive icon -->
<svg class="icon icon--lg icon--interactive">
  <use href="../icons/icons.svg#icon-star"></use>
</svg>
```

### JavaScript Usage
```javascript
import IconHelper from '../shared/icon-helper.js';

// Create icon element
const settingsIcon = IconHelper.createIcon('settings', 'md', 'primary');
button.appendChild(settingsIcon);

// Generate icon HTML string
const addIconHTML = IconHelper.iconHTML('add', 'sm', 'primary');
container.innerHTML = `<button>${addIconHTML}New Item</button>`;

// Create action button with icon
const deleteBtn = IconHelper.createActionButton(
  'delete', 
  'Delete item', 
  'btn btn-danger',
  () => deleteItem()
);

// Replace emoji with SVG icons
const textWithIcons = IconHelper.replaceEmojiIcons('Click ⚙️ to open settings');
```

### Button Examples
```html
<!-- Primary button with icon -->
<button class="btn btn-primary">
  <svg class="icon icon--sm"><use href="../icons/icons.svg#icon-add"></use></svg>
  New Template
</button>

<!-- Secondary button with icon -->
<button class="btn btn-secondary">
  <svg class="icon icon--sm"><use href="../icons/icons.svg#icon-export"></use></svg>
  Export Data
</button>

<!-- Icon-only button -->
<button class="btn btn-small" title="Settings">
  <svg class="icon icon--md"><use href="../icons/icons.svg#icon-settings"></use></svg>
</button>
```

## 🎨 **Sizes**

- `icon--xs` - 0.75em (12px at 16px base)
- `icon--sm` - 1em (16px at 16px base)
- `icon--md` - 1.25em (20px at 16px base)
- `icon--lg` - 1.5em (24px at 16px base)
- `icon--xl` - 2em (32px at 16px base)

## 🎯 **Color Variants**

- `icon--primary` - Primary theme color
- `icon--secondary` - Secondary text color
- `icon--success` - Success state color
- `icon--warning` - Warning state color  
- `icon--error` - Error state color
- `icon--muted` - Muted/disabled appearance

## 🌙 **Dark Theme Support**

Icons automatically adapt to dark theme via:

1. **CSS Custom Properties** - Theme colors update automatically
2. **currentColor** - Icons inherit text color
3. **Media Queries** - `@media (prefers-color-scheme: dark)`

```css
/* Icons automatically adapt */
@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary: #f9fafb; /* Icons inherit this */
    --color-primary: #3b82f6;      /* Primary icons use this */
  }
}
```

## 📁 **File Structure**

```
chrome-extension/
├── icons/
│   └── icons.svg              # SVG sprite with all icons
├── styles/
│   ├── icons.css              # Icon system styles
│   └── variables.css          # Theme variables (with dark theme)
└── shared/
    └── icon-helper.js         # JavaScript helper functions
```

## ➕ **Adding New Icons**

1. **Add to sprite** - Add new `<symbol>` to `icons/icons.svg`
2. **Use currentColor** - Ensure `fill="currentColor"` for theme support
3. **Update helper** - Add emoji mapping in `icon-helper.js` if needed
4. **Test themes** - Verify icon works in both light/dark themes

Example:
```xml
<symbol id="icon-newicon" viewBox="0 0 24 24">
  <path fill="currentColor" d="your-path-data"/>
</symbol>
```

This system provides a scalable, theme-aware icon solution perfect for Chrome extensions! 🎉