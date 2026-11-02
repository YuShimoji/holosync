# Runtime State

Last reviewed: 2026-11-02 (JST, automated Windows acceptance and F-04 exploration started)

## Current Position

- project: HoloSync; canonical repository: `https://github.com/YuShimoji/holosync.git`; default branch: `main`.
- active delivery branch: `codex/workflow-handoff`, tracking the canonical GitHub remote named `github` on this workstation. Resolve remotes by URL on other machines. Local `origin` is the legacy GitLab mirror and is not the parity source.
- verified delivery code: `148b541`; local and fetched canonical heads matched before this documentation closeout. Draft PR #23 was open, mergeable, with E2E and lint checks successful at that code commit on 2026-11-02.
- active artifact: Web App (`index.html`, `scripts/`, `styles/`) and the rebuilt local Windows package.
- active slice / phase: SP-023 automated Windows acceptance / verify; independent F-04 comparison previews / explore. Earlier implementation packets are complete; human acceptance is pending.
- outcome: same-video tiles retain independent selection through queue changes/reload; queue URL/JSON/preset round-trips and sidebar search history/metadata are implemented and verified.
- current authorization (verbatim): 「上記推奨について手動確認以外で進められる個所を進めてください。」 Automated packaged UI, controlled app-only network interruption/recovery, and actual search with an available configured key are now assigned. Natural-outage observation and human viewing/operation judgment remain distinct. F-04 implementation remains direction-gated; comparison previews are authorized.

## Authorized Work and Delivery

The user's continuation instruction was: 「上記分析から推奨対応で進めてください。」 It adopted the playback/tile repairs, real-live observation, queue persistence, and existing-sidebar search consistency recommendations.

| Delivery               | Result                                                                                                                                                                                                                       | Implementation commit |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Tile identity and sync | Stable tile IDs distinguish same-video Focus/audio/manual leader/group/order; selection and duplicate tiles survive reload; rejoining leaders do not seek themselves. Legacy selections resolve to the first matching video. | `8a91dc0`             |
| Queue persistence      | Shared URL and JSON carry existing `q`/`qi`; presets retain queue/index and legacy `videoIds`; duplicate tiles restore; preset replacement uses normal tile cleanup. Legacy `?videos=` works with local storage available.   | `d00b99c`             |
| Sidebar search         | Five-item MRU history, immediate re-search/clear and string-query storage API; batched duration/view-count metadata; failures preserve selectable results; stale responses are ignored.                                      | `148b541`             |

- implementation owner: independent Codex chat `01a19a5a-7a11-74f0-a742-67d516ae8eff`, host `local`, requested `gpt-6.1-terra / high`; implementation and push complete. Coordinator reviewed the limited diffs and acceptance evidence.
- documentation / real-network owner: independent Codex chat `01a19a59-f10a-7941-94c4-e1d2c69b35ea`, host `local`, requested `gpt-6-luna / low`. Earlier Full-Fit/postMessage documents were integrated; subsequent live verification did not edit product files.
- both chats were created in the HoloSync project and observed running. Model/effort arguments were accepted at creation; effective runtime settings were not independently read back. These are independent chats, not internal subagents.
- current Windows verification / bounded repair owner: implementation chat above, requested `gpt-6.1-terra / high` in the continuation call; owns the packaged app GUI, product files and necessary verification tooling. It does not edit runtime-state/spec-index/SP-023/F-04 documents. Evidence target: `C:/Users/PLANNER007/.codex/outputs/holosync-20261102/windows-acceptance/`.
- current F-04 preview owner: documentation / real-network chat above, requested `gpt-6-luna / low` in the continuation call; owns only external static comparison artifacts under `C:/Users/PLANNER007/.codex/outputs/holosync-20261102/f04-preview/`. No product edits or Windows app GUI operation. Requested settings were accepted; effective runtime settings were not read back.
- both existing independent chats were resumed and observed running. Coordinator owns review and runtime-state/spec-index/spec integration; file and GUI ownership do not overlap. Current overall estimate: 45–90 minutes including verification/related repairs/closeout; preview estimate: 20–40 minutes. App attachment or key availability may change the estimate; elapsed time is not a stop condition.
- initial implementation estimates were 45–90 minutes per packet, including verification/package/push. Actual packets completed earlier. Test startup/API-request selection issues and the string-query API mismatch found in review were corrected before delivery; time estimates were not stop conditions.

## Verification and Package

- final mocked checks: search regression 8/8; full Playwright 36/36; lint, format and diff checks passed. The same code commit's published GitHub E2E and lint checks passed.
- prior focused evidence: tile identity/sync 7/7 and queue persistence 3/3. Queue URL measurement: one 50-item queue at index 49 plus a same-video ordinary tile produced 1,759 characters on localhost; receiving-environment limits vary.
- search UI: 320px sidebar history/results were checked with test fixtures. Coordinator reviewed both images and preserved local copies under `C:/Users/PLANNER007/.codex/outputs/holosync-20261102/search-ui/`. These are fixture images, not evidence of actual YouTube search.
- package: `dist/HoloSync-win32-x64/HoloSync.exe` was rebuilt on 2026-11-02 and its process stayed running for six seconds. Coordinator compared all 21 packaged Web implementation files in `resources/app.asar` with delivery code `148b541`: all bytes matched. Packaged UI interactions remain unverified.
- temporary `.playwright-cli` output is excluded from formatting and packaging. Normal automated evidence under ignored `test-results/` is temporary and may be deleted by the next Playwright run.

## Real-Network Observation

- owner: the lightweight verification chat above; fixed Web snapshot `8a91dc0998603ad5df371d302881035cc67f5638`, independent headless Chromium and local server. Coordinator compared the snapshot's 21 Web implementation files to that commit's Git blobs: 21/21 matched.
- inputs observed live/playable on 2026-11-02: Sen ISS `fO9e9jnhYK8`, CFHT Mauna Kea West `Q3UhCgsWDw8`, WebcamSydney Harbour `5uZa3-RMFos`. Recheck current availability before later operator runs.
- run2 (15:06–15:11 JST): all three were loaded and assigned group A; all reached player state 1. Pause sent commands to all three and read back state 2; resume returned all to state 1 after buffering/recovery attempts; sync kept all playing and recorded no seek. This does not establish content-time alignment between unrelated streams.
- probe player-error counters were zero in these stage readbacks; separate browser-console YouTube/embed warnings and errors were retained. Grouped intentional pause is classified as `suspended:paused`, so the aggregate `paused` count can be zero while all three player states are 2; use the per-player state for this observation.
- initial explicit batch play: run3 (15:18–15:19 JST) used a fresh context: all three were cued before the sidebar batch-play click; `play-all` and three `playVideo` commands were recorded, and all three were playing with stale/error counters zero about 29 seconds later. Evidence is in `run3-initial-play/` under the local evidence path below.
- natural outage recovery, human acceptance, and the latest packaged Electron UI were not established by these fixed-snapshot observations. Run2 did not independently establish initial batch play; run3 supplied that separate check.
- first-run files were lost because the shared Playwright output directory was reset. They were not reconstructed. Run2 and later evidence are new observations saved directly outside the repository: `C:/Users/PLANNER007/.codex/outputs/holosync-20261102/live-8a91dc0/`. Local-only manifests/JSON/images are available on this workstation and are not portable repository evidence.
- the verifier closed its browsers/servers. Fixed Temp snapshot cleanup was rejected by automatic review and was not retried through another route; the snapshot remains outside the repository.

## Remaining Work and Boundaries

- next owner: assigned Windows verifier for automated package and controlled-network acceptance; human operator only for unavailable key entry and subjective viewing/operation acceptance. Use current live URLs and the local probe. Do not claim a controlled outage establishes recovery from every natural outage. Related reproduced defects may receive one bounded repair with evidence.
- F-04 main-area search and broad visual direction: compare the recorded reversible candidates in `docs/specs/ux-refinement-phase1.md` before full implementation. Right-side tray plus Operator Desk is a recorded recommendation, not approval.
- SP-007 channel-related search remains unimplemented; history/filter/metadata delivery does not close that separate feature group.
- dependency audit observed on 2026-11-02: 26 total (18 moderate, 8 high), versus the older August observation of 9. Omit-dev audit was zero; Electron is classified as a dev dependency but ships in the app. No dependency update was performed; assess upgrades separately.
- holds: broad sidebar/add-flow replacement and YouTube OAuth/account history sync. Frozen without explicit re-approval: accessibility expansion, telemetry, plugins, PWA, full i18n, advanced audio processing, collaboration.
- external status is not a second hand-edited source. No generated external cockpit has been delivered; GitHub Wiki/Issues/Project must not replace this file and `docs/spec-index.json`. Legacy GitLab cleanup remains an unadopted decision.

## Resume and Evidence

1. Read `docs/AI_RULES.md`, this file, and the relevant indexed spec. Use Node >=22.12.0; this workstation has Node 22.19.0/npm 10.9.3 and restored Playwright/Electron dependencies.
2. Fetch the remote whose URL is canonical GitHub. While PR #23 remains open, use the active delivery branch and ff-only synchronization; do not assume old recorded hashes are the new head.
3. Prefer the remaining operator acceptance. Its wait does not revoke separately authorized work; full F-04/visual implementation still needs its direction decision.
4. Reuse valid evidence. Run focused checks for new changes and package verification when required by `docs/AI_RULES.md`.

Earlier committed mocked review evidence remains under `docs/verification/2026-07-07/` (SP-023) and `docs/verification/2026-07-06/` (SP-022). It does not establish real-live acceptance. Feature behavior belongs in the indexed specs.
