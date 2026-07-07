# Issues

Current project issue board for HoloSync. Keep this file short and actionable.

## Active

- [ ] UI modernization / icon consistency.
  - User concern: current layout and icons do not feel modern, familiar, or visually unified.
  - Current state: SP-022 now uses an objective Dense layout planner with a dark video-stage canvas, selected 12-tile 3x4 fit at 1280x720, candidate readback artifacts, and hover/focus-visible control access. Broad icon unification still needs a separate design pass.
  - Inventory: global controls, tile controls, layout controls, destructive/reset controls, secondary utilities, icon-only buttons.
  - Mixed surfaces: emoji, inline SVG, text icons, 32px toolbar buttons, 28px tile buttons, and lower-contrast transparent buttons.
  - Next candidates: design tokens, inline SVG unification beyond touched dense surfaces, disabled states, and WCAG AA contrast checks.
- [ ] Multi-live playback stalls after adding additional live videos.
  - User concern: previously added live videos stop, and resume icon may not recover playback.
  - Current state: tile play/pause is now isolated to the clicked iframe and covered by regression test; real multi-live playback still needs manual validation.
- [ ] Tile reordering does not apply reliably.
  - User concern: drag appears to react, but the order does not persist/apply.
  - Current state: standard grid drag now reorders `videos` and DOM order, persists after reload, and is covered by regression test. Free mode still uses cell positioning.
- [ ] SP-021/F-04: Main-area search UI.
  - Needs product/UX direction for how search results should coexist with the video grid.
  - Current state: all other SP-021 items are implemented; SP-022 dense canvas is now available as the main-area visual baseline that F-04 can reuse.
- [ ] Format debt cleanup.
  - Current state: `npm run format:check` fails on existing files outside this maintenance slice.
  - Keep separate from feature fixes to avoid broad CRLF/LF and Prettier churn.

## Hold

- [ ] Sidebar structure redesign.
  - Candidate direction: move search/playlist concerns out of the sidebar.
  - Requires UX decision before implementation.
- [ ] Video-add flow refinement.
  - Requires UX decision before implementation.
- [ ] YouTube account / OAuth history sync.
  - Low priority until account integration has a clear value path.

## Frozen

- Accessibility expansion, telemetry, plugin architecture, PWA, i18n, advanced audio processing, and collaboration features remain out of the current slice.
