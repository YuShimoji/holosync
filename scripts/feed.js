import { parseFeed } from './rss-parser.js';
import { rankFeed } from './feed-engine.js';
import { storageAdapter } from './storage.js';

const blankProfile = (name = 'マイフィード') => ({
  id: crypto.randomUUID(),
  name,
  sources: [],
  includeKeywords: [],
  excludeKeywords: [],
  excludeChannels: [],
  channelWeights: {},
  freshness: 40,
  history: {},
});
const words = (value) => [
  ...new Set(
    value
      .split(/[,、\n]/)
      .map((v) => v.trim())
      .filter(Boolean)
  ),
];

export function initFeed({ createTile, hasVideo }) {
  const el = (id) => document.getElementById(id);
  const open = el('feedOpen'),
    tray = el('feedTray'),
    close = el('feedClose');
  const form = el('feedForm'),
    input = el('feedInput'),
    status = el('feedStatus'),
    results = el('feedResults');
  const selector = el('feedProfile'),
    columns = el('feedColumns'),
    settings = el('feedSettings');
  const edit = el('feedEditToggle');
  let profiles = [],
    activeId,
    revision = 0,
    entries = [],
    saving = Promise.resolve();
  const playing = new Map();
  const owner = new Map();
  const current = () => profiles.find((p) => p.id === activeId);
  const save = () => {
    const snapshot = JSON.parse(JSON.stringify({ profiles, activeId, columns: columns.value }));
    saving = saving.then(() => storageAdapter.setItem('feedProfiles', snapshot));
    return saving;
  };
  function drawProfiles() {
    selector.replaceChildren();
    for (const profile of profiles) {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.name;
      selector.append(option);
    }
    selector.value = activeId;
  }
  function fillSettings() {
    const p = current();
    el('profileName').value = p.name;
    el('profileSources').value = p.sources.join('\n');
    el('profileInclude').value = p.includeKeywords.join(', ');
    el('profileExclude').value = p.excludeKeywords.join(', ');
    el('profileExcludeChannels').value = p.excludeChannels.join(', ');
    el('profileWeights').setCustomValidity('');
    el('profileWeights').value = Object.entries(p.channelWeights)
      .map(([id, weight]) => `${id}=${weight}`)
      .join('\n');
    el('profileFreshness').value = p.freshness;
    el('feedDeleteProfile').disabled = profiles.length <= 1;
  }
  function setColumns() {
    results.style.setProperty(
      '--feed-columns',
      columns.value === 'auto'
        ? 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))'
        : `repeat(${Number(columns.value)}, minmax(0, 1fr))`
    );
  }
  function show() {
    tray.hidden = false;
    document.body.classList.add('feed-open');
    open.setAttribute('aria-expanded', 'true');
    input.focus();
  }
  function hide() {
    tray.hidden = true;
    document.body.classList.remove('feed-open');
    open.setAttribute('aria-expanded', 'false');
    window.setTimeout(() => {
      if (tray.hidden) {
        const target = open.getClientRects().length ? open : document.getElementById('sidebarOpen');
        target?.focus();
      }
    }, 300);
  }
  function render() {
    results.replaceChildren();
    for (const entry of rankFeed(entries, current())) {
      const card = document.createElement('article');
      card.className = 'feed-card';
      const img = document.createElement('img');
      img.src = entry.thumbnail;
      img.alt = '';
      img.loading = 'lazy';
      const details = document.createElement('div');
      details.className = 'feed-card-details';
      const title = document.createElement('strong');
      title.textContent = entry.title || entry.videoId;
      const meta = document.createElement('p');
      const date = new Date(entry.published);
      meta.textContent = [
        entry.channelTitle,
        Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('ja-JP'),
      ]
        .filter(Boolean)
        .join(' · ');
      const reason = document.createElement('p');
      reason.className = 'feed-reason';
      reason.textContent = entry.reasons.join(' · ');
      const add = document.createElement('button');
      add.type = 'button';
      add.textContent = hasVideo(entry.videoId) ? '追加済み' : '追加';
      add.disabled = hasVideo(entry.videoId);
      add.setAttribute('aria-label', `${title.textContent}を追加`);
      add.addEventListener('click', () => {
        if (!hasVideo(entry.videoId)) {
          owner.set(entry.videoId, { profileId: activeId, channelId: entry.channelId });
          createTile(entry.videoId);
        }
        add.textContent = '追加済み';
        add.disabled = true;
        status.textContent = `${title.textContent}を追加しました。`;
      });
      details.append(title, meta, reason, add);
      card.append(img, details);
      results.append(card);
    }
  }
  async function refresh(extra = '') {
    const p = current();
    if (!p) {
      return;
    }
    const thisRevision = ++revision;
    const profileId = p.id;
    const sources = [...new Set([...p.sources, ...(extra ? [extra] : [])])];
    form.querySelector('button').disabled = false;
    el('feedRefresh').disabled = false;
    if (!sources.length) {
      entries = [];
      render();
      status.textContent = 'チャンネルや再生リストを入力してください。';
      return;
    }
    if (!window.electronRss) {
      status.textContent = 'フィード取得はデスクトップアプリで利用できます。';
      return;
    }
    status.textContent = '取得中…';
    form.querySelector('button').disabled = true;
    el('feedRefresh').disabled = true;
    const responses = await Promise.all(
      sources.map(async (source) => {
        try {
          const response = await window.electronRss.fetch(source);
          if (!response.ok) {
            throw new Error(response.error);
          }
          return { source, entries: parseFeed(response.xml) };
        } catch (error) {
          return { source, error: error.message || '取得失敗' };
        }
      })
    );
    if (thisRevision !== revision || activeId !== profileId) {
      return;
    }
    form.querySelector('button').disabled = false;
    el('feedRefresh').disabled = false;
    const good = responses.filter((r) => !r.error),
      failed = responses.filter((r) => r.error);
    if (extra && good.some((r) => r.source === extra) && !p.sources.includes(extra)) {
      p.sources.push(extra);
      input.value = '';
      fillSettings();
      await save();
      if (thisRevision !== revision || activeId !== profileId) {
        return;
      }
    }
    entries = good.flatMap((r) => r.entries);
    render();
    const count = results.children.length;
    status.textContent = failed.length
      ? `${count}件表示。取得失敗: ${failed.map((f) => `${f.source}: ${f.error}`).join(' / ')}`
      : count
        ? `${count}件の動画`
        : '動画が見つかりませんでした。';
  }
  open.addEventListener('click', () => (tray.hidden ? show() : hide()));
  close.addEventListener('click', hide);
  document.addEventListener(
    'keydown',
    (event) => {
      const editable = event.target.closest('input, textarea, select, [contenteditable="true"]');
      if (
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') ||
        (event.key === '/' && !editable)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        show();
      } else if (event.key === 'Escape' && !tray.hidden && !document.fullscreenElement) {
        event.preventDefault();
        event.stopImmediatePropagation();
        hide();
      }
    },
    true
  );
  columns.addEventListener('change', () => {
    setColumns();
    save();
  });
  selector.addEventListener('change', () => {
    activeId = selector.value;
    entries = [];
    fillSettings();
    save();
    refresh();
  });
  el('feedNewProfile').addEventListener('click', () => {
    const p = blankProfile('新しいプロファイル');
    profiles.push(p);
    activeId = p.id;
    revision++;
    form.querySelector('button').disabled = false;
    el('feedRefresh').disabled = false;
    status.textContent = 'チャンネルや再生リストを入力してください。';
    entries = [];
    drawProfiles();
    fillSettings();
    render();
    settings.hidden = false;
    edit.setAttribute('aria-expanded', 'true');
    el('profileName').focus();
    save();
  });
  edit.addEventListener('click', () => {
    settings.hidden = !settings.hidden;
    edit.setAttribute('aria-expanded', String(!settings.hidden));
    if (!settings.hidden) {
      fillSettings();
    }
  });
  el('profileWeights').addEventListener('input', () => el('profileWeights').setCustomValidity(''));
  settings.addEventListener('submit', (event) => {
    event.preventDefault();
    const p = current();
    const weightRows = el('profileWeights')
      .value.split('\n')
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => row.split('=').map((part) => part.trim()));
    if (
      weightRows.some(
        ([id, value, extra]) =>
          !/^UC[\w-]{22}$/.test(id) ||
          !value ||
          extra !== undefined ||
          !Number.isFinite(Number(value)) ||
          Number(value) < 0 ||
          Number(value) > 5
      )
    ) {
      el('profileWeights').setCustomValidity('チャンネルID=0〜5の数値を1行ずつ入力してください。');
      el('profileWeights').reportValidity();
      return;
    }
    p.name = el('profileName').value.trim();
    if (!p.name) {
      return;
    }
    p.sources = words(el('profileSources').value);
    p.includeKeywords = words(el('profileInclude').value);
    p.excludeKeywords = words(el('profileExclude').value);
    p.excludeChannels = words(el('profileExcludeChannels').value);
    p.channelWeights = Object.fromEntries(weightRows.map(([id, value]) => [id, Number(value)]));
    p.freshness = Number(el('profileFreshness').value);
    drawProfiles();
    settings.hidden = true;
    edit.setAttribute('aria-expanded', 'false');
    save();
    refresh();
  });
  el('feedDeleteProfile').addEventListener('click', () => {
    if (profiles.length <= 1 || !window.confirm(`「${current().name}」を削除しますか？`)) {
      return;
    }
    profiles = profiles.filter((p) => p.id !== activeId);
    activeId = profiles[0].id;
    entries = [];
    drawProfiles();
    fillSettings();
    save();
    refresh();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const source = input.value.trim();
    if (source) {
      refresh(source);
    } else {
      refresh();
    }
  });
  el('feedRefresh').addEventListener('click', () => refresh());
  el('copyTransferBookmark').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(
        "javascript:location.href='holosync://add?url='+encodeURIComponent(location.href)"
      );
      status.textContent = 'コピーしました。ブラウザのブックマークURLに貼り付けてください。';
    } catch {
      status.textContent = 'コピーできませんでした。ブックマークレットは仕様書に記載しています。';
    }
  });
  document.addEventListener('holosync:playback', (event) => {
    const { videoId, tileId, state } = event.detail;
    const now = Date.now();
    const info = owner.get(videoId);
    if (!info) {
      return;
    }
    const tracking = playing.get(tileId);
    if (state === 1 && !tracking) {
      playing.set(tileId, { videoId, since: now });
    } else if (tracking && (state !== 1 || tracking.videoId !== videoId)) {
      playing.delete(tileId);
    }
    if (state === 1 && tracking?.videoId === videoId && now - tracking.since >= 10000) {
      const p = profiles.find((item) => item.id === info.profileId);
      if (p && info.channelId) {
        p.history[info.channelId] = (p.history[info.channelId] || 0) + 1;
        save();
      }
      playing.delete(tileId);
      owner.delete(videoId);
    }
  });
  (async () => {
    const stored = await storageAdapter.getItem('feedProfiles');
    profiles =
      Array.isArray(stored?.profiles) && stored.profiles.length
        ? stored.profiles.map((p) => ({
            ...blankProfile(),
            ...p,
            sources: Array.isArray(p.sources) ? p.sources : [],
            includeKeywords: Array.isArray(p.includeKeywords) ? p.includeKeywords : [],
            excludeKeywords: Array.isArray(p.excludeKeywords) ? p.excludeKeywords : [],
            excludeChannels: Array.isArray(p.excludeChannels) ? p.excludeChannels : [],
            channelWeights: p.channelWeights || {},
            history: p.history || {},
          }))
        : [blankProfile()];
    activeId = profiles.some((p) => p.id === stored?.activeId) ? stored.activeId : profiles[0].id;
    columns.value = ['auto', '1', '2', '3', '4', '5', '6'].includes(stored?.columns)
      ? stored.columns
      : 'auto';
    drawProfiles();
    fillSettings();
    setColumns();
    if (current().sources.length) {
      refresh();
    }
  })();
}
