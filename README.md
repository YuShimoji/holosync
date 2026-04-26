# HoloSync

HoloSync is a local Web + Electron app for viewing and synchronizing multiple YouTube videos at once.

## Features

- Add YouTube videos from URLs.
- View multiple videos in one grid.
- Control play, pause, sync, volume, speed, layout, and focus modes.
- Use the Electron wrapper for local desktop verification.

## Local Use

```bash
npm install
npm start
```

For browser development:

```bash
npm run dev
```

## Build

```bash
npm run build
```

The Windows package is generated at:

```text
dist/HoloSync-win32-x64/HoloSync.exe
```

`npm run build` downloads Electron assets through `electron-packager`, so network failures do not necessarily mean code failures. Use `npm run lint` or `npm run format:check` for local validation when build infrastructure is unavailable.

## Development

- AI operation rules: `docs/AI_RULES.md`
- Current project state: `docs/runtime-state.md`
- Feature spec index: `docs/spec-index.json`
- Testing notes: `docs/TESTING.md`

Do not edit files under `dist/` directly; rebuild from source instead.
