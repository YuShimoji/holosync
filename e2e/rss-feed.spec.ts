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
  await page.getByRole('button', { name: '取得' }).click();
  await expect(page.locator('#feedStatus')).toHaveText('1件の動画');
  await expect(page.locator('.feed-card strong')).toHaveText('配信 & 動画');
  await page.getByRole('button', { name: '配信 & 動画を追加' }).click();
  await expect(page.locator('.tile[data-video-id="abc12345678"]')).toHaveCount(1);
  for (const width of [1280, 700]) {
    await page.setViewportSize({ width, height: 720 });
    await expect
      .poll(async () => {
        const tile = await page.locator('.tile').first().boundingBox();
        const tray = await page.locator('#feedTray').boundingBox();
        return tile && tray ? tile.x + tile.width <= tray.x + 1 : false;
      })
      .toBe(true);
  }

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
  await page.getByRole('button', { name: '取得' }).click();
  await expect(page.locator('#feedStatus')).toContainText('形式を読み取れません');
  await page.evaluate(() => {
    delete (window as any).electronRss;
  });
  await page.getByRole('button', { name: '取得' }).click();
  await expect(page.locator('#feedStatus')).toContainText('デスクトップアプリ');
});
