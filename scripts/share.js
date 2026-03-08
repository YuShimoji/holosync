/**
 * @file scripts/share.js
 * @brief Share URL / QR code functions for HoloSync.
 */
import { storageAdapter } from './storage.js';
import { videos, state, playerStates } from './state.js';

// DOM references (share-related)
const shareStatus = document.getElementById('shareStatus');
const shareModal = document.getElementById('shareModal');
const shareUrlInput = document.getElementById('shareUrlInput');
const shareQrBox = document.getElementById('shareQrBox');
const shareQrImg = document.getElementById('shareQrImg');
const shareBtn = document.getElementById('shareBtn');
const closeShareBtn = document.getElementById('closeShareBtn');
const copyShareBtn = document.getElementById('copyShareBtn');
const openShareBtn = document.getElementById('openShareBtn');
const importShareBtn = document.getElementById('importShareBtn');
const shareQrBtn = document.getElementById('shareQrBtn');
const layoutSelect = document.getElementById('layoutSelect');
const volumeAll = document.getElementById('volumeAll');
const speedAllSelect = document.getElementById('speedAll');

function setShareStatus(message, isError = false) {
  if (!shareStatus) {
    return;
  }
  shareStatus.textContent = message;
  shareStatus.hidden = !message;
  shareStatus.classList.toggle('error', isError);
}

export function buildShareState() {
  return {
    videos: videos.map((v) => {
      const win = v.iframe?.contentWindow;
      const rec = win ? playerStates.get(win) : null;
      return {
        id: v.id,
        syncGroupId: v.syncGroupId,
        offsetMs: v.offsetMs,
        currentTime: rec?.time ?? null,
        cellCol: v.cellCol ?? null,
        cellRow: v.cellRow ?? null,
        tileWidth: v.tileWidth ?? null,
        tileHeight: v.tileHeight ?? null,
        zoomDiameter: v.zoomDiameter ?? null,
        zoomScale: v.zoomScale ?? null,
        zoomOriginX: v.zoomOriginX ?? null,
        zoomOriginY: v.zoomOriginY ?? null,
        zoomPanelX: v.zoomPanelX ?? null,
        zoomPanelY: v.zoomPanelY ?? null,
        zoomShape: v.zoomShape ?? null,
      };
    }),
    layout: layoutSelect.value,
    volume: parseInt(volumeAll.value, 10),
    speed: parseFloat(speedAllSelect.value),
    gap: state.cellGap,
    embedSettings: state.embedSettings,
  };
}

export function getShareUrl() {
  const shareState = buildShareState();
  return storageAdapter.generateShareUrl(shareState);
}

export function normalizeShareUrl(input) {
  const raw = input.trim();
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw).toString();
  } catch (_) {
    try {
      return new URL(`https://${raw}`).toString();
    } catch (e) {
      return null;
    }
  }
}

async function copyToClipboard(text) {
  if (!text) {
    return false;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {
    // Fallback below
  }
  try {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.setAttribute('readonly', '');
    temp.style.position = 'absolute';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(temp);
    return ok;
  } catch (e) {
    return false;
  }
}

function showShareModal(url) {
  if (!shareModal) {
    return;
  }
  shareUrlInput.value = url;
  shareQrBox.hidden = true;
  shareQrImg.removeAttribute('src');
  setShareStatus('');
  shareModal.classList.add('active');
}

function hideShareModal() {
  if (!shareModal) {
    return;
  }
  shareModal.classList.remove('active');
}

export function initShare() {
  shareBtn.addEventListener('click', async () => {
    const url = getShareUrl();
    showShareModal(url);
    const copied = await copyToClipboard(url);
    if (copied) {
      shareBtn.classList.add('success');
      setShareStatus('Copied to clipboard.');
      setTimeout(() => shareBtn.classList.remove('success'), 1200);
    } else {
      setShareStatus('Copy failed. Please copy manually.', true);
    }
  });

  if (closeShareBtn) {
    closeShareBtn.addEventListener('click', hideShareModal);
  }
  if (shareModal) {
    shareModal.addEventListener('click', (e) => {
      if (e.target === shareModal) {
        hideShareModal();
      }
    });
  }
  if (copyShareBtn) {
    copyShareBtn.addEventListener('click', async () => {
      const url = normalizeShareUrl(shareUrlInput.value);
      if (!url) {
        setShareStatus('Invalid URL.', true);
        return;
      }
      const copied = await copyToClipboard(url);
      setShareStatus(copied ? 'Copied to clipboard.' : 'Copy failed.', !copied);
    });
  }
  if (openShareBtn) {
    openShareBtn.addEventListener('click', () => {
      const url = normalizeShareUrl(shareUrlInput.value);
      if (!url) {
        setShareStatus('Invalid URL.', true);
        return;
      }
      const opened = window.open(url, '_blank', 'noopener');
      if (!opened) {
        window.location.href = url;
      }
    });
  }
  if (importShareBtn) {
    importShareBtn.addEventListener('click', () => {
      const url = normalizeShareUrl(shareUrlInput.value);
      if (!url) {
        setShareStatus('Invalid URL.', true);
        return;
      }
      window.location.href = url;
    });
  }
  if (shareQrBtn) {
    shareQrBtn.addEventListener('click', () => {
      const url = normalizeShareUrl(shareUrlInput.value);
      if (!url) {
        setShareStatus('Invalid URL.', true);
        return;
      }
      shareQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
        url
      )}`;
      shareQrBox.hidden = false;
      setShareStatus('QR generated.');
    });
  }

  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const importJsonBtn = document.getElementById('importJsonBtn');
  const importJsonFile = document.getElementById('importJsonFile');

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      const shareState = buildShareState();
      const json = JSON.stringify(shareState, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `holosync-session-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setShareStatus('Session exported.');
    });
  }

  if (importJsonBtn && importJsonFile) {
    importJsonBtn.addEventListener('click', () => importJsonFile.click());
    importJsonFile.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(/** @type {string} */ (reader.result));
          const shareUrl = storageAdapter.generateShareUrl(imported);
          window.location.href = shareUrl;
        } catch (err) {
          setShareStatus('Invalid JSON file.', true);
          console.warn('JSON import failed:', err);
        }
      };
      reader.readAsText(file);
      importJsonFile.value = '';
    });
  }
}
