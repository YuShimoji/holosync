import { parseFeed } from './rss-parser.js';

export function initFeed({ createTile, hasVideo }) {
  const open = document.getElementById('feedOpen');
  const tray = document.getElementById('feedTray');
  const close = document.getElementById('feedClose');
  const form = document.getElementById('feedForm');
  const input = document.getElementById('feedInput');
  const status = document.getElementById('feedStatus');
  const results = document.getElementById('feedResults');
  const submit = form.querySelector('button');
  let revision = 0;
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
    open.focus();
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
        return;
      }
      if (event.key === 'Escape' && !tray.hidden && !document.fullscreenElement) {
        event.preventDefault();
        event.stopImmediatePropagation();
        hide();
      }
    },
    true
  );
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const current = ++revision;
    results.replaceChildren();
    if (!window.electronRss) {
      status.textContent = 'フィード取得はデスクトップアプリで利用できます。';
      return;
    }
    status.textContent = '取得中…';
    submit.disabled = true;
    try {
      const response = await window.electronRss.fetch(input.value);
      if (current !== revision) {
        return;
      }
      if (!response.ok) {
        throw new Error(response.error);
      }
      const entries = parseFeed(response.xml);
      status.textContent = entries.length
        ? `${entries.length}件の動画`
        : '動画が見つかりませんでした。';
      for (const entry of entries) {
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
        const add = document.createElement('button');
        add.type = 'button';
        add.textContent = hasVideo(entry.videoId) ? '追加済み' : '追加';
        add.disabled = hasVideo(entry.videoId);
        add.setAttribute('aria-label', `${title.textContent}を追加`);
        add.addEventListener('click', () => {
          if (!hasVideo(entry.videoId)) {
            createTile(entry.videoId);
          }
          add.textContent = '追加済み';
          add.disabled = true;
          status.textContent = `${title.textContent}を追加しました。`;
        });
        details.append(title, meta, add);
        card.append(img, details);
        results.append(card);
      }
    } catch (error) {
      if (current === revision) {
        status.textContent = error.message || 'フィードを取得できませんでした。';
      }
    } finally {
      if (current === revision) {
        submit.disabled = false;
      }
    }
  });
}
