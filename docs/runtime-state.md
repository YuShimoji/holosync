# Runtime State

Last reviewed: 2026-07-21

## Current Position

- project: HoloSync
- canonical repository: `https://github.com/YuShimoji/holosync.git`; default branch: `main`
- remote portability: this workstation calls canonical GitHub `github`; a fresh clone normally calls it `origin`. Resolve by URL instead of assuming an alias.
- active delivery branch: `codex/workflow-handoff`; Draft PR #23 is open and mergeable, its published checks pass, and the branch is ahead of `main` as verified on 2026-07-21. Resolve the exact head with a live fetch on resume instead of relying on a self-referential state-file hash.
- legacy mirror: `https://gitlab.com/YuShimoji/holosync.git` was 152 commits behind at the 2026-07-10 audit and is not a parity source.
- active artifact: HoloSync Web App (`index.html`, `scripts/`, `styles/`)
- active slice: SP-023 Real Multi-Live Playback Reliability Probe
- phase: verify
- current outcome: local probe/readback is implemented for multi-video add, play, pause, resume, sync, recovery, and player-state observation
- primary bottleneck: real public YouTube multi-live playback has not been accepted; automated evidence blocks YouTube network traffic and uses mocked player events

## Delivered Baseline

- SP-021 UI/UX refinement: 10 of 11 items are done; F-04 main-area search is not started.
- SP-022 Objective Dense Gallery Canvas: done, including objective mosaic scoring and 12-tile `3x4` evidence at 1280x720.
- SP-023 probe: implemented with `?sp023Probe=1`, `window.holosyncProbe`, Debug-panel readback, JSON export, and Playwright coverage.
- Workflow maintenance: AI rules now define one outcome-sized supervisor Work Packet, bounded autonomy, a single design checkpoint, and single-source state ownership.
- Verification hygiene: routine SP-022/SP-023 tests write generated evidence under ignored `test-results/`; committed review artifacts change only with `UPDATE_REVIEW_ARTIFACTS=1`.

## Active Gate and Independent Lane

- human-only gate: run a bounded local probe with 3-6 current public live URLs and observe add/play/pause/resume/sync/recovery behavior.
- pass path: accept SP-023 and choose the next product slice.
- failure path: use the exported timeline to open a narrowly scoped playback-reliability fix.
- while waiting: F-04 search and visual-system work may proceed only as reversible direction previews; do not begin their full implementation until a direction is selected and explicitly authorized.

## Evidence to Reuse

- SP-023: `docs/verification/2026-07-07/sp-023-live-reliability-probe.json`, `.md`, and `sp-023-live-reliability-probe-debug-panel.png`.
- SP-022: `docs/verification/2026-07-06/sp-022-dense-layout-planner-1280x720.json`, `.md`, and the selected normal/hover/chrome screenshots.
- Relevant specs: `docs/specs/live-reliability-probe.md`, `docs/specs/dense-gallery-canvas.md`, and `docs/specs/ux-refinement-phase1.md`.

## Decision Queue

- F-04 main-area search: choose how search results coexist with the video grid.
- Visual system: choose a coherent icon, color, typography, motion, and control-density direction before broad polish.
- Language: Japanese copy/help consistency is a small quality slice; message dictionary extraction or a Japanese/English switch still requires explicit scope approval.
- External status: choose a generated GitHub Pages cockpit or a richer GitHub Project; Wiki should not become another hand-maintained state source.
- Remote cleanup: decide whether the legacy GitLab mirror is retained, renamed clearly, or removed from local clones; do not change push assumptions implicitly.

## External Visibility Baseline

- no generated external cockpit exists yet.
- GitHub Wiki, Issues, and Project are not current-state sources; inspect them live instead of copying volatile counts or check results here.
- recommended projection: generate a read-only GitHub Pages cockpit from this file and `docs/spec-index.json`; keep Wiki and Project out of the current-state ownership path.

## Boundaries and Holds

- hold: broad sidebar restructuring and video-add flow replacement until a direction checkpoint resolves their interaction with F-04.
- hold: YouTube account/OAuth history sync until its user-value path is clear.
- frozen unless explicitly re-approved: accessibility expansion, telemetry, plugin architecture, PWA, full i18n, advanced audio processing, and collaboration features.

## Development Environment

- required runtime: Node.js `>=22.12.0`; verified locally with Node `24.13.0` and npm `11.6.2`.
- dependencies: restored from `package-lock.json` with development dependencies on 2026-07-17; the matching Playwright Chromium runtime and Electron `40.8.0` binary are installed.
- dependency audit: production install reports 0 vulnerabilities; the development toolchain reports 9 known issues (6 moderate, 3 high) and needs a separate upgrade assessment.
- local refresh checks (2026-07-17): clean top-level dependency tree, Electron version readback, `npm run format:check`, `npm run lint`, `git diff --check`, production dependency audit, and the full Playwright suite all pass (18/18).
- handoff refresh (2026-07-21): the working tree started clean; both canonical GitHub aliases were fetched and matched local HEAD before publication; this state-only refresh is published to the same delivery branch. No product or spec state changed after the 2026-07-17 validation.
- package state: the last Windows package is from 2026-04-15 and does not include SP-022 or SP-023; rebuild only when packaged-app verification is requested or the active feature slice closes.

## Supervisor Status Report (2026-07-21)

- purpose: publish a current, portable restart point after canonical remote revalidation, with all decisive active-lane context kept in this repository.
- effect: no product behavior changed; branch/PR parity, the validated development baseline, active acceptance boundary, ownership, holds, and development horizon are available from this file and its linked specs without chat-only context.
- requirements: continue with Node.js 22.12 or newer; real-live acceptance needs 3-6 current public YouTube live URLs and a local operator who can judge playback behavior.
- state: SP-023 remains in `verify`; its probe and mocked automated evidence pass, but real public multi-live playback is not yet accepted. F-04 and broad visual implementation remain behind the recorded direction checkpoint.
- owner: the human operator owns real-live acceptance; the developer owns a narrow timeline-backed reliability fix only if the probe fails; the supervising AI owns the next outcome-sized Work Packet and any F-04/visual direction framing.
- next move: run the bounded SP-023 real-live probe and either accept the slice or open one narrow reliability fix from the exported timeline. If the gate cannot run, prepare only reversible F-04/visual previews for one combined direction-and-implementation decision.

## Proposed Development Horizon

- gate: accept or narrowly repair SP-023 from a real 3-6 stream operator timeline; mocked evidence cannot close it.
- direction: compare the fixed F-04/visual states and select one search layout plus one product posture in a single checkpoint. The current recommendation is right-side search tray plus Operator Desk, but it is not implementation authorization.
- vertical slice: implement the selected search/visual direction end to end without reopening held sidebar, OAuth, i18n, or platform work.
- release baseline: close SP-021 at 11/11, rerun real-live and 0/4/12-tile acceptance, then rebuild and verify the Windows package that replaces the 2026-04-15 artifact.
- farthest safe target: a packaged baseline with SP-023 accepted and SP-021 complete. Saved monitoring sets or a Live Hub may be explored next, but require a new scope decision before implementation.

## Next Move

Run the real-live SP-023 operator probe. If that human-only gate cannot run now, prepare 2-4 F-04/visual directions as previews and return for one combined direction-and-implementation decision.

## Resume Sequence

1. Fetch the remote whose URL is the canonical GitHub repository; while PR #23 remains open, check out `codex/workflow-handoff` and pull it with `--ff-only`. If it has merged or closed, use updated `main` instead.
2. Run `npm ci` with Node.js 22.12 or newer, then run `npx playwright install chromium` when that workstation does not already have the matching browser binary.
3. Read this file, `docs/AI_RULES.md`, `docs/specs/live-reliability-probe.md`, and the F-04 checkpoint in `docs/specs/ux-refinement-phase1.md`.
4. Prefer the SP-023 real-live gate. When current live URLs are unavailable, create only the fixed-state F-04/visual previews described in SP-021 and return for one decision.
5. Before publishing another state change, run formatting, lint, the narrow relevant Playwright test, and `git diff --check`; use the full suite when shared UI/player behavior changes.
