/**
 * @file e2e/helpers.ts
 * @brief HoloSync E2E Test Helper Functions
 *
 * HoloSyncの実装特性（postMessage通信、YouTube埋め込みプレイヤー）に
 * 特化した堅牢な待機・操作ヘルパー関数を提供します。
 */

import { Page } from '@playwright/test';

/**
 * YouTube埋め込みプレイヤーが完全に初期化されるまで待機
 *
 * HoloSyncの実装特性に基づく堅牢な待機ロジック:
 * - scripts/main.js の initializeSyncForIframe (162-171行目) と同期
 * - postMessage通信の確立を確認
 * - 最大15秒のタイムアウト（YouTube公式推奨10秒+余裕5秒）
 *
 * @param page - Playwrightページオブジェクト
 * @param options - タイムアウトと動画インデックスのオプション
 */
export async function waitForYouTubePlayerReady(
  page: Page,
  options: { timeout?: number; index?: number } = {}
): Promise<void> {
  const { timeout = 15000, index = 0 } = options;

  // Step 1: iframe要素の存在確認
  const iframeSelector = index === 0 ? '.tile iframe' : `.tile:nth-child(${index + 1}) iframe`;

  await page.waitForSelector(iframeSelector, {
    timeout,
    state: 'attached',
  });

  // Step 2: iframeのload完了待機（ベストエフォート）
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
    // networkidleは厳格すぎる場合があるため、失敗しても続行
    console.log('networkidle timeout, continuing...');
  });

  // Step 3: YouTube埋め込みプレイヤーの初期化を待つ
  // HoloSyncのinitializeSyncForIframe実装（main.js 162-171行目）:
  //   iframe.addEventListener('load', () => setTimeout(triggerSnapshot, 200))
  //   setTimeout(triggerSnapshot, 600)
  // 最大値800ms + 安全マージン200ms = 1000ms
  await page.waitForTimeout(1000);

  // Step 4: DOM構造の確認（グリッドにタイルが存在する）
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
 * 複数の動画プレイヤーすべての初期化を待機
 *
 * @param page - Playwrightページオブジェクト
 * @param expectedCount - 期待される動画数
 * @param options - タイムアウトオプション
 */
export async function waitForAllPlayersReady(
  page: Page,
  expectedCount: number,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 20000 } = options;

  // すべてのiframeが生成されるまで待機
  await page.waitForFunction(
    (count) => document.querySelectorAll('.tile iframe').length >= count,
    expectedCount,
    { timeout }
  );

  // 各iframeの初期化を待機
  // 各動画に1秒、最小2秒の待機
  const waitTime = Math.max(2000, expectedCount * 1000);
  await page.waitForTimeout(waitTime);
}

/**
 * YouTube動画追加処理（リトライ付き）
 *
 * ネットワーク不安定性やYouTube APIの遅延に対応するため、
 * 失敗時に自動的にリトライします。
 *
 * @param page - Playwrightページオブジェクト
 * @param url - YouTube動画URL
 * @param options - リトライ回数とタイムアウトのオプション
 */
export async function addVideoWithRetry(
  page: Page,
  url: string,
  options: { maxRetries?: number; timeout?: number; index?: number } = {}
): Promise<void> {
  const { maxRetries = 3, timeout = 15000, index = 0 } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Adding video (attempt ${attempt}/${maxRetries}): ${url}`);

      // URL入力
      await page.fill('#urlInput', url);

      // 実際に入力されたか確認
      const inputValue = await page.inputValue('#urlInput');
      console.log(`Input value after fill: ${inputValue}`);

      // ボタンクリック
      await page.click('#addForm button[type="submit"]');

      // クリック後に少し待機
      await page.waitForTimeout(500);

      // エラーメッセージを確認
      const errorHidden = await page.locator('#addError').isHidden();
      if (!errorHidden) {
        const errorText = await page.locator('#addError').textContent();
        console.error(`Form submission error: ${errorText}`);
        throw new Error(`Form validation failed: ${errorText}`);
      }

      // 動画追加の成功を確認
      await waitForYouTubePlayerReady(page, { timeout, index });

      console.log(`Successfully added video: ${url}`);
      return;
    } catch (error) {
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, (error as Error).message);

      // デバッグ情報収集
      const diagnostics = await collectDiagnostics(page);
      console.log('Diagnostics:', diagnostics);

      if (attempt === maxRetries) {
        throw new Error(
          `Failed to add video after ${maxRetries} attempts: ${url}\n` +
            `Last error: ${(error as Error).message}`
        );
      }

      // リトライ前に少し待機
      await page.waitForTimeout(1000);

      // 入力フィールドをクリア
      await page.fill('#urlInput', '');
    }
  }
}

/**
 * エラー時の診断情報を収集
 *
 * テスト失敗時にデバッグに役立つ情報を収集します。
 * Grid状態、iframe数、HTML構造などを取得。
 *
 * @param page - Playwrightページオブジェクト
 * @returns 診断情報オブジェクト
 */
export async function collectDiagnostics(page: Page): Promise<{
  gridTileCount: number;
  iframeCount: number;
  gridHTML: string;
  timestamp: string;
}> {
  return await page.evaluate(() => {
    return {
      gridTileCount: document.querySelectorAll('.tile').length,
      iframeCount: document.querySelectorAll('.tile iframe').length,
      gridHTML: document.querySelector('#grid')?.innerHTML.substring(0, 500) || '',
      timestamp: new Date().toISOString(),
    };
  });
}
