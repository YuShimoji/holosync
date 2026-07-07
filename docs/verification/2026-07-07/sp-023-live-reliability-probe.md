# SP-023 Live Reliability Probe Readback

- implementation_date: 2026-07-07
- implementation_version: sp-023-live-reliability-probe-2026-07-07
- run_id: sp023-2026-07-07T09-03-02-885Z
- evidence_kind: mocked player postMessage sequence
- real_live_playback_tested: no
- real_live_limit: no project-provided live URLs were used; this artifact validates the repeatable local probe path without credentials or public release.
- browser_surface: Playwright Chromium via local http-server
- screenshot: docs/verification/2026-07-07/sp-023-live-reliability-probe-debug-panel.png

## Scenario

1. Start with 3 probe tiles in sync group A.
2. Record play-all and transition all three to playing.
3. Add 3 more tiles while the first three remain playing.
4. Record pause-all, resume-all, and sync-all.
5. Export the probe snapshot for review without opening devtools.

## Action Timeline

| ms | action | tiles | playing | paused |
| ---: | --- | ---: | ---: | ---: |
| 99 | play-all | 3 | 0 | 0 |
| 120 | mark | 3 | 3 | 0 |
| 230 | pause-all | 6 | 6 | 0 |
| 279 | resume-all | 6 | 0 | 6 |
| 328 | sync-all | 6 | 6 | 0 |
| 333 | mark | 6 | 6 | 0 |

## Final Tile States

| tile | status | state | current_time | last_update_age_ms |
| --- | --- | --- | ---: | ---: |
| ProbeLive01 | playing | playing | 30 | 113 |
| ProbeLive02 | playing | playing | 31 | 113 |
| ProbeLive03 | playing | playing | 32 | 113 |
| ProbeLive04 | playing | playing | 33 | 113 |
| ProbeLive05 | playing | playing | 34 | 112 |
| ProbeLive06 | playing | playing | 35 | 112 |
