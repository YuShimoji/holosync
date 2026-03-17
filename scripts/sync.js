/**
 * @file scripts/sync.js
 * @brief Synchronization engine — drift correction, leader election, loop management.
 */
import {
  videos,
  playerStates,
  suspendedPlayers,
  speedAdjustedPlayers,
  SYNC_SETTINGS,
} from './state.js';
import { sendCommand, requestPlayerSnapshot } from './player.js';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------
let _reconcileInterval = null;
let _onRecovery = null;

export function setSyncCallbacks({ onRecovery } = {}) {
  _onRecovery = onRecovery || null;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Detect if a player record likely represents a live stream.
 * Live streams have very large DVR buffer duration and currentTime near the edge.
 */
export function isLikelyLive(rec) {
  if (!rec || typeof rec.duration !== 'number') {
    return false;
  }
  const edgeGap = rec.duration - (rec.time || 0);
  return rec.duration > 43200 || (rec.duration > 3600 && edgeGap < 30);
}

function getStateLabel(state) {
  switch (state) {
    case -1:
      return '未開始';
    case 0:
      return '終了';
    case 1:
      return '再生中';
    case 2:
      return '一時停止';
    case 3:
      return 'バッファリング';
    case 5:
      return '動画キュー済';
    default:
      return state >= 100 ? '広告中' : `不明(${state})`;
  }
}

function normalizePlayerInfoMessage(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const eventType = payload.event;
  if (
    eventType !== 'infoDelivery' &&
    eventType !== 'initialDelivery' &&
    eventType !== 'onStateChange'
  ) {
    return null;
  }

  const info = payload.info;
  if (info && typeof info === 'object') {
    const normalized = {};
    const currentTime = Number(info.currentTime);
    if (Number.isFinite(currentTime)) {
      normalized.currentTime = currentTime;
    }
    const playerState = Number(info.playerState);
    if (Number.isFinite(playerState)) {
      normalized.playerState = playerState;
    }
    const duration = Number(info.duration);
    if (Number.isFinite(duration) && duration > 0) {
      normalized.duration = duration;
    }
    return Object.keys(normalized).length ? normalized : null;
  }

  const st = Number(info);
  if (eventType === 'onStateChange' && Number.isFinite(st)) {
    return { playerState: st };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Suspension / Leader
// ---------------------------------------------------------------------------

function getSuspensionReason(record, now) {
  if (!record) {
    return 'no-state';
  }
  if (typeof record.state === 'number') {
    if (record.state === 3) {
      return 'buffering';
    }
    if (record.state === 2) {
      return 'paused';
    }
    if (record.state >= 100) {
      return 'ad';
    }
  }
  if (!record.lastUpdate || now - record.lastUpdate > SYNC_SETTINGS.stallThresholdMs) {
    return 'stalled';
  }
  if (typeof record.time !== 'number') {
    return 'no-time';
  }
  return null;
}

function pickLeader(activeEntries) {
  if (SYNC_SETTINGS.leaderMode === 'manual' && SYNC_SETTINGS.leaderId) {
    const manual = activeEntries.find((entry) => entry.v.id === SYNC_SETTINGS.leaderId);
    if (manual && typeof manual.rec?.time === 'number' && manual.rec.state === 1) {
      return manual;
    }
  }

  if (SYNC_SETTINGS.leaderMode === 'longest-playing') {
    // Choose the video that has been playing the longest
    let longestPlaying = null;
    let maxPlayTime = 0;
    for (const entry of activeEntries) {
      if (typeof entry.rec?.time === 'number' && entry.rec.state === 1) {
        const playTime = entry.rec.time;
        if (playTime > maxPlayTime) {
          maxPlayTime = playTime;
          longestPlaying = entry;
        }
      }
    }
    if (longestPlaying) {
      return longestPlaying;
    }
  }

  if (SYNC_SETTINGS.leaderMode === 'least-buffered') {
    // Choose the video with least buffering time (most stable)
    let leastBuffered = null;
    let minBufferTime = Infinity;
    for (const entry of activeEntries) {
      if (typeof entry.rec?.time === 'number' && entry.rec.state === 1) {
        // Calculate buffering ratio (would need buffering time tracking)
        // For now, prefer videos that haven't been suspended recently
        const bufferTime = entry.rec.lastSeekAt ? Date.now() - entry.rec.lastSeekAt : 0;
        if (bufferTime < minBufferTime) {
          minBufferTime = bufferTime;
          leastBuffered = entry;
        }
      }
    }
    if (leastBuffered) {
      return leastBuffered;
    }
  }

  // Default 'first' mode
  for (const entry of activeEntries) {
    if (typeof entry.rec?.time === 'number' && entry.rec.state === 1) {
      return entry;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

function attemptRecovery(video, reason, leaderRecord) {
  if (!SYNC_SETTINGS.retryOnError) {
    return;
  }

  const iframe = video.iframe;
  if (!iframe) {
    return;
  }

  // Reason-based recovery strategy
  switch (reason) {
    case 'buffering':
    case 'stalled':
      if (SYNC_SETTINGS.fallbackMode === 'mute-continue') {
        // Ensure muted and try to continue playback
        sendCommand(iframe, 'mute');
        sendCommand(iframe, 'playVideo');
      } else if (SYNC_SETTINGS.fallbackMode === 'pause-catchup') {
        // Pause and wait for buffer to recover
        sendCommand(iframe, 'pauseVideo');
        // Will be re-synced in next reconcile cycle
      }
      // 'none': do nothing
      break;

    case 'paused':
      // Sync with leader's play state
      if (leaderRecord && leaderRecord.state === 1) {
        sendCommand(iframe, 'playVideo');
      }
      break;

    case 'ad':
      // Ads will resolve on their own, just maintain mute if needed
      if (SYNC_SETTINGS.fallbackMode === 'mute-continue') {
        sendCommand(iframe, 'mute');
      }
      break;

    case 'no-state':
    case 'no-time': {
      // Request fresh snapshot
      const win = iframe.contentWindow;
      if (win) {
        requestPlayerSnapshot(win);
      }
      break;
    }

    default: {
      // Unknown reason, request snapshot
      const w = iframe.contentWindow;
      if (w) {
        requestPlayerSnapshot(w);
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

function reconcileGroup(groupVideos, now) {
  const activeEntries = [];
  const rejoinQueue = [];

  for (const v of groupVideos) {
    if (!v.iframeLoaded) {
      continue;
    }
    const win = v.iframe?.contentWindow;
    if (!win) {
      continue;
    }
    const record = playerStates.get(win);
    const suspension = getSuspensionReason(record, now);
    if (suspension) {
      const previous = suspendedPlayers.get(win);
      if (!previous || previous.reason !== suspension) {
        suspendedPlayers.set(win, { since: now, reason: suspension });
      }
      continue;
    }
    if (suspendedPlayers.has(win)) {
      const previousSuspension = suspendedPlayers.get(win);
      suspendedPlayers.delete(win);
      rejoinQueue.push({
        v,
        rec: record,
        win,
        reason: previousSuspension?.reason || 'recovered',
      });
    }
    activeEntries.push({ v, rec: record, win });
  }

  const leaderEntry = pickLeader(activeEntries);
  if (!leaderEntry) {
    return;
  }
  const leaderRecord = leaderEntry.rec;
  if (!leaderRecord || typeof leaderRecord.time !== 'number') {
    return;
  }
  const softToleranceSec = SYNC_SETTINGS.softToleranceMs / 1000;
  const hardToleranceSec = SYNC_SETTINGS.hardToleranceMs / 1000;
  const leaderPlaying = leaderRecord.state === 1;
  const leaderIsLive = isLikelyLive(leaderRecord);

  for (const entry of activeEntries) {
    if (entry.v === leaderEntry.v) {
      // Reset leader's speed if it was previously adjusted as a follower
      if (speedAdjustedPlayers.has(entry.win)) {
        sendCommand(entry.v.iframe, 'setPlaybackRate', [1]);
        speedAdjustedPlayers.delete(entry.win);
      }
      continue;
    }
    const record = entry.rec;
    if (!record || typeof record.time !== 'number') {
      continue;
    }

    if (leaderIsLive) {
      // Live Edge Sync: skip drift correction for live streams.
      // Live streams report DVR-relative currentTime, so seekTo-based sync
      // would pull followers away from the live edge.
      if (speedAdjustedPlayers.has(entry.win)) {
        sendCommand(entry.v.iframe, 'setPlaybackRate', [1]);
        speedAdjustedPlayers.delete(entry.win);
      }
      // Exception: if follower has a manual offset, apply it via seekTo once.
      // This lets users align live streams with known delay differences.
      const offsetSec = (entry.v.offsetMs || 0) / 1000;
      if (offsetSec !== 0) {
        const expectedTime = leaderRecord.time + offsetSec;
        const drift = record.time - expectedTime;
        if (Math.abs(drift) > hardToleranceSec) {
          sendCommand(entry.v.iframe, 'seekTo', [expectedTime, true]);
        }
      }
    } else {
      // VOD sync: 3-stage drift correction
      // Apply per-video offset
      const offsetSec = (entry.v.offsetMs || 0) / 1000;
      const expectedTime = leaderRecord.time + offsetSec;
      const drift = record.time - expectedTime;
      const absDrift = Math.abs(drift);

      if (absDrift > hardToleranceSec) {
        // Hard correction: seekTo for large drift
        sendCommand(entry.v.iframe, 'seekTo', [expectedTime, true]);
        if (speedAdjustedPlayers.has(entry.win)) {
          sendCommand(entry.v.iframe, 'setPlaybackRate', [1]);
          speedAdjustedPlayers.delete(entry.win);
        }
      } else if (absDrift > softToleranceSec) {
        // Soft correction: adjust playback speed to converge
        const factor = SYNC_SETTINGS.speedCorrectionFactor;
        const rate = drift > 0 ? 1 - factor : 1 + factor;
        sendCommand(entry.v.iframe, 'setPlaybackRate', [rate]);
        speedAdjustedPlayers.add(entry.win);
      } else if (speedAdjustedPlayers.has(entry.win)) {
        // Within soft tolerance: restore normal speed
        sendCommand(entry.v.iframe, 'setPlaybackRate', [1]);
        speedAdjustedPlayers.delete(entry.win);
      }
    }

    const isPlaying = record.state === 1;
    if (leaderPlaying && !isPlaying) {
      sendCommand(entry.v.iframe, 'playVideo');
    } else if (!leaderPlaying && isPlaying) {
      sendCommand(entry.v.iframe, 'pauseVideo');
    }
  }

  // Attempt recovery for suspended players in this group
  for (const v of groupVideos) {
    if (!v.iframeLoaded) {
      continue;
    }
    const win = v.iframe?.contentWindow;
    if (!win) {
      continue;
    }
    const suspended = suspendedPlayers.get(win);
    if (suspended) {
      attemptRecovery(v, suspended.reason, leaderRecord);
    }
  }

  const rejoinToleranceSeconds =
    (SYNC_SETTINGS.toleranceMs + SYNC_SETTINGS.rejoinSyncBufferMs) / 1000;
  for (const entry of rejoinQueue) {
    const record = entry.rec;
    if (!record || typeof record.time !== 'number') {
      continue;
    }
    // Reset speed on rejoin
    if (speedAdjustedPlayers.has(entry.win)) {
      sendCommand(entry.v.iframe, 'setPlaybackRate', [1]);
      speedAdjustedPlayers.delete(entry.win);
    }
    const offsetSec = (entry.v.offsetMs || 0) / 1000;
    const expectedTime = leaderRecord.time + offsetSec;
    const drift = record.time - expectedTime;
    if (Math.abs(drift) > rejoinToleranceSeconds) {
      sendCommand(entry.v.iframe, 'seekTo', [expectedTime, true]);
    }
    if (leaderPlaying) {
      sendCommand(entry.v.iframe, 'playVideo');
    } else if (record.state === 1) {
      sendCommand(entry.v.iframe, 'pauseVideo');
    }
    attemptRecovery(entry.v, entry.reason, leaderRecord);
  }
  if (rejoinQueue.length > 0 && _onRecovery) {
    _onRecovery();
  }
}

function groupAwareReconcile() {
  try {
    if (!videos.length) {
      return;
    }
    const now = Date.now();

    // Group videos by syncGroupId
    const groups = new Map();
    for (const v of videos) {
      const gid = v.syncGroupId;
      if (!gid) {
        continue;
      }
      if (!groups.has(gid)) {
        groups.set(gid, []);
      }
      groups.get(gid).push(v);
    }

    // Reconcile each group independently
    for (const [, groupVideos] of groups) {
      reconcileGroup(groupVideos, now);
    }
  } catch (err) {
    console.warn('groupAwareReconcile failed:', err);
  }
}

function syncAll() {
  if (!videos.length) {
    return;
  }
  const now = Date.now();

  // Group videos by syncGroupId (null = independent, skip)
  const groups = new Map();
  for (const v of videos) {
    const gid = v.syncGroupId;
    if (gid === null || gid === undefined) {
      continue;
    }
    if (!groups.has(gid)) {
      groups.set(gid, []);
    }
    groups.get(gid).push(v);
  }

  for (const [, groupVideos] of groups) {
    const activeEntries = [];
    for (const v of groupVideos) {
      if (!v.iframeLoaded) {
        continue;
      }
      const win = v.iframe?.contentWindow;
      if (!win) {
        continue;
      }
      const rec = playerStates.get(win);
      if (!getSuspensionReason(rec, now)) {
        activeEntries.push({ v, rec, win });
      }
    }
    const leader = pickLeader(activeEntries);
    if (!leader || typeof leader.rec?.time !== 'number') {
      continue;
    }
    const liveMode = isLikelyLive(leader.rec);
    for (const entry of activeEntries) {
      if (entry.v === leader.v) {
        continue;
      }
      const offsetSec = (entry.v.offsetMs || 0) / 1000;
      if (!liveMode || offsetSec !== 0) {
        sendCommand(entry.v.iframe, 'seekTo', [leader.rec.time + offsetSec, true]);
      }
      if (leader.rec.state === 1) {
        sendCommand(entry.v.iframe, 'playVideo');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Loop management
// ---------------------------------------------------------------------------

function startSyncLoop() {
  stopSyncLoop();
  _reconcileInterval = setInterval(groupAwareReconcile, SYNC_SETTINGS.probeIntervalMs);
}

function stopSyncLoop() {
  if (_reconcileInterval !== null) {
    clearInterval(_reconcileInterval);
    _reconcileInterval = null;
  }
}

function restartSyncLoop() {
  startSyncLoop();
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  getStateLabel,
  normalizePlayerInfoMessage,
  getSuspensionReason,
  pickLeader,
  attemptRecovery,
  reconcileGroup,
  groupAwareReconcile,
  syncAll,
  startSyncLoop,
  stopSyncLoop,
  restartSyncLoop,
};
