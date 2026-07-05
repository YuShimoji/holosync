import { test, expect } from '@playwright/test';

const DENSE_IDS = [
  'DenseDemo01',
  'DenseDemo02',
  'DenseDemo03',
  'DenseDemo04',
  'DenseDemo05',
  'DenseDemo06',
  'DenseDemo07',
  'DenseDemo08',
  'DenseDemo09',
  'DenseDemo10',
  'DenseDemo11',
  'DenseDemo12',
];

test('captures SP-022 dense gallery review screenshot', async ({ page }) => {
  await page.route(/(youtube|ytimg|googlevideo)\.com/, (route) => route.abort());
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForSelector('#grid');

  await page.evaluate(async () => {
    const { videos, playerStates } = await import('/scripts/state.js');
    const { storageAdapter } = await import('/scripts/storage.js');
    videos.splice(0, videos.length);
    playerStates.clear();
    document.querySelector('#grid')?.replaceChildren();
    await storageAdapter.setItem('videos', []);
    await storageAdapter.setItem('lastSession', []);
    await storageAdapter.setItem('layoutSettings', { layout: 'auto', gap: 8 });
  });

  await page.evaluate(async (videoIds) => {
    const { createTile, persistVideos } = await import('/scripts/player.js');
    const { setLayout } = await import('/scripts/layout.js');
    const { storageAdapter } = await import('/scripts/storage.js');
    setLayout('dense');
    videoIds.forEach((id) => createTile(id));
    persistVideos();
    await storageAdapter.setItem('layoutSettings', { layout: 'dense', gap: 8 });
  }, DENSE_IDS);

  await expect(page.locator('#grid')).toHaveClass('grid layout-dense');
  await expect(page.locator('.tile')).toHaveCount(DENSE_IDS.length);
  await page.click('#sidebarToggle');
  await expect(page.locator('body')).toHaveClass(/sidebar-collapsed/);

  await page.addStyleTag({
    content: `
      .grid.layout-dense .tile-thumbnail {
        opacity: 1 !important;
        background-image: linear-gradient(135deg, #0f172a, #2563eb 52%, #14b8a6) !important;
      }
      .grid.layout-dense .tile:nth-child(3n + 2) .tile-thumbnail {
        background-image: linear-gradient(135deg, #111827, #7c3aed 52%, #f97316) !important;
      }
      .grid.layout-dense .tile:nth-child(3n) .tile-thumbnail {
        background-image: linear-gradient(135deg, #052e2b, #0ea5e9 52%, #facc15) !important;
      }
      .grid.layout-dense .tile iframe {
        visibility: hidden;
      }
      .grid.layout-dense .tile::before {
        content: attr(data-video-id);
        position: absolute;
        left: 10px;
        top: 10px;
        z-index: 5;
        color: white;
        font: 600 12px/1.2 system-ui, sans-serif;
        text-shadow: 0 1px 8px rgba(0, 0, 0, 0.55);
      }
    `,
  });
  await page.mouse.move(1270, 710);

  await page.screenshot({
    path: 'docs/verification/2026-07-06/sp-022-dense-gallery-1280x720.png',
    fullPage: false,
  });
});
