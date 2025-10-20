# SECURITY: postMessage Hardening

## Summary

- Enforce strict target origin for `postMessage` to the YouTube iframe
- Whitelist allowed player commands and sanitize arguments
- Add safe iframe attributes (`loading=lazy`, `referrerpolicy=origin`)

## Context

- File: `scripts/main.js`
- Functions: `sendCommand()`, iframe creation in `createTile()`
- Rationale: Prevent accidental or malicious misuse of `postMessage` payloads and reduce attack surface

## Changes

- `ALLOWED_ORIGIN = "https://www.youtube.com"`
- `ALLOWED_COMMANDS = { playVideo, pauseVideo, mute, unMute, setVolume }`
- `sanitizeArgs()` clamps `setVolume` to `[0,100]` and defaults to `50` if invalid
- Iframe attributes: `loading=lazy`, `referrerpolicy=origin`

## Non-Goals

- No message event listener is used currently; receive-side validation is not applicable
- `legacy/` is excluded from lint/CI and left unchanged for now

## Future Work

- Expand whitelist if new YouTube IFrame API commands are introduced
- Consider Content Security Policy (CSP) tightening, if hosting environment allows

## Manual Verification

1. Add several videos and verify commands:
   - Play, pause, mute/unmute, volume slider
2. DevTools: confirm `postMessage` target origin is always `https://www.youtube.com`
3. Attempt invalid volume values (e.g., -10, 1000); verify clamping to `[0,100]`
