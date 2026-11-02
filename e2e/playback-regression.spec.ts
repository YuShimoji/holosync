import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/(youtube|ytimg|googlevideo)\.com/, (route) => route.abort());
  await page.goto('/');
  await page.evaluate(async () => {
    const { videos, playerStates, suspendedPlayers } = await import('/scripts/state.js');
    videos.splice(0);
    playerStates.clear();
    suspendedPlayers.clear();
    document.querySelector('#grid').replaceChildren();
  });
});

test('recovery, live rejoin, and leader selection follow settings', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { videos, playerStates, suspendedPlayers, SYNC_SETTINGS } =
      await import('/scripts/state.js');
    const { createTile } = await import('/scripts/player.js');
    const { startSyncLoop, pickLeader } = await import('/scripts/sync.js');
    createTile('AAAAAAAAAAA', { syncGroupId: 'A' });
    createTile('BBBBBBBBBBB', { syncGroupId: 'A' });
    videos.forEach((v) => {
      v.iframeLoaded = true;
    });
    const commands = [];
    videos.forEach((v) => {
      v.iframe.contentWindow.postMessage = (message) => {
        const m = JSON.parse(message);
        commands.push([v.id, m.func || m.event]);
      };
    });
    const original = window.setInterval;
    let tick;
    window.setInterval = (fn) => {
      tick = fn;
      return 9999;
    };
    startSyncLoop();
    window.setInterval = original;
    const set = (a, b) => {
      playerStates.set(videos[0].iframe.contentWindow, a);
      playerStates.set(videos[1].iframe.contentWindow, b);
    };
    const rec = (state, time = 100, duration = 50000) => ({
      state,
      time,
      duration,
      lastUpdate: Date.now(),
    });
    const run = () => {
      commands.length = 0;
      tick();
      return commands.map((x) => [...x]);
    };
    set(rec(3), rec(3));
    SYNC_SETTINGS.fallbackMode = 'mute-continue';
    const buffering = run();
    SYNC_SETTINGS.fallbackMode = 'pause-catchup';
    const catchup = run();
    SYNC_SETTINGS.fallbackMode = 'none';
    const none = run();
    SYNC_SETTINGS.retryOnError = false;
    SYNC_SETTINGS.fallbackMode = 'mute-continue';
    const disabled = run();
    SYNC_SETTINGS.retryOnError = true;
    set(rec(2), rec(2));
    const paused = run();
    playerStates.clear();
    const missing = run();
    suspendedPlayers.clear();
    set(rec(1, 100), rec(3, 70));
    run();
    set(rec(1, 100), rec(1, 70));
    const live = run();
    suspendedPlayers.clear();
    videos[1].offsetMs = 2000;
    set(rec(1, 100), rec(3, 70));
    run();
    set(rec(1, 100), rec(1, 70));
    const offset = run();
    suspendedPlayers.clear();
    videos[1].offsetMs = 0;
    set(rec(1, 100, 1000), rec(3, 70, 1000));
    run();
    set(rec(1, 100, 1000), rec(1, 70, 1000));
    const vod = run();
    const entries = videos.map((v, i) => ({
      v,
      rec: { state: 1, time: 10, lastSeekAt: [20, 10][i] },
    }));
    SYNC_SETTINGS.leaderMode = 'least-buffered';
    const oldest = pickLeader(entries).v.id;
    delete entries[0].rec.lastSeekAt;
    const unseeked = pickLeader(entries).v.id;
    delete entries[1].rec.lastSeekAt;
    const tie = pickLeader(entries).v.id;
    SYNC_SETTINGS.leaderMode = 'manual';
    SYNC_SETTINGS.leaderId = 'missing';
    const fallback = pickLeader(entries).v.id;
    return {
      buffering,
      catchup,
      none,
      disabled,
      paused,
      missing,
      live,
      offset,
      vod,
      oldest,
      unseeked,
      tie,
      fallback,
    };
  });
  const funcs = (xs) => xs.map((x) => x[1]);
  expect(funcs(result.buffering).filter((x) => x === 'playVideo')).toHaveLength(2);
  expect(funcs(result.catchup).filter((x) => x === 'pauseVideo')).toHaveLength(2);
  expect(result.none).toEqual([]);
  expect(result.disabled).toEqual([]);
  expect(result.paused).toEqual([]);
  expect(funcs(result.missing)).toContain('listening');
  expect(funcs(result.live)).not.toContain('seekTo');
  expect(funcs(result.offset)).toContain('seekTo');
  expect(funcs(result.vod)).toContain('seekTo');
  expect([result.oldest, result.unseeked, result.tie, result.fallback]).toEqual([
    'BBBBBBBBBBB',
    'AAAAAAAAAAA',
    'AAAAAAAAAAA',
    'AAAAAAAAAAA',
  ]);
});

test('queue controls use the current tile and radius and chrome storage round trip', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { videos, state } = await import('/scripts/state.js');
    const { createTile, advanceQueue, persistVideos } = await import('/scripts/player.js');
    const { storageAdapter } = await import('/scripts/storage.js');
    createTile('AAAAAAAAAAA', { queue: ['AAAAAAAAAAA', 'BBBBBBBBBBB'], zoomRadius: 23 });
    const v = videos[0];
    v.iframeLoaded = true;
    v.tile.querySelector('.tile-audio-btn').click();
    advanceQueue(v);
    const master = state.audioFocusVideoId;
    v.tile.querySelector('.tile-focus-btn').click();
    const focused = v.tile.classList.contains('focus-target');
    v.tile.querySelector('.tile-focus-btn').click();
    v.tile.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const doubleFocused = v.tile.classList.contains('focus-target');
    v.tile.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    let opened = '';
    window.electronShell = {
      openExternal: (url) => {
        opened = url;
      },
    };
    v.tile.querySelector('.tile-info-action-btn').click();
    v.tile.querySelector('[title="ズームビュー"]').click();
    const zoom = v.zoomPanel?.querySelector('iframe')?.src;
    persistVideos();
    const saved = await storageAdapter.getItem('videos');
    const values = {};
    window.chrome = {
      runtime: {},
      storage: {
        local: {
          set: (obj, cb) => {
            Object.assign(values, obj);
            cb();
          },
          get: (keys, cb) => cb(values),
        },
      },
    };
    storageAdapter.currentStorage = 'chrome';
    await storageAdapter.setItem('test', [1, 2]);
    const roundtrip = await storageAdapter.getItem('test');
    const missing = await storageAdapter.getItem('absent');
    v.tile.querySelector('.tile-remove').click();
    return {
      master,
      focused,
      doubleFocused,
      opened,
      zoom,
      radius: saved[0].zoomRadius,
      roundtrip,
      missing,
      remaining: videos.length,
    };
  });
  expect(result.master).toBe('BBBBBBBBBBB');
  expect(result.focused).toBe(true);
  expect(result.doubleFocused).toBe(true);
  expect(result.opened).toContain('BBBBBBBBBBB');
  expect(result.zoom).toContain('BBBBBBBBBBB');
  expect(result.radius).toBe(23);
  expect(result.roundtrip).toEqual([1, 2]);
  expect(result.missing).toBeNull();
  expect(result.remaining).toBe(0);
});

test('radius survives restart and last-session restore while legacy shape remains readable', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const { storageAdapter } = await import('/scripts/storage.js');
    await storageAdapter.setItem('videos', [
      { id: 'AAAAAAAAAAA', zoomRadius: 23 },
      { id: 'BBBBBBBBBBB', zoomShape: 'rounded' },
    ]);
  });
  await page.reload();
  await expect(page.locator('.tile')).toHaveCount(2);
  const initial = await page.evaluate(async () => {
    const { videos } = await import('/scripts/state.js');
    videos[0].tile.querySelector('[title="ズームビュー"]').click();
    videos[1].tile.querySelector('[title="ズームビュー"]').click();
    return videos.map((v) => v.zoomPanel.style.borderRadius);
  });
  expect(initial).toEqual(['23%', '12%']);
  await page.evaluate(async () => {
    const { storageAdapter } = await import('/scripts/storage.js');
    await storageAdapter.setItem('lastSession', [{ id: 'CCCCCCCCCCC', zoomRadius: 31 }]);
    await storageAdapter.setItem('videos', []);
  });
  await page.reload();
  await page.locator('#restoreSessionBtn').click();
  const restored = await page.evaluate(async () => {
    const { videos } = await import('/scripts/state.js');
    videos[0].tile.querySelector('[title="ズームビュー"]').click();
    return videos[0].zoomPanel.style.borderRadius;
  });
  expect(restored).toBe('31%');
});
