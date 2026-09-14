import js from '@eslint/js';

export default [
  { ignores: ['**/coverage/**', '**/node_modules/**'] },
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
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
      curly: 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-alert': 'error',
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
    files: ['chrome-extension/tests/**/*.js'],
    languageOptions: {
      globals: {
        global: 'readonly',
        performance: 'readonly',
      },
    },
  },
  {
    files: ['chrome-extension/vitest.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        process: 'readonly',
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
              message:
                "Import from 'shared/index.js' instead of reaching into shared/ internals.",
            },
            {
              group: [
                '../shared/components/*.js',
                '!../shared/components/index.js',
              ],
              message:
                "Import from 'shared/components/index.js' instead of reaching into shared/components/ internals.",
            },
          ],
        },
      ],
      // no-restricted-imports only sees static imports, so a dynamic
      // import() would otherwise slip past the boundary above.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ImportExpression > Literal[value=/^\\.\\.\\/shared\\/(?!index\\.js$|components\\/index\\.js$).+/]',
          message:
            "Import from 'shared/index.js' instead of reaching into shared/ internals.",
        },
      ],
    },
  },
];
