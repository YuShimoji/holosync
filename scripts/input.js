/**
 * @file scripts/input.js
 * @brief URL input, preview, bulk add, drag & drop, clipboard paste, onboarding demo.
 */
import { hasVideo, youtubeApiKey } from './state.js';
import { parseYouTubeId, parsePlaylistId, createTile } from './player.js';
import { fetchPlaylistItems } from './search.js';
import { parseChannelInput, addChannel } from './channel.js';

// ── DOM References ─────────────────────────────────────────

const addForm = document.getElementById('addForm');
const urlInput = document.getElementById('urlInput');
const addError = document.getElementById('addError');
const urlPreview = document.getElementById('urlPreview');
const urlPreviewThumb = document.getElementById('urlPreviewThumb');
const urlPreviewTitle = document.getElementById('urlPreviewTitle');
const urlPreviewAuthor = document.getElementById('urlPreviewAuthor');

// Bulk add mode
const singleModeBtn = document.getElementById('singleModeBtn');
const bulkModeBtn = document.getElementById('bulkModeBtn');
const singleAddMode = document.getElementById('singleAddMode');
const bulkAddMode = document.getElementById('bulkAddMode');
const bulkUrlInput = document.getElementById('bulkUrlInput');
const bulkAddBtn = document.getElementById('bulkAddBtn');
const bulkCount = document.getElementById('bulkCount');

// Onboarding
const loadDemoBtn = document.getElementById('loadDemoBtn');
const dropHint = document.getElementById('dropHint');

// D&D targets
const gridEl = document.getElementById('grid');
const contentEl = document.getElementById('content');

// ── URL Preview ─────────────────────────────────────────────

let previewDebounceTimer = null;

async function updateUrlPreview(videoId) {
  if (!videoId) {
    urlPreview.hidden = true;
    return;
  }

  if (hasVideo(videoId)) {
    urlPreview.hidden = false;
    urlPreviewThumb.src = '';
    urlPreviewTitle.textContent = '\u26a0\ufe0f \u8ffd\u52a0\u6e08\u307f';
    urlPreviewAuthor.textContent =
      '\u3053\u306e\u52d5\u753b\u306f\u65e2\u306b\u30ea\u30b9\u30c8\u306b\u3042\u308a\u307e\u3059';
    urlPreviewThumb.hidden = true;
    return;
  }

  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error('Not found');
    }

    const data = await resp.json();
    urlPreviewThumb.src = data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/default.jpg`;
    urlPreviewThumb.hidden = false;
    urlPreviewTitle.textContent = data.title;
    urlPreviewAuthor.textContent = data.author_name;
    urlPreview.hidden = false;
    addError.hidden = true;
  } catch (e) {
    urlPreviewThumb.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
    urlPreviewThumb.hidden = false;
    urlPreviewTitle.textContent = `ID: ${videoId}`;
    urlPreviewAuthor.textContent =
      '\u30e1\u30bf\u30c7\u30fc\u30bf\u53d6\u5f97\u4e0d\u53ef (\u8ffd\u52a0\u53ef\u80fd)';
    urlPreview.hidden = false;
  }
}

// ── Playlist Batch Add ────────────────────────────────────────

async function addFromPlaylist(playlistId) {
  addError.hidden = true;
  if (!youtubeApiKey) {
    addError.textContent =
      'プレイリスト展開にはAPIキーが必要です。検索セクションで設定してください。';
    addError.classList.remove('info');
    addError.hidden = false;
    return;
  }
  addError.textContent =
    '\u30d7\u30ec\u30a4\u30ea\u30b9\u30c8\u3092\u8aad\u307f\u8fbc\u307f\u4e2d...';
  addError.classList.add('info');
  addError.hidden = false;
  try {
    const videoIds = await fetchPlaylistItems(playlistId);
    const newIds = videoIds.filter((id) => !hasVideo(id));
    newIds.forEach((id) => createTile(id));
    const dupCount = videoIds.length - newIds.length;
    let msg = `${newIds.length}\u4ef6\u8ffd\u52a0\u3057\u307e\u3057\u305f`;
    if (dupCount > 0) {
      msg += ` (${dupCount}\u4ef6\u91cd\u8907\u30b9\u30ad\u30c3\u30d7)`;
    }
    if (newIds.length === 0 && dupCount > 0) {
      msg =
        '\u3059\u3079\u3066\u306e\u52d5\u753b\u304c\u65e2\u306b\u8ffd\u52a0\u6e08\u307f\u3067\u3059';
    }
    addError.textContent = msg;
    addError.classList.remove('info');
    setTimeout(() => {
      addError.hidden = true;
    }, 4000);
  } catch (err) {
    addError.textContent = err.message;
    addError.classList.remove('info');
    addError.hidden = false;
  }
}

// ── Playlist Queue Add ──────────────────────────────────────

async function addAsQueue(playlistId) {
  if (!youtubeApiKey) {
    addError.textContent = 'キュー再生にはAPIキーが必要です。検索セクションで設定してください。';
    addError.classList.remove('info');
    addError.hidden = false;
    return;
  }
  addError.textContent =
    '\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D...';
  addError.classList.add('info');
  addError.hidden = false;
  try {
    const videoIds = await fetchPlaylistItems(playlistId);
    if (videoIds.length === 0) {
      addError.textContent =
        '\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u306B\u52D5\u753B\u304C\u3042\u308A\u307E\u305B\u3093';
      addError.classList.remove('info');
      return;
    }
    createTile(videoIds[0], { queue: videoIds, queueIndex: 0 });
    addError.textContent = `\u30AD\u30E5\u30FC\u518D\u751F: ${videoIds.length}\u4EF6\u306E\u52D5\u753B`;
    addError.classList.remove('info');
    setTimeout(() => {
      addError.hidden = true;
    }, 4000);
  } catch (err) {
    addError.textContent = err.message;
    addError.classList.remove('info');
    addError.hidden = false;
  }
}

// ── Bulk URL Parsing ────────────────────────────────────────

function parseBulkUrls(text) {
  const lines = text
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const ids = [];
  for (const line of lines) {
    const id = parseYouTubeId(line);
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

async function expandBulkWithPlaylists(text) {
  const lines = text
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const ids = [];
  for (const line of lines) {
    // Only attempt playlist expansion when API key is available
    if (youtubeApiKey) {
      const plId = parsePlaylistId(line);
      if (plId) {
        try {
          const plVideos = await fetchPlaylistItems(plId);
          for (const vid of plVideos) {
            if (!ids.includes(vid)) {
              ids.push(vid);
            }
          }
        } catch (_) {
          // Playlist fetch failed — try as individual video
          const id = parseYouTubeId(line);
          if (id && !ids.includes(id)) {
            ids.push(id);
          }
        }
        continue;
      }
    }
    const id = parseYouTubeId(line);
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

// ── Drag & Drop / Clipboard ────────────────────────────────

async function handleDroppedText(text) {
  if (!text) {
    return 0;
  }
  const lines = text.split(/[\s\n]+/);
  let added = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    // Only attempt playlist expansion when API key is available
    if (youtubeApiKey) {
      const plId = parsePlaylistId(trimmed);
      if (plId) {
        try {
          const plVideos = await fetchPlaylistItems(plId);
          for (const vid of plVideos) {
            if (!hasVideo(vid)) {
              createTile(vid);
              added++;
            }
          }
        } catch (_) {
          // Playlist fetch failed — try as individual video
          const id = parseYouTubeId(trimmed);
          if (id && !hasVideo(id)) {
            createTile(id);
            added++;
          }
        }
        continue;
      }
    }
    const id = parseYouTubeId(trimmed);
    if (id && !hasVideo(id)) {
      createTile(id);
      added++;
    }
  }
  return added;
}

// ── Onboarding ──────────────────────────────────────────────

const DEMO_VIDEOS = [
  'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
  'jNQXAC9IVRw', // Me at the zoo (first YouTube video)
  '9bZkp7q19f0', // PSY - Gangnam Style
];

// ── Init ────────────────────────────────────────────────────

export function initInput() {
  // URL input preview
  urlInput.addEventListener('input', () => {
    const val = urlInput.value.trim();
    if (previewDebounceTimer) {
      clearTimeout(previewDebounceTimer);
    }

    if (!val) {
      urlPreview.hidden = true;
      addError.hidden = true;
      return;
    }

    // Single video takes priority over playlist (URLs may contain both v= and list=)
    const id = parseYouTubeId(val);
    if (id) {
      addError.hidden = true;
      addError.classList.remove('info');
      previewDebounceTimer = setTimeout(() => updateUrlPreview(id), 300);
      return;
    }

    // Pure playlist URL (no v= parameter)
    const plId = parsePlaylistId(val);
    if (plId) {
      urlPreview.hidden = true;
      addError.textContent = '';
      if (youtubeApiKey) {
        const msgNode = document.createTextNode(
          '\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8URL\u3092\u691C\u51FA\u3002'
        );
        addError.appendChild(msgNode);
        const queueBtn = document.createElement('button');
        queueBtn.className = 'queue-play-btn';
        queueBtn.textContent = '\u30AD\u30E5\u30FC\u518D\u751F';
        queueBtn.title = '1\u30BF\u30A4\u30EB\u3067\u9806\u6B21\u518D\u751F';
        queueBtn.addEventListener('click', async () => {
          await addAsQueue(plId);
          urlInput.value = '';
          urlPreview.hidden = true;
        });
        addError.appendChild(queueBtn);
      } else {
        addError.textContent =
          '\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u5C55\u958B\u306B\u306FAPI\u30AD\u30FC\u304C\u5FC5\u8981\u3067\u3059\u3002\u52D5\u753BURL\u3092\u76F4\u63A5\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002';
      }
      addError.classList.add('info');
      addError.hidden = false;
      return;
    }

    // Channel URL (/@handle or /channel/UCxxx)
    const chParsed = parseChannelInput(val);
    if (chParsed) {
      urlPreview.hidden = true;
      addError.textContent = '';
      if (youtubeApiKey) {
        const msgNode = document.createTextNode(
          '\u30C1\u30E3\u30F3\u30CD\u30EBURL\u3092\u691C\u51FA\u3002'
        );
        addError.appendChild(msgNode);
        const watchBtn = document.createElement('button');
        watchBtn.className = 'queue-play-btn';
        watchBtn.textContent = '\u3053\u306E\u30C1\u30E3\u30F3\u30CD\u30EB\u3092\u76E3\u8996';
        watchBtn.title = '\u30E9\u30A4\u30D6\u914D\u4FE1\u3092\u81EA\u52D5\u691C\u51FA';
        watchBtn.addEventListener('click', async () => {
          await addChannel(val);
          urlInput.value = '';
          urlPreview.hidden = true;
          addError.hidden = true;
        });
        addError.appendChild(watchBtn);
      } else {
        addError.textContent =
          '\u30C1\u30E3\u30F3\u30CD\u30EB\u76E3\u8996\u306B\u306FAPI\u30AD\u30FC\u304C\u5FC5\u8981\u3067\u3059\u3002\u691C\u7D22\u30BB\u30AF\u30B7\u30E7\u30F3\u3067\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002';
      }
      addError.classList.add('info');
      addError.hidden = false;
      return;
    }

    addError.classList.remove('info');
    urlPreview.hidden = true;
  });

  // Form submit (single add)
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    addError.hidden = true;
    const raw = urlInput.value.trim();

    // Single video takes priority over playlist (URLs may contain both v= and list=)
    const id = parseYouTubeId(raw);
    if (id) {
      if (hasVideo(id)) {
        addError.textContent =
          '\u3053\u306e\u52d5\u753b\u306f\u65e2\u306b\u8ffd\u52a0\u3055\u308c\u3066\u3044\u307e\u3059\u3002';
        addError.hidden = false;
        urlInput.select();
        return;
      }
      createTile(id);
      urlInput.value = '';
      urlPreview.hidden = true;
      urlInput.focus();
      return;
    }

    // Pure playlist URL (no v= parameter)
    const playlistId = parsePlaylistId(raw);
    if (playlistId) {
      if (!youtubeApiKey) {
        addError.textContent =
          '\u30D7\u30EC\u30A4\u30EA\u30B9\u30C8\u5C55\u958B\u306B\u306FAPI\u30AD\u30FC\u304C\u5FC5\u8981\u3067\u3059\u3002\u691C\u7D22\u30BB\u30AF\u30B7\u30E7\u30F3\u3067\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002';
        addError.hidden = false;
        return;
      }
      await addFromPlaylist(playlistId);
      urlInput.value = '';
      urlPreview.hidden = true;
      urlInput.focus();
      return;
    }

    // Channel URL — add to watch list
    const chSubmit = parseChannelInput(raw);
    if (chSubmit) {
      if (!youtubeApiKey) {
        addError.textContent =
          '\u30C1\u30E3\u30F3\u30CD\u30EB\u76E3\u8996\u306B\u306FAPI\u30AD\u30FC\u304C\u5FC5\u8981\u3067\u3059\u3002\u691C\u7D22\u30BB\u30AF\u30B7\u30E7\u30F3\u3067\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002';
        addError.hidden = false;
        return;
      }
      await addChannel(raw);
      urlInput.value = '';
      urlPreview.hidden = true;
      urlInput.focus();
      return;
    }

    addError.textContent =
      'URL\u304c\u7121\u52b9\u3067\u3059\u3002YouTube\u306e\u52d5\u753bURL\u307e\u305f\u306f\u30d7\u30ec\u30a4\u30ea\u30b9\u30c8URL\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002';
    addError.hidden = false;
  });

  // Bulk add mode toggle
  singleModeBtn.addEventListener('click', () => {
    singleModeBtn.classList.add('active');
    bulkModeBtn.classList.remove('active');
    singleAddMode.hidden = false;
    bulkAddMode.hidden = true;
  });

  bulkModeBtn.addEventListener('click', () => {
    bulkModeBtn.classList.add('active');
    singleModeBtn.classList.remove('active');
    bulkAddMode.hidden = false;
    singleAddMode.hidden = true;
  });

  // Bulk URL count
  bulkUrlInput.addEventListener('input', () => {
    const lines = bulkUrlInput.value
      .split(/[\n\r]+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const playlistCount = lines.filter((l) => parsePlaylistId(l)).length;
    const ids = parseBulkUrls(bulkUrlInput.value);
    const newCount = ids.filter((id) => !hasVideo(id)).length;
    const dupCount = ids.length - newCount;

    if (ids.length === 0 && playlistCount === 0) {
      bulkCount.textContent = '';
      bulkCount.classList.remove('has-items');
    } else {
      let text = `${newCount}\u4ef6\u8ffd\u52a0\u53ef\u80fd`;
      if (dupCount > 0) {
        text += ` (${dupCount}\u4ef6\u91cd\u8907)`;
      }
      if (playlistCount > 0) {
        text += ` + \u30d7\u30ec\u30a4\u30ea\u30b9\u30c8${playlistCount}\u4ef6`;
      }
      bulkCount.textContent = text;
      bulkCount.classList.toggle('has-items', newCount > 0 || playlistCount > 0);
    }
  });

  // Bulk add button
  bulkAddBtn.addEventListener('click', async () => {
    addError.hidden = true;
    const hasPlaylist = bulkUrlInput.value.split(/[\n\r]+/).some((l) => parsePlaylistId(l.trim()));
    let ids;
    if (hasPlaylist) {
      bulkCount.textContent = '\u30d7\u30ec\u30a4\u30ea\u30b9\u30c8\u3092\u5c55\u958b\u4e2d...';
      bulkCount.classList.add('has-items');
      ids = await expandBulkWithPlaylists(bulkUrlInput.value);
    } else {
      ids = parseBulkUrls(bulkUrlInput.value);
    }
    const newIds = ids.filter((id) => !hasVideo(id));

    if (newIds.length === 0) {
      addError.textContent =
        '\u8ffd\u52a0\u3067\u304d\u308b\u52d5\u753b\u304c\u3042\u308a\u307e\u305b\u3093\u3002URL\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002';
      addError.hidden = false;
      return;
    }

    newIds.forEach((id) => createTile(id));
    bulkUrlInput.value = '';
    bulkCount.textContent = `${newIds.length}\u4ef6\u8ffd\u52a0\u3057\u307e\u3057\u305f`;
    bulkCount.classList.add('has-items');
    setTimeout(() => {
      bulkCount.textContent = '';
      bulkCount.classList.remove('has-items');
    }, 3000);
  });

  // Demo load
  loadDemoBtn.addEventListener('click', () => {
    let addedCount = 0;
    for (const id of DEMO_VIDEOS) {
      if (!hasVideo(id)) {
        createTile(id);
        addedCount++;
      }
    }
    if (addedCount > 0) {
      loadDemoBtn.textContent = `\u2705 ${addedCount}\u4ef6\u8ffd\u52a0`;
      setTimeout(() => {
        loadDemoBtn.textContent = '\ud83c\udfac \u30c7\u30e2\u3092\u30ed\u30fc\u30c9';
      }, 2000);
    } else {
      loadDemoBtn.textContent = '\u65e2\u306b\u8ffd\u52a0\u6e08\u307f';
      setTimeout(() => {
        loadDemoBtn.textContent = '\ud83c\udfac \u30c7\u30e2\u3092\u30ed\u30fc\u30c9';
      }, 2000);
    }
  });

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

  // Drop on content area
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

  // Clipboard paste (Ctrl+V outside input fields)
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
}
