/**
 * @file scripts/input.js
 * @brief Unified URL input with preview list, drag & drop, clipboard paste, onboarding demo.
 */
import { hasVideo, youtubeApiKey } from './state.js';
import { parseYouTubeId, parsePlaylistId, createTile } from './player.js';
import { fetchPlaylistItems } from './search.js';
import { parseChannelInput, addChannel } from './channel.js';

// ── DOM References ─────────────────────────────────────────

const urlAddInput = document.getElementById('urlAddInput');
const urlPreviewList = document.getElementById('urlPreviewList');
const urlAddBar = document.getElementById('urlAddBar');
const urlAddCount = document.getElementById('urlAddCount');
const urlAddSubmit = document.getElementById('urlAddSubmit');
const urlAddSelectAll = document.getElementById('urlAddSelectAll');
const urlAddDeselectAll = document.getElementById('urlAddDeselectAll');
const addError = document.getElementById('addError');

// Onboarding
const loadDemoBtn = document.getElementById('loadDemoBtn');
const dropHint = document.getElementById('dropHint');

// D&D targets
const gridEl = document.getElementById('grid');
const contentEl = document.getElementById('content');

// ── Preview State ──────────────────────────────────────────

// Map<videoId, { videoId, title, author, thumbUrl, checked, isDuplicate }>
const previewMap = new Map();
// Track which playlist IDs are currently being fetched
const pendingPlaylists = new Set();
let debounceTimer = null;

// ── oEmbed Fetch ───────────────────────────────────────────

async function fetchOEmbed(videoId) {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error('Not found');
    }
    const data = await resp.json();
    return {
      title: data.title,
      author: data.author_name,
      thumbUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/default.jpg`,
    };
  } catch {
    return {
      title: `ID: ${videoId}`,
      author: '\u30e1\u30bf\u30c7\u30fc\u30bf\u53d6\u5f97\u4e0d\u53ef',
      thumbUrl: `https://img.youtube.com/vi/${videoId}/default.jpg`,
    };
  }
}

// ── Parse & Preview ────────────────────────────────────────

async function parseAndPreview() {
  const text = urlAddInput.value;
  const lines = text
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Collect current video IDs and playlist IDs from textarea
  const currentVideoIds = new Set();
  const currentPlaylistIds = new Set();
  const newVideoIds = [];
  const newPlaylistIds = [];

  for (const line of lines) {
    // Video ID takes priority (URL may contain both v= and list=)
    const vid = parseYouTubeId(line);
    if (vid) {
      currentVideoIds.add(vid);
      if (!previewMap.has(vid)) {
        newVideoIds.push(vid);
      }
      continue;
    }

    const plId = parsePlaylistId(line);
    if (plId) {
      currentPlaylistIds.add(plId);
      if (!pendingPlaylists.has(plId)) {
        // Check if any preview entries already came from this playlist
        let alreadyExpanded = false;
        for (const entry of previewMap.values()) {
          if (entry.playlistId === plId) {
            alreadyExpanded = true;
            break;
          }
        }
        if (!alreadyExpanded) {
          newPlaylistIds.push(plId);
        }
      }
      continue;
    }

    // Channel URLs: show info in addError (not in preview list)
    const chParsed = parseChannelInput(line);
    if (chParsed) {
      addError.textContent = '';
      if (youtubeApiKey) {
        const msgNode = document.createTextNode(
          '\u30c1\u30e3\u30f3\u30cd\u30ebURL\u3092\u691c\u51fa\u3002'
        );
        addError.appendChild(msgNode);
        const watchBtn = document.createElement('button');
        watchBtn.className = 'queue-play-btn';
        watchBtn.textContent = '\u3053\u306e\u30c1\u30e3\u30f3\u30cd\u30eb\u3092\u76e3\u8996';
        watchBtn.addEventListener('click', async () => {
          await addChannel(line);
          addError.hidden = true;
        });
        addError.appendChild(watchBtn);
      } else {
        addError.textContent =
          '\u30c1\u30e3\u30f3\u30cd\u30eb\u76e3\u8996\u306bAPI\u30ad\u30fc\u304c\u5fc5\u8981\u3067\u3059\u3002';
      }
      addError.classList.add('info');
      addError.hidden = false;
    }
  }

  // Remove entries no longer in textarea
  for (const [vid, entry] of previewMap) {
    if (entry.playlistId) {
      if (!currentPlaylistIds.has(entry.playlistId)) {
        previewMap.delete(vid);
      }
    } else {
      if (!currentVideoIds.has(vid)) {
        previewMap.delete(vid);
      }
    }
  }

  // Fetch oEmbed for new video IDs in parallel
  if (newVideoIds.length > 0) {
    const fetches = newVideoIds.map(async (vid) => {
      const meta = await fetchOEmbed(vid);
      const isDuplicate = hasVideo(vid);
      previewMap.set(vid, {
        videoId: vid,
        title: meta.title,
        author: meta.author,
        thumbUrl: meta.thumbUrl,
        checked: !isDuplicate,
        isDuplicate,
      });
    });
    await Promise.allSettled(fetches);
  }

  // Expand new playlists
  for (const plId of newPlaylistIds) {
    if (!youtubeApiKey) {
      // Show error for this playlist
      addError.textContent =
        'API\u30ad\u30fc\u672a\u8a2d\u5b9a\u306e\u305f\u3081\u30d7\u30ec\u30a4\u30ea\u30b9\u30c8\u3092\u5c55\u958b\u3067\u304d\u307e\u305b\u3093\u3002';
      addError.classList.add('info');
      addError.hidden = false;
      continue;
    }
    pendingPlaylists.add(plId);
    renderPreviewList(); // Show loading state
    try {
      const videoIds = await fetchPlaylistItems(plId);
      const fetches = videoIds.map(async (vid) => {
        if (previewMap.has(vid)) {
          return;
        }
        const meta = await fetchOEmbed(vid);
        const isDuplicate = hasVideo(vid);
        previewMap.set(vid, {
          videoId: vid,
          title: meta.title,
          author: meta.author,
          thumbUrl: meta.thumbUrl,
          checked: !isDuplicate,
          isDuplicate,
          playlistId: plId,
        });
      });
      await Promise.allSettled(fetches);
    } catch (err) {
      addError.textContent = `\u30d7\u30ec\u30a4\u30ea\u30b9\u30c8\u5c55\u958b\u30a8\u30e9\u30fc: ${err.message}`;
      addError.hidden = false;
    } finally {
      pendingPlaylists.delete(plId);
    }
  }

  renderPreviewList();
  updateAddBar();
}

// ── Render Preview List ────────────────────────────────────

function renderPreviewList() {
  urlPreviewList.innerHTML = '';

  // Show loading for pending playlists
  for (const plId of pendingPlaylists) {
    const loadingEl = document.createElement('div');
    loadingEl.className = 'url-preview-loading';
    loadingEl.textContent = `\u30d7\u30ec\u30a4\u30ea\u30b9\u30c8 ${plId.slice(0, 12)}... \u3092\u5c55\u958b\u4e2d...`;
    urlPreviewList.appendChild(loadingEl);
  }

  for (const [vid, entry] of previewMap) {
    const card = document.createElement('div');
    card.className = 'sb-result-card';
    if (entry.checked) {
      card.classList.add('selected');
    }
    card.dataset.videoId = vid;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'sb-result-check';
    checkbox.checked = entry.checked;
    checkbox.addEventListener('change', () => {
      entry.checked = checkbox.checked;
      card.classList.toggle('selected', checkbox.checked);
      updateAddBar();
    });

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'sb-result-thumb-wrap';
    const thumb = document.createElement('img');
    thumb.className = 'sb-result-thumb';
    thumb.src = entry.thumbUrl;
    thumb.alt = '';
    thumbWrap.appendChild(thumb);

    const info = document.createElement('div');
    info.className = 'sb-result-info';
    const title = document.createElement('div');
    title.className = 'sb-result-title';
    title.textContent = entry.title;
    const author = document.createElement('div');
    author.className = 'sb-result-channel';
    author.textContent = entry.author;
    info.appendChild(title);
    info.appendChild(author);

    card.appendChild(checkbox);
    card.appendChild(thumbWrap);
    card.appendChild(info);

    if (entry.isDuplicate) {
      const badge = document.createElement('span');
      badge.className = 'url-preview-duplicate';
      badge.textContent = '\u8ffd\u52a0\u6e08\u307f';
      card.appendChild(badge);
    }

    // Click card to toggle checkbox
    card.addEventListener('click', (e) => {
      if (e.target.closest('.sb-result-check')) {
        return;
      }
      checkbox.checked = !checkbox.checked;
      entry.checked = checkbox.checked;
      card.classList.toggle('selected', checkbox.checked);
      updateAddBar();
    });

    urlPreviewList.appendChild(card);
  }
}

// ── Add Bar ────────────────────────────────────────────────

function updateAddBar() {
  const checkedCount = [...previewMap.values()].filter((e) => e.checked && !e.isDuplicate).length;
  if (checkedCount > 0 || previewMap.size > 0) {
    urlAddCount.textContent = `${checkedCount}\u4ef6\u9078\u629e\u4e2d`;
    urlAddBar.hidden = false;
  } else {
    urlAddBar.hidden = true;
  }
}

function submitSelected() {
  let added = 0;
  for (const entry of previewMap.values()) {
    if (entry.checked && !entry.isDuplicate) {
      createTile(entry.videoId);
      added++;
    }
  }
  if (added > 0) {
    addError.textContent = `${added}\u4ef6\u8ffd\u52a0\u3057\u307e\u3057\u305f`;
    addError.classList.add('info');
    addError.hidden = false;
    setTimeout(() => {
      addError.hidden = true;
    }, 3000);
  }
  // Clear
  urlAddInput.value = '';
  previewMap.clear();
  renderPreviewList();
  updateAddBar();
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
  // Unified URL input with debounced preview
  urlAddInput.addEventListener('input', () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    addError.hidden = true;

    const val = urlAddInput.value.trim();
    if (!val) {
      previewMap.clear();
      renderPreviewList();
      updateAddBar();
      return;
    }

    debounceTimer = setTimeout(() => parseAndPreview(), 500);
  });

  // Submit selected videos
  urlAddSubmit.addEventListener('click', () => submitSelected());

  // Select all / deselect all
  urlAddSelectAll.addEventListener('click', () => {
    for (const entry of previewMap.values()) {
      entry.checked = true;
    }
    renderPreviewList();
    updateAddBar();
  });

  urlAddDeselectAll.addEventListener('click', () => {
    for (const entry of previewMap.values()) {
      entry.checked = false;
    }
    renderPreviewList();
    updateAddBar();
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
