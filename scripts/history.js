/**
 * @file scripts/history.js
 * @brief Watch history functions for HoloSync.
 */
import { storageAdapter } from './storage.js';
import { WATCH_HISTORY_MAX, hasVideo } from './state.js';
import { showToast } from './ui.js';

const watchHistoryList = document.getElementById('watchHistoryList');
const topChannelsList = document.getElementById('topChannelsList');

export function formatWatchTime(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

let _createTile;
let _onSearchChannel;

export function renderWatchHistory(history) {
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

    const titleRow = document.createElement('div');
    titleRow.className = 'watch-history-title-row';

    const title = document.createElement('button');
    title.className = 'watch-history-open';
    title.type = 'button';
    title.textContent = item.title || item.id;
    title.addEventListener('click', () => {
      if (!hasVideo(item.id) && _createTile) {
        _createTile(item.id);
        addBtn.classList.add('added');
        addBtn.textContent = '\u2713';
        addBtn.title = '\u8ffd\u52a0\u6e08\u307f';
        showToast(`${item.title || item.id} \u3092\u8ffd\u52a0\u3057\u307e\u3057\u305f`);
      }
    });

    const alreadyAdded = hasVideo(item.id);
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'watch-history-add' + (alreadyAdded ? ' added' : '');
    addBtn.textContent = alreadyAdded ? '\u2713' : '+';
    addBtn.title = alreadyAdded ? '\u8ffd\u52a0\u6e08\u307f' : '\u8ffd\u52a0';
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!hasVideo(item.id) && _createTile) {
        _createTile(item.id);
        addBtn.classList.add('added');
        addBtn.textContent = '\u2713';
        addBtn.title = '\u8ffd\u52a0\u6e08\u307f';
        showToast(`${item.title || item.id} \u3092\u8ffd\u52a0\u3057\u307e\u3057\u305f`);
      }
    });

    titleRow.appendChild(title);
    titleRow.appendChild(addBtn);

    const meta = document.createElement('div');
    meta.className = 'watch-history-meta';
    const dateText = new Date(item.watchedAt).toLocaleString();
    const channel = item.channel ? `${item.channel} \u2022 ` : '';
    meta.textContent = `${channel}${formatWatchTime(item.watchedSeconds)} \u2022 ${dateText}`;

    li.appendChild(titleRow);
    li.appendChild(meta);
    watchHistoryList.appendChild(li);
  });

  // Update top channels whenever history renders
  renderTopChannels(history);
}

// ── Phase 1-B: Top Channels ──────────────────────────────────

function getTopChannels(history, maxCount = 5) {
  const channelMap = new Map();
  for (const item of history) {
    if (!item.channel) {
      continue;
    }
    const entry = channelMap.get(item.channel) || {
      name: item.channel,
      count: 0,
      lastVideoId: null,
      lastWatchedAt: 0,
    };
    entry.count++;
    if (item.watchedAt > entry.lastWatchedAt) {
      entry.lastWatchedAt = item.watchedAt;
      entry.lastVideoId = item.id;
    }
    channelMap.set(item.channel, entry);
  }
  return [...channelMap.values()].sort((a, b) => b.count - a.count).slice(0, maxCount);
}

function renderTopChannels(history) {
  if (!topChannelsList) {
    return;
  }
  const topChannels = getTopChannels(history);
  topChannelsList.innerHTML = '';

  if (topChannels.length === 0) {
    topChannelsList.hidden = true;
    const section = topChannelsList.closest('.top-channels-section');
    if (section) {
      section.hidden = true;
    }
    return;
  }

  topChannelsList.hidden = false;
  const section = topChannelsList.closest('.top-channels-section');
  if (section) {
    section.hidden = false;
  }

  topChannels.forEach((ch) => {
    const li = document.createElement('li');
    li.className = 'top-channel-item';

    const name = document.createElement('span');
    name.className = 'top-channel-name';
    name.textContent = ch.name;
    name.title = `${ch.count}\u56de\u8996\u8074`;

    const count = document.createElement('span');
    count.className = 'top-channel-count';
    count.textContent = `${ch.count}\u56de`;

    const searchBtn = document.createElement('button');
    searchBtn.type = 'button';
    searchBtn.className = 'top-channel-search';
    searchBtn.textContent = '\u691c\u7d22';
    searchBtn.title = `${ch.name} \u306e\u6700\u65b0\u52d5\u753b\u3092\u691c\u7d22`;
    searchBtn.addEventListener('click', () => {
      if (_onSearchChannel) {
        _onSearchChannel(ch.name);
      }
    });

    li.appendChild(name);
    li.appendChild(count);
    li.appendChild(searchBtn);
    topChannelsList.appendChild(li);
  });
}

// ── Phase 1-C: Session Restore ───────────────────────────────

export async function saveLastSession(videoIds) {
  if (videoIds.length > 0) {
    await storageAdapter.setItem('lastSession', videoIds);
  }
}

export async function getLastSession() {
  return (await storageAdapter.getItem('lastSession')) || [];
}

export async function clearLastSession() {
  await storageAdapter.setItem('lastSession', []);
}

// ── Core ──────────────────────────────────────────────────────

export async function saveWatchHistoryEntry(video, watchedSeconds) {
  try {
    const history = (await storageAdapter.getItem('watchHistory')) || [];
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
    await storageAdapter.setItem('watchHistory', next);
  } catch (err) {
    console.warn('saveWatchHistoryEntry failed:', err);
  }
}

export async function loadWatchHistory() {
  try {
    const history = (await storageAdapter.getItem('watchHistory')) || [];
    renderWatchHistory(history);
  } catch (err) {
    console.warn('loadWatchHistory failed:', err);
    renderWatchHistory([]);
  }
}

/**
 * @param {object} deps
 * @param {Function} deps.createTile
 * @param {Function} [deps.onSearchChannel] - Callback to search by channel name
 */
export function initHistory(deps) {
  _createTile = deps.createTile;
  _onSearchChannel = deps.onSearchChannel || null;
}
