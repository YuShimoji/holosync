# AGENTS.md

# Codex adapter. Keep thin.

# Canonical source of truth lives in docs/ai/\*.md and project-local canonical docs.

## Read order

1. `docs/ai/CORE_RULESET.md`
2. `docs/ai/DECISION_GATES.md`
3. `docs/ai/STATUS_AND_HANDOFF.md`
4. `docs/ai/WORKFLOWS_AND_PHASES.md`
5. `docs/INVARIANTS.md`
6. `docs/USER_REQUEST_LEDGER.md`
7. `docs/OPERATOR_WORKFLOW.md`
8. `docs/INTERACTION_NOTES.md`
9. `docs/runtime-state.md`
10. `docs/project-context.md`
11. `docs/FEATURE_REGISTRY.md`
12. `docs/AUTOMATION_BOUNDARY.md`

## Adapter rules

- Do not treat this file as the place to restate the whole ruleset.
- Project-local canonical docs are factual memory and should be used before asking the user to repeat context.
- Read-only phases stay read-only.
- Selection of a proposed item is not implementation approval.
- Human-owned creative/manual work does not become assistant-owned by default.
