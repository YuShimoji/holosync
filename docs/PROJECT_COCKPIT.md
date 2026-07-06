# Project Cockpit

This file is a navigation aid, not a rule source. Current rules remain in `docs/AI_RULES.md`; current state remains in `docs/runtime-state.md`.

## Active Artifact

- HoloSync Web App: `index.html`, `scripts/`, `styles/`

## Current Slice

- SP-022 Dense Gallery Canvas Phase 1.5
- Spec: `docs/specs/dense-gallery-canvas.md`
- Review artifacts:
  - `docs/verification/2026-07-06/sp-022-dense-gallery-normal-1280x720.png`
  - `docs/verification/2026-07-06/sp-022-dense-gallery-hover-controls-1280x720.png`
  - `docs/verification/2026-07-06/sp-022-dense-gallery-chrome-1280x720.png`

## Next Review

- Judge whether the corrected height-aware Dense mosaic makes 8-12 simultaneous streams easier to scan.
- First checks for re-entry: `git rev-list --left-right --count HEAD...origin/main`, then open the three SP-022 Dense review screenshots above.
- Keep F-04 search, real multi-live reliability, and broad icon unification separate unless a later slice explicitly promotes them.
