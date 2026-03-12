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
  ALLOWED_ORIGIN_NOCOOKIE,
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
  advanceQueue,
  parseYouTubeId,
} from './player.js';
import { normalizePlayerInfoMessage, syncAll, startSyncLoop, setSyncCallbacks } from './sync.js';
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
import { initChannel } from './channel.js';
import { initFitMode } from './fitmode.js';
import { initSearchBrowser } from './searchbrowser.js';

const gridEl = document.getElementById('grid');

const playAllBtn = document.getElementById('playAll');
const pauseAllBtn = document.getElementById('pauseAll');
const muteAllBtn = document.getElementById('muteAll');
const unmuteAllBtn = document.getElementById('unmuteAll');
const volumeAll = document.getElementById('volumeAll');
const volumeVal = document.getElementById('volumeVal');
const masterSeekBar = document.getElementById('masterSeekBar');
const masterSeekTime = document.getElementById('masterSeekTime');
const masterSeekDuration = document.getElementById('masterSeekDuration');

const zoomLoupeController = createController({
  buildEmbedUrl,
  persistVideos,
  playerStates,
  getPostMessageOrigin: () =>
    state.embedSettings.noCookie ? ALLOWED_ORIGIN_NOCOOKIE : ALLOWED_ORIGIN,
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
  setAudioFocus,
  onTileIframeLoaded: () => applyAudioFocus(),
  clearAudioFocus: () => setAudioFocus(null),
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
  const nextDuration = Number(info?.duration);
  if (Number.isFinite(nextDuration) && nextDuration > 0) {
    record.duration = nextDuration;
  }
  record.lastUpdate = Date.now();
  playerStates.set(win, record);

  const video = findVideoByWindow(win);
  if (!video) {
    return;
  }

  // Restore saved playback position from shared URL
  if (video.pendingSeekTime !== null && video.pendingSeekTime !== undefined) {
    const seekTime = video.pendingSeekTime;
    video.pendingSeekTime = null;
    sendCommand(video.iframe, 'seekTo', [seekTime, true]);
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

  // Auto-advance queue on video end
  if (previousState !== 0 && record.state === 0 && video.queue) {
    advanceQueue(video);
  }
}

function playAll() {
  videos.forEach((v) => sendCommand(v.iframe, 'playVideo'));
}

function pauseAll() {
  videos.forEach((v) => sendCommand(v.iframe, 'pauseVideo'));
}

const DUCKING_RATIO = 0.2;

function muteAll() {
  setAudioFocus(null);
  videos.forEach((v) => sendCommand(v.iframe, 'mute'));
}

function unmuteAll() {
  setAudioFocus(null);
  videos.forEach((v) => sendCommand(v.iframe, 'unMute'));
}

function setSpeedAll(rate) {
  videos.forEach((v) => sendCommand(v.iframe, 'setPlaybackRate', [rate]));
}

function setVolumeAll(val) {
  const masterVid = state.audioFocusVideoId;
  for (const v of videos) {
    if (state.audioMode === 'ducking' && masterVid && v.id !== masterVid) {
      sendCommand(v.iframe, 'setVolume', [Math.round(val * DUCKING_RATIO)]);
    } else {
      sendCommand(v.iframe, 'setVolume', [val]);
    }
  }
}

const syncAllBtn = document.getElementById('syncAll');
const speedAllSelect = document.getElementById('speedAll');
const audioModeSelect = document.getElementById('audioModeSelect');

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

audioModeSelect.addEventListener('change', (e) => {
  state.audioMode = e.target.value;
  storageAdapter.setItem('audioMode', state.audioMode);
  applyAudioFocus();
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

    // Restore audio mode
    const storedAudioMode = await storageAdapter.getItem('audioMode');
    if (storedAudioMode && ['normal', 'solo', 'ducking'].includes(storedAudioMode)) {
      state.audioMode = storedAudioMode;
      audioModeSelect.value = storedAudioMode;
    }

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
      const queue = typeof entry === 'object' ? (entry.queue ?? null) : null;
      const queueIndex = typeof entry === 'object' ? (entry.queueIndex ?? 0) : 0;
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
          queue,
          queueIndex,
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
    // Restore audio focus (after all videos are loaded)
    const storedAudioFocus = await storageAdapter.getItem('audioFocusVideoId');
    if (storedAudioFocus && hasVideo(storedAudioFocus)) {
      state.audioFocusVideoId = storedAudioFocus;
      // Update visual state without re-persisting
      for (const v of videos) {
        if (v.tile) {
          v.tile.classList.toggle('audio-master', v.id === storedAudioFocus);
          const btn = v.tile.querySelector('.tile-audio-btn');
          if (btn) {
            btn.textContent = v.id === storedAudioFocus ? '\u{1F50A}' : '\u{1F508}';
            btn.title =
              v.id === storedAudioFocus ? 'オーディオマスターを解除' : 'オーディオマスターに設定';
          }
        }
      }
      applyAudioFocus();
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
initChannel();
initFitMode();
initSearchBrowser({ createTile, parseYouTubeId });

window.addEventListener('message', (event) => {
  try {
    if (event.origin !== ALLOWED_ORIGIN && event.origin !== ALLOWED_ORIGIN_NOCOOKIE) {
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

setSyncCallbacks({ onRecovery: () => applyAudioFocus() });
startSyncLoop();

// ========== Master Seekbar ==========

function formatTime(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

let _seekDragging = false;

function getLeaderRecord() {
  for (const v of videos) {
    if (!v.iframeLoaded) {
      continue;
    }
    const win = v.iframe?.contentWindow;
    if (win) {
      const rec = playerStates.get(win);
      if (rec && typeof rec.duration === 'number' && rec.duration > 0) {
        return rec;
      }
    }
  }
  return null;
}

function updateMasterSeekbar() {
  if (_seekDragging) {
    requestAnimationFrame(updateMasterSeekbar);
    return;
  }
  const rec = getLeaderRecord();
  if (rec && typeof rec.time === 'number') {
    masterSeekBar.max = String(rec.duration);
    masterSeekBar.value = String(rec.time);
    masterSeekTime.textContent = formatTime(rec.time);
    masterSeekDuration.textContent = formatTime(rec.duration);
  }
  requestAnimationFrame(updateMasterSeekbar);
}

masterSeekBar.addEventListener('mousedown', () => {
  _seekDragging = true;
});
masterSeekBar.addEventListener('touchstart', () => {
  _seekDragging = true;
});
masterSeekBar.addEventListener('input', () => {
  const time = parseFloat(masterSeekBar.value);
  if (Number.isFinite(time)) {
    masterSeekTime.textContent = formatTime(time);
  }
});
masterSeekBar.addEventListener('change', () => {
  _seekDragging = false;
  const time = parseFloat(masterSeekBar.value);
  if (Number.isFinite(time)) {
    for (const v of videos) {
      if (v.iframeLoaded) {
        const offsetSec = (v.offsetMs || 0) / 1000;
        sendCommand(v.iframe, 'seekTo', [time + offsetSec, true]);
      }
    }
  }
});

requestAnimationFrame(updateMasterSeekbar);

function setAudioFocus(videoId) {
  // Toggle off if same video
  if (videoId !== null && state.audioFocusVideoId === videoId) {
    videoId = null;
  }
  state.audioFocusVideoId = videoId;
  storageAdapter.setItem('audioFocusVideoId', videoId);

  // Update visual indicator on all tiles
  for (const v of videos) {
    if (v.tile) {
      v.tile.classList.toggle('audio-master', v.id === videoId);
      const btn = v.tile.querySelector('.tile-audio-btn');
      if (btn) {
        btn.textContent = v.id === videoId ? '\u{1F50A}' : '\u{1F508}';
        btn.title = v.id === videoId ? 'オーディオマスターを解除' : 'オーディオマスターに設定';
      }
    }
  }
  applyAudioFocus();
}

function applyAudioFocus() {
  const masterVid = state.audioFocusVideoId;
  const vol = parseInt(volumeAll.value, 10);

  if (!masterVid || state.audioMode === 'normal') {
    // Normal mode or no master: unmute all, uniform volume
    for (const v of videos) {
      sendCommand(v.iframe, 'unMute');
      sendCommand(v.iframe, 'setVolume', [vol]);
    }
    return;
  }

  if (state.audioMode === 'solo') {
    for (const v of videos) {
      if (v.id === masterVid) {
        sendCommand(v.iframe, 'unMute');
        sendCommand(v.iframe, 'setVolume', [vol]);
      } else {
        sendCommand(v.iframe, 'mute');
      }
    }
    return;
  }

  if (state.audioMode === 'ducking') {
    const duckedVol = Math.round(vol * DUCKING_RATIO);
    for (const v of videos) {
      sendCommand(v.iframe, 'unMute');
      if (v.id === masterVid) {
        sendCommand(v.iframe, 'setVolume', [vol]);
      } else {
        sendCommand(v.iframe, 'setVolume', [duckedVol]);
      }
    }
  }
}

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
