/**
 * @file e2e/example.spec.ts
 * @brief HoloSync Basic Functionality
 *
 * 目的: 起動導線と動画追加パイプラインが壊れていないことだけを確認する。
 * 存在確認・低価値 smoke test は ui-regression.spec.ts に集約済みのため保持しない。
 */

import { test, expect } from '@playwright/test';
import { addVideoWithRetry } from './helpers';

test.describe('HoloSync Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (error) => {
      console.error('[Page Error]:', error.message);
    });

    await page.goto('/', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('#grid') !== null);
    await page.waitForTimeout(500);
  });

  test('page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/HoloSync/);
    await expect(page.locator('#grid')).toBeVisible();
    await expect(page.locator('#urlAddInput')).toBeVisible();
  });

  test('can add YouTube video', async ({ page }) => {
    const testVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    await addVideoWithRetry(page, testVideoUrl, {
      timeout: 15000,
      maxRetries: 2,
    });

    const iframes = page.locator('.tile iframe');
    await expect(iframes).toHaveCount(1);

    const src = await iframes.first().getAttribute('src');
    expect(src).toContain('dQw4w9WgXcQ');
    expect(src).toContain('enablejsapi=1');
  });
});
