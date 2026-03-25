/**
 * @file scripts/history.js
 * @brief Watch history, top channels, session restore, and smart suggestions.
 */
import { storageAdapter } from './storage.js';
import { WATCH_HISTORY_MAX, hasVideo, youtubeApiKey } from './state.js';
import { showToast } from './ui.js';

const watchHistoryList = document.getElementById('watchHistoryList');
const topChannelsList = document.getElementById('topChannelsList');
const suggestionBar = document.getElementById('suggestionBar');
const suggestionScroll = document.getElementById('suggestionScroll');

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

export async function getLastSession() {
  return (await storageAdapter.getItem('lastSession')) || [];
}

// ── Phase 3: Smart Suggestions ───────────────────────────────

const SESSION_GAP_MS = 60 * 60 * 1000; // 1 hour gap = new session

/**
 * Phase 3-B: Find videos that were co-viewed (watched in the same session).
 * Groups history by session (entries within 1 hour of each other).
 */
function getCoViewedSuggestions(history, maxCount = 6) {
  if (history.length < 2) {
    return [];
  }

  // Sort by watchedAt descending
  const sorted = [...history].sort((a, b) => b.watchedAt - a.watchedAt);

  // Group into sessions
  const sessions = [];
  let currentSession = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const gap = currentSession[currentSession.length - 1].watchedAt - sorted[i].watchedAt;
    if (gap < SESSION_GAP_MS) {
      currentSession.push(sorted[i]);
    } else {
      if (currentSession.length >= 2) {
        sessions.push(currentSession);
      }
      currentSession = [sorted[i]];
    }
  }
  if (currentSession.length >= 2) {
    sessions.push(currentSession);
  }

  // Count co-occurrence pairs
  const pairCount = new Map();
  for (const session of sessions) {
    const ids = session.map((s) => s.id);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const pair = [ids[i], ids[j]].sort().join(':');
        pairCount.set(pair, (pairCount.get(pair) || 0) + 1);
      }
    }
  }

  // Build suggestion list: videos from frequent co-viewing pairs, not currently added
  const seen = new Set();
  const suggestions = [];
  const sortedPairs = [...pairCount.entries()].sort((a, b) => b[1] - a[1]);
  for (const [pair] of sortedPairs) {
    const [id1, id2] = pair.split(':');
    for (const id of [id1, id2]) {
      if (!seen.has(id) && !hasVideo(id)) {
        const histItem = history.find((h) => h.id === id);
        if (histItem) {
          suggestions.push({
            id: histItem.id,
            title: histItem.title || histItem.id,
            channel: histItem.channel || '',
            source: 'coviewed',
          });
          seen.add(id);
        }
      }
      if (suggestions.length >= maxCount) {
        break;
      }
    }
    if (suggestions.length >= maxCount) {
      break;
    }
  }
  return suggestions;
}

/**
 * Phase 3-A: Fetch latest videos from registered channels.
 * Uses playlistItems.list with uploads playlist (1 unit per channel).
 */
async function fetchChannelLatestVideos(maxChannels = 3, videosPerChannel = 3) {
  if (!youtubeApiKey) {
    return [];
  }

  try {
    const channels = (await storageAdapter.getItem('channelWatchList')) || [];
    if (channels.length === 0) {
      return [];
    }

    const results = [];
    const targetChannels = channels.slice(0, maxChannels);

    for (const ch of targetChannels) {
      // Derive uploads playlist ID: UC... -> UU...
      const uploadsPlaylistId = 'UU' + ch.channelId.slice(2);
      const url =
        `https://www.googleapis.com/youtube/v3/playlistItems` +
        `?part=snippet&maxResults=${videosPerChannel}` +
        `&playlistId=${uploadsPlaylistId}` +
        `&key=${youtubeApiKey}`;

      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          continue;
        }
        const data = await resp.json();
        (data.items || []).forEach((item) => {
          const videoId = item.snippet?.resourceId?.videoId;
          if (videoId && !hasVideo(videoId)) {
            results.push({
              id: videoId,
              title: item.snippet.title || videoId,
              channel: ch.name || item.snippet.channelTitle || '',
              thumbnail:
                item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
              source: 'channel',
            });
          }
        });
      } catch (_) {
        // Skip this channel on error
      }
    }

    return results;
  } catch (_) {
    return [];
  }
}

/**
 * Phase 3-C: Load and render the quick suggestion bar.
 * Merges channel latest videos + co-viewed suggestions.
 */
export async function loadSuggestions() {
  if (!suggestionBar || !suggestionScroll) {
    return;
  }

  const history = (await storageAdapter.getItem('watchHistory')) || [];

  // Gather suggestions from both sources
  const [channelVideos, coViewed] = await Promise.all([
    fetchChannelLatestVideos(),
    Promise.resolve(getCoViewedSuggestions(history)),
  ]);

  // Merge and deduplicate
  const seen = new Set();
  const suggestions = [];
  const addUnique = (items) => {
    for (const item of items) {
      if (!seen.has(item.id) && !hasVideo(item.id)) {
        seen.add(item.id);
        suggestions.push(item);
      }
    }
  };
  addUnique(channelVideos);
  addUnique(coViewed);

  if (suggestions.length === 0) {
    suggestionBar.hidden = true;
    return;
  }

  suggestionBar.hidden = false;
  suggestionScroll.innerHTML = '';

  suggestions.forEach((s) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'suggestion-card';
    card.title = `${s.title}\n${s.channel}`;

    const thumbUrl = s.thumbnail || `https://i.ytimg.com/vi/${s.id}/mqdefault.jpg`;
    card.innerHTML = `
      <img class="suggestion-thumb" src="${thumbUrl}" alt="" loading="lazy" />
      <div class="suggestion-title">${escapeHtml(s.title)}</div>
      <span class="suggestion-source">${s.source === 'channel' ? '\u30c1\u30e3\u30f3\u30cd\u30eb' : '\u5c65\u6b74'}</span>
    `;

    card.addEventListener('click', () => {
      if (!hasVideo(s.id) && _createTile) {
        _createTile(s.id);
        card.classList.add('added');
        showToast(`${s.title} \u3092\u8ffd\u52a0\u3057\u307e\u3057\u305f`);
      }
    });

    suggestionScroll.appendChild(card);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
