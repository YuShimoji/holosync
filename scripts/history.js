/**
 * @file scripts/history.js
 * @brief Watch history functions for HoloSync.
 */
import { storageAdapter } from './storage.js';
import { WATCH_HISTORY_MAX, hasVideo } from './state.js';

const watchHistoryList = document.getElementById('watchHistoryList');

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

    const title = document.createElement('button');
    title.className = 'watch-history-open';
    title.type = 'button';
    title.textContent = item.title || item.id;
    title.addEventListener('click', () => {
      if (!hasVideo(item.id)) {
        _createTile(item.id);
      }
    });

    const meta = document.createElement('div');
    meta.className = 'watch-history-meta';
    const dateText = new Date(item.watchedAt).toLocaleString();
    const channel = item.channel ? `${item.channel} \u2022 ` : '';
    meta.textContent = `${channel}${formatWatchTime(item.watchedSeconds)} \u2022 ${dateText}`;

    li.appendChild(title);
    li.appendChild(meta);
    watchHistoryList.appendChild(li);
  });
}

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
  } catch (_) {
    // ignore
  }
}

export async function loadWatchHistory() {
  try {
    const history = (await storageAdapter.getItem('watchHistory')) || [];
    renderWatchHistory(history);
  } catch (_) {
    renderWatchHistory([]);
  }
}

/**
 * @param {object} deps
 * @param {Function} deps.createTile
 */
export function initHistory(deps) {
  _createTile = deps.createTile;
}
