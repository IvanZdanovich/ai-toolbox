# Chrome Extension - Structure Reorganization Plan

## 🎯 Objective

Reorganize the chrome-extension project structure to align with the optimized copilot instructions, improve maintainability, and follow MV3 best practices.

---

## 📊 Current Structure Analysis

```
chrome-extension/
├── background/
│   └── background.js
├── content/
│   ├── content.css
│   └── content.js
├── icons/
│   └── [icon files]
├── popup/
│   └── components/
│       ├── modal.js
│       ├── template-card.js
│       └── toast.js
├── settings/
│   ├── settings.css
│   ├── settings.html
│   └── settings.js
├── shared/
│   ├── ai-service.js
│   ├── constants.js
│   ├── helpers.js
│   ├── history-manager.js
│   ├── icon-helper.js
│   ├── storage.js
│   └── template-manager.js
├── sidepanel/
│   ├── sidepanel.css
│   ├── sidepanel.html
│   └── sidepanel.js
├── styles/
│   ├── base.css
│   ├── components.css
│   ├── icons.css
│   └── variables.css
└── manifest.json
```

**Issues with Current Structure:**
- ❌ `settings/` named differently (options page should be `options/`)
- ❌ Shared styles not clearly separated from shared logic
- ❌ No clear utilities/helpers organization
- ❌ No clear types/constants organization
- ❌ UI components scattered
- ❌ Missing `_locales/` for i18n
- ❌ No clear separation between shared/utils
- ❌ Content scripts could be better organized

---

## ✅ Proposed Optimized Structure

```
chrome-extension/
│
├── manifest.json                    # MV3 manifest
├── README.md                        # Extension README
├── ARCHITECTURE.md                  # Architecture documentation
│
├── src/
│   ├── background/
│   │   └── service-worker.js        # Service worker entry
│   │
│   ├── content-scripts/
│   │   ├── content.js               # Main content script
│   │   └── content.css              # Content script styles
│   │
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   ├── popup.css
│   │   └── components/
│   │       ├── modal.js
│   │       ├── template-card.js
│   │       └── toast.js
│   │
│   ├── options/                     # Options page (renamed from settings)
│   │   ├── options.html
│   │   ├── options.js
│   │   └── options.css
│   │
│   ├── sidepanel/
│   │   ├── sidepanel.html
│   │   ├── sidepanel.js
│   │   └── sidepanel.css
│   │
│   ├── shared/
│   │   ├── constants.js             # Central constants
│   │   ├── storage.js               # Storage management
│   │   ├── types.js                 # Type definitions (JSDoc)
│   │   │
│   │   ├── services/                # Business logic services
│   │   │   ├── ai-service.js
│   │   │   ├── history-service.js
│   │   │   └── template-service.js
│   │   │
│   │   ├── utils/                   # Utility functions
│   │   │   ├── helpers.js
│   │   │   ├── icon-helper.js
│   │   │   └── dom-utils.js
│   │   │
│   │   └── styles/                  # Shared CSS
│   │       ├── variables.css        # CSS variables
│   │       ├── base.css             # Base styles
│   │       ├── components.css       # Component styles
│   │       └── icons.css            # Icon styles
│   │
│   └── _locales/
│       ├── en/
│       │   └── messages.json        # English strings
│       └── [other langs]/
│           └── messages.json
│
├── assets/
│   └── icons/
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-48.png
│       └── icon-128.png
│
├── build/                           # Generated (gitignored)
│   └── [build artifacts]
│
└── tests/                           # Test files
    ├── shared/                      # Unit tests for shared code
    │   ├── services.test.js
    │   └── utils.test.js
    └── e2e/                         # E2E tests
        └── popup.spec.js
```

---

## 🔄 Migration Path

### Phase 1: Create New Structure
1. ✅ Create `src/` directory
2. ✅ Create subdirectories per plan
3. ✅ Create new organizational files

### Phase 2: Move & Reorganize Files
1. Move `background/` → `src/background/`
2. Move `content/` → `src/content-scripts/`
3. Move `popup/` → `src/popup/`
4. Move `settings/` → `src/options/`
5. Move `sidepanel/` → `src/sidepanel/`
6. Reorganize `shared/`:
   - Core files → `src/shared/`
   - Services → `src/shared/services/`
   - Utils → `src/shared/utils/`
   - Styles → `src/shared/styles/`
7. Move `icons/` → `assets/icons/`
8. Create `src/_locales/` directory structure
9. Move `manifest.json` → stays at root

### Phase 3: Update References
1. Update all import paths
2. Update manifest.json paths
3. Update build configuration

### Phase 4: Create Documentation
1. Create `README.md` for extension
2. Create `ARCHITECTURE.md`
3. Update root project documentation

---

## 📋 Detailed Changes

### File Renames & Moves

| Current | New | Reason |
|---------|-----|--------|
| `background/background.js` | `src/background/service-worker.js` | Clearer MV3 naming |
| `content/content.js` | `src/content-scripts/content.js` | Plural, matches convention |
| `content/content.css` | `src/content-scripts/content.css` | Co-locate with script |
| `popup/` | `src/popup/` | Organized under src/ |
| `settings/` | `src/options/` | MV3 standard naming |
| `sidepanel/` | `src/sidepanel/` | Organized under src/ |
| `shared/` | `src/shared/` | Organized under src/ |
| `styles/` | `src/shared/styles/` | Group with shared |
| `icons/` | `assets/icons/` | Separate from code |

### New Subdirectories

#### `src/shared/services/`
Move and organize service files:
- `shared/ai-service.js` → `src/shared/services/ai-service.js`
- `shared/history-manager.js` → `src/shared/services/history-service.js`
- `shared/template-manager.js` → `src/shared/services/template-service.js`

**Rationale:** Service layer separate from utilities

#### `src/shared/utils/`
Move and organize utility files:
- `shared/helpers.js` → `src/shared/utils/helpers.js`
- `shared/icon-helper.js` → `src/shared/utils/icon-helper.js`

**Rationale:** Utility functions in dedicated directory

#### `src/shared/styles/`
Move all styling:
- `styles/` → `src/shared/styles/`

**Rationale:** Group shared assets with shared code

#### `src/_locales/`
Create i18n structure:
```
src/_locales/
├── en/
│   └── messages.json        # English localized strings
├── es/
│   └── messages.json        # Spanish (if applicable)
└── [other langs]/
    └── messages.json
```

**Rationale:** Chrome i18n standard location

#### `tests/`
Create test directory:
```
tests/
├── shared/
│   ├── services.test.js
│   └── utils.test.js
└── e2e/
    └── popup.spec.js
```

**Rationale:** Tests at project root per vitest/jest convention

---

## 🔧 Configuration Updates Needed

### `manifest.json` Paths
```json
{
  "background": {
    "service_worker": "src/background/service-worker.js"
  },
  "content_scripts": [
    {
      "js": ["src/content-scripts/content.js"],
      "css": ["src/content-scripts/content.css"]
    }
  ],
  "side_panel": {
    "default_path": "src/sidepanel/sidepanel.html"
  },
  "action": {
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "32": "assets/icons/icon-32.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  },
  "icons": {
    "16": "assets/icons/icon-16.png",
    "32": "assets/icons/icon-32.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  },
  "default_locale": "en"
}
```

### Build Configuration Updates
If using Vite/Rollup, update entry points:
```javascript
{
  input: {
    background: 'src/background/service-worker.js',
    content: 'src/content-scripts/content.js',
    popup: 'src/popup/popup.html',
    options: 'src/options/options.html',
    sidepanel: 'src/sidepanel/sidepanel.html'
  },
  output: {
    dir: 'dist'
  }
}
```

### `.gitignore` Updates
```
build/
dist/
src/_locales/*
!src/_locales/en/
node_modules/
.DS_Store
```

---

## 📖 Documentation to Create

### 1. `README.md` (Extension Root)
```
# AI Toolbox - Chrome Extension

## Features
- AI-powered template management
- Side panel interface
- Content script integration
- Persistent storage

## Development

### Quick Start
```bash
npm install
npm run dev
```

### File Structure
See `ARCHITECTURE.md` for detailed structure overview.

### Adding Features
1. Choose appropriate directory (popup, sidepanel, etc.)
2. Follow guidelines in copilot-instructions.md
3. Update types.js if adding new types
4. Add i18n strings to _locales/en/messages.json
```

### 2. `ARCHITECTURE.md` (Extension Root)
```
# AI Toolbox - Architecture

## Directory Structure

### src/background/
Service worker handling:
- Extension lifecycle
- Background message handling
- API requests

### src/content-scripts/
Content script for page interaction:
- DOM manipulation
- Page-level events
- Communication with popup/sidepanel

### src/popup/
Popup UI components:
- Quick actions
- Template management
- Settings quick access

### src/options/
Options page:
- Detailed settings
- Preference management

### src/sidepanel/
Side panel interface:
- Main UI
- Template display
- History

### src/shared/
Shared code:
- services/: Business logic
- utils/: Helper functions
- styles/: CSS tokens and shared styles
- constants.js: Central constants
- storage.js: Storage API wrapper
- types.js: Type definitions

### src/_locales/
Internationalization strings

### assets/
Static assets (icons, etc.)

## Message Patterns
[Document messaging between contexts]

## Storage Schema
[Document storage structure]

## Testing
Unit tests in `tests/shared/`
E2E tests in `tests/e2e/`
```

---

## ✅ Benefits of New Structure

### **Organization**
- ✅ Clear separation of concerns
- ✅ Logical grouping of related files
- ✅ Consistent with MV3 best practices
- ✅ Aligns with copilot instructions

### **Maintainability**
- ✅ Easier to find files
- ✅ Clear service/utility separation
- ✅ Scalable for growth
- ✅ Better for onboarding

### **Development**
- ✅ Clearer import paths
- ✅ Better IDE navigation
- ✅ Easier testing
- ✅ Simpler builds

### **Standards**
- ✅ Chrome MV3 conventions
- ✅ Project copilot instructions
- ✅ Web development best practices
- ✅ Internationalization ready

---

## 🚀 Implementation Checklist

### Step 1: Directory Structure
- [ ] Create `src/` directory
- [ ] Create `src/background/`
- [ ] Create `src/content-scripts/`
- [ ] Create `src/popup/`
- [ ] Create `src/options/`
- [ ] Create `src/sidepanel/`
- [ ] Create `src/shared/services/`
- [ ] Create `src/shared/utils/`
- [ ] Create `src/shared/styles/`
- [ ] Create `src/_locales/en/`
- [ ] Create `assets/icons/`
- [ ] Create `tests/shared/`
- [ ] Create `tests/e2e/`

### Step 2: Move Files
- [ ] Move background files
- [ ] Move content script files
- [ ] Move popup files
- [ ] Move options files (from settings/)
- [ ] Move sidepanel files
- [ ] Move shared files (core)
- [ ] Move service files
- [ ] Move utility files
- [ ] Move style files
- [ ] Move icon files

### Step 3: Create New Files
- [ ] Create `src/shared/types.js`
- [ ] Create `src/_locales/en/messages.json`
- [ ] Create extension `README.md`
- [ ] Create extension `ARCHITECTURE.md`

### Step 4: Update Configuration
- [ ] Update `manifest.json` paths
- [ ] Update build configuration
- [ ] Update `.gitignore`
- [ ] Update all import paths in code

### Step 5: Documentation
- [ ] Write `README.md`
- [ ] Write `ARCHITECTURE.md`
- [ ] Update project root documentation

### Step 6: Validation
- [ ] Test extension loads correctly
- [ ] Verify all features work
- [ ] Check all imports resolve
- [ ] Validate file structure

---

## 📋 Implementation Priority

**High Priority (Breaking Changes):**
1. Create directory structure
2. Move core files
3. Update manifest.json
4. Update imports

**Medium Priority (Important):**
1. Create documentation
2. Setup i18n
3. Update build config

**Low Priority (Nice to Have):**
1. Migrate to TypeScript or enhance JSDoc
2. Add automated tests
3. Setup proper build tooling

---

**Proposed by:** Structure Optimization Task
**Date:** November 27, 2025
**Status:** Ready for Implementation

