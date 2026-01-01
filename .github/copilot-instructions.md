---
applyTo: '${WORKSPACE_ROOT}/chrome-extension/**'
---

# Chrome Extension Development Standards

**PURPOSE:** Build ultra-fast, secure Chrome extensions with minimal dependencies, clean architecture,
and polished UI/UX following modern web standards and Manifest V3 best practices.

## Core Principles

1. **Performance First**: Sub-150ms interactions, lazy loading, code splitting, aggressive caching
2. **Security by Design**: Minimal permissions, input sanitization, CSP compliance, zero inline scripts
3. **Minimal Dependencies**: Prefer native APIs, tree-shake aggressively, justify every package
4. **Solid UI/UX**: Consistent design system, accessibility (WCAG 2.1 AA), responsive, localized
5. **Clean Architecture**: Modular code, separation of concerns, testable units, clear data flow

## Performance Budgets (Hard Limits)

- **Total bundle size**: < 1.5 MB compressed (fail CI if > 2 MB)
- **Popup time-to-interactive**: < 150ms from click
- **Content script injection**: < 50ms to DOM ready
- **Storage operations**: < 100ms reads, batch writes
- **Memory per tab**: < 50 MB footprint

## Prohibited Practices

**NEVER:**

- Hard-code UI strings → always use `/_locales/` for internationalization
- Add dependencies without bundle-size impact analysis and justification
- Request `<all_urls>` or broad permissions → use specific match patterns only
- Use inline styles in content scripts → shadow DOM + external CSS only
- Create long-lived message connections → prefer single-request patterns
- Add polyfills for Chrome 90+ → use native APIs
- Alter page layouts without explicit requirement → non-intrusive overlays only
- Store secrets/tokens in source code → use `chrome.storage` with encryption
- Merge untested code → require unit tests (>80% coverage) + E2E tests
- Use `eval()`, inline scripts, or CSP violations
- Duplicate utility functions → centralize in `src/shared/utils/`
- Poll DOM or use expensive selectors → use `MutationObserver` with limits
- Hard-code asset paths → always use `chrome.runtime.getURL()`

## File Organization & Naming

```
extension/
├── manifest.json
├── _locales/
│   ├── en/messages.json
│   └── es/messages.json
├── src/
│   ├── background/
│   │   └── service-worker.js          # MV3 service worker only
│   ├── content-scripts/
│   │   ├── main.js
│   │   └── styles.css
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── options/
│   │   ├── options.html
│   │   ├── options.js
│   │   └── options.css
│   └── shared/
│       ├── utils/
│       │   ├── debounce.js
│       │   ├── storage.js
│       │   ├── messaging.js
│       │   └── crypto.js
│       ├── constants.js
│       └── styles/
│           ├── tokens.css             # CSS variables/design tokens
│           └── base.css
├── assets/
│   └── icons/
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
└── build/                              # Generated, gitignored
```

**Naming Conventions:**

- Files: `kebab-case.js`
- Exports/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- CSS classes: `kebab-case` with BEM notation

## Manifest V3 Configuration

**Required Setup:**

```json
{
  "manifest_version": 3,
  "name": "__MSG_extensionName__",
  "version": "1.0.0",
  "default_locale": "en",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://api.example.com/*"],
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://example.com/*"],
      "js": ["src/content-scripts/main.js"],
      "css": ["src/content-scripts/styles.css"],
      "run_at": "document_start"
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  }
}
```

**Rules:**

- Request **minimum necessary permissions** only → justify all expansions in PR
- Use `optional_permissions` for non-critical features requiring user consent
- Prefer `declarativeNetRequest` over `webRequest` for network modifications
- Always enable `type: "module"` for ES6+ module support
- Use specific `host_permissions` patterns, never `<all_urls>`

## Performance Optimization Patterns

**Code Splitting & Lazy Loading:**

```javascript
// ✅ Dynamic imports for heavy features
async function enableAdvancedFeature() {
  const { AdvancedModule } = await import('./advanced-feature.js');
  return new AdvancedModule();
}

// ✅ Lazy load on user interaction
button.addEventListener('click', async () => {
  const { analytics } = await import('./analytics.js');
  analytics.track('button_click');
});
```

**Caching with TTL:**

```javascript
// ✅ Cache with Time-To-Live
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

async function fetchWithCache(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await fetch(url).then((r) => r.json());
  cache.set(url, { data, timestamp: Date.now() });

  // Cleanup old entries
  if (cache.size > 100) {
    const oldest = [...cache.entries()][0];
    cache.delete(oldest[0]);
  }

  return data;
}
```

**Batching Operations:**

```javascript
// ✅ Batch storage writes
class StorageBatcher {
  constructor() {
    this.pending = new Map();
    this.timeoutId = null;
  }

  set(key, value) {
    this.pending.set(key, value);

    if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => this.flush(), 100);
    }
  }

  async flush() {
    if (this.pending.size === 0) return;

    const updates = Object.fromEntries(this.pending);
    await chrome.storage.local.set(updates);

    this.pending.clear();
    this.timeoutId = null;
  }
}
```

**Debouncing & Throttling:**

```javascript
// ✅ Debounce user input
import { debounce } from './utils/debounce.js';

searchInput.addEventListener(
  'input',
  debounce(async (e) => {
    const results = await searchAPI(e.target.value);
    displayResults(results);
  }, 300)
);

// ✅ Throttle scroll events
import { throttle } from './utils/throttle.js';

window.addEventListener(
  'scroll',
  throttle(() => {
    updateScrollIndicator();
  }, 100)
);
```

**Efficient DOM Operations:**

```javascript
// ✅ Use MutationObserver with limits
const observer = new MutationObserver((mutations) => {
  // Prevent processing if too many mutations (performance safety)
  if (mutations.length > 100) {
    console.warn('Too many DOM mutations, skipping');
    return;
  }

  processMutations(mutations);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false, // Only watch what you need
});

// Cleanup
window.addEventListener('beforeunload', () => observer.disconnect());
```

## Dependency Management

**Before Adding Any Dependency:**

1. Check if native Web/Chrome API can solve it
2. Estimate bundle size impact (use `bundlephobia.com`)
3. Consider writing a small utility in `src/shared/utils/`
4. Document justification in PR with alternatives considered

**Rules:**

- Lock all versions in `package.json`
- Use `npm ci` in CI for reproducible builds
- NO polyfills for Chrome 90+ (use native APIs)
- Review bundle size report on every dependency change

**Example PR Justification:**

```markdown
## Adding `date-fns` dependency

**Why:** Need robust date formatting across 10+ locales
**Size:** 12.3 KB (tree-shaken, only importing `format` and `parseISO`)
**Alternatives considered:**

- `Intl.DateTimeFormat`: Limited format options, verbose API
- Custom utility: Would require 200+ lines, hard to maintain
  **Bundle impact:** +12KB (within budget, total remains 1.2MB)
```

## Build Configuration & Tooling

**Vite Configuration:**

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    target: 'chrome90',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['large-library'], // Separate vendor bundles
        },
      },
    },
  },
});
```

**Quality Checks:**

- **Linting:** ESLint with `eslint-plugin-chrome-extension`
- **Formatting:** Prettier with pre-commit hooks
- **Type Checking:** TypeScript strict mode or JSDoc validation
- **Testing:** Vitest for unit tests, Playwright for E2E
- **Bundle Analysis:** Run `npm run build -- --analyze` before merging

**CI Pipeline Requirements:**

```yaml
# .github/workflows/ci.yml
- name: Quality Gate
  run: |
    npm ci
    npm run lint
    npm run test:unit
    npm run build
    npm run bundle-size-check  # Fail if > 2MB
    npm run test:e2e
```

## Security Best Practices

**Input Sanitization:**

```javascript
// ✅ Safe DOM insertion
element.textContent = userInput; // Always safe

// ✅ If HTML needed, sanitize first
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userHTML, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
  ALLOWED_ATTR: [],
});

// ❌ NEVER use innerHTML with user input directly
element.innerHTML = userInput; // XSS vulnerability!
```

**Message Validation:**

```javascript
// ✅ Validate all incoming messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Verify sender is from this extension
  if (!sender.id || sender.id !== chrome.runtime.id) {
    console.warn('Message from unauthorized sender');
    return;
  }

  // Validate message structure
  const ALLOWED_ACTIONS = ['GET_DATA', 'SAVE_SETTINGS', 'CLEAR_CACHE'];
  if (!msg.type || !ALLOWED_ACTIONS.includes(msg.type)) {
    console.error('Invalid message type:', msg.type);
    return;
  }

  // Process valid message
  handleMessage(msg).then(sendResponse);
  return true; // Async response
});
```

**Secure Storage:**

```javascript
// ✅ Encrypt sensitive data before storing
import { encrypt, decrypt } from './utils/crypto.js';

async function saveApiKey(apiKey) {
  const encrypted = await encrypt(apiKey, await getUserKey());
  await chrome.storage.local.set({ apiKey: encrypted });
}

async function getApiKey() {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  return apiKey ? await decrypt(apiKey, await getUserKey()) : null;
}

// ✅ Minimize exposure duration
async function makeAuthenticatedRequest(url) {
  const apiKey = await getApiKey();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  // Don't store apiKey in memory longer than needed
  return response.json();
}
```

**CSP Compliance:**

```javascript
// ✅ Load resources securely
const iconUrl = chrome.runtime.getURL('assets/icons/icon-48.png');
img.src = iconUrl;

// ✅ Use external scripts only from extension
const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/injected/script.js');
document.head.appendChild(script);

// ❌ NEVER use eval or inline scripts
eval(code); // CSP violation!
element.setAttribute('onclick', 'alert(1)'); // CSP violation!
```

## UI/UX Design System

**CSS Design Tokens:**

```css
/* src/shared/styles/tokens.css */
:root {
  /* Colors - Semantic naming */
  --color-primary: #007bff;
  --color-primary-hover: #0056b3;
  --color-success: #28a745;
  --color-danger: #dc3545;
  --color-warning: #ffc107;

  --color-bg: #ffffff;
  --color-bg-secondary: #f8f9fa;
  --color-text: #212529;
  --color-text-secondary: #6c757d;
  --color-border: #dee2e6;

  /* Spacing - 8px base unit */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Typography */
  --font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;

  /* Effects */
  --radius-sm: 4px;
  --radius-md: 8px;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1a1a1a;
    --color-bg-secondary: #2d2d2d;
    --color-text: #e0e0e0;
    --color-text-secondary: #a0a0a0;
    --color-border: #404040;
  }
}
```

**Responsive Component Example:**

```javascript
// popup.html
<button class="btn btn--primary" aria-label="Save settings">
  <span class="btn__icon" aria-hidden="true">💾</span>
  <span class="btn__text">Save</span>
</button>

// popup.css
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);

  font-family: var(--font-family);
  font-size: var(--font-size-base);
  font-weight: 500;

  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;

  transition: all var(--transition);
}

.btn--primary {
  background: var(--color-primary);
  color: white;
}

.btn--primary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn--primary:active {
  transform: translateY(0);
}

.btn--primary:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

**Accessibility Checklist:**

- ✅ All interactive elements have `aria-label` or visible text
- ✅ Keyboard navigation works (Tab, Enter, Escape)
- ✅ Focus indicators visible (`outline` or custom styling)
- ✅ Color contrast ≥ 4.5:1 for text (WCAG AA)
- ✅ Screen reader tested with Chrome + ChromeVox

**Internationalization:**

```javascript
// _locales/en/messages.json
{
  "extensionName": {
    "message": "My Extension"
  },
  "buttonSave": {
    "message": "Save Settings"
  },
  "errorNetwork": {
    "message": "Network error. Please try again."
  }
}

// popup.js
document.getElementById('save-btn').textContent =
  chrome.i18n.getMessage('buttonSave');

// Show localized error
function showError(messageKey) {
  const errorText = chrome.i18n.getMessage(messageKey);
  errorElement.textContent = errorText;
}
```

## Extension Architecture Patterns

**Service Worker (Background):**

```javascript
// src/background/service-worker.js
const CURRENT_SCHEMA_VERSION = 2;

// Install/Update lifecycle
chrome.runtime.onInstalled.addListener(async ({ reason, previousVersion }) => {
  if (reason === 'install') {
    await initializeStorage();
    chrome.tabs.create({ url: 'src/options/options.html' });
  } else if (reason === 'update') {
    const { __schemaVersion } =
      await chrome.storage.local.get('__schemaVersion');
    if (__schemaVersion < CURRENT_SCHEMA_VERSION) {
      await migrateStorage(__schemaVersion || 1, CURRENT_SCHEMA_VERSION);
    }
  }
});

// Single-request messaging pattern
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ error: error.message }));
  return true; // Async response
});

async function handleMessage(msg, sender) {
  switch (msg.type) {
    case 'GET_DATA':
      return await fetchData(msg.url);
    case 'SAVE_SETTINGS':
      return await saveSettings(msg.settings);
    default:
      throw new Error(`Unknown message type: ${msg.type}`);
  }
}

// Network retry with exponential backoff
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}

// Offload heavy processing
async function processLargeDataset(data) {
  await chrome.offscreen.createDocument({
    url: 'src/offscreen/offscreen.html',
    reasons: ['WORKERS'],
    justification: 'Heavy ML model inference',
  });

  const result = await chrome.runtime.sendMessage({
    type: 'PROCESS_DATA',
    data,
  });

  await chrome.offscreen.closeDocument();
  return result;
}
```

**Content Scripts with Shadow DOM:**

```javascript
// src/content-scripts/main.js
class ExtensionUI {
  constructor() {
    this.container = null;
    this.shadow = null;
  }

  inject() {
    // Create isolated container
    this.container = document.createElement('div');
    this.container.id = 'my-extension-root';

    // Use closed shadow DOM for style isolation
    this.shadow = this.container.attachShadow({ mode: 'closed' });

    // Load styles and content
    this.shadow.innerHTML = `
      <style>
        /* Reset all inherited styles */
        :host {
          all: initial;
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 2147483647;
        }
        
        .popup {
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 16px;
          min-width: 300px;
        }
        
        .popup__close {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
        }
      </style>
      
      <div class="popup">
        <button class="popup__close" aria-label="Close">×</button>
        <div class="popup__content">
          <!-- Extension UI here -->
        </div>
      </div>
    `;

    // Attach to page
    document.documentElement.appendChild(this.container);

    // Setup event listeners
    this.attachListeners();
  }

  attachListeners() {
    const closeBtn = this.shadow.querySelector('.popup__close');
    closeBtn.addEventListener('click', () => this.remove());

    // Listen for escape key
    document.addEventListener('keydown', this.handleKeydown);
  }

  handleKeydown = (e) => {
    if (e.key === 'Escape') this.remove();
  };

  remove() {
    document.removeEventListener('keydown', this.handleKeydown);
    this.container?.remove();
  }
}

// Observe DOM changes efficiently
const observer = new MutationObserver((mutations) => {
  if (mutations.length > 100) return; // Performance guard

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.matches && node.matches('.target-element')) {
        enhanceElement(node);
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Cleanup on navigation
window.addEventListener('beforeunload', () => {
  observer.disconnect();
  ui.remove();
});
```

**Storage Schema & Migration:**

```javascript
// src/shared/storage.js
const CURRENT_SCHEMA_VERSION = 2;

const DEFAULT_SETTINGS = {
  __schemaVersion: CURRENT_SCHEMA_VERSION,
  theme: 'auto',
  enableFeatureX: true,
  apiEndpoint: 'https://api.example.com',
};

async function initializeStorage() {
  await chrome.storage.local.set(DEFAULT_SETTINGS);
}

async function migrateStorage(fromVersion, toVersion) {
  console.log(`Migrating storage from v${fromVersion} to v${toVersion}`);

  const data = await chrome.storage.local.get();

  // Apply migrations sequentially
  if (fromVersion < 2) {
    // v1 → v2: Rename 'endpoint' to 'apiEndpoint'
    data.apiEndpoint = data.endpoint || DEFAULT_SETTINGS.apiEndpoint;
    delete data.endpoint;
  }

  // Add future migrations here
  // if (fromVersion < 3) { ... }

  data.__schemaVersion = toVersion;
  await chrome.storage.local.set(data);
  console.log('Migration completed');
}

// Compression for large data
import pako from 'pako';

async function saveLargeData(key, data) {
  const json = JSON.stringify(data);
  const compressed = pako.deflate(json);
  await chrome.storage.local.set({
    [key]: Array.from(compressed),
    [`${key}__compressed`]: true,
  });
}

async function loadLargeData(key) {
  const result = await chrome.storage.local.get([key, `${key}__compressed`]);

  if (result[`${key}__compressed`]) {
    const compressed = new Uint8Array(result[key]);
    const json = pako.inflate(compressed, { to: 'string' });
    return JSON.parse(json);
  }

  return result[key];
}
```

## Testing Requirements

**Unit Tests (Vitest):**

```javascript
// tests/utils/debounce.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from '../../src/shared/utils/debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delays function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('arg1');
  });

  it('resets timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced(); // Reset timer
    vi.advanceTimersByTime(50);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });
});

// tests/storage/migration.test.js
describe('storage migration', () => {
  beforeEach(async () => {
    await chrome.storage.local.clear();
  });

  it('migrates from v1 to v2', async () => {
    // Setup v1 data
    await chrome.storage.local.set({
      __schemaVersion: 1,
      endpoint: 'https://old-api.com',
    });

    // Run migration
    await migrateStorage(1, 2);

    // Verify v2 structure
    const data = await chrome.storage.local.get();
    expect(data.__schemaVersion).toBe(2);
    expect(data.apiEndpoint).toBe('https://old-api.com');
    expect(data.endpoint).toBeUndefined();
  });
});
```

**E2E Tests (Playwright):**

```javascript
// tests/e2e/popup.spec.js
import { test, expect } from './fixtures';

test.describe('Extension Popup', () => {
  test('loads and displays default content', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

    await expect(page.locator('h1')).toContainText('My Extension');
    await expect(page.locator('.settings-btn')).toBeVisible();
  });

  test('saves settings successfully', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

    // Interact with UI
    await page.locator('#theme-select').selectOption('dark');
    await page.locator('.save-btn').click();

    // Verify success message
    await expect(page.locator('.toast--success')).toBeVisible();
    await expect(page.locator('.toast--success')).toContainText(
      'Settings saved'
    );
  });

  test('handles network errors gracefully', async ({ page, extensionId }) => {
    // Mock failing network request
    await page.route('**/api/data', (route) => route.abort());

    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await page.locator('.fetch-btn').click();

    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Network error');
  });
});

// tests/e2e/content-script.spec.js
test.describe('Content Script Integration', () => {
  test('injects UI on target page', async ({ page }) => {
    await page.goto('https://example.com');

    // Wait for content script injection
    const extensionRoot = page.locator('#my-extension-root');
    await expect(extensionRoot).toBeAttached();

    // Verify shadow DOM content
    const shadowContent = await page.evaluate(() => {
      const root = document.querySelector('#my-extension-root');
      return root.shadowRoot.querySelector('.popup') !== null;
    });
    expect(shadowContent).toBe(true);
  });
});
```

**Coverage Requirements:**

- Unit tests: **> 80%** for `src/shared/`, `src/background/`
- E2E tests: All critical user flows (popup load, settings save, content script injection)
- Bundle-size: Automated check fails if > 2MB

## CI/CD Pipeline

**GitHub Actions Workflow:**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm run test:unit -- --coverage

      - name: Build extension
        run: npm run build

      - name: Bundle size check
        run: |
          SIZE=$(du -sb build | cut -f1)
          MAX_SIZE=$((2 * 1024 * 1024))  # 2MB
          if [ $SIZE -gt $MAX_SIZE ]; then
            echo "❌ Bundle too large: $SIZE bytes (max: $MAX_SIZE)"
            exit 1
          fi
          echo "✅ Bundle size OK: $SIZE bytes"

      - name: E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3

      - name: Archive build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: extension-build
          path: build/
```

## Documentation Standards

**README.md Structure:**

```markdown
# Extension Name

Brief description of what the extension does.

## Features

- Feature 1
- Feature 2

## Installation

1. Clone repository
2. `npm install`
3. `npm run build`
4. Load unpacked extension from `build/` directory

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for local setup and debugging.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details.

## License

MIT
```

**DEVELOPMENT.md:**

```markdown
# Development Guide

## Local Setup

1. Install Node.js 20+
2. `npm install`
3. `npm run dev` (watch mode)

## Loading Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `build/` directory

## Debugging

- **Background**: `chrome://extensions/` → "service worker"
- **Popup**: Right-click popup → "Inspect"
- **Content scripts**: Open DevTools on target page

## Testing

- `npm run test:unit` - Unit tests
- `npm run test:e2e` - E2E tests
- `npm run test:watch` - Watch mode

## Build

- `npm run build` - Production build
- `npm run build:analyze` - Bundle analysis
```

## PR Review Checklist

Before merging any PR:

### Performance

- [ ] Bundle size < 1.5MB (CI check passes)
- [ ] Heavy features use dynamic imports
- [ ] No synchronous expensive operations in hot paths

### Security

- [ ] Minimal permissions requested (justify any additions)
- [ ] All user input sanitized
- [ ] No `eval()`, inline scripts, or CSP violations
- [ ] Sensitive data encrypted before storage

### Code Quality

- [ ] ESLint passes with no warnings
- [ ] TypeScript/JSDoc types for public APIs
- [ ] No code duplication (DRY principle)
- [ ] Comments explain "why", not "what"

### Testing

- [ ] Unit test coverage > 80%
- [ ] E2E tests for new features
- [ ] Migration tests if storage schema changed
- [ ] Manual testing on target sites

### UX/Accessibility

- [ ] Screenshots attached for UI changes
- [ ] Keyboard navigation works
- [ ] ARIA labels for interactive elements
- [ ] Color contrast meets WCAG AA
- [ ] All text localized (no hard-coded strings)

### Dependencies

- [ ] Justification provided for new packages
- [ ] Bundle size impact analyzed
- [ ] Alternatives considered and documented

### Documentation

- [ ] README.md updated if behavior changes
- [ ] CHANGELOG.md entry added
- [ ] Code comments for complex logic
- [ ] Architecture docs updated if needed

## Quick Reference Guide

**Common Patterns:**

```javascript
// Debounce input
import { debounce } from './utils/debounce.js';
input.addEventListener('input', debounce(handleInput, 300));

// Asset URLs
const iconUrl = chrome.runtime.getURL('assets/icons/icon-48.png');

// Cancellable fetch
const controller = new AbortController();
const response = await fetch(url, { signal: controller.signal });
// Later: controller.abort();

// Constants
import { API_BASE_URL, CACHE_TTL } from './shared/constants.js';

// Localization
const message = chrome.i18n.getMessage('messageKey');

// Safe storage write
await chrome.storage.local.set({ key: value });

// Messaging
const response = await chrome.runtime.sendMessage({ type: 'ACTION', data });
```

**Performance Checklist:**

- ✅ Use dynamic imports for heavy features
- ✅ Debounce/throttle event handlers
- ✅ Cache API responses with TTL
- ✅ Batch storage operations
- ✅ Limit MutationObserver scope
- ✅ Clean up listeners on unmount

**Security Checklist:**

- ✅ Use `textContent` for user input
- ✅ Validate all messages
- ✅ Encrypt sensitive storage
- ✅ Minimal permissions
- ✅ CSP compliant

**Accessibility Checklist:**

- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Focus indicators visible
- ✅ Color contrast ≥ 4.5:1
- ✅ Screen reader compatible

---

**Summary:** These standards ensure sub-150ms UI response times, minimal bundle sizes through code splitting, strict security via CSP and input sanitization, and comprehensive testing. Follow these patterns to build production-ready Chrome extensions that are fast, secure, and accessible.
