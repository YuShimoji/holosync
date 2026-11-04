import { test, expect } from '@playwright/test';

const feed = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/"><entry><yt:videoId>abc12345678</yt:videoId><yt:channelId>UC1234567890123456789012</yt:channelId><title>配信 &amp; 動画</title><published>2026-11-01T00:00:00Z</published><author><name>チャンネル</name></author><media:group><media:description>詳細</media:description></media:group></entry></feed>`;

test('feed shows results, adds a tile and restores focus on close', async ({ page }) => {
  await page.addInitScript((xml) => {
    (window as any).electronRss = { fetch: async () => ({ ok: true, xml }) };
  }, feed);
  await page.goto('/');
  await page.getByRole('button', { name: 'フィード', exact: true }).click();
  await expect(page.locator('#feedInput')).toBeFocused();
  await page.locator('#feedInput').fill('UC1234567890123456789012');
  await page.getByRole('button', { name: '登録して更新' }).click();
  await expect(page.locator('#feedStatus')).toHaveText('1件の動画');
  await expect(page.locator('.feed-card strong')).toHaveText('配信 & 動画');
  await page.getByRole('button', { name: '配信 & 動画を追加' }).click();
  await expect(page.locator('.tile[data-video-id="abc12345678"]')).toHaveCount(1);
  await page.locator('#feedColumns').selectOption('3');
  await expect(page.locator('#feedResults')).toHaveCSS('grid-template-columns', /px.*px.*px/);
  await expect(page.getByRole('button', { name: '配信 & 動画を追加' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('#feedTray')).toBeHidden();
  await expect(page.locator('#feedOpen')).toBeFocused();
});

test('feed reports malformed XML and unavailable desktop API', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).electronRss = { fetch: async () => ({ ok: true, xml: '<broken' }) };
  });
  await page.goto('/');
  await page.locator('#feedOpen').click();
  await page.locator('#feedInput').fill('UC1234567890123456789012');
  await page.getByRole('button', { name: '登録して更新' }).click();
  await expect(page.locator('#feedStatus')).toContainText('形式を読み取れません');
  await page.evaluate(() => {
    delete (window as any).electronRss;
  });
  await page.getByRole('button', { name: '登録して更新' }).click();
  await expect(page.locator('#feedStatus')).toContainText('デスクトップアプリ');
});

test('profiles save and isolate sources and exclusion rules', async ({ page }) => {
  await page.addInitScript((xml) => {
    (window as any).electronRss = { fetch: async () => ({ ok: true, xml }) };
  }, feed);
  await page.goto('/');
  await page.locator('#feedOpen').click();
  await expect(page.locator('#feedProfile option')).toHaveCount(1);
  await page.locator('#feedInput').fill('UC1234567890123456789012');
  await page.getByRole('button', { name: '登録して更新' }).click();
  await expect(page.locator('.feed-card')).toHaveCount(1);
  await page.locator('#feedNewProfile').click();
  await page.locator('#profileName').fill('除外プロファイル');
  await page.locator('#profileSources').fill('UC1234567890123456789012');
  await page.locator('#profileExclude').fill('動画');
  await page.locator('#feedSettings button[type=submit]').click();
  await expect(page.locator('#feedStatus')).toContainText('動画が見つかりません');
  await expect(page.locator('.feed-card')).toHaveCount(0);
  await page.locator('#feedProfile').selectOption({ label: 'マイフィード' });
  await expect(page.locator('.feed-card')).toHaveCount(1);
  await page.reload();
  await page.locator('#feedOpen').click();
  await expect(page.locator('#feedProfile option')).toHaveCount(2);
  await expect(page.locator('.feed-card')).toHaveCount(1);
  await page.locator('#feedProfile').selectOption({ label: '除外プロファイル' });
  await expect(page.locator('.feed-card')).toHaveCount(0);
});

test('playback history stays with the profile that added the video', async ({ page }) => {
  await page.addInitScript((xml) => {
    (window as any).electronRss = { fetch: async () => ({ ok: true, xml }) };
  }, feed);
  await page.goto('/');
  await page.locator('#feedOpen').click();
  await expect(page.locator('#feedProfile option')).toHaveCount(1);
  await page.locator('#feedInput').fill('UC1234567890123456789012');
  await page.getByRole('button', { name: '登録して更新' }).click();
  await page.getByRole('button', { name: '配信 & 動画を追加' }).click();
  await page.locator('#feedNewProfile').click();
  await page.evaluate(() => {
    const dateNow = Date.now;
    let now = dateNow();
    Date.now = () => now;
    const emit = () =>
      document.dispatchEvent(
        new CustomEvent('holosync:playback', {
          detail: { videoId: 'abc12345678', tileId: 'tile-test', state: 1 },
        })
      );
    emit();
    now += 11000;
    emit();
    Date.now = dateNow;
  });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { storageAdapter } = await import('/scripts/storage.js');
        const data = await storageAdapter.getItem('feedProfiles');
        return data.profiles.map((p: any) => p.history['UC1234567890123456789012'] || 0);
      })
    )
    .toEqual([1, 0]);
});

test('switching profiles during a fetch cannot overwrite the new profile', async ({ page }) => {
  await page.addInitScript((xml) => {
    (window as any).finishFeed = null;
    (window as any).electronRss = {
      fetch: () =>
        new Promise((resolve) => {
          (window as any).finishFeed = () => resolve({ ok: true, xml });
        }),
    };
  }, feed);
  await page.goto('/');
  await page.locator('#feedOpen').click();
  await expect(page.locator('#feedProfile option')).toHaveCount(1);
  await page.locator('#feedInput').fill('UC1234567890123456789012');
  await page.getByRole('button', { name: '登録して更新' }).click();
  await expect.poll(() => page.evaluate(() => typeof (window as any).finishFeed)).toBe('function');
  await page.locator('#feedNewProfile').click();
  await page.evaluate(() => (window as any).finishFeed());
  await expect(page.locator('#feedStatus')).toContainText('チャンネルや再生リスト');
  await expect(page.getByRole('button', { name: '登録して更新' })).toBeEnabled();
  await expect(page.locator('.feed-card')).toHaveCount(0);
});
