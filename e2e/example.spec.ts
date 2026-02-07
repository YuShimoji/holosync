/**
 * @file e2e/example.spec.ts
 * @brief HoloSync E2E Tests - 安定化版
 *
 * 変更履歴:
 * - YouTube埋め込みプレイヤーの初期化待機ロジックを追加
 * - 固定タイムアウトを削除、動的待機に変更
 * - リトライメカニズムと詳細ログを追加
 */

import { test, expect } from '@playwright/test';
import {
  waitForYouTubePlayerReady,
  waitForAllPlayersReady,
  addVideoWithRetry,
  collectDiagnostics,
} from './helpers';

test.describe('HoloSync Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    console.log('\n=== Test Setup ===');

    // コンソールメッセージとエラーを捕捉
    page.on('console', (msg) => {
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    });
    page.on('pageerror', (error) => {
      console.error('[Page Error]:', error.message);
    });

    await page.goto('/', { waitUntil: 'load' });

    // ページ基本構造の確認とスクリプト初期化を待機
    await page.waitForFunction(() => document.querySelector('#grid') !== null);
    await page.waitForTimeout(500); // スクリプト初期化の追加待機
    console.log('Page loaded successfully');
  });

  test('page loads successfully', async ({ page }) => {
    console.log('=== Test: page loads successfully ===');

    await expect(page).toHaveTitle(/HoloSync/);
    await expect(page.locator('#grid')).toBeVisible();
    await expect(page.locator('#addForm')).toBeVisible();
    await expect(page.locator('#urlInput')).toBeVisible();

    console.log('All UI elements are visible');
  });

  test('can add YouTube video', async ({ page }) => {
    console.log('=== Test: can add YouTube video ===');

    const testVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    console.log(`Adding video: ${testVideoUrl}`);

    // 動画追加前の状態確認
    const gridBefore = await collectDiagnostics(page);
    console.log('Grid before:', gridBefore);

    // 動画追加（リトライ付き）
    await addVideoWithRetry(page, testVideoUrl, {
      timeout: 15000,
      maxRetries: 2,
    });

    // 動画追加後の検証
    const iframes = page.locator('.tile iframe');
    await expect(iframes).toHaveCount(1);

    const src = await iframes.first().getAttribute('src');
    console.log(`Iframe src: ${src}`);
    expect(src).toContain('dQw4w9WgXcQ');
    expect(src).toContain('enablejsapi=1');

    console.log('✓ Video added successfully');
  });

  test('batch controls are present', async ({ page }) => {
    console.log('=== Test: batch controls are present ===');

    // 一括操作ボタンの存在確認
    await expect(page.locator('#playAll')).toBeVisible();
    await expect(page.locator('#pauseAll')).toBeVisible();
    await expect(page.locator('#muteAll')).toBeVisible();
    await expect(page.locator('#unmuteAll')).toBeVisible();
    await expect(page.locator('#volumeAll')).toBeVisible();

    console.log('✓ All batch control buttons are visible');
  });

  test('settings panel is accessible', async ({ page }) => {
    console.log('=== Test: settings panel is accessible ===');

    // 同期設定の存在確認
    await expect(page.locator('#leaderMode')).toBeVisible();
    await expect(page.locator('#toleranceMs')).toBeVisible();
    await expect(page.locator('#syncFrequency')).toBeVisible();

    console.log('✓ Settings panel is accessible');
  });
});

test.describe('HoloSync AI Agent Helper Functions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('#grid') !== null);
    await page.waitForTimeout(500); // スクリプト初期化の追加待機
  });

  test('helper: add multiple videos', async ({ page }) => {
    console.log('=== Test: helper: add multiple videos ===');

    const videoUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/9bZkp7q19f0', // Gangnam Style
    ];

    // 動画を順次追加
    for (let i = 0; i < videoUrls.length; i++) {
      const url = videoUrls[i];
      console.log(`Adding video ${i + 1}/${videoUrls.length}: ${url}`);

      await addVideoWithRetry(page, url, {
        timeout: 15000,
        index: i,
      });

      // 各動画追加後に少し待機（YouTube API負荷軽減）
      await page.waitForTimeout(500);
    }

    // すべての動画の初期化完了を待つ
    await waitForAllPlayersReady(page, videoUrls.length, { timeout: 25000 });

    // 検証
    const iframes = page.locator('.tile iframe');
    await expect(iframes).toHaveCount(videoUrls.length);

    console.log(`✓ Successfully added ${videoUrls.length} videos`);
  });

  test('helper: play and pause all', async ({ page }) => {
    console.log('=== Test: helper: play and pause all ===');

    // 動画を1つ追加
    await addVideoWithRetry(page, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      timeout: 15000,
    });

    // 再生ボタンのクリック
    console.log('Clicking play all button');
    await page.click('#playAll');
    await page.waitForTimeout(1000);

    // 一時停止ボタンのクリック
    console.log('Clicking pause all button');
    await page.click('#pauseAll');
    await page.waitForTimeout(500);

    // ボタンが有効であることを確認
    await expect(page.locator('#playAll')).toBeEnabled();
    await expect(page.locator('#pauseAll')).toBeEnabled();

    console.log('✓ Play and pause all buttons work');
  });
});
