import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Root is the repo, not the extension: reqs/ verifies chrome-extension/ and
// sits beside it, so both must be reachable from one root.
export default defineConfig({
  root: resolve(__dirname),

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./reqs/support/vitest.setup.js'],

    // Every level is `.spec.js`; the infix before it states which one, and
    // the directory it sits in has to agree (SUFFIX_IS_THE_LEVEL).
    include: [
      './reqs/unit/**/*.spec.js',
      './reqs/integration/**/*.integration.spec.js',
      './reqs/e2e/**/*.e2e.spec.js',
      './reqs/cross/**/*.cross.spec.js',
    ],
    exclude: ['**/node_modules/**', '**/build/**', '**/dist/**'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['chrome-extension/**/*.js'],
      // Setting `exclude` replaces Vitest's defaults, so node_modules and the
      // generated coverage report have to be named explicitly or they are
      // measured as if they were source.
      exclude: [
        '**/node_modules/**',
        'chrome-extension/coverage/**',
        'chrome-extension/constraints/**',
      ],
      // Flat keys — a nested `global` object is not a Vitest threshold and
      // is silently ignored, which lets coverage regress unnoticed.
      thresholds: {
        branches: 60,
        functions: 65,
        lines: 65,
        statements: 65,
      },
    },

    testTimeout: 10000,
    retry: 1,
    reporters: ['verbose'],

    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },

  resolve: {
    alias: {
      '@app': resolve(__dirname, 'chrome-extension'),
      '@constraints': resolve(__dirname, 'chrome-extension/constraints'),
      '@reqs': resolve(__dirname, 'reqs'),
    },
  },
});
