# Runtime State

## Current Position

- project: HoloSync
- branch: main
- active artifact: HoloSync Web App (`index.html`, `scripts/`, `styles/`)
- surface: Browser / Electron
- slice: SP-023 Real Multi-Live Playback Reliability Probe
- state: SP-023 local probe/readback is implemented for multi-video add/play/pause/resume/sync observation; real multi-live playback verification remains
- Codex startup config: inherits user-level Codex defaults; no project-local `.codex/config.toml` overrides

## SP-021 Status

- done: F-01, F-02, F-03, F-05, F-06, F-07, F-08, F-09, F-10, F-11
- not started: F-04 main-area search
- current bottleneck: verify real multi-live playback behavior before starting F-04 or broad redesign

## SP-022 Status

- done: Dense layout option in the main layout selector.
- done: `.layout-dense` now uses `scripts/dense-layout-planner.js` to enumerate and score candidate mosaics instead of picking by visual guesswork.
- done: 12 tiles at 1280x720 with sidebar/toolbar collapsed compare `3x4`, `4x3`, `5x3`, `6x2`, and other feasible candidates; the objective planner selects `3x4`.
- done: app chrome changes, window resize, tile count changes, layout mode changes, and gap changes trigger Dense recalculation.
- done: hover and focus-within visibility for dense tile controls.
- done: Playwright regression and review screenshot paths for normal, hover/control, and app chrome states.
- evidence: `docs/verification/2026-07-06/sp-022-dense-layout-planner-1280x720.json`, `docs/verification/2026-07-06/sp-022-dense-layout-planner-1280x720.md`, `docs/verification/2026-07-06/sp-022-dense-gallery-normal-selected-3x4-1280x720.png`, `docs/verification/2026-07-06/sp-022-dense-gallery-hover-controls-selected-3x4-1280x720.png`, and `docs/verification/2026-07-06/sp-022-dense-gallery-chrome-selected-3x4-1280x720.png` after `npx playwright test e2e/dense-gallery.spec.ts --workers=1`.
- next move: review the objective planner readback first, then visually review the generated Dense screenshots, then manually verify real multi-live playback before F-04.

## SP-023 Status

- done: local probe mode can be enabled with `?sp023Probe=1`, `?liveProbe=1`, or `?probe=live`.
- done: `window.holosyncProbe` exposes start/stop/clear/mark/snapshot/exportJson/download for local operator readback.
- done: probe timeline records tile add/remove, iframe load attempts, iframe commands, player state/currentTime/duration/errorCode, play/pause/resume/sync actions, and recovery attempts.
- done: debug panel shows a compact Live Probe strip above the existing sync health table.
- evidence: `docs/verification/2026-07-07/sp-023-live-reliability-probe.json`, `docs/verification/2026-07-07/sp-023-live-reliability-probe.md`, and `docs/verification/2026-07-07/sp-023-live-reliability-probe-debug-panel.png` after `npx playwright test e2e/live-reliability-probe.spec.ts --workers=1`.
- not done: real public YouTube multi-live playback reliability has not been accepted; the current automated evidence uses mocked player postMessage events with YouTube network blocked.
- next move: run a bounded local operator probe with 3-6 current live URLs, then decide whether a playback reliability fix is needed before F-04.

## Last Package Build

- date: 2026-04-15
- path: `dist/HoloSync-win32-x64/HoloSync.exe`
- command: `npm run build`
- includes: SP-021 implemented items as of 2026-04-15; F-04 excluded

## Last Package Verification

- date: 2026-06-03
- path: `dist-build/package-check/HoloSync-win32-x64`
- command: equivalent `electron-packager` run with the package ignore regex
- result: `.codex`, `.claude`, and `.serena` were not present in the package artifact
- note: `npm run build` could not overwrite `dist/HoloSync-win32-x64` because the existing output directory was locked

## Quantitative State

- source files: 19 under `scripts/`
- test files: 6 under `e2e/`
- E2E tests: 17
- last E2E run: 2026-07-07
- specs: 21 tracked specs (19 done + 2 partial)

## Resume Snapshot 2026-07-07 SP-023 Probe

- purpose: preserve a repeatable local readback surface for multi-live playback reliability before SP-021/F-04 search work resumes.
- effect: the current branch can record whether existing tiles keep receiving player state updates after adding more tiles, and whether play/pause/resume/sync/recovery actions are observable without devtools.
- requirements: for real-live acceptance, open `http://localhost:8080/?sp023Probe=1`, paste current live URLs locally, keep Debug open, perform add/play/pause/resume/sync, then export `window.holosyncProbe.snapshot()` or download JSON.
- state: checks passed on 2026-07-07 for the probe slice: `npm run lint`, changed-file `npx prettier --check ...`, `git diff --check`, `npx playwright test e2e/live-reliability-probe.spec.ts --workers=1`, and `npx playwright test e2e/ui-regression.spec.ts --workers=1`. Mocked local validation covers add/play/pause/resume/sync timeline and readback artifact generation; real live playback remains environment-dependent and unverified.
- transfer note: after pulling the remote branch, read `docs/AI_RULES.md`, this file, `docs/ISSUES.md`, and `docs/specs/live-reliability-probe.md`; confirm parity with `git rev-list --left-right --count HEAD...github/main`; open the SP-023 JSON/Markdown/PNG artifacts before starting a real-live operator run.
- owner: next operator / Codex session.
- next move: run the bounded real-live probe or use the generated JSON/MD as the review template for a human observation pass.

## Resume Snapshot 2026-07-07 SP-022 Objective Planner

- purpose: preserve the SP-022 objective Dense planner, readback artifacts, verification evidence, and next review edge inside the repo so another terminal can resume immediately.
- effect: the current branch contains objective Dense candidate scoring, a selected 3x4 normal 1280x720 result, readback JSON/Markdown, normal/hover/chrome Playwright screenshots, regression coverage, and concise navigation docs. SP-021/F-04 remains not started, and real multi-live playback verification is still pending.
- requirements: after pulling this branch, read `docs/AI_RULES.md`, this file, `docs/ISSUES.md`, and `docs/specs/dense-gallery-canvas.md`; confirm parity with `git rev-list --left-right --count HEAD...github/main`; open the planner readback before visually judging the three selected-3x4 screenshots.
- state: checks passed on 2026-07-07 for the objective planner slice: `npm run lint`, changed-file `npx prettier --check ...`, `git diff --check`, `npx playwright test e2e/dense-gallery.spec.ts --workers=1`, and `npx playwright test e2e/ui-regression.spec.ts --workers=1`.
- local transfer note: before fast-forwarding to `github/main`, tracked local edits against the older `ec3a3f3` base were preserved in this workstation as `stash@{0}: codex-preserve-before-remote-ff-2026-07-06`. They were not re-applied because the fetched GitHub commits superseded the old AI-rule cleanup context.
- owner: next operator / Codex session.
- next move: inspect the objective planner readback, then visually approve or tune Dense spacing from the screenshots, then manually verify real multi-live playback before starting F-04 main-area search.

## Human Decision Items

- SP-021/F-04 main-area search: choose search-result layout relative to the video grid.
- Sidebar structure redesign: decide whether search/playlist concerns should move out of the sidebar.
- Video-add flow refinement: decide desired entry path before implementation.
- YouTube account/OAuth sync: hold until value path is clear.
