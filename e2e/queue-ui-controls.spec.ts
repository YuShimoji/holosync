import { test, expect } from '@playwright/test';

test('queue previous and next buttons remain clickable alongside tile chrome', async ({ page }) => {
  await page.route(/(youtube|ytimg|googlevideo)\.com/, (route) => route.abort());
  await page.goto('/');
  await page.evaluate(async () => {
    const { storageAdapter } = await import('/scripts/storage.js');
    await storageAdapter.setItem('videos', [
      { id: 'AAAAAAAAAAA' },
      { id: 'BBBBBBBBBBB' },
      { id: 'CCCCCCCCCCC' },
      { id: 'BBBBBBBBBBB', queue: ['AAAAAAAAAAA', 'BBBBBBBBBBB'], queueIndex: 1 },
    ]);
  });
  await page.reload();
  await expect(page.locator('.tile')).toHaveCount(4);
  const tile = page.locator('.tile').filter({ has: page.locator('.queue-prev-btn') });
  await tile.hover();
  await tile.locator('.queue-prev-btn').click({ timeout: 4000 });
  await expect(tile).toHaveAttribute('data-video-id', 'AAAAAAAAAAA');
  await tile.locator('.queue-next-btn').click({ timeout: 4000 });
  await expect(tile).toHaveAttribute('data-video-id', 'BBBBBBBBBBB');
  await tile.locator('.tile-info-header').click({ timeout: 4000 });
  await expect(tile.locator('.tile-info')).toHaveClass(/open/);
});

test('queue controls do not cover tile actions in a 12-tile dense layout', async ({
  page,
}, testInfo) => {
  await page.route(/(youtube|ytimg|googlevideo)\.com/, (route) => route.abort());
  await page.goto('/');
  await page.evaluate(async () => {
    const { storageAdapter } = await import('/scripts/storage.js');
    const entries = Array.from({ length: 11 }, (_, i) => ({ id: String(i).padStart(11, '0') }));
    entries.push({ id: 'BBBBBBBBBBB', queue: ['AAAAAAAAAAA', 'BBBBBBBBBBB'], queueIndex: 1 });
    await storageAdapter.setItem('videos', entries);
    await storageAdapter.setItem('layoutSettings', { layout: 'dense', gap: 8 });
  });
  await page.reload();
  await expect(page.locator('.tile')).toHaveCount(12);
  const tile = page.locator('.tile').filter({ has: page.locator('.queue-prev-btn') });
  await tile.hover();
  await page.screenshot({ path: testInfo.outputPath('dense-queue-hover.png') });
  await tile.locator('.queue-prev-btn').click({ timeout: 4000 });
  await expect(tile).toHaveAttribute('data-video-id', 'AAAAAAAAAAA');
  await tile.locator('.queue-next-btn').click({ timeout: 4000 });
  await tile.locator('.tile-focus-btn').click({ timeout: 4000 });
  await expect(tile).toHaveClass(/focus-target/);
  await page.keyboard.press('Escape');
  await tile.hover();
  await tile.locator('.tile-info-header').click({ timeout: 4000 });
  await expect(tile.locator('.tile-info')).toHaveClass(/open/);
});
