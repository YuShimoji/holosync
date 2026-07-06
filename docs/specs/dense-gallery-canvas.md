# SP-022: Dense Gallery Canvas Phase 1.5

**Status**: done
**Priority**: P1
**Category**: ui
**Created**: 2026-07-06
**Last updated**: 2026-07-06

## Purpose

Make HoloSync more comfortable for scanning many simultaneous streams by adding a dense gallery layout that uses the main canvas more efficiently without changing the playback model.

## Implemented Behavior

- `layoutSelect` includes `Dense`.
- `Dense` uses the normal grid path with `.layout-dense`, not free/cell positioning.
- Dense now uses a height-aware mosaic fit instead of a fixed `auto-fill` strip:
  - input: tile count, visible canvas width, visible canvas height, current gap, and 16:9 tile aspect.
  - candidate column counts are scored by useful visible tile area while staying inside the visible canvas.
  - the selected column count and tile width are applied through `.dense-mosaic-ready` and CSS variables.
- For 12 tiles at 1280x720 with sidebar and toolbar collapsed, the expected layout is 4 columns x 3 rows, centered on a dark video-stage canvas.
- With sidebar and toolbar visible, the same algorithm may choose a narrower/taller mosaic, such as 3 columns x 4 rows, to keep the visible app chrome in context.
- Existing controls remain reachable: tile action buttons, sync badge, info header, and playback controls appear on hover and on keyboard focus within the tile.
- Existing modes remain separate: `auto`, `1`, `2`, `3`, `4`, `theater`, and `free` keep their previous class paths.

## Evidence

- Regression check: `npx playwright test e2e/ui-regression.spec.ts --workers=1`
- Review screenshot command: `npx playwright test e2e/dense-gallery.spec.ts`
- Screenshot artifacts:
  - `docs/verification/2026-07-06/sp-022-dense-gallery-normal-1280x720.png`
  - `docs/verification/2026-07-06/sp-022-dense-gallery-hover-controls-1280x720.png`
  - `docs/verification/2026-07-06/sp-022-dense-gallery-chrome-1280x720.png`

## Visual Acceptance Correction

- The earlier Phase 1 screenshot failed review because 12 tiles collapsed into a top-aligned wide strip with large blank bottom space.
- Phase 1.5 corrects that by centering a height-aware mosaic on a dark neutral stage and by guarding the 1280x720 12-tile case in Playwright.
- Review debt remains subjective: real fan scanning comfort and density should still be judged by a human using the generated screenshots and, later, real multi-live playback.

## Boundaries

- This slice does not implement F-04 main-area search.
- This slice does not validate real multi-live playback reliability.
- The screenshot uses neutral mock visual fills and blocks YouTube/thumbnail network requests; it verifies dense layout and chrome use, not real public stream content.
