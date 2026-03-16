/**
 * @file scripts/layout.js
 * @brief Grid layout, cell mode, tile ordering, drag/resize, sync groups.
 */
import { storageAdapter } from './storage.js';
import { videos, state, MIN_TILE_WIDTH, ASPECT_RATIO, SYNC_GROUPS } from './state.js';
import { persistVideos } from './player.js';

const gridEl = document.getElementById('grid');
const layoutSelect = document.getElementById('layoutSelect');
const gridGapInput = document.getElementById('gridGap');
const gridGapVal = document.getElementById('gridGapVal');

// ── Tile Order ─────────────────────────────────────────────

function syncTileOrderDom() {
  videos.forEach((video) => {
    if (video.tile && video.tile.parentElement === gridEl) {
      gridEl.appendChild(video.tile);
    }
  });
  refreshTileStackOrder();
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

function moveVideoOrder(videoId, direction) {
  const index = videos.findIndex((video) => video.id === videoId);
  if (index === -1) {
    return;
  }
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= videos.length) {
    return;
  }
  const current = videos[index];
  videos[index] = videos[nextIndex];
  videos[nextIndex] = current;
  syncTileOrderDom();
  persistVideos();
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
}

function handleLayoutChange(layout) {
  // Remove all layout classes
  gridEl.classList.remove('layout-1', 'layout-2', 'layout-3', 'layout-4', 'layout-theater');

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
    } else {
      state.cellColumns = 2;
    }
  }

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

  dragHandle.addEventListener('mousedown', (e) => {
    if (!state.cellModeEnabled) {
      return;
    }
    bringVideoToFront(videoEntry.id);
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
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
  });

  // UI chrome change event (if emitted by UI module)
  window.addEventListener('holosync:ui-chrome-changed', () => {
    relayoutCellModeTiles();
    scheduleCellRelayout(280);
  });

  // Fallback: observe body class changes for sidebar/toolbar/immersive toggles.
  const bodyEl = document.body;
  if (bodyEl) {
    let prevKey = [
      bodyEl.classList.contains('sidebar-collapsed'),
      bodyEl.classList.contains('toolbar-collapsed'),
      bodyEl.classList.contains('immersive-mode'),
    ].join('|');

    const observer = new MutationObserver(() => {
      const nextKey = [
        bodyEl.classList.contains('sidebar-collapsed'),
        bodyEl.classList.contains('toolbar-collapsed'),
        bodyEl.classList.contains('immersive-mode'),
      ].join('|');

      if (nextKey === prevKey) {
        return;
      }
      prevKey = nextKey;
      relayoutCellModeTiles();
      scheduleCellRelayout(280);
    });

    observer.observe(bodyEl, { attributes: true, attributeFilter: ['class'] });
  }
}

export {
  handleLayoutChange,
  setupTileDrag,
  setupTileResize,
  moveVideoOrder,
  syncTileOrderDom,
  refreshTileStackOrder,
  loadLayoutSettings,
  setLayout,
};
