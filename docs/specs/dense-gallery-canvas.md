# SP-022: Objective Dense Gallery Canvas

**Status**: done
**Priority**: P1
**Category**: ui
**Created**: 2026-07-06
**Last updated**: 2026-07-07

## Purpose

Make HoloSync more comfortable for scanning many simultaneous streams by adding a dense gallery layout that uses the main canvas efficiently without changing the playback model.

## Implemented Behavior

- `layoutSelect` includes `Dense`.
- `Dense` uses the normal grid path with `.layout-dense`, not free/cell positioning.
- Dense now uses an objective layout planner in `scripts/dense-layout-planner.js`:
  - input: usable stage width, usable stage height, tile count, target tile aspect ratio, gap, padding, and chrome mode.
  - candidate column counts are enumerated from `1..tileCount`.
  - rows are derived as `ceil(tileCount / columns)`.
  - each candidate computes capacity, empty slots, tile width, tile height, visible tile area, total capacity tile area, usable stage area, area utilization, horizontal slack, vertical slack, slack ratios, score components, and reason.
  - the selected candidate is applied through `.dense-mosaic-ready`, `--dense-template-columns`, `data-dense-cols`, and `data-dense-rows`.
- Existing controls remain reachable: tile action buttons, sync badge, info header, and playback controls appear on hover and on keyboard focus within the tile.
- Existing modes remain separate: `auto`, `1`, `2`, `3`, `4`, `theater`, and `free` keep their previous class paths.

## Objective Function

Equal 16:9 tiles inside a 16:9 stage cannot always fill 100 percent for arbitrary tile counts. With 12 tiles, `4x3` and `3x4` are natural equal-tile candidates. Without gap and padding, they can have equal tile area: `4x3` consumes width and leaves vertical slack, while `3x4` consumes height and leaves horizontal slack.

HoloSync Dense therefore does not choose by visual guesswork, largest columns, or first fit. It uses this deterministic score:

```text
score =
  areaUtilization * 1.00
  - verticalSlackRatio * 1.15
  - horizontalSlackRatio * 0.18
  - max(horizontalSlackRatio, verticalSlackRatio) * 0.18
  - emptySlotRatio * 0.20
  - minTileWidthPenaltyRatio * 0.12
```

Tie-breaker order:

1. Higher score.
2. Lower vertical slack.
3. Lower maximum axis underuse.
4. Larger visible tile area.
5. Fewer columns.

Vertical slack is intentionally weighted more strongly than horizontal slack because unused top/bottom stage space was the reported SP-022 failure mode and weakens the observation-desk feel more than side gutters on a multi-live canvas.

## 12-Tile 1280x720 Result

For the normal 1280x720 collapsed-chrome screenshot, the planner selects `3x4`.

The candidate table is generated at:

- JSON: `docs/verification/2026-07-06/sp-022-dense-layout-planner-1280x720.json`
- Markdown: `docs/verification/2026-07-06/sp-022-dense-layout-planner-1280x720.md`

The selected result must explicitly compare `3x4`, `4x3`, `5x3`, and `6x2`. In the measured 1280x720 normal state, `3x4` wins because it preserves useful tile area while nearly eliminating vertical slack. `4x3` keeps larger individual tiles but leaves the top/bottom stage underused, and `6x2` reintroduces the top-strip failure pattern.

## Evidence

- Regression check: `npx playwright test e2e/ui-regression.spec.ts --workers=1`
- Planner and screenshot command: `npx playwright test e2e/dense-gallery.spec.ts --workers=1`
- Readback artifacts:
  - `docs/verification/2026-07-06/sp-022-dense-layout-planner-1280x720.json`
  - `docs/verification/2026-07-06/sp-022-dense-layout-planner-1280x720.md`
- Screenshot artifacts:
  - `docs/verification/2026-07-06/sp-022-dense-gallery-normal-selected-3x4-1280x720.png`
  - `docs/verification/2026-07-06/sp-022-dense-gallery-hover-controls-selected-3x4-1280x720.png`
  - `docs/verification/2026-07-06/sp-022-dense-gallery-chrome-selected-3x4-1280x720.png`

## Review Debt

- The planner makes Dense selection objective and readbackable, but final fan scanning comfort still requires human review of the generated normal, hover/control, and chrome-visible screenshots.
- Real multi-live playback reliability remains separate and must not be claimed from mock-tile screenshots.

## Boundaries

- This slice does not implement F-04 main-area search.
- This slice does not validate real multi-live playback reliability.
- This slice does not crop videos or introduce a non-default crop mode.
- The screenshot uses neutral mock visual fills and blocks YouTube/thumbnail network requests; it verifies dense layout and chrome use, not real public stream content.
