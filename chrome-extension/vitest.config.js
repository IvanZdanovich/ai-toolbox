import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  // Set root to chrome-extension directory
  root: resolve(__dirname),

  test: {
    // Test environment
    environment: 'jsdom',

    // Global setup
    globals: true,

    // Setup files - relative to root
    setupFiles: ['./tests/setup.js'],

    // Include patterns - relative to root
    include: ['./tests/**/*.test.js', './tests/**/*.spec.js'],

    // Exclude patterns
    exclude: ['**/node_modules/**', '**/build/**', '**/dist/**'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'shared/**/*.js',
        'background/**/*.js',
        'sidepanel/**/*.js',
        'settings/**/*.js',
        'content/**/*.js',
      ],
      exclude: ['tests/**', '**/*.test.js', '**/*.spec.js'],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },

    // Test timeout
    testTimeout: 10000,

    // Retry failed tests
    retry: 1,

    // Reporter
    reporters: ['verbose'],

    // Mock configuration
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@shared': resolve(__dirname, './shared'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
});
