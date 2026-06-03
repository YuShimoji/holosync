/**
 * @file scripts/tile-controls.js
 * @brief Per-tile YouTube-style control bar (seek, play/pause, volume, time).
 */
import { playerStates, videos } from './state.js';
import { sendCommand } from './player.js';
import { isLikelyLive } from './sync.js';

// SVG icon paths (24x24 viewBox)
const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
const ICON_PAUSE = '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>';
const ICON_VOL = '<path d="M3 9v6h4l5 5V4L7 9H3z"/>';
const ICON_MUTED =
  '<path d="M3 9v6h4l5 5V4L7 9H3z"/><line x1="23" y1="1" x2="1" y2="23" stroke="currentColor" stroke-width="2"/>';

// Cache the master volume slider once. updateTileControlBar runs in a tight
// loop, so calling getElementById per call per tile is measurable overhead.
let _masterVolSliderEl = null;
function getMasterVolumeSlider() {
  if (!_masterVolSliderEl || !_masterVolSliderEl.isConnected) {
    _masterVolSliderEl = document.getElementById('volumeAll');
  }
  return _masterVolSliderEl;
}

function formatTime(seconds) {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function makeSvg(innerHtml) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.innerHTML = innerHtml;
  return svg;
}

/**
 * Create a YouTube-style control bar for a single tile.
 * Appends the bar to videoEntry.tile and stores references on videoEntry.controlBar.
 */
export function createTileControlBar(videoEntry) {
  const bar = document.createElement('div');
  bar.className = 'tile-control-bar';

  // --- Seek bar ---
  const seekWrap = document.createElement('div');
  seekWrap.className = 'tile-seek-wrap';
  const seekBar = document.createElement('input');
  seekBar.type = 'range';
  seekBar.className = 'tile-seek';
  seekBar.min = '0';
  seekBar.max = '100';
  seekBar.step = '0.1';
  seekBar.value = '0';
  seekWrap.appendChild(seekBar);

  // --- Control row ---
  const ctrlRow = document.createElement('div');
  ctrlRow.className = 'tile-ctrl-row';

  // Play/Pause
  const playBtn = document.createElement('button');
  playBtn.className = 'tile-ctrl-btn tile-ctrl-play';
  playBtn.title = 'この動画を再生';
  playBtn.setAttribute('aria-label', 'この動画を再生');
  playBtn.appendChild(makeSvg(ICON_PLAY));

  // Volume wrap (mute + slider)
  const volWrap = document.createElement('div');
  volWrap.className = 'tile-ctrl-vol-wrap';
  const muteBtn = document.createElement('button');
  muteBtn.className = 'tile-ctrl-btn tile-ctrl-mute';
  muteBtn.title = 'ミュート';
  muteBtn.appendChild(makeSvg(ICON_VOL));
  const volSlider = document.createElement('input');
  volSlider.type = 'range';
  volSlider.className = 'tile-ctrl-vol';
  volSlider.min = '0';
  volSlider.max = '100';
  volSlider.step = '1';
  volSlider.value = '50';
  volWrap.appendChild(muteBtn);
  volWrap.appendChild(volSlider);

  // Time display
  const timeDisplay = document.createElement('span');
  timeDisplay.className = 'tile-ctrl-time';
  timeDisplay.textContent = '0:00 / 0:00';

  // Spacer
  const spacer = document.createElement('span');
  spacer.className = 'tile-ctrl-spacer';

  ctrlRow.appendChild(playBtn);
  ctrlRow.appendChild(volWrap);
  ctrlRow.appendChild(timeDisplay);
  ctrlRow.appendChild(spacer);

  bar.appendChild(seekWrap);
  bar.appendChild(ctrlRow);

  // --- Event handlers ---
  let seekDragging = false;

  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const rec = playerStates.get(videoEntry.iframe?.contentWindow);
    const isPlaying = rec && rec.state === 1;
    sendCommand(videoEntry.iframe, isPlaying ? 'pauseVideo' : 'playVideo');
  });

  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const masterVolSlider = getMasterVolumeSlider();
    const currentVol = masterVolSlider ? parseInt(masterVolSlider.value, 10) : 50;
    if (currentVol > 0) {
      // Mute: store current volume, set to 0
      bar._prevVolume = currentVol;
      _setMasterVolume(0);
    } else {
      // Unmute: restore
      _setMasterVolume(bar._prevVolume || 50);
    }
  });

  volSlider.addEventListener('input', (e) => {
    e.stopPropagation();
    const val = parseInt(e.target.value, 10);
    _setMasterVolume(val);
  });

  seekBar.addEventListener('mousedown', () => {
    seekDragging = true;
  });
  seekBar.addEventListener('touchstart', () => {
    seekDragging = true;
  });
  seekBar.addEventListener('input', (e) => {
    e.stopPropagation();
    const time = parseFloat(seekBar.value);
    if (Number.isFinite(time)) {
      timeDisplay.textContent = formatTime(time) + ' / ' + formatTime(parseFloat(seekBar.max) || 0);
    }
  });
  seekBar.addEventListener('change', (e) => {
    e.stopPropagation();
    seekDragging = false;
    const time = parseFloat(seekBar.value);
    if (Number.isFinite(time)) {
      seekAllTo(time);
    }
  });

  videoEntry.tile.appendChild(bar);

  // Store references for update/destroy
  videoEntry.controlBar = {
    el: bar,
    seekBar,
    playBtn,
    muteBtn,
    volSlider,
    timeDisplay,
    seekDragging: () => seekDragging,
    _lastUpdate: 0,
  };
}

/**
 * Update the control bar to reflect current playerState. Called every rAF frame.
 */
export function updateTileControlBar(videoEntry) {
  const cb = videoEntry.controlBar;
  if (!cb) {
    return;
  }
  const win = videoEntry.iframe?.contentWindow;
  if (!win) {
    return;
  }
  const rec = playerStates.get(win);
  if (!rec) {
    return;
  }

  // Skip if playerState hasn't changed
  if (rec.lastUpdate === cb._lastUpdate) {
    return;
  }
  cb._lastUpdate = rec.lastUpdate;

  const isPlaying = rec.state === 1;
  const playIcon = cb.playBtn.querySelector('svg');
  if (playIcon) {
    playIcon.innerHTML = isPlaying ? ICON_PAUSE : ICON_PLAY;
  }
  const playLabel = isPlaying ? 'この動画を一時停止' : 'この動画を再生';
  cb.playBtn.title = playLabel;
  cb.playBtn.setAttribute('aria-label', playLabel);

  if (isLikelyLive(rec)) {
    cb.seekBar.max = '1';
    cb.seekBar.value = '1';
    cb.seekBar.disabled = true;
    cb.timeDisplay.textContent = 'LIVE';
  } else if (!cb.seekDragging()) {
    const duration = rec.duration || 0;
    const time = rec.time || 0;
    cb.seekBar.disabled = false;
    cb.seekBar.max = String(duration);
    cb.seekBar.value = String(time);
    cb.timeDisplay.textContent = formatTime(time) + ' / ' + formatTime(duration);
  }

  // Sync volume slider with master
  const masterVolSlider = getMasterVolumeSlider();
  if (masterVolSlider) {
    const masterVol = parseInt(masterVolSlider.value, 10);
    if (parseInt(cb.volSlider.value, 10) !== masterVol) {
      cb.volSlider.value = String(masterVol);
    }
    // Update mute icon
    const muteIcon = cb.muteBtn.querySelector('svg');
    if (muteIcon) {
      muteIcon.innerHTML = masterVol === 0 ? ICON_MUTED : ICON_VOL;
    }
  }
}

/**
 * Remove the control bar from a tile and clean up references.
 */
export function destroyTileControlBar(videoEntry) {
  if (videoEntry.controlBar) {
    videoEntry.controlBar.el.remove();
    videoEntry.controlBar = null;
  }
}

// --- Internal helpers ---

function seekAllTo(time) {
  for (const v of videos) {
    if (v.iframeLoaded) {
      const offsetSec = (v.offsetMs || 0) / 1000;
      sendCommand(v.iframe, 'seekTo', [time + offsetSec, true]);
    }
  }
}

function _setMasterVolume(val) {
  const masterVolSlider = getMasterVolumeSlider();
  const volumeValEl = document.getElementById('volumeVal');
  if (masterVolSlider) {
    masterVolSlider.value = String(val);
    if (volumeValEl) {
      volumeValEl.textContent = String(val);
    }
    // Dispatch input event to trigger master volume handler
    masterVolSlider.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
