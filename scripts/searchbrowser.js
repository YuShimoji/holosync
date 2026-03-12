/**
 * @file scripts/searchbrowser.js
 * @brief Rich search browser panel: API-based YouTube search with card UI,
 *        view switching (API / Quick-add), and result paging.
 */
import { storageAdapter } from './storage.js';
import { youtubeApiKey, hasVideo } from './state.js';

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

// ── API key status display ─────────────────────────────────
function renderApiKeyStatus() {
  if (!sbApiKeyRow) {
    return;
  }
  const key = youtubeApiKey;
  if (key) {
    sbApiKeyRow.innerHTML = `<span class="sb-api-key-status ok">✓ APIキー設定済</span>`;
  } else {
    sbApiKeyRow.innerHTML = `
      <div class="sb-no-api-hint">
        ⚠️ API Keyが未設定です。<br>
        サイドバーの「動画検索」セクションで設定してください。<br>
        設定後は検索ブラウザでも使用できます。
      </div>`;
  }
}

// ── Search ─────────────────────────────────────────────────
async function doSearch(query, filters, pageToken = null) {
  if (!youtubeApiKey) {
    showError('YouTube APIキーが設定されていません。');
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
    }

    if (data.items.length === 0 && !pageToken) {
      sbEmpty.hidden = false;
    } else {
      data.items.forEach((item) => {
        const card = buildResultCard(item, type === 'live');
        sbResults.appendChild(card);
      });
    }

    sbLoadMore.hidden = !sbNextPageToken;
  } catch (e) {
    showError(e.message);
  } finally {
    sbLoading.hidden = true;
  }
}

function showError(msg) {
  sbError.textContent = `⚠ ${msg}`;
  sbError.hidden = false;
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
    <button class="sb-result-add${alreadyAdded ? ' added' : ''}" title="${alreadyAdded ? '追加済み' : '追加'}">
      ${alreadyAdded ? '✓' : '+'}
    </button>
  `;

  const addBtn = card.querySelector('.sb-result-add');

  const doAdd = () => {
    if (!_createTile || hasVideo(videoId)) {
      return;
    }
    _createTile(videoId);
    addBtn.classList.add('added');
    addBtn.textContent = '✓';
    addBtn.title = '追加済み';
  };

  // Click anywhere on card = add, or click + button
  card.addEventListener('click', (e) => {
    if (!e.target.closest('.sb-result-add')) {
      doAdd();
    }
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
      errEl.textContent = '有効なYouTube URLまたはIDを入力してください。';
      if (!sbYtView.querySelector('.sb-yt-error')) {
        sbQuickAddForm.after(errEl);
      }
      setTimeout(() => errEl.remove(), 3000);
    }
  });
}
