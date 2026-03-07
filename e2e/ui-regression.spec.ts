/**
 * @file e2e/ui-regression.spec.ts
 * @brief HoloSync UI回帰テスト
 *
 * YouTube API不要のUI状態変化テストを中心に、
 * レイアウト・サイドバー・没入表示・ツールバー・ダークモード・
 * ヘルプモーダル・URL検証・追加モード切替・視聴履歴UIを検証する。
 */

import { test, expect } from '@playwright/test';

test.describe('UI Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('#grid') !== null);
    await page.waitForTimeout(500);
  });

  // ── 1. レイアウト切替 ────────────────────────────────────

  test('layout select changes grid class', async ({ page }) => {
    const grid = page.locator('#grid');

    // ツールバーはデフォルト非表示のため、サイドバー経由で表示する
    await page.click('#sidebarToolbarToggle');
    await expect(page.locator('body')).not.toHaveClass(/toolbar-collapsed/);

    // 初期状態: auto（layout-* クラスなし）
    await expect(grid).toHaveClass('grid');

    // 2列に切替
    await page.selectOption('#layoutSelect', '2');
    await expect(grid).toHaveClass('grid layout-2');

    // シアターに切替
    await page.selectOption('#layoutSelect', 'theater');
    await expect(grid).toHaveClass('grid layout-theater');

    // 自動に戻す
    await page.selectOption('#layoutSelect', 'auto');
    await expect(grid).toHaveClass('grid');
  });

  // ── 2. サイドバー折りたたみ ──────────────────────────────

  test('sidebar toggle collapses and expands', async ({ page }) => {
    const body = page.locator('body');

    // ツールバーを先に表示（#sidebarOpen はツールバー内にあるため）
    await page.click('#sidebarToolbarToggle');
    await expect(body).not.toHaveClass(/toolbar-collapsed/);

    // 初期状態: サイドバー展開中
    await expect(body).not.toHaveClass(/sidebar-collapsed/);

    // 折りたたみ
    await page.click('#sidebarToggle');
    await expect(body).toHaveClass(/sidebar-collapsed/);

    // ツールバー内の再展開ボタンが表示される
    await expect(page.locator('#sidebarOpen')).toBeVisible();

    // 再展開
    await page.click('#sidebarOpen');
    await expect(body).not.toHaveClass(/sidebar-collapsed/);
  });

  // ── 3. 没入表示モード ────────────────────────────────────

  test('immersive mode toggles body class and button text', async ({ page }) => {
    const body = page.locator('body');
    const btn = page.locator('#immersiveToggleBtn');

    // ツールバーを先に表示
    await page.click('#sidebarToolbarToggle');
    await expect(body).not.toHaveClass(/toolbar-collapsed/);

    // headless環境ではrequestFullscreenの失敗→fullscreenchangeで
    // immersive-modeが即解除されるため、fullscreen APIをスタブ化
    await page.evaluate(() => {
      document.documentElement.requestFullscreen = async () => {};
    });

    // 初期状態
    await expect(body).not.toHaveClass(/immersive-mode/);
    await expect(btn).toHaveText('Immersive');

    // 没入モードON
    await page.click('#immersiveToggleBtn');
    await expect(body).toHaveClass(/immersive-mode/);
    await expect(btn).toHaveText('Immersive On');

    // サイドバーとツールバーも自動的に非表示になる
    await expect(body).toHaveClass(/sidebar-collapsed/);
    await expect(body).toHaveClass(/toolbar-collapsed/);

    // 没入モードOFF（ツールバーがCSS非表示のためJS経由でクリック）
    await page.evaluate(() => {
      document.getElementById('immersiveToggleBtn')!.click();
    });
    await expect(body).not.toHaveClass(/immersive-mode/);
    await expect(btn).toHaveText('Immersive');
  });

  // ── 4. ツールバー表示切替 ────────────────────────────────

  test('toolbar toggle collapses and expands', async ({ page }) => {
    const body = page.locator('body');
    const sidebarToggleBtn = page.locator('#sidebarToolbarToggle');

    // 初期状態: ツールバーはデフォルトで非表示（toolbarCollapsed=null→true）
    await expect(body).toHaveClass(/toolbar-collapsed/);
    await expect(sidebarToggleBtn).toHaveText('Show Toolbar');

    // サイドバー内のトグルボタンで表示
    await page.click('#sidebarToolbarToggle');
    await expect(body).not.toHaveClass(/toolbar-collapsed/);
    await expect(sidebarToggleBtn).toHaveText('Hide Toolbar');

    // ツールバー内のボタンで再非表示
    await page.click('#toolbarToggleBtn');
    await expect(body).toHaveClass(/toolbar-collapsed/);
    await expect(sidebarToggleBtn).toHaveText('Show Toolbar');
  });

  // ── 5. ダークモードトグル ────────────────────────────────

  test('dark mode toggle switches data-theme attribute', async ({ page }) => {
    const html = page.locator('html');

    // 初期状態: ライトモード（data-theme属性なし）
    await expect(html).not.toHaveAttribute('data-theme', 'dark');

    // ダークモードON
    await page.click('#darkModeToggle');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // ダークモードOFF
    await page.click('#darkModeToggle');
    await expect(html).not.toHaveAttribute('data-theme', 'dark');
  });

  // ── 6. ヘルプモーダル開閉 ────────────────────────────────

  test('help modal opens and closes', async ({ page }) => {
    const modal = page.locator('#helpModal');

    // 初期状態: 非表示
    await expect(modal).not.toHaveClass(/active/);

    // 開く
    await page.click('#showHelpBtn');
    await expect(modal).toHaveClass(/active/);

    // 閉じる（×ボタン）
    await page.click('#closeHelpBtn');
    await expect(modal).not.toHaveClass(/active/);

    // 再度開いてオーバーレイクリックで閉じる
    await page.click('#showHelpBtn');
    await expect(modal).toHaveClass(/active/);
    await modal.click({ position: { x: 5, y: 5 } });
    await expect(modal).not.toHaveClass(/active/);
  });

  // ── 7. URL検証エラー ─────────────────────────────────────

  test('invalid URL shows error message', async ({ page }) => {
    const errorDiv = page.locator('#addError');

    // 初期状態: エラー非表示
    await expect(errorDiv).toBeHidden();

    // 無効URL入力
    await page.fill('#urlInput', 'https://example.com/not-a-youtube-url');
    await page.click('#addForm button[type="submit"]');

    // エラーメッセージ表示
    await expect(errorDiv).toBeVisible();
    await expect(errorDiv).not.toBeEmpty();
  });

  // ── 8. 単体/一括モード切替 ───────────────────────────────

  test('single and bulk add mode toggle', async ({ page }) => {
    const singleMode = page.locator('#singleAddMode');
    const bulkMode = page.locator('#bulkAddMode');
    const singleBtn = page.locator('#singleModeBtn');
    const bulkBtn = page.locator('#bulkModeBtn');

    // 初期状態: 単体モード
    await expect(singleMode).toBeVisible();
    await expect(bulkMode).toBeHidden();
    await expect(singleBtn).toHaveClass(/active/);

    // 一括モードに切替
    await page.click('#bulkModeBtn');
    await expect(singleMode).toBeHidden();
    await expect(bulkMode).toBeVisible();
    await expect(bulkBtn).toHaveClass(/active/);
    await expect(singleBtn).not.toHaveClass(/active/);

    // 単体モードに戻す
    await page.click('#singleModeBtn');
    await expect(singleMode).toBeVisible();
    await expect(bulkMode).toBeHidden();
  });

  // ── 9. 視聴履歴UIセクション表示 ──────────────────────────

  test('watch history section exists', async ({ page }) => {
    const historyList = page.locator('#watchHistoryList');
    await expect(historyList).toBeAttached();
  });
});
