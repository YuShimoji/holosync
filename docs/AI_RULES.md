# HoloSync AI Rules

This is the single AI-operation rules file for HoloSync.

## Operating Defaults

- Work from the active artifact in `docs/runtime-state.md`.
- Prefer implementation and verification over process artifacts.
- Ask only for high-impact product, UX, architecture, scope, or irreversible decisions.
- Before asking, check the current task, `docs/runtime-state.md`, and the relevant feature spec.
- Do not ask the user to repeat context already present in those files.

## Source Priority

1. User instruction in the current thread.
2. `docs/AI_RULES.md`.
3. `docs/runtime-state.md`.
4. Relevant feature specs listed in `docs/spec-index.json`.
5. Code and tests.

Do not use deleted, archived, compact, handoff, or audit notes as current guidance.

## Decision Discipline

- A selected option means “evaluate or specify next,” not implementation approval, unless the user explicitly approves implementation.
- Rejected, held, quarantined, or responsibility-external work must not re-enter normal options without explicit re-approval.
- Each proposed next action must name the bottleneck it resolves and the owned artifact it changes.
- Do not compensate for previous sessions by swinging to the opposite kind of work; choose the current bottleneck.

## Documentation Discipline

- Keep durable project state short and current.
- Write state changes to `docs/runtime-state.md`.
- Write feature behavior to the relevant spec in `docs/specs/`.
- Update `docs/spec-index.json` when adding, deleting, or changing feature specs.
- Do not create new handoff logs, audit ledgers, status registries, or duplicate rule files.

## Verification Discipline

- Use evidence appropriate to the change.
- For code changes, start with the narrowest useful validation.
- Do not grow E2E or manual checklists unless a concrete regression risk justifies it.
- Documentation-only changes do not require Electron rebuilds or E2E runs.

## Reporting

- Be concise and specific.
- Separate manual verification requests from next-direction choices.
- Do not offer commit/no-commit as a strategic option.
- Call out stale or uncertain evidence instead of presenting it as fact.
