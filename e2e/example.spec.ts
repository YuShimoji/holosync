/**
 * @file e2e/example.spec.ts
 * @brief HoloSync E2E Tests
 */

import { test, expect } from '@playwright/test';
import {
  waitForAllPlayersReady,
  addVideoWithRetry,
} from './helpers';

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

  test('batch controls are present', async ({ page }) => {
    await expect(page.locator('#playPauseToggle')).toBeVisible();
    await expect(page.locator('#muteToggle')).toBeVisible();
    await expect(page.locator('#masterSeekBar')).toBeVisible();

    await expect(page.locator('#volumeAll')).toBeAttached();
    await expect(page.locator('#speedAll')).toBeAttached();
  });

  test('settings panel is accessible', async ({ page }) => {
    const accordion = page.locator('#accordionSettings');
    await accordion.evaluate((el: HTMLDetailsElement) => (el.open = true));

    await expect(page.locator('#leaderMode')).toBeVisible();
    await expect(page.locator('#toleranceMs')).toBeVisible();
    await expect(page.locator('#syncFrequency')).toBeVisible();
  });
});

test.describe('HoloSync AI Agent Helper Functions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('#grid') !== null);
    await page.waitForTimeout(500);
  });

  test('helper: add multiple videos', async ({ page }) => {
    const videoUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/9bZkp7q19f0',
    ];

    for (let i = 0; i < videoUrls.length; i++) {
      await addVideoWithRetry(page, videoUrls[i], {
        timeout: 15000,
        index: i,
      });
      await page.waitForTimeout(500);
    }

    await waitForAllPlayersReady(page, videoUrls.length, { timeout: 25000 });

    const iframes = page.locator('.tile iframe');
    await expect(iframes).toHaveCount(videoUrls.length);
  });

  test('helper: play and pause all', async ({ page }) => {
    await addVideoWithRetry(page, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      timeout: 15000,
    });

    await page.click('#playPauseToggle');
    await page.waitForTimeout(1000);

    await page.click('#playPauseToggle');
    await page.waitForTimeout(500);

    await expect(page.locator('#playPauseToggle')).toBeEnabled();
  });
});
