# Runtime State

## Current Position

- project: HoloSync
- branch: main
- active artifact: HoloSync Web App (`index.html`, `scripts/`, `styles/`)
- surface: Browser / Electron
- slice: SP-021 UI/UX refinement Phase 1
- state: remote-resume handoff refreshed on 2026-06-08; real multi-live playback verification remains
- Codex startup config: inherits user-level Codex defaults; no project-local `.codex/config.toml` overrides

## SP-021 Status

- done: F-01, F-02, F-03, F-05, F-06, F-07, F-08, F-09, F-10, F-11
- not started: F-04 main-area search
- current bottleneck: verify real multi-live playback behavior before starting F-04 or broad redesign

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

- source files: 17 under `scripts/`
- test files: 4 under `e2e/`
- E2E tests: 14
- last E2E run: 2026-06-03
- specs: 19 tracked specs (18 done + 1 partial)

## Resume Snapshot 2026-06-08

- purpose: preserve the current working context in the project and make `origin/main` immediately resumable from another terminal.
- effect: remote parity was confirmed before this docs-only refresh; the active implementation state remains SP-021 Phase 1 with F-04 not started and real multi-live playback verification still pending.
- requirements: after pulling this branch, read `docs/AI_RULES.md`, this file, and `docs/ISSUES.md`; use `git rev-list --left-right --count HEAD...origin/main` to confirm parity; run `npm test` before code changes if local browser/test dependencies are available; close any running packaged app before `npm run build` because the previous `dist/HoloSync-win32-x64` directory was locked.
- state: maintenance checks last passed on 2026-06-03 (`git diff --check`, `npm run lint`, `npm test`, and changed-file Prettier check); this 2026-06-08 handoff is documentation-only; `npm run format:check` still fails on existing format debt outside the maintenance slice.
- owner: next operator / Codex session.
- next move: manually verify real multi-live playback with multiple live videos before starting SP-021/F-04 or broad UI modernization.

## Human Decision Items

- SP-021/F-04 main-area search: choose search-result layout relative to the video grid.
- Sidebar structure redesign: decide whether search/playlist concerns should move out of the sidebar.
- Video-add flow refinement: decide desired entry path before implementation.
- YouTube account/OAuth sync: hold until value path is clear.
