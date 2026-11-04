import { test, expect } from '@playwright/test';

const expected = [
  { id: 'BBBBBBBBBBB', queue: null, queueIndex: 0 },
  { id: 'BBBBBBBBBBB', queue: ['AAAAAAAAAAA', 'BBBBBBBBBBB', 'CCCCCCCCCCC'], queueIndex: 1 },
];

async function prepare(page) {
  await page.route(/(youtube|ytimg|googlevideo)\.com/, (route) => route.abort());
  await page.goto('/');
}
async function seed(page) {
  await page.evaluate(async (rows) => {
    const { storageAdapter } = await import('/scripts/storage.js');
    await storageAdapter.setItem('videos', rows);
  }, expected);
  await page.reload();
  await expect(page.locator('.tile')).toHaveCount(2);
}
async function read(page) {
  return page.evaluate(async () => {
    const { videos } = await import('/scripts/state.js');
    return videos.map((v) => ({ id: v.id, queue: v.queue, queueIndex: v.queueIndex }));
  });
}
async function checkActions(page) {
  await expect.poll(() => read(page)).toEqual(expected);
  const result = await page.evaluate(async () => {
    const { videos } = await import('/scripts/state.js');
    const queue = videos[1];
    queue.tile.querySelector('.tile-focus-btn').click();
    const focus = videos.map((v) => v.tile.classList.contains('focus-target'));
    queue.tile.querySelector('.tile-focus-btn').click();
    queue.tile.querySelector('.queue-prev-btn').click();
    const prev = queue.id;
    queue.tile.querySelector('.queue-next-btn').click();
    const next = queue.id;
    queue.tile.querySelector('.tile-remove').click();
    return { focus, prev, next, ids: videos.map((v) => v.id) };
  });
  expect(result).toEqual({
    focus: [false, true],
    prev: 'AAAAAAAAAAA',
    next: 'BBBBBBBBBBB',
    ids: ['BBBBBBBBBBB'],
  });
}

test('share URL and JSON export/import restore both duplicate tiles and queue position', async ({
  page,
  browser,
}) => {
  await prepare(page);
  await seed(page);
  await page.evaluate(async () => (await import('/scripts/ui.js')).setToolbarCollapsed(false));
  await page.locator('#shareBtn').click();
  const shareUrl = await page.locator('#shareUrlInput').inputValue();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportJsonBtn').click();
  const download = await downloadPromise;
  const data = await (await download.createReadStream()).toArray();
  const json = Buffer.concat(data).toString('utf8');
  expect(
    JSON.parse(json).videos.map((v) => ({ id: v.id, queue: v.queue, queueIndex: v.queueIndex }))
  ).toEqual(expected);
  const fresh = await browser.newContext();
  const fromUrl = await fresh.newPage();
  await fromUrl.route(/(youtube|ytimg|googlevideo)\.com/, (route) => route.abort());
  await fromUrl.goto(shareUrl);
  await checkActions(fromUrl);
  const jsonContext = await browser.newContext();
  const fromJson = await jsonContext.newPage();
  await prepare(fromJson);
  await fromJson.locator('#importJsonFile').setInputFiles({
    name: 'session.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await fromJson.waitForURL(/session=/);
  await checkActions(fromJson);
  await fresh.close();
  await jsonContext.close();
});

test('new and legacy presets load with tile cleanup and separate same-video entries', async ({
  page,
  browser,
}) => {
  await prepare(page);
  await seed(page);
  page.on('dialog', (dialog) => dialog.accept());
  await page.evaluate(async () => {
    (await import('/scripts/ui.js')).setSidebarCollapsed(false);
    document.querySelector('#accordionLibrary').open = true;
  });
  await page.locator('#presetNameInput').fill('Queue test');
  await page.locator('#savePresetBtn').click();
  await expect(page.locator('.preset-item').filter({ hasText: 'Queue test' })).toContainText('2本');
  const preset = await page.evaluate(
    async () => (await (await import('/scripts/storage.js')).storageAdapter.loadPresets())[0]
  );
  expect(preset.videoIds).toEqual(['BBBBBBBBBBB', 'BBBBBBBBBBB']);
  const fresh = await browser.newContext();
  const target = await fresh.newPage();
  await prepare(target);
  await target.evaluate(async (p) => {
    const { storageAdapter } = await import('/scripts/storage.js');
    await storageAdapter.setItem('presets', [
      p,
      { name: 'Legacy', videoIds: ['DDDDDDDDDDD', 'EEEEEEEEEEE'] },
    ]);
    const { loadPresets } = await import('/scripts/search.js');
    await loadPresets();
    const { createTile } = await import('/scripts/player.js');
    const { videos, playerStates, suspendedPlayers, speedAdjustedPlayers } =
      await import('/scripts/state.js');
    createTile('FFFFFFFFFFF');
    const old = videos[0];
    old.iframeLoaded = true;
    playerStates.set(old.iframe.contentWindow, { state: 1, time: 1, lastUpdate: Date.now() });
    suspendedPlayers.set(old.iframe.contentWindow, { reason: 'buffering', since: Date.now() });
    speedAdjustedPlayers.add(old.iframe.contentWindow);
    old.tile.querySelector('.tile-audio-btn').click();
    old.tile.querySelector('[title="ズームビュー"]').click();
    old.tile.querySelector('.tile-focus-btn').click();
    window.__oldPlayerWindow = old.iframe.contentWindow;
  }, preset);
  await target
    .locator('.preset-item')
    .filter({ hasText: 'Queue test' })
    .evaluate((el) => el.click());
  await expect.poll(() => read(target)).toEqual(expected);
  const cleanup = await target.evaluate(async () => {
    const { state, playerStates, suspendedPlayers, speedAdjustedPlayers } =
      await import('/scripts/state.js');
    return {
      audio: state.audioFocusTileId,
      focus: document.body.classList.contains('focus-mode'),
      zoom: !!document.querySelector('.zoom-loupe'),
      player: playerStates.has(window.__oldPlayerWindow),
      suspended: suspendedPlayers.has(window.__oldPlayerWindow),
      speed: speedAdjustedPlayers.has(window.__oldPlayerWindow),
    };
  });
  expect(cleanup).toEqual({
    audio: null,
    focus: false,
    zoom: false,
    player: false,
    suspended: false,
    speed: false,
  });
  await checkActions(target);
  await target
    .locator('.preset-item')
    .filter({ hasText: 'Legacy' })
    .evaluate((el) => el.click());
  await expect
    .poll(() => read(target))
    .toEqual([
      { id: 'DDDDDDDDDDD', queue: null, queueIndex: 0 },
      { id: 'EEEEEEEEEEE', queue: null, queueIndex: 0 },
    ]);
  await fresh.close();
});

test('legacy share URL and 50-item queue survive URL serialization', async ({ page, browser }) => {
  await prepare(page);
  const result = await page.evaluate(async () => {
    const { storageAdapter } = await import('/scripts/storage.js');
    const queue = Array.from({ length: 50 }, (_, i) => String(i).padStart(11, '0'));
    const state = {
      videos: [{ id: queue[49], queue, queueIndex: 49 }, { id: queue[49] }],
      layout: 'auto',
      volume: 50,
      speed: 1,
      gap: 8,
    };
    const url = storageAdapter.generateShareUrl(state);
    const oldPayload = { v: [{ i: 'ZZZZZZZZZZZ' }], s: {}, e: {} };
    const old = new URL(location.href);
    old.searchParams.set('session', btoa(encodeURIComponent(JSON.stringify(oldPayload))));
    return { url, length: url.length, queue, old: old.href };
  });
  const fresh = await browser.newContext();
  const target = await fresh.newPage();
  await target.route(/(youtube|ytimg|googlevideo)\.com/, (route) => route.abort());
  await target.goto(result.url);
  await expect
    .poll(() => read(target))
    .toEqual([
      { id: result.queue[49], queue: result.queue, queueIndex: 49 },
      { id: result.queue[49], queue: null, queueIndex: 0 },
    ]);
  await target.goto(result.old);
  await expect
    .poll(() => read(target))
    .toEqual([{ id: 'ZZZZZZZZZZZ', queue: null, queueIndex: 0 }]);
  await target.goto('/?videos=XXXXXXXXXXX,YYYYYYYYYYY');
  await expect
    .poll(() => read(target))
    .toEqual([
      { id: 'XXXXXXXXXXX', queue: null, queueIndex: 0 },
      { id: 'YYYYYYYYYYY', queue: null, queueIndex: 0 },
    ]);
  console.log(`50-item queue share URL length: ${result.length} characters`);
  await fresh.close();
});
