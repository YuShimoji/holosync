# Issue Drafts (20260224_034312)

This file is generated because GitHub API auth was not available.

## 1. fix(account): stabilize app watch-history and YouTube-history flow

**Labels**: type::bug, priority::P1

Background:
- Embedded playback may not always reflect in YouTube account history.
- Local app-side history must always persist.

Done criteria:
- App-side watch history is recorded after meaningful playback.
- History items can restore a tile with one click.
- A direct open path to youtube.com/watch is available.

---

## 2. fix(layout): remove title space pressure and maximize video viewport

**Labels**: type::bug, priority::P1

Background:
- Header/title rows consume playable area.

Done criteria:
- Tile title uses overlay style on video.
- Toolbar collapse + immersive mode maximize visible area.

---

## 3. fix(fullscreen): prevent fullscreen lock-in and guarantee exit paths

**Labels**: type::bug, priority::P1

Done criteria:
- Esc exits fullscreen reliably.
- Exit button works while fullscreen is active.
- F11 immersive toggle and fullscreen behavior do not conflict.

---

## 4. feat(layout): allow user-controlled tile order and front stacking

**Labels**: type::feature, priority::P2

Done criteria:
- Tile order can be moved left/right.
- Drag start brings target tile to front in free layout.
- Order is persisted.

---

## 5. fix(meta): description panel always shows meaningful state

**Labels**: type::bug, priority::P1

Done criteria:
- Existing tiles refresh description after API key change.
- Clear hint appears when API key is missing or API fetch fails.

---

## 6. chore(workflow): adopt and maintain shared-workflows submodule

**Labels**: type::task, priority::P1

Done criteria:
- .shared-workflows is managed as submodule (main tracking).
- scripts/session-start.ps1 resolves workflow assets from submodule first.
- docs/WORKFLOW.md includes init and update commands.

---

## 7. test(e2e): add regression coverage for latest UI hotfixes

**Labels**: type::test, priority::P2

Add Playwright cases for:
- fullscreen enter/exit
- watch-history recording and restore
- title overlay and info expansion
- toolbar collapse and immersive mode

---

