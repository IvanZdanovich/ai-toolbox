import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
        browser: true,
        node: false,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'prefer-const': 'warn',
      'no-var': 'error',
      eqeqeq: 'error',
      curly: 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-alert': 'warn',
    },
  },
  {
    files: ['chrome-extension/**/*.js'],
    languageOptions: {
      globals: {
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
      },
    },
  },
  {
    files: [
      'chrome-extension/background/**/*.js',
      'chrome-extension/sidepanel/**/*.js',
      'chrome-extension/settings/**/*.js',
      'chrome-extension/content/**/*.js',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../shared/*.js', '!../shared/index.js'],
              message: "Import from 'shared/index.js' instead of reaching into shared/ internals.",
            },
            {
              group: ['../shared/components/*.js', '!../shared/components/index.js'],
              message:
                "Import from 'shared/components/index.js' instead of reaching into shared/components/ internals.",
            },
          ],
        },
      ],
    },
  },
];
