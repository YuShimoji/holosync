/**
 * @file scripts/main.js
 * @brief HoloSync Web App main script: add YouTube videos, batch controls,
 *        simple persistence when available.
 */
(function () {
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
  const shareModal = document.getElementById('shareModal');
  const closeShareBtn = document.getElementById('closeShareBtn');
  const shareUrlInput = document.getElementById('shareUrlInput');
  const copyShareBtn = document.getElementById('copyShareBtn');
  const openShareBtn = document.getElementById('openShareBtn');
  const importShareBtn = document.getElementById('importShareBtn');
  const shareQrBtn = document.getElementById('shareQrBtn');
  const shareQrBox = document.getElementById('shareQrBox');
  const shareQrImg = document.getElementById('shareQrImg');
  const shareStatus = document.getElementById('shareStatus');

  // Phase 1: Layout controls
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarOpen = document.getElementById('sidebarOpen');
  const layoutSelect = document.getElementById('layoutSelect');
  const dropHint = document.getElementById('dropHint');
  const darkModeToggle = document.getElementById('darkModeToggle');

  // Phase 5: Cell mode and resize controls
  const gridGapInput = document.getElementById('gridGap');
  const gridGapVal = document.getElementById('gridGapVal');
  const shareBtn = document.getElementById('shareBtn');
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

  // Cell mode state
  let cellModeEnabled = false;
  let cellColumns = 2;
  let cellGap = 8;
  let cellOverlayContainer = null;
  const MIN_TILE_WIDTH = 200;
  const ASPECT_RATIO = 9 / 16;

  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const searchError = document.getElementById('searchError');

  const apiKeyInput = document.getElementById('apiKeyInput');
  const deleteApiKeyBtn = document.getElementById('deleteApiKeyBtn');
  const checkQuotaBtn = document.getElementById('checkQuotaBtn');
  const quotaInfo = document.getElementById('quotaInfo');

  const debugToggle = document.getElementById('debugToggle');
  const sidebarToolbarToggle = document.getElementById('sidebarToolbarToggle');
  const edgeToolbarReveal = document.getElementById('edgeToolbarReveal');
  const edgeSidebarReveal = document.getElementById('edgeSidebarReveal');
  const debugPanel = document.getElementById('debugPanel');
  const debugClose = document.getElementById('debugClose');
  const debugContent = document.getElementById('debugContent');

  const savePresetBtn = document.getElementById('savePresetBtn');
  const presetNameInput = document.getElementById('presetNameInput');
  const presetList = document.getElementById('presetList');
  const watchHistoryList = document.getElementById('watchHistoryList');

  const playAllBtn = document.getElementById('playAll');
  const pauseAllBtn = document.getElementById('pauseAll');
  const muteAllBtn = document.getElementById('muteAll');
  const unmuteAllBtn = document.getElementById('unmuteAll');
  const volumeAll = document.getElementById('volumeAll');
  const volumeVal = document.getElementById('volumeVal');

  /** @type {{iframe: HTMLIFrameElement, id: string}[]} */
  const videos = [];
  /** @type {Map<Window, {time?: number, state?: number, lastUpdate?: number}>} */
  const playerStates = new Map();
  /** @type {Map<Window, {since: number, reason: string}>} */
  const suspendedPlayers = new Map();
  let isRestoring = false;
  let immersiveModeEnabled = false;
  let framelessModeEnabled = false;
  let sidebarStateBeforeImmersive = null;
  let toolbarStateBeforeImmersive = null;

  const WATCH_HISTORY_MAX = 30;
  const WATCH_HISTORY_CAPTURE_INTERVAL_MS = 120000;
  const WATCH_HISTORY_MIN_PLAYED_SECONDS = 5;
  const EDGE_REVEAL_DISTANCE_PX = 28;

  // Security hardening for postMessage sender to YouTube IFrame API
  const ALLOWED_ORIGIN = 'https://www.youtube.com';
  const ALLOWED_COMMANDS = new Set([
    'playVideo',
    'pauseVideo',
    'mute',
    'unMute',
    'setVolume',
    'seekTo',
    'setPlaybackRate',
  ]);
  const SYNC_SETTINGS = {
    toleranceMs: 300,
    probeIntervalMs: 500,
    stallThresholdMs: 2500,
    rejoinSyncBufferMs: 500,
    leaderMode: 'first', // 'first' | 'manual' | 'longest-playing' | 'least-buffered'
    leaderId: null,
    retryOnError: true,
    fallbackMode: 'mute-continue', // 'mute-continue' | 'pause-catchup' | 'none'
    driftingCorrectionEnabled: true,
    maxDriftCorrectionMs: 1000, // Maximum correction per sync cycle
    syncFrequencyHz: 2, // Sync attempts per second
  };
  const DEFAULT_EMBED_SETTINGS = {
    controls: 1,
    modestbranding: 1,
    rel: 0,
    playsinline: 1,
  };
  let embedSettings = { ...DEFAULT_EMBED_SETTINGS };

  function sanitizeEmbedSettings(candidate) {
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

  function syncEmbedSettingsUI() {
    if (embedControlsToggle) {
      embedControlsToggle.checked = embedSettings.controls === 1;
    }
    if (embedModestBrandingToggle) {
      embedModestBrandingToggle.checked = embedSettings.modestbranding === 1;
    }
    if (embedRelatedVideosToggle) {
      embedRelatedVideosToggle.checked = embedSettings.rel === 1;
    }
    if (embedPlaysInlineToggle) {
      embedPlaysInlineToggle.checked = embedSettings.playsinline === 1;
    }
  }

  function persistEmbedSettings() {
    window.storageAdapter.setItem('embedSettings', embedSettings);
  }

  function buildEmbedUrl(videoId, options = {}) {
    const params = new URLSearchParams();
    params.set('enablejsapi', options.enablejsapi === 0 ? '0' : '1');
    params.set('origin', window.location.origin);
    params.set('widget_referrer', window.location.href);
    params.set(
      'playsinline',
      String(options.playsinline !== undefined ? options.playsinline : embedSettings.playsinline)
    );
    params.set(
      'modestbranding',
      String(
        options.modestbranding !== undefined ? options.modestbranding : embedSettings.modestbranding
      )
    );
    params.set('rel', String(options.rel !== undefined ? options.rel : embedSettings.rel));
    params.set(
      'controls',
      String(options.controls !== undefined ? options.controls : embedSettings.controls)
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
  function hasVideo(id) {
    return videos.some((v) => v.id === id);
  }

  function findVideoByWindow(win) {
    return videos.find((video) => video.iframe?.contentWindow === win) || null;
  }

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
      if (cellModeEnabled) {
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

  async function toggleElementFullscreen(element) {
    if (document.fullscreenElement === element) {
      await exitFullscreenSafe();
      return;
    }
    if (!element?.requestFullscreen) {
      return;
    }
    try {
      await element.requestFullscreen();
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
      toolbarToggleBtn.textContent = collapsed ? 'Toolbar Off' : 'Toolbar';
    }
    if (sidebarToolbarToggle) {
      sidebarToolbarToggle.classList.toggle('success', collapsed);
      sidebarToolbarToggle.textContent = collapsed ? 'Show Toolbar' : 'Hide Toolbar';
    }
    syncEdgeRevealState();
    window.storageAdapter.setItem('toolbarCollapsed', collapsed);
  }

  async function setImmersiveMode(enabled) {
    immersiveModeEnabled = enabled;
    document.body.classList.toggle('immersive-mode', enabled);
    if (immersiveToggleBtn) {
      immersiveToggleBtn.classList.toggle('success', enabled);
      immersiveToggleBtn.textContent = enabled ? 'Immersive On' : 'Immersive';
    }
    if (enabled) {
      sidebarStateBeforeImmersive = document.body.classList.contains('sidebar-collapsed');
      toolbarStateBeforeImmersive = document.body.classList.contains('toolbar-collapsed');
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
    if (typeof sidebarStateBeforeImmersive === 'boolean') {
      setSidebarCollapsed(sidebarStateBeforeImmersive);
    }
    if (typeof toolbarStateBeforeImmersive === 'boolean') {
      setToolbarCollapsed(toolbarStateBeforeImmersive);
    }
    sidebarStateBeforeImmersive = null;
    toolbarStateBeforeImmersive = null;
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
    framelessModeEnabled = Boolean(enabled);
    document.body.classList.toggle('frameless-mode', framelessModeEnabled);
    if (windowFrameToggleBtn) {
      windowFrameToggleBtn.classList.toggle('success', framelessModeEnabled);
      windowFrameToggleBtn.textContent = framelessModeEnabled ? 'Frameless On' : 'Frameless';
      windowFrameToggleBtn.hidden = !hasElectronWindowBridge();
    }
    if (windowControls) {
      windowControls.hidden = !framelessModeEnabled || !hasElectronWindowBridge();
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

  function persistVideos() {
    const data = videos.map((v) => ({
      id: v.id,
      syncGroupId: v.syncGroupId,
      offsetMs: v.offsetMs,
      cellCol: v.cellCol ?? null,
      cellRow: v.cellRow ?? null,
      tileWidth: v.tileWidth ?? null,
      tileHeight: v.tileHeight ?? null,
    }));
    window.storageAdapter.setItem('videos', data);
  }

  function persistLayoutSettings() {
    window.storageAdapter.setItem('layoutSettings', {
      layout: layoutSelect.value,
      gap: cellGap,
    });
  }

  function persistVolume(val) {
    window.storageAdapter.setItem('volume', val);
  }

  function parseYouTubeId(input) {
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
        if (
          liveIdx !== -1 &&
          parts[liveIdx + 1] &&
          /^[a-zA-Z0-9_-]{11}$/.test(parts[liveIdx + 1])
        ) {
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

  function createTile(videoId, options = {}) {
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

    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'tile-action-btn';
    fullscreenBtn.textContent = '⛶';
    fullscreenBtn.title = 'フルスクリーン';
    fullscreenBtn.addEventListener('click', () => toggleElementFullscreen(frameWrap));

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
    movePrevBtn.addEventListener('click', () => moveVideoOrder(videoId, -1));

    const moveNextBtn = document.createElement('button');
    moveNextBtn.className = 'tile-action-btn';
    moveNextBtn.textContent = '→';
    moveNextBtn.title = '次へ移動';
    moveNextBtn.addEventListener('click', () => moveVideoOrder(videoId, 1));

    const zoomBtn = document.createElement('button');
    zoomBtn.className = 'tile-action-btn';
    zoomBtn.textContent = '🔍';
    zoomBtn.title = 'ズームビュー';
    zoomBtn.addEventListener('click', () => {
      const entry = videos.find((v) => v.id === videoId);
      if (entry) {
        toggleZoomPanel(entry);
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
    actions.appendChild(fullscreenBtn);
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

    // Double-click on frameWrap for fullscreen (Phase 1-3)
    frameWrap.addEventListener('dblclick', () => toggleElementFullscreen(frameWrap));

    const fullscreenExitBtn = document.createElement('button');
    fullscreenExitBtn.className = 'tile-fullscreen-exit';
    fullscreenExitBtn.textContent = 'Exit Fullscreen';
    fullscreenExitBtn.addEventListener('click', () => {
      exitFullscreenSafe();
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
    resizeHandle.title = 'ドラッグでサイズ変更';

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
    frameWrap.appendChild(infoHeader);
    frameWrap.appendChild(fullscreenExitBtn);
    tile.appendChild(syncBadge);
    tile.appendChild(offsetControl);
    tile.appendChild(actions);
    tile.appendChild(dragHandle);
    tile.appendChild(resizeHandle);
    tile.appendChild(sizeBadge);
    tile.appendChild(frameWrap);
    tile.appendChild(infoPanel);

    gridEl.appendChild(tile);

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
    };
    videos.push(videoEntry);
    syncTileOrderDom();

    // Apply custom size if provided
    if (videoEntry.tileWidth && videoEntry.tileHeight) {
      tile.style.width = videoEntry.tileWidth + 'px';
      tile.style.height = videoEntry.tileHeight + 'px';
    }

    // Resize logic
    setupTileResize(tile, videoEntry, resizeHandle, sizeBadge);

    // Drag logic
    setupTileDrag(tile, videoEntry, dragHandle);

    offsetInput.addEventListener('change', () => {
      videoEntry.offsetMs = parseInt(offsetInput.value, 10) || 0;
      persistVideos();
    });

    initializeSyncForIframe(iframe);
    fetchVideoMeta(videoId, infoTitle, infoBody);
    if (!isRestoring) {
      persistVideos();
    }
  }

  /** Fetch video metadata via oEmbed (no API key needed) */
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
      if (window.YOUTUBE_API_KEY) {
        await fetchVideoDescription(videoId, bodyEl);
      } else {
        appendDescriptionHint(bodyEl, '概要の表示には YouTube Data API Key が必要です。');
      }
    } catch (_) {
      bodyEl.textContent = 'メタデータ取得失敗';
    }
  }

  function appendDescriptionHint(bodyEl, message) {
    const hint = document.createElement('div');
    hint.className = 'info-description-hint';
    hint.textContent = message;
    bodyEl.appendChild(hint);
  }

  /** Fetch video description via YouTube Data API (optional) */
  async function fetchVideoDescription(videoId, bodyEl) {
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

  async function refreshDescriptionsForAllTiles() {
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

  async function saveWatchHistoryEntry(video, watchedSeconds) {
    try {
      const history = (await window.storageAdapter.getItem('watchHistory')) || [];
      const now = Date.now();
      const title = video.meta?.title || video.id;
      const channel = video.meta?.author || '';
      const next = history.filter((item) => item.id !== video.id);
      next.unshift({
        id: video.id,
        title,
        channel,
        watchedAt: now,
        watchedSeconds: Math.max(0, Math.floor(watchedSeconds || 0)),
      });
      if (next.length > WATCH_HISTORY_MAX) {
        next.length = WATCH_HISTORY_MAX;
      }
      renderWatchHistory(next);
      await window.storageAdapter.setItem('watchHistory', next);
    } catch (_) {
      // ignore
    }
  }

  function formatWatchTime(seconds) {
    const total = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function renderWatchHistory(history) {
    if (!watchHistoryList) {
      return;
    }
    watchHistoryList.innerHTML = '';
    if (!history.length) {
      const empty = document.createElement('li');
      empty.className = 'watch-history-empty';
      empty.textContent = 'No history yet.';
      watchHistoryList.appendChild(empty);
      return;
    }
    history.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'watch-history-item';

      const title = document.createElement('button');
      title.className = 'watch-history-open';
      title.type = 'button';
      title.textContent = item.title || item.id;
      title.addEventListener('click', () => {
        if (!hasVideo(item.id)) {
          createTile(item.id);
        }
      });

      const meta = document.createElement('div');
      meta.className = 'watch-history-meta';
      const dateText = new Date(item.watchedAt).toLocaleString();
      const channel = item.channel ? `${item.channel} • ` : '';
      meta.textContent = `${channel}${formatWatchTime(item.watchedSeconds)} • ${dateText}`;

      li.appendChild(title);
      li.appendChild(meta);
      watchHistoryList.appendChild(li);
    });
  }

  async function loadWatchHistory() {
    try {
      const history = (await window.storageAdapter.getItem('watchHistory')) || [];
      renderWatchHistory(history);
    } catch (_) {
      renderWatchHistory([]);
    }
  }

  function removeVideo(videoId, tile) {
    const idx = videos.findIndex((v) => v.id === videoId);
    if (idx === -1) {
      return;
    }
    const video = videos[idx];
    const win = video.iframe?.contentWindow;
    if (win) {
      playerStates.delete(win);
      suspendedPlayers.delete(win);
    }
    video.iframe.src = '';
    tile.remove();
    videos.splice(idx, 1);
    refreshTileStackOrder();
    persistVideos();
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
    const enoughInterval =
      now - (video.lastHistorySavedAt || 0) >= WATCH_HISTORY_CAPTURE_INTERVAL_MS;
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

  function getSuspensionReason(record, now) {
    if (!record) {
      return 'no-state';
    }
    if (typeof record.state === 'number') {
      if (record.state === 3) {
        return 'buffering';
      }
      if (record.state === 2) {
        return 'paused';
      }
      if (record.state >= 100) {
        return 'ad';
      }
    }
    if (!record.lastUpdate || now - record.lastUpdate > SYNC_SETTINGS.stallThresholdMs) {
      return 'stalled';
    }
    if (typeof record.time !== 'number') {
      return 'no-time';
    }
    return null;
  }

  function pickLeader(activeEntries) {
    if (SYNC_SETTINGS.leaderMode === 'manual' && SYNC_SETTINGS.leaderId) {
      const manual = activeEntries.find((entry) => entry.v.id === SYNC_SETTINGS.leaderId);
      if (manual && typeof manual.rec?.time === 'number' && manual.rec.state === 1) {
        return manual;
      }
    }

    if (SYNC_SETTINGS.leaderMode === 'longest-playing') {
      // Choose the video that has been playing the longest
      let longestPlaying = null;
      let maxPlayTime = 0;
      for (const entry of activeEntries) {
        if (typeof entry.rec?.time === 'number' && entry.rec.state === 1) {
          const playTime = entry.rec.time;
          if (playTime > maxPlayTime) {
            maxPlayTime = playTime;
            longestPlaying = entry;
          }
        }
      }
      if (longestPlaying) {
        return longestPlaying;
      }
    }

    if (SYNC_SETTINGS.leaderMode === 'least-buffered') {
      // Choose the video with least buffering time (most stable)
      let leastBuffered = null;
      let minBufferTime = Infinity;
      for (const entry of activeEntries) {
        if (typeof entry.rec?.time === 'number' && entry.rec.state === 1) {
          // Calculate buffering ratio (would need buffering time tracking)
          // For now, prefer videos that haven't been suspended recently
          const bufferTime = entry.rec.lastSeekAt ? Date.now() - entry.rec.lastSeekAt : 0;
          if (bufferTime < minBufferTime) {
            minBufferTime = bufferTime;
            leastBuffered = entry;
          }
        }
      }
      if (leastBuffered) {
        return leastBuffered;
      }
    }

    // Default 'first' mode
    for (const entry of activeEntries) {
      if (typeof entry.rec?.time === 'number' && entry.rec.state === 1) {
        return entry;
      }
    }
    return null;
  }

  /**
   * Attempt to recover a video player from a suspended/error state.
   * @param {object} video - Video object containing iframe and id
   * @param {string} reason - Suspension reason (buffering, stalled, ad, paused, no-state, no-time)
   * @param {object} leaderRecord - Current leader player's state record
   */
  function attemptRecovery(video, reason, leaderRecord) {
    if (!SYNC_SETTINGS.retryOnError) {
      return;
    }

    const iframe = video.iframe;
    if (!iframe) {
      return;
    }

    // Reason-based recovery strategy
    switch (reason) {
      case 'buffering':
      case 'stalled':
        if (SYNC_SETTINGS.fallbackMode === 'mute-continue') {
          // Ensure muted and try to continue playback
          sendCommand(iframe, 'mute');
          sendCommand(iframe, 'playVideo');
        } else if (SYNC_SETTINGS.fallbackMode === 'pause-catchup') {
          // Pause and wait for buffer to recover
          sendCommand(iframe, 'pauseVideo');
          // Will be re-synced in next reconcile cycle
        }
        // 'none': do nothing
        break;

      case 'paused':
        // Sync with leader's play state
        if (leaderRecord && leaderRecord.state === 1) {
          sendCommand(iframe, 'playVideo');
        }
        break;

      case 'ad':
        // Ads will resolve on their own, just maintain mute if needed
        if (SYNC_SETTINGS.fallbackMode === 'mute-continue') {
          sendCommand(iframe, 'mute');
        }
        break;

      case 'no-state':
      case 'no-time': {
        // Request fresh snapshot
        const win = iframe.contentWindow;
        if (win) {
          requestPlayerSnapshot(win);
        }
        break;
      }

      default: {
        // Unknown reason, request snapshot
        const w = iframe.contentWindow;
        if (w) {
          requestPlayerSnapshot(w);
        }
        break;
      }
    }
  }

  function reconcile() {
    try {
      if (!videos.length) {
        return;
      }
      const now = Date.now();
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
          continue;
        }
        if (suspendedPlayers.has(win)) {
          const previousSuspension = suspendedPlayers.get(win);
          suspendedPlayers.delete(win);
          rejoinQueue.push({
            v,
            rec: record,
            win,
            reason: previousSuspension?.reason || 'recovered',
          });
        }
        activeEntries.push({ v, rec: record, win });
      }

      const leaderEntry = pickLeader(activeEntries);
      if (!leaderEntry) {
        return;
      }
      const leaderRecord = leaderEntry.rec;
      if (!leaderRecord || typeof leaderRecord.time !== 'number') {
        return;
      }
      const toleranceSeconds = SYNC_SETTINGS.toleranceMs / 1000;
      const leaderPlaying = leaderRecord.state === 1;

      for (const entry of activeEntries) {
        if (entry.v === leaderEntry.v) {
          continue;
        }
        const record = entry.rec;
        if (!record || typeof record.time !== 'number') {
          continue;
        }
        const drift = record.time - leaderRecord.time;
        if (Math.abs(drift) > toleranceSeconds) {
          sendCommand(entry.v.iframe, 'seekTo', [leaderRecord.time, true]);
        }
        const isPlaying = record.state === 1;
        if (leaderPlaying && !isPlaying) {
          sendCommand(entry.v.iframe, 'playVideo');
        } else if (!leaderPlaying && isPlaying) {
          sendCommand(entry.v.iframe, 'pauseVideo');
        }
      }

      // Attempt recovery for currently suspended players
      for (const v of videos) {
        const win = v.iframe?.contentWindow;
        if (!win) {
          continue;
        }
        const suspended = suspendedPlayers.get(win);
        if (suspended) {
          attemptRecovery(v, suspended.reason, leaderRecord);
        }
      }

      const rejoinToleranceSeconds =
        (SYNC_SETTINGS.toleranceMs + SYNC_SETTINGS.rejoinSyncBufferMs) / 1000;
      for (const entry of rejoinQueue) {
        const record = entry.rec;
        if (!record || typeof record.time !== 'number') {
          continue;
        }
        const drift = record.time - leaderRecord.time;
        if (Math.abs(drift) > rejoinToleranceSeconds) {
          sendCommand(entry.v.iframe, 'seekTo', [leaderRecord.time, true]);
        }
        if (leaderPlaying) {
          sendCommand(entry.v.iframe, 'playVideo');
        } else if (record.state === 1) {
          sendCommand(entry.v.iframe, 'pauseVideo');
        }

        // Attempt recovery based on the reason
        attemptRecovery(entry.v, entry.reason, leaderRecord);
      }
    } catch (_) {
      // ignore
    }
  }

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

  function sendCommand(iframe, func, args = []) {
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
  }

  function requestPlayerSnapshot(win) {
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

  function normalizePlayerInfoMessage(payload) {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const eventType = payload.event;
    if (
      eventType !== 'infoDelivery' &&
      eventType !== 'initialDelivery' &&
      eventType !== 'onStateChange'
    ) {
      return null;
    }

    const info = payload.info;
    if (info && typeof info === 'object') {
      const normalized = {};
      const currentTime = Number(info.currentTime);
      if (Number.isFinite(currentTime)) {
        normalized.currentTime = currentTime;
      }
      const playerState = Number(info.playerState);
      if (Number.isFinite(playerState)) {
        normalized.playerState = playerState;
      }
      return Object.keys(normalized).length ? normalized : null;
    }

    const state = Number(info);
    if (eventType === 'onStateChange' && Number.isFinite(state)) {
      return { playerState: state };
    }
    return null;
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

  function syncAll() {
    if (!videos.length) {
      return;
    }
    const now = Date.now();
    const activeEntries = [];
    for (const v of videos) {
      const win = v.iframe?.contentWindow;
      if (!win) {
        continue;
      }
      const rec = playerStates.get(win);
      if (!getSuspensionReason(rec, now)) {
        activeEntries.push({ v, rec, win });
      }
    }
    const leader = pickLeader(activeEntries);
    if (!leader || typeof leader.rec?.time !== 'number') {
      return;
    }
    for (const v of videos) {
      if (v === leader.v) {
        continue;
      }
      sendCommand(v.iframe, 'seekTo', [leader.rec.time, true]);
      if (leader.rec.state === 1) {
        sendCommand(v.iframe, 'playVideo');
      }
    }
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
      urlPreviewThumb.src =
        data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/default.jpg`;
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

  function setShareStatus(message, isError = false) {
    if (!shareStatus) {
      return;
    }
    shareStatus.textContent = message;
    shareStatus.hidden = !message;
    shareStatus.classList.toggle('error', isError);
  }

  function buildShareState() {
    return {
      videos: videos.map((v) => ({
        id: v.id,
        syncGroupId: v.syncGroupId,
        offsetMs: v.offsetMs,
        cellCol: v.cellCol ?? null,
        cellRow: v.cellRow ?? null,
        tileWidth: v.tileWidth ?? null,
        tileHeight: v.tileHeight ?? null,
      })),
      layout: layoutSelect.value,
      volume: parseInt(volumeAll.value, 10),
      speed: parseFloat(speedAllSelect.value),
      gap: cellGap,
      embedSettings,
    };
  }

  function getShareUrl() {
    const state = buildShareState();
    return window.storageAdapter.generateShareUrl(state);
  }

  function normalizeShareUrl(input) {
    const raw = input.trim();
    if (!raw) {
      return null;
    }
    try {
      return new URL(raw).toString();
    } catch (_) {
      try {
        return new URL(`https://${raw}`).toString();
      } catch (e) {
        return null;
      }
    }
  }

  async function copyToClipboard(text) {
    if (!text) {
      return false;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {
      // Fallback below
    }
    try {
      const temp = document.createElement('textarea');
      temp.value = text;
      temp.setAttribute('readonly', '');
      temp.style.position = 'absolute';
      temp.style.left = '-9999px';
      document.body.appendChild(temp);
      temp.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(temp);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function showShareModal(url) {
    if (!shareModal) {
      return;
    }
    shareUrlInput.value = url;
    shareQrBox.hidden = true;
    shareQrImg.removeAttribute('src');
    setShareStatus('');
    shareModal.classList.add('active');
  }

  function hideShareModal() {
    if (!shareModal) {
      return;
    }
    shareModal.classList.remove('active');
  }

  showHelpBtn.addEventListener('click', showHelp);
  closeHelpBtn.addEventListener('click', hideHelp);
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      hideHelp();
    }
  });

  shareBtn.addEventListener('click', async () => {
    const url = getShareUrl();
    showShareModal(url);
    const copied = await copyToClipboard(url);
    if (copied) {
      shareBtn.classList.add('success');
      setShareStatus('Copied to clipboard.');
      setTimeout(() => shareBtn.classList.remove('success'), 1200);
    } else {
      setShareStatus('Copy failed. Please copy manually.', true);
    }
  });

  if (closeShareBtn) {
    closeShareBtn.addEventListener('click', hideShareModal);
  }
  if (shareModal) {
    shareModal.addEventListener('click', (e) => {
      if (e.target === shareModal) {
        hideShareModal();
      }
    });
  }
  if (copyShareBtn) {
    copyShareBtn.addEventListener('click', async () => {
      const url = normalizeShareUrl(shareUrlInput.value);
      if (!url) {
        setShareStatus('Invalid URL.', true);
        return;
      }
      const copied = await copyToClipboard(url);
      setShareStatus(copied ? 'Copied to clipboard.' : 'Copy failed.', !copied);
    });
  }
  if (openShareBtn) {
    openShareBtn.addEventListener('click', () => {
      const url = normalizeShareUrl(shareUrlInput.value);
      if (!url) {
        setShareStatus('Invalid URL.', true);
        return;
      }
      const opened = window.open(url, '_blank', 'noopener');
      if (!opened) {
        window.location.href = url;
      }
    });
  }
  if (importShareBtn) {
    importShareBtn.addEventListener('click', () => {
      const url = normalizeShareUrl(shareUrlInput.value);
      if (!url) {
        setShareStatus('Invalid URL.', true);
        return;
      }
      window.location.href = url;
    });
  }
  if (shareQrBtn) {
    shareQrBtn.addEventListener('click', () => {
      const url = normalizeShareUrl(shareUrlInput.value);
      if (!url) {
        setShareStatus('Invalid URL.', true);
        return;
      }
      shareQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
        url
      )}`;
      shareQrBox.hidden = false;
      setShareStatus('QR generated.');
    });
  }

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
    embedSettings = sanitizeEmbedSettings({
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
        embedSettings = sanitizeEmbedSettings(storedEmbedSettings);
      }
      syncEmbedSettingsUI();

      // Priority 1: Check for Deep Link session (session param)
      const sharedSession = window.storageAdapter.parseShareUrl();
      if (sharedSession) {
        isRestoring = true;

        if (sharedSession.embedSettings) {
          embedSettings = sanitizeEmbedSettings(sharedSession.embedSettings);
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
            cellGap = gap;
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

        isRestoring = false;
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
      isRestoring = true;
      (storedVideos || []).forEach((entry) => {
        // Support both old format (string) and new format (object)
        const vid = typeof entry === 'string' ? entry : entry?.id;
        const syncGroupId = typeof entry === 'object' ? (entry.syncGroupId ?? null) : null;
        const offsetMs = typeof entry === 'object' ? (entry.offsetMs ?? 0) : 0;
        const cellCol = typeof entry === 'object' ? (entry.cellCol ?? null) : null;
        const cellRow = typeof entry === 'object' ? (entry.cellRow ?? null) : null;
        const tileWidth = typeof entry === 'object' ? (entry.tileWidth ?? null) : null;
        const tileHeight = typeof entry === 'object' ? (entry.tileHeight ?? null) : null;
        if (typeof vid === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(vid) && !hasVideo(vid)) {
          createTile(vid, { syncGroupId, offsetMs, cellCol, cellRow, tileWidth, tileHeight });
        }
      });
      isRestoring = false;
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

  // Search functions
  async function searchYouTube(query) {
    if (!window.YOUTUBE_API_KEY) {
      throw new Error('YouTube API key not set. Please enter it in the search section.');
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${window.YOUTUBE_API_KEY}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      const data = await response.json();
      return data.items.map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.default.url,
        duration: 'Unknown', // Would need another API call for duration
      }));
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  function displaySearchResults(results) {
    searchResults.innerHTML = '';
    results.forEach((result) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <img src="${result.thumbnailUrl}" alt="Thumbnail">
        <div>
          <div class="title">${result.title}</div>
          <div class="channel">${result.channel}</div>
        </div>
      `;
      li.addEventListener('click', () => {
        if (!hasVideo(result.id)) {
          createTile(result.id);
          searchResults.hidden = true;
          searchInput.value = '';
        }
      });
      searchResults.appendChild(li);
    });
    searchResults.hidden = false;
  }

  // Preset functions
  async function saveCurrentPreset(name) {
    if (!name.trim()) {
      alert('プリセット名を入力してください。');
      return;
    }
    const videoIds = videos.map((v) => v.id);
    if (videoIds.length === 0) {
      alert('保存する動画がありません。');
      return;
    }

    try {
      await window.storageAdapter.savePreset(name, videoIds);
      presetNameInput.value = '';
      loadPresets();
      alert('プリセットを保存しました。');
    } catch (error) {
      console.error('Save preset failed:', error);
      alert('プリセット保存に失敗しました。');
    }
  }

  async function loadPresets() {
    try {
      const presets = await window.storageAdapter.loadPresets();
      presetList.innerHTML = '';
      presets.forEach((preset) => {
        const li = document.createElement('li');
        li.className = 'preset-item';

        // Thumbnail row (up to 3 small thumbnails)
        const thumbRow = document.createElement('div');
        thumbRow.className = 'preset-thumbs';
        (preset.videoIds || []).slice(0, 3).forEach((vid) => {
          const img = document.createElement('img');
          img.src = `https://img.youtube.com/vi/${vid}/default.jpg`;
          img.alt = '';
          img.className = 'preset-thumb';
          thumbRow.appendChild(img);
        });

        const info = document.createElement('div');
        info.className = 'preset-info';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'preset-name';
        nameSpan.textContent = preset.name;
        const meta = document.createElement('span');
        meta.className = 'preset-meta';
        const count = (preset.videoIds || []).length;
        const dateStr = preset.updatedAt ? new Date(preset.updatedAt).toLocaleDateString() : '';
        meta.textContent = `${count}本 ${dateStr}`;
        info.appendChild(nameSpan);
        info.appendChild(meta);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'preset-delete';
        deleteBtn.textContent = '✕';
        deleteBtn.title = 'プリセットを削除';
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`プリセット "${preset.name}" を削除しますか？`)) {
            await deletePreset(preset.name);
          }
        });

        li.appendChild(thumbRow);
        li.appendChild(info);
        li.appendChild(deleteBtn);
        li.addEventListener('click', () => loadPreset(preset.name));
        presetList.appendChild(li);
      });
    } catch (error) {
      console.error('Load presets failed:', error);
    }
  }

  async function deletePreset(name) {
    try {
      const presets = (await window.storageAdapter.getItem('presets')) || [];
      const filtered = presets.filter((p) => p.name !== name);
      await window.storageAdapter.setItem('presets', filtered);
      loadPresets();
    } catch (error) {
      console.error('Delete preset failed:', error);
    }
  }

  async function loadPreset(name) {
    try {
      const preset = await window.storageAdapter.loadPreset(name);
      if (!preset) {
        return;
      }

      // Clear current videos properly
      for (const v of videos) {
        const win = v.iframe?.contentWindow;
        if (win) {
          playerStates.delete(win);
          suspendedPlayers.delete(win);
        }
        v.iframe.src = '';
        v.tile?.remove();
      }
      videos.length = 0;
      gridEl.innerHTML = '';

      // Load preset videos
      preset.videoIds.forEach((id) => {
        if (!hasVideo(id)) {
          createTile(id);
        }
      });
    } catch (error) {
      console.error('Load preset failed:', error);
    }
  }

  // Event listeners for search and presets
  let apiKeyRefreshTimer;
  apiKeyInput.addEventListener('input', () => {
    window.YOUTUBE_API_KEY = apiKeyInput.value.trim() || null;
    window.storageAdapter.setItem('youtubeApiKey', window.YOUTUBE_API_KEY);
    updateApiKeyStatus();
    if (apiKeyRefreshTimer) {
      clearTimeout(apiKeyRefreshTimer);
    }
    apiKeyRefreshTimer = setTimeout(() => {
      refreshDescriptionsForAllTiles();
    }, 600);
  });

  deleteApiKeyBtn.addEventListener('click', () => {
    if (confirm('APIキーを削除しますか？')) {
      window.YOUTUBE_API_KEY = null;
      apiKeyInput.value = '';
      window.storageAdapter.setItem('youtubeApiKey', null);
      updateApiKeyStatus();
      refreshDescriptionsForAllTiles();
    }
  });

  checkQuotaBtn.addEventListener('click', async () => {
    await checkQuota();
  });

  // Initialize API key from storage
  async function initializeApiKey() {
    const storedKey = await window.storageAdapter.getItem('youtubeApiKey');
    if (storedKey) {
      window.YOUTUBE_API_KEY = storedKey;
      apiKeyInput.value = storedKey;
    }
    updateApiKeyStatus();
    refreshDescriptionsForAllTiles();
  }

  function updateApiKeyStatus() {
    const hasKey = !!window.YOUTUBE_API_KEY;
    deleteApiKeyBtn.disabled = !hasKey;
    checkQuotaBtn.disabled = !hasKey;
    if (hasKey) {
      quotaInfo.textContent = 'クオータ: 確認中...';
    } else {
      quotaInfo.textContent = 'クオータ: APIキーが設定されていません';
    }
  }

  async function checkQuota() {
    if (!window.YOUTUBE_API_KEY) {
      quotaInfo.textContent = 'クオータ: APIキーが設定されていません';
      return;
    }

    try {
      // Check quota using YouTube Data API v3
      const url = `https://www.googleapis.com/youtube/v3/search?part=id&q=test&type=video&maxResults=1&key=${window.YOUTUBE_API_KEY}`;
      const response = await fetch(url);

      if (response.status === 403) {
        const data = await response.json();
        if (data.error && data.error.errors) {
          const error = data.error.errors[0];
          if (error.reason === 'quotaExceeded') {
            quotaInfo.textContent = 'クオータ: 超過';
            quotaInfo.style.color = '#b00020';
          } else if (error.reason === 'keyInvalid') {
            quotaInfo.textContent = 'クオータ: 無効なAPIキー';
            quotaInfo.style.color = '#b00020';
          } else {
            quotaInfo.textContent = `クオータ: エラー (${error.reason})`;
            quotaInfo.style.color = '#b00020';
          }
        }
      } else if (response.ok) {
        // Get quota info from headers (limited info available)
        const quotaUsed = response.headers.get('x-quota-used');
        const quotaLimit = response.headers.get('x-quota-limit');
        if (quotaUsed && quotaLimit) {
          const remaining = quotaLimit - quotaUsed;
          quotaInfo.textContent = `クオータ: ${remaining}/${quotaLimit} 残り`;
          quotaInfo.style.color = remaining < 1000 ? '#ff6b35' : '#333';
        } else {
          quotaInfo.textContent = 'クオータ: 利用可能';
          quotaInfo.style.color = '#333';
        }
      } else {
        quotaInfo.textContent = `クオータ: 確認失敗 (${response.status})`;
        quotaInfo.style.color = '#b00020';
      }
    } catch (error) {
      console.error('Quota check failed:', error);
      quotaInfo.textContent = 'クオータ: 確認失敗';
      quotaInfo.style.color = '#b00020';
    }
  }

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    searchError.hidden = true;
    const query = searchInput.value.trim();
    if (!query) {
      return;
    }

    try {
      const results = await searchYouTube(query);
      displaySearchResults(results);
      await window.storageAdapter.saveSearchHistory(query);
    } catch (error) {
      searchError.textContent = error.message;
      searchError.hidden = false;
    }
  });

  savePresetBtn.addEventListener('click', () => {
    const name = presetNameInput.value.trim();
    saveCurrentPreset(name);
  });

  // Initialize app
  initializeApp();
  initializeApiKey();
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
    SYNC_SETTINGS.syncFrequencyHz = val;
    // Update the reconcile interval
    clearInterval(reconcileInterval);
    reconcileInterval = setInterval(reconcile, 1000 / val);
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

  // Update leader options when videos change
  let reconcileInterval = setInterval(reconcile, SYNC_SETTINGS.probeIntervalMs);

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

  function getStateLabel(state) {
    switch (state) {
      case -1:
        return '未開始';
      case 0:
        return '終了';
      case 1:
        return '再生中';
      case 2:
        return '一時停止';
      case 3:
        return 'バッファリング';
      case 5:
        return '動画キュー済';
      default:
        return state >= 100 ? '広告中' : `不明(${state})`;
    }
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
      await setImmersiveMode(!immersiveModeEnabled);
    });
  }

  if (windowFrameToggleBtn && hasElectronWindowBridge()) {
    windowFrameToggleBtn.addEventListener('click', async () => {
      try {
        await window.electronWindow.setFramelessMode(!framelessModeEnabled);
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
    if (!isFullscreen && immersiveModeEnabled) {
      immersiveModeEnabled = false;
      document.body.classList.remove('immersive-mode');
      if (typeof sidebarStateBeforeImmersive === 'boolean') {
        setSidebarCollapsed(sidebarStateBeforeImmersive);
      }
      if (typeof toolbarStateBeforeImmersive === 'boolean') {
        setToolbarCollapsed(toolbarStateBeforeImmersive);
      }
      sidebarStateBeforeImmersive = null;
      toolbarStateBeforeImmersive = null;
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
  const SYNC_GROUPS = ['A', 'B', 'C'];

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

  // ========== Phase 3-1: Group-aware reconcile override ==========
  // Replace reconcile with group-aware version
  function groupAwareReconcile() {
    try {
      if (!videos.length) {
        return;
      }
      const now = Date.now();

      // Group videos by syncGroupId
      const groups = new Map();
      for (const v of videos) {
        const gid = v.syncGroupId;
        if (!gid) {
          continue;
        }
        if (!groups.has(gid)) {
          groups.set(gid, []);
        }
        groups.get(gid).push(v);
      }

      // Reconcile each group independently
      for (const [, groupVideos] of groups) {
        reconcileGroup(groupVideos, now);
      }
    } catch (_) {
      // ignore
    }
  }

  function reconcileGroup(groupVideos, now) {
    const activeEntries = [];
    const rejoinQueue = [];

    for (const v of groupVideos) {
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
        continue;
      }
      if (suspendedPlayers.has(win)) {
        const previousSuspension = suspendedPlayers.get(win);
        suspendedPlayers.delete(win);
        rejoinQueue.push({
          v,
          rec: record,
          win,
          reason: previousSuspension?.reason || 'recovered',
        });
      }
      activeEntries.push({ v, rec: record, win });
    }

    const leaderEntry = pickLeader(activeEntries);
    if (!leaderEntry) {
      return;
    }
    const leaderRecord = leaderEntry.rec;
    if (!leaderRecord || typeof leaderRecord.time !== 'number') {
      return;
    }
    const toleranceSeconds = SYNC_SETTINGS.toleranceMs / 1000;
    const leaderPlaying = leaderRecord.state === 1;

    for (const entry of activeEntries) {
      if (entry.v === leaderEntry.v) {
        continue;
      }
      const record = entry.rec;
      if (!record || typeof record.time !== 'number') {
        continue;
      }
      // Apply per-video offset
      const offsetSec = (entry.v.offsetMs || 0) / 1000;
      const expectedTime = leaderRecord.time + offsetSec;
      const drift = record.time - expectedTime;
      if (Math.abs(drift) > toleranceSeconds) {
        sendCommand(entry.v.iframe, 'seekTo', [expectedTime, true]);
      }
      const isPlaying = record.state === 1;
      if (leaderPlaying && !isPlaying) {
        sendCommand(entry.v.iframe, 'playVideo');
      } else if (!leaderPlaying && isPlaying) {
        sendCommand(entry.v.iframe, 'pauseVideo');
      }
    }

    // Attempt recovery for suspended players in this group
    for (const v of groupVideos) {
      const win = v.iframe?.contentWindow;
      if (!win) {
        continue;
      }
      const suspended = suspendedPlayers.get(win);
      if (suspended) {
        attemptRecovery(v, suspended.reason, leaderRecord);
      }
    }

    const rejoinToleranceSeconds =
      (SYNC_SETTINGS.toleranceMs + SYNC_SETTINGS.rejoinSyncBufferMs) / 1000;
    for (const entry of rejoinQueue) {
      const record = entry.rec;
      if (!record || typeof record.time !== 'number') {
        continue;
      }
      const offsetSec = (entry.v.offsetMs || 0) / 1000;
      const expectedTime = leaderRecord.time + offsetSec;
      const drift = record.time - expectedTime;
      if (Math.abs(drift) > rejoinToleranceSeconds) {
        sendCommand(entry.v.iframe, 'seekTo', [expectedTime, true]);
      }
      if (leaderPlaying) {
        sendCommand(entry.v.iframe, 'playVideo');
      } else if (record.state === 1) {
        sendCommand(entry.v.iframe, 'pauseVideo');
      }
      attemptRecovery(entry.v, entry.reason, leaderRecord);
    }
  }

  // Replace the reconcile interval with group-aware version
  clearInterval(reconcileInterval);
  reconcileInterval = setInterval(groupAwareReconcile, SYNC_SETTINGS.probeIntervalMs);

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
      case 'f':
      case 'F':
        // Fullscreen first video
        if (videos.length > 0) {
          const fw = videos[0].tile?.querySelector('.frame-wrap');
          if (fw) {
            toggleElementFullscreen(fw);
          }
        }
        break;
      case 'F11':
        e.preventDefault();
        setImmersiveMode(!immersiveModeEnabled);
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
          if (immersiveModeEnabled) {
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

    // Number keys 1-9 to focus/fullscreen specific tile
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < videos.length) {
        const fw = videos[idx].tile?.querySelector('.frame-wrap');
        if (fw && e.shiftKey) {
          toggleElementFullscreen(fw);
        }
      }
    }
  });

  // ========== Phase 4-4: Audio focus ==========
  let audioFocusVideoId = null;

  function setAudioFocus(videoId) {
    audioFocusVideoId = videoId;
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
    if (audioFocusVideoId === videoId) {
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
        const newW = Math.max(MIN_TILE_WIDTH, startW + deltaX);
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
      if (!cellModeEnabled) {
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
    const availableWidth = gridRect.width - cellGap * 2;
    const cellWidth = (availableWidth - cellGap * (cellColumns - 1)) / cellColumns;
    const cellHeight = cellWidth * ASPECT_RATIO;
    return { cellWidth, cellHeight, gridRect };
  }

  function getCellFromPoint(x, y) {
    const { cellWidth, cellHeight, gridRect } = getCellDimensions();
    const relX = x - gridRect.left - cellGap + gridEl.scrollLeft;
    const relY = y - gridRect.top - cellGap + gridEl.scrollTop;
    const col = Math.floor(relX / (cellWidth + cellGap));
    const row = Math.floor(relY / (cellHeight + cellGap));
    return {
      col: Math.max(0, Math.min(col, cellColumns - 1)),
      row: Math.max(0, row),
    };
  }

  function positionTileInCell(tile, videoEntry) {
    if (!cellModeEnabled) {
      return;
    }
    const { cellWidth, cellHeight } = getCellDimensions();
    const col = videoEntry.cellCol ?? 0;
    const row = videoEntry.cellRow ?? 0;
    const left = cellGap + col * (cellWidth + cellGap);
    const top = cellGap + row * (cellHeight + cellGap);
    tile.style.left = left + 'px';
    tile.style.top = top + 'px';
    tile.classList.add('cell-positioned');

    // Apply custom size or default cell size
    if (!videoEntry.tileWidth) {
      tile.style.width = cellWidth + 'px';
      tile.style.height = cellHeight + 'px';
    }
  }

  function updateDropTargetHighlight(x, y) {
    clearDropTargetHighlight();
    const cell = getCellFromPoint(x, y);
    if (!cell || !cellOverlayContainer) {
      return;
    }
    const overlays = cellOverlayContainer.querySelectorAll('.cell-overlay');
    const idx = cell.row * cellColumns + cell.col;
    if (overlays[idx]) {
      overlays[idx].classList.add('drop-target');
    }
  }

  function clearDropTargetHighlight() {
    if (!cellOverlayContainer) {
      return;
    }
    cellOverlayContainer.querySelectorAll('.drop-target').forEach((el) => {
      el.classList.remove('drop-target');
    });
  }

  function createCellOverlays() {
    if (cellOverlayContainer) {
      cellOverlayContainer.remove();
    }
    cellOverlayContainer = document.createElement('div');
    cellOverlayContainer.className = 'cell-overlay-container';

    const { cellWidth, cellHeight } = getCellDimensions();
    const rows = Math.max(10, Math.ceil(videos.length / cellColumns) + 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cellColumns; c++) {
        const overlay = document.createElement('div');
        overlay.className = 'cell-overlay';
        overlay.style.left = cellGap + c * (cellWidth + cellGap) + 'px';
        overlay.style.top = cellGap + r * (cellHeight + cellGap) + 'px';
        overlay.style.width = cellWidth + 'px';
        overlay.style.height = cellHeight + 'px';
        overlay.dataset.col = c;
        overlay.dataset.row = r;
        cellOverlayContainer.appendChild(overlay);
      }
    }

    gridEl.insertBefore(cellOverlayContainer, gridEl.firstChild);
  }

  function enableCellMode() {
    cellModeEnabled = true;
    gridEl.classList.add('cell-mode');
    createCellOverlays();

    // Position all tiles
    videos.forEach((v, idx) => {
      if (v.cellCol === null || v.cellRow === null) {
        v.cellCol = idx % cellColumns;
        v.cellRow = Math.floor(idx / cellColumns);
      }
      positionTileInCell(v.tile, v);
    });
    refreshTileStackOrder();
  }

  function disableCellMode() {
    cellModeEnabled = false;
    gridEl.classList.remove('cell-mode');
    if (cellOverlayContainer) {
      cellOverlayContainer.remove();
      cellOverlayContainer = null;
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
    cellGap = gap;
    gridEl.style.gap = gap + 'px';
    gridEl.style.padding = gap + 'px';

    if (cellModeEnabled) {
      createCellOverlays();
      videos.forEach((v) => positionTileInCell(v.tile, v));
    }
  }

  // ========== Phase 5: Layout Mode Handler ==========
  function handleLayoutChange(layout) {
    // Remove all layout classes
    gridEl.classList.remove('layout-1', 'layout-2', 'layout-3', 'layout-4', 'layout-theater');

    if (layout === 'free') {
      cellColumns = 4; // Default for free mode
      enableCellMode();
    } else {
      disableCellMode();
      if (layout !== 'auto') {
        gridEl.classList.add('layout-' + layout);
      }
      if (layout === '1') {
        cellColumns = 1;
      } else if (layout === '2') {
        cellColumns = 2;
      } else if (layout === '3') {
        cellColumns = 3;
      } else if (layout === '4') {
        cellColumns = 4;
      } else {
        cellColumns = 2;
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
          cellGap = settings.gap;
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
    if (!cellModeEnabled) {
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
    if (videoEntry.zoomPanel) {
      destroyZoomPanel(videoEntry);
    } else {
      createZoomPanel(videoEntry);
    }
  }

  function createZoomPanel(videoEntry) {
    if (videoEntry.zoomPanel) {
      return;
    }

    const diameter = videoEntry.zoomDiameter ?? 250;
    const scale = videoEntry.zoomScale ?? 3;
    const originX = videoEntry.zoomOriginX ?? 50;
    const originY = videoEntry.zoomOriginY ?? 30;

    const loupe = document.createElement('div');
    loupe.className = 'zoom-loupe';
    const lx = videoEntry.zoomPanelX ?? window.innerWidth - diameter - 40;
    const ly = videoEntry.zoomPanelY ?? 60;
    loupe.style.left = Math.max(0, Math.min(lx, window.innerWidth - 100)) + 'px';
    loupe.style.top = Math.max(0, Math.min(ly, window.innerHeight - 100)) + 'px';
    loupe.style.width = diameter + 'px';
    loupe.style.height = diameter + 'px';

    const zoomIframe = document.createElement('iframe');
    zoomIframe.src = buildEmbedUrl(videoEntry.id, { mute: 1, controls: 0 });
    zoomIframe.allow = 'autoplay; encrypted-media';
    zoomIframe.loading = 'lazy';
    zoomIframe.setAttribute('referrerpolicy', 'origin');
    zoomIframe.title = `Zoom: ${videoEntry.id}`;
    zoomIframe.style.transform = `scale(${scale})`;
    zoomIframe.style.transformOrigin = `${originX}% ${originY}%`;
    loupe.appendChild(zoomIframe);

    // Close button (visible on hover)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'zoom-loupe-close';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      destroyZoomPanel(videoEntry);
    });
    loupe.appendChild(closeBtn);

    // Hover controls tray
    const tray = document.createElement('div');
    tray.className = 'zoom-loupe-tray';

    function addSlider(labelText, min, max, step, value, onChange) {
      const row = document.createElement('div');
      row.className = 'zoom-loupe-slider-row';
      const lbl = document.createElement('label');
      lbl.textContent = labelText;
      const inp = document.createElement('input');
      inp.type = 'range';
      inp.min = min;
      inp.max = max;
      inp.step = step;
      inp.value = value;
      inp.addEventListener('input', (e) => {
        e.stopPropagation();
        onChange(parseFloat(e.target.value));
      });
      inp.addEventListener('mousedown', (e) => e.stopPropagation());
      row.appendChild(lbl);
      row.appendChild(inp);
      tray.appendChild(row);
    }

    addSlider('X', 0, 100, 1, originX, (v) => {
      videoEntry.zoomOriginX = v;
      zoomIframe.style.transformOrigin = `${v}% ${videoEntry.zoomOriginY ?? 30}%`;
      persistVideos();
    });
    addSlider('Y', 0, 100, 1, originY, (v) => {
      videoEntry.zoomOriginY = v;
      zoomIframe.style.transformOrigin = `${videoEntry.zoomOriginX ?? 50}% ${v}%`;
      persistVideos();
    });
    addSlider('\u500D', 1.5, 6, 0.5, scale, (v) => {
      videoEntry.zoomScale = v;
      zoomIframe.style.transform = `scale(${v})`;
      persistVideos();
    });
    loupe.appendChild(tray);

    document.body.appendChild(loupe);
    videoEntry.zoomPanel = loupe;

    // Drag (anywhere on the loupe)
    setupZoomLoupeDrag(loupe, videoEntry);

    // Scroll wheel to resize
    loupe.addEventListener('wheel', (e) => {
      e.preventDefault();
      const cur = videoEntry.zoomDiameter ?? 250;
      const next = Math.max(100, Math.min(600, cur - Math.sign(e.deltaY) * 30));
      videoEntry.zoomDiameter = next;
      loupe.style.width = next + 'px';
      loupe.style.height = next + 'px';
      persistVideos();
    });

    syncZoomIframe(videoEntry, zoomIframe);
  }

  function destroyZoomPanel(videoEntry) {
    if (videoEntry._zoomSyncInterval) {
      clearInterval(videoEntry._zoomSyncInterval);
      videoEntry._zoomSyncInterval = null;
    }
    if (videoEntry.zoomPanel) {
      videoEntry.zoomPanel.remove();
      videoEntry.zoomPanel = null;
    }
  }

  function setupZoomLoupeDrag(loupe, videoEntry) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    loupe.addEventListener('mousedown', (e) => {
      if (e.target.closest('.zoom-loupe-close') || e.target.closest('input')) {
        return;
      }
      e.preventDefault();
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = loupe.offsetLeft;
      startTop = loupe.offsetTop;
      loupe.style.cursor = 'grabbing';

      const onMove = (ev) => {
        if (!isDragging) {
          return;
        }
        loupe.style.left = startLeft + ev.clientX - startX + 'px';
        loupe.style.top = startTop + ev.clientY - startY + 'px';
      };

      const onUp = () => {
        if (!isDragging) {
          return;
        }
        isDragging = false;
        loupe.style.cursor = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        videoEntry.zoomPanelX = loupe.offsetLeft;
        videoEntry.zoomPanelY = loupe.offsetTop;
        persistVideos();
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function syncZoomIframe(videoEntry, zoomIframe) {
    zoomIframe.addEventListener(
      'load',
      () => {
        setTimeout(() => {
          const zoomWin = zoomIframe.contentWindow;
          if (!zoomWin) {
            return;
          }
          try {
            zoomWin.postMessage(JSON.stringify({ event: 'listening' }), ALLOWED_ORIGIN);
          } catch (_) {
            /* ignore */
          }

          const mainWin = videoEntry.iframe?.contentWindow;
          const mainRec = mainWin ? playerStates.get(mainWin) : null;
          if (mainRec && typeof mainRec.time === 'number') {
            zoomWin.postMessage(
              JSON.stringify({ event: 'command', func: 'seekTo', args: [mainRec.time, true] }),
              ALLOWED_ORIGIN
            );
            if (mainRec.state === 1) {
              zoomWin.postMessage(
                JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
                ALLOWED_ORIGIN
              );
            }
          }
          zoomWin.postMessage(
            JSON.stringify({ event: 'command', func: 'mute', args: [] }),
            ALLOWED_ORIGIN
          );
        }, 500);
      },
      { once: true }
    );

    // Periodic sync (every 5s) to keep zoom iframe aligned with main
    videoEntry._zoomSyncInterval = setInterval(() => {
      if (!videoEntry.zoomPanel) {
        clearInterval(videoEntry._zoomSyncInterval);
        videoEntry._zoomSyncInterval = null;
        return;
      }
      const zoomWin = zoomIframe.contentWindow;
      const mainWin = videoEntry.iframe?.contentWindow;
      if (!zoomWin || !mainWin) {
        return;
      }
      const mainRec = playerStates.get(mainWin);
      if (!mainRec || typeof mainRec.time !== 'number') {
        return;
      }

      zoomWin.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [mainRec.time, true] }),
        ALLOWED_ORIGIN
      );
      if (mainRec.state === 1) {
        zoomWin.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
          ALLOWED_ORIGIN
        );
      } else if (mainRec.state === 2) {
        zoomWin.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
          ALLOWED_ORIGIN
        );
      }
      zoomWin.postMessage(
        JSON.stringify({ event: 'command', func: 'mute', args: [] }),
        ALLOWED_ORIGIN
      );
    }, 5000);
  }
})();
