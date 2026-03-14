/**
 * @file scripts/search.js
 * @brief YouTube search, preset management, and API key functions for HoloSync.
 */
import { storageAdapter } from './storage.js';
import {
  videos,
  playerStates,
  suspendedPlayers,
  hasVideo,
  youtubeApiKey,
  setYoutubeApiKey,
} from './state.js';

// DOM references (preset / API key)
const apiKeyInput = document.getElementById('apiKeyInput');
const deleteApiKeyBtn = document.getElementById('deleteApiKeyBtn');
const checkQuotaBtn = document.getElementById('checkQuotaBtn');
const quotaInfo = document.getElementById('quotaInfo');
const savePresetBtn = document.getElementById('savePresetBtn');
const presetNameInput = document.getElementById('presetNameInput');
const presetList = document.getElementById('presetList');
const gridEl = document.getElementById('grid');

export async function fetchPlaylistItems(playlistId, maxItems = 50) {
  if (!youtubeApiKey) {
    throw new Error('YouTube API キーが未設定です。検索セクションで設定してください。');
  }
  const items = [];
  let pageToken = '';
  while (items.length < maxItems) {
    const remaining = Math.min(50, maxItems - items.length);
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=${remaining}&key=${youtubeApiKey}`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const reason = errBody?.error?.message || `HTTP ${response.status}`;
      throw new Error(`プレイリスト取得失敗: ${reason}`);
    }
    const data = await response.json();
    for (const item of data.items) {
      const videoId = item.contentDetails?.videoId;
      if (videoId) {
        items.push(videoId);
      }
    }
    if (!data.nextPageToken || items.length >= maxItems) {
      break;
    }
    pageToken = data.nextPageToken;
  }
  return items;
}

async function saveCurrentPreset(name) {
  if (!name.trim()) {
    alert('プリセット名を入力してください。');
    return;
  }
  const videoIds = videos.map((v) => v.id);
  if (videoIds.length === 0) {
    alert('保存する動画がありません。');
    return;
  }

  try {
    await storageAdapter.savePreset(name, videoIds);
    presetNameInput.value = '';
    loadPresets();
    alert('プリセットを保存しました。');
  } catch (error) {
    console.error('Save preset failed:', error);
    alert('プリセット保存に失敗しました。');
  }
}

async function loadPresets() {
  try {
    const presets = await storageAdapter.loadPresets();
    presetList.innerHTML = '';
    presets.forEach((preset) => {
      const li = document.createElement('li');
      li.className = 'preset-item';

      const thumbRow = document.createElement('div');
      thumbRow.className = 'preset-thumbs';
      (preset.videoIds || []).slice(0, 3).forEach((vid) => {
        const img = document.createElement('img');
        img.src = `https://img.youtube.com/vi/${vid}/default.jpg`;
        img.alt = '';
        img.className = 'preset-thumb';
        thumbRow.appendChild(img);
      });

      const info = document.createElement('div');
      info.className = 'preset-info';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'preset-name';
      nameSpan.textContent = preset.name;
      const meta = document.createElement('span');
      meta.className = 'preset-meta';
      const count = (preset.videoIds || []).length;
      const dateStr = preset.updatedAt ? new Date(preset.updatedAt).toLocaleDateString() : '';
      meta.textContent = `${count}本 ${dateStr}`;
      info.appendChild(nameSpan);
      info.appendChild(meta);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'preset-delete';
      deleteBtn.textContent = '\u2715';
      deleteBtn.title = 'プリセットを削除';
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`プリセット "${preset.name}" を削除しますか？`)) {
          await deletePreset(preset.name);
        }
      });

      li.appendChild(thumbRow);
      li.appendChild(info);
      li.appendChild(deleteBtn);
      li.addEventListener('click', () => loadPreset(preset.name));
      presetList.appendChild(li);
    });
  } catch (error) {
    console.error('Load presets failed:', error);
  }
}
export { loadPresets };

async function deletePreset(name) {
  try {
    const presets = (await storageAdapter.getItem('presets')) || [];
    const filtered = presets.filter((p) => p.name !== name);
    await storageAdapter.setItem('presets', filtered);
    loadPresets();
  } catch (error) {
    console.error('Delete preset failed:', error);
  }
}

let _createTile;

async function loadPreset(name) {
  try {
    const preset = await storageAdapter.loadPreset(name);
    if (!preset) {
      return;
    }

    // Clear current videos properly
    for (const v of videos) {
      const win = v.iframe?.contentWindow;
      if (win) {
        playerStates.delete(win);
        suspendedPlayers.delete(win);
      }
      v.iframe.src = '';
      v.tile?.remove();
    }
    videos.length = 0;
    gridEl.innerHTML = '';

    // Load preset videos
    preset.videoIds.forEach((id) => {
      if (!hasVideo(id)) {
        _createTile(id);
      }
    });
  } catch (error) {
    console.error('Load preset failed:', error);
  }
}

function updateApiKeyStatus() {
  const hasKey = !!youtubeApiKey;
  deleteApiKeyBtn.disabled = !hasKey;
  checkQuotaBtn.disabled = !hasKey;
  if (hasKey) {
    quotaInfo.textContent = 'クオータ: 「確認」ボタンで確認';
  } else {
    quotaInfo.textContent = 'クオータ: APIキーが設定されていません';
  }
}

async function checkQuota() {
  if (!youtubeApiKey) {
    quotaInfo.textContent = 'クオータ: APIキーが設定されていません';
    return;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=id&q=test&type=video&maxResults=1&key=${youtubeApiKey}`;
    const response = await fetch(url);

    if (response.status === 403) {
      const data = await response.json();
      if (data.error && data.error.errors) {
        const error = data.error.errors[0];
        if (error.reason === 'quotaExceeded') {
          quotaInfo.textContent = 'クオータ: 超過';
          quotaInfo.style.color = '#b00020';
        } else if (error.reason === 'keyInvalid') {
          quotaInfo.textContent = 'クオータ: 無効なAPIキー';
          quotaInfo.style.color = '#b00020';
        } else {
          quotaInfo.textContent = `クオータ: エラー (${error.reason})`;
          quotaInfo.style.color = '#b00020';
        }
      }
    } else if (response.ok) {
      const quotaUsed = response.headers.get('x-quota-used');
      const quotaLimit = response.headers.get('x-quota-limit');
      if (quotaUsed && quotaLimit) {
        quotaInfo.textContent = `クオータ: ${quotaUsed}/${quotaLimit}`;
      } else {
        quotaInfo.textContent = 'クオータ: 利用可能';
      }
      quotaInfo.style.color = '#333';
    } else {
      quotaInfo.textContent = `クオータ: 確認失敗 (${response.status})`;
      quotaInfo.style.color = '#b00020';
    }
  } catch (error) {
    console.error('Quota check failed:', error);
    quotaInfo.textContent = 'クオータ: 確認失敗';
    quotaInfo.style.color = '#b00020';
  }
}

async function initializeApiKey(refreshDescriptions) {
  const storedKey = await storageAdapter.getItem('youtubeApiKey');
  if (storedKey) {
    setYoutubeApiKey(storedKey);
    apiKeyInput.value = storedKey;
  }
  updateApiKeyStatus();
  refreshDescriptions();
}
export { initializeApiKey };

/**
 * Set up search, preset, and API key event listeners.
 * @param {object} deps - External dependencies
 * @param {Function} deps.createTile - Creates a video tile
 * @param {Function} deps.refreshDescriptions - Refreshes all tile descriptions
 */
export function initSearch(deps) {
  _createTile = deps.createTile;

  let apiKeyRefreshTimer;
  apiKeyInput.addEventListener('input', () => {
    setYoutubeApiKey(apiKeyInput.value.trim() || null);
    storageAdapter.setItem('youtubeApiKey', youtubeApiKey);
    updateApiKeyStatus();
    if (apiKeyRefreshTimer) {
      clearTimeout(apiKeyRefreshTimer);
    }
    apiKeyRefreshTimer = setTimeout(() => {
      deps.refreshDescriptions();
    }, 600);
  });

  deleteApiKeyBtn.addEventListener('click', () => {
    if (confirm('APIキーを削除しますか？')) {
      setYoutubeApiKey(null);
      apiKeyInput.value = '';
      storageAdapter.setItem('youtubeApiKey', null);
      updateApiKeyStatus();
      deps.refreshDescriptions();
    }
  });

  checkQuotaBtn.addEventListener('click', async () => {
    await checkQuota();
  });

  savePresetBtn.addEventListener('click', () => {
    const name = presetNameInput.value.trim();
    saveCurrentPreset(name);
  });
}
