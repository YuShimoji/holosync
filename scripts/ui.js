/**
 * @file scripts/ui.js
 * @brief Sidebar, toolbar, immersive mode, dark mode, edge reveal,
 *        keyboard shortcuts, help modal, embed settings UI, sync settings UI.
 */
import { storageAdapter } from './storage.js';
import { videos, playerStates, state, SYNC_SETTINGS, EDGE_REVEAL_DISTANCE_PX } from './state.js';
import { buildEmbedUrl, sanitizeEmbedSettings, persistEmbedSettings } from './player.js';
import { syncAll, restartSyncLoop } from './sync.js';

// ── DOM References ─────────────────────────────────────────

const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOpen = document.getElementById('sidebarOpen');
const sidebarToolbarToggle = document.getElementById('sidebarToolbarToggle');
const edgeToolbarReveal = document.getElementById('edgeToolbarReveal');
const edgeSidebarReveal = document.getElementById('edgeSidebarReveal');
const darkModeToggle = document.getElementById('darkModeToggle');
const toolbarToggleBtn = document.getElementById('toolbarToggleBtn');
const immersiveToggleBtn = document.getElementById('immersiveToggleBtn');
const helpModal = document.getElementById('helpModal');
const showHelpBtn = document.getElementById('showHelpBtn');
const closeHelpBtn = document.getElementById('closeHelpBtn');
const debugPanel = document.getElementById('debugPanel');

const UI_LABELS = {
  toolbarShow: '\u30c4\u30fc\u30eb\u30d0\u30fc\u3092\u8868\u793a',
  toolbarHide: '\u30c4\u30fc\u30eb\u30d0\u30fc\u3092\u96a0\u3059',
  sidebarOpen: '\u30b5\u30a4\u30c9\u30d0\u30fc\u3092\u958b\u304f',
  sidebarClose: '\u30b5\u30a4\u30c9\u30d0\u30fc\u3092\u9589\u3058\u308b',
  immersiveEnter: '\u6ca1\u5165\u8868\u793a',
  immersiveExit: '\u6ca1\u5165\u8868\u793a\u3092\u7d42\u4e86',
};

// Embed settings toggles
const embedControlsToggle = document.getElementById('embedControls');
const embedModestBrandingToggle = document.getElementById('embedModestBranding');
const embedRelatedVideosToggle = document.getElementById('embedRelatedVideos');
const embedPlaysInlineToggle = document.getElementById('embedPlaysInline');
const embedNoCookieToggle = document.getElementById('embedNoCookie');

// Sync settings
const leaderModeSelect = document.getElementById('leaderMode');
const manualLeaderSection = document.getElementById('manualLeaderSection');
const leaderIdSelect = document.getElementById('leaderId');
const toleranceMsInput = document.getElementById('toleranceMs');
const toleranceValue = document.getElementById('toleranceValue');
const syncFrequencyInput = document.getElementById('syncFrequency');
const syncFrequencyValue = document.getElementById('syncFrequencyValue');

// Recovery settings
const retryOnErrorCheckbox = document.getElementById('retryOnError');
const fallbackModeSelect = document.getElementById('fallbackMode');

// ── Fullscreen ─────────────────────────────────────────────

async function exitFullscreenSafe() {
  if (!document.fullscreenElement || !document.exitFullscreen) {
    return;
  }
  try {
    await document.exitFullscreen();
  } catch (_) {
    // ignore
  }
}

// ── Edge Reveal ────────────────────────────────────────────

function clearEdgeRevealProximity() {
  document.body.classList.remove('edge-near-top', 'edge-near-left');
}

function syncEdgeRevealState() {
  const toolbarHidden = document.body.classList.contains('toolbar-collapsed');
  const sidebarHidden = document.body.classList.contains('sidebar-collapsed');

  if (edgeToolbarReveal) {
    edgeToolbarReveal.hidden = !toolbarHidden;
  }
  if (edgeSidebarReveal) {
    edgeSidebarReveal.hidden = !sidebarHidden;
  }

  if (!toolbarHidden || document.body.classList.contains('immersive-mode')) {
    document.body.classList.remove('edge-near-top');
  }
  if (!sidebarHidden || document.body.classList.contains('immersive-mode')) {
    document.body.classList.remove('edge-near-left');
  }
}

function notifyUiChromeLayoutChange(source) {
  window.dispatchEvent(
    new CustomEvent('holosync:ui-chrome-changed', {
      detail: { source },
    })
  );
}

// ── Sidebar / Toolbar / Immersive ──────────────────────────

function setButtonLabel(button, text, title = text) {
  if (!button) {
    return;
  }
  button.textContent = text;
  button.title = title;
  button.setAttribute('aria-label', title);
}

function updateToolbarButtonState(collapsed) {
  const label = collapsed ? UI_LABELS.toolbarShow : UI_LABELS.toolbarHide;
  setButtonLabel(toolbarToggleBtn, label);
  setButtonLabel(sidebarToolbarToggle, label);
  setButtonLabel(edgeToolbarReveal, UI_LABELS.toolbarShow);
}

function updateSidebarButtonState(collapsed) {
  if (sidebarToggle) {
    sidebarToggle.title = UI_LABELS.sidebarClose;
    sidebarToggle.setAttribute('aria-label', UI_LABELS.sidebarClose);
  }
  if (sidebarOpen) {
    sidebarOpen.hidden = !collapsed;
    sidebarOpen.title = UI_LABELS.sidebarOpen;
    sidebarOpen.setAttribute('aria-label', UI_LABELS.sidebarOpen);
  }
  setButtonLabel(edgeSidebarReveal, UI_LABELS.sidebarOpen);
}

function updateImmersiveButtonState(enabled) {
  const label = enabled ? UI_LABELS.immersiveExit : UI_LABELS.immersiveEnter;
  if (immersiveToggleBtn) {
    immersiveToggleBtn.classList.toggle('success', enabled);
    setButtonLabel(immersiveToggleBtn, label);
  }
}

function setToolbarCollapsed(collapsed, options = {}) {
  const { persist = true, source = 'toolbar' } = options;
  const previous = document.body.classList.contains('toolbar-collapsed');
  document.body.classList.toggle('toolbar-collapsed', collapsed);
  if (toolbarToggleBtn) {
    toolbarToggleBtn.classList.toggle('success', collapsed);
  }
  if (sidebarToolbarToggle) {
    sidebarToolbarToggle.classList.toggle('success', collapsed);
  }
  updateToolbarButtonState(collapsed);
  syncEdgeRevealState();
  if (persist) {
    storageAdapter.setItem('toolbarCollapsed', collapsed);
  }
  if (previous !== collapsed) {
    notifyUiChromeLayoutChange(source);
  }
}

function setSidebarCollapsed(collapsed, options = {}) {
  const { persist = true, source = 'sidebar' } = options;
  const previous = document.body.classList.contains('sidebar-collapsed');
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  updateSidebarButtonState(collapsed);
  syncEdgeRevealState();
  if (persist) {
    storageAdapter.setItem('sidebarCollapsed', collapsed);
  }
  if (previous !== collapsed) {
    notifyUiChromeLayoutChange(source);
  }
}

async function setImmersiveMode(enabled) {
  state.immersiveModeEnabled = enabled;
  document.body.classList.toggle('immersive-mode', enabled);
  updateImmersiveButtonState(enabled);
  notifyUiChromeLayoutChange('immersive');
  if (enabled) {
    state.sidebarStateBeforeImmersive = document.body.classList.contains('sidebar-collapsed');
    state.toolbarStateBeforeImmersive = document.body.classList.contains('toolbar-collapsed');
    setSidebarCollapsed(true, { persist: false, source: 'immersive' });
    setToolbarCollapsed(true, { persist: false, source: 'immersive' });
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (_) {
        // ignore
      }
    }
    return;
  }
  if (typeof state.sidebarStateBeforeImmersive === 'boolean') {
    setSidebarCollapsed(state.sidebarStateBeforeImmersive, {
      persist: false,
      source: 'immersive',
    });
  }
  if (typeof state.toolbarStateBeforeImmersive === 'boolean') {
    setToolbarCollapsed(state.toolbarStateBeforeImmersive, {
      persist: false,
      source: 'immersive',
    });
  }
  state.sidebarStateBeforeImmersive = null;
  state.toolbarStateBeforeImmersive = null;
  if (document.fullscreenElement) {
    await exitFullscreenSafe();
  }
}

// ── Help Modal ─────────────────────────────────────────────

function showHelp() {
  helpModal.classList.add('active');
}

function hideHelp() {
  helpModal.classList.remove('active');
}

// ── Embed Settings UI ──────────────────────────────────────

function syncEmbedSettingsUI() {
  if (embedControlsToggle) {
    embedControlsToggle.checked = state.embedSettings.controls === 1;
  }
  if (embedModestBrandingToggle) {
    embedModestBrandingToggle.checked = state.embedSettings.modestbranding === 1;
  }
  if (embedRelatedVideosToggle) {
    embedRelatedVideosToggle.checked = state.embedSettings.rel === 1;
  }
  if (embedPlaysInlineToggle) {
    embedPlaysInlineToggle.checked = state.embedSettings.playsinline === 1;
  }
  if (embedNoCookieToggle) {
    embedNoCookieToggle.checked = state.embedSettings.noCookie === 1;
  }
}

function applyEmbedSettingsToExistingVideos() {
  videos.forEach((video) => {
    const win = video.iframe?.contentWindow;
    const st = win ? playerStates.get(win) : null;
    const start = Number.isFinite(st?.time) ? st.time : undefined;
    const autoplay = st?.state === 1 ? 1 : 0;
    video.iframe.src = buildEmbedUrl(video.id, { mute: 0, start, autoplay });
  });
  if (videos.length > 0) {
    setTimeout(() => {
      syncAll();
    }, 1200);
  }
}

function handleEmbedSettingsChange() {
  state.embedSettings = sanitizeEmbedSettings({
    controls: embedControlsToggle?.checked,
    modestbranding: embedModestBrandingToggle?.checked,
    rel: embedRelatedVideosToggle?.checked,
    playsinline: embedPlaysInlineToggle?.checked,
    noCookie: embedNoCookieToggle?.checked,
  });
  persistEmbedSettings();
  applyEmbedSettingsToExistingVideos();
}

// ── Sync Settings / Leader Options ─────────────────────────

function updateLeaderIdOptions() {
  leaderIdSelect.innerHTML = '<option value="">自動選択</option>';
  videos.forEach((v) => {
    const option = document.createElement('option');
    option.value = v.id;
    option.textContent = `${v.id.slice(0, 11)}...`;
    leaderIdSelect.appendChild(option);
  });
}

// ── Init ───────────────────────────────────────────────────

/**
 * Set up all UI event listeners.
 * @param {object} deps - External dependencies
 * @param {Function} deps.playAll
 * @param {Function} deps.pauseAll
 * @param {Function} deps.muteAll
 * @param {Function} deps.unmuteAll
 */
export function initUI(deps) {
  // Sidebar
  sidebarToggle.addEventListener('click', () => {
    setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
  });
  sidebarOpen.addEventListener('click', () => {
    setSidebarCollapsed(false);
  });
  if (edgeToolbarReveal) {
    edgeToolbarReveal.addEventListener('click', () => {
      setToolbarCollapsed(false);
      clearEdgeRevealProximity();
    });
  }
  if (edgeSidebarReveal) {
    edgeSidebarReveal.addEventListener('click', () => {
      setSidebarCollapsed(false);
      clearEdgeRevealProximity();
    });
  }

  // Edge reveal proximity
  document.addEventListener(
    'mousemove',
    (event) => {
      if (document.body.classList.contains('immersive-mode')) {
        clearEdgeRevealProximity();
        return;
      }
      const toolbarHidden = document.body.classList.contains('toolbar-collapsed');
      const sidebarHidden = document.body.classList.contains('sidebar-collapsed');
      const nearTop = toolbarHidden && event.clientY <= EDGE_REVEAL_DISTANCE_PX;
      const nearLeft = sidebarHidden && event.clientX <= EDGE_REVEAL_DISTANCE_PX;
      document.body.classList.toggle('edge-near-top', nearTop);
      document.body.classList.toggle('edge-near-left', nearLeft);
    },
    { passive: true }
  );
  document.addEventListener('mouseout', (event) => {
    if (!event.relatedTarget) {
      clearEdgeRevealProximity();
    }
  });
  window.addEventListener('blur', clearEdgeRevealProximity);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearEdgeRevealProximity();
    }
  });

  // Toolbar toggle
  if (toolbarToggleBtn) {
    toolbarToggleBtn.addEventListener('click', () => {
      const next = !document.body.classList.contains('toolbar-collapsed');
      setToolbarCollapsed(next);
    });
  }
  if (sidebarToolbarToggle) {
    sidebarToolbarToggle.addEventListener('click', () => {
      const next = !document.body.classList.contains('toolbar-collapsed');
      setToolbarCollapsed(next);
    });
  }

  // Immersive mode
  if (immersiveToggleBtn) {
    immersiveToggleBtn.addEventListener('click', async () => {
      await setImmersiveMode(!state.immersiveModeEnabled);
    });
  }

  // Fullscreen change
  document.addEventListener('fullscreenchange', () => {
    const isFullscreen = Boolean(document.fullscreenElement);
    document.body.classList.toggle('is-fullscreen', isFullscreen);
    if (!isFullscreen && state.immersiveModeEnabled) {
      state.immersiveModeEnabled = false;
      document.body.classList.remove('immersive-mode');
      if (typeof state.sidebarStateBeforeImmersive === 'boolean') {
        setSidebarCollapsed(state.sidebarStateBeforeImmersive, {
          persist: false,
          source: 'immersive',
        });
      }
      if (typeof state.toolbarStateBeforeImmersive === 'boolean') {
        setToolbarCollapsed(state.toolbarStateBeforeImmersive, {
          persist: false,
          source: 'immersive',
        });
      }
      state.sidebarStateBeforeImmersive = null;
      state.toolbarStateBeforeImmersive = null;
      updateImmersiveButtonState(false);
    }
  });

  // Dark mode
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const isDark = currentTheme !== 'dark';
      if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      storageAdapter.setItem('darkMode', isDark);
    });
  }

  // Restore sidebar/toolbar state
  (async () => {
    const collapsed = await storageAdapter.getItem('sidebarCollapsed');
    const toolbarCollapsed = await storageAdapter.getItem('toolbarCollapsed');
    setSidebarCollapsed(collapsed === true, { persist: false, source: 'restore' });

    if (toolbarCollapsed === true) {
      setToolbarCollapsed(true, { persist: false, source: 'restore' });
    } else if (toolbarCollapsed === null || toolbarCollapsed === undefined) {
      setToolbarCollapsed(true, { persist: false, source: 'restore' });
    } else {
      setToolbarCollapsed(false, { persist: false, source: 'restore' });
    }
  })();

  // Help modal
  showHelpBtn.addEventListener('click', showHelp);
  closeHelpBtn.addEventListener('click', hideHelp);
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      hideHelp();
    }
  });

  // Embed settings
  [
    embedControlsToggle,
    embedModestBrandingToggle,
    embedRelatedVideosToggle,
    embedPlaysInlineToggle,
    embedNoCookieToggle,
  ]
    .filter(Boolean)
    .forEach((input) => {
      input.addEventListener('change', handleEmbedSettingsChange);
    });

  // Recovery settings
  retryOnErrorCheckbox.addEventListener('change', (e) => {
    SYNC_SETTINGS.retryOnError = e.target.checked;
  });
  fallbackModeSelect.addEventListener('change', (e) => {
    SYNC_SETTINGS.fallbackMode = e.target.value;
  });

  // Sync settings
  leaderModeSelect.addEventListener('change', (e) => {
    SYNC_SETTINGS.leaderMode = e.target.value;
    manualLeaderSection.hidden = e.target.value !== 'manual';
    if (e.target.value === 'manual') {
      updateLeaderIdOptions();
    }
  });
  leaderIdSelect.addEventListener('change', (e) => {
    SYNC_SETTINGS.leaderId = e.target.value || null;
  });
  toleranceMsInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    toleranceValue.textContent = val;
    SYNC_SETTINGS.toleranceMs = val;
  });
  syncFrequencyInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    syncFrequencyValue.textContent = val;
    SYNC_SETTINGS.probeIntervalMs = Math.round(1000 / val);
    restartSyncLoop();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return;
    }

    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (
          videos.some((v) => {
            const rec = playerStates.get(v.iframe?.contentWindow);
            return rec && rec.state === 1;
          })
        ) {
          deps.pauseAll();
        } else {
          deps.playAll();
        }
        break;
      case 'm':
      case 'M':
        deps.muteAll();
        break;
      case 'u':
      case 'U':
        deps.unmuteAll();
        break;
      case 'F11':
        e.preventDefault();
        setImmersiveMode(!state.immersiveModeEnabled);
        break;
      case 's':
      case 'S':
        syncAll();
        break;
      case 't':
      case 'T':
        setToolbarCollapsed(!document.body.classList.contains('toolbar-collapsed'));
        break;
      case 'Escape':
        if (document.fullscreenElement) {
          e.preventDefault();
          exitFullscreenSafe();
          if (state.immersiveModeEnabled) {
            setImmersiveMode(false);
          }
          break;
        }
        if (helpModal.classList.contains('active')) {
          hideHelp();
        } else if (!debugPanel.hidden) {
          debugPanel.hidden = true;
        }
        break;
      case '?':
        showHelp();
        break;
    }
  });
}

// ── Toast Notification ──────────────────────────────────────

let _toastContainer = null;

function ensureToastContainer() {
  if (_toastContainer) {
    return _toastContainer;
  }
  _toastContainer = document.createElement('div');
  _toastContainer.id = 'toastContainer';
  _toastContainer.className = 'toast-container';
  document.body.appendChild(_toastContainer);
  return _toastContainer;
}

/**
 * Show a brief toast notification.
 * @param {string} message
 * @param {number} [durationMs=3000]
 */
export function showToast(message, durationMs = 3000) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  // Trigger enter animation
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    // Fallback removal
    setTimeout(() => toast.remove(), 500);
  }, durationMs);
}

export { syncEmbedSettingsUI, setSidebarCollapsed, setToolbarCollapsed, updateLeaderIdOptions };
