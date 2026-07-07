# Project Cockpit

This file is a navigation aid, not a rule source. Current rules remain in `docs/AI_RULES.md`; current state remains in `docs/runtime-state.md`.

## Active Artifact

- HoloSync Web App: `index.html`, `scripts/`, `styles/`

## Current Slice

- SP-022 Objective Dense Gallery Canvas
- Spec: `docs/specs/dense-gallery-canvas.md`
- Planner readback:
  - `docs/verification/2026-07-06/sp-022-dense-layout-planner-1280x720.json`
  - `docs/verification/2026-07-06/sp-022-dense-layout-planner-1280x720.md`
- Review artifacts:
  - `docs/verification/2026-07-06/sp-022-dense-gallery-normal-selected-3x4-1280x720.png`
  - `docs/verification/2026-07-06/sp-022-dense-gallery-hover-controls-selected-3x4-1280x720.png`
  - `docs/verification/2026-07-06/sp-022-dense-gallery-chrome-selected-3x4-1280x720.png`

## Next Review

- Review the objective planner readback first, then judge whether the selected Dense mosaic makes 8-12 simultaneous streams easier to scan.
- First checks for re-entry: `git rev-list --left-right --count HEAD...origin/main`, then open the SP-022 planner readback and the three Dense review screenshots above.
- Keep F-04 search, real multi-live reliability, and broad icon unification separate unless a later slice explicitly promotes them.
