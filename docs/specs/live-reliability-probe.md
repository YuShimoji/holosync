# SP-023: Real Multi-Live Playback Reliability Probe

**Status**: partial
**Priority**: P1
**Category**: core
**Created**: 2026-07-07
**Last updated**: 2026-07-07

## Purpose

Reduce the main reliability uncertainty before SP-021/F-04 by making multi-live playback behavior observable without devtools. The probe records tile add/load events, play/pause/resume/sync commands, player state readbacks, stale updates, errors, and recovery attempts in a compact timeline.

## Implemented Behavior

- `?sp023Probe=1`, `?liveProbe=1`, or `?probe=live` starts the local playback reliability probe.
- `window.holosyncProbe` is available for local operator runs:
  - `start(options)`
  - `stop(reason)`
  - `clear()`
  - `mark(label, detail)`
  - `snapshot()`
  - `exportJson()`
  - `download(filename)`
- The probe records:
  - tile add/remove and iframe load attempts;
  - iframe command posts such as `playVideo`, `pauseVideo`, `seekTo`, and `setPlaybackRate`;
  - player state/currentTime/duration/errorCode updates from YouTube postMessage payloads;
  - batch actions: play-all, pause-all, resume-all, sync-all, mute/unmute, volume, and speed;
  - sync recovery attempts with reason, fallback mode, leader state, and leader time.
- The debug panel now includes a compact Live Probe strip above the existing sync health table. It shows current tile counts, playing/paused/stale/error counts, and the latest timeline rows.

## Local Operator Flow

1. Open the app with `npm run dev`, then visit `http://localhost:8080/?sp023Probe=1`.
2. Paste 3-6 YouTube live URLs into the existing add-video input.
3. Open Debug and keep the Live Probe strip visible.
4. Use play/pause/resume/sync controls and add more live videos during playback.
5. Run `window.holosyncProbe.snapshot()` or `window.holosyncProbe.download()` from the browser console to save the current readback.

The probe is deliberately local-only. It does not require OAuth, API keys, account login, or public upload.

## Evidence

- Mocked local probe validation:
  - `npx playwright test e2e/live-reliability-probe.spec.ts --workers=1`
- Readback artifacts produced by that test:
  - `docs/verification/2026-07-07/sp-023-live-reliability-probe.json`
  - `docs/verification/2026-07-07/sp-023-live-reliability-probe.md`
  - `docs/verification/2026-07-07/sp-023-live-reliability-probe-debug-panel.png`

## Boundaries

- This slice does not claim real public live playback reliability.
- The automated test blocks YouTube network and uses mocked player postMessage events for deterministic local validation.
- Real-live acceptance still requires a bounded operator run with current live URLs pasted locally.
- This slice does not implement F-04 main-area search, OAuth/account sync, public release, package build, or broad format cleanup.
