/**
 * @file scripts/main.js
 * @brief HoloSync Web App — UI orchestration, layout, event handling.
 */
import {
  videos,
  playerStates,
  suspendedPlayers,
  state,
  MIN_TILE_WIDTH,
  ASPECT_RATIO,
  WATCH_HISTORY_CAPTURE_INTERVAL_MS,
  WATCH_HISTORY_MIN_PLAYED_SECONDS,
  EDGE_REVEAL_DISTANCE_PX,
  ALLOWED_ORIGIN,
  SYNC_SETTINGS,
  SYNC_GROUPS,
  hasVideo,
  findVideoByWindow,
} from './state.js';
import {
  initPlayer,
  parseYouTubeId,
  buildEmbedUrl,
  sanitizeEmbedSettings,
  sendCommand,
  requestPlayerSnapshot,
  refreshDescriptionsForAllTiles,
  persistVideos,
  persistVolume,
  persistEmbedSettings,
  createTile,
} from './player.js';
import {
  getStateLabel,
  normalizePlayerInfoMessage,
  getSuspensionReason,
  pickLeader,
  syncAll,
  startSyncLoop,
  restartSyncLoop,
} from './sync.js';
import { initShare } from './share.js';
import { initSearch, initializeApiKey, loadPresets } from './search.js';
import { saveWatchHistoryEntry, loadWatchHistory, initHistory } from './history.js';

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
const showHelpBtn = document.getElementById('showHelpBtn');
const helpModal = document.getElementById('helpModal');
const closeHelpBtn = document.getElementById('closeHelpBtn');
// Share modal DOM refs moved to share.js

// Phase 1: Layout controls
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOpen = document.getElementById('sidebarOpen');
const layoutSelect = document.getElementById('layoutSelect');
const dropHint = document.getElementById('dropHint');
const darkModeToggle = document.getElementById('darkModeToggle');

// Phase 5: Cell mode and resize controls
const gridGapInput = document.getElementById('gridGap');
const gridGapVal = document.getElementById('gridGapVal');
const toolbarToggleBtn = document.getElementById('toolbarToggleBtn');
const immersiveToggleBtn = document.getElementById('immersiveToggleBtn');
const windowFrameToggleBtn = document.getElementById('windowFrameToggleBtn');
const windowControls = document.getElementById('windowControls');
const windowMinBtn = document.getElementById('windowMinBtn');
const windowMaxBtn = document.getElementById('windowMaxBtn');
const windowCloseBtn = document.getElementById('windowCloseBtn');
const embedControlsToggle = document.getElementById('embedControls');
const embedModestBrandingToggle = document.getElementById('embedModestBranding');
const embedRelatedVideosToggle = document.getElementById('embedRelatedVideos');
const embedPlaysInlineToggle = document.getElementById('embedPlaysInline');

// Cell mode constants (mutable state in state.js)

// Search / API key DOM refs moved to search.js

const debugToggle = document.getElementById('debugToggle');
const sidebarToolbarToggle = document.getElementById('sidebarToolbarToggle');
const edgeToolbarReveal = document.getElementById('edgeToolbarReveal');
const edgeSidebarReveal = document.getElementById('edgeSidebarReveal');
const debugPanel = document.getElementById('debugPanel');
const debugClose = document.getElementById('debugClose');
const debugContent = document.getElementById('debugContent');

// Preset / history DOM refs moved to search.js / history.js

const playAllBtn = document.getElementById('playAll');
const pauseAllBtn = document.getElementById('pauseAll');
const muteAllBtn = document.getElementById('muteAll');
const unmuteAllBtn = document.getElementById('unmuteAll');
const volumeAll = document.getElementById('volumeAll');
const volumeVal = document.getElementById('volumeVal');

function syncEmbedSettingsUI() {
  if (embedControlsToggle) {
    embedControlsToggle.checked = state.embedSettings.controls === 1;
  }
  if (embedModestBrandingToggle) {
    embedModestBrandingToggle.checked = state.embedSettings.modestbranding === 1;
  }
  if (embedRelatedVideosToggle) {
    embedRelatedVideosToggle.checked = state.embedSettings.rel === 1;
  }
  if (embedPlaysInlineToggle) {
    embedPlaysInlineToggle.checked = state.embedSettings.playsinline === 1;
  }
}

const zoomLoupeController = window.HoloSyncZoomLoupe?.createController({
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

function syncTileOrderDom() {
  videos.forEach((video) => {
    if (video.tile && video.tile.parentElement === gridEl) {
      gridEl.appendChild(video.tile);
    }
  });
  refreshTileStackOrder();
}

function refreshTileStackOrder() {
  videos.forEach((video, index) => {
    if (!video.tile) {
      return;
    }
    if (state.cellModeEnabled) {
      video.tile.style.setProperty('--tile-stack-index', String(5 + index));
    } else {
      video.tile.style.removeProperty('--tile-stack-index');
    }
  });
}

function moveVideoOrder(videoId, direction) {
  const index = videos.findIndex((video) => video.id === videoId);
  if (index === -1) {
    return;
  }
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= videos.length) {
    return;
  }
  const current = videos[index];
  videos[index] = videos[nextIndex];
  videos[nextIndex] = current;
  syncTileOrderDom();
  persistVideos();
}

function bringVideoToFront(videoId) {
  const index = videos.findIndex((video) => video.id === videoId);
  if (index === -1 || index === videos.length - 1) {
    return;
  }
  const [video] = videos.splice(index, 1);
  videos.push(video);
  syncTileOrderDom();
  persistVideos();
}

async function exitFullscreenSafe() {
  if (!document.fullscreenElement || !document.exitFullscreen) {
    return;
  }
  try {
    await document.exitFullscreen();
  } catch (_) {
    // ignore
  }
}

function clearEdgeRevealProximity() {
  document.body.classList.remove('edge-near-top', 'edge-near-left');
}

function syncEdgeRevealState() {
  const toolbarHidden = document.body.classList.contains('toolbar-collapsed');
  const sidebarHidden = document.body.classList.contains('sidebar-collapsed');

  if (edgeToolbarReveal) {
    edgeToolbarReveal.hidden = !toolbarHidden;
  }
  if (edgeSidebarReveal) {
    edgeSidebarReveal.hidden = !sidebarHidden;
  }

  if (!toolbarHidden || document.body.classList.contains('immersive-mode')) {
    document.body.classList.remove('edge-near-top');
  }
  if (!sidebarHidden || document.body.classList.contains('immersive-mode')) {
    document.body.classList.remove('edge-near-left');
  }
}

function setToolbarCollapsed(collapsed) {
  document.body.classList.toggle('toolbar-collapsed', collapsed);
  if (toolbarToggleBtn) {
    toolbarToggleBtn.classList.toggle('success', collapsed);
    toolbarToggleBtn.textContent = collapsed ? 'Show Toolbar' : 'Hide Toolbar';
  }
  if (sidebarToolbarToggle) {
    sidebarToolbarToggle.classList.toggle('success', collapsed);
    sidebarToolbarToggle.textContent = collapsed ? 'Show Toolbar' : 'Hide Toolbar';
  }
  syncEdgeRevealState();
  window.storageAdapter.setItem('toolbarCollapsed', collapsed);
}

async function setImmersiveMode(enabled) {
  state.immersiveModeEnabled = enabled;
  document.body.classList.toggle('immersive-mode', enabled);
  if (immersiveToggleBtn) {
    immersiveToggleBtn.classList.toggle('success', enabled);
    immersiveToggleBtn.textContent = enabled ? 'Immersive On' : 'Immersive';
  }
  if (enabled) {
    state.sidebarStateBeforeImmersive = document.body.classList.contains('sidebar-collapsed');
    state.toolbarStateBeforeImmersive = document.body.classList.contains('toolbar-collapsed');
    setSidebarCollapsed(true);
    setToolbarCollapsed(true);
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (_) {
        // ignore
      }
    }
    return;
  }
  if (typeof state.sidebarStateBeforeImmersive === 'boolean') {
    setSidebarCollapsed(state.sidebarStateBeforeImmersive);
  }
  if (typeof state.toolbarStateBeforeImmersive === 'boolean') {
    setToolbarCollapsed(state.toolbarStateBeforeImmersive);
  }
  state.sidebarStateBeforeImmersive = null;
  state.toolbarStateBeforeImmersive = null;
  if (document.fullscreenElement) {
    await exitFullscreenSafe();
  }
}

function hasElectronWindowBridge() {
  return Boolean(
    window.electronWindow && typeof window.electronWindow.getPreferences === 'function'
  );
}

function applyFramelessState(enabled) {
  state.framelessModeEnabled = Boolean(enabled);
  document.body.classList.toggle('frameless-mode', state.framelessModeEnabled);
  if (windowFrameToggleBtn) {
    windowFrameToggleBtn.classList.toggle('success', state.framelessModeEnabled);
    windowFrameToggleBtn.textContent = state.framelessModeEnabled ? 'Frameless On' : 'Frameless';
    windowFrameToggleBtn.hidden = !hasElectronWindowBridge();
  }
  if (windowControls) {
    windowControls.hidden = !state.framelessModeEnabled || !hasElectronWindowBridge();
  }
}

async function syncWindowModeFromMain() {
  if (!hasElectronWindowBridge()) {
    applyFramelessState(false);
    return;
  }
  try {
    const prefs = await window.electronWindow.getPreferences();
    applyFramelessState(Boolean(prefs?.framelessMode));
  } catch (_) {
    applyFramelessState(false);
  }
}

function persistLayoutSettings() {
  window.storageAdapter.setItem('layoutSettings', {
    layout: layoutSelect.value,
    gap: state.cellGap,
  });
}

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

function showHelp() {
  helpModal.classList.add('active');
}

function hideHelp() {
  helpModal.classList.remove('active');
}

// Share functions and listeners moved to share.js

showHelpBtn.addEventListener('click', showHelp);
closeHelpBtn.addEventListener('click', hideHelp);
helpModal.addEventListener('click', (e) => {
  if (e.target === helpModal) {
    hideHelp();
  }
});

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

function applyEmbedSettingsToExistingVideos() {
  videos.forEach((video) => {
    const win = video.iframe?.contentWindow;
    const state = win ? playerStates.get(win) : null;
    const start = Number.isFinite(state?.time) ? state.time : undefined;
    const autoplay = state?.state === 1 ? 1 : 0;
    video.iframe.src = buildEmbedUrl(video.id, { mute: 0, start, autoplay });
  });
  if (videos.length > 0) {
    setTimeout(() => {
      syncAll();
    }, 1200);
  }
}

function handleEmbedSettingsChange() {
  state.embedSettings = sanitizeEmbedSettings({
    controls: embedControlsToggle?.checked,
    modestbranding: embedModestBrandingToggle?.checked,
    rel: embedRelatedVideosToggle?.checked,
    playsinline: embedPlaysInlineToggle?.checked,
  });
  persistEmbedSettings();
  applyEmbedSettingsToExistingVideos();
}

[embedControlsToggle, embedModestBrandingToggle, embedRelatedVideosToggle, embedPlaysInlineToggle]
  .filter(Boolean)
  .forEach((input) => {
    input.addEventListener('change', handleEmbedSettingsChange);
  });

async function initializeApp() {
  try {
    // Restore dark mode preference
    const darkModeEnabled = await window.storageAdapter.getItem('darkMode');
    if (darkModeEnabled === true) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    const storedEmbedSettings = await window.storageAdapter.getItem('embedSettings');
    if (storedEmbedSettings) {
      state.embedSettings = sanitizeEmbedSettings(storedEmbedSettings);
    }
    syncEmbedSettingsUI();

    // Priority 1: Check for Deep Link session (session param)
    const sharedSession = window.storageAdapter.parseShareUrl();
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
        layoutSelect.value = sharedSession.layout;
        setLayout(sharedSession.layout);
      }

      if (sharedSession.gap !== undefined) {
        const gap = parseInt(sharedSession.gap, 10);
        if (Number.isFinite(gap)) {
          gridGapInput.value = String(gap);
          gridGapVal.textContent = String(gap);
          state.cellGap = gap;
          // grid gap update logic is usually in event listener, trigger it manually if needed
          // But layout update might handle it if we add gap to setLayout or update style directly
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
    const urlVideos = await window.storageAdapter.getItem('videos');
    const urlVolume = await window.storageAdapter.getItem('volume');
    const urlPreset = await window.storageAdapter.getItem('preset');

    // Fallback to stored data if URL doesn't have the data
    const storedVideos = urlVideos || (await window.storageAdapter.getItem('videos'));
    const storedVolume = urlVolume || (await window.storageAdapter.getItem('volume'));

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
initializeApp();
initializeApiKey(refreshDescriptionsForAllTiles);
loadPresets();
loadWatchHistory();
syncWindowModeFromMain();

// Update debug panel periodically
setInterval(updateDebugPanel, 1000);

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

const retryOnErrorCheckbox = document.getElementById('retryOnError');
const fallbackModeSelect = document.getElementById('fallbackMode');

// Recovery settings event listeners
retryOnErrorCheckbox.addEventListener('change', (e) => {
  SYNC_SETTINGS.retryOnError = e.target.checked;
});

fallbackModeSelect.addEventListener('change', (e) => {
  SYNC_SETTINGS.fallbackMode = e.target.value;
});

// Sync settings UI elements
const leaderModeSelect = document.getElementById('leaderMode');
const manualLeaderSection = document.getElementById('manualLeaderSection');
const leaderIdSelect = document.getElementById('leaderId');
const toleranceMsInput = document.getElementById('toleranceMs');
const toleranceValue = document.getElementById('toleranceValue');
const syncFrequencyInput = document.getElementById('syncFrequency');
const syncFrequencyValue = document.getElementById('syncFrequencyValue');

// Sync settings event listeners
leaderModeSelect.addEventListener('change', (e) => {
  SYNC_SETTINGS.leaderMode = e.target.value;
  manualLeaderSection.hidden = e.target.value !== 'manual';
  if (e.target.value === 'manual') {
    updateLeaderIdOptions();
  }
});

leaderIdSelect.addEventListener('change', (e) => {
  SYNC_SETTINGS.leaderId = e.target.value || null;
});

toleranceMsInput.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  toleranceValue.textContent = val;
  SYNC_SETTINGS.toleranceMs = val;
});

syncFrequencyInput.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  syncFrequencyValue.textContent = val;
  SYNC_SETTINGS.probeIntervalMs = Math.round(1000 / val);
  restartSyncLoop();
});

// Function to update leader ID options
function updateLeaderIdOptions() {
  leaderIdSelect.innerHTML = '<option value="">自動選択</option>';
  videos.forEach((v) => {
    const option = document.createElement('option');
    option.value = v.id;
    option.textContent = `${v.id.slice(0, 11)}...`;
    leaderIdSelect.appendChild(option);
  });
}

// Debug panel toggle - DOM読み込み完了後に設定
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupDebugPanel();
  });
} else {
  setupDebugPanel();
}

function setupDebugPanel() {
  debugToggle.addEventListener('click', () => {
    debugPanel.hidden = !debugPanel.hidden;
    if (!debugPanel.hidden) {
      updateDebugPanel();
    }
  });

  debugClose.addEventListener('click', () => {
    debugPanel.hidden = true;
  });
}

// Update debug panel content
function updateDebugPanel() {
  if (debugPanel.hidden) {
    return;
  }

  const now = Date.now();
  let html = '<div class="health-summary">';

  // Calculate overall sync health
  const activeEntries = [];
  const rejoinQueue = [];

  for (const v of videos) {
    const win = v.iframe?.contentWindow;
    if (!win) {
      continue;
    }
    const record = playerStates.get(win);
    const suspension = getSuspensionReason(record, now);
    if (suspension) {
      const previous = suspendedPlayers.get(win);
      if (!previous || previous.reason !== suspension) {
        suspendedPlayers.set(win, { since: now, reason: suspension });
      }
      rejoinQueue.push({ v, rec: record, win, reason: suspension });
    } else {
      if (suspendedPlayers.has(win)) {
        suspendedPlayers.delete(win);
      }
      activeEntries.push({ v, rec: record, win });
    }
  }

  const leaderEntry = pickLeader(activeEntries);
  let healthColor = '#b00020'; // red
  let healthStatus = '未同期';

  if (leaderEntry && activeEntries.length > 0) {
    const totalDrift = activeEntries.reduce((sum, entry) => {
      if (entry.v === leaderEntry.v) {
        return sum;
      }
      const record = entry.rec;
      if (!record || typeof record.time !== 'number') {
        return sum;
      }
      return sum + Math.abs(record.time - leaderEntry.rec.time);
    }, 0);

    const avgDrift = totalDrift / Math.max(1, activeEntries.length - 1);
    const maxDrift = Math.max(
      ...activeEntries.map((entry) => {
        if (entry.v === leaderEntry.v) {
          return 0;
        }
        const record = entry.rec;
        if (!record || typeof record.time !== 'number') {
          return 0;
        }
        return Math.abs(record.time - leaderEntry.rec.time);
      })
    );

    if (maxDrift <= SYNC_SETTINGS.toleranceMs / 1000) {
      healthColor = '#059669'; // green
      healthStatus = '良好';
    } else if (maxDrift <= (SYNC_SETTINGS.toleranceMs / 1000) * 2) {
      healthColor = '#d97706'; // yellow
      healthStatus = '要調整';
    } else {
      healthColor = '#dc2626'; // red
      healthStatus = '同期ずれ';
    }

    html += `<div class="health-indicator" style="color: ${healthColor}">同期状態: ${healthStatus}</div>`;
    html += `<div class="health-metrics">平均ドリフト: ${avgDrift.toFixed(2)}s, 最大ドリフト: ${maxDrift.toFixed(2)}s</div>`;
    html += `<div class="health-metrics">アクティブ動画: ${activeEntries.length}, 待機中: ${rejoinQueue.length}</div>`;
  } else {
    html += `<div class="health-indicator" style="color: ${healthColor}">${healthStatus}</div>`;
    html += '<div class="health-metrics">動画を追加して再生を開始してください</div>';
  }

  html +=
    '</div><table class="debug-table"><thead><tr><th>ID</th><th>Time</th><th>State</th><th>Drift</th><th>Health</th><th>Last Update</th><th>Last Seek</th></tr></thead><tbody>';

  if (leaderEntry) {
    videos.forEach((v) => {
      const rec = playerStates.get(v.iframe.contentWindow) || {};
      const time = rec.time !== undefined ? rec.time.toFixed(2) : 'N/A';
      const state = rec.state !== undefined ? getStateLabel(rec.state) : 'N/A';
      const lastUpdate = rec.lastUpdate ? new Date(rec.lastUpdate).toLocaleTimeString() : 'N/A';
      const lastSeekAt = rec.lastSeekAt ? new Date(rec.lastSeekAt).toLocaleTimeString() : 'N/A';

      let drift = 'N/A';
      let healthIndicator = '🔴'; // red circle

      if (leaderEntry.v.id === v.id) {
        drift = '基準';
        healthIndicator = '🟢'; // green circle
      } else if (rec.time !== undefined && leaderEntry.rec.time !== undefined) {
        const driftSec = rec.time - leaderEntry.rec.time;
        drift = `${driftSec >= 0 ? '+' : ''}${driftSec.toFixed(2)}s`;

        const absDrift = Math.abs(driftSec);
        if (absDrift <= SYNC_SETTINGS.toleranceMs / 1000) {
          healthIndicator = '🟢'; // green
        } else if (absDrift <= (SYNC_SETTINGS.toleranceMs / 1000) * 2) {
          healthIndicator = '🟡'; // yellow
        } else {
          healthIndicator = '🔴'; // red
        }
      }

      html += `<tr><td>${v.id.slice(0, 11)}</td><td>${time}</td><td>${state}</td><td>${drift}</td><td>${healthIndicator}</td><td>${lastUpdate}</td><td>${lastSeekAt}</td></tr>`;
    });
  }

  html += '</tbody></table>';
  debugContent.innerHTML = html;
}

// ========== Phase 1-1: Sidebar collapse ==========
function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  sidebarOpen.hidden = !collapsed;
  syncEdgeRevealState();
  window.storageAdapter.setItem('sidebarCollapsed', collapsed);
}

sidebarToggle.addEventListener('click', () => {
  setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
});
sidebarOpen.addEventListener('click', () => {
  setSidebarCollapsed(false);
});
if (edgeToolbarReveal) {
  edgeToolbarReveal.addEventListener('click', () => {
    setToolbarCollapsed(false);
    clearEdgeRevealProximity();
  });
}
if (edgeSidebarReveal) {
  edgeSidebarReveal.addEventListener('click', () => {
    setSidebarCollapsed(false);
    clearEdgeRevealProximity();
  });
}

document.addEventListener(
  'mousemove',
  (event) => {
    if (document.body.classList.contains('immersive-mode')) {
      clearEdgeRevealProximity();
      return;
    }
    const toolbarHidden = document.body.classList.contains('toolbar-collapsed');
    const sidebarHidden = document.body.classList.contains('sidebar-collapsed');
    const nearTop = toolbarHidden && event.clientY <= EDGE_REVEAL_DISTANCE_PX;
    const nearLeft = sidebarHidden && event.clientX <= EDGE_REVEAL_DISTANCE_PX;
    document.body.classList.toggle('edge-near-top', nearTop);
    document.body.classList.toggle('edge-near-left', nearLeft);
  },
  { passive: true }
);
document.addEventListener('mouseout', (event) => {
  if (!event.relatedTarget) {
    clearEdgeRevealProximity();
  }
});
window.addEventListener('blur', clearEdgeRevealProximity);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearEdgeRevealProximity();
  }
});

if (toolbarToggleBtn) {
  toolbarToggleBtn.addEventListener('click', () => {
    const next = !document.body.classList.contains('toolbar-collapsed');
    setToolbarCollapsed(next);
  });
}

if (sidebarToolbarToggle) {
  sidebarToolbarToggle.addEventListener('click', () => {
    const next = !document.body.classList.contains('toolbar-collapsed');
    setToolbarCollapsed(next);
  });
}

if (immersiveToggleBtn) {
  immersiveToggleBtn.addEventListener('click', async () => {
    await setImmersiveMode(!state.immersiveModeEnabled);
  });
}

if (windowFrameToggleBtn && hasElectronWindowBridge()) {
  windowFrameToggleBtn.addEventListener('click', async () => {
    try {
      await window.electronWindow.setFramelessMode(!state.framelessModeEnabled);
    } catch (_) {
      // ignore
    }
  });
}

if (windowMinBtn && hasElectronWindowBridge()) {
  windowMinBtn.addEventListener('click', () => {
    window.electronWindow.minimize();
  });
}

if (windowMaxBtn && hasElectronWindowBridge()) {
  windowMaxBtn.addEventListener('click', () => {
    window.electronWindow.toggleMaximize();
  });
}

if (windowCloseBtn && hasElectronWindowBridge()) {
  windowCloseBtn.addEventListener('click', () => {
    window.electronWindow.close();
  });
}

document.addEventListener('fullscreenchange', () => {
  const isFullscreen = Boolean(document.fullscreenElement);
  document.body.classList.toggle('is-fullscreen', isFullscreen);
  if (!isFullscreen && state.immersiveModeEnabled) {
    state.immersiveModeEnabled = false;
    document.body.classList.remove('immersive-mode');
    if (typeof state.sidebarStateBeforeImmersive === 'boolean') {
      setSidebarCollapsed(state.sidebarStateBeforeImmersive);
    }
    if (typeof state.toolbarStateBeforeImmersive === 'boolean') {
      setToolbarCollapsed(state.toolbarStateBeforeImmersive);
    }
    state.sidebarStateBeforeImmersive = null;
    state.toolbarStateBeforeImmersive = null;
    if (immersiveToggleBtn) {
      immersiveToggleBtn.classList.remove('success');
      immersiveToggleBtn.textContent = 'Immersive';
    }
  }
});

// Dark mode toggle
if (darkModeToggle) {
  darkModeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const isDark = currentTheme !== 'dark';
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    window.storageAdapter.setItem('darkMode', isDark);
  });
}

// Restore sidebar state
(async () => {
  const collapsed = await window.storageAdapter.getItem('sidebarCollapsed');
  const toolbarCollapsed = await window.storageAdapter.getItem('toolbarCollapsed');
  setSidebarCollapsed(collapsed === true);

  if (toolbarCollapsed === true) {
    setToolbarCollapsed(true);
  } else if (toolbarCollapsed === null || toolbarCollapsed === undefined) {
    // Default to hidden toolbar so the video area is not reduced on first launch.
    setToolbarCollapsed(true);
  } else {
    setToolbarCollapsed(false);
  }
})();

// ========== Phase 1-2: Layout presets ==========
function setLayout(mode) {
  // Remove all layout classes
  gridEl.className = 'grid';
  if (mode && mode !== 'auto') {
    gridEl.classList.add(`layout-${mode}`);
  }
  window.storageAdapter.setItem('layoutMode', mode);
}

layoutSelect.addEventListener('change', (e) => {
  setLayout(e.target.value);
});

// Restore layout
(async () => {
  const mode = await window.storageAdapter.getItem('layoutMode');
  if (mode && mode !== 'auto') {
    layoutSelect.value = mode;
    setLayout(mode);
  }
})();

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

function setSyncGroup(videoId, groupId) {
  const entry = videos.find((v) => v.id === videoId);
  if (!entry) {
    return;
  }
  entry.syncGroupId = groupId;
  // Update badge
  const badge = entry.tile?.querySelector('.tile-sync-badge');
  if (badge) {
    if (groupId) {
      badge.textContent = groupId;
      badge.classList.remove('no-sync');
    } else {
      badge.textContent = '独立';
      badge.classList.add('no-sync');
    }
  }
  persistVideos();
}

// Context menu on sync badge to change group
gridEl.addEventListener('click', (e) => {
  const badge = e.target.closest('.tile-sync-badge');
  if (!badge) {
    return;
  }
  const tile = badge.closest('.tile');
  if (!tile) {
    return;
  }
  const videoId = tile.dataset.videoId;
  const entry = videos.find((v) => v.id === videoId);
  if (!entry) {
    return;
  }
  // Cycle through groups: A -> B -> C -> null (independent) -> A
  const options = [...SYNC_GROUPS, null];
  const currentIdx = options.indexOf(entry.syncGroupId);
  const nextIdx = (currentIdx + 1) % options.length;
  setSyncGroup(videoId, options[nextIdx]);
});

// Start the sync loop
startSyncLoop();

// ========== Phase 4-1: Keyboard shortcuts ==========
document.addEventListener('keydown', (e) => {
  // Skip if user is typing in an input
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return;
  }

  switch (e.key) {
    case ' ':
      e.preventDefault();
      // Toggle play/pause for all
      if (
        videos.some((v) => {
          const rec = playerStates.get(v.iframe?.contentWindow);
          return rec && rec.state === 1;
        })
      ) {
        pauseAll();
      } else {
        playAll();
      }
      break;
    case 'm':
    case 'M':
      // Toggle mute
      muteAll();
      break;
    case 'u':
    case 'U':
      unmuteAll();
      break;
    case 'F11':
      e.preventDefault();
      setImmersiveMode(!state.immersiveModeEnabled);
      break;
    case 's':
    case 'S':
      // Sync all
      syncAll();
      break;
    case 't':
    case 'T':
      setToolbarCollapsed(!document.body.classList.contains('toolbar-collapsed'));
      break;
    case 'Escape':
      if (document.fullscreenElement) {
        e.preventDefault();
        exitFullscreenSafe();
        if (state.immersiveModeEnabled) {
          setImmersiveMode(false);
        }
        break;
      }
      // Close sidebar if open on mobile, or exit debug, or close help
      if (helpModal.classList.contains('active')) {
        hideHelp();
      } else if (!debugPanel.hidden) {
        debugPanel.hidden = true;
      }
      break;
    case '?':
      // Show help modal
      showHelp();
      break;
  }
});

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

// ========== Phase 5: Tile Resize ==========
function setupTileResize(tile, videoEntry, resizeHandle, sizeBadge) {
  let isResizing = false;
  let startX, startW, lastW, lastH, rafId;

  resizeHandle.addEventListener('mousedown', (e) => {
    if (!state.cellModeEnabled) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    startX = e.clientX;
    startW = tile.offsetWidth;
    lastW = startW;
    lastH = Math.round(startW * ASPECT_RATIO);
    tile.classList.add('resizing');
    sizeBadge.style.display = 'block';
    sizeBadge.textContent = `${lastW}×${lastH}`;

    const onMove = (ev) => {
      if (!isResizing) {
        return;
      }
      const deltaX = ev.clientX - startX;
      const tileRect = tile.getBoundingClientRect();
      const gridRect = gridEl.getBoundingClientRect();
      const maxWidthByGrid = Math.max(
        MIN_TILE_WIDTH,
        gridRect.right - tileRect.left - state.cellGap
      );
      const maxWidthByViewport = Math.max(MIN_TILE_WIDTH, window.innerWidth - tileRect.left - 12);
      const maxWidth = Math.min(maxWidthByGrid, maxWidthByViewport);
      const newW = Math.max(MIN_TILE_WIDTH, Math.min(startW + deltaX, maxWidth));
      const newH = Math.round(newW * ASPECT_RATIO);
      lastW = Math.round(newW);
      lastH = newH;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        tile.style.width = lastW + 'px';
        tile.style.height = lastH + 'px';
        sizeBadge.textContent = `${lastW}×${lastH}`;
      });
    };

    const onUp = () => {
      if (!isResizing) {
        return;
      }
      isResizing = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      tile.classList.remove('resizing');
      sizeBadge.style.display = 'none';

      // Apply final size consistently (use tracked values, not offsetWidth)
      tile.style.width = lastW + 'px';
      tile.style.height = lastH + 'px';
      videoEntry.tileWidth = lastW;
      videoEntry.tileHeight = lastH;
      persistVideos();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ========== Phase 5: Tile Drag ==========
function setupTileDrag(tile, videoEntry, dragHandle) {
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  dragHandle.addEventListener('mousedown', (e) => {
    if (!state.cellModeEnabled) {
      return;
    }
    bringVideoToFront(videoEntry.id);
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = tile.offsetLeft;
    startTop = tile.offsetTop;
    tile.classList.add('dragging');
    gridEl.classList.add('show-cells');

    const onMove = (ev) => {
      if (!isDragging) {
        return;
      }
      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;
      tile.style.left = startLeft + deltaX + 'px';
      tile.style.top = startTop + deltaY + 'px';

      // Highlight drop target cell
      updateDropTargetHighlight(ev.clientX, ev.clientY);
    };

    const onUp = (ev) => {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      tile.classList.remove('dragging');
      gridEl.classList.remove('show-cells');
      clearDropTargetHighlight();

      // Snap to cell
      const cell = getCellFromPoint(ev.clientX, ev.clientY);
      if (cell) {
        videoEntry.cellCol = cell.col;
        videoEntry.cellRow = cell.row;
        positionTileInCell(tile, videoEntry);
        persistVideos();
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ========== Phase 5: Cell Mode Functions ==========
function getCellDimensions() {
  const gridRect = gridEl.getBoundingClientRect();
  const availableWidth = gridRect.width - state.cellGap * 2;
  const cellWidth = (availableWidth - state.cellGap * (state.cellColumns - 1)) / state.cellColumns;
  const cellHeight = cellWidth * ASPECT_RATIO;
  return { cellWidth, cellHeight, gridRect };
}

function getCellFromPoint(x, y) {
  const { cellWidth, cellHeight, gridRect } = getCellDimensions();
  const relX = x - gridRect.left - state.cellGap + gridEl.scrollLeft;
  const relY = y - gridRect.top - state.cellGap + gridEl.scrollTop;
  const col = Math.floor(relX / (cellWidth + state.cellGap));
  const row = Math.floor(relY / (cellHeight + state.cellGap));
  return {
    col: Math.max(0, Math.min(col, state.cellColumns - 1)),
    row: Math.max(0, row),
  };
}

function positionTileInCell(tile, videoEntry) {
  if (!state.cellModeEnabled) {
    return;
  }
  const { cellWidth, cellHeight } = getCellDimensions();
  const col = videoEntry.cellCol ?? 0;
  const row = videoEntry.cellRow ?? 0;
  const left = state.cellGap + col * (cellWidth + state.cellGap);
  const top = state.cellGap + row * (cellHeight + state.cellGap);
  tile.style.left = left + 'px';
  tile.style.top = top + 'px';
  tile.classList.add('cell-positioned');

  // Apply custom size or default cell size.
  if (videoEntry.tileWidth && videoEntry.tileHeight) {
    tile.style.width = videoEntry.tileWidth + 'px';
    tile.style.height = videoEntry.tileHeight + 'px';
  } else {
    tile.style.width = cellWidth + 'px';
    tile.style.height = cellHeight + 'px';
  }
}

function updateDropTargetHighlight(x, y) {
  clearDropTargetHighlight();
  const cell = getCellFromPoint(x, y);
  if (!cell || !state.cellOverlayContainer) {
    return;
  }
  const overlays = state.cellOverlayContainer.querySelectorAll('.cell-overlay');
  const idx = cell.row * state.cellColumns + cell.col;
  if (overlays[idx]) {
    overlays[idx].classList.add('drop-target');
  }
}

function clearDropTargetHighlight() {
  if (!state.cellOverlayContainer) {
    return;
  }
  state.cellOverlayContainer.querySelectorAll('.drop-target').forEach((el) => {
    el.classList.remove('drop-target');
  });
}

function createCellOverlays() {
  if (state.cellOverlayContainer) {
    state.cellOverlayContainer.remove();
  }
  state.cellOverlayContainer = document.createElement('div');
  state.cellOverlayContainer.className = 'cell-overlay-container';

  const { cellWidth, cellHeight } = getCellDimensions();
  const rows = Math.max(10, Math.ceil(videos.length / state.cellColumns) + 2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < state.cellColumns; c++) {
      const overlay = document.createElement('div');
      overlay.className = 'cell-overlay';
      overlay.style.left = state.cellGap + c * (cellWidth + state.cellGap) + 'px';
      overlay.style.top = state.cellGap + r * (cellHeight + state.cellGap) + 'px';
      overlay.style.width = cellWidth + 'px';
      overlay.style.height = cellHeight + 'px';
      overlay.dataset.col = c;
      overlay.dataset.row = r;
      state.cellOverlayContainer.appendChild(overlay);
    }
  }

  gridEl.insertBefore(state.cellOverlayContainer, gridEl.firstChild);
}

function enableCellMode() {
  state.cellModeEnabled = true;
  gridEl.classList.add('cell-mode');
  createCellOverlays();

  // Position all tiles
  videos.forEach((v, idx) => {
    if (v.cellCol === null || v.cellRow === null) {
      v.cellCol = idx % state.cellColumns;
      v.cellRow = Math.floor(idx / state.cellColumns);
    }
    positionTileInCell(v.tile, v);
  });
  refreshTileStackOrder();
}

function disableCellMode() {
  state.cellModeEnabled = false;
  gridEl.classList.remove('cell-mode');
  if (state.cellOverlayContainer) {
    state.cellOverlayContainer.remove();
    state.cellOverlayContainer = null;
  }

  // Reset tile styles — always clear inline size so CSS grid controls layout
  videos.forEach((v) => {
    v.tile.classList.remove('cell-positioned');
    v.tile.style.left = '';
    v.tile.style.top = '';
    v.tile.style.width = '';
    v.tile.style.height = '';
    v.tile.style.removeProperty('--tile-stack-index');
  });
}

function updateGridGap(gap) {
  state.cellGap = gap;
  gridEl.style.gap = gap + 'px';
  gridEl.style.padding = gap + 'px';

  if (state.cellModeEnabled) {
    createCellOverlays();
    videos.forEach((v) => positionTileInCell(v.tile, v));
  }
}

// ========== Phase 5: Layout Mode Handler ==========
function handleLayoutChange(layout) {
  // Remove all layout classes
  gridEl.classList.remove('layout-1', 'layout-2', 'layout-3', 'layout-4', 'layout-theater');

  if (layout === 'free') {
    state.cellColumns = 4; // Default for free mode
    enableCellMode();
  } else {
    disableCellMode();
    if (layout !== 'auto') {
      gridEl.classList.add('layout-' + layout);
    }
    if (layout === '1') {
      state.cellColumns = 1;
    } else if (layout === '2') {
      state.cellColumns = 2;
    } else if (layout === '3') {
      state.cellColumns = 3;
    } else if (layout === '4') {
      state.cellColumns = 4;
    } else {
      state.cellColumns = 2;
    }
  }

  persistLayoutSettings();
}

// Layout select event
layoutSelect.addEventListener('change', (e) => {
  handleLayoutChange(e.target.value);
});

// Gap slider event
if (gridGapInput) {
  gridGapInput.addEventListener('input', (e) => {
    const gap = parseInt(e.target.value, 10);
    gridGapVal.textContent = gap;
    updateGridGap(gap);
    persistLayoutSettings();
  });
}

// Load layout settings on init
async function loadLayoutSettings() {
  try {
    const settings = await window.storageAdapter.getItem('layoutSettings');
    if (settings) {
      if (settings.layout) {
        layoutSelect.value = settings.layout;
        handleLayoutChange(settings.layout);
      }
      if (typeof settings.gap === 'number') {
        state.cellGap = settings.gap;
        if (gridGapInput) {
          gridGapInput.value = settings.gap;
          gridGapVal.textContent = settings.gap;
        }
        updateGridGap(settings.gap);
      }
    }
  } catch (_) {
    // ignore
  }
}

// Call after initializeApp
loadLayoutSettings();

// Handle window resize for cell mode
let resizeTimeout;
window.addEventListener('resize', () => {
  if (!state.cellModeEnabled) {
    return;
  }
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    createCellOverlays();
    videos.forEach((v) => positionTileInCell(v.tile, v));
  }, 100);
});

// ========== Zoom Loupe (Magnifying Glass) ==========
function toggleZoomPanel(videoEntry) {
  if (!zoomLoupeController) {
    return;
  }
  zoomLoupeController.toggleZoomPanel(videoEntry);
}
