# Runtime State

## Current Position

- project: HoloSync
- branch: main
- active artifact: HoloSync Web App (`index.html`, `scripts/`, `styles/`)
- surface: Browser / Electron
- slice: SP-022 Objective Dense Layout Planner
- state: SP-022 dense gallery now uses an objective candidate-scoring planner with machine/human readback artifacts; real multi-live playback verification remains
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

- source files: 18 under `scripts/`
- test files: 5 under `e2e/`
- E2E tests: 16
- last E2E run: 2026-07-07
- specs: 20 tracked specs (19 done + 1 partial)

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
