# SP-014: Frameless Drag Stabilization + Inventory Notes

## Scope
- Electron frameless mode with iframe-based players
- Safe drag UX under `app-region: drag` constraints
- Inventory only for existing features:
  - Channel live monitoring
  - Playlist load
  - Watch history

## Decisions
- Adopt explicit drag handle approach for frameless mode.
- Do not broaden drag area to entire toolbar/content.
- Keep at least one drag path available even when toolbar is hidden/immersive.

## Implemented Baseline
- Dedicated drag handle is injected by `scripts/electron.js` and used only in frameless mode.
- `styles/main.css` uses no-drag on toolbar area and drag only on `.frameless-drag-handle`.
- Channel polling guard prevents overlapping checks.
- Channel interval input is clamped to 1-60 minutes.

## Inventory Outcomes (4/5/6)
- 4. Channel monitor: keep current feature set; prioritize stability (re-entrancy guard, interval validation).
- 5. Playlist load: current flow is valid; larger pagination control can be split to another PR.
- 6. Watch history: capture works; resume-from-history can be handled in a separate PR.

## Out of Scope for This Task
- New large feature additions
- Architecture changes
- Dist build artifact edits
