/**
 * @file scripts/main.js
 * @brief HoloSync Web App — UI orchestration, layout, event handling.
 */
import { storageAdapter } from './storage.js';
import { createController } from './zoom-loupe.js';
import {
  videos,
  playerStates,
  state,
  WATCH_HISTORY_CAPTURE_INTERVAL_MS,
  WATCH_HISTORY_MIN_PLAYED_SECONDS,
  ALLOWED_ORIGIN,
  hasVideo,
  findVideoByWindow,
} from './state.js';
import {
  initPlayer,
  initTileObserver,
  sendCommand,
  requestPlayerSnapshot,
  refreshDescriptionsForAllTiles,
  persistVideos,
  persistVolume,
  createTile,
  sanitizeEmbedSettings,
  buildEmbedUrl,
} from './player.js';
import { normalizePlayerInfoMessage, syncAll, startSyncLoop } from './sync.js';
import { initShare } from './share.js';
import { initSearch, initializeApiKey, loadPresets } from './search.js';
import { saveWatchHistoryEntry, loadWatchHistory, initHistory } from './history.js';
import { initUI, syncEmbedSettingsUI } from './ui.js';
import { initDebugPanel } from './debug.js';
import { initElectron } from './electron.js';
import {
  initLayout,
  setupTileDrag,
  setupTileResize,
  moveVideoOrder,
  syncTileOrderDom,
  refreshTileStackOrder,
  loadLayoutSettings,
  setLayout,
} from './layout.js';
import { initInput } from './input.js';

const gridEl = document.getElementById('grid');

const playAllBtn = document.getElementById('playAll');
const pauseAllBtn = document.getElementById('pauseAll');
const muteAllBtn = document.getElementById('muteAll');
const unmuteAllBtn = document.getElementById('unmuteAll');
const volumeAll = document.getElementById('volumeAll');
const volumeVal = document.getElementById('volumeVal');

const zoomLoupeController = createController({
  buildEmbedUrl,
  persistVideos,
  playerStates,
  ALLOWED_ORIGIN,
  requestPlayerSnapshot,
});

// Inject layout callbacks into player.js (function declarations are hoisted)
initPlayer({
  gridEl,
  moveVideoOrder,
  syncTileOrderDom,
  setupTileResize,
  setupTileDrag,
  toggleZoomPanel,
  refreshTileStackOrder,
});

function trackPlayerState(win, info) {
  const record = playerStates.get(win) || {};
  const previousState = record.state;
  const nextTime = Number(info?.currentTime);
  if (Number.isFinite(nextTime)) {
    record.time = nextTime;
  }
  const nextState = Number(info?.playerState);
  if (Number.isFinite(nextState)) {
    record.state = nextState;
  }
  record.lastUpdate = Date.now();
  playerStates.set(win, record);

  const video = findVideoByWindow(win);
  if (!video) {
    return;
  }
  const now = Date.now();
  const currentTime = typeof record.time === 'number' ? record.time : 0;
  const hasPlayedEnough = currentTime >= WATCH_HISTORY_MIN_PLAYED_SECONDS;
  const enoughInterval = now - (video.lastHistorySavedAt || 0) >= WATCH_HISTORY_CAPTURE_INTERVAL_MS;
  const positionDelta =
    Math.abs(currentTime - (video.lastHistorySavedPosition || 0)) >=
    WATCH_HISTORY_MIN_PLAYED_SECONDS;

  const shouldCaptureByProgress = hasPlayedEnough && (enoughInterval || positionDelta);

  if ((record.state === 1 || typeof record.state !== 'number') && shouldCaptureByProgress) {
    video.lastHistorySavedAt = now;
    video.lastHistorySavedPosition = currentTime;
    saveWatchHistoryEntry(video, currentTime);
    return;
  }

  if (previousState === 1 && record.state !== 1 && hasPlayedEnough) {
    video.lastHistorySavedAt = now;
    video.lastHistorySavedPosition = currentTime;
    saveWatchHistoryEntry(video, currentTime);
  }
}

function playAll() {
  videos.forEach((v) => sendCommand(v.iframe, 'playVideo'));
}

function pauseAll() {
  videos.forEach((v) => sendCommand(v.iframe, 'pauseVideo'));
}

function muteAll() {
  videos.forEach((v) => sendCommand(v.iframe, 'mute'));
}

function unmuteAll() {
  videos.forEach((v) => sendCommand(v.iframe, 'unMute'));
}

function setSpeedAll(rate) {
  videos.forEach((v) => sendCommand(v.iframe, 'setPlaybackRate', [rate]));
}

function setVolumeAll(val) {
  videos.forEach((v) => sendCommand(v.iframe, 'setVolume', [val]));
}

const syncAllBtn = document.getElementById('syncAll');
const speedAllSelect = document.getElementById('speedAll');

playAllBtn.addEventListener('click', playAll);
pauseAllBtn.addEventListener('click', pauseAll);
muteAllBtn.addEventListener('click', muteAll);
unmuteAllBtn.addEventListener('click', unmuteAll);
syncAllBtn.addEventListener('click', syncAll);

speedAllSelect.addEventListener('change', (e) => {
  const rate = parseFloat(e.target.value);
  if (Number.isFinite(rate)) {
    setSpeedAll(rate);
  }
});

volumeAll.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  volumeVal.textContent = String(val);
  setVolumeAll(val);
  persistVolume(val);
});

async function initializeApp() {
  try {
    // Restore dark mode preference
    const darkModeEnabled = await storageAdapter.getItem('darkMode');
    if (darkModeEnabled === true) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    const storedEmbedSettings = await storageAdapter.getItem('embedSettings');
    if (storedEmbedSettings) {
      state.embedSettings = sanitizeEmbedSettings(storedEmbedSettings);
    }
    syncEmbedSettingsUI();

    // Priority 1: Check for Deep Link session (session param)
    const sharedSession = storageAdapter.parseShareUrl();
    if (sharedSession) {
      state.isRestoring = true;

      if (sharedSession.embedSettings) {
        state.embedSettings = sanitizeEmbedSettings(sharedSession.embedSettings);
        syncEmbedSettingsUI();
      }

      // Restore Settings
      if (sharedSession.volume !== undefined) {
        const vol = parseInt(sharedSession.volume, 10);
        if (Number.isFinite(vol)) {
          volumeAll.value = String(vol);
          volumeVal.textContent = String(vol);
          setVolumeAll(vol);
        }
      }

      if (sharedSession.speed !== undefined) {
        const rate = parseFloat(sharedSession.speed);
        if (Number.isFinite(rate)) {
          speedAllSelect.value = String(rate);
          setSpeedAll(rate);
        }
      }

      if (sharedSession.layout) {
        setLayout(sharedSession.layout);
      }

      if (sharedSession.gap !== undefined) {
        const gap = parseInt(sharedSession.gap, 10);
        if (Number.isFinite(gap)) {
          state.cellGap = gap;
          gridEl.style.gap = `${gap}px`;
        }
      }

      // Restore Videos
      (sharedSession.videos || []).forEach((v) => {
        if (!hasVideo(v.id)) {
          createTile(v.id, v);
        }
      });

      state.isRestoring = false;
      return;
    }

    // Priority 2: Legacy/Storage Fallback
    // First check URL parameters for shared data (legacy)
    const urlVideos = await storageAdapter.getItem('videos');
    const urlVolume = await storageAdapter.getItem('volume');
    const urlPreset = await storageAdapter.getItem('preset');

    // Fallback to stored data if URL doesn't have the data
    const storedVideos = urlVideos || (await storageAdapter.getItem('videos'));
    const storedVolume = urlVolume || (await storageAdapter.getItem('volume'));

    const vol = parseInt(storedVolume, 10);
    if (!Number.isNaN(vol)) {
      volumeAll.value = String(vol);
      volumeVal.textContent = String(vol);
    }
    state.isRestoring = true;
    (storedVideos || []).forEach((entry) => {
      // Support both old format (string) and new format (object)
      const vid = typeof entry === 'string' ? entry : entry?.id;
      const syncGroupId = typeof entry === 'object' ? (entry.syncGroupId ?? null) : null;
      const offsetMs = typeof entry === 'object' ? (entry.offsetMs ?? 0) : 0;
      const cellCol = typeof entry === 'object' ? (entry.cellCol ?? null) : null;
      const cellRow = typeof entry === 'object' ? (entry.cellRow ?? null) : null;
      const tileWidth = typeof entry === 'object' ? (entry.tileWidth ?? null) : null;
      const tileHeight = typeof entry === 'object' ? (entry.tileHeight ?? null) : null;
      const zoomDiameter = typeof entry === 'object' ? (entry.zoomDiameter ?? null) : null;
      const zoomScale = typeof entry === 'object' ? (entry.zoomScale ?? null) : null;
      const zoomOriginX = typeof entry === 'object' ? (entry.zoomOriginX ?? null) : null;
      const zoomOriginY = typeof entry === 'object' ? (entry.zoomOriginY ?? null) : null;
      const zoomPanelX = typeof entry === 'object' ? (entry.zoomPanelX ?? null) : null;
      const zoomPanelY = typeof entry === 'object' ? (entry.zoomPanelY ?? null) : null;
      const zoomShape = typeof entry === 'object' ? (entry.zoomShape ?? null) : null;
      if (typeof vid === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(vid) && !hasVideo(vid)) {
        createTile(vid, {
          syncGroupId,
          offsetMs,
          cellCol,
          cellRow,
          tileWidth,
          tileHeight,
          zoomDiameter,
          zoomScale,
          zoomOriginX,
          zoomOriginY,
          zoomPanelX,
          zoomPanelY,
          zoomShape,
        });
      }
    });
    state.isRestoring = false;
    if (!Number.isNaN(vol)) {
      setVolumeAll(vol);
    }

    // If preset from URL, load it
    if (urlPreset && Array.isArray(urlPreset)) {
      urlPreset.forEach((vid) => {
        if (!hasVideo(vid)) {
          createTile(vid);
        }
      });
    }
  } catch (error) {
    console.warn('Failed to restore from storage:', error);
  }
}

initShare();
initSearch({ createTile, refreshDescriptions: refreshDescriptionsForAllTiles });
initHistory({ createTile });
initInput();
initUI({ playAll, pauseAll, muteAll, unmuteAll });
initDebugPanel();
initElectron();
initTileObserver();
initializeApp();
initializeApiKey(refreshDescriptionsForAllTiles);
loadPresets();
loadWatchHistory();

window.addEventListener('message', (event) => {
  try {
    if (event.origin !== ALLOWED_ORIGIN) {
      return;
    }
    let payload = event.data;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (_) {
        return;
      }
    }
    if (!payload || typeof payload !== 'object') {
      return;
    }
    const normalizedInfo = normalizePlayerInfoMessage(payload);
    if (!normalizedInfo) {
      return;
    }
    const sourceWin = /** @type {Window} */ (event.source);
    trackPlayerState(sourceWin, normalizedInfo);
  } catch (_) {
    // ignore
  }
});

startSyncLoop();

function setAudioFocus(videoId) {
  state.audioFocusVideoId = videoId;
  for (const v of videos) {
    if (videoId === null) {
      // No focus = all unmuted (respect global volume)
      sendCommand(v.iframe, 'unMute');
    } else if (v.id === videoId) {
      sendCommand(v.iframe, 'unMute');
    } else {
      sendCommand(v.iframe, 'mute');
    }
  }
}

// Click on a tile's frame-wrap to set audio focus
gridEl.addEventListener('click', (e) => {
  const frameWrap = e.target.closest('.frame-wrap');
  if (!frameWrap) {
    return;
  }
  const tile = frameWrap.closest('.tile');
  if (!tile) {
    return;
  }
  const videoId = tile.dataset.videoId;
  if (state.audioFocusVideoId === videoId) {
    // Toggle off
    setAudioFocus(null);
  } else {
    setAudioFocus(videoId);
  }
});

// Call after initializeApp
initLayout();
loadLayoutSettings();

// ========== Zoom Loupe (Magnifying Glass) ==========
function toggleZoomPanel(videoEntry) {
  if (!zoomLoupeController) {
    return;
  }
  zoomLoupeController.toggleZoomPanel(videoEntry);
}
