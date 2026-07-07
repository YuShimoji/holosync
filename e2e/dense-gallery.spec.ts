import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

declare global {
  interface Window {
    __holoSyncDenseLayoutPlan: any;
  }
}

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
  normal: `${SCREENSHOT_DIR}/sp-022-dense-gallery-normal-selected-3x4-1280x720.png`,
  hover: `${SCREENSHOT_DIR}/sp-022-dense-gallery-hover-controls-selected-3x4-1280x720.png`,
  chrome: `${SCREENSHOT_DIR}/sp-022-dense-gallery-chrome-selected-3x4-1280x720.png`,
};
const READBACK_JSON = `${SCREENSHOT_DIR}/sp-022-dense-layout-planner-1280x720.json`;
const READBACK_MD = `${SCREENSHOT_DIR}/sp-022-dense-layout-planner-1280x720.md`;

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

async function getDensePlan(page: Page) {
  await expect(page.locator('#grid')).toHaveAttribute('data-dense-planner-version', /sp-022/);
  return page.evaluate(() => window.__holoSyncDenseLayoutPlan);
}

function getCurrentHead() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function writePlannerReadback(plan: any) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const payload = {
    artifact: 'sp-022-dense-layout-planner-1280x720',
    implementationDate: '2026-07-07',
    commitHead: getCurrentHead(),
    plan,
  };
  fs.writeFileSync(READBACK_JSON, `${JSON.stringify(payload, null, 2)}\n`);

  const rows = plan.candidates
    .map(
      (candidate: any) =>
        `| ${candidate.columns}x${candidate.rows} | ${candidate.capacity} | ${candidate.emptySlots} | ${candidate.tileWidth} | ${candidate.tileHeight} | ${candidate.areaUtilizationRatio} | ${candidate.verticalSlackRatio} | ${candidate.horizontalSlackRatio} | ${candidate.score} | ${candidate.selected ? 'yes' : 'no'} |`
    )
    .join('\n');
  const selected = plan.selectedCandidate;
  const markdown = `# SP-022 Dense Layout Planner Readback

- implementation_date: 2026-07-07
- implementation_version: ${plan.version}
- commit_head: ${payload.commitHead}
- viewport: ${plan.input.viewportWidth}x${plan.input.viewportHeight}
- usable_stage: ${plan.input.usableWidth}x${plan.input.usableHeight}
- tile_count: ${plan.input.tileCount}
- aspect_ratio: ${plan.input.tileAspectRatio}
- gap: ${plan.input.gap}
- chrome_mode: ${plan.input.chromeMode}
- selected: ${selected.columns}x${selected.rows}
- selected_reason: ${selected.reason}
- scoring: ${plan.scoring.objective}
- tie_breaker: ${plan.scoring.tieBreaker}

| grid | capacity | empty_slots | tile_w | tile_h | area_util | v_slack | h_slack | score | selected |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${rows}
`;
  fs.writeFileSync(READBACK_MD, markdown);
}

test('SP-022 dense planner scores candidates and exposes objective readback', async ({ page }) => {
  await prepareDenseScenario(page, { sidebarCollapsed: true, toolbarVisible: false });
  const plan = await getDensePlan(page);
  const candidates = plan.candidates;
  const grids = new Set(
    candidates.map((candidate: any) => `${candidate.columns}x${candidate.rows}`)
  );

  expect(plan.input.tileCount).toBe(12);
  expect(plan.input.viewportWidth).toBe(1280);
  expect(plan.input.viewportHeight).toBe(720);
  expect(grids.has('3x4')).toBe(true);
  expect(grids.has('4x3')).toBe(true);
  expect(grids.has('5x3')).toBe(true);
  expect(grids.has('6x2')).toBe(true);
  expect(plan.scoring.weights.verticalSlack).toBeGreaterThan(plan.scoring.weights.horizontalSlack);

  const selected = plan.selectedCandidate;
  const maxScore = Math.max(...candidates.map((candidate: any) => candidate.score));
  expect(selected.columns).toBe(3);
  expect(selected.rows).toBe(4);
  expect(selected.score).toBe(maxScore);
  expect(selected.reason).toContain('highest objective score');

  const sixByTwo = candidates.find(
    (candidate: any) => candidate.columns === 6 && candidate.rows === 2
  );
  expect(sixByTwo.selected).toBe(false);
  expect(sixByTwo.verticalSlackRatio).toBeGreaterThan(selected.verticalSlackRatio);

  writePlannerReadback(plan);
  expect(fs.existsSync(READBACK_JSON)).toBe(true);
  expect(fs.existsSync(READBACK_MD)).toBe(true);
});

test('SP-022 dense gallery uses objective mosaic and captures review states', async ({ page }) => {
  await prepareDenseScenario(page, { sidebarCollapsed: true, toolbarVisible: false });
  await expect(page.locator('#grid')).toHaveAttribute('data-dense-cols', '3');
  await expect(page.locator('#grid')).toHaveAttribute('data-dense-rows', '4');

  const metrics = await getDenseMetrics(page);
  expect(metrics.columns).toBe(3);
  expect(metrics.rows).toBe(4);
  expect(metrics.verticalUtilization).toBeGreaterThan(0.9);
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
  await expect(page.locator('#grid')).toHaveAttribute('data-dense-cols', '3');
  await expect(page.locator('#grid')).toHaveAttribute('data-dense-rows', '4');
  await page.screenshot({ path: SCREENSHOTS.chrome, fullPage: false });
});
