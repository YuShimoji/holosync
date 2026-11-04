import { expect, test, type TestInfo } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const reviewArtifactDir = path.join(process.cwd(), 'docs', 'verification', '2026-07-07');
const updateReviewArtifacts = process.env.UPDATE_REVIEW_ARTIFACTS === '1';

function getArtifactPaths(testInfo: TestInfo) {
  const outputPath = (filename: string) =>
    updateReviewArtifacts ? path.join(reviewArtifactDir, filename) : testInfo.outputPath(filename);

  return {
    directory: updateReviewArtifacts ? reviewArtifactDir : testInfo.outputDir,
    json: outputPath('sp-023-live-reliability-probe.json'),
    markdown: outputPath('sp-023-live-reliability-probe.md'),
    screenshot: outputPath('sp-023-live-reliability-probe-debug-panel.png'),
  };
}

const firstBatch = ['ProbeLive01', 'ProbeLive02', 'ProbeLive03'];
const secondBatch = ['ProbeLive04', 'ProbeLive05', 'ProbeLive06'];
const allProbeIds = [...firstBatch, ...secondBatch];

async function resetAppForProbe(page) {
  await page.evaluate(async () => {
    const { videos, playerStates, suspendedPlayers } = await import('/scripts/state.js');
    const { storageAdapter } = await import('/scripts/storage.js');
    videos.splice(0, videos.length);
    playerStates.clear();
    suspendedPlayers.clear();
    document.querySelector('#grid')?.replaceChildren();
    await storageAdapter.setItem('videos', []);
    await storageAdapter.setItem('lastSession', []);
    await storageAdapter.setItem('layoutSettings', { layout: 'dense', gap: 8 });
    window.holosyncProbe.clear();
    window.holosyncProbe.start({
      source: 'playwright-mock',
      note: 'mocked multi-live add/play/pause/resume/sync probe',
    });
  });
}

async function addProbeTiles(page, ids: string[]) {
  await page.evaluate(async (videoIds) => {
    const { videos } = await import('/scripts/state.js');
    const { createTile, persistVideos } = await import('/scripts/player.js');
    for (const id of videoIds) {
      createTile(id, { syncGroupId: 'A' });
    }
    for (const video of videos) {
      video.iframeLoaded = true;
    }
    persistVideos();
  }, ids);
}

async function emitPlayerStates(
  page,
  states: Array<{ id: string; playerState: number; currentTime: number; duration?: number }>
) {
  await page.evaluate(async (stateRows) => {
    const { videos } = await import('/scripts/state.js');
    for (const row of stateRows) {
      const entry = videos.find((video) => video.id === row.id);
      if (!entry?.iframe?.contentWindow) {
        continue;
      }
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://www.youtube.com',
          source: entry.iframe.contentWindow,
          data: JSON.stringify({
            event: 'infoDelivery',
            info: {
              playerState: row.playerState,
              currentTime: row.currentTime,
              duration: row.duration ?? 50000,
            },
          }),
        })
      );
    }
  }, states);
}

function makeMarkdown(readback, screenshotReference: string) {
  const actionRows = readback.timeline
    .filter((event) => event.type === 'action')
    .map(
      (event) =>
        `| ${event.ms} | ${event.action || ''} | ${event.totals?.tiles ?? ''} | ${event.totals?.playing ?? ''} | ${event.totals?.paused ?? ''} |`
    )
    .join('\n');
  const finalRows = readback.videos
    .map(
      (video) =>
        `| ${video.tileId} | ${video.status} | ${video.playerStateLabel} | ${video.currentTime ?? ''} | ${video.lastUpdateAgeMs ?? ''} |`
    )
    .join('\n');

  return `# SP-023 Live Reliability Probe Readback

- implementation_date: 2026-07-07
- implementation_version: ${readback.version}
- run_id: ${readback.runId}
- evidence_kind: mocked player postMessage sequence
- real_live_playback_tested: no
- real_live_limit: no project-provided live URLs were used; this artifact validates the repeatable local probe path without credentials or public release.
- browser_surface: Playwright Chromium via local http-server
- screenshot: ${screenshotReference}

## Scenario

1. Start with 3 probe tiles in sync group A.
2. Record play-all and transition all three to playing.
3. Add 3 more tiles while the first three remain playing.
4. Record pause-all, resume-all, and sync-all.
5. Export the probe snapshot for review without opening devtools.

## Action Timeline

| ms | action | tiles | playing | paused |
| ---: | --- | ---: | ---: | ---: |
${actionRows}

## Final Tile States

| tile | status | state | current_time | last_update_age_ms |
| --- | --- | --- | ---: | ---: |
${finalRows}
`;
}

test.describe('SP-023 live reliability probe', () => {
  test('records add/play/pause/resume/sync readback without YouTube network', async ({
    page,
  }, testInfo) => {
    await page.route(/(youtube|youtube-nocookie|ytimg|googlevideo)\.com/, (route) => route.abort());

    await page.goto('/?sp023Probe=1', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('#grid') !== null);
    await resetAppForProbe(page);

    await addProbeTiles(page, firstBatch);
    await emitPlayerStates(
      page,
      firstBatch.map((id) => ({ id, playerState: -1, currentTime: 0 }))
    );

    await page.click('#playPauseToggle');
    await emitPlayerStates(
      page,
      firstBatch.map((id, index) => ({
        id,
        playerState: 1,
        currentTime: 10 + index,
      }))
    );

    await page.evaluate(() => window.holosyncProbe.mark('before-second-batch'));
    await addProbeTiles(page, secondBatch);
    await emitPlayerStates(
      page,
      allProbeIds.map((id, index) => ({
        id,
        playerState: 1,
        currentTime: index < firstBatch.length ? 18 + index : 2 + index,
      }))
    );

    await page.click('#playPauseToggle');
    await emitPlayerStates(
      page,
      allProbeIds.map((id, index) => ({
        id,
        playerState: 2,
        currentTime: 24 + index,
      }))
    );

    await page.click('#playPauseToggle');
    await emitPlayerStates(
      page,
      allProbeIds.map((id, index) => ({
        id,
        playerState: 1,
        currentTime: 30 + index,
      }))
    );

    await page.click('#syncAll');
    await page.evaluate(() => window.holosyncProbe.mark('after-sync-all'));

    await page.click('#debugToggle');
    await expect(page.locator('.probe-summary')).toBeVisible();
    await expect(page.locator('.probe-summary')).toContainText('Live Probe: ON');

    const snapshot = await page.evaluate(() => window.holosyncProbe.snapshot());
    const eventTypes = snapshot.timeline.map((event) => event.type);
    const actions = snapshot.timeline
      .filter((event) => event.type === 'action')
      .map((event) => event.action);

    expect(eventTypes).toContain('tile-added');
    expect(eventTypes).toContain('player-state');
    expect(eventTypes).toContain('command');
    expect(actions).toContain('play-all');
    expect(actions).toContain('pause-all');
    expect(actions).toContain('resume-all');
    expect(actions).toContain('sync-all');
    expect(snapshot.totals.tiles).toBe(6);
    expect(snapshot.totals.playing).toBe(6);
    expect(snapshot.videos.every((video) => video.lastUpdateAgeMs !== null)).toBeTruthy();

    const artifactPaths = getArtifactPaths(testInfo);
    const artifactReferences = updateReviewArtifacts
      ? {
          json: 'docs/verification/2026-07-07/sp-023-live-reliability-probe.json',
          markdown: 'docs/verification/2026-07-07/sp-023-live-reliability-probe.md',
          screenshot: 'docs/verification/2026-07-07/sp-023-live-reliability-probe-debug-panel.png',
        }
      : {
          json: path.basename(artifactPaths.json),
          markdown: path.basename(artifactPaths.markdown),
          screenshot: path.basename(artifactPaths.screenshot),
        };

    const readback = {
      ...snapshot,
      realLivePlayback: {
        attempted: false,
        reason:
          'No project-provided live URLs were used in automated validation. The probe is ready for pasted local live URLs.',
      },
      probeInputs: {
        videoIds: allProbeIds,
        syncGroupId: 'A',
        youtubeNetwork: 'blocked by Playwright route for deterministic local fixture',
      },
      artifactPaths: artifactReferences,
    };

    await fs.mkdir(artifactPaths.directory, { recursive: true });
    await page.locator('#debugPanel').screenshot({ path: artifactPaths.screenshot });
    await fs.writeFile(artifactPaths.json, `${JSON.stringify(readback, null, 2)}\n`, 'utf8');
    await fs.writeFile(
      artifactPaths.markdown,
      makeMarkdown(readback, artifactReferences.screenshot),
      'utf8'
    );

    await expect
      .poll(async () => fs.stat(artifactPaths.json).then((stat) => stat.isFile()))
      .toBeTruthy();
    await expect
      .poll(async () => fs.stat(artifactPaths.markdown).then((stat) => stat.isFile()))
      .toBeTruthy();
  });
});
