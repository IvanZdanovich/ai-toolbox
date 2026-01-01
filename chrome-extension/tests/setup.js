/**
 * Test Setup
 * Global setup for all tests
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi, expect } from 'vitest';
import {
  installChromeMock,
  uninstallChromeMock,
  testUtils,
} from './mocks/chrome-api.mock.js';

// Global test timeout
vi.setConfig({ testTimeout: 10000 });

// Install Chrome mock before all tests
beforeAll(() => {
  // Install Chrome API mock globally
  installChromeMock();

  // Mock console methods to reduce noise
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});

  // Keep error and warn for debugging
  // vi.spyOn(console, 'error').mockImplementation(() => {});
  // vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// Reset storage before each test
beforeEach(() => {
  testUtils.resetStorage();
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Uninstall Chrome mock after all tests
afterAll(() => {
  uninstallChromeMock();
  vi.restoreAllMocks();
});

// Global test utilities
globalThis.testHelpers = {
  /**
   * Wait for a condition to be true
   */
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error('waitFor timeout');
  },

  /**
   * Wait for specified milliseconds
   */
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Create a deferred promise
   */
  createDeferred: () => {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  },

  /**
   * Mock a successful fetch response
   */
  mockFetchSuccess: (data) => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });
  },

  /**
   * Mock a failed fetch response
   */
  mockFetchError: (status, error) => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({ error: { message: error } }),
    });
  },

  /**
   * Mock a network error
   */
  mockNetworkError: (message = 'Network error') => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error(message));
  },
};

// Extend expect with custom matchers
expect.extend({
  /**
   * Check if a value is a valid ISO date string
   */
  toBeISODateString(received) {
    const pass =
      !isNaN(Date.parse(received)) &&
      typeof received === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(received);
    return {
      pass,
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be a valid ISO date string`,
    };
  },

  /**
   * Check if a value is a valid UUID-like ID
   */
  toBeValidId(received) {
    const pass = typeof received === 'string' && received.length > 0;
    return {
      pass,
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be a valid ID`,
    };
  },
});

console.log('Test setup complete');
