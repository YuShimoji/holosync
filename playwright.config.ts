import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for HoloSync E2E Testing
 * Chromium only — speed-first policy per CLAUDE.md TEST POLICY
 *
 * HOLOSYNC_E2E_PORT 環境変数でポートを上書き可能 (既定 8080)。
 * 他プロジェクトの dev server と衝突した時の退避用。
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
