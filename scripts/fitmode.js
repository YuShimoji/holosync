/**
 * @file scripts/fitmode.js
 * @brief Fit mode controller: dynamic auto-column layout, cover/contain toggle,
 *        focus mode (single video maximized), and quick-fit — all independent of
 *        the regular layout select.
 */
import { storageAdapter } from './storage.js';
import { videos } from './state.js';

const gridEl = document.getElementById('grid');
const fitModeBtn = document.getElementById('fitModeBtn');
const fitModeIcon = document.getElementById('fitModeIcon');
const layoutSelect = document.getElementById('layoutSelect');

// ── State ──────────────────────────────────────────────────
const fitState = {
  coverMode: false, // true = fill (cover), false = standard (contain + aspect-ratio)
  focusVideoId: null, // non-null = focus mode active for this video
  _savedFocusState: null, // sidebar/toolbar/frameless state before focus
  quickFitActive: false, // SP-021/F-01 quick-fit (all chrome hidden, grid preserved)
  _savedQuickFitState: null,
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
  if (!gridEl.classList.contains('layout-auto-dynamic')) {
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
    if (layoutSelect?.value === 'auto') {
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

// ── Focus Mode (SP-021/F-02+F-11) ─────────────────────────────
// Single video maximized, all chrome hidden.
// Entry: tile double-click, tile focus button, or toggleFocusMode(videoId).
// Exit: ESC, or edge-hover reveal buttons (top/left) to temporarily show chrome.
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

export function exitFocusMode() {
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

/** @returns {boolean} Whether focus mode is currently active */
export function isFocusModeActive() {
  return fitState.focusVideoId !== null;
}

// ── Quick Fit (SP-021/F-01) ────────────────────────────────
// One-action toggle: hides sidebar/toolbar, enables frameless, preserves grid.
// Differs from focus mode (F-11) in that all tiles remain visible.
function enterQuickFit() {
  fitState._savedQuickFitState = {
    sidebarCollapsed: document.body.classList.contains('sidebar-collapsed'),
    toolbarCollapsed: document.body.classList.contains('toolbar-collapsed'),
    frameless: document.body.classList.contains('frameless-mode'),
  };
  fitState.quickFitActive = true;
  document.body.classList.add('quick-fit-mode');

  if (_uiDeps) {
    _uiDeps.setSidebarCollapsed(true, { persist: false, source: 'quickfit' });
    _uiDeps.setToolbarCollapsed(true, { persist: false, source: 'quickfit' });
  }
  if (!fitState._savedQuickFitState.frameless && window.electronWindow?.setFramelessMode) {
    void window.electronWindow.setFramelessMode(true);
  }

  // SP-021/F-01 optional: match window aspect to 16:9 when enabled in settings.
  void (async () => {
    const enabled = await storageAdapter.getItem('quickFitAutoAspect');
    if (enabled === true && window.electronWindow?.setContentAspect) {
      window.electronWindow.setContentAspect(16, 9);
    }
  })();
}

function exitQuickFit() {
  if (!fitState.quickFitActive) {
    return;
  }
  const saved = fitState._savedQuickFitState;
  fitState.quickFitActive = false;
  document.body.classList.remove('quick-fit-mode');
  if (saved && _uiDeps) {
    _uiDeps.setSidebarCollapsed(saved.sidebarCollapsed, { persist: false, source: 'quickfit' });
    _uiDeps.setToolbarCollapsed(saved.toolbarCollapsed, { persist: false, source: 'quickfit' });
    if (
      saved.frameless !== document.body.classList.contains('frameless-mode') &&
      window.electronWindow?.setFramelessMode
    ) {
      void window.electronWindow.setFramelessMode(saved.frameless);
    }
  }
  fitState._savedQuickFitState = null;
}

export function toggleQuickFit() {
  if (fitState.quickFitActive) {
    exitQuickFit();
  } else {
    enterQuickFit();
  }
}

// ── Fit Window to Videos (SP-021/F-10) ─────────────────────
// Electron only. Resizes window height to match current grid aspect,
// assuming every video is 16:9. Manual one-shot trigger (not a toggle).
export function fitWindowToVideos() {
  if (!window.electronWindow?.setContentAspect) {
    return;
  }
  const count = videos.length;
  if (count === 0) {
    return;
  }
  const cols = resolveCurrentCols(count);
  const rows = Math.ceil(count / cols);
  window.electronWindow.setContentAspect(cols * 16, rows * 9);
}

function resolveCurrentCols(count) {
  const classes = Array.from(gridEl.classList);
  if (classes.includes('layout-theater')) {
    return 1;
  }
  const fixed = classes.find((c) => /^layout-\d+$/.test(c));
  if (fixed) {
    return parseInt(fixed.slice('layout-'.length), 10) || 1;
  }
  const autoCols = parseInt(gridEl.style.getPropertyValue('--auto-cols'), 10);
  if (Number.isFinite(autoCols) && autoCols > 0) {
    return autoCols;
  }
  const contentEl = gridEl.parentElement;
  const w = contentEl ? contentEl.clientWidth : gridEl.clientWidth;
  const h = contentEl ? contentEl.clientHeight : gridEl.clientHeight;
  return calcOptimalLayout(w, h, count).cols;
}

// ── Public API ─────────────────────────────────────────────
function toggleCoverMode() {
  setCoverMode(!fitState.coverMode);
}

export function toggleFocusMode(videoId) {
  if (fitState.focusVideoId === videoId) {
    exitFocusMode();
  } else {
    setFocusMode(videoId);
  }
}

export function onVideosChanged() {
  if (
    !fitState.coverMode &&
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

  // ESC key exits focus mode or quick-fit
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') {
      return;
    }
    if (fitState.focusVideoId) {
      e.preventDefault();
      e.stopPropagation();
      exitFocusMode();
    } else if (fitState.quickFitActive) {
      e.preventDefault();
      e.stopPropagation();
      exitQuickFit();
    }
  });

  // Quick-fit button (SP-021/F-01)
  const quickFitBtn = document.getElementById('quickFitBtn');
  quickFitBtn?.addEventListener('click', toggleQuickFit);

  // Fit-window button (SP-021/F-10) — resizes window to match video grid aspect.
  const fitWindowBtn = document.getElementById('fitWindowBtn');
  if (fitWindowBtn) {
    if (!window.electronWindow?.setContentAspect) {
      fitWindowBtn.hidden = true; // Electron 専用。Web 環境では非表示
    } else {
      fitWindowBtn.addEventListener('click', fitWindowToVideos);
    }
  }

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
    if (cover === true) {
      setCoverMode(true);
    }
    // Clean up legacy fullFit storage key (Full-Fit abolished in F-02)
    storageAdapter.setItem('fitFullFit', null);
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
