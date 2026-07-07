/**
 * @file scripts/live-probe.js
 * @brief Local SP-023 playback reliability probe and readback helpers.
 */
import { videos, playerStates, suspendedPlayers, SYNC_SETTINGS } from './state.js';

const PROBE_VERSION = 'sp-023-live-reliability-probe-2026-07-07';
const MAX_TIMELINE_EVENTS = 500;
const RESERVED_EVENT_KEYS = new Set(['seq', 'at', 'ms', 'type']);

const PLAYER_STATE_LABELS = new Map([
  [-1, 'unstarted'],
  [0, 'ended'],
  [1, 'playing'],
  [2, 'paused'],
  [3, 'buffering'],
  [5, 'cued'],
]);

const probeState = {
  enabled: false,
  runId: null,
  source: 'manual',
  startedAt: null,
  sequence: 0,
  timeline: [],
};

function createRunId() {
  return `sp023-${new Date().toISOString().replace(/[:.]/g, '-')}`;
}

function getPlayerStateLabel(value) {
  if (typeof value !== 'number') {
    return 'unknown';
  }
  return PLAYER_STATE_LABELS.get(value) || `state-${value}`;
}

function toSerializable(value, depth = 0) {
  if (value === null || value === undefined) {
    return value;
  }
  if (['string', 'number', 'boolean'].includes(typeof value)) {
    return value;
  }
  if (Array.isArray(value)) {
    if (depth > 2) {
      return '[array]';
    }
    return value.slice(0, 20).map((item) => toSerializable(item, depth + 1));
  }
  if (typeof value === 'object') {
    if (depth > 2) {
      return '[object]';
    }
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'function') {
        continue;
      }
      if (key === 'iframe' || key === 'tile' || key === 'contentWindow') {
        continue;
      }
      output[key] = toSerializable(item, depth + 1);
    }
    return output;
  }
  return String(value);
}

function sanitizeDetail(detail = {}) {
  const serializable = toSerializable(detail) || {};
  for (const key of RESERVED_EVENT_KEYS) {
    delete serializable[key];
  }
  return serializable;
}

function appendEvent(type, detail = {}) {
  if (!probeState.enabled) {
    return null;
  }
  const now = Date.now();
  const event = {
    seq: ++probeState.sequence,
    at: new Date(now).toISOString(),
    ms: probeState.startedAt ? now - probeState.startedAt : 0,
    type,
    ...sanitizeDetail(detail),
  };
  probeState.timeline.push(event);
  if (probeState.timeline.length > MAX_TIMELINE_EVENTS) {
    probeState.timeline.splice(0, probeState.timeline.length - MAX_TIMELINE_EVENTS);
  }
  return event;
}

function getRecordForVideo(video) {
  const win = video.iframe?.contentWindow;
  return win ? playerStates.get(win) || null : null;
}

function derivePlaybackStatus(record, suspension, lastUpdateAgeMs) {
  if (suspension?.reason) {
    return `suspended:${suspension.reason}`;
  }
  if (!record) {
    return 'no-state';
  }
  if (record.errorCode !== undefined && record.errorCode !== null) {
    return 'error';
  }
  if (lastUpdateAgeMs !== null && lastUpdateAgeMs > SYNC_SETTINGS.stallThresholdMs) {
    return 'stale';
  }
  if (typeof record.state === 'number') {
    return getPlayerStateLabel(record.state);
  }
  if (typeof record.time === 'number') {
    return 'time-only';
  }
  return 'unknown';
}

function captureVideoStates() {
  const now = Date.now();
  return videos.map((video, index) => {
    const win = video.iframe?.contentWindow;
    const record = getRecordForVideo(video);
    const suspension = win ? suspendedPlayers.get(win) : null;
    const lastUpdateAgeMs = record?.lastUpdate ? now - record.lastUpdate : null;
    const stateValue = typeof record?.state === 'number' ? record.state : null;
    const timeValue = typeof record?.time === 'number' ? record.time : null;
    const durationValue = typeof record?.duration === 'number' ? record.duration : null;
    return {
      index,
      tileId: video.id,
      iframeLoaded: Boolean(video.iframeLoaded),
      syncGroupId: video.syncGroupId ?? null,
      playerState: stateValue,
      playerStateLabel: getPlayerStateLabel(stateValue),
      currentTime: timeValue,
      duration: durationValue,
      errorCode: record?.errorCode ?? null,
      lastUpdateAgeMs,
      suspendedReason: suspension?.reason || null,
      suspendedForMs: suspension?.since ? now - suspension.since : null,
      status: derivePlaybackStatus(record, suspension, lastUpdateAgeMs),
    };
  });
}

function buildTotals(videoStates) {
  const totals = {
    tiles: videoStates.length,
    iframeLoaded: 0,
    playing: 0,
    paused: 0,
    buffering: 0,
    stale: 0,
    error: 0,
    noState: 0,
    suspended: 0,
  };
  for (const video of videoStates) {
    if (video.iframeLoaded) {
      totals.iframeLoaded++;
    }
    if (video.status === 'playing') {
      totals.playing++;
    } else if (video.status === 'paused') {
      totals.paused++;
    } else if (video.status === 'buffering') {
      totals.buffering++;
    } else if (video.status === 'stale') {
      totals.stale++;
    } else if (video.status === 'error') {
      totals.error++;
    } else if (video.status === 'no-state') {
      totals.noState++;
    } else if (video.status.startsWith('suspended:')) {
      totals.suspended++;
    }
  }
  return totals;
}

function getProbePageInfo() {
  if (typeof window === 'undefined') {
    return {};
  }
  return {
    href: window.location.href,
    visibilityState: document.visibilityState,
    userAgent: navigator.userAgent,
  };
}

function shouldAutoStartFromUrl() {
  if (typeof window === 'undefined') {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('sp023Probe') === '1' ||
    params.get('liveProbe') === '1' ||
    params.get('probe') === 'live'
  );
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getTileIdForIframe(iframe) {
  return videos.find((video) => video.iframe === iframe)?.id || null;
}

export function isLiveProbeEnabled() {
  return probeState.enabled;
}

export function startLiveProbe(options = {}) {
  const now = Date.now();
  probeState.enabled = true;
  probeState.runId = options.runId || createRunId();
  probeState.source = options.source || 'manual';
  probeState.startedAt = now;
  probeState.sequence = 0;
  probeState.timeline = [];
  appendEvent('probe-start', {
    source: probeState.source,
    note: options.note || null,
    page: getProbePageInfo(),
  });
  return getLiveProbeSnapshot();
}

export function stopLiveProbe(reason = 'manual-stop') {
  appendEvent('probe-stop', { reason });
  probeState.enabled = false;
  return getLiveProbeSnapshot();
}

export function clearLiveProbe() {
  probeState.sequence = 0;
  probeState.timeline = [];
  if (probeState.enabled) {
    appendEvent('probe-clear');
  }
  return getLiveProbeSnapshot();
}

export function recordProbeEvent(type, detail = {}) {
  return appendEvent(type, detail);
}

export function recordProbeAction(action, detail = {}) {
  const videoStates = captureVideoStates();
  return appendEvent('action', {
    action,
    ...detail,
    totals: buildTotals(videoStates),
  });
}

export function getLiveProbeSnapshot() {
  const videoStates = captureVideoStates();
  return {
    artifact: 'sp-023-live-reliability-probe',
    version: PROBE_VERSION,
    runId: probeState.runId,
    enabled: probeState.enabled,
    source: probeState.source,
    startedAt: probeState.startedAt ? new Date(probeState.startedAt).toISOString() : null,
    exportedAt: new Date().toISOString(),
    maxTimelineEvents: MAX_TIMELINE_EVENTS,
    page: getProbePageInfo(),
    totals: buildTotals(videoStates),
    videos: videoStates,
    timeline: probeState.timeline.map((event) => ({ ...event })),
  };
}

export function renderLiveProbeDebugHtml(snapshot = getLiveProbeSnapshot()) {
  const statusText = snapshot.enabled ? `ON ${snapshot.runId}` : 'OFF';
  const totals = snapshot.totals;
  const latestRows = snapshot.timeline
    .slice(-12)
    .reverse()
    .map((event) => {
      const target = event.tileId || event.action || event.func || '';
      const state = event.playerStateLabel || event.status || event.reason || '';
      return `<tr><td>${event.ms}</td><td>${escapeHtml(event.type)}</td><td>${escapeHtml(target)}</td><td>${escapeHtml(state)}</td><td>${escapeHtml(event.func || event.note || '')}</td></tr>`;
    })
    .join('');
  const emptyRow = '<tr><td colspan="5">No probe events yet.</td></tr>';

  return `
    <section class="probe-summary" data-probe-enabled="${snapshot.enabled ? 'true' : 'false'}">
      <div class="probe-heading">Live Probe: ${escapeHtml(statusText)}</div>
      <div class="probe-metrics">
        tiles ${totals.tiles} / loaded ${totals.iframeLoaded} / playing ${totals.playing} / paused ${totals.paused} / stale ${totals.stale} / errors ${totals.error}
      </div>
      <table class="debug-table probe-table">
        <thead><tr><th>ms</th><th>event</th><th>target</th><th>state</th><th>detail</th></tr></thead>
        <tbody>${latestRows || emptyRow}</tbody>
      </table>
    </section>
  `;
}

export function initLiveProbe() {
  if (typeof window === 'undefined') {
    return;
  }
  window.holosyncProbe = {
    start: startLiveProbe,
    stop: stopLiveProbe,
    clear: clearLiveProbe,
    mark: (label, detail = {}) => recordProbeAction('mark', { label, ...detail }),
    snapshot: getLiveProbeSnapshot,
    exportJson: () => JSON.stringify(getLiveProbeSnapshot(), null, 2),
    download: (filename = 'sp-023-live-reliability-probe.json') => {
      const blob = new Blob([JSON.stringify(getLiveProbeSnapshot(), null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
  };
  if (shouldAutoStartFromUrl()) {
    startLiveProbe({ source: 'url-param' });
  }
}
