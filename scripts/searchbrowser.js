/**
 * @file scripts/searchbrowser.js
 * @brief Rich search browser panel: API-based YouTube search with card UI,
 *        view switching (API / Quick-add), result paging, multi-select batch add,
 *        search history dropdown, and enhanced preview (duration/viewCount).
 */
import { storageAdapter } from './storage.js';
import { youtubeApiKey, hasVideo } from './state.js';
import { showToast } from './ui.js';

// ── DOM ────────────────────────────────────────────────────
const searchBrowserPanel = document.getElementById('searchBrowserPanel');
const sbApiModeBtn = document.getElementById('sbApiModeBtn');
const sbYtModeBtn = document.getElementById('sbYtModeBtn');
const sbApiView = document.getElementById('sbApiView');
const sbYtView = document.getElementById('sbYtView');
const sbApiKeyRow = document.getElementById('sbApiKeyRow');
const sbSearchForm = document.getElementById('sbSearchForm');
const sbSearchInput = document.getElementById('sbSearchInput');
const sbDuration = document.getElementById('sbDuration');
const sbOrder = document.getElementById('sbOrder');
const sbType = document.getElementById('sbType');
const sbResults = document.getElementById('sbResults');
const sbLoading = document.getElementById('sbLoading');
const sbError = document.getElementById('sbError');
const sbEmpty = document.getElementById('sbEmpty');
const sbLoadMore = document.getElementById('sbLoadMore');
const sbQuickAddForm = document.getElementById('sbQuickAddForm');
const sbQuickAddInput = document.getElementById('sbQuickAddInput');

// Add button tabs in the add-mode-tabs
const searchBrowserBtn = document.getElementById('searchBrowserBtn');
const singleModeBtn = document.getElementById('singleModeBtn');
const bulkModeBtn = document.getElementById('bulkModeBtn');
const singleAddMode = document.getElementById('singleAddMode');
const bulkAddMode = document.getElementById('bulkAddMode');

// ── State ──────────────────────────────────────────────────
let _createTile = null;
let _parseYouTubeId = null;
let sbNextPageToken = null;
let sbCurrentQuery = '';
let sbCurrentFilters = {};

// Phase 2-A: Multi-select state
const selectedVideoIds = new Set();

// ── API key status display ─────────────────────────────────
function renderApiKeyStatus() {
  if (!sbApiKeyRow) {
    return;
  }
  const key = youtubeApiKey;
  if (key) {
    sbApiKeyRow.innerHTML = `<span class="sb-api-key-status ok">\u2713 API\u30ad\u30fc\u8a2d\u5b9a\u6e08</span>`;
  } else {
    sbApiKeyRow.innerHTML = `
      <div class="sb-no-api-hint">
        \u26a0\ufe0f API Key\u304c\u672a\u8a2d\u5b9a\u3067\u3059\u3002<br>
        \u30b5\u30a4\u30c9\u30d0\u30fc\u306e\u300c\u52d5\u753b\u691c\u7d22\u300d\u30bb\u30af\u30b7\u30e7\u30f3\u3067\u8a2d\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002<br>
        \u8a2d\u5b9a\u5f8c\u306f\u691c\u7d22\u30d6\u30e9\u30a6\u30b6\u3067\u3082\u4f7f\u7528\u3067\u304d\u307e\u3059\u3002
      </div>`;
  }
}

// ── Search ─────────────────────────────────────────────────
async function doSearch(query, filters, pageToken = null) {
  if (!youtubeApiKey) {
    showError(
      'YouTube API\u30ad\u30fc\u304c\u8a2d\u5b9a\u3055\u308c\u3066\u3044\u307e\u305b\u3093\u3002'
    );
    return;
  }

  const { duration = 'any', order = 'relevance', type = 'video' } = filters;
  const eventType = type === 'live' ? '&eventType=live' : '';
  let url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&type=video&maxResults=12` +
    `&q=${encodeURIComponent(query)}` +
    `&order=${order}` +
    `&key=${youtubeApiKey}` +
    eventType;
  if (duration !== 'any') {
    url += `&videoDuration=${duration}`;
  }
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }

  sbLoading.hidden = false;
  sbError.hidden = true;
  sbEmpty.hidden = true;
  sbLoadMore.hidden = true;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    sbNextPageToken = data.nextPageToken || null;

    if (!pageToken) {
      sbResults.innerHTML = '';
      selectedVideoIds.clear();
      updateSelectionBar();
    }

    if (data.items.length === 0 && !pageToken) {
      sbEmpty.hidden = false;
    } else {
      const videoIds = [];
      data.items.forEach((item) => {
        const card = buildResultCard(item, type === 'live');
        sbResults.appendChild(card);
        if (item.id?.videoId) {
          videoIds.push(item.id.videoId);
        }
      });
      // Phase 2-C: Fetch duration/viewCount for this batch
      if (videoIds.length > 0) {
        fetchVideoDetails(videoIds);
      }
    }

    sbLoadMore.hidden = !sbNextPageToken;
  } catch (e) {
    showError(e.message);
  } finally {
    sbLoading.hidden = true;
  }
}

function showError(msg) {
  sbError.textContent = `\u26a0 ${msg}`;
  sbError.hidden = false;
}

// ── Phase 2-C: Fetch video details (duration, viewCount) ───
async function fetchVideoDetails(videoIds) {
  if (!youtubeApiKey || videoIds.length === 0) {
    return;
  }
  try {
    const url =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=contentDetails,statistics` +
      `&id=${videoIds.join(',')}` +
      `&key=${youtubeApiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      return;
    }
    const data = await resp.json();
    (data.items || []).forEach((item) => {
      const card = sbResults.querySelector(`.sb-result-card[data-video-id="${item.id}"]`);
      if (!card) {
        return;
      }
      const metaEl = card.querySelector('.sb-result-meta');
      if (!metaEl) {
        return;
      }
      // Duration
      const dur = item.contentDetails?.duration;
      if (dur) {
        const formatted = formatIsoDuration(dur);
        const durSpan = document.createElement('span');
        durSpan.className = 'sb-result-duration';
        durSpan.textContent = formatted;
        metaEl.prepend(durSpan);
        // Also show on thumbnail
        const thumbWrap = card.querySelector('.sb-result-thumb-wrap');
        if (thumbWrap && !thumbWrap.querySelector('.sb-thumb-duration')) {
          const badge = document.createElement('span');
          badge.className = 'sb-thumb-duration';
          badge.textContent = formatted;
          thumbWrap.appendChild(badge);
        }
      }
      // View count
      const views = item.statistics?.viewCount;
      if (views) {
        const viewSpan = document.createElement('span');
        viewSpan.className = 'sb-result-views';
        viewSpan.textContent = `${formatViewCount(views)}\u56de\u518d\u751f`;
        metaEl.appendChild(viewSpan);
      }
    });
  } catch (_) {
    // Non-critical: silently fail
  }
}

function formatIsoDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    return '';
  }
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatViewCount(count) {
  const n = parseInt(count, 10);
  if (n >= 100000000) {
    return `${(n / 100000000).toFixed(1)}\u5104`;
  }
  if (n >= 10000) {
    return `${(n / 10000).toFixed(1)}\u4e07`;
  }
  return n.toLocaleString();
}

// ── Build result card (YouTube-like) ──────────────────────
function buildResultCard(item, isLive = false) {
  const videoId = item.id?.videoId;
  const snippet = item.snippet;
  if (!videoId || !snippet) {
    return document.createDocumentFragment();
  }

  const thumbMq = snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '';
  const title = snippet.title || videoId;
  const channel = snippet.channelTitle || '';
  const publishedAt = snippet.publishedAt
    ? new Date(snippet.publishedAt).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';
  const alreadyAdded = hasVideo(videoId);

  const card = document.createElement('div');
  card.className = 'sb-result-card';
  card.dataset.videoId = videoId;

  card.innerHTML = `
    <input type="checkbox" class="sb-result-check" title="\u9078\u629e" />
    <div class="sb-result-thumb-wrap">
      <img class="sb-result-thumb" src="${thumbMq}" alt="" loading="lazy" />
      ${isLive ? '<span class="sb-live-badge">LIVE</span>' : ''}
    </div>
    <div class="sb-result-info">
      <div class="sb-result-title">${escapeHtml(title)}</div>
      <div class="sb-result-channel">${escapeHtml(channel)}</div>
      <div class="sb-result-meta">
        ${publishedAt ? `<span>${publishedAt}</span>` : ''}
      </div>
    </div>
    <button class="sb-result-add${alreadyAdded ? ' added' : ''}" title="${alreadyAdded ? '\u8ffd\u52a0\u6e08\u307f' : '\u8ffd\u52a0'}">
      ${alreadyAdded ? '\u2713' : '+'}
    </button>
  `;

  const addBtn = card.querySelector('.sb-result-add');
  const checkbox = card.querySelector('.sb-result-check');

  const doAdd = () => {
    if (!_createTile || hasVideo(videoId)) {
      return;
    }
    _createTile(videoId);
    addBtn.classList.add('added');
    addBtn.textContent = '\u2713';
    addBtn.title = '\u8ffd\u52a0\u6e08\u307f';
    showToast(`${title} \u3092\u8ffd\u52a0\u3057\u307e\u3057\u305f`);
  };

  // Phase 2-A: Checkbox toggles selection
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      selectedVideoIds.add(videoId);
      card.classList.add('selected');
    } else {
      selectedVideoIds.delete(videoId);
      card.classList.remove('selected');
    }
    updateSelectionBar();
  });

  // Click card body = add directly (unchanged behavior)
  card.addEventListener('click', (e) => {
    if (e.target.closest('.sb-result-add') || e.target.closest('.sb-result-check')) {
      return;
    }
    doAdd();
  });

  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    doAdd();
  });

  return card;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Phase 2-A: Selection bar ──────────────────────────────
function updateSelectionBar() {
  let bar = document.getElementById('sbSelectionBar');
  if (selectedVideoIds.size === 0) {
    if (bar) {
      bar.hidden = true;
    }
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'sbSelectionBar';
    bar.className = 'sb-selection-bar';
    bar.innerHTML = `
      <span class="sb-sel-count"></span>
      <button class="sb-sel-add-all primary">\u3059\u3079\u3066\u8ffd\u52a0</button>
      <button class="sb-sel-clear">\u9078\u629e\u89e3\u9664</button>
    `;
    bar.querySelector('.sb-sel-add-all').addEventListener('click', addAllSelected);
    bar.querySelector('.sb-sel-clear').addEventListener('click', clearSelection);
    sbApiView.appendChild(bar);
  }
  bar.hidden = false;
  bar.querySelector('.sb-sel-count').textContent =
    `${selectedVideoIds.size}\u4ef6\u9078\u629e\u4e2d`;
}

function addAllSelected() {
  if (!_createTile) {
    return;
  }
  let added = 0;
  for (const videoId of selectedVideoIds) {
    if (!hasVideo(videoId)) {
      _createTile(videoId);
      added++;
      // Update card UI
      const card = sbResults.querySelector(`.sb-result-card[data-video-id="${videoId}"]`);
      if (card) {
        const addBtn = card.querySelector('.sb-result-add');
        if (addBtn) {
          addBtn.classList.add('added');
          addBtn.textContent = '\u2713';
          addBtn.title = '\u8ffd\u52a0\u6e08\u307f';
        }
      }
    }
  }
  if (added > 0) {
    showToast(`${added}\u4ef6\u306e\u52d5\u753b\u3092\u8ffd\u52a0\u3057\u307e\u3057\u305f`);
  }
  clearSelection();
}

function clearSelection() {
  selectedVideoIds.clear();
  sbResults.querySelectorAll('.sb-result-check').forEach((cb) => {
    cb.checked = false;
  });
  sbResults.querySelectorAll('.sb-result-card.selected').forEach((card) => {
    card.classList.remove('selected');
  });
  updateSelectionBar();
}

// ── Phase 2-B: Search history dropdown ─────────────────────
let historyDropdown = null;

async function showSearchHistory() {
  try {
    const history = await storageAdapter.getSearchHistory();
    if (!history || history.length === 0) {
      hideSearchHistory();
      return;
    }

    if (!historyDropdown) {
      historyDropdown = document.createElement('div');
      historyDropdown.className = 'sb-history-dropdown';
      sbSearchForm.appendChild(historyDropdown);
    }

    historyDropdown.innerHTML = '';
    history.forEach((query) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'sb-history-item';
      item.textContent = query;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent blur
        sbSearchInput.value = query;
        hideSearchHistory();
        sbSearchForm.dispatchEvent(new Event('submit', { cancelable: true }));
      });
      historyDropdown.appendChild(item);
    });
    historyDropdown.hidden = false;
  } catch (_) {
    // ignore
  }
}

function hideSearchHistory() {
  if (historyDropdown) {
    historyDropdown.hidden = true;
  }
}

// ── Tab switching (add-mode-tabs) ─────────────────────────
function setAddMode(mode) {
  // mode: 'single' | 'bulk' | 'search'
  [singleModeBtn, bulkModeBtn, searchBrowserBtn].forEach((btn) => btn?.classList.remove('active'));
  [singleAddMode, bulkAddMode, searchBrowserPanel].forEach((el) => {
    if (el) {
      el.hidden = true;
    }
  });

  if (mode === 'single') {
    singleModeBtn?.classList.add('active');
    singleAddMode.hidden = false;
  } else if (mode === 'bulk') {
    bulkModeBtn?.classList.add('active');
    bulkAddMode.hidden = false;
  } else if (mode === 'search') {
    searchBrowserBtn?.classList.add('active');
    searchBrowserPanel.hidden = false;
    renderApiKeyStatus();
    // Focus search input
    setTimeout(() => sbSearchInput?.focus(), 50);
  }
}

// ── SB internal tab switching ─────────────────────────────
function setSbView(view) {
  if (view === 'api') {
    sbApiModeBtn.classList.add('active');
    sbYtModeBtn.classList.remove('active');
    sbApiView.hidden = false;
    sbYtView.hidden = true;
  } else {
    sbYtModeBtn.classList.add('active');
    sbApiModeBtn.classList.remove('active');
    sbYtView.hidden = false;
    sbApiView.hidden = true;
  }
}

// ── Init ────────────────────────────────────────────────────
export function initSearchBrowser(deps) {
  _createTile = deps.createTile;
  _parseYouTubeId = deps.parseYouTubeId;

  // Add-mode tab buttons
  if (singleModeBtn) {
    singleModeBtn.addEventListener('click', () => setAddMode('single'));
  }
  if (bulkModeBtn) {
    bulkModeBtn.addEventListener('click', () => setAddMode('bulk'));
  }
  if (searchBrowserBtn) {
    searchBrowserBtn.addEventListener('click', () => setAddMode('search'));
  }

  // SB internal mode tabs
  sbApiModeBtn?.addEventListener('click', () => setSbView('api'));
  sbYtModeBtn?.addEventListener('click', () => setSbView('yt'));

  // Search form
  sbSearchForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideSearchHistory();
    const query = sbSearchInput.value.trim();
    if (!query) {
      return;
    }
    sbCurrentQuery = query;
    sbCurrentFilters = {
      duration: sbDuration?.value || 'any',
      order: sbOrder?.value || 'relevance',
      type: sbType?.value || 'video',
    };
    sbNextPageToken = null;
    await doSearch(query, sbCurrentFilters);
    await storageAdapter.saveSearchHistory(query).catch(() => {});
  });

  // Phase 2-B: Search history on focus
  sbSearchInput?.addEventListener('focus', () => showSearchHistory());
  sbSearchInput?.addEventListener('blur', () => {
    // Delay to allow click on history items
    setTimeout(() => hideSearchHistory(), 200);
  });

  // Load more
  sbLoadMore?.addEventListener('click', async () => {
    if (!sbCurrentQuery || !sbNextPageToken) {
      return;
    }
    await doSearch(sbCurrentQuery, sbCurrentFilters, sbNextPageToken);
  });

  // Quick add form
  sbQuickAddForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = sbQuickAddInput?.value.trim();
    if (!val || !_parseYouTubeId) {
      return;
    }
    const id = _parseYouTubeId(val);
    if (id && !hasVideo(id)) {
      _createTile(id);
      sbQuickAddInput.value = '';
    } else if (!id) {
      // Show error
      const errEl = sbYtView.querySelector('.sb-yt-error') || document.createElement('p');
      errEl.className = 'sb-yt-error';
      errEl.style.cssText = 'color:var(--color-error);font-size:11px;margin:0;';
      errEl.textContent =
        '\u6709\u52b9\u306aYouTube URL\u307e\u305f\u306fID\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002';
      if (!sbYtView.querySelector('.sb-yt-error')) {
        sbQuickAddForm.after(errEl);
      }
      setTimeout(() => errEl.remove(), 3000);
    }
  });
}
