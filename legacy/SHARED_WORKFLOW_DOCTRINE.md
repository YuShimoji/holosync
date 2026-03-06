# Shared Workflow Doctrine

Last updated: 2026-02-14

## Purpose
Define a stable operating model for this repository so execution control and backlog management do not drift.

## Decision
Adopt a split-SSOT model:

1. Execution Control SSOT: `.cursor/MISSION_LOG.md`
2. Backlog SSOT: `docs/ISSUES.md`
3. Session/Change Log: `AI_CONTEXT.md`
4. Test Evidence: `docs/TESTING.md` and `test-artifacts/`

This repository should not use a single file as both execution controller and backlog tracker.

## Operational Rules

1. `MISSION_LOG` controls phase, in-progress work, blockers, and immediate next actions.
2. `docs/ISSUES.md` controls feature scope, acceptance criteria, and long-term prioritization.
3. Every execution session updates both:
   - `MISSION_LOG`: current state and next actions.
   - `AI_CONTEXT.md`: what changed and what remains.
4. A task can be marked done only if:
   - Acceptance criteria exist in `docs/ISSUES.md`.
   - Evidence exists in `docs/TESTING.md` or `test-artifacts/`.
5. If conflicting information exists, resolve in this order:
   - `MISSION_LOG` for current session execution.
   - `docs/ISSUES.md` for scope and priority.
   - `AI_CONTEXT.md` for historical context.

## Phase Discipline

Phases are executed in order and cannot be skipped:

`P0 -> P1 -> P1.5 -> P1.75 -> P2 -> P3 -> P4 -> P5 -> P6`

Phase meanings are defined in `prompts/orchestrator/modules/`.

## Development-Ready Gate

A task is ready to start when all are true:

1. Task exists in `docs/ISSUES.md` with acceptance criteria.
2. `MISSION_LOG` has a matching item in `Next Tasks`.
3. Current phase module exists and is readable.
4. Test strategy for the task is identified in `docs/TESTING.md`.
5. Branch naming is aligned with `docs/WORKFLOW.md`.

## Anti-Drift Policy

1. Do not maintain duplicated active task lists in multiple files.
2. Do not move to next phase without updating `MISSION_LOG`.
3. Do not close a task without evidence link.
4. If ambiguity appears, update this doctrine first, then proceed.
