// Thin loader only: ESLint discovers this path, but every rule lives under
// reqs/rules, named for what it governs (RULES_LOCATION_CHECK).

import naming from './reqs/rules/naming.rules.js';
import sharedBoundary from './reqs/rules/shared.boundary.js';
import complexity from './reqs/rules/complexity.rules.js';
import specTitles from './reqs/rules/spec-titles.rules.js';

const browserGlobals = {
  chrome: 'readonly',
  window: 'readonly',
  document: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  setInterval: 'readonly',
  clearTimeout: 'readonly',
  clearInterval: 'readonly',
  FormData: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  Event: 'readonly',
  CustomEvent: 'readonly',
  MouseEvent: 'readonly',
  KeyboardEvent: 'readonly',
  File: 'readonly',
  EventTarget: 'readonly',
  HTMLElement: 'readonly',
  Element: 'readonly',
  Node: 'readonly',
  navigator: 'readonly',
  confirm: 'readonly',
  TextEncoder: 'readonly',
  crypto: 'readonly',
  btoa: 'readonly',
  Blob: 'readonly',
  FileReader: 'readonly',
  AbortController: 'readonly',
  DOMParser: 'readonly',
  structuredClone: 'readonly',
  location: 'readonly',
};

export default [
  { ignores: ['**/coverage/**', '**/node_modules/**'] },

  ...naming,

  {
    files: ['chrome-extension/**/*.js', 'reqs/**/*.js'],
    languageOptions: { globals: browserGlobals },
  },
  {
    files: ['reqs/**/*.js'],
    languageOptions: {
      globals: {
        global: 'readonly',
        performance: 'readonly',
        __dirname: 'readonly',
        // reqs/browser runs under Node rather than jsdom (layout.adr-5).
        process: 'readonly',
      },
    },
  },
  {
    files: ['vitest.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: { __dirname: 'readonly', process: 'readonly' },
    },
  },

  sharedBoundary,
  complexity,
  specTitles,
];
