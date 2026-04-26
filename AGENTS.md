# AGENTS.md

Codex adapter for HoloSync.

## Read First

1. `docs/AI_RULES.md`
2. `docs/runtime-state.md`
3. Relevant spec under `docs/specs/` only when the task touches that feature

## Adapter Rules

- Keep this file thin.
- Do not duplicate operational rules here.
- Do not use stale handoff, audit, or compact notes as decision sources.
- If a document is missing from the read list, do not invent a replacement; rely on the two files above and the current task.
