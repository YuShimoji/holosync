/**
 * @file scripts/state.js
 * @brief Shared mutable state, constants, and core data structures for HoloSync.
 */

// --- Core data ---

/** @type {{iframe: HTMLIFrameElement, id: string}[]} */
export const videos = [];

/** @type {Map<Window, {time?: number, state?: number, lastUpdate?: number}>} */
export const playerStates = new Map();

/** @type {Map<Window, {since: number, reason: string}>} */
export const suspendedPlayers = new Map();

/** @type {Set<Window>} Players currently under speed-based drift correction */
export const speedAdjustedPlayers = new Set();

// --- Constants ---

export const MIN_TILE_WIDTH = 200;
export const ASPECT_RATIO = 9 / 16;

export const WATCH_HISTORY_MAX = 30;
export const WATCH_HISTORY_CAPTURE_INTERVAL_MS = 120000;
export const WATCH_HISTORY_MIN_PLAYED_SECONDS = 5;

export const EDGE_REVEAL_DISTANCE_PX = 28;

export const ALLOWED_ORIGIN = 'https://www.youtube.com';
export const ALLOWED_COMMANDS = new Set([
  'playVideo',
  'pauseVideo',
  'mute',
  'unMute',
  'setVolume',
  'seekTo',
  'setPlaybackRate',
]);

export const SYNC_SETTINGS = {
  toleranceMs: 300,
  softToleranceMs: 150, // Below this: no correction
  hardToleranceMs: 1000, // Above this: seekTo instead of speed adjust
  probeIntervalMs: 500,
  stallThresholdMs: 2500,
  rejoinSyncBufferMs: 500,
  leaderMode: 'first',
  leaderId: null,
  retryOnError: true,
  fallbackMode: 'mute-continue',
  speedCorrectionFactor: 0.05, // +/-5% speed adjustment for soft drift
};

export const DEFAULT_EMBED_SETTINGS = {
  controls: 1,
  modestbranding: 1,
  rel: 0,
  playsinline: 1,
};

export const SYNC_GROUPS = ['A', 'B', 'C'];

// --- Mutable state (wrapped for cross-module reassignment) ---

export const state = {
  cellModeEnabled: false,
  cellColumns: 2,
  cellGap: 8,
  cellOverlayContainer: null,
  isRestoring: false,
  immersiveModeEnabled: false,
  framelessModeEnabled: false,
  sidebarStateBeforeImmersive: null,
  toolbarStateBeforeImmersive: null,
  embedSettings: { ...DEFAULT_EMBED_SETTINGS },
  audioFocusVideoId: null,
  audioMode: 'normal', // 'normal' | 'solo' | 'ducking'
};

// --- Utility ---

export function hasVideo(id) {
  return videos.some((v) => v.id === id);
}

/** YouTube API key — shared across search.js and player.js */
export let youtubeApiKey = null;
export function setYoutubeApiKey(key) {
  youtubeApiKey = key;
}

export function findVideoByWindow(win) {
  return videos.find((v) => v.iframe?.contentWindow === win);
}
