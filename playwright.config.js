// Playwright owns `reqs/e2e/` only. Every other level runs under Vitest in
// jsdom (see vitest.config.js); this is the level that needs a real Chrome
// with the unpacked extension installed, because that is the only place the
// shipped UI exists (E2E_NO_INTERNAL_REACH).

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './reqs/e2e',
  testMatch: '**/*.e2e.spec.js',

  // A flow is a sequence: its steps share one panel and run in order, so the
  // parallelism that helps elsewhere would break the thing under test. Files
  // still run in parallel with each other.
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,

  // The panel talks to the demo provider, which sleeps up to two seconds per
  // call and is retried, so a step is slower than a jsdom case by design.
  timeout: 60000,
  expect: { timeout: 10000 },

  reporter: process.env.CI ? [['github'], ['html']] : [['list']],

  use: {
    // An MV3 extension only loads into a headed persistent context, which the
    // driver builds; nothing here can pick a browser for it.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10000,
  },
});
