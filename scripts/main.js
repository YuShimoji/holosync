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
  parseYouTubeId,
  sendCommand,
  requestPlayerSnapshot,
  refreshDescriptionsForAllTiles,
  persistVideos,
  persistVolume,
  createTile,
  sanitizeEmbedSettings,
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

const gridEl = document.getElementById('grid');
const addForm = document.getElementById('addForm');
const urlInput = document.getElementById('urlInput');
const addError = document.getElementById('addError');
const urlPreview = document.getElementById('urlPreview');
const urlPreviewThumb = document.getElementById('urlPreviewThumb');
const urlPreviewTitle = document.getElementById('urlPreviewTitle');
const urlPreviewAuthor = document.getElementById('urlPreviewAuthor');

// Bulk add mode elements
const singleModeBtn = document.getElementById('singleModeBtn');
const bulkModeBtn = document.getElementById('bulkModeBtn');
const singleAddMode = document.getElementById('singleAddMode');
const bulkAddMode = document.getElementById('bulkAddMode');
const bulkUrlInput = document.getElementById('bulkUrlInput');
const bulkAddBtn = document.getElementById('bulkAddBtn');
const bulkCount = document.getElementById('bulkCount');

// Onboarding & Help elements
const loadDemoBtn = document.getElementById('loadDemoBtn');
const dropHint = document.getElementById('dropHint');
// Share modal DOM refs moved to share.js
// Search / API key DOM refs moved to search.js
// Preset / history DOM refs moved to search.js / history.js
// UI control DOM refs moved to ui.js
// Debug panel DOM refs moved to debug.js
// Electron window control DOM refs moved to electron.js

const playAllBtn = document.getElementById('playAll');
const pauseAllBtn = document.getElementById('pauseAll');
const muteAllBtn = document.getElementById('muteAll');
const unmuteAllBtn = document.getElementById('unmuteAll');
const volumeAll = document.getElementById('volumeAll');
const volumeVal = document.getElementById('volumeVal');

// syncEmbedSettingsUI moved to ui.js (will be imported)
// Note: buildEmbedUrl is still needed for zoom-loupe.js, imported from player.js
import { buildEmbedUrl } from './player.js';

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

// exitFullscreenSafe moved to ui.js

// clearEdgeRevealProximity moved to ui.js

// syncEdgeRevealState moved to ui.js

// setToolbarCollapsed moved to ui.js

// setImmersiveMode moved to ui.js

// hasElectronWindowBridge moved to electron.js

// applyFramelessState moved to electron.js

// syncWindowModeFromMain moved to electron.js

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

// URL Preview Logic
let previewDebounceTimer = null;

async function updateUrlPreview(videoId) {
  if (!videoId) {
    urlPreview.hidden = true;
    return;
  }

  // Don't fetch if already added
  if (hasVideo(videoId)) {
    urlPreview.hidden = false;
    urlPreviewThumb.src = '';
    urlPreviewTitle.textContent = '⚠️ 追加済み';
    urlPreviewAuthor.textContent = 'この動画は既にリストにあります';
    urlPreviewThumb.hidden = true;
    return;
  }

  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error('Not found');
    }

    const data = await resp.json();
    urlPreviewThumb.src = data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/default.jpg`;
    urlPreviewThumb.hidden = false;
    urlPreviewTitle.textContent = data.title;
    urlPreviewAuthor.textContent = data.author_name;
    urlPreview.hidden = false;
    addError.hidden = true;
  } catch (e) {
    // Fallback for non-embeddable or error
    urlPreviewThumb.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
    urlPreviewThumb.hidden = false;
    urlPreviewTitle.textContent = `ID: ${videoId}`;
    urlPreviewAuthor.textContent = 'メタデータ取得不可 (追加可能)';
    urlPreview.hidden = false;
  }
}

urlInput.addEventListener('input', () => {
  const val = urlInput.value.trim();
  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer);
  }

  if (!val) {
    urlPreview.hidden = true;
    addError.hidden = true;
    return;
  }

  const id = parseYouTubeId(val);
  if (id) {
    addError.hidden = true;
    previewDebounceTimer = setTimeout(() => updateUrlPreview(id), 300);
  } else {
    urlPreview.hidden = true;
  }
});

addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addError.hidden = true;
  const raw = urlInput.value.trim();
  const id = parseYouTubeId(raw);
  if (!id) {
    addError.textContent = 'URLが無効です。YouTubeの動画URLを入力してください。';
    addError.hidden = false;
    return;
  }
  if (hasVideo(id)) {
    addError.textContent = 'この動画は既に追加されています。';
    addError.hidden = false;
    urlInput.select();
    return;
  }
  createTile(id);
  urlInput.value = '';
  urlPreview.hidden = true;
  urlInput.focus();
});

const syncAllBtn = document.getElementById('syncAll');
const speedAllSelect = document.getElementById('speedAll');

// ========== Bulk Add Mode ==========
singleModeBtn.addEventListener('click', () => {
  singleModeBtn.classList.add('active');
  bulkModeBtn.classList.remove('active');
  singleAddMode.hidden = false;
  bulkAddMode.hidden = true;
});

bulkModeBtn.addEventListener('click', () => {
  bulkModeBtn.classList.add('active');
  singleModeBtn.classList.remove('active');
  bulkAddMode.hidden = false;
  singleAddMode.hidden = true;
});

// Parse bulk input and count valid URLs
function parseBulkUrls(text) {
  const lines = text
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const ids = [];
  for (const line of lines) {
    const id = parseYouTubeId(line);
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

bulkUrlInput.addEventListener('input', () => {
  const ids = parseBulkUrls(bulkUrlInput.value);
  const newCount = ids.filter((id) => !hasVideo(id)).length;
  const dupCount = ids.length - newCount;

  if (ids.length === 0) {
    bulkCount.textContent = '';
    bulkCount.classList.remove('has-items');
  } else {
    let text = `${newCount}件追加可能`;
    if (dupCount > 0) {
      text += ` (${dupCount}件重複)`;
    }
    bulkCount.textContent = text;
    bulkCount.classList.toggle('has-items', newCount > 0);
  }
});

bulkAddBtn.addEventListener('click', () => {
  addError.hidden = true;
  const ids = parseBulkUrls(bulkUrlInput.value);
  const newIds = ids.filter((id) => !hasVideo(id));

  if (newIds.length === 0) {
    addError.textContent = '追加できる動画がありません。URLを確認してください。';
    addError.hidden = false;
    return;
  }

  newIds.forEach((id) => createTile(id));
  bulkUrlInput.value = '';
  bulkCount.textContent = `✅ ${newIds.length}件追加しました`;
  bulkCount.classList.add('has-items');
  setTimeout(() => {
    bulkCount.textContent = '';
    bulkCount.classList.remove('has-items');
  }, 3000);
});

// ========== Onboarding & Help ==========
const DEMO_VIDEOS = [
  'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
  'jNQXAC9IVRw', // Me at the zoo (first YouTube video)
  '9bZkp7q19f0', // PSY - Gangnam Style
];

loadDemoBtn.addEventListener('click', () => {
  let addedCount = 0;
  for (const id of DEMO_VIDEOS) {
    if (!hasVideo(id)) {
      createTile(id);
      addedCount++;
    }
  }
  if (addedCount > 0) {
    loadDemoBtn.textContent = `✅ ${addedCount}件追加`;
    setTimeout(() => {
      loadDemoBtn.textContent = '🎬 デモをロード';
    }, 2000);
  } else {
    loadDemoBtn.textContent = '既に追加済み';
    setTimeout(() => {
      loadDemoBtn.textContent = '🎬 デモをロード';
    }, 2000);
  }
});

// showHelp and hideHelp moved to ui.js
// Share functions and listeners moved to share.js

// Help modal listeners moved to ui.js

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

// applyEmbedSettingsToExistingVideos moved to ui.js

// handleEmbedSettingsChange moved to ui.js

// Embed settings event listeners moved to ui.js

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

// Search, preset, and API key functions moved to search.js

// Initialize app and modules
initShare();
initSearch({ createTile, refreshDescriptions: refreshDescriptionsForAllTiles });
initHistory({ createTile });
initUI({ playAll, pauseAll, muteAll, unmuteAll });
initDebugPanel();
initElectron();
initializeApp();
initializeApiKey(refreshDescriptionsForAllTiles);
loadPresets();
loadWatchHistory();

// Debug panel update interval moved to debug.js

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

// Recovery settings moved to ui.js

// Sync settings UI elements moved to ui.js

// Sync settings event listeners moved to ui.js

// updateLeaderIdOptions moved to ui.js

// Debug panel setup moved to debug.js

// updateDebugPanel moved to debug.js

// Sidebar collapse function moved to ui.js

// Sidebar and edge reveal listeners moved to ui.js

// Edge reveal proximity listeners moved to ui.js

// Toolbar toggle listener moved to ui.js

// Sidebar toolbar toggle listener moved to ui.js

// Immersive toggle listener moved to ui.js

// Electron window control listeners moved to electron.js

// Fullscreen change handler moved to ui.js

// Dark mode toggle moved to ui.js

// Sidebar/toolbar state restoration moved to ui.js

// ========== Phase 2-2: Drag & Drop + Clipboard ==========
function handleDroppedText(text) {
  if (!text) {
    return;
  }
  // Try to extract YouTube URLs/IDs from dropped text
  const lines = text.split(/[\s\n]+/);
  let added = 0;
  for (const line of lines) {
    const id = parseYouTubeId(line.trim());
    if (id && !hasVideo(id)) {
      createTile(id);
      added++;
    }
  }
  return added;
}

// Drag and drop on grid
gridEl.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  gridEl.classList.add('drag-over');
  dropHint.hidden = false;
});
gridEl.addEventListener('dragleave', (e) => {
  if (!gridEl.contains(e.relatedTarget)) {
    gridEl.classList.remove('drag-over');
    dropHint.hidden = true;
  }
});
gridEl.addEventListener('drop', (e) => {
  e.preventDefault();
  gridEl.classList.remove('drag-over');
  dropHint.hidden = true;
  const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
  handleDroppedText(text);
});

// Also allow drop on the whole content area
const contentEl = document.getElementById('content');
contentEl.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  dropHint.hidden = false;
});
contentEl.addEventListener('dragleave', (e) => {
  if (!contentEl.contains(e.relatedTarget)) {
    dropHint.hidden = true;
  }
});
contentEl.addEventListener('drop', (e) => {
  e.preventDefault();
  dropHint.hidden = true;
  const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
  handleDroppedText(text);
});

// Clipboard paste support (Ctrl+V anywhere outside input)
document.addEventListener('paste', (e) => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return;
  }
  const text = e.clipboardData?.getData('text/plain');
  if (text) {
    const added = handleDroppedText(text);
    if (added > 0) {
      e.preventDefault();
    }
  }
});

// ========== Phase 3-1: Sync Groups ==========
// (Sync group logic moved to layout.js)

// Start the sync loop
startSyncLoop();

// Keyboard shortcuts moved to ui.js

// ========== Phase 4-4: Audio focus ==========
// state.audioFocusVideoId in state.js

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
