/**
 * @file scripts/input.js
 * @brief URL input, preview, bulk add, drag & drop, clipboard paste, onboarding demo.
 */
import { hasVideo } from './state.js';
import { parseYouTubeId, createTile } from './player.js';

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

// ── Drag & Drop / Clipboard ────────────────────────────────

function handleDroppedText(text) {
  if (!text) {
    return;
  }
  const lines = text.split(/[\s\n]+/);
  let added = 0;
  for (const line of lines) {
    const id = parseYouTubeId(line.trim());
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

    const id = parseYouTubeId(val);
    if (id) {
      addError.hidden = true;
      previewDebounceTimer = setTimeout(() => updateUrlPreview(id), 300);
    } else {
      urlPreview.hidden = true;
    }
  });

  // Form submit (single add)
  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addError.hidden = true;
    const raw = urlInput.value.trim();
    const id = parseYouTubeId(raw);
    if (!id) {
      addError.textContent =
        'URL\u304c\u7121\u52b9\u3067\u3059\u3002YouTube\u306e\u52d5\u753bURL\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002';
      addError.hidden = false;
      return;
    }
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
    const ids = parseBulkUrls(bulkUrlInput.value);
    const newCount = ids.filter((id) => !hasVideo(id)).length;
    const dupCount = ids.length - newCount;

    if (ids.length === 0) {
      bulkCount.textContent = '';
      bulkCount.classList.remove('has-items');
    } else {
      let text = `${newCount}\u4ef6\u8ffd\u52a0\u53ef\u80fd`;
      if (dupCount > 0) {
        text += ` (${dupCount}\u4ef6\u91cd\u8907)`;
      }
      bulkCount.textContent = text;
      bulkCount.classList.toggle('has-items', newCount > 0);
    }
  });

  // Bulk add button
  bulkAddBtn.addEventListener('click', () => {
    addError.hidden = true;
    const ids = parseBulkUrls(bulkUrlInput.value);
    const newIds = ids.filter((id) => !hasVideo(id));

    if (newIds.length === 0) {
      addError.textContent =
        '\u8ffd\u52a0\u3067\u304d\u308b\u52d5\u753b\u304c\u3042\u308a\u307e\u305b\u3093\u3002URL\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002';
      addError.hidden = false;
      return;
    }

    newIds.forEach((id) => createTile(id));
    bulkUrlInput.value = '';
    bulkCount.textContent = `\u2705 ${newIds.length}\u4ef6\u8ffd\u52a0\u3057\u307e\u3057\u305f`;
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
