# HoloSync AI Rules

This is the single AI-operation rules file for HoloSync.

## Operating Defaults

- Work from the active artifact and slice in `docs/runtime-state.md`.
- Prefer an outcome-sized implementation over file-sized or question-sized tasks.
- Continue through implementation, related repairs, focused verification, and state/spec updates without pausing for routine approval.
- Ask only for high-impact product, UX, architecture, scope, irreversible, or contract-changing decisions.
- Uncertainty alone is not a blocker. Make a reversible assumption or run a bounded probe when that can answer the question safely.
- Before asking, check the current task, `docs/runtime-state.md`, the relevant feature spec, and applicable constraints in `docs/INVARIANTS.md`.
- Do not ask the user to repeat context already present in those sources.
- Keep one active implementation slice. A human-only gate may pause that slice, but must not block an explicitly named independent exploration or audit lane.

## Source Priority

1. User instruction in the current thread.
2. `docs/AI_RULES.md`.
3. `docs/runtime-state.md`.
4. Applicable constraints in `docs/INVARIANTS.md`.
5. Relevant feature specs listed in `docs/spec-index.json`.
6. Code and tests.

Do not use deleted, archived, compact, handoff, IDE-local, or audit notes as current guidance.

## Supervisor-to-Developer Work Packet

The supervising AI should produce one self-contained packet for a reviewable outcome, not a sequence of prompts for individual files, tests, or micro-fixes. One packet should include the implementation, directly related corrections, proportionate verification, and durable state updates that belong to the same outcome.

Use one of these modes:

- `explore`: investigate and compare directions; do not implement a selected direction yet.
- `implement`: explicit authorization to implement the resolved direction within the packet's scope.
- `verify`: gather evidence or reproduce a risk without broad product changes.

Every packet should contain:

```text
Mode: explore | implement | verify
Outcome: the user-observable or decision-changing result
Bottleneck: why this is the most useful slice now
In scope: behavior and artifacts owned by this packet
Non-goals: adjacent work that must remain separate
Resolved decisions: choices that must not be reopened
Developer discretion: reversible details the developer may decide autonomously
Stop only if: high-impact decisions or contract changes that require the user
Acceptance evidence: checks, screenshots, readback, or manual observation needed
Closeout updates: runtime-state and any spec/index changes required
Fallback lane: independent exploration/audit work allowed while a human-only gate waits
```

If low-impact detail is missing, the developer should infer it from the current sources and proceed. If the packet says `Mode: implement`, routine implementation choices inside `Developer discretion` are already authorized.

## Autonomy and Stop Conditions

- Reversible code, copy, styling, test, documentation, and local tooling changes inside the active packet do not require another approval round.
- Stop for irreversible or hard-to-recover loss of user data or artifacts; dependency additions or major upgrades; DB, auth, security-boundary, or public API contract changes; conflicting product requirements; or a high-variance product/UX choice with materially different user outcomes. Version-controlled cleanup inside the active packet is reversible and does not require a separate stop.
- When evidence is missing, prefer the smallest probe that can resolve it. Do not convert every unknown into a user question.
- Do not let a manual verification gate serialize unrelated work. Record the gate, then use the packet's fallback lane without silently starting another implementation slice.
- After two consecutive maintenance or workaround blocks, re-read the active outcome and return to its shortest path.

## Product and Design Checkpoint

High-variance UI, information architecture, visual language, interaction model, or content direction needs one checkpoint before full implementation:

1. Present 2-4 materially different directions, including a recommendation.
2. Show the smallest useful preview: annotated screenshot, static mock, CSS prototype, or interaction sketch.
3. Compare the user served, behavior changed, tradeoff, and implementation cost. Cosmetic variants of one idea do not count as different directions.
4. Ask one combined question that selects the direction and, when appropriate, explicitly authorizes `Mode: implement`.

After selection and implementation authorization, complete the chosen slice end to end. Do not repeatedly ask about spacing, color, icon, or copy decisions that fall inside the approved direction. Collect subjective refinements into one review pass after the integrated preview.

## Exploration Pulse

At orientation and when a slice closes, check for at most two useful proposals outside the immediate implementation path:

- **Advance:** remove the current delivery bottleneck.
- **Redirect:** simplify, delete, or change an assumption that is creating repeated friction.
- **Create:** open a nearby product, audience, content, or visual opportunity whose cost has become reasonable.

Each proposal must state its hypothesis, user benefit, cost, why it matters now, and what becomes possible if chosen. Keep proposals distinct; do not fill the list with maintenance and testing variants.

## Decision Discipline

- Selecting an option means evaluate or specify next unless the user or Work Packet explicitly authorizes `Mode: implement`.
- Rejected, held, frozen, quarantined, or responsibility-external work must not re-enter normal options without explicit re-approval.
- Each proposed next action must name the bottleneck it resolves and the owned artifact it changes.
- Do not compensate for previous sessions by swinging to the opposite kind of work; choose the current bottleneck.

## Documentation and External Status

- Keep `docs/runtime-state.md` short, dated, and current. It is the only hand-edited project-state source.
- Write feature behavior to the relevant spec in `docs/specs/` and update `docs/spec-index.json` when adding, deleting, or changing feature specs.
- Do not create handoff logs, audit ledgers, status registries, manual cockpit mirrors, or duplicate rule files.
- Do not hand-copy volatile state into README, Wiki, Project, or another dashboard. External status must be a one-way generated projection of `docs/runtime-state.md` and `docs/spec-index.json`.
- The supervisor owns packet quality and decision framing. The developer owns implementation evidence and in-repo state updates. Automation should own any external projection.
- Closeout is incomplete when implementation changed the current position but the relevant spec or `docs/runtime-state.md` was left stale.

## Verification Discipline

- Use evidence appropriate to the change and start with the narrowest useful validation.
- Do not grow E2E or manual checklists unless a concrete regression risk justifies it.
- Documentation-only changes require formatting/link checks, not Electron rebuilds or E2E runs.
- Rebuild the packaged app when a user-visible feature slice or UX batch completes, the user requests a package, or packaged behavior specifically needs verification.

## Reporting

- Lead with the completed outcome and why it changes the workflow or decision.
- State the verification performed, remaining uncertainty, and any manual gate separately.
- When several changes or next moves exist, compare them rather than listing disconnected status bullets.
- Offer 2-4 distinct next entries that release different bottlenecks and state what becomes possible after each.
- Do not offer commit/no-commit as a strategic option.
- Call out stale or uncertain evidence instead of presenting it as fact.
