# Runtime State

Last reviewed: 2026-11-02 (JST, automated Windows verification and F-04 preview closeout)

## Current Position

- project: HoloSync; canonical repository: `https://github.com/YuShimoji/holosync.git`; default branch: `main`.
- active delivery branch: `codex/workflow-handoff`, tracking the canonical GitHub remote named `github` on this workstation. Resolve remotes by URL on other machines. Local `origin` is the legacy GitLab mirror and is not the parity source.
- verified delivery code: `3cdd3a7` (queue/header pointer repair); prior playback/search delivery is `148b541`. The code repair was pushed to the canonical tracking branch before this documentation closeout. Draft PR #23 remains the delivery PR; no main merge was performed.
- active artifact: Web App (`index.html`, `scripts/`, `styles/`) and the rebuilt local Windows package.
- active slice / phase: automated Windows verification and independent F-04 comparison previews are complete. Real search is blocked only by the absent key in the normal default-origin settings. Human acceptance and F-04 direction remain pending; cross-port persistence is a newly reproduced unresolved decision.
- outcome: packaged pointer operations exposed and received a limited queue/header overlap repair; controlled network recovery and same-port restart have evidence. F-04 has two layout previews in five states, with no direction adopted or implemented.
- current authorization (verbatim): 「上記推奨について手動確認以外で進められる個所を進めてください。」 This covered automated package/network/search checks and F-04 comparison previews. Natural-outage observation and human viewing/operation judgment remain distinct; no dependency upgrade or persistence-contract change was authorized by this verification packet.

## Authorized Work and Delivery

The user's continuation instruction was: 「上記分析から推奨対応で進めてください。」 It adopted the playback/tile repairs, real-live observation, queue persistence, and existing-sidebar search consistency recommendations.

| Delivery               | Result                                                                                                                                                                                                                       | Implementation commit |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Tile identity and sync | Stable tile IDs distinguish same-video Focus/audio/manual leader/group/order; selection and duplicate tiles survive reload; rejoining leaders do not seek themselves. Legacy selections resolve to the first matching video. | `8a91dc0`             |
| Queue persistence      | Shared URL and JSON carry existing `q`/`qi`; presets retain queue/index and legacy `videoIds`; duplicate tiles restore; preset replacement uses normal tile cleanup. Legacy `?videos=` works with local storage available.   | `d00b99c`             |
| Sidebar search         | Five-item MRU history, immediate re-search/clear and string-query storage API; batched duration/view-count metadata; failures preserve selectable results; stale responses are ignored.                                      | `148b541`             |
| Queue pointer controls | Queue navigation and information-header positions no longer overlap; previous/next, Focus, audio master and information controls were exercised in the rebuilt package.                                                          | `3cdd3a7`             |

- implementation owner: independent Codex chat `01a19a5a-7a11-74f0-a742-67d516ae8eff`, host `local`, requested `gpt-6.1-terra / high`; implementation and push complete. Coordinator reviewed the limited diffs and acceptance evidence.
- documentation / real-network owner: independent Codex chat `01a19a59-f10a-7941-94c4-e1d2c69b35ea`, host `local`, requested `gpt-6-luna / low`. Earlier Full-Fit/postMessage documents were integrated; subsequent live verification did not edit product files.
- both chats were created in the HoloSync project and observed running. Model/effort arguments were accepted at creation; effective runtime settings were not independently read back. These are independent chats, not internal subagents.
- Windows packet owner: implementation chat above, continued with requested `gpt-6.1-terra / high`; package/GUI/product verification and bounded CSS repair complete. Follow-up checked the normal default-origin key without executing application scripts. Evidence: `C:/Users/PLANNER007/.codex/outputs/holosync-20261102/windows-acceptance/summary.json` and `search-followup.json`.
- F-04 packet owner: documentation / real-network chat above, continued with requested `gpt-6-luna / low`; external static layout comparisons complete under `C:/Users/PLANNER007/.codex/outputs/holosync-20261102/f04-preview/`. It did not edit product files or operate the Windows app. Requested settings were accepted; effective settings were not read back.
- both existing independent chats completed normally and are idle. Coordinator reviewed their evidence and owns this state/spec integration. File and GUI ownership did not overlap. Initial overall estimate was 45–90 minutes, preview estimate 20–40 minutes; the bounded key follow-up estimate was 10–20 minutes for inspection. Elapsed time was not a stop condition.
- initial implementation estimates were 45–90 minutes per packet, including verification/package/push. Actual packets completed earlier. Test startup/API-request selection issues and the string-query API mismatch found in review were corrected before delivery; time estimates were not stop conditions.

## Verification and Package

- final mocked checks: search regression 8/8; new queue pointer regressions 2/2; full Playwright 38/38; lint, targeted format and diff checks passed. Published GitHub E2E/lint checks succeeded at code head `3cdd3a7` on 2026-11-02; verify later documentation-head checks against their own head.
- prior focused evidence: tile identity/sync 7/7 and queue persistence 3/3. Queue URL measurement: one 50-item queue at index 49 plus a same-video ordinary tile produced 1,759 characters on localhost; receiving-environment limits vary.
- search UI: 320px sidebar history/results were checked with test fixtures. Coordinator reviewed both images and preserved local copies under `C:/Users/PLANNER007/.codex/outputs/holosync-20261102/search-ui/`. These are fixture images, not evidence of actual YouTube search.
- package: `dist/HoloSync-win32-x64/HoloSync.exe` was rebuilt after `3cdd3a7` on 2026-11-02. Coordinator independently compared all 23 app implementation files (Web + Electron main/preload) with the current tracked files: zero mismatches. Archive SHA-256: `4e8f43bf55c2f4ecdb9b93b9ed81876176139e1eade102e0e544c8b745c70f2f`. Packaged pointer operations now have evidence below.
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

## Windows Verification and F-04 Previews

- Packaged Electron, isolated profiles, three actual public lives: initial batch play, pause/resume and sync were observed. Playback code was `148b541`; the later CSS-only queue repair was rebuilt and separately exercised with real pointer operations. Existing public URLs must be rechecked for later runs.
- Controlled app-context offline/online: after about 30 seconds offline, two players buffered; about 20 seconds after restoration all three were in state 1. Over the next 15 seconds currentTime advanced about 15.31 / 3.20 / 15.08 seconds. This proves endpoint progress only; one stream did not progress smoothly, and natural-outage reliability/human viewing acceptance are not established. Zero seekTo commands were recorded in the marked zero-offset outage/recovery interval.
- Intentional pause survived a separate offline/online sequence, with all three in state 2 and no new play commands in that interval. Same-port restart retained four tiles, a duplicate video, queue position, Focus and audio master. Queue construction used an internal API; subsequent queue/Focus/audio/info operations used packaged pointer input. Coordinator also reviewed the 12-tile fixture image.
- Real search: the normal profile at `http://localhost:19876` has its database but no configured `youtubeApiKey`. Chromium IndexedDB readback was performed with application scripts disabled; secret values were never returned/logged. Changed app setting files were restored to prior bytes/absence. Other old development origins were not inspected. Search remains untested until the operator enters an existing key via Settings > API key, closes the app and requests continuation; never send the key through chat.
- Port conflict: a four-tile session saved at fallback port19877 was absent on restart at19876 and visible again on revisiting19877. This is origin-scoped storage, not demonstrated deletion. Choosing fail-on-conflict versus stable/shared persistence changes startup or persistence behavior; neither was implemented. Details: `docs/PERSISTENCE.md` and Windows `summary.json`.
- F-04 previews: `f04-preview.html`, `comparison-sheet.png`, `README.md` and hashes under the external preview path above. The preview owner and Coordinator reviewed the two-layout/five-state images. All media are placeholders; the layout options and Calm Utility / Operator Desk / Session Builder remain unselected. This is an exploration deliverable, not a product behavior test.
- All new evidence is local-only outside the repository. The verifier closed its apps; the preview owner closed its browser/server. No background verification remains running.

## Remaining Work and Boundaries

- next owner: operator for key entry and subjective viewing/operation acceptance; then reuse the Windows verification chat for actual search. Cross-port persistence needs a startup/persistence decision before a separate repair packet; F-04 implementation needs a direction decision. No automatic continuation is running while these inputs are absent.
- F-04 main-area search and broad visual direction: compare the recorded reversible candidates in `docs/specs/ux-refinement-phase1.md` before full implementation. Right-side tray plus Operator Desk is a recorded recommendation, not approval.
- SP-007 channel-related search remains unimplemented; history/filter/metadata delivery does not close that separate feature group.
- dependency audit observed on 2026-11-02: 26 total (18 moderate, 8 high), versus the older August observation of 9. Omit-dev audit was zero; Electron is classified as a dev dependency but ships in the app. No dependency update was performed; assess upgrades separately.
- holds: broad sidebar/add-flow replacement and YouTube OAuth/account history sync. Frozen without explicit re-approval: accessibility expansion, telemetry, plugins, PWA, full i18n, advanced audio processing, collaboration.
- external status is not a second hand-edited source. No generated external cockpit has been delivered; GitHub Wiki/Issues/Project must not replace this file and `docs/spec-index.json`. Legacy GitLab cleanup remains an unadopted decision.

## Resume and Evidence

1. Read `docs/AI_RULES.md`, this file, and the relevant indexed spec. Use Node >=22.12.0; this workstation has Node 22.19.0/npm 10.9.3 and restored Playwright/Electron dependencies.
2. Fetch the remote whose URL is canonical GitHub. While PR #23 remains open, use the active delivery branch and ff-only synchronization; do not assume old recorded hashes are the new head.
3. Resume real search after key entry, or the separately selected persistence/UI packet. Reuse existing evidence; full F-04/visual implementation still needs its direction decision. A key gate does not block an independently authorized packet.
4. Reuse valid evidence. Run focused checks for new changes and package verification when required by `docs/AI_RULES.md`.

Earlier committed mocked review evidence remains under `docs/verification/2026-07-07/` (SP-023) and `docs/verification/2026-07-06/` (SP-022). It does not establish real-live acceptance. Feature behavior belongs in the indexed specs.
