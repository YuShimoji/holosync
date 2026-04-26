# Invariants

Non-negotiable project constraints for HoloSync.

## Product Boundaries

- HoloSync is a local YouTube multi-video viewing and synchronization app.
- YouTube iframe cross-origin restrictions are treated as hard constraints.
- Do not implement features that require reading iframe internals unless a verified API path exists.
- External browser navigation must remain blocked unless the user uses an explicit open-external action.

## UX Invariants

- Video viewing space has priority over control density.
- Focus / Quick Fit / Immersive / Theater modes must remain distinct and reversible.
- User-visible controls should reduce clutter, not add parallel ways to perform the same frequent action.
- Manual visual judgment and operation feel remain user-owned.

## Test Discipline

- Add tests only when the verification purpose is clear and regression risk is concrete.
- Do not add existence-only tests that check attachment or visibility without behavior.
- Do not expand E2E or manual checklists as routine maintenance.
- If a low-value test fails, choose between fixing the underlying behavior or deleting the test; do not preserve noise.
