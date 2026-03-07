/**
 * @file scripts/debug.js
 * @brief Debug panel setup and rendering.
 */
import { videos, playerStates, suspendedPlayers, SYNC_SETTINGS } from './state.js';
import { getSuspensionReason, pickLeader, getStateLabel } from './sync.js';

const debugToggle = document.getElementById('debugToggle');
const debugPanel = document.getElementById('debugPanel');
const debugClose = document.getElementById('debugClose');
const debugContent = document.getElementById('debugContent');

function setupDebugPanel() {
  debugToggle.addEventListener('click', () => {
    debugPanel.hidden = !debugPanel.hidden;
    if (!debugPanel.hidden) {
      updateDebugPanel();
    }
  });

  debugClose.addEventListener('click', () => {
    debugPanel.hidden = true;
  });
}

function updateDebugPanel() {
  if (debugPanel.hidden) {
    return;
  }

  const now = Date.now();
  let html = '<div class="health-summary">';

  // Calculate overall sync health
  const activeEntries = [];
  const rejoinQueue = [];

  for (const v of videos) {
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
      rejoinQueue.push({ v, rec: record, win, reason: suspension });
    } else {
      if (suspendedPlayers.has(win)) {
        suspendedPlayers.delete(win);
      }
      activeEntries.push({ v, rec: record, win });
    }
  }

  const leaderEntry = pickLeader(activeEntries);
  let healthColor = '#b00020'; // red
  let healthStatus = '未同期';

  if (leaderEntry && activeEntries.length > 0) {
    const totalDrift = activeEntries.reduce((sum, entry) => {
      if (entry.v === leaderEntry.v) {
        return sum;
      }
      const record = entry.rec;
      if (!record || typeof record.time !== 'number') {
        return sum;
      }
      return sum + Math.abs(record.time - leaderEntry.rec.time);
    }, 0);

    const avgDrift = totalDrift / Math.max(1, activeEntries.length - 1);
    const maxDrift = Math.max(
      ...activeEntries.map((entry) => {
        if (entry.v === leaderEntry.v) {
          return 0;
        }
        const record = entry.rec;
        if (!record || typeof record.time !== 'number') {
          return 0;
        }
        return Math.abs(record.time - leaderEntry.rec.time);
      })
    );

    if (maxDrift <= SYNC_SETTINGS.toleranceMs / 1000) {
      healthColor = '#059669'; // green
      healthStatus = '良好';
    } else if (maxDrift <= (SYNC_SETTINGS.toleranceMs / 1000) * 2) {
      healthColor = '#d97706'; // yellow
      healthStatus = '要調整';
    } else {
      healthColor = '#dc2626'; // red
      healthStatus = '同期ずれ';
    }

    html += `<div class="health-indicator" style="color: ${healthColor}">同期状態: ${healthStatus}</div>`;
    html += `<div class="health-metrics">平均ドリフト: ${avgDrift.toFixed(2)}s, 最大ドリフト: ${maxDrift.toFixed(2)}s</div>`;
    html += `<div class="health-metrics">アクティブ動画: ${activeEntries.length}, 待機中: ${rejoinQueue.length}</div>`;
  } else {
    html += `<div class="health-indicator" style="color: ${healthColor}">${healthStatus}</div>`;
    html += '<div class="health-metrics">動画を追加して再生を開始してください</div>';
  }

  html +=
    '</div><table class="debug-table"><thead><tr><th>ID</th><th>Time</th><th>State</th><th>Drift</th><th>Health</th><th>Last Update</th><th>Last Seek</th></tr></thead><tbody>';

  if (leaderEntry) {
    videos.forEach((v) => {
      const rec = playerStates.get(v.iframe.contentWindow) || {};
      const time = rec.time !== undefined ? rec.time.toFixed(2) : 'N/A';
      const stateLabel = rec.state !== undefined ? getStateLabel(rec.state) : 'N/A';
      const lastUpdate = rec.lastUpdate ? new Date(rec.lastUpdate).toLocaleTimeString() : 'N/A';
      const lastSeekAt = rec.lastSeekAt ? new Date(rec.lastSeekAt).toLocaleTimeString() : 'N/A';

      let drift = 'N/A';
      let healthIndicator = '\u{1F534}'; // red circle

      if (leaderEntry.v.id === v.id) {
        drift = '基準';
        healthIndicator = '\u{1F7E2}'; // green circle
      } else if (rec.time !== undefined && leaderEntry.rec.time !== undefined) {
        const driftSec = rec.time - leaderEntry.rec.time;
        drift = `${driftSec >= 0 ? '+' : ''}${driftSec.toFixed(2)}s`;

        const absDrift = Math.abs(driftSec);
        if (absDrift <= SYNC_SETTINGS.toleranceMs / 1000) {
          healthIndicator = '\u{1F7E2}'; // green
        } else if (absDrift <= (SYNC_SETTINGS.toleranceMs / 1000) * 2) {
          healthIndicator = '\u{1F7E1}'; // yellow
        } else {
          healthIndicator = '\u{1F534}'; // red
        }
      }

      html += `<tr><td>${v.id.slice(0, 11)}</td><td>${time}</td><td>${stateLabel}</td><td>${drift}</td><td>${healthIndicator}</td><td>${lastUpdate}</td><td>${lastSeekAt}</td></tr>`;
    });
  }

  html += '</tbody></table>';
  debugContent.innerHTML = html;
}

export function initDebugPanel() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupDebugPanel();
    });
  } else {
    setupDebugPanel();
  }

  // Periodic update
  setInterval(updateDebugPanel, 500);
}
