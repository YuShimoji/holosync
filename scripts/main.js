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

  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const searchError = document.getElementById('searchError');

  const apiKeyInput = document.getElementById('apiKeyInput');

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

  const YT_ORIGIN = 'https://www.youtube.com';
  const ALLOWED_COMMANDS = new Set([
    'playVideo',
    'pauseVideo',
    'mute',
    'unMute',
    'setVolume',
    'seekTo',
  ]);
  const SYNC_SETTINGS = {
    toleranceMs: 300,
    probeIntervalMs: 500,
    stallThresholdMs: 2500,
    rejoinSyncBufferMs: 500,
    leaderMode: 'first', // 'first' | 'manual'
    leaderId: null,
  };

  function hasVideo(id) {
    return videos.some((v) => v.id === id);
  }

  function persistVideos() {
    const ids = videos.map((v) => v.id);
    window.storageAdapter.setItem('videos', ids);
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

  function createTile(videoId) {
    const tile = document.createElement('div');
    tile.className = 'tile';

    const frameWrap = document.createElement('div');
    frameWrap.className = 'frame-wrap';

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&playsinline=1&mute=1`;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.setAttribute('allowfullscreen', '');
    iframe.title = `YouTube video ${videoId}`;

    frameWrap.appendChild(iframe);
    tile.appendChild(frameWrap);

    gridEl.appendChild(tile);

    videos.push({ iframe, id: videoId });
    initializeSyncForIframe(iframe);

    if (!isRestoring) {
      persistVideos();
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
    for (const entry of activeEntries) {
      if (typeof entry.rec?.time === 'number' && entry.rec.state === 1) {
        return entry;
      }
    }
    for (const entry of activeEntries) {
      if (typeof entry.rec?.time === 'number') {
        return entry;
      }
    }
    return null;
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
          suspendedPlayers.delete(win);
          rejoinQueue.push({ v, rec: record, win });
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
      }
    } catch (_) {
      // ignore
    }
  }

  setInterval(reconcile, SYNC_SETTINGS.probeIntervalMs);

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
    win.postMessage(message, YT_ORIGIN);
  }

  function requestPlayerSnapshot(win) {
    try {
      win.postMessage(JSON.stringify({ event: 'listening' }), YT_ORIGIN);
      const commands = [
        { event: 'command', func: 'getPlayerState', args: [] },
        { event: 'command', func: 'getCurrentTime', args: [] },
      ];
      commands.forEach((cmd) => win.postMessage(JSON.stringify(cmd), YT_ORIGIN));
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

  function setVolumeAll(val) {
    videos.forEach((v) => sendCommand(v.iframe, 'setVolume', [val]));
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

  playAllBtn.addEventListener('click', playAll);
  pauseAllBtn.addEventListener('click', pauseAll);
  muteAllBtn.addEventListener('click', muteAll);
  unmuteAllBtn.addEventListener('click', unmuteAll);

  volumeAll.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    volumeVal.textContent = String(val);
    setVolumeAll(val);
    persistVolume(val);
  });

  async function initializeApp() {
    try {
      const videosData = (await window.storageAdapter.getItem('videos')) || [];
      const volumeData = (await window.storageAdapter.getItem('volume')) || 50;
      const vol = parseInt(volumeData, 10);
      if (!Number.isNaN(vol)) {
        volumeAll.value = String(vol);
        volumeVal.textContent = String(vol);
      }
      isRestoring = true;
      (videosData || []).forEach((vid) => {
        if (typeof vid === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(vid) && !hasVideo(vid)) {
          createTile(vid);
        }
      });
      isRestoring = false;
      if (!Number.isNaN(vol)) {
        setVolumeAll(vol);
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
        li.textContent = preset.name;
        li.addEventListener('click', () => loadPreset(preset.name));
        presetList.appendChild(li);
      });
    } catch (error) {
      console.error('Load presets failed:', error);
    }
  }

  async function loadPreset(name) {
    try {
      const preset = await window.storageAdapter.loadPreset(name);
      if (!preset) {
        return;
      }

      // Clear current videos
      videos.forEach((v) => v.iframe.remove());
      videos.length = 0;

      // Load preset videos
      preset.videoIds.forEach((id) => {
        if (!hasVideo(id)) {
          createTile(id);
        }
      });

      alert(`プリセット "${name}" を読み込みました。`);
    } catch (error) {
      console.error('Load preset failed:', error);
      alert('プリセット読み込みに失敗しました。');
    }
  }

  // Event listeners for search and presets
  apiKeyInput.addEventListener('input', () => {
    window.YOUTUBE_API_KEY = apiKeyInput.value.trim() || null;
    window.storageAdapter.setItem('youtubeApiKey', window.YOUTUBE_API_KEY);
  });

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

  // Initialize presets on load
  async function initializeFeatures() {
    const savedApiKey = await window.storageAdapter.getItem('youtubeApiKey');
    if (savedApiKey) {
      window.YOUTUBE_API_KEY = savedApiKey;
      apiKeyInput.value = savedApiKey;
    }
    await loadPresets();
  }

  window.addEventListener('message', (event) => {
    try {
      if (event.origin !== YT_ORIGIN) {
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

  // Initialize app
  initializeApp();
  initializeFeatures();
})();
