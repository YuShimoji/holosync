# Runtime State

Last reviewed: 2026-11-02 (tile identity verification; older verification remains dated below)

## Current Position

- project: HoloSync
- canonical repository: `https://github.com/YuShimoji/holosync.git`; default branch: `main`
- remote portability: this workstation calls canonical GitHub `github`; a fresh clone normally calls it `origin`. Resolve by URL instead of assuming an alias.
- active delivery branch: `codex/workflow-handoff`; Draft PR #23 is open and mergeable, its published checks pass, and fetched head `33cd56f` is 7 commits ahead of `main` as verified on 2026-08-12. Resolve the exact head with a live fetch on resume instead of relying only on this recorded hash.
- legacy mirror: `https://gitlab.com/YuShimoji/holosync.git` was 152 commits behind at the 2026-07-10 audit and is not a parity source.
- active artifact: HoloSync Web App (`index.html`, `scripts/`, `styles/`)
- active slice: queue share/preset and search consistency follow-up after coordinator review
- phase: verify
- current outcome: duplicate-video tile identity and rejoining leader self-seek repairs pass mocked regression checks; real-live acceptance remains pending
- primary bottleneck: real public YouTube multi-live playback remains unaccepted

## Delivered Baseline

- SP-021 UI/UX refinement: 10 of 11 items are done; F-04 main-area search is not started.
- SP-022 Objective Dense Gallery Canvas: done, including objective mosaic scoring and 12-tile `3x4` evidence at 1280x720.
- SP-023 probe: implemented with `?sp023Probe=1`, `window.holosyncProbe`, Debug-panel readback, JSON export, and Playwright coverage.
- Workflow maintenance: AI rules now define one outcome-sized supervisor Work Packet, bounded autonomy, a single design checkpoint, and single-source state ownership.
- Verification hygiene: routine SP-022/SP-023 tests write generated evidence under ignored `test-results/`; committed review artifacts change only with `UPDATE_REVIEW_ARTIFACTS=1`.

## Authorized Repair Assignment (2026-11-02)

- user requested corrected implementation prompts, independent Codex chats where needed, lightweight-model delegation where suitable, and non-overlapping editing ownership. The user explicitly selected `gpt-6.1-terra / high` and `gpt-6-luna / low`.
- implementation owner: independent Codex chat `01a19a5a-7a11-74f0-a742-67d516ae8eff` (host `local`), requested `gpt-6.1-terra / high`. Owns the six repairs, their regression tests and related specs/index, final runtime-state updates, package verification, and integrated commit/push. Start was observed through `wait_threads`.
- documentation owner: independent Codex chat `01a19a59-f10a-7941-94c4-e1d2c69b35ea` (host `local`), requested `gpt-6-luna / low`. Owns only `docs/specs/fitmode.md` and `docs/SECURITY_POSTMESSAGE.md`; no runtime-state or Git writes. Start and two-document work were observed through `wait_threads`.
- both chats were created in this local HoloSync project and appear in the app's thread inventory. Creation accepted the explicit model/effort arguments; effective runtime settings have not been independently read back. These are independent chats, not internal subagents.
- scope: live rejoin seek handling, leaderless recovery without undoing intentional pause, least-buffered selection including never-seeked candidates, queue controls using the current entry, zoomRadius save/normal-start restore while retaining old zoomShape reads, and Chrome storage value unwrapping. Complete playback/queue work first; zoom/Chrome work is not a prerequisite for the human live gate.
- integration: this chat owns only the initial dispatch record; thereafter the implementation owner alone edits runtime-state and performs Git writes. The documentation owner returns its result in its own chat; the implementation owner uses `wait_threads` to review it before an integrated, path-scoped commit/push.
- completion: focused regression evidence, lint/format/full Playwright checks, relevant spec updates, and a rebuilt Windows package. Real-live acceptance remains human-owned and cannot be closed by mocked checks.
- next owner after code verification: human operator for SP-023 real-live acceptance. Search history/metadata and queue share/preset parity remain existing-spec follow-up work; F-04/broad visual implementation still requires the recorded direction decision. No dependency update or main-branch merge is authorized by this assignment.

## Repair verification (2026-11-02, JST)

- measured against base commit `04d6229` plus the repair worktree: live rejoin seek suppression, leaderless reason-based recovery, oldest-seek leader choice, current queue tile actions, radius persistence, and Chrome value reads were implemented. Mocked regression tests passed 3/3; full Playwright passed 21/21; lint, format check, and diff whitespace check passed.
- `npm run build:checked` rebuilt ignored `dist/HoloSync-win32-x64/HoloSync.exe`. The packaged process remained running for six seconds; no packaged UI interaction or live playback was verified.
- documentation owner chat completed its two specified documents; their limited diff was reviewed and included. Requested model/effort for both chats was accepted at creation; effective runtime settings remain unverified.
- remaining at that earlier verification: duplicate-video Focus/audio ambiguity; this was subsequently repaired in the tile identity slice below. Search history/metadata and queue share/preset parity remain separate follow-ups. Real 3–6-stream SP-023 acceptance belongs to the human operator; F-04 and broad visual implementation remain direction-gated.
- next owner at that earlier verification: human operator for SP-023; tile identity was subsequently assigned to the existing implementation owner.

## Tile identity repair (2026-11-02, verified 14:43 JST)

- owner: independent implementation chat `01a19a5a-7a11-74f0-a742-67d516ae8eff`; requested `gpt-6.1-terra / high`, effective setting not independently verified. Coordinator reviews this slice and assigns the already authorized queue-sharing/search follow-up.
- measured against base `c3773b4` plus this repair worktree: stable tile IDs distinguish same-video Focus, audio master, manual sync leader, sync-group selection and tile ordering; duplicates and selection survive reload. Legacy audio video ID resolves to the first matching tile. Rejoining leader identity is compared by player window and does not self-seek.
- initial estimate was 45–90 minutes including checks and delivery; implementation and verification completed earlier than that range. A parallel-suite test exposed startup/restore interaction; the test setup and idempotent restoration were corrected and checks rerun.
- focused mocked regression: 7/7; full Playwright: 25/25; lint, format and diff whitespace checks passed. `npm run build:checked` rebuilt ignored `dist/HoloSync-win32-x64/HoloSync.exe`; its process remained running for six seconds. Packaged UI and actual YouTube playback were not tested.
- remaining and next owner: coordinator reviews the repair, then assigns the previously authorized queue share/preset and search consistency slice. The human operator separately owns SP-023 live acceptance; F-04/broad visual work remains direction-gated.

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

- required runtime: Node.js `>=22.12.0`; verified locally with Node `22.19.0` and npm `10.9.3`.
- dependencies: restored from `package-lock.json` with development dependencies on 2026-08-12; Playwright `1.58.2`, its Chromium runtime, and Electron `40.8.0` are installed.
- dependency audit: production install reports 0 vulnerabilities; the development toolchain reports 9 known issues (3 moderate, 6 high) and needs a separate upgrade assessment.
- local refresh checks (2026-08-12): clean top-level dependency tree, Electron version readback, `node --check` across all 22 tracked JavaScript modules, `npm run format:check`, `npm run lint`, `git diff --check`, production dependency audit, the focused SP-023 Playwright test (1/1), and the full Playwright suite (18/18) all pass.
- handoff refresh (2026-08-12): the tracked and untracked working tree started clean; canonical GitHub was fetched and the active branch fast-forwarded from `2fc5be6` to `33cd56f`, matching its upstream. The only fetched change removed the stale `.claude/CLAUDE.md` adapter; no product or feature-spec behavior changed.
- related repair: removed the UTF-8 BOM before the shebang in `tools/build-offline-check.mjs`; the script already executed normally, but the repair also makes direct Node syntax checking reliable.
- package state: `npm run build:checked` rebuilt `dist/HoloSync-win32-x64/HoloSync.exe` on 2026-08-12 with Electron `40.8.0`, so the local package now includes SP-022 and SP-023. Packaging passed; packaged-app launch and real-live playback remain manually unverified.

## Supervisor Status Report (2026-08-12)

- purpose: retain a current, portable restart point after canonical remote synchronization, lockfile restoration, local regression verification, and Windows package regeneration.
- effect: no product behavior changed; branch/PR parity, the refreshed development and package baseline, active acceptance boundary, ownership, holds, and development horizon are available from this file and its linked specs without chat-only context.
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

Coordinator reviews the tile identity repair and advances the authorized queue-sharing/search consistency follow-up. The human operator separately runs the SP-023 real-live probe; F-04/visual work remains behind its direction decision.

## Resume Sequence

1. Fetch the remote whose URL is the canonical GitHub repository; while PR #23 remains open, check out `codex/workflow-handoff` and pull it with `--ff-only`. If it has merged or closed, use updated `main` instead.
2. Run `npm ci` with Node.js 22.12 or newer, then run `npx playwright install chromium` when that workstation does not already have the matching browser binary.
3. Read this file, `docs/AI_RULES.md`, `docs/specs/live-reliability-probe.md`, and the F-04 checkpoint in `docs/specs/ux-refinement-phase1.md`.
4. Prefer the SP-023 real-live gate. When current live URLs are unavailable, create only the fixed-state F-04/visual previews described in SP-021 and return for one decision.
5. Before publishing another state change, run formatting, lint, the narrow relevant Playwright test, and `git diff --check`; use the full suite when shared UI/player behavior changes.
