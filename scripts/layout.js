/**
 * @file scripts/layout.js
 * @brief Grid layout, cell mode, tile ordering, drag/resize, sync groups.
 */
import { storageAdapter } from './storage.js';
import { videos, state, MIN_TILE_WIDTH, ASPECT_RATIO, SYNC_GROUPS } from './state.js';
import { persistVideos } from './player.js';
import { planDenseLayout } from './dense-layout-planner.js';

const gridEl = document.getElementById('grid');
const layoutSelect = document.getElementById('layoutSelect');
const gridGapInput = document.getElementById('gridGap');
const gridGapVal = document.getElementById('gridGapVal');
const DENSE_VIEWPORT_HEIGHT_GUARD = 24;
const DENSE_TILE_ASPECT_RATIO = 1 / ASPECT_RATIO;

// ── Tile Order ─────────────────────────────────────────────

function syncTileOrderDom() {
  videos.forEach((video) => {
    if (video.tile && video.tile.parentElement === gridEl) {
      gridEl.appendChild(video.tile);
    }
  });
  refreshTileStackOrder();
  scheduleDenseMosaicLayout();
}

function refreshTileStackOrder() {
  videos.forEach((video, index) => {
    if (!video.tile) {
      return;
    }
    if (state.cellModeEnabled) {
      video.tile.style.setProperty('--tile-stack-index', String(5 + index));
    } else {
      video.tile.style.removeProperty('--tile-stack-index');
    }
  });
}

export function getReorderedItems(items, oldIndex, targetIndex) {
  if (!Array.isArray(items) || oldIndex < 0 || oldIndex >= items.length) {
    return Array.isArray(items) ? items.slice() : [];
  }

  let normalizedTarget = Math.max(0, Math.min(targetIndex, items.length));
  if (normalizedTarget > oldIndex) {
    normalizedTarget -= 1;
  }

  const nextItems = items.slice();
  if (normalizedTarget === oldIndex) {
    return nextItems;
  }

  const [item] = nextItems.splice(oldIndex, 1);
  nextItems.splice(normalizedTarget, 0, item);
  return nextItems;
}

export function getGridReorderIndexFromRects(candidateRects, clientX, clientY, itemCount) {
  const fallbackIndex = Number.isFinite(itemCount) ? itemCount : candidateRects.length;
  let insertIndex = fallbackIndex;

  for (const candidate of candidateRects) {
    const rect = candidate.rect;
    const beforeRow = clientY < rect.top;
    const inRow = clientY >= rect.top && clientY <= rect.bottom;
    const beforeMidpoint = clientX < rect.left + rect.width / 2;
    if (beforeRow || (inRow && beforeMidpoint)) {
      insertIndex = candidate.index;
      break;
    }
  }

  return insertIndex;
}

function bringVideoToFront(videoId) {
  const index = videos.findIndex((video) => video.id === videoId);
  if (index === -1 || index === videos.length - 1) {
    return;
  }
  const [video] = videos.splice(index, 1);
  videos.push(video);
  syncTileOrderDom();
  persistVideos();
}

function getGridReorderIndex(videoEntry, clientX, clientY) {
  const candidateRects = [];
  for (const [candidateIndex, candidate] of videos.entries()) {
    if (candidate === videoEntry || !candidate.tile) {
      continue;
    }
    candidateRects.push({
      index: candidateIndex,
      rect: candidate.tile.getBoundingClientRect(),
    });
  }
  return getGridReorderIndexFromRects(candidateRects, clientX, clientY, videos.length);
}

function reorderVideoInGrid(videoEntry, targetIndex) {
  const oldIndex = videos.indexOf(videoEntry);
  if (oldIndex === -1) {
    return false;
  }
  const nextVideos = getReorderedItems(videos, oldIndex, targetIndex);
  if (nextVideos.every((video, index) => video === videos[index])) {
    return false;
  }
  videos.splice(0, videos.length, ...nextVideos);
  syncTileOrderDom();
  persistVideos();
  return true;
}

// ── Layout / Grid ──────────────────────────────────────────

function setLayout(mode) {
  const normalizedMode = mode || 'auto';
  if (layoutSelect && layoutSelect.value !== normalizedMode) {
    layoutSelect.value = normalizedMode;
  }
  handleLayoutChange(normalizedMode);
  storageAdapter.setItem('layoutMode', normalizedMode);
}

function persistLayoutSettings() {
  storageAdapter.setItem('layoutSettings', {
    layout: layoutSelect.value,
    gap: state.cellGap,
  });
}

function clearDenseMosaicLayout() {
  gridEl.classList.remove('dense-mosaic-ready');
  gridEl.style.removeProperty('--dense-cols');
  gridEl.style.removeProperty('--dense-tile-width');
  gridEl.style.removeProperty('--dense-template-columns');
  gridEl.removeAttribute('data-dense-cols');
  gridEl.removeAttribute('data-dense-rows');
  gridEl.removeAttribute('data-dense-planner-version');
  gridEl.removeAttribute('data-dense-planner-score');
  window.__holoSyncDenseLayoutPlan = null;
}

function getDenseChromeMode() {
  const body = document.body;
  const sidebarCollapsed =
    body.classList.contains('sidebar-collapsed') || body.classList.contains('immersive-mode');
  const toolbarCollapsed =
    body.classList.contains('toolbar-collapsed') || body.classList.contains('immersive-mode');

  if (sidebarCollapsed && toolbarCollapsed) {
    return 'chrome-collapsed';
  }
  if (!sidebarCollapsed && !toolbarCollapsed) {
    return 'chrome-visible';
  }
  return 'chrome-partial';
}

function updateDenseMosaicLayout() {
  if (!gridEl.classList.contains('layout-dense') || state.cellModeEnabled) {
    clearDenseMosaicLayout();
    return;
  }

  const count = videos.filter((video) => video.tile?.parentElement === gridEl).length;
  if (count === 0) {
    clearDenseMosaicLayout();
    return;
  }

  const computed = getComputedStyle(gridEl);
  const gap = Math.max(
    parseFloat(computed.columnGap) || state.cellGap || 0,
    parseFloat(computed.rowGap) || state.cellGap || 0
  );
  const paddingX =
    (parseFloat(computed.paddingLeft) || 0) + (parseFloat(computed.paddingRight) || 0);
  const paddingY =
    (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);
  const gridRect = gridEl.getBoundingClientRect();
  const contentRect = gridEl.parentElement?.getBoundingClientRect() || gridRect;
  const availableWidth = Math.max(0, contentRect.width - paddingX);
  const availableHeight = Math.max(
    0,
    Math.min(contentRect.bottom, window.innerHeight) -
      gridRect.top -
      paddingY -
      DENSE_VIEWPORT_HEIGHT_GUARD
  );
  const plan = planDenseLayout({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    stageWidth: availableWidth,
    stageHeight: availableHeight,
    tileCount: count,
    tileAspectRatio: DENSE_TILE_ASPECT_RATIO,
    gap,
    chromeMode: getDenseChromeMode(),
  });
  const best = plan.selectedCandidate;

  if (!best) {
    clearDenseMosaicLayout();
    return;
  }

  gridEl.classList.add('dense-mosaic-ready');
  gridEl.style.setProperty('--dense-cols', String(best.columns));
  gridEl.style.setProperty('--dense-tile-width', `${best.tileWidth}px`);
  gridEl.style.setProperty(
    '--dense-template-columns',
    `repeat(${best.columns}, minmax(0, ${best.tileWidth}px))`
  );
  gridEl.dataset.denseCols = String(best.columns);
  gridEl.dataset.denseRows = String(best.rows);
  gridEl.dataset.densePlannerVersion = plan.version;
  gridEl.dataset.densePlannerScore = String(best.score);
  window.__holoSyncDenseLayoutPlan = plan;
  state.cellColumns = best.columns;
}

const scheduleDenseMosaicLayout = (() => {
  let timeoutId;
  let rafId;
  return (delayMs = 0) => {
    clearTimeout(timeoutId);
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    timeoutId = setTimeout(() => {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateDenseMosaicLayout();
      });
    }, delayMs);
  };
})();

// ── Cell Mode ──────────────────────────────────────────────

function getCellDimensions() {
  const gridRect = gridEl.getBoundingClientRect();
  const availableWidth = gridRect.width - state.cellGap * 2;
  const cellWidth = (availableWidth - state.cellGap * (state.cellColumns - 1)) / state.cellColumns;
  const cellHeight = cellWidth * ASPECT_RATIO;
  return { cellWidth, cellHeight, gridRect };
}

function getCellFromPoint(x, y) {
  const { cellWidth, cellHeight, gridRect } = getCellDimensions();
  const relX = x - gridRect.left - state.cellGap + gridEl.scrollLeft;
  const relY = y - gridRect.top - state.cellGap + gridEl.scrollTop;
  const col = Math.floor(relX / (cellWidth + state.cellGap));
  const row = Math.floor(relY / (cellHeight + state.cellGap));
  return {
    col: Math.max(0, Math.min(col, state.cellColumns - 1)),
    row: Math.max(0, row),
  };
}

function positionTileInCell(tile, videoEntry) {
  if (!state.cellModeEnabled) {
    return;
  }
  const { cellWidth, cellHeight } = getCellDimensions();
  const col = videoEntry.cellCol ?? 0;
  const row = videoEntry.cellRow ?? 0;
  const left = state.cellGap + col * (cellWidth + state.cellGap);
  const top = state.cellGap + row * (cellHeight + state.cellGap);
  tile.style.left = left + 'px';
  tile.style.top = top + 'px';
  tile.classList.add('cell-positioned');

  // Apply custom size or default cell size.
  if (videoEntry.tileWidth && videoEntry.tileHeight) {
    tile.style.width = videoEntry.tileWidth + 'px';
    tile.style.height = videoEntry.tileHeight + 'px';
  } else {
    tile.style.width = cellWidth + 'px';
    tile.style.height = cellHeight + 'px';
  }
}

function updateDropTargetHighlight(x, y) {
  clearDropTargetHighlight();
  const cell = getCellFromPoint(x, y);
  if (!cell || !state.cellOverlayContainer) {
    return;
  }
  const overlays = state.cellOverlayContainer.querySelectorAll('.cell-overlay');
  const idx = cell.row * state.cellColumns + cell.col;
  if (overlays[idx]) {
    overlays[idx].classList.add('drop-target');
  }
}

function clearDropTargetHighlight() {
  if (!state.cellOverlayContainer) {
    return;
  }
  state.cellOverlayContainer.querySelectorAll('.drop-target').forEach((el) => {
    el.classList.remove('drop-target');
  });
}

function createCellOverlays() {
  if (state.cellOverlayContainer) {
    state.cellOverlayContainer.remove();
  }
  state.cellOverlayContainer = document.createElement('div');
  state.cellOverlayContainer.className = 'cell-overlay-container';

  const { cellWidth, cellHeight } = getCellDimensions();
  const rows = Math.max(10, Math.ceil(videos.length / state.cellColumns) + 2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < state.cellColumns; c++) {
      const overlay = document.createElement('div');
      overlay.className = 'cell-overlay';
      overlay.style.left = state.cellGap + c * (cellWidth + state.cellGap) + 'px';
      overlay.style.top = state.cellGap + r * (cellHeight + state.cellGap) + 'px';
      overlay.style.width = cellWidth + 'px';
      overlay.style.height = cellHeight + 'px';
      overlay.dataset.col = c;
      overlay.dataset.row = r;
      state.cellOverlayContainer.appendChild(overlay);
    }
  }

  gridEl.insertBefore(state.cellOverlayContainer, gridEl.firstChild);
}

function relayoutCellModeTiles() {
  if (!state.cellModeEnabled) {
    return;
  }
  createCellOverlays();
  videos.forEach((v) => positionTileInCell(v.tile, v));
}

function enableCellMode() {
  state.cellModeEnabled = true;
  gridEl.classList.add('cell-mode');
  createCellOverlays();

  // Position all tiles
  videos.forEach((v, idx) => {
    if (v.cellCol === null || v.cellRow === null) {
      v.cellCol = idx % state.cellColumns;
      v.cellRow = Math.floor(idx / state.cellColumns);
    }
    positionTileInCell(v.tile, v);
  });
  refreshTileStackOrder();
}

function disableCellMode() {
  state.cellModeEnabled = false;
  gridEl.classList.remove('cell-mode');
  if (state.cellOverlayContainer) {
    state.cellOverlayContainer.remove();
    state.cellOverlayContainer = null;
  }

  // Reset tile styles — always clear inline size so CSS grid controls layout
  videos.forEach((v) => {
    v.tile.classList.remove('cell-positioned');
    v.tile.style.left = '';
    v.tile.style.top = '';
    v.tile.style.width = '';
    v.tile.style.height = '';
    v.tile.style.removeProperty('--tile-stack-index');
  });
}

function updateGridGap(gap) {
  state.cellGap = gap;
  gridEl.style.gap = gap + 'px';
  gridEl.style.padding = gap + 'px';
  relayoutCellModeTiles();
  scheduleDenseMosaicLayout();
}

function handleLayoutChange(layout) {
  // Remove all layout classes
  gridEl.classList.remove(
    'layout-1',
    'layout-2',
    'layout-3',
    'layout-4',
    'layout-dense',
    'layout-theater'
  );
  clearDenseMosaicLayout();

  if (layout === 'free') {
    state.cellColumns = 4; // Default for free mode
    enableCellMode();
  } else {
    disableCellMode();
    if (layout !== 'auto') {
      gridEl.classList.add('layout-' + layout);
    }
    if (layout === '1') {
      state.cellColumns = 1;
    } else if (layout === '2') {
      state.cellColumns = 2;
    } else if (layout === '3') {
      state.cellColumns = 3;
    } else if (layout === '4') {
      state.cellColumns = 4;
    } else if (layout === 'dense') {
      state.cellColumns = 6;
    } else {
      state.cellColumns = 2;
    }
  }

  updateDenseMosaicLayout();
  persistLayoutSettings();
}

// ── Tile Drag & Resize ─────────────────────────────────────

function setupTileResize(tile, videoEntry, resizeHandle, sizeBadge) {
  let isResizing = false;
  let startX, startW, lastW, lastH, rafId;
  let cachedTileLeft, cachedGridRight;

  resizeHandle.addEventListener('mousedown', (e) => {
    if (!state.cellModeEnabled) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    isResizing = true;
    startX = e.clientX;
    startW = tile.offsetWidth;
    lastW = startW;
    lastH = Math.round(startW * ASPECT_RATIO);
    tile.classList.add('resizing');
    sizeBadge.style.display = 'block';
    sizeBadge.textContent = `${lastW}×${lastH}`;

    // Cache layout values once at resize start to avoid per-frame reflow
    const tileRect = tile.getBoundingClientRect();
    const gridRect = gridEl.getBoundingClientRect();
    cachedTileLeft = tileRect.left;
    cachedGridRight = gridRect.right;

    const onMove = (ev) => {
      if (!isResizing) {
        return;
      }
      const deltaX = ev.clientX - startX;
      const maxWidthByGrid = Math.max(
        MIN_TILE_WIDTH,
        cachedGridRight - cachedTileLeft - state.cellGap
      );
      const maxWidthByViewport = Math.max(MIN_TILE_WIDTH, window.innerWidth - cachedTileLeft - 12);
      const maxWidth = Math.min(maxWidthByGrid, maxWidthByViewport);
      const newW = Math.max(MIN_TILE_WIDTH, Math.min(startW + deltaX, maxWidth));
      const newH = Math.round(newW * ASPECT_RATIO);
      lastW = Math.round(newW);
      lastH = newH;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        tile.style.width = lastW + 'px';
        tile.style.height = lastH + 'px';
        sizeBadge.textContent = `${lastW}×${lastH}`;
      });
    };

    const onUp = () => {
      if (!isResizing) {
        return;
      }
      isResizing = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      tile.classList.remove('resizing');
      sizeBadge.style.display = 'none';

      // Apply final size consistently (use tracked values, not offsetWidth)
      tile.style.width = lastW + 'px';
      tile.style.height = lastH + 'px';
      videoEntry.tileWidth = lastW;
      videoEntry.tileHeight = lastH;
      persistVideos();
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function setupTileDrag(tile, videoEntry, dragHandle) {
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  const dragThresholdPx = 6;

  dragHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    if (!state.cellModeEnabled) {
      let hasMoved = false;
      tile.classList.add('dragging');
      gridEl.classList.add('grid-reordering');

      const onMove = (ev) => {
        if (!isDragging) {
          return;
        }
        const moved =
          Math.abs(ev.clientX - startX) > dragThresholdPx ||
          Math.abs(ev.clientY - startY) > dragThresholdPx;
        if (moved) {
          hasMoved = true;
        }
      };

      const onUp = (ev) => {
        if (!isDragging) {
          return;
        }
        isDragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        tile.classList.remove('dragging');
        gridEl.classList.remove('grid-reordering');

        if (!hasMoved) {
          return;
        }
        const targetIndex = getGridReorderIndex(videoEntry, ev.clientX, ev.clientY);
        reorderVideoInGrid(videoEntry, targetIndex);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      return;
    }

    bringVideoToFront(videoEntry.id);
    startLeft = tile.offsetLeft;
    startTop = tile.offsetTop;
    tile.classList.add('dragging');
    gridEl.classList.add('show-cells');

    const onMove = (ev) => {
      if (!isDragging) {
        return;
      }
      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;
      tile.style.left = startLeft + deltaX + 'px';
      tile.style.top = startTop + deltaY + 'px';

      // Highlight drop target cell
      updateDropTargetHighlight(ev.clientX, ev.clientY);
    };

    const onUp = (ev) => {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      tile.classList.remove('dragging');
      gridEl.classList.remove('show-cells');
      clearDropTargetHighlight();

      // Snap to cell
      const cell = getCellFromPoint(ev.clientX, ev.clientY);
      if (cell) {
        videoEntry.cellCol = cell.col;
        videoEntry.cellRow = cell.row;
        positionTileInCell(tile, videoEntry);
        persistVideos();
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ── Sync Groups ────────────────────────────────────────────

function setSyncGroup(videoId, groupId) {
  const entry = videos.find((v) => v.id === videoId);
  if (!entry) {
    return;
  }
  entry.syncGroupId = groupId;
  // Update badge
  const badge = entry.tile?.querySelector('.tile-sync-badge');
  if (badge) {
    if (groupId) {
      badge.textContent = groupId;
      badge.classList.remove('no-sync');
    } else {
      badge.textContent = '独立';
      badge.classList.add('no-sync');
    }
  }
  persistVideos();
}

// ── Load / Persist Settings ────────────────────────────────

async function loadLayoutSettings() {
  try {
    const sharedSession = storageAdapter.parseShareUrl();
    if (sharedSession?.layout || typeof sharedSession?.gap === 'number') {
      return;
    }

    const settings = await storageAdapter.getItem('layoutSettings');
    if (settings) {
      if (settings.layout) {
        setLayout(settings.layout);
      }
      if (typeof settings.gap === 'number') {
        state.cellGap = settings.gap;
        if (gridGapInput) {
          gridGapInput.value = settings.gap;
          gridGapVal.textContent = settings.gap;
        }
        updateGridGap(settings.gap);
      }
    }
  } catch (_) {
    // ignore
  }
}

// ── Init / Event Listeners ─────────────────────────────────

export function initLayout() {
  // Layout select
  layoutSelect.addEventListener('change', (e) => {
    setLayout(e.target.value);
  });

  // Gap slider
  if (gridGapInput) {
    gridGapInput.addEventListener('input', (e) => {
      const gap = parseInt(e.target.value, 10);
      gridGapVal.textContent = gap;
      updateGridGap(gap);
      persistLayoutSettings();
    });
  }

  // Sync group badge click
  gridEl.addEventListener('click', (e) => {
    const badge = e.target.closest('.tile-sync-badge');
    if (!badge) {
      return;
    }
    const tile = badge.closest('.tile');
    if (!tile) {
      return;
    }
    const videoId = tile.dataset.videoId;
    const entry = videos.find((v) => v.id === videoId);
    if (!entry) {
      return;
    }
    // Cycle through groups: A -> B -> C -> null (independent) -> A
    const options = [...SYNC_GROUPS, null];
    const currentIdx = options.indexOf(entry.syncGroupId);
    const nextIdx = (currentIdx + 1) % options.length;
    setSyncGroup(videoId, options[nextIdx]);
  });

  const scheduleCellRelayout = (() => {
    let timeoutId;
    return (delayMs) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        relayoutCellModeTiles();
      }, delayMs);
    };
  })();

  // Window resize for cell mode
  window.addEventListener('resize', () => {
    scheduleCellRelayout(100);
    scheduleDenseMosaicLayout(100);
  });

  // UI chrome change event — emitted by ui.js whenever sidebar / toolbar /
  // immersive state changes. This is the single source of truth; we used to
  // additionally run a MutationObserver on body[class] which fired the same
  // relayout twice per change (and amplified work in cell mode).
  window.addEventListener('holosync:ui-chrome-changed', () => {
    if (state.cellModeEnabled) {
      relayoutCellModeTiles();
      scheduleCellRelayout(280);
    }
    scheduleDenseMosaicLayout();
    scheduleDenseMosaicLayout(280);
  });

  const resizeObserver = new ResizeObserver(() => {
    scheduleDenseMosaicLayout();
  });
  resizeObserver.observe(gridEl.parentElement || gridEl);
  resizeObserver.observe(gridEl);

  const tileObserver = new MutationObserver(() => {
    scheduleDenseMosaicLayout();
  });
  tileObserver.observe(gridEl, { childList: true });
}

export {
  setupTileDrag,
  setupTileResize,
  syncTileOrderDom,
  refreshTileStackOrder,
  loadLayoutSettings,
  setLayout,
};
