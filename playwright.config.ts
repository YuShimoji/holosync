import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for HoloSync E2E testing.
 * Chromium only; keep E2E coverage focused on concrete regression risk.
 *
 * HOLOSYNC_E2E_PORT can override the default port when another local app uses 8080.
 */
const port = process.env.HOLOSYNC_E2E_PORT || '8080';
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `npx http-server . -p ${port} -c-1 -s`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
