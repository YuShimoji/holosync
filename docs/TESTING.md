# Testing Notes

## Policy

- Run tests when they answer a specific risk.
- Do not expand checklists or E2E count by default.
- Documentation-only changes require formatting checks only.

## Useful Commands

- `npm run lint`
- `npm run format:check`
- `npm run format:check:state`
- `npx playwright test`

After the first `npm ci` on a new workstation, install the local test browser once with `npx playwright install chromium`. Linux CI uses `npx playwright install --with-deps chromium`.

Normal Playwright runs write generated screenshots and readbacks under ignored `test-results/` paths, so verification does not dirty tracked review evidence. Regenerate the committed SP-022/SP-023 review artifacts only when intentionally accepting new evidence:

```powershell
$env:UPDATE_REVIEW_ARTIFACTS = '1'
npx playwright test e2e/dense-gallery.spec.ts e2e/live-reliability-probe.spec.ts --workers=1
Remove-Item Env:UPDATE_REVIEW_ARTIFACTS
```

## Manual Checks

Use manual checks only when behavior or visual feel changed:

- Add a valid YouTube URL and confirm a tile is created.
- Add multiple videos and confirm sync controls still work.
- Toggle sidebar, toolbar, Quick Fit, Focus, and Immersive modes.
- Confirm packaged-app behavior through `dist/HoloSync-win32-x64/HoloSync.exe` after a rebuild.
