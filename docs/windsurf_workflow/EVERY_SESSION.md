# EVERY_SESSION

Last updated: 2026-02-14

## Goal
Standardize each orchestrator session with predictable control flow and updates.

## Session Procedure

1. Read `.cursor/MISSION_LOG.md`.
2. Read `prompts/orchestrator/modules/00_core.md`.
3. Read the current phase module only.
4. Execute actions for the current phase.
5. Update `.cursor/MISSION_LOG.md` before ending.
6. Record implementation/test notes in `AI_CONTEXT.md`.
7. Reflect scope/progress updates in `docs/ISSUES.md` when needed.

## Worker Delegation Shortcut

When the operator says "execute TASK_XXX", perform:

1. Find the matching task in `docs/ISSUES.md`.
2. Extract acceptance criteria and target files.
3. Generate worker prompt with:
   - Objective
   - Constraints
   - Implementation scope
   - Validation steps
4. Execute worker task.
5. Merge and verify results.
6. Update `MISSION_LOG` and `AI_CONTEXT`.

## Stop Conditions

If stopping mid-session, always output:

1. Why execution stopped.
2. What is completed.
3. What is blocked.
4. Exactly what to do next.

Never stop without updating `MISSION_LOG`.
