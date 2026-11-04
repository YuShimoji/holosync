/* eslint-env node */
// Fetch only fixed YouTube endpoints; renderer input never supplies a network host.
const MAX_BYTES = 8 * 1024 * 1024;

function parseSource(input) {
  if (typeof input !== 'string' || input.length > 2048) {
    throw new Error('入力を確認してください。');
  }
  let value = input.trim();
  if (/^https?:\/\//i.test(value)) {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error('URLを確認してください。');
    }
    if (
      !['www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(url.hostname) ||
      url.protocol !== 'https:'
    ) {
      throw new Error('YouTube の URL を入力してください。');
    }
    const list = url.searchParams.get('list');
    if (list) {
      value = list;
    } else {
      const match = decodeURIComponent(url.pathname).match(
        /^\/(?:channel\/(UC[\w-]{22})|(@[\p{L}\p{N}_.-]{3,30}))\/?$/u
      );
      if (!match) {
        throw new Error('チャンネルまたは再生リストの URL を入力してください。');
      }
      value = match[1] || match[2];
    }
  }
  if (/^UC[\w-]{22}$/.test(value)) {
    return { type: 'channel_id', value };
  }
  if (/^(?:PL|UU|OLAK5uy_)[\w-]{10,100}$/.test(value)) {
    return { type: 'playlist_id', value };
  }
  if (/^@[\p{L}\p{N}_.-]{3,30}$/u.test(value)) {
    return { type: 'handle', value };
  }
  throw new Error('有効なチャンネル ID、@ハンドル、または再生リスト ID を入力してください。');
}

async function readYouTube(url, fetchImpl) {
  const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    throw new Error(`YouTube から取得できませんでした (${response.status})。`);
  }
  const length = Number(response.headers.get('content-length'));
  if (length > MAX_BYTES) {
    throw new Error('応答が大きすぎます。');
  }
  let total = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    total += chunk.length;
    if (total > MAX_BYTES) {
      throw new Error('応答が大きすぎます。');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function fetchFeed(input, fetchImpl = fetch) {
  try {
    const source = parseSource(input);
    if (source.type === 'handle') {
      const html = await readYouTube(
        `https://www.youtube.com/${encodeURIComponent(source.value)}`,
        fetchImpl
      );
      const channel =
        html.match(
          /<link[^>]+rel="canonical"[^>]+href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/
        ) || html.match(/"externalId"\s*:\s*"(UC[\w-]{22})"/);
      if (!channel) {
        throw new Error(
          'ハンドルからチャンネル ID を確認できませんでした。ID を直接入力してください。'
        );
      }
      source.type = 'channel_id';
      source.value = channel[1];
    }
    const url = new URL('https://www.youtube.com/feeds/videos.xml');
    url.searchParams.set(source.type, source.value);
    return { ok: true, xml: await readYouTube(url.toString(), fetchImpl) };
  } catch (error) {
    return { ok: false, error: error.message || 'フィードを取得できませんでした。' };
  }
}
module.exports = { fetchFeed, parseSource };
