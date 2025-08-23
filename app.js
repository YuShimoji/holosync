/**
 * @file app.js
 * @brief HoloSync main UI script. Handles adding YouTube videos, batch controls,
 *        and persistence via chrome.storage.local.
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

  /**
   * Check if the video id already exists in the grid.
   * @param {string} id - YouTube video ID.
   * @returns {boolean} True if the video already exists.
   */
  function hasVideo(id) {
    return videos.some(v => v.id === id);
  }

  /**
   * Persist the current video id list to chrome.storage.local.
   * @returns {void}
   */
  function persistVideos() {
    const ids = videos.map(v => v.id);
    try {
      chrome.storage?.local?.set({ videos: ids });
    } catch (_) {
      // ignore if storage is unavailable
    }
  }

  /**
   * Persist the current volume to chrome.storage.local.
   * @param {number} val - Volume 0..100
   * @returns {void}
   */
  function persistVolume(val) {
    try {
      chrome.storage?.local?.set({ volume: val });
    } catch (_) {
      // ignore
    }
  }

  /**
   * Parse a YouTube video ID from a variety of URL formats or a raw ID string.
   * Supported: raw 11-char ID, youtu.be/<id>, youtube.com/watch?v=<id>,
   *            youtube.com/live/<id>, youtube.com/embed/<id>.
   * @param {string} input - URL or raw ID
   * @returns {string|null} Parsed 11-char video ID or null if invalid.
   */
  function parseYouTubeId(input) {
    if (!input) return null;
    try {
      // Accept raw ID
      if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

      const url = new URL(input);
      // youtu.be/<id>
      if (url.hostname === 'youtu.be') {
        const id = url.pathname.replace('/', '');
        if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
      }
      // www.youtube.com/watch?v=<id>
      if (url.hostname.endsWith('youtube.com')) {
        const v = url.searchParams.get('v');
        if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
        // /live/<id>
        const parts = url.pathname.split('/').filter(Boolean);
        const liveIdx = parts.indexOf('live');
        if (liveIdx !== -1 && parts[liveIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[liveIdx + 1])) {
          return parts[liveIdx + 1];
        }
        // /embed/<id>
        const embedIdx = parts.indexOf('embed');
        if (embedIdx !== -1 && parts[embedIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[embedIdx + 1])) {
          return parts[embedIdx + 1];
        }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Create a video tile and append it to the grid for the specified video ID.
   * @param {string} videoId - YouTube video ID
   * @returns {void}
   */
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

    if (!isRestoring) {
      persistVideos();
    }
  }

  /**
   * Send a command to a YouTube iframe via postMessage API.
   * @param {HTMLIFrameElement} iframe - Target iframe
   * @param {string} func - Player API function name (e.g., 'playVideo')
   * @param {any[]} [args=[]] - Optional arguments for the function
   * @returns {void}
   */
  function sendCommand(iframe, func, args = []) {
    const win = iframe.contentWindow;
    if (!win) return;
    const message = JSON.stringify({ event: 'command', func, args });
    // Target origin is YouTube
    win.postMessage(message, 'https://www.youtube.com');
  }

  /** Play all videos (muted first to satisfy autoplay policies). */
  function playAll() {
    // To satisfy autoplay policies, ensure muted first
    videos.forEach(v => sendCommand(v.iframe, 'mute'));
    videos.forEach(v => sendCommand(v.iframe, 'playVideo'));
  }

  /** Pause all videos. */
  function pauseAll() {
    videos.forEach(v => sendCommand(v.iframe, 'pauseVideo'));
  }

  /** Mute all videos. */
  function muteAll() {
    videos.forEach(v => sendCommand(v.iframe, 'mute'));
  }

  /** Unmute all videos. */
  function unmuteAll() {
    videos.forEach(v => sendCommand(v.iframe, 'unMute'));
  }

  /**
   * Set volume on all videos.
   * @param {number} val - Volume 0..100
   */
  function setVolumeAll(val) {
    videos.forEach(v => sendCommand(v.iframe, 'setVolume', [val]));
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

  // Restore saved state
  try {
    chrome.storage?.local?.get({ videos: [], volume: 50 }, (data) => {
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
    // ignore if storage not available
  }
})();
