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

  // Phase 1: Layout controls
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarOpen = document.getElementById('sidebarOpen');
  const layoutSelect = document.getElementById('layoutSelect');
  const dropHint = document.getElementById('dropHint');

  // Phase 5: Cell mode and resize controls
  const gridGapInput = document.getElementById('gridGap');
  const gridGapVal = document.getElementById('gridGapVal');

  // Cell mode state
  let cellModeEnabled = false;
  let cellColumns = 2;
  let cellGap = 8;
  let cellOverlayContainer = null;
  const DEFAULT_TILE_WIDTH = 320;
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
  const debugPanel = document.getElementById('debugPanel');
  const debugClose = document.getElementById('debugClose');
  const debugContent = document.getElementById('debugContent');

  const savePresetBtn = document.getElementById('savePresetBtn');
  const presetNameInput = document.getElementById('presetNameInput');
  const presetList = document.getElementById('presetList');

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
  function hasVideo(id) {
    return videos.some((v) => v.id === id);
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
    iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&mute=1&modestbranding=1&rel=0`;
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
    fullscreenBtn.addEventListener('click', () => {
      if (frameWrap.requestFullscreen) {
        frameWrap.requestFullscreen();
      }
    });

    const popoutBtn = document.createElement('button');
    popoutBtn.className = 'tile-action-btn';
    popoutBtn.textContent = '↗';
    popoutBtn.title = 'ポップアウト';
    popoutBtn.addEventListener('click', () => {
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
      window.open(
        embedUrl,
        `holosync-${videoId}`,
        'width=640,height=360,menubar=no,toolbar=no,location=no'
      );
    });

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

    actions.appendChild(fullscreenBtn);
    actions.appendChild(popoutBtn);
    actions.appendChild(zoomBtn);
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
    frameWrap.addEventListener('dblclick', () => {
      if (frameWrap.requestFullscreen) {
        frameWrap.requestFullscreen();
      }
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
    tile.appendChild(syncBadge);
    tile.appendChild(offsetControl);
    tile.appendChild(actions);
    tile.appendChild(dragHandle);
    tile.appendChild(resizeHandle);
    tile.appendChild(sizeBadge);
    tile.appendChild(frameWrap);
    tile.appendChild(infoHeader);
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
    };
    videos.push(videoEntry);

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
        fetchVideoDescription(videoId, bodyEl);
      }
    } catch (_) {
      bodyEl.textContent = 'メタデータ取得失敗';
    }
  }

  /** Fetch video description via YouTube Data API (optional) */
  async function fetchVideoDescription(videoId, bodyEl) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${window.YOUTUBE_API_KEY}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        return;
      }
      const data = await resp.json();
      if (data.items && data.items[0]) {
        const desc = data.items[0].snippet.description || '';
        const descDiv = document.createElement('div');
        descDiv.className = 'info-description';
        descDiv.textContent = desc;
        bodyEl.appendChild(descDiv);
      }
    } catch (_) {
      // ignore
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
    if (typeof info.currentTime === 'number') {
      record.time = info.currentTime;
    }
    if (typeof info.playerState === 'number') {
      record.state = info.playerState;
    }
    record.lastUpdate = Date.now();
    playerStates.set(win, record);
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

  function playAll() {
    videos.forEach((v) => sendCommand(v.iframe, 'mute'));
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

  function setSpeedAll(rate) {
    videos.forEach((v) => sendCommand(v.iframe, 'setPlaybackRate', [rate]));
  }

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
      return;
    }
    createTile(id);
    urlInput.value = '';
    urlInput.focus();
  });

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
      // First check URL parameters for shared data
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
  apiKeyInput.addEventListener('input', () => {
    window.YOUTUBE_API_KEY = apiKeyInput.value.trim() || null;
    window.storageAdapter.setItem('youtubeApiKey', window.YOUTUBE_API_KEY);
    updateApiKeyStatus();
  });

  deleteApiKeyBtn.addEventListener('click', () => {
    if (confirm('APIキーを削除しますか？')) {
      window.YOUTUBE_API_KEY = null;
      apiKeyInput.value = '';
      window.storageAdapter.setItem('youtubeApiKey', null);
      updateApiKeyStatus();
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
      if (payload.event !== 'infoDelivery' || typeof payload.info !== 'object') {
        return;
      }
      const sourceWin = /** @type {Window} */ (event.source);
      trackPlayerState(sourceWin, payload.info);
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
    window.storageAdapter.setItem('sidebarCollapsed', collapsed);
  }

  sidebarToggle.addEventListener('click', () => {
    setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
  });
  sidebarOpen.addEventListener('click', () => {
    setSidebarCollapsed(false);
  });

  // Restore sidebar state
  (async () => {
    const collapsed = await window.storageAdapter.getItem('sidebarCollapsed');
    if (collapsed === true) {
      setSidebarCollapsed(true);
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
          if (fw && fw.requestFullscreen) {
            fw.requestFullscreen();
          }
        }
        break;
      case 's':
      case 'S':
        // Sync all
        syncAll();
        break;
      case 'Escape':
        // Close sidebar if open on mobile, or exit debug
        if (!debugPanel.hidden) {
          debugPanel.hidden = true;
        }
        break;
    }

    // Number keys 1-9 to focus/fullscreen specific tile
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < videos.length) {
        const fw = videos[idx].tile?.querySelector('.frame-wrap');
        if (fw && fw.requestFullscreen && e.shiftKey) {
          fw.requestFullscreen();
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

  // ========== Zoom View Panel ==========
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

    const panel = document.createElement('div');
    panel.className = 'zoom-panel';
    const panelX = Math.min(
      Math.max(0, videoEntry.zoomPanelX ?? window.innerWidth - 380),
      window.innerWidth - 200
    );
    const panelY = Math.min(Math.max(0, videoEntry.zoomPanelY ?? 60), window.innerHeight - 100);
    panel.style.left = panelX + 'px';
    panel.style.top = panelY + 'px';
    panel.style.opacity = (videoEntry.zoomOpacity ?? 100) / 100;

    // Header
    const header = document.createElement('div');
    header.className = 'zoom-panel-header';
    const title = document.createElement('span');
    title.className = 'zoom-panel-title';
    title.textContent = '\uD83D\uDD0D ' + (videoEntry.meta?.title || videoEntry.id);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'zoom-panel-close';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', () => destroyZoomPanel(videoEntry));
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Viewport
    const viewport = document.createElement('div');
    viewport.className = 'zoom-panel-viewport';
    viewport.style.width = (videoEntry.zoomPanelW ?? 320) + 'px';
    viewport.style.height = (videoEntry.zoomPanelH ?? 180) + 'px';

    const zoomIframe = document.createElement('iframe');
    zoomIframe.src = `https://www.youtube.com/embed/${videoEntry.id}?enablejsapi=1&playsinline=1&mute=1&modestbranding=1&rel=0&controls=0`;
    zoomIframe.allow = 'autoplay; encrypted-media';
    zoomIframe.loading = 'lazy';
    zoomIframe.setAttribute('referrerpolicy', 'origin');
    zoomIframe.title = `Zoom: ${videoEntry.id}`;

    const scale = videoEntry.zoomScale ?? 2.5;
    const originX = videoEntry.zoomOriginX ?? 50;
    const originY = videoEntry.zoomOriginY ?? 20;
    zoomIframe.style.transform = `scale(${scale})`;
    zoomIframe.style.transformOrigin = `${originX}% ${originY}%`;

    viewport.appendChild(zoomIframe);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'zoom-panel-controls';

    function addSlider(labelText, min, max, step, value, onChange) {
      const lbl = document.createElement('label');
      lbl.textContent = labelText;
      const inp = document.createElement('input');
      inp.type = 'range';
      inp.min = min;
      inp.max = max;
      inp.step = step;
      inp.value = value;
      const val = document.createElement('span');
      val.className = 'zoom-val';
      val.textContent = step >= 1 ? String(Math.round(value)) : Number(value).toFixed(1);
      inp.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        val.textContent = step >= 1 ? String(Math.round(v)) : v.toFixed(1);
        onChange(v);
      });
      controls.appendChild(lbl);
      controls.appendChild(inp);
      controls.appendChild(val);
    }

    addSlider('X', 0, 100, 1, originX, (v) => {
      videoEntry.zoomOriginX = v;
      zoomIframe.style.transformOrigin = `${v}% ${videoEntry.zoomOriginY}%`;
      persistVideos();
    });
    addSlider('Y', 0, 100, 1, originY, (v) => {
      videoEntry.zoomOriginY = v;
      zoomIframe.style.transformOrigin = `${videoEntry.zoomOriginX}% ${v}%`;
      persistVideos();
    });
    addSlider('\u500D\u7387', 1.5, 5, 0.5, scale, (v) => {
      videoEntry.zoomScale = v;
      zoomIframe.style.transform = `scale(${v})`;
      persistVideos();
    });
    addSlider('\u900F\u904E', 10, 100, 5, videoEntry.zoomOpacity ?? 100, (v) => {
      videoEntry.zoomOpacity = v;
      panel.style.opacity = v / 100;
      persistVideos();
    });

    // Resize handle
    const resizeEl = document.createElement('div');
    resizeEl.className = 'zoom-panel-resize';
    resizeEl.textContent = '\u2922';

    panel.appendChild(header);
    panel.appendChild(viewport);
    panel.appendChild(controls);
    panel.appendChild(resizeEl);

    document.body.appendChild(panel);
    videoEntry.zoomPanel = panel;

    setupZoomPanelDrag(panel, header, videoEntry);
    setupZoomPanelResize(panel, viewport, resizeEl, videoEntry);
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

  function setupZoomPanelDrag(panel, header, videoEntry) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.zoom-panel-close')) {
        return;
      }
      e.preventDefault();
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = panel.offsetLeft;
      startTop = panel.offsetTop;

      const onMove = (ev) => {
        if (!isDragging) {
          return;
        }
        panel.style.left = startLeft + ev.clientX - startX + 'px';
        panel.style.top = startTop + ev.clientY - startY + 'px';
      };

      const onUp = () => {
        if (!isDragging) {
          return;
        }
        isDragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        videoEntry.zoomPanelX = panel.offsetLeft;
        videoEntry.zoomPanelY = panel.offsetTop;
        persistVideos();
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function setupZoomPanelResize(panel, viewport, handle, videoEntry) {
    let isResizing = false;
    let startX, startW;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      startX = e.clientX;
      startW = viewport.offsetWidth;

      const onMove = (ev) => {
        if (!isResizing) {
          return;
        }
        const newW = Math.max(160, startW + ev.clientX - startX);
        const newH = Math.round(newW * (9 / 16));
        viewport.style.width = newW + 'px';
        viewport.style.height = newH + 'px';
      };

      const onUp = () => {
        if (!isResizing) {
          return;
        }
        isResizing = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        videoEntry.zoomPanelW = viewport.offsetWidth;
        videoEntry.zoomPanelH = viewport.offsetHeight;
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
