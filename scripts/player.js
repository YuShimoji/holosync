/**
 * @file scripts/player.js
 * @brief Player tile management, iframe communication, metadata, persistence.
 */
import { storageAdapter } from './storage.js';
import {
  videos,
  playerStates,
  suspendedPlayers,
  speedAdjustedPlayers,
  state,
  ALLOWED_ORIGIN,
  ALLOWED_COMMANDS,
  DEFAULT_EMBED_SETTINGS,
} from './state.js';

// Layout callbacks injected from main.js via initPlayer()
let _deps = {};

export function initPlayer(deps) {
  _deps = deps;
}

// ── URL / Embed ────────────────────────────────────────────

export function parseYouTubeId(input) {
  if (!input) {
    return null;
  }
  try {
    // Accept raw ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
      return input;
    }

    const url = new URL(input);
    // youtu.be/<id>
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace('/', '');
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return id;
      }
    }
    // www.youtube.com/watch?v=<id>
    if (url.hostname.endsWith('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return v;
      }
      const parts = url.pathname.split('/').filter(Boolean);
      const liveIdx = parts.indexOf('live');
      if (liveIdx !== -1 && parts[liveIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[liveIdx + 1])) {
        return parts[liveIdx + 1];
      }
      const embedIdx = parts.indexOf('embed');
      if (
        embedIdx !== -1 &&
        parts[embedIdx + 1] &&
        /^[a-zA-Z0-9_-]{11}$/.test(parts[embedIdx + 1])
      ) {
        return parts[embedIdx + 1];
      }
    }
    return null;
  } catch (_) {
    return null;
  }
}

export function buildEmbedUrl(videoId, options = {}) {
  const params = new URLSearchParams();
  params.set('enablejsapi', options.enablejsapi === 0 ? '0' : '1');
  params.set('origin', window.location.origin);
  params.set('widget_referrer', window.location.href);
  params.set(
    'playsinline',
    String(
      options.playsinline !== undefined ? options.playsinline : state.embedSettings.playsinline
    )
  );
  params.set(
    'modestbranding',
    String(
      options.modestbranding !== undefined
        ? options.modestbranding
        : state.embedSettings.modestbranding
    )
  );
  params.set('rel', String(options.rel !== undefined ? options.rel : state.embedSettings.rel));
  params.set(
    'controls',
    String(options.controls !== undefined ? options.controls : state.embedSettings.controls)
  );
  if (options.mute !== undefined) {
    params.set('mute', String(options.mute));
  }
  if (options.autoplay !== undefined) {
    params.set('autoplay', String(options.autoplay));
  }
  if (Number.isFinite(options.start)) {
    params.set('start', String(Math.max(0, Math.floor(options.start))));
  }
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function sanitizeEmbedSettings(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return { ...DEFAULT_EMBED_SETTINGS };
  }
  return {
    controls: candidate.controls ? 1 : 0,
    modestbranding: candidate.modestbranding ? 1 : 0,
    rel: candidate.rel ? 1 : 0,
    playsinline: candidate.playsinline ? 1 : 0,
  };
}

// ── iframe Communication ───────────────────────────────────

function sanitizeArgs(func, args) {
  if (!Array.isArray(args)) {
    return [];
  }
  if (func === 'setVolume') {
    const v = parseInt(args[0], 10);
    if (Number.isFinite(v)) {
      const clamped = Math.max(0, Math.min(100, v));
      return [clamped];
    }
    return [50];
  }
  if (func === 'seekTo') {
    const t = Number(args?.[0]);
    const seconds = Number.isFinite(t) ? Math.max(0, t) : 0;
    return [seconds, true];
  }
  if (func === 'setPlaybackRate') {
    const r = parseFloat(args[0]);
    if (Number.isFinite(r) && r >= 0.25 && r <= 2) {
      return [r];
    }
    return [1];
  }
  return [];
}

export function sendCommand(iframe, func, args = []) {
  if (!ALLOWED_COMMANDS.has(func)) {
    return;
  }
  const win = iframe.contentWindow;
  if (!win) {
    return;
  }
  const safeArgs = sanitizeArgs(func, args);
  const message = JSON.stringify({ event: 'command', func, args: safeArgs });
  win.postMessage(message, ALLOWED_ORIGIN);
  // Track seekTo for least-buffered leader mode
  if (func === 'seekTo') {
    const record = playerStates.get(win);
    if (record) {
      record.lastSeekAt = Date.now();
    }
  }
}

export function requestPlayerSnapshot(win) {
  try {
    win.postMessage(JSON.stringify({ event: 'listening' }), ALLOWED_ORIGIN);
    const commands = [
      { event: 'command', func: 'getPlayerState', args: [] },
      { event: 'command', func: 'getCurrentTime', args: [] },
    ];
    commands.forEach((cmd) => win.postMessage(JSON.stringify(cmd), ALLOWED_ORIGIN));
  } catch (_) {
    // ignore
  }
}

export function initializeSyncForIframe(iframe) {
  const triggerSnapshot = () => {
    const win = iframe.contentWindow;
    if (win) {
      requestPlayerSnapshot(win);
    }
  };
  iframe.addEventListener('load', () => setTimeout(triggerSnapshot, 200), { once: true });
  setTimeout(triggerSnapshot, 600);
}

// ── Metadata ───────────────────────────────────────────────

export function appendDescriptionHint(bodyEl, message) {
  const hint = document.createElement('div');
  hint.className = 'info-description-hint';
  hint.textContent = message;
  bodyEl.appendChild(hint);
}

export async function fetchVideoDescription(videoId, bodyEl) {
  bodyEl.querySelector('.info-description')?.remove();
  bodyEl.querySelector('.info-description-hint')?.remove();
  if (!window.YOUTUBE_API_KEY) {
    appendDescriptionHint(bodyEl, '概要の表示には YouTube Data API Key が必要です。');
    return false;
  }
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${window.YOUTUBE_API_KEY}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      appendDescriptionHint(bodyEl, '概要の取得に失敗しました。API Key を確認してください。');
      return false;
    }
    const data = await resp.json();
    if (data.items && data.items[0]) {
      const desc = data.items[0].snippet.description || '';
      const descDiv = document.createElement('div');
      descDiv.className = 'info-description';
      descDiv.textContent = desc;
      bodyEl.appendChild(descDiv);
      const entry = videos.find((v) => v.id === videoId);
      if (entry) {
        entry.metaDescription = desc;
      }
      return true;
    }
    appendDescriptionHint(bodyEl, '概要情報が見つかりませんでした。');
    return false;
  } catch (_) {
    appendDescriptionHint(bodyEl, '概要の取得中にエラーが発生しました。');
    return false;
  }
}

export async function fetchVideoMeta(videoId, titleEl, bodyEl) {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const resp = await fetch(url);
    if (!resp.ok) {
      bodyEl.textContent = 'メタデータ取得失敗';
      return;
    }
    const data = await resp.json();
    const entry = videos.find((v) => v.id === videoId);
    if (entry) {
      entry.meta = { title: data.title, author: data.author_name };
    }
    titleEl.textContent = data.title || videoId;
    bodyEl.innerHTML = '';
    const channelDiv = document.createElement('div');
    channelDiv.className = 'info-channel';
    channelDiv.textContent = data.author_name || '';
    bodyEl.appendChild(channelDiv);

    // If Data API key is available, fetch description
    if (window.YOUTUBE_API_KEY) {
      await fetchVideoDescription(videoId, bodyEl);
    } else {
      appendDescriptionHint(bodyEl, '概要の表示には YouTube Data API Key が必要です。');
    }
  } catch (_) {
    bodyEl.textContent = 'メタデータ取得失敗';
  }
}

export async function refreshDescriptionsForAllTiles() {
  if (!videos.length) {
    return;
  }
  await Promise.all(
    videos.map(async (video) => {
      if (video.infoBodyEl) {
        await fetchVideoDescription(video.id, video.infoBodyEl);
      }
    })
  );
}

// ── Persistence ────────────────────────────────────────────

export function persistVideos() {
  const data = videos.map((v) => ({
    id: v.id,
    syncGroupId: v.syncGroupId,
    offsetMs: v.offsetMs,
    cellCol: v.cellCol ?? null,
    cellRow: v.cellRow ?? null,
    tileWidth: v.tileWidth ?? null,
    tileHeight: v.tileHeight ?? null,
    zoomDiameter: v.zoomDiameter ?? null,
    zoomScale: v.zoomScale ?? null,
    zoomOriginX: v.zoomOriginX ?? null,
    zoomOriginY: v.zoomOriginY ?? null,
    zoomPanelX: v.zoomPanelX ?? null,
    zoomPanelY: v.zoomPanelY ?? null,
    zoomShape: v.zoomShape ?? null,
  }));
  storageAdapter.setItem('videos', data);
}

export function persistVolume(val) {
  storageAdapter.setItem('volume', val);
}

export function persistEmbedSettings() {
  storageAdapter.setItem('embedSettings', state.embedSettings);
}

// ── Tile Management ────────────────────────────────────────

export function createTile(videoId, options = {}) {
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.dataset.videoId = videoId;

  const frameWrap = document.createElement('div');
  frameWrap.className = 'frame-wrap';

  const iframe = document.createElement('iframe');
  iframe.src = buildEmbedUrl(videoId, { mute: 0 });
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.loading = 'lazy';
  iframe.setAttribute('referrerpolicy', 'origin');
  iframe.setAttribute('allowfullscreen', '');
  iframe.title = `YouTube video ${videoId}`;

  const initialGroupId = options.syncGroupId ?? null;

  // Sync group badge (Phase 3-1)
  const syncBadge = document.createElement('div');
  syncBadge.className = 'tile-sync-badge' + (initialGroupId ? '' : ' no-sync');
  syncBadge.textContent = initialGroupId || '独立';
  syncBadge.title = '同期グループ';

  // Action buttons container (Phase 1-3 + existing remove)
  const actions = document.createElement('div');
  actions.className = 'tile-actions';

  const popoutBtn = document.createElement('button');
  popoutBtn.className = 'tile-action-btn';
  popoutBtn.textContent = 'YT';
  popoutBtn.title = 'YouTubeで開く';
  popoutBtn.addEventListener('click', () => {
    const embedUrl = `https://www.youtube.com/watch?v=${videoId}`;
    window.open(
      embedUrl,
      `holosync-${videoId}`,
      'width=960,height=720,menubar=no,toolbar=no,location=no'
    );
  });

  const movePrevBtn = document.createElement('button');
  movePrevBtn.className = 'tile-action-btn';
  movePrevBtn.textContent = '←';
  movePrevBtn.title = '前へ移動';
  movePrevBtn.addEventListener('click', () => _deps.moveVideoOrder(videoId, -1));

  const moveNextBtn = document.createElement('button');
  moveNextBtn.className = 'tile-action-btn';
  moveNextBtn.textContent = '→';
  moveNextBtn.title = '次へ移動';
  moveNextBtn.addEventListener('click', () => _deps.moveVideoOrder(videoId, 1));

  const zoomBtn = document.createElement('button');
  zoomBtn.className = 'tile-action-btn';
  zoomBtn.textContent = '🔍';
  zoomBtn.title = 'ズームビュー';
  zoomBtn.addEventListener('click', () => {
    const entry = videos.find((v) => v.id === videoId);
    if (entry) {
      _deps.toggleZoomPanel(entry);
    }
  });

  const removeBtn = document.createElement('button');
  removeBtn.className = 'tile-action-btn tile-remove';
  removeBtn.textContent = '✕';
  removeBtn.title = 'この動画を削除';
  removeBtn.addEventListener('click', () => removeVideo(videoId, tile));

  actions.appendChild(zoomBtn);
  actions.appendChild(movePrevBtn);
  actions.appendChild(moveNextBtn);
  actions.appendChild(popoutBtn);
  actions.appendChild(removeBtn);

  // Info header (collapsible, Phase 2-1)
  const infoHeader = document.createElement('div');
  infoHeader.className = 'tile-info-header';
  const infoTitle = document.createElement('span');
  infoTitle.className = 'tile-info-title';
  infoTitle.textContent = videoId;
  const infoToggleIcon = document.createElement('span');
  infoToggleIcon.className = 'tile-info-toggle';
  infoToggleIcon.textContent = '▼';
  infoHeader.appendChild(infoTitle);
  infoHeader.appendChild(infoToggleIcon);

  // Info body (hidden by default)
  const infoPanel = document.createElement('div');
  infoPanel.className = 'tile-info';
  const infoBody = document.createElement('div');
  infoBody.className = 'tile-info-body';
  infoBody.innerHTML = '<em>読み込み中...</em>';
  infoPanel.appendChild(infoBody);

  infoHeader.addEventListener('click', () => {
    const isOpen = infoPanel.classList.toggle('open');
    infoToggleIcon.textContent = isOpen ? '▲' : '▼';
  });

  // Offset control (Phase 3-3)
  const offsetControl = document.createElement('div');
  offsetControl.className = 'tile-offset-control';
  const offsetInput = document.createElement('input');
  offsetInput.type = 'number';
  offsetInput.className = 'tile-offset-input';
  offsetInput.value = String(options.offsetMs ?? 0);
  offsetInput.step = '100';
  offsetInput.placeholder = '0';
  offsetInput.title = 'リーダーからのオフセット (ms)';
  const offsetLabel = document.createElement('span');
  offsetLabel.className = 'tile-offset-label';
  offsetLabel.textContent = 'ms';
  offsetControl.appendChild(offsetInput);
  offsetControl.appendChild(offsetLabel);

  // Phase 5: Resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'tile-resize-handle';
  resizeHandle.textContent = '⤡';
  resizeHandle.title = 'Resize (free layout only)';

  // Phase 5: Drag handle
  const dragHandle = document.createElement('div');
  dragHandle.className = 'tile-drag-handle';
  dragHandle.textContent = '⋮⋮';
  dragHandle.title = 'ドラッグで移動';

  // Size badge (shown during resize)
  const sizeBadge = document.createElement('div');
  sizeBadge.className = 'tile-size-badge';
  sizeBadge.style.display = 'none';

  frameWrap.appendChild(iframe);
  tile.appendChild(syncBadge);
  tile.appendChild(actions);
  tile.appendChild(offsetControl);
  tile.appendChild(dragHandle);
  tile.appendChild(resizeHandle);
  tile.appendChild(sizeBadge);
  tile.appendChild(frameWrap);
  tile.appendChild(infoHeader);
  tile.appendChild(infoPanel);

  _deps.gridEl.appendChild(tile);

  const videoEntry = {
    iframe,
    id: videoId,
    tile,
    syncGroupId: initialGroupId,
    offsetMs: options.offsetMs ?? 0,
    meta: null,
    cellCol: options.cellCol ?? null,
    cellRow: options.cellRow ?? null,
    tileWidth: options.tileWidth ?? null,
    tileHeight: options.tileHeight ?? null,
    infoTitleEl: infoTitle,
    infoBodyEl: infoBody,
    metaDescription: '',
    lastHistorySavedAt: 0,
    lastHistorySavedPosition: 0,
    zoomDiameter: options.zoomDiameter ?? null,
    zoomScale: options.zoomScale ?? null,
    zoomOriginX: options.zoomOriginX ?? null,
    zoomOriginY: options.zoomOriginY ?? null,
    zoomPanelX: options.zoomPanelX ?? null,
    zoomPanelY: options.zoomPanelY ?? null,
    zoomShape: options.zoomShape ?? null,
  };
  videos.push(videoEntry);
  _deps.syncTileOrderDom();

  // Only apply persisted tile size in free/cell mode.
  if (state.cellModeEnabled && videoEntry.tileWidth && videoEntry.tileHeight) {
    tile.style.width = videoEntry.tileWidth + 'px';
    tile.style.height = videoEntry.tileHeight + 'px';
  }

  // Resize logic
  _deps.setupTileResize(tile, videoEntry, resizeHandle, sizeBadge);

  // Drag logic
  _deps.setupTileDrag(tile, videoEntry, dragHandle);

  offsetInput.addEventListener('change', () => {
    videoEntry.offsetMs = parseInt(offsetInput.value, 10) || 0;
    persistVideos();
  });

  initializeSyncForIframe(iframe);
  fetchVideoMeta(videoId, infoTitle, infoBody);
  if (!state.isRestoring) {
    persistVideos();
  }
}

export function removeVideo(videoId, tile) {
  const idx = videos.findIndex((v) => v.id === videoId);
  if (idx === -1) {
    return;
  }
  const video = videos[idx];
  const win = video.iframe?.contentWindow;
  if (win) {
    playerStates.delete(win);
    suspendedPlayers.delete(win);
    speedAdjustedPlayers.delete(win);
  }
  video.iframe.src = '';
  tile.remove();
  videos.splice(idx, 1);
  _deps.refreshTileStackOrder();
  persistVideos();
}
