import { expect, test, type Page } from '@playwright/test';

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

const SCREENSHOT_DIR = 'docs/verification/2026-07-06';
const SCREENSHOTS = {
  normal: `${SCREENSHOT_DIR}/sp-022-dense-gallery-normal-1280x720.png`,
  hover: `${SCREENSHOT_DIR}/sp-022-dense-gallery-hover-controls-1280x720.png`,
  chrome: `${SCREENSHOT_DIR}/sp-022-dense-gallery-chrome-1280x720.png`,
};

const MOCK_TILE_STYLE = `
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
`;

async function resetApp(page: Page) {
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
    await storageAdapter.setItem('sidebarCollapsed', false);
    await storageAdapter.setItem('toolbarCollapsed', true);
  });
}

async function loadDenseTiles(page: Page) {
  await page.evaluate(async (videoIds) => {
    const { createTile, persistVideos } = await import('/scripts/player.js');
    const { setLayout } = await import('/scripts/layout.js');
    const { storageAdapter } = await import('/scripts/storage.js');
    setLayout('dense');
    videoIds.forEach((id) => createTile(id));
    persistVideos();
    await storageAdapter.setItem('layoutSettings', { layout: 'dense', gap: 8 });
    await storageAdapter.setItem(
      'videos',
      videoIds.map((id) => ({ id, syncGroupId: null, offsetMs: 0 }))
    );
  }, DENSE_IDS);

  await expect(page.locator('#grid')).toHaveClass(/layout-dense/);
  await expect(page.locator('.tile')).toHaveCount(DENSE_IDS.length);
  await page.addStyleTag({ content: MOCK_TILE_STYLE });
}

async function setChrome(
  page: Page,
  options: { sidebarCollapsed: boolean; toolbarVisible: boolean }
) {
  const applyChromeState = async () => {
    await page.evaluate(async ({ sidebarCollapsed, toolbarVisible }) => {
      const { setSidebarCollapsed, setToolbarCollapsed } = await import('/scripts/ui.js');
      setSidebarCollapsed(sidebarCollapsed);
      setToolbarCollapsed(!toolbarVisible);
    }, options);
  };

  await applyChromeState();
  await page.waitForTimeout(150);
  await applyChromeState();
  await page.waitForTimeout(350);
}

async function prepareDenseScenario(
  page: Page,
  options: { sidebarCollapsed: boolean; toolbarVisible: boolean }
) {
  await resetApp(page);
  await loadDenseTiles(page);
  await setChrome(page, options);
}

async function getDenseMetrics(page: Page) {
  return page.locator('#grid').evaluate((grid) => {
    const gridRect = grid.getBoundingClientRect();
    const tiles = Array.from(grid.querySelectorAll('.tile')).map((tile) =>
      tile.getBoundingClientRect()
    );
    const lefts = new Set(tiles.map((tile) => Math.round(tile.left)));
    const tops = new Set(tiles.map((tile) => Math.round(tile.top)));
    const minTop = Math.min(...tiles.map((tile) => tile.top));
    const maxBottom = Math.max(...tiles.map((tile) => tile.bottom));

    return {
      columns: lefts.size,
      rows: tops.size,
      gridWidth: Math.round(gridRect.width),
      gridHeight: Math.round(gridRect.height),
      tileWidth: Math.round(tiles[0]?.width || 0),
      tileHeight: Math.round(tiles[0]?.height || 0),
      topWhitespace: Math.round(minTop - gridRect.top),
      bottomWhitespace: Math.round(gridRect.bottom - maxBottom),
      verticalUtilization: (maxBottom - minTop) / gridRect.height,
    };
  });
}

test('SP-022 dense gallery uses height-aware mosaic and captures review states', async ({
  page,
}) => {
  await prepareDenseScenario(page, { sidebarCollapsed: true, toolbarVisible: false });
  await expect(page.locator('#grid')).toHaveAttribute('data-dense-cols', '4');
  await expect(page.locator('#grid')).toHaveAttribute('data-dense-rows', '3');

  const metrics = await getDenseMetrics(page);
  expect(metrics.columns).toBe(4);
  expect(metrics.rows).toBe(3);
  expect(metrics.verticalUtilization).toBeGreaterThan(0.68);
  expect(Math.abs(metrics.topWhitespace - metrics.bottomWhitespace)).toBeLessThanOrEqual(40);

  await page.screenshot({ path: SCREENSHOTS.normal, fullPage: false });

  const hoverTile = page.locator('.tile').nth(4);
  await hoverTile.hover({ position: { x: 80, y: 60 } });
  await expect
    .poll(async () =>
      hoverTile.locator('.tile-actions').evaluate((el) => getComputedStyle(el).opacity)
    )
    .toBe('1');
  await expect
    .poll(async () =>
      hoverTile.locator('.tile-control-bar').evaluate((el) => getComputedStyle(el).opacity)
    )
    .toBe('1');
  await page.screenshot({ path: SCREENSHOTS.hover, fullPage: false });

  await prepareDenseScenario(page, { sidebarCollapsed: false, toolbarVisible: true });
  await expect(page.locator('body')).not.toHaveClass(/sidebar-collapsed/);
  await expect(page.locator('body')).not.toHaveClass(/toolbar-collapsed/);
  await expect(page.locator('#contentToolbar')).toBeVisible();
  await expect(page.locator('#grid')).toHaveClass(/dense-mosaic-ready/);
  await page.screenshot({ path: SCREENSHOTS.chrome, fullPage: false });
});
