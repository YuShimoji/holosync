# 00_core

## Core Rules

1. Reply in Japanese.
2. Treat `data/presentation.json` as presentation SSOT.
3. Use `.cursor/MISSION_LOG.md` as execution SSOT.
4. Do not skip phase order.
5. Always leave explicit next actions.

## Standard Loop

1. Read `MISSION_LOG`.
2. Read this core module.
3. Read only the current phase module.
4. Execute.
5. Update `MISSION_LOG`.
6. Output using fixed 5 sections.

## Fixed 5 Sections

1. `Status`
2. `Current Phase`
3. `Actions Taken`
4. `Blockers/Risks`
5. `Next Actions`
