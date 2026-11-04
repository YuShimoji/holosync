import { test, expect } from '@playwright/test';

const fixtureThumb =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%2290%22%3E%3Crect width=%22160%22 height=%2290%22 fill=%22%233b5874%22/%3E%3C/svg%3E';
const items = [
  {
    id: { videoId: 'AAAAAAAAAAA' },
    snippet: {
      title: '長いタイトルの検索結果 テスト映像',
      channelTitle: 'テストチャンネル',
      thumbnails: { medium: { url: fixtureThumb } },
      liveBroadcastContent: 'live',
    },
  },
  {
    id: { videoId: 'BBBBBBBBBBB' },
    snippet: {
      title: '次の動画',
      channelTitle: '別チャンネル',
      thumbnails: { medium: { url: fixtureThumb } },
      liveBroadcastContent: 'none',
    },
  },
];
async function prepare(page) {
  await page.route(/(youtube|ytimg|googlevideo)\.com/, (route) => route.abort());
  await page.goto('/');
  await page.evaluate(async () => {
    const { setYoutubeApiKey } = await import('/scripts/state.js');
    setYoutubeApiKey('fixture-key');
    (await import('/scripts/ui.js')).setSidebarCollapsed(false);
  });
}
async function query(page, value) {
  await page.locator('#urlAddInput').fill(value);
  await expect(page.locator('.sb-result-card')).toHaveCount(2);
  await expect(page.locator('#sbLoading')).toBeHidden();
}

test('search batches metadata, applies filters and keeps multi-select add', async ({
  page,
}, testInfo) => {
  const searches = [];
  const metadataRequests = [];
  await page.route('https://www.googleapis.com/youtube/v3/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/search')) {
      searches.push(url);
      await route.fulfill({ json: { items } });
    } else if (url.pathname.endsWith('/videos')) {
      metadataRequests.push(url);
      await route.fulfill({
        json: {
          items: [
            {
              id: 'AAAAAAAAAAA',
              contentDetails: { duration: 'PT1H2M3S' },
              statistics: { viewCount: '12345' },
            },
            { id: 'BBBBBBBBBBB', statistics: { viewCount: '0' } },
          ],
        },
      });
    } else await route.fulfill({ json: { items: [] } });
  });
  await prepare(page);
  await query(page, '猫の音楽');
  await expect.poll(() => metadataRequests.length).toBeGreaterThanOrEqual(1);
  expect(metadataRequests[0].searchParams.get('id')).toBe('AAAAAAAAAAA,BBBBBBBBBBB');
  expect(metadataRequests[0].searchParams.get('part')).toBe('contentDetails,statistics');
  await expect(page.locator('.sb-result-card').first().locator('.sb-result-meta')).toHaveText(
    '1:02:03 · 12,345回視聴'
  );
  await expect(page.locator('.sb-result-card').nth(1).locator('.sb-result-meta')).toHaveText(
    '0回視聴'
  );
  await expect(page.locator('.sb-live-badge')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('sidebar-search-results-fixture.png') });
  await page.locator('#sbDuration').selectOption('short');
  await expect
    .poll(() =>
      searches.some(
        (url) =>
          url.searchParams.get('q') === '猫の音楽' &&
          url.searchParams.get('videoDuration') === 'short'
      )
    )
    .toBe(true);
  await page.locator('#sbOrder').selectOption('date');
  await expect
    .poll(() =>
      searches.some(
        (url) =>
          url.searchParams.get('q') === '猫の音楽' &&
          url.searchParams.get('videoDuration') === 'short' &&
          url.searchParams.get('order') === 'date'
      )
    )
    .toBe(true);
  await expect(page.locator('#sbLoading')).toBeHidden();
  await page.locator('.sb-result-card').nth(0).locator('input').check();
  await page.locator('.sb-result-card').nth(1).locator('input').check();
  await page.locator('#urlAddSubmit').click();
  await expect(page.locator('.tile')).toHaveCount(2);
});

test('history keeps five MRU entries, survives restart, re-searches and clears', async ({
  page,
}, testInfo) => {
  const queries = [];
  await page.route('https://www.googleapis.com/youtube/v3/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/search')) {
      queries.push(url.searchParams.get('q'));
      await route.fulfill({ json: { items } });
    } else await route.fulfill({ json: { items: [] } });
  });
  await prepare(page);
  for (const term of ['犬の音', '鳥の音', '雨の音', '海の音', '森の音', '風の音', '雨の音']) {
    await query(page, term);
    await expect.poll(() => queries.at(-1)).toBe(term);
  }
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await import('/scripts/storage.js')).storageAdapter.getSearchHistory()
      )
    )
    .toEqual(['雨の音', '風の音', '森の音', '海の音', '鳥の音']);
  await page.reload();
  await page.evaluate(async () => {
    (await import('/scripts/state.js')).setYoutubeApiKey('fixture-key');
    (await import('/scripts/ui.js')).setSidebarCollapsed(false);
  });
  await page.locator('#urlAddInput').focus();
  await expect(page.locator('.search-history-item')).toHaveText([
    '雨の音',
    '風の音',
    '森の音',
    '海の音',
    '鳥の音',
  ]);
  await page.screenshot({ path: testInfo.outputPath('sidebar-search-history-fixture.png') });
  const count = queries.length;
  await page.locator('.search-history-item').nth(2).click();
  await expect.poll(() => queries.length).toBe(count + 1);
  expect(queries.at(-1)).toBe('森の音');
  await expect(page.locator('.sb-result-card')).toHaveCount(2);
  await page.locator('#urlAddInput').blur();
  await page.locator('#urlAddInput').focus();
  await page.locator('.search-history-clear').click();
  await expect(page.locator('#searchHistory')).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await import('/scripts/storage.js')).storageAdapter.getSearchHistory()
      )
    )
    .toEqual([]);
});

test('metadata failure leaves cards addable and URL input works without a key', async ({
  page,
}) => {
  await page.route('https://www.googleapis.com/youtube/v3/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/search')) await route.fulfill({ json: { items } });
    else await route.fulfill({ status: 503, body: 'unavailable' });
  });
  await prepare(page);
  await query(page, '映像探し');
  await expect(page.locator('.sb-result-meta')).toHaveCount(0);
  await page.locator('.sb-result-card').first().locator('input').check();
  await page.locator('#urlAddSubmit').click();
  await expect(page.locator('.tile')).toHaveCount(1);
  await page.evaluate(async () => (await import('/scripts/state.js')).setYoutubeApiKey(null));
  await page.locator('#urlAddInput').fill('https://www.youtube.com/watch?v=CCCCCCCCCCC');
  await expect(page.locator('.sb-result-card')).toHaveCount(1);
  await page.locator('#urlAddSubmit').click();
  await expect(page.locator('.tile')).toHaveCount(2);
});

test('late search and metadata cannot overwrite the latest query or filter', async ({ page }) => {
  let releaseOld;
  const oldGate = new Promise((resolve) => {
    releaseOld = resolve;
  });
  await page.route('https://www.googleapis.com/youtube/v3/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/search') && url.searchParams.get('q') === '古い検索') {
      await oldGate;
      await route.fulfill({
        json: { items: [{ ...items[0], snippet: { ...items[0].snippet, title: '古い結果' } }] },
      });
    } else if (url.pathname.endsWith('/search'))
      await route.fulfill({
        json: { items: [{ ...items[1], snippet: { ...items[1].snippet, title: '新しい結果' } }] },
      });
    else await route.fulfill({ json: { items: [] } });
  });
  await prepare(page);
  await page.locator('#urlAddInput').fill('古い検索');
  await page.waitForTimeout(650);
  await page.locator('#urlAddInput').fill('新しい検索');
  await expect(page.locator('.sb-result-card')).toHaveCount(1);
  await expect(page.locator('.sb-result-title')).toHaveText('新しい結果');
  releaseOld();
  await page.waitForTimeout(300);
  await expect(page.locator('.sb-result-title')).toHaveText('新しい結果');
});

test('late metadata cannot replace the latest filter result', async ({ page }) => {
  let release;
  let started;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const startedGate = new Promise((resolve) => {
    started = resolve;
  });
  let metadataCalls = 0;
  await page.route('https://www.googleapis.com/youtube/v3/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/search')) {
      await route.fulfill({ json: { items: [items[0]] } });
    } else {
      const call = ++metadataCalls;
      if (call === 1) {
        started();
        await gate;
      }
      await route.fulfill({
        json: {
          items: [
            {
              id: 'AAAAAAAAAAA',
              contentDetails: { duration: call === 1 ? 'PT9H' : 'PT1M' },
            },
          ],
        },
      });
    }
  });
  await prepare(page);
  await page.locator('#urlAddInput').fill('配信の検索');
  await startedGate;
  await page.locator('#sbOrder').selectOption('date');
  await expect(page.locator('.sb-result-meta')).toHaveText('1:00');
  release();
  await page.waitForTimeout(200);
  await expect(page.locator('.sb-result-meta')).toHaveText('1:00');
});

test('legacy history is sanitized and YouTube URLs are not stored as searches', async ({
  page,
}) => {
  const searchQueries = [];
  await page.route('https://www.googleapis.com/youtube/v3/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/search')) searchQueries.push(url.searchParams.get('q'));
    await route.fulfill({ json: { items: [] } });
  });
  await prepare(page);
  await page.evaluate(async () => {
    const { storageAdapter } = await import('/scripts/storage.js');
    await storageAdapter.setItem('searchHistory', [
      null,
      '',
      { query: '旧検索' },
      '旧検索',
      7,
      '次の検索',
    ]);
  });
  await page.reload();
  await page.evaluate(async () =>
    (await import('/scripts/state.js')).setYoutubeApiKey('fixture-key')
  );
  await page.locator('#urlAddInput').focus();
  await expect(page.locator('.search-history-item')).toHaveText(['旧検索', '次の検索']);
  await page.locator('#urlAddInput').fill('https://www.youtube.com/watch?v=CCCCCCCCCCC');
  await expect(page.locator('.sb-result-card')).toHaveCount(1);
  expect(searchQueries).not.toContain('https://www.youtube.com/watch?v=CCCCCCCCCCC');
  await page.locator('#urlAddInput').fill('https://www.youtube.com/playlist?list=PL1234567890');
  await page.waitForTimeout(800);
  await page.locator('#urlAddInput').fill('https://www.youtube.com/@example');
  await expect(page.locator('#addError')).toContainText('チャンネルURL');
  await page.locator('#urlAddInput').fill('https://www.youtube.com/shorts/CCCCCCCCCCC');
  await expect(page.locator('#addError')).toContainText('URLは認識できません');
  expect(searchQueries.some((query) => query?.startsWith('https://www.youtube.com/'))).toBe(false);
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await import('/scripts/storage.js')).storageAdapter.getSearchHistory()
      )
    )
    .toEqual(['旧検索', '次の検索']);
});

test('storage history accepts direct queries and preserves MRU semantics', async ({ page }) => {
  await prepare(page);
  const result = await page.evaluate(async () => {
    const { storageAdapter } = await import('/scripts/storage.js');
    await storageAdapter.saveSearchHistory([]);
    for (const term of ['one', 'two', 'three', 'four', 'five', 'six', ' two ', '']) {
      await storageAdapter.saveSearchHistory(term);
    }
    return storageAdapter.getSearchHistory();
  });
  expect(result).toEqual(['two', 'six', 'five', 'four', 'three']);
});

test('filter change during debounce returns the filtered search', async ({ page }) => {
  const searches = [];
  await page.route('https://www.googleapis.com/youtube/v3/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/search')) {
      searches.push(url);
      await route.fulfill({ json: { items } });
    } else await route.fulfill({ json: { items: [] } });
  });
  await prepare(page);
  await page.locator('#urlAddInput').fill('素早い検索');
  await page.locator('#sbOrder').evaluate((el) => {
    el.value = 'date';
    el.dispatchEvent(new Event('change'));
  });
  await expect(page.locator('.sb-result-card')).toHaveCount(2);
  await page.waitForTimeout(600);
  await expect(page.locator('.sb-result-card')).toHaveCount(2);
  expect(
    searches
      .filter((url) => url.searchParams.get('q') === '素早い検索')
      .map((url) => url.searchParams.get('order'))
  ).toEqual(['date']);
});
