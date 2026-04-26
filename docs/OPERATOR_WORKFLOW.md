# Operator Workflow

Human/operator workflow notes for HoloSync.

## Development Flow

- Assistant implements code changes.
- Assistant runs focused lint or tests when useful.
- Assistant rebuilds the Electron package only at meaningful checkpoints.
- User verifies final feel and behavior in `dist/HoloSync-win32-x64/HoloSync.exe` when needed.

## Build Checkpoint Policy

Run `npm run build` when one of these is true:

- A feature slice reaches done.
- A batch of user-visible UX fixes is complete.
- The user explicitly asks to build or wants to verify the packaged app.
- The session is ending and executable behavior changed since the last package build.

Do not rebuild for documentation-only changes, test-only changes, formatting-only changes, or comments.

## Ownership

- Assistant owns implementation, automated checks, and build execution.
- User owns visual judgment, operation feel, UX priority, and final real-app confirmation.
- If a change only touches docs, no Electron build or E2E run is required.
