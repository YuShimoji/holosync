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
};

// ── Dynamic column calculation ─────────────────────────────
// Given video count & container size, find optimal column count
// that minimizes wasted space while respecting the 16:9 aspect ratio.
function calcOptimalColumns(containerW, containerH, count) {
  if (count === 0) {
    return 1;
  }
  if (count === 1) {
    return 1;
  }

  let bestCols = 1;
  let bestWaste = Infinity;

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cellW = containerW / cols;
    const cellH = cellW * (9 / 16);
    const usedH = rows * cellH;
    if (usedH > containerH * 1.5) {
      continue;
    } // skip layouts that overflow too much
    const waste = Math.abs(usedH / containerH - 1); // how close we are to filling height
    if (waste < bestWaste) {
      bestWaste = waste;
      bestCols = cols;
    }
  }
  return bestCols;
}

// Apply dynamic columns to the grid CSS variable
function applyDynamicColumns() {
  if (fitState.fullFit || fitState.coverMode || !gridEl.classList.contains('layout-auto-dynamic')) {
    return;
  }
  const contentEl = gridEl.parentElement;
  const w = contentEl ? contentEl.clientWidth : gridEl.clientWidth;
  const h = contentEl ? contentEl.clientHeight : gridEl.clientHeight;
  const count = videos.length;
  const cols = calcOptimalColumns(w, h, count);
  gridEl.style.setProperty('--auto-cols', String(cols));
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
    // Remove all layout classes
    [...gridEl.classList]
      .filter((c) => c.startsWith('layout-'))
      .forEach((c) => gridEl.classList.remove(c));
    gridEl.classList.add('layout-fullfit');
  } else {
    gridEl.classList.remove('layout-fullfit');
    if (fitState._savedLayoutClass) {
      gridEl.classList.add(fitState._savedLayoutClass);
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

// ── Public API ─────────────────────────────────────────────
export function toggleCoverMode() {
  setCoverMode(!fitState.coverMode);
}

export function toggleFullFit() {
  setFullFit(!fitState.fullFit);
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
export function initFitMode() {
  // Fit/Cover toggle button
  fitModeBtn?.addEventListener('click', toggleCoverMode);

  // Full-fit button
  fullFitBtn?.addEventListener('click', toggleFullFit);

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
      gridEl.style.removeProperty('--auto-cols');
    }
  });

  // Initialize fit icon
  updateFitIcon();
}
