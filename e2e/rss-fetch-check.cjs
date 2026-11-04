const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchFeed, parseSource } = require('../rss-fetch.js');
test('restricts input and constructs YouTube-only requests', async () => {
  assert.throws(() => parseSource('https://evil.example/?list=PL1234567890'));
  assert.throws(() =>
    parseSource('https://www.youtube.com.evil.example/channel/UC1234567890123456789012')
  );
  const urls = [];
  const stub = async (url, options) => {
    urls.push(url);
    assert.equal(options.redirect, 'error');
    return new Response('<feed/>');
  };
  const result = await fetchFeed('https://www.youtube.com/channel/UC1234567890123456789012', stub);
  assert.equal(result.ok, true);
  assert.equal(
    urls[0],
    'https://www.youtube.com/feeds/videos.xml?channel_id=UC1234567890123456789012'
  );
  const list = await fetchFeed('PL123456789012', stub);
  assert.equal(list.ok, true);
  assert.match(urls[1], /playlist_id=PL123456789012/);
  assert.equal((await fetchFeed('https://example.com', stub)).ok, false);
  assert.equal(urls.length, 2);
});
test('rejects oversized and failed responses', async () => {
  const oversized = async () => new Response('x', { headers: { 'content-length': '9000000' } });
  assert.equal((await fetchFeed('UC1234567890123456789012', oversized)).ok, false);
  const failed = async () => new Response('', { status: 404 });
  assert.match((await fetchFeed('UC1234567890123456789012', failed)).error, /404/);
});
