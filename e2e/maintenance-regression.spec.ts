import { test, expect } from '@playwright/test';

const IDS = ['AAAAAAAAAAA', 'BBBBBBBBBBB', 'CCCCCCCCCCC'];

async function prepareEmptyApp(page) {
  await page.route(/(youtube|ytimg|googlevideo)\.com/, (route) => route.abort());
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForSelector('#grid');
  await page.evaluate(async () => {
    localStorage.clear();
    const { videos, playerStates } = await import('/scripts/state.js');
    const { storageAdapter } = await import('/scripts/storage.js');
    videos.splice(0, videos.length);
    playerStates.clear();
    document.querySelector('#grid')?.replaceChildren();
    await storageAdapter.setItem('videos', []);
    await storageAdapter.setItem('lastSession', []);
    await storageAdapter.setItem('layoutSettings', { layout: 'auto', gap: 8 });
  });
}

async function seedTiles(page, ids = IDS) {
  await page.evaluate(async (videoIds) => {
    const { createTile, persistVideos } = await import('/scripts/player.js');
    videoIds.forEach((id) => createTile(id));
    persistVideos();
  }, ids);
  await expect(page.locator('.tile')).toHaveCount(ids.length);
}

async function tileOrder(page) {
  return page
    .locator('.tile')
    .evaluateAll((tiles) => tiles.map((tile) => (tile as HTMLElement).dataset.videoId));
}

async function dragHandleTo(page, videoId, targetX, targetY) {
  const handle = page.locator(`.tile[data-video-id="${videoId}"] .tile-drag-handle`);
  const handleBox = await handle.boundingBox();
  if (!handleBox) {
    throw new Error(`No drag handle box for ${videoId}`);
  }
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 8 });
  await page.mouse.up();
}

test.describe('maintenance regressions', () => {
  test('tile play/pause sends command only to the clicked iframe', async ({ page }) => {
    await prepareEmptyApp(page);

    const result = await page.evaluate(async () => {
      const { videos, playerStates } = await import('/scripts/state.js');
      const { createTileControlBar, updateTileControlBar } =
        await import('/scripts/tile-controls.js');
      const messagesA = [];
      const messagesB = [];
      const winA = {
        postMessage: (message, origin) => messagesA.push({ message, origin }),
      };
      const winB = {
        postMessage: (message, origin) => messagesB.push({ message, origin }),
      };
      const iframeA = {
        src: 'https://www.youtube.com/embed/AAAAAAAAAAA?enablejsapi=1',
        contentWindow: winA,
        getAttribute(name) {
          return name === 'src' ? this.src : null;
        },
      };
      const iframeB = {
        src: 'https://www.youtube.com/embed/BBBBBBBBBBB?enablejsapi=1',
        contentWindow: winB,
        getAttribute(name) {
          return name === 'src' ? this.src : null;
        },
      };
      const tileA = document.createElement('div');
      const tileB = document.createElement('div');
      document.body.appendChild(tileA);
      document.body.appendChild(tileB);
      const entryA = { id: 'AAAAAAAAAAA', iframe: iframeA, tile: tileA };
      const entryB = { id: 'BBBBBBBBBBB', iframe: iframeB, tile: tileB };
      videos.push(entryA, entryB);

      playerStates.set(winA, { state: 0, lastUpdate: 1 });
      playerStates.set(winB, { state: 0, lastUpdate: 1 });
      createTileControlBar(entryA);
      tileA.querySelector('.tile-ctrl-play').click();

      playerStates.set(winA, { state: 1, lastUpdate: 2 });
      updateTileControlBar(entryA);
      tileA.querySelector('.tile-ctrl-play').click();

      return {
        funcsA: messagesA.map((entry) => JSON.parse(entry.message).func),
        funcsB: messagesB.map((entry) => JSON.parse(entry.message).func),
      };
    });

    expect(result.funcsA).toEqual(['playVideo', 'pauseVideo']);
    expect(result.funcsB).toEqual([]);
  });

  test('normal grid reorder helpers move items deterministically', async ({ page }) => {
    await prepareEmptyApp(page);

    const result = await page.evaluate(async () => {
      const { getGridReorderIndexFromRects, getReorderedItems } =
        await import('/scripts/layout.js');
      return {
        moveCFirst: getReorderedItems(['A', 'B', 'C'], 2, 0),
        moveAEnd: getReorderedItems(['A', 'B', 'C'], 0, 3),
        beforeFirst: getGridReorderIndexFromRects(
          [
            { index: 0, rect: { top: 0, bottom: 100, left: 0, width: 100 } },
            { index: 1, rect: { top: 0, bottom: 100, left: 120, width: 100 } },
          ],
          10,
          50,
          3
        ),
        afterLast: getGridReorderIndexFromRects(
          [
            { index: 0, rect: { top: 0, bottom: 100, left: 0, width: 100 } },
            { index: 1, rect: { top: 0, bottom: 100, left: 120, width: 100 } },
          ],
          260,
          50,
          3
        ),
      };
    });

    expect(result.moveCFirst).toEqual(['C', 'A', 'B']);
    expect(result.moveAEnd).toEqual(['B', 'C', 'A']);
    expect(result.beforeFirst).toBe(0);
    expect(result.afterLast).toBe(3);
  });

  test('normal grid drag reorder persists after reload', async ({ page }) => {
    await prepareEmptyApp(page);
    await seedTiles(page);

    const firstTileBox = await page.locator('.tile[data-video-id="AAAAAAAAAAA"]').boundingBox();
    if (!firstTileBox) {
      throw new Error('No first tile box');
    }

    await dragHandleTo(
      page,
      'CCCCCCCCCCC',
      firstTileBox.x + 5,
      firstTileBox.y + firstTileBox.height / 2
    );
    await expect.poll(() => tileOrder(page)).toEqual(['CCCCCCCCCCC', 'AAAAAAAAAAA', 'BBBBBBBBBBB']);

    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const { storageAdapter } = await import('/scripts/storage.js');
          const stored = await storageAdapter.getItem('videos');
          return stored.map((entry) => entry.id);
        })
      )
      .toEqual(['CCCCCCCCCCC', 'AAAAAAAAAAA', 'BBBBBBBBBBB']);

    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.tile');
    await expect.poll(() => tileOrder(page)).toEqual(['CCCCCCCCCCC', 'AAAAAAAAAAA', 'BBBBBBBBBBB']);
  });

  test('free mode drag still updates the target cell', async ({ page }) => {
    await prepareEmptyApp(page);
    await seedTiles(page, IDS.slice(0, 2));
    await page.evaluate(() => {
      const layoutSelect = document.querySelector('#layoutSelect') as HTMLSelectElement;
      layoutSelect.value = 'free';
      layoutSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('#grid')).toHaveClass(/cell-mode/);

    const target = await page.evaluate(() => {
      const tile = document.querySelector('.tile[data-video-id="BBBBBBBBBBB"]');
      const rect = tile.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });

    await dragHandleTo(page, 'AAAAAAAAAAA', target.x, target.y);

    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const { videos } = await import('/scripts/state.js');
          const moved = videos.find((video) => video.id === 'AAAAAAAAAAA');
          return { col: moved?.cellCol, row: moved?.cellRow };
        })
      )
      .toEqual({ col: 1, row: 0 });
  });
});
