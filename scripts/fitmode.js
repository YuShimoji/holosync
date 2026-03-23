/**
 * @file scripts/fitmode.js
 * @brief Fit mode controller: dynamic auto-column layout, cover/contain toggle,
 *        and full-fit (single video maximized) toggle — all independent of
 *        the regular layout select.
 */
import { storageAdapter } from './storage.js';
import { videos } from './state.js';

const gridEl = document.getElementById('grid');
const fitModeBtn = document.getElementById('fitModeBtn');
const fullFitBtn = document.getElementById('fullFitBtn');
const fitModeIcon = document.getElementById('fitModeIcon');
const layoutSelect = document.getElementById('layoutSelect');

// ── State ──────────────────────────────────────────────────
const fitState = {
  coverMode: false, // true = fill (cover), false = standard (contain + aspect-ratio)
  fullFit: false, // true = show only 1st video, maximized
  focusVideoId: null, // non-null = focus mode active for this video
  _savedFocusState: null, // sidebar/toolbar/frameless state before focus
};

// ── Dynamic column calculation ─────────────────────────────
// Given video count & container size, find optimal column count
// that minimizes wasted space while fitting all tiles in view.
// Returns { cols, rowHeight } where rowHeight is null when 16:9 fits naturally.
function calcOptimalLayout(containerW, containerH, count) {
  if (count <= 1) {
    const naturalH = containerW * (9 / 16);
    const rowHeight = naturalH > containerH ? Math.floor(containerH) : null;
    return { cols: 1, rowHeight };
  }

  let bestCols = 1;
  let bestScore = -Infinity;
  let bestRowH = null;

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cellW = containerW / cols;
    const naturalH = cellW * (9 / 16);
    const usedH = rows * naturalH;

    let rowH = null;
    let actualCellH = naturalH;

    if (usedH > containerH) {
      // Tiles overflow — constrain row height to fit all rows
      rowH = Math.floor(containerH / rows);
      actualCellH = rowH;
    }

    // Score: prefer layouts that fill the screen with minimal waste
    // and keep tiles close to 16:9 aspect ratio
    const fillRatio = (rows * actualCellH) / containerH; // 1.0 = perfect fit
    const aspectDeviation = Math.abs(actualCellH / cellW - 9 / 16);
    const score = fillRatio - aspectDeviation * 2; // penalize aspect distortion

    if (score > bestScore) {
      bestScore = score;
      bestCols = cols;
      bestRowH = rowH;
    }
  }
  return { cols: bestCols, rowHeight: bestRowH };
}

// Apply dynamic columns (and row height) to the grid CSS variables
function applyDynamicColumns() {
  if (fitState.fullFit || !gridEl.classList.contains('layout-auto-dynamic')) {
    return;
  }
  const contentEl = gridEl.parentElement;
  const w = contentEl ? contentEl.clientWidth : gridEl.clientWidth;
  const h = contentEl ? contentEl.clientHeight : gridEl.clientHeight;
  const count = videos.length;
  const { cols, rowHeight } = calcOptimalLayout(w, h, count);
  gridEl.style.setProperty('--auto-cols', String(cols));
  if (rowHeight) {
    gridEl.style.setProperty('--auto-row-height', rowHeight + 'px');
    gridEl.classList.add('auto-fit-rows');
  } else {
    gridEl.style.removeProperty('--auto-row-height');
    gridEl.classList.remove('auto-fit-rows');
  }
}

// ── Cover Mode ─────────────────────────────────────────────
function setCoverMode(enabled) {
  fitState.coverMode = enabled;
  gridEl.classList.toggle('fit-cover', enabled);
  storageAdapter.setItem('fitCoverMode', enabled);

  // Update icon: cover = fill icon, contain = grid icon
  updateFitIcon();
  if (fitModeBtn) {
    fitModeBtn.classList.toggle('active', enabled);
    fitModeBtn.title = enabled
      ? 'フィットモード: 余白なし【Cover中】→ クリックで標準に戻す'
      : 'フィットモード: 標準【Contain】→ クリックで余白なし（Cover）に切替';
  }

  if (enabled) {
    // In cover mode, use dynamic columns if auto layout
    if (layoutSelect?.value === 'auto' || layoutSelect?.value === 'auto-dynamic') {
      applyDynamicColumns();
    }
  }
}

function updateFitIcon() {
  if (!fitModeIcon) {
    return;
  }
  if (fitState.coverMode) {
    // Solid square — "filled"
    fitModeIcon.innerHTML = `<rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/>`;
  } else {
    // Grid lines — "grid/contain"
    fitModeIcon.innerHTML = `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>`;
  }
}

// ── Full-Fit Mode (single video maximized) ─────────────────
function setFullFit(enabled) {
  fitState.fullFit = enabled;

  if (enabled) {
    // Save current layout class
    fitState._savedLayoutClass = Array.from(gridEl.classList).find(
      (c) => c.startsWith('layout-') && c !== 'layout-auto-dynamic'
    );
    // Remove all layout classes and auto-fit state
    [...gridEl.classList]
      .filter((c) => c.startsWith('layout-'))
      .forEach((c) => gridEl.classList.remove(c));
    gridEl.classList.remove('auto-fit-rows');
    gridEl.style.removeProperty('--auto-row-height');
    gridEl.classList.add('layout-fullfit');
  } else {
    gridEl.classList.remove('layout-fullfit');
    if (fitState._savedLayoutClass) {
      gridEl.classList.add(fitState._savedLayoutClass);
    }
    // Restore auto-dynamic layout if applicable
    if (gridEl.classList.contains('layout-auto-dynamic')) {
      applyDynamicColumns();
    }
  }

  storageAdapter.setItem('fitFullFit', enabled);

  if (fullFitBtn) {
    fullFitBtn.classList.toggle('fullfit-active', enabled);
    fullFitBtn.title = enabled
      ? '全画面フィット【有効中】→ クリックで解除'
      : '全画面フィット（1動画を最大化）';
  }
}

// ── Focus Mode (SP-021/F-11) ────────────────────────────────
// Single video maximized, all chrome hidden. Double-click tile to enter, ESC to exit.
let _uiDeps = null; // { setSidebarCollapsed, setToolbarCollapsed }

function setFocusMode(videoId) {
  if (fitState.focusVideoId) {
    exitFocusMode();
  }

  // Save current chrome state
  fitState._savedFocusState = {
    sidebarCollapsed: document.body.classList.contains('sidebar-collapsed'),
    toolbarCollapsed: document.body.classList.contains('toolbar-collapsed'),
    frameless: document.body.classList.contains('frameless-mode'),
    fullFit: fitState.fullFit,
  };

  fitState.focusVideoId = videoId;
  document.body.classList.add('focus-mode');

  // Mark the focused tile
  const entry = videos.find((v) => v.id === videoId);
  if (entry?.tile) {
    entry.tile.classList.add('focus-target');
  }

  // Hide all chrome
  if (_uiDeps) {
    _uiDeps.setSidebarCollapsed(true, { persist: false, source: 'focus' });
    _uiDeps.setToolbarCollapsed(true, { persist: false, source: 'focus' });
  }
}

function exitFocusMode() {
  if (!fitState.focusVideoId) {
    return;
  }

  const prevId = fitState.focusVideoId;
  fitState.focusVideoId = null;
  document.body.classList.remove('focus-mode');

  // Remove focus-target from tile
  const entry = videos.find((v) => v.id === prevId);
  if (entry?.tile) {
    entry.tile.classList.remove('focus-target');
  }

  // Restore chrome state
  const saved = fitState._savedFocusState;
  if (saved && _uiDeps) {
    _uiDeps.setSidebarCollapsed(saved.sidebarCollapsed, { persist: false, source: 'focus' });
    _uiDeps.setToolbarCollapsed(saved.toolbarCollapsed, { persist: false, source: 'focus' });
  }
  fitState._savedFocusState = null;
}

// ── Public API ─────────────────────────────────────────────
export function toggleCoverMode() {
  setCoverMode(!fitState.coverMode);
}

export function toggleFullFit() {
  setFullFit(!fitState.fullFit);
}

export function toggleFocusMode(videoId) {
  if (fitState.focusVideoId === videoId) {
    exitFocusMode();
  } else {
    setFocusMode(videoId);
  }
}

export function isFocusModeActive() {
  return !!fitState.focusVideoId;
}

export function onVideosChanged() {
  if (
    !fitState.coverMode &&
    !fitState.fullFit &&
    (layoutSelect?.value === 'auto' || gridEl.classList.contains('layout-auto-dynamic'))
  ) {
    applyDynamicColumns();
  }
}

// ── Init ────────────────────────────────────────────────────
export function initFitMode(deps) {
  // Store UI deps for focus mode chrome control
  if (deps) {
    _uiDeps = deps;
  }

  // Fit/Cover toggle button
  fitModeBtn?.addEventListener('click', toggleCoverMode);

  // Full-fit button
  fullFitBtn?.addEventListener('click', toggleFullFit);

  // ESC key exits focus mode
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fitState.focusVideoId) {
      e.preventDefault();
      e.stopPropagation();
      exitFocusMode();
    }
  });

  // ResizeObserver for dynamic auto layout
  const ro = new ResizeObserver(() => {
    applyDynamicColumns();
  });
  const contentEl = gridEl.parentElement;
  if (contentEl) {
    ro.observe(contentEl);
  }

  // Restore state
  (async () => {
    const cover = await storageAdapter.getItem('fitCoverMode');
    const full = await storageAdapter.getItem('fitFullFit');
    if (cover === true) {
      setCoverMode(true);
    }
    if (full === true) {
      setFullFit(true);
    }
  })();

  // Layout select changes — sync dynamic mode
  layoutSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'auto') {
      gridEl.classList.add('layout-auto-dynamic');
      applyDynamicColumns();
    } else {
      gridEl.classList.remove('layout-auto-dynamic');
      gridEl.classList.remove('auto-fit-rows');
      gridEl.style.removeProperty('--auto-cols');
      gridEl.style.removeProperty('--auto-row-height');
    }
  });

  // Initialize fit icon
  updateFitIcon();
}
