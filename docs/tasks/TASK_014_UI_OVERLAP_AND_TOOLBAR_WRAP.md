# TASK 014: UI Overlap And Toolbar Wrap Follow-up

Date: 2026-02-27
Owner: Orchestrator/Driver (Codex)
Status: In Progress

## Context

This ticket captures the user-reported regressions after the previous hotfix wave.

## Reported Issues

1. Bottom title and description toggle overlap YouTube player controls.
2. Description toggle behavior changes after window resize, and expansion can stop working.
3. Toolbar buttons (notably `Share` and `Frameless On`) wrap to a second line and make header height thicker.

## Analysis Summary

1. Persisted tile size (`tileWidth`/`tileHeight`) was being applied outside free/cell mode.
2. Fixed-height tile state could clash with non-free layouts, leading to clipped or unstable title/description area.
3. Toolbar used a normal flex row without no-wrap/overflow safeguards, so narrow widths caused line wrapping.

## Implemented In This Step

1. Restrict persisted tile size application to free/cell mode only.
2. Ensure cell mode explicitly applies either custom size or cell default size.
3. Make content toolbar non-wrapping and horizontally scrollable on narrow widths.
4. Force button labels (share-style controls) to stay on one line.

## Validation

1. Run `npm run lint`.
2. Run targeted E2E smoke tests:
   - `page loads successfully`
   - `can add YouTube video`
3. Manual verification in Electron build:
   - Theater layout with resize events.
   - Toolbar in narrow window width.

## Next

1. Add dedicated Playwright scenario for description toggle visibility/clickability after viewport resize.
2. Add layout regression checks for toolbar wrapping in narrow widths.
