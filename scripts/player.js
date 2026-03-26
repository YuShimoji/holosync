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
  ALLOWED_ORIGIN_NOCOOKIE,
  ALLOWED_COMMANDS,
  DEFAULT_EMBED_SETTINGS,
  youtubeApiKey,
} from './state.js';

// Layout callbacks injected from main.js via initPlayer()
let _deps = {};

function getIframeOrigin(iframe) {
  try {
    const src = iframe?.src || iframe?.getAttribute('src') || '';
    if (src.includes('youtube-nocookie.com')) {
      return ALLOWED_ORIGIN_NOCOOKIE;
    }
  } catch (_) {
    // ignore
  }
  return ALLOWED_ORIGIN;
}

// ── Lazy-load infrastructure ──────────────────────────────────
const MAX_CONCURRENT_LOADS = 2;
const LOAD_STAGGER_MS = 300;
let _tileObserver = null;
const _loadQueue = [];
let _activeLoadCount = 0;

export function initPlayer(deps) {
  _deps = deps;
}

// ── Tile lazy-load ─────────────────────────────────────────

/**
 * Initialise IntersectionObserver for staggered iframe loading.
 * Call once at app startup before restoring videos.
 */
export function initTileObserver() {
  if (_tileObserver) {
    return;
  }
  _tileObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }
        const tile = entry.target;
        const videoEntry = videos.find((v) => v.tile === tile);
        if (!videoEntry || videoEntry.iframeLoaded || _loadQueue.includes(videoEntry)) {
          continue;
        }
        _loadQueue.push(videoEntry);
        _processLoadQueue();
      }
    },
    { rootMargin: '50%' }
  );
}

function _processLoadQueue() {
  while (_loadQueue.length > 0 && _activeLoadCount < MAX_CONCURRENT_LOADS) {
    const entry = _loadQueue.shift();
    if (entry.iframeLoaded) {
      continue;
    }
    _activeLoadCount++;
    _loadTileIframe(entry);
  }
}

function _loadTileIframe(videoEntry) {
  const { iframe, id, tile } = videoEntry;
  iframe.src = buildEmbedUrl(id, { mute: 0 });
  initializeSyncForIframe(iframe);

  iframe.addEventListener(
    'load',
    () => {
      videoEntry.iframeLoaded = true;
      _activeLoadCount--;
      const thumb = tile.querySelector('.tile-thumbnail');
      if (thumb) {
        thumb.classList.add('loaded');
      }
      _tileObserver?.unobserve(tile);
      _deps.onTileIframeLoaded?.(videoEntry);
      setTimeout(_processLoadQueue, LOAD_STAGGER_MS);
    },
    { once: true }
  );
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

export function parsePlaylistId(input) {
  if (!input) {
    return null;
  }
  try {
    const url = new URL(input);
    if (url.hostname.endsWith('youtube.com') || url.hostname === 'youtu.be') {
      const list = url.searchParams.get('list');
      if (list && /^[A-Za-z0-9_-]{10,}$/.test(list)) {
        return list;
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
  const domain = state.embedSettings.noCookie ? 'www.youtube-nocookie.com' : 'www.youtube.com';
  return `https://${domain}/embed/${videoId}?${params.toString()}`;
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
    noCookie: candidate.noCookie ? 1 : 0,
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
  if (func === 'loadVideoById') {
    const id = String(args?.[0] || '');
    if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return [id];
    }
    return [];
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
  win.postMessage(message, getIframeOrigin(iframe));
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
    const entry = videos.find((v) => v.iframe?.contentWindow === win);
    const origin = entry ? getIframeOrigin(entry.iframe) : ALLOWED_ORIGIN;
    win.postMessage(JSON.stringify({ event: 'listening' }), origin);
    const commands = [
      { event: 'command', func: 'getPlayerState', args: [] },
      { event: 'command', func: 'getCurrentTime', args: [] },
    ];
    commands.forEach((cmd) => win.postMessage(JSON.stringify(cmd), origin));
  } catch (_) {
    // ignore
  }
}

function initializeSyncForIframe(iframe) {
  const triggerSnapshot = () => {
    const win = iframe.contentWindow;
    if (win) {
      requestPlayerSnapshot(win);
    }
  };
  iframe.addEventListener('load', () => setTimeout(triggerSnapshot, 200), { once: true });
  setTimeout(triggerSnapshot, 600);
}

// ── Timestamp Extraction ──────────────────────────────────

const TIMESTAMP_RE = /(?:^|(?<=\s))(\d{1,2}:\d{2}(?::\d{2})?)(?=\s|$|[)\]」』】])/gm;

function parseTimestampToSeconds(str) {
  const parts = str.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) {
    return -1;
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return -1;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderDescriptionWithTimestamps(desc, videoId) {
  const container = document.createElement('div');
  container.className = 'info-description';

  const escaped = escapeHtml(desc);
  const html = escaped.replace(TIMESTAMP_RE, (match) => {
    const seconds = parseTimestampToSeconds(match);
    if (seconds < 0) {
      return match;
    }
    return `<span class="ts-link" data-seconds="${seconds}" data-video-id="${videoId}" title="${match}\u306b\u30b8\u30e3\u30f3\u30d7">${match}</span>`;
  });
  container.innerHTML = html;

  container.addEventListener('click', (e) => {
    const link = e.target.closest('.ts-link');
    if (!link) {
      return;
    }
    const seconds = Number(link.dataset.seconds);
    const vid = link.dataset.videoId;
    const entry = videos.find((v) => v.id === vid);
    if (entry?.iframe) {
      sendCommand(entry.iframe, 'seekTo', [seconds]);
    }
  });

  return container;
}

// ── Metadata ───────────────────────────────────────────────

function appendDescriptionHint(bodyEl, message) {
  const hint = document.createElement('div');
  hint.className = 'info-description-hint';
  hint.textContent = message;
  bodyEl.appendChild(hint);
}

async function fetchVideoDescription(videoId, bodyEl) {
  bodyEl.querySelector('.info-description')?.remove();
  bodyEl.querySelector('.info-description-hint')?.remove();
  if (!youtubeApiKey) {
    appendDescriptionHint(bodyEl, '概要の表示には YouTube Data API Key が必要です。');
    return false;
  }
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeApiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      appendDescriptionHint(bodyEl, '概要の取得に失敗しました。API Key を確認してください。');
      return false;
    }
    const data = await resp.json();
    if (data.items && data.items[0]) {
      const desc = data.items[0].snippet.description || '';
      const descEl = renderDescriptionWithTimestamps(desc, videoId);
      bodyEl.appendChild(descEl);
      const entry = videos.find((v) => v.id === videoId);
      if (entry) {
        entry.metaDescription = desc;
      }
      return true;
    }
    appendDescriptionHint(bodyEl, '概要情報が見つかりませんでした。');
    return false;
  } catch (err) {
    console.warn('fetchVideoDescription failed:', err);
    appendDescriptionHint(bodyEl, '概要の取得中にエラーが発生しました。');
    return false;
  }
}

async function fetchVideoMeta(videoId, titleEl, bodyEl) {
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
    if (youtubeApiKey) {
      await fetchVideoDescription(videoId, bodyEl);
    } else {
      appendDescriptionHint(bodyEl, '概要の表示には YouTube Data API Key が必要です。');
    }
  } catch (err) {
    console.warn('fetchVideoMeta failed:', err);
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

// ── Queue Navigation ──────────────────────────────────────

function loadQueueItem(videoEntry) {
  const newVideoId = videoEntry.queue[videoEntry.queueIndex];
  videoEntry.id = newVideoId;
  videoEntry.tile.dataset.videoId = newVideoId;

  const thumb = videoEntry.tile.querySelector('.tile-thumbnail');
  if (thumb) {
    thumb.style.backgroundImage = `url(https://img.youtube.com/vi/${newVideoId}/hqdefault.jpg)`;
  }

  sendCommand(videoEntry.iframe, 'loadVideoById', [newVideoId]);
  updateQueueUI(videoEntry);
  fetchVideoMeta(newVideoId, videoEntry.infoTitleEl, videoEntry.infoBodyEl);
  persistVideos();
}

function updateQueueUI(videoEntry) {
  const indicator = videoEntry.tile.querySelector('.queue-indicator');
  if (indicator && videoEntry.queue) {
    indicator.textContent = `${videoEntry.queueIndex + 1} / ${videoEntry.queue.length}`;
  }
  const prevBtn = videoEntry.tile.querySelector('.queue-prev-btn');
  const nextBtn = videoEntry.tile.querySelector('.queue-next-btn');
  if (prevBtn) {
    prevBtn.disabled = videoEntry.queueIndex <= 0;
  }
  if (nextBtn) {
    nextBtn.disabled = videoEntry.queueIndex >= videoEntry.queue.length - 1;
  }
}

export function advanceQueue(videoEntry) {
  if (!videoEntry.queue || videoEntry.queueIndex >= videoEntry.queue.length - 1) {
    return false;
  }
  videoEntry.queueIndex++;
  loadQueueItem(videoEntry);
  return true;
}

function queuePrev(videoEntry) {
  if (!videoEntry.queue || videoEntry.queueIndex <= 0) {
    return false;
  }
  videoEntry.queueIndex--;
  loadQueueItem(videoEntry);
  return true;
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
    queue: v.queue || null,
    queueIndex: v.queue ? v.queueIndex : undefined,
  }));
  storageAdapter.setItem('videos', data);
  // Save as lastSession for restore (only when non-empty)
  if (data.length > 0) {
    storageAdapter.setItem('lastSession', data);
  }
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

  // Thumbnail placeholder (visible until iframe loads)
  const thumbnail = document.createElement('div');
  thumbnail.className = 'tile-thumbnail';
  thumbnail.style.backgroundImage = `url(https://img.youtube.com/vi/${videoId}/hqdefault.jpg)`;

  const iframe = document.createElement('iframe');
  // src is set later by IntersectionObserver (_loadTileIframe)
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
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

  const audioBtn = document.createElement('button');
  audioBtn.className = 'tile-action-btn tile-audio-btn';
  audioBtn.textContent = '\u{1F508}';
  audioBtn.title = 'オーディオマスターに設定';
  audioBtn.addEventListener('click', () => _deps.setAudioFocus(videoId));

  const focusBtn = document.createElement('button');
  focusBtn.className = 'tile-action-btn tile-focus-btn';
  focusBtn.textContent = '\u26F6';
  focusBtn.title = 'フォーカスモード（この動画を最大化）';
  focusBtn.addEventListener('click', () => {
    if (_deps.toggleFocusMode) {
      _deps.toggleFocusMode(videoId);
    }
  });

  const removeBtn = document.createElement('button');
  removeBtn.className = 'tile-action-btn tile-remove';
  removeBtn.textContent = '✕';
  removeBtn.title = 'この動画を削除';
  removeBtn.addEventListener('click', () => removeVideo(videoId, tile));

  actions.appendChild(focusBtn);
  actions.appendChild(audioBtn);
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
    infoHeader.classList.toggle('info-open', isOpen);
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

  frameWrap.appendChild(thumbnail);
  frameWrap.appendChild(iframe);
  frameWrap.appendChild(infoHeader);
  frameWrap.appendChild(infoPanel);
  tile.appendChild(syncBadge);
  tile.appendChild(actions);
  tile.appendChild(offsetControl);
  tile.appendChild(dragHandle);
  tile.appendChild(resizeHandle);
  tile.appendChild(sizeBadge);
  tile.appendChild(frameWrap);

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
    pendingSeekTime: options.currentTime ?? null,
    iframeLoaded: false,
    queue: options.queue || null,
    queueIndex: options.queueIndex ?? 0,
  };
  videos.push(videoEntry);
  _deps.syncTileOrderDom();

  // Queue navigation bar (only for queue-enabled tiles)
  if (videoEntry.queue && videoEntry.queue.length > 1) {
    const queueBar = document.createElement('div');
    queueBar.className = 'tile-queue-bar';

    const qPrevBtn = document.createElement('button');
    qPrevBtn.className = 'tile-action-btn queue-prev-btn';
    qPrevBtn.textContent = '\u25C0';
    qPrevBtn.title = '\u524D\u306E\u52D5\u753B';
    qPrevBtn.disabled = videoEntry.queueIndex <= 0;
    qPrevBtn.addEventListener('click', () => queuePrev(videoEntry));

    const qIndicator = document.createElement('span');
    qIndicator.className = 'queue-indicator';
    qIndicator.textContent = `${videoEntry.queueIndex + 1} / ${videoEntry.queue.length}`;

    const qNextBtn = document.createElement('button');
    qNextBtn.className = 'tile-action-btn queue-next-btn';
    qNextBtn.textContent = '\u25B6';
    qNextBtn.title = '\u6B21\u306E\u52D5\u753B';
    qNextBtn.disabled = videoEntry.queueIndex >= videoEntry.queue.length - 1;
    qNextBtn.addEventListener('click', () => advanceQueue(videoEntry));

    queueBar.appendChild(qPrevBtn);
    queueBar.appendChild(qIndicator);
    queueBar.appendChild(qNextBtn);
    tile.insertBefore(queueBar, frameWrap);
  }

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

  // iframe src is loaded lazily by the IntersectionObserver
  if (_tileObserver) {
    _tileObserver.observe(tile);
  } else {
    // Fallback: no observer (e.g. tests), load immediately
    _loadTileIframe(videoEntry);
  }
  fetchVideoMeta(videoId, infoTitle, infoBody);
  if (!state.isRestoring) {
    persistVideos();
  }
}

function removeVideo(videoId, tile) {
  const idx = videos.findIndex((v) => v.id === videoId);
  if (idx === -1) {
    return;
  }
  const video = videos[idx];
  _tileObserver?.unobserve(tile);
  const qIdx = _loadQueue.indexOf(video);
  if (qIdx !== -1) {
    _loadQueue.splice(qIdx, 1);
  }
  const win = video.iframe?.contentWindow;
  if (win) {
    playerStates.delete(win);
    suspendedPlayers.delete(win);
    speedAdjustedPlayers.delete(win);
  }
  if (state.audioFocusVideoId === videoId) {
    _deps.clearAudioFocus?.(videoId);
  }
  video.iframe.src = '';
  tile.remove();
  videos.splice(idx, 1);
  _deps.refreshTileStackOrder();
  persistVideos();
}
