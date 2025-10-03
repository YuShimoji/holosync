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

  const playAllBtn = document.getElementById('playAll');
  const pauseAllBtn = document.getElementById('pauseAll');
  const muteAllBtn = document.getElementById('muteAll');
  const unmuteAllBtn = document.getElementById('unmuteAll');
  const volumeAll = document.getElementById('volumeAll');
  const volumeVal = document.getElementById('volumeVal');

  /** @type {{iframe: HTMLIFrameElement, id: string}[]} */
  const videos = [];
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
  ]);

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
      // allowSeekAhead=true for quicker convergence
      return [seconds, true];
    }
    return [];
  }

  // Storage abstraction: prefer chrome.storage, fallback to localStorage
  function hasChromeStorage() {
    try {
      const ls = window.chrome?.storage?.local;
      return !!(ls && typeof ls.get === 'function' && typeof ls.set === 'function');
    } catch (_) {
      return false;
    }
  }

  function storageGet(defaults, cb) {
    try {
      if (hasChromeStorage()) {
        window.chrome.storage.local.get(defaults, (data) => {
          try {
            cb(data || defaults);
          } catch (_) {
            cb(defaults);
          }
        });
        return;
      }
      if (typeof localStorage !== 'undefined') {
        const result = { ...defaults };
        for (const key of Object.keys(defaults)) {
          const raw = localStorage.getItem(`hs_${key}`);
          if (raw !== null) {
            try {
              result[key] = JSON.parse(raw);
            } catch (_) {
              result[key] = raw;
            }
          }
        }
        cb(result);
        return;
      }
      cb(defaults);
    } catch (_) {
      cb(defaults);
    }
  }

  function storageSet(obj) {
    try {
      if (hasChromeStorage()) {
        window.chrome.storage.local.set(obj);
        return;
      }
      if (typeof localStorage !== 'undefined') {
        for (const [k, v] of Object.entries(obj)) {
          try {
            localStorage.setItem(`hs_${k}`, JSON.stringify(v));
          } catch (_) {
            // ignore serialization errors
          }
        }
      }
    } catch (_) {
      // ignore
    }
  }

  // --- Sync Phase1: receive-side state collection ---
  /** @type {Map<Window, {time?: number, state?: number, lastUpdate?: number}>} */
  const playerStates = new Map();

  function initIframe(iframe) {
    function ping() {
      try {
        const win = iframe.contentWindow;
        if (!win) {
          return;
        }
        // Enable infoDelivery messages and request initial snapshot
        win.postMessage(JSON.stringify({ event: 'listening' }), ALLOWED_ORIGIN);
        const cmds = [
          { event: 'command', func: 'getPlayerState', args: [] },
          { event: 'command', func: 'getCurrentTime', args: [] },
        ];
        cmds.forEach((m) => win.postMessage(JSON.stringify(m), ALLOWED_ORIGIN));
      } catch (_) {
        // ignore
      }
    }
    // Try after load, and also fallback shortly after in case load already fired
    iframe.addEventListener('load', () => setTimeout(ping, 200), { once: true });
    setTimeout(ping, 600);
  }

  function onMessage(ev) {
    try {
      if (ev.origin !== ALLOWED_ORIGIN) {
        return;
      }
      let payload = ev.data;
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
      if (payload.event !== 'infoDelivery' || !payload.info || typeof payload.info !== 'object') {
        return;
      }
      const info = payload.info;
      const src = /** @type {Window} */ (ev.source);
      const rec = playerStates.get(src) || {};
      if (typeof info.currentTime === 'number') {
        rec.time = info.currentTime;
      }
      if (typeof info.playerState !== 'undefined') {
        rec.state = info.playerState;
      }
      rec.lastUpdate = Date.now();
      playerStates.set(src, rec);
    } catch (_) {
      // ignore
    }
  }

  window.addEventListener('message', onMessage, false);

  // --- Sync Phase2: basic drift reconcile (seekTo + play/pause) ---
  const SYNC_SETTINGS = {
    toleranceMs: 300,
    probeIntervalMs: 500,
    leaderMode: 'first', // 'first' | 'manual'
    leaderId: null,
  };

  function pickLeader() {
    if (SYNC_SETTINGS.leaderMode === 'manual' && SYNC_SETTINGS.leaderId) {
      const v = videos.find((x) => x.id === SYNC_SETTINGS.leaderId);
      if (v && v.iframe && v.iframe.contentWindow) {
        const rec = playerStates.get(v.iframe.contentWindow);
        if (rec && typeof rec.time === 'number') {
          return { v, rec };
        }
      }
    }
    for (const v of videos) {
      const win = v.iframe?.contentWindow;
      if (!win) {
        continue;
      }
      const rec = playerStates.get(win);
      if (rec && typeof rec.time === 'number') {
        return { v, rec };
      }
    }
    return null;
  }

  function reconcile() {
    try {
      if (!videos.length) {
        return;
      }
      const leader = pickLeader();
      if (!leader) {
        return;
      }
      const leaderRec = playerStates.get(leader.v.iframe.contentWindow);
      if (!leaderRec || typeof leaderRec.time !== 'number') {
        return;
      }
      const tolSec = SYNC_SETTINGS.toleranceMs / 1000;
      const leaderPlaying = leaderRec.state === 1; // YT: 1=playing

      for (const v of videos) {
        if (v === leader.v) {
          continue;
        }
        const rec = playerStates.get(v.iframe.contentWindow);
        if (!rec || typeof rec.time !== 'number') {
          continue;
        }
        const drift = rec.time - leaderRec.time;
        if (Math.abs(drift) > tolSec) {
          sendCommand(v.iframe, 'seekTo', [leaderRec.time, true]);
        }
        const isPlaying = rec.state === 1;
        if (leaderPlaying && !isPlaying) {
          sendCommand(v.iframe, 'playVideo');
        } else if (!leaderPlaying && isPlaying) {
          sendCommand(v.iframe, 'pauseVideo');
        }
      }
    } catch (_) {
      // ignore
    }
  }

  setInterval(reconcile, SYNC_SETTINGS.probeIntervalMs);
  function hasVideo(id) {
    return videos.some((v) => v.id === id);
  }

  function persistVideos() {
    const ids = videos.map((v) => v.id);
    storageSet({ videos: ids });
  }

  function persistVolume(val) {
    storageSet({ volume: val });
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
    iframe.loading = 'lazy';
    iframe.setAttribute('referrerpolicy', 'origin');
    iframe.setAttribute('allowfullscreen', '');
    iframe.title = `YouTube video ${videoId}`;

    frameWrap.appendChild(iframe);
    tile.appendChild(frameWrap);

    gridEl.appendChild(tile);

    videos.push({ iframe, id: videoId });

    // Initialize receive-side flow for this iframe
    initIframe(iframe);

    if (!isRestoring) {
      persistVideos();
    }
  }

  function sendCommand(iframe, func, args = []) {
    const win = iframe.contentWindow;
    if (!win) {
      return;
    }
    if (!ALLOWED_COMMANDS.has(func)) {
      return;
    }
    const safeArgs = sanitizeArgs(func, args);
    const message = JSON.stringify({ event: 'command', func, args: safeArgs });
    win.postMessage(message, ALLOWED_ORIGIN);
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

  try {
    storageGet({ videos: [], volume: 50 }, (data) => {
      const vol = parseInt(data.volume, 10);
      if (!Number.isNaN(vol)) {
        volumeAll.value = String(vol);
        volumeVal.textContent = String(vol);
      }
      isRestoring = true;
      (data.videos || []).forEach((vid) => {
        if (typeof vid === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(vid) && !hasVideo(vid)) {
          createTile(vid);
        }
      });
      isRestoring = false;
      if (!Number.isNaN(vol)) {
        setVolumeAll(vol);
      }
    });
  } catch (_) {
    // ignore
  }
})();
