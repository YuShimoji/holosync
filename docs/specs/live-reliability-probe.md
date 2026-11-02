# SP-023: Real Multi-Live Playback Reliability Probe

**Status**: partial
**Priority**: P1
**Category**: core
**Created**: 2026-07-07
**Last updated**: 2026-11-02

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
- A normal run writes temporary readback artifacts under ignored `test-results/`; CI uploads them for 7 days.
- Set `UPDATE_REVIEW_ARTIFACTS=1` only when intentionally replacing these committed review artifacts (PowerShell example: `docs/TESTING.md`):
  - `docs/verification/2026-07-07/sp-023-live-reliability-probe.json`
  - `docs/verification/2026-07-07/sp-023-live-reliability-probe.md`
  - `docs/verification/2026-07-07/sp-023-live-reliability-probe-debug-panel.png`

## Real-network observation (2026-11-02)

- Fixed Web implementation `8a91dc0` was exercised with three public YouTube lives in an independent headless Chromium context, without mocked player events or blocked YouTube traffic. Coordinator compared all 21 Web implementation files with the commit's Git blobs; all matched.
- Fresh-context initial batch play, group-A pause/resume and sync were observed through real commands and per-player readbacks. Buffering/recovery attempts during resume were followed by all three players returning to playing; natural-outage recovery was not established.
- Run2 and run3 manifests, stage JSON and screen captures are local-only evidence under `C:/Users/PLANNER007/.codex/outputs/holosync-20261102/live-8a91dc0/`. The first run's temporary test-results files were lost; the later runs are new observations, not reconstructed evidence.
- These checks do not accept the latest packaged Electron UI or replace the human operator's viewing/operation judgment. See `docs/runtime-state.md` for delivered code, package parity and remaining acceptance.

## Windows package observation (2026-11-02)

- The packaged executable was launched with Playwright Electron in an isolated profile. Playback implementation `148b541` supplied real-live initial batch play, pause/resume, sync and controlled app-context offline/online observations. The later CSS-only queue fix `3cdd3a7` was rebuilt and verified separately through packaged pointer operations; it does not change playback code.
- In the controlled run, two of three players entered buffering after about 30 seconds offline. All three returned to player state 1 about 20 seconds after online restoration. Over the next 15 seconds, currentTime advanced by approximately 15.31, 3.20 and 15.08 seconds; this is endpoint progress, not proof of uninterrupted playback or human viewing acceptance. No seekTo was recorded in the marked outage/recovery interval at zero offset.
- A separate intentional-pause offline/online sequence retained all three players in state 2 and recorded no new play commands in that interval. Recovery attempts and suspended players must still be read from the per-player timeline, not aggregate counts alone.
- Packaged pointer operations exposed a queue/header overlap. The limited CSS repair and two behavioral regressions passed; rebuilt packaged previous/next, Focus, audio master and information-panel operations were then verified. Queue setup used an internal API in the isolated profile; subsequent controls used pointer input. Same-port restart retained the duplicate tile, queue position, Focus and audio selection.
- Port-conflict fallback revealed separate origin-scoped storage, documented in `docs/PERSISTENCE.md`. It is an unresolved product/persistence decision, not a successful cross-port restore.
- Evidence is local-only under `C:/Users/PLANNER007/.codex/outputs/holosync-20261102/windows-acceptance/` (`summary.json`, `run3/`, screenshots). Full mocked Playwright passed 38/38; lint, targeted format and diff checks passed. Natural failures, content-time alignment, real API search and human acceptance are not established by this run.

## Boundaries

- This slice does not claim real public live playback reliability.
- The automated test blocks YouTube network and uses mocked player postMessage events for deterministic local validation.
- Real-live acceptance still requires a bounded operator run with current live URLs pasted locally.
- This slice does not implement F-04 main-area search, OAuth/account sync, public release, package build, or broad format cleanup.
