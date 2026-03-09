/**
 * @file scripts/channel.js
 * @brief Channel live monitoring: register YouTube channels, poll for active
 *        live streams, and auto-add detected streams as tiles.
 */
import { youtubeApiKey, hasVideo } from './state.js';
import { createTile } from './player.js';

// ── Constants ─────────────────────────────────────────────

const STORAGE_KEY = 'channelWatchList';
const POLL_INTERVAL_KEY = 'channelPollInterval';
const DEFAULT_POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

// ── Module State ──────────────────────────────────────────

let watchList = []; // Array<ChannelEntry>
let pollTimerId = null;
let pollIntervalMs = DEFAULT_POLL_INTERVAL_MS;

// DOM references (set in initChannel)
let channelListEl = null;
let channelUrlInput = null;
let channelAddBtn = null;
let channelRefreshAllBtn = null;
let channelNextCheckEl = null;
let channelQuotaHint = null;
let channelIntervalInput = null;

// ── Persistence ───────────────────────────────────────────

function loadWatchList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    watchList = raw ? JSON.parse(raw) : [];
  } catch (_) {
    watchList = [];
  }
  try {
    const interval = localStorage.getItem(POLL_INTERVAL_KEY);
    if (interval) {
      pollIntervalMs = Math.min(60 * 60000, Math.max(1 * 60000, Number(interval)));
    }
  } catch (_) {
    /* use default */
  }
}

function saveWatchList() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(watchList));
}

function savePollInterval() {
  localStorage.setItem(POLL_INTERVAL_KEY, String(pollIntervalMs));
}

// ── Channel URL Parsing ───────────────────────────────────

/**
 * Parse a YouTube channel URL and return { type, value }.
 * Supported: /channel/UCxxxx, /@handle
 * Returns null if the URL is not a recognised channel URL.
 */
export function parseChannelInput(input) {
  const trimmed = (input || '').trim();

  // /channel/UCxxxx
  const channelMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/
  );
  if (channelMatch) {
    return { type: 'channelId', value: channelMatch[1] };
  }

  // /@handle
  const handleMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([a-zA-Z0-9_.-]+)/);
  if (handleMatch) {
    return { type: 'handle', value: '@' + handleMatch[1] };
  }

  return null;
}

// ── YouTube API Helpers ───────────────────────────────────

/**
 * Resolve a @handle to a channelId + channel name via channels.list API.
 * Cost: 1 unit.
 */
async function resolveHandle(handle) {
  const url =
    'https://www.googleapis.com/youtube/v3/channels' +
    `?part=snippet&forHandle=${encodeURIComponent(handle)}&key=${youtubeApiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`channels.list failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error(`Channel not found for handle: ${handle}`);
  }
  const item = data.items[0];
  return { channelId: item.id, name: item.snippet.title };
}

/**
 * Resolve a channelId to its name via channels.list API.
 * Cost: 1 unit.
 */
async function resolveChannelId(channelId) {
  const url =
    'https://www.googleapis.com/youtube/v3/channels' +
    `?part=snippet&id=${encodeURIComponent(channelId)}&key=${youtubeApiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`channels.list failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error(`Channel not found: ${channelId}`);
  }
  return { channelId, name: data.items[0].snippet.title };
}

/**
 * Check a channel for active live streams via search.list API.
 * Cost: 100 units per call.
 * Returns an array of { videoId, title }.
 */
async function fetchLiveStreams(channelId) {
  const url =
    'https://www.googleapis.com/youtube/v3/search' +
    `?part=snippet&channelId=${encodeURIComponent(channelId)}` +
    '&eventType=live&type=video' +
    `&key=${youtubeApiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`search.list failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.items || []).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
  }));
}

// ── Core Logic ────────────────────────────────────────────

/**
 * Add a channel to the watch list.
 * @param {string} input - Channel URL or handle string.
 */
export async function addChannel(input) {
  if (!youtubeApiKey) {
    showChannelError('APIキーが必要です。検索セクションで設定してください。');
    return;
  }
  const parsed = parseChannelInput(input);
  if (!parsed) {
    showChannelError('対応していないURLです。/channel/UCxxx または /@handle を入力してください。');
    return;
  }

  // Resolve channelId and name
  let channelId, name, handle;
  try {
    if (parsed.type === 'handle') {
      handle = parsed.value;
      const resolved = await resolveHandle(handle);
      channelId = resolved.channelId;
      name = resolved.name;
    } else {
      channelId = parsed.value;
      handle = null;
      const resolved = await resolveChannelId(channelId);
      name = resolved.name;
    }
  } catch (err) {
    showChannelError(`チャンネル解決エラー: ${err.message}`);
    return;
  }

  // Duplicate check
  if (watchList.some((ch) => ch.channelId === channelId)) {
    showChannelError('このチャンネルは既に登録されています。');
    return;
  }

  const entry = {
    channelId,
    name,
    handle: handle || null,
    addedAt: Date.now(),
    lastChecked: 0,
    liveVideoIds: [],
  };

  watchList.push(entry);
  saveWatchList();
  renderChannelList();
  clearChannelError();

  // Immediate first check
  await checkChannelLive(entry);

  // Start polling if not running
  ensurePolling();
}

/**
 * Remove a channel from the watch list.
 */
function removeChannel(channelId) {
  watchList = watchList.filter((ch) => ch.channelId !== channelId);
  saveWatchList();
  renderChannelList();
  if (watchList.length === 0) {
    stopPolling();
  }
}

/**
 * Check a single channel for live streams and auto-add new ones.
 */
async function checkChannelLive(entry) {
  try {
    const liveStreams = await fetchLiveStreams(entry.channelId);
    entry.lastChecked = Date.now();

    const currentIds = liveStreams.map((s) => s.videoId);

    // Detect new live streams
    for (const stream of liveStreams) {
      if (!entry.liveVideoIds.includes(stream.videoId) && !hasVideo(stream.videoId)) {
        createTile(stream.videoId);
        showChannelNotification(entry.name, stream.title);
      }
    }

    // Update tracked live IDs
    entry.liveVideoIds = currentIds;
    saveWatchList();
    renderChannelItem(entry);
  } catch (err) {
    console.warn(`[channel] check failed for ${entry.name}:`, err.message);
  }
}

/**
 * Check all channels.
 */
async function checkAllChannels() {
  if (!youtubeApiKey || checkAllChannels._inProgress === true) {
    return;
  }
  checkAllChannels._inProgress = true;
  try {
    for (const entry of watchList) {
      await checkChannelLive(entry);
    }
    updateNextCheckDisplay();
  } finally {
    checkAllChannels._inProgress = false;
  }
}

// ── Polling ───────────────────────────────────────────────

function ensurePolling() {
  if (pollTimerId !== null || watchList.length === 0) {
    return;
  }
  pollTimerId = setInterval(() => {
    if (document.visibilityState === 'hidden') {
      return;
    }
    checkAllChannels();
  }, pollIntervalMs);
  updateNextCheckDisplay();
}

function stopPolling() {
  if (pollTimerId !== null) {
    clearInterval(pollTimerId);
    pollTimerId = null;
  }
  updateNextCheckDisplay();
}

function restartPolling() {
  stopPolling();
  ensurePolling();
}

// ── UI Rendering ──────────────────────────────────────────

function renderChannelList() {
  if (!channelListEl) {
    return;
  }
  channelListEl.innerHTML = '';
  for (const entry of watchList) {
    const li = createChannelItemElement(entry);
    channelListEl.appendChild(li);
  }
  updateQuotaHint();
  updateNextCheckDisplay();
}

function createChannelItemElement(entry) {
  const li = document.createElement('li');
  li.className = 'channel-item';
  li.dataset.channelId = entry.channelId;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'channel-name';
  nameSpan.textContent = entry.handle || entry.name;
  nameSpan.title = entry.name;

  const statusSpan = document.createElement('span');
  statusSpan.className = 'channel-status';
  updateStatusSpan(statusSpan, entry);

  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'channel-refresh-btn';
  refreshBtn.textContent = '更新';
  refreshBtn.title = 'このチャンネルを即時チェック';
  refreshBtn.addEventListener('click', async () => {
    if (!youtubeApiKey) {
      return;
    }
    refreshBtn.disabled = true;
    await checkChannelLive(entry);
    refreshBtn.disabled = false;
  });

  const removeBtn = document.createElement('button');
  removeBtn.className = 'channel-remove-btn';
  removeBtn.textContent = '削除';
  removeBtn.addEventListener('click', () => removeChannel(entry.channelId));

  li.append(nameSpan, statusSpan, refreshBtn, removeBtn);
  return li;
}

function renderChannelItem(entry) {
  if (!channelListEl) {
    return;
  }
  const li = channelListEl.querySelector(`[data-channel-id="${entry.channelId}"]`);
  if (!li) {
    return;
  }
  const statusSpan = li.querySelector('.channel-status');
  if (statusSpan) {
    updateStatusSpan(statusSpan, entry);
  }
}

function updateStatusSpan(el, entry) {
  const count = entry.liveVideoIds.length;
  if (count > 0) {
    el.textContent = `LIVE(${count})`;
    el.classList.add('is-live');
  } else {
    el.textContent = '--';
    el.classList.remove('is-live');
  }
}

function updateQuotaHint() {
  if (!channelQuotaHint) {
    return;
  }
  if (watchList.length >= 3) {
    channelQuotaHint.textContent = `注意: ${watchList.length}件登録中。日次クォータ(10,000 units)を圧迫する可能性があります。`;
    channelQuotaHint.hidden = false;
  } else {
    channelQuotaHint.hidden = true;
  }
}

function updateNextCheckDisplay() {
  if (!channelNextCheckEl) {
    return;
  }
  if (pollTimerId === null || watchList.length === 0) {
    channelNextCheckEl.textContent = '';
    return;
  }
  // Find the most recent lastChecked to estimate next check
  const latestCheck = Math.max(...watchList.map((ch) => ch.lastChecked));
  if (latestCheck > 0) {
    const nextTime = new Date(latestCheck + pollIntervalMs);
    const hh = String(nextTime.getHours()).padStart(2, '0');
    const mm = String(nextTime.getMinutes()).padStart(2, '0');
    channelNextCheckEl.textContent = `次回チェック: ${hh}:${mm}`;
  }
}

function showChannelNotification(channelName, videoTitle) {
  if (!channelListEl) {
    return;
  }
  // Brief toast-style notification in the channel section
  const toast = document.createElement('div');
  toast.className = 'channel-notification';
  toast.textContent = `${channelName} がライブ配信中: ${videoTitle}`;
  channelListEl.parentElement.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function showChannelError(msg) {
  const errorEl = document.getElementById('channelError');
  if (errorEl) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
}

function clearChannelError() {
  const errorEl = document.getElementById('channelError');
  if (errorEl) {
    errorEl.hidden = true;
  }
}

// ── Interval Control ──────────────────────────────────────

function updateIntervalFromInput() {
  if (!channelIntervalInput) {
    return;
  }
  const rawMinutes = parseInt(channelIntervalInput.value, 10);
  const minutes = Math.min(60, Math.max(1, Number.isFinite(rawMinutes) ? rawMinutes : 15));
  channelIntervalInput.value = String(minutes);
  pollIntervalMs = minutes * 60 * 1000;
  savePollInterval();
  restartPolling();
}

// ── Initialization ────────────────────────────────────────

/**
 * Initialize channel monitoring module.
 * Call after DOM is ready.
 */
export function initChannel() {
  // Bind DOM
  channelListEl = document.getElementById('channelList');
  channelUrlInput = document.getElementById('channelUrlInput');
  channelAddBtn = document.getElementById('channelAddBtn');
  channelRefreshAllBtn = document.getElementById('channelRefreshAllBtn');
  channelNextCheckEl = document.getElementById('channelNextCheck');
  channelQuotaHint = document.getElementById('channelQuotaHint');
  channelIntervalInput = document.getElementById('channelIntervalInput');

  // Load persisted data
  loadWatchList();

  // Render existing list
  renderChannelList();

  // Set interval input value
  if (channelIntervalInput) {
    channelIntervalInput.value = String(Math.round(pollIntervalMs / 60000));
    channelIntervalInput.addEventListener('change', updateIntervalFromInput);
  }

  // Add channel button
  if (channelAddBtn && channelUrlInput) {
    channelAddBtn.addEventListener('click', () => {
      const val = channelUrlInput.value.trim();
      if (val) {
        addChannel(val);
        channelUrlInput.value = '';
      }
    });
    // Allow Enter key in input
    channelUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        channelAddBtn.click();
      }
    });
  }

  // Refresh all button
  if (channelRefreshAllBtn) {
    channelRefreshAllBtn.addEventListener('click', async () => {
      if (!youtubeApiKey) {
        return;
      }
      channelRefreshAllBtn.disabled = true;
      await checkAllChannels();
      channelRefreshAllBtn.disabled = false;
    });
  }

  // Initial check on load (if channels exist)
  if (watchList.length > 0 && youtubeApiKey) {
    // Delay slightly so tiles are ready
    setTimeout(() => {
      checkAllChannels();
      ensurePolling();
    }, 3000);
  }

  // Page visibility: restart polling when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && watchList.length > 0) {
      ensurePolling();
    }
  });
}
