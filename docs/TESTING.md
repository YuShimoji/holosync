# Testing Notes

## Policy

- Run tests when they answer a specific risk.
- Do not expand checklists or E2E count by default.
- Documentation-only changes require formatting checks only.

## Useful Commands

- `npm run lint`
- `npm run format:check`
- `npx playwright test`

## Manual Checks

Use manual checks only when behavior or visual feel changed:

- Add a valid YouTube URL and confirm a tile is created.
- Add multiple videos and confirm sync controls still work.
- Toggle sidebar, toolbar, Quick Fit, Focus, and Immersive modes.
- Confirm packaged-app behavior through `dist/HoloSync-win32-x64/HoloSync.exe` after a rebuild.
