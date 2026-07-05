# SP-022: Dense Gallery Canvas Phase 1

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
- The preset uses smaller tile minimums than `auto` and tight default spacing so 8-12 tiles can be scanned at desktop sizes.
- When sidebar and toolbar chrome are collapsed, quick-fit is active, or immersive-like chrome is hidden, the dense grid can use a more compact tile minimum.
- Existing controls remain reachable: tile action buttons, sync badge, info header, and playback controls appear on hover and on keyboard focus within the tile.
- Existing modes remain separate: `auto`, `1`, `2`, `3`, `4`, `theater`, and `free` keep their previous class paths.

## Evidence

- Regression check: `npx playwright test e2e/ui-regression.spec.ts --workers=1`
- Review screenshot command: `npx playwright test e2e/dense-gallery.spec.ts`
- Screenshot artifact: `docs/verification/2026-07-06/sp-022-dense-gallery-1280x720.png`

## Boundaries

- This slice does not implement F-04 main-area search.
- This slice does not validate real multi-live playback reliability.
- The screenshot uses neutral mock visual fills and blocks YouTube/thumbnail network requests; it verifies dense layout and chrome use, not real public stream content.
