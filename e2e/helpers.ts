/**
 * @file e2e/helpers.ts
 * @brief HoloSync E2E Test Helper Functions
 */

import { Page } from '@playwright/test';

/**
 * YouTube iframe の初期化待機
 */
async function waitForYouTubePlayerReady(
  page: Page,
  options: { timeout?: number; index?: number } = {}
): Promise<void> {
  const { timeout = 15000, index = 0 } = options;

  const iframeSelector = index === 0 ? '.tile iframe' : `.tile:nth-child(${index + 1}) iframe`;

  await page.waitForSelector(iframeSelector, {
    timeout,
    state: 'attached',
  });

  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

  await page.waitForTimeout(1000);

  await page.waitForFunction(
    (idx) => {
      const tiles = document.querySelectorAll('.tile');
      return tiles.length > idx;
    },
    index,
    { timeout: timeout - 2000 }
  );
}

/**
 * 複数プレイヤーの初期化待機
 */
export async function waitForAllPlayersReady(
  page: Page,
  expectedCount: number,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 20000 } = options;

  await page.waitForFunction(
    (count) => document.querySelectorAll('.tile iframe').length >= count,
    expectedCount,
    { timeout }
  );

  const waitTime = Math.max(2000, expectedCount * 1000);
  await page.waitForTimeout(waitTime);
}

/**
 * YouTube 動画追加（リトライ付き）
 */
export async function addVideoWithRetry(
  page: Page,
  url: string,
  options: { maxRetries?: number; timeout?: number; index?: number } = {}
): Promise<void> {
  const { maxRetries = 3, timeout = 15000, index = 0 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.fill('#urlAddInput', url);
      await page.waitForTimeout(1500);

      const addBar = page.locator('#urlAddBar');
      const isBarVisible = await addBar.isVisible();
      if (isBarVisible) {
        await page.click('#urlAddSubmit');
      }

      await page.waitForTimeout(500);
      await waitForYouTubePlayerReady(page, { timeout, index });
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(
          `Failed to add video after ${maxRetries} attempts: ${url}\n` +
            `Last error: ${(error as Error).message}`
        );
      }
      await page.waitForTimeout(1000);
      await page.fill('#urlAddInput', '');
    }
  }
}
