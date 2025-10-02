# Persistence: chrome.storage fallback to localStorage

## Summary
- Prefer `chrome.storage.local` when available
- Fallback to `localStorage` when `chrome.storage` is not present
- Keys: `videos` (string[] of 11-char IDs), `volume` (0..100)

## Implementation
- File: `scripts/main.js`
- Functions added:
  - `hasChromeStorage()`
  - `storageGet(defaults, cb)`
  - `storageSet(obj)`
- Replaced:
  - `persistVideos()` → uses `storageSet({ videos })`
  - `persistVolume(v)` → uses `storageSet({ volume: v })`
  - Initial restore → `storageGet({ videos: [], volume: 50 }, cb)`

## Safety
- JSON serialization/deserialization with try/catch
- Namespaced `localStorage` keys: `hs_<key>`
- Volume sanitized elsewhere to 0..100 via UI logic

## Manual Verification
1. Chrome (with `chrome.storage` present)
   - Add several videos; move volume
   - Reload: set is restored
2. Firefox/other browsers (without `chrome.storage`)
   - Repeat same; state persists via `localStorage`
3. Clear storage
   - `localStorage.clear()` or browser site data clear
   - Reload: defaults restored (no videos, volume 50)
