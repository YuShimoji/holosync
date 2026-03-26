/**
 * @file scripts/electron.js
 * @brief Electron frameless mode integration and window controls.
 */
import { state } from './state.js';

const windowFrameToggleBtn = document.getElementById('windowFrameToggleBtn');
const windowControls = document.getElementById('windowControls');
const windowMinBtn = document.getElementById('windowMinBtn');
const windowMaxBtn = document.getElementById('windowMaxBtn');
const windowCloseBtn = document.getElementById('windowCloseBtn');

function hasElectronWindowBridge() {
  return (
    typeof window.electronWindow === 'object' &&
    window.electronWindow !== null &&
    typeof window.electronWindow.setFramelessMode === 'function'
  );
}

function applyFramelessState(isFrameless) {
  state.framelessModeEnabled = isFrameless;
  document.body.classList.toggle('frameless-mode', isFrameless);
  if (windowFrameToggleBtn) {
    windowFrameToggleBtn.classList.toggle('success', isFrameless);
    const label = isFrameless ? 'フレーム付きに戻す' : 'フレームレス';
    windowFrameToggleBtn.title = label;
    windowFrameToggleBtn.setAttribute('aria-label', label);
  }
  if (windowControls) {
    windowControls.hidden = !isFrameless;
  }
}

async function syncWindowModeFromMain() {
  if (!hasElectronWindowBridge()) {
    return;
  }
  try {
    const prefs = await window.electronWindow.getPreferences();
    applyFramelessState(Boolean(prefs?.framelessMode));
  } catch (_) {
    applyFramelessState(false);
  }
}

function ensureFramelessDragHandle() {
  if (document.getElementById('framelessDragHandle')) {
    return;
  }
  const content = document.getElementById('content');
  if (!content) {
    return;
  }
  const dragHandle = document.createElement('button');
  dragHandle.id = 'framelessDragHandle';
  dragHandle.className = 'frameless-drag-handle';
  dragHandle.type = 'button';
  dragHandle.textContent = 'Drag';
  dragHandle.title = 'Window drag';
  dragHandle.setAttribute('aria-label', 'Window drag');
  content.insertBefore(dragHandle, content.firstChild);
}

function initDragMode() {
  const dragOverlay = document.getElementById('dragOverlay');
  if (!dragOverlay) {
    return;
  }

  function enterDragMode() {
    if (!state.framelessModeEnabled) {
      return;
    }
    document.body.classList.add('drag-mode');
    dragOverlay.hidden = false;
  }

  function exitDragMode() {
    document.body.classList.remove('drag-mode');
    dragOverlay.hidden = true;
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Alt' && !e.repeat) {
      enterDragMode();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Alt') {
      exitDragMode();
    }
  });

  window.addEventListener('blur', exitDragMode);
}

export function initElectron() {
  ensureFramelessDragHandle();
  syncWindowModeFromMain();
  initDragMode();

  if (windowFrameToggleBtn && hasElectronWindowBridge()) {
    windowFrameToggleBtn.addEventListener('click', async () => {
      try {
        await window.electronWindow.setFramelessMode(!state.framelessModeEnabled);
      } catch (_) {
        // ignore
      }
    });
  }

  if (windowMinBtn && hasElectronWindowBridge()) {
    windowMinBtn.addEventListener('click', () => {
      window.electronWindow.minimize();
    });
  }

  if (windowMaxBtn && hasElectronWindowBridge()) {
    windowMaxBtn.addEventListener('click', () => {
      window.electronWindow.toggleMaximize();
    });
  }

  if (windowCloseBtn && hasElectronWindowBridge()) {
    windowCloseBtn.addEventListener('click', () => {
      window.electronWindow.close();
    });
  }
}
