const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseTransfer } = require('../transfer-request.js');
test('validates deep links, YouTube IDs, actions and start times', () => {
  assert.deepEqual(
    parseTransfer('holosync://add?url=https%3A%2F%2Fyoutu.be%2Fabc12345678%3Ft%3D42'),
    { videoId: 'abc12345678', action: 'immediate', startSeconds: 42, targetTileId: null }
  );
  assert.equal(parseTransfer({ videoId: 'abc12345678', action: 'queue' }).action, 'queue');
  assert.throws(() => parseTransfer({ url: 'https://evil.example/watch?v=abc12345678' }));
  assert.throws(() => parseTransfer({ videoId: 'abc12345678', action: 'reserve' }));
  assert.throws(() => parseTransfer({ videoId: 'abc12345678', action: 'queue', t: 42 }));
  assert.throws(() =>
    parseTransfer({ url: 'https://youtube.com/watch?v=abc12345678', videoId: 'xyz12345678' })
  );
});
