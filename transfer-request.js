/* eslint-env node */
function parseTransfer(input) {
  let payload = input;
  if (typeof input === 'string') {
    const uri = new URL(input);
    if (uri.protocol !== 'holosync:' || uri.hostname !== 'add') {
      throw new Error('転送URLが正しくありません。');
    }
    payload = Object.fromEntries(uri.searchParams);
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('転送データが正しくありません。');
  }
  let videoId = payload.videoId;
  let fromUrl = null;
  if (payload.url) {
    const url = new URL(payload.url);
    if (!['https:', 'http:'].includes(url.protocol)) {
      throw new Error('YouTube URLが必要です。');
    }
    if (url.hostname === 'youtu.be') {
      fromUrl = url.pathname.slice(1).split('/')[0];
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      fromUrl =
        url.searchParams.get('v') ||
        url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1];
    } else {
      throw new Error('YouTube URLが必要です。');
    }
    const t = url.searchParams.get('t') || url.searchParams.get('start');
    if (payload.t === undefined && payload.startSeconds === undefined && t && /^\d+$/.test(t)) {
      payload.startSeconds = Number(t);
    }
  }
  if (videoId && fromUrl && videoId !== fromUrl) {
    throw new Error('動画IDが一致しません。');
  }
  videoId = fromUrl || videoId;
  if (!/^[\w-]{11}$/.test(videoId || '')) {
    throw new Error('動画IDが正しくありません。');
  }
  const action = payload.action || 'immediate';
  if (!['immediate', 'queue'].includes(action)) {
    throw new Error('この転送操作はまだ利用できません。');
  }
  const seconds = Number(payload.startSeconds ?? payload.t ?? 0);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 604800) {
    throw new Error('開始位置が正しくありません。');
  }
  if (
    payload.targetTileId !== null &&
    payload.targetTileId !== undefined &&
    (typeof payload.targetTileId !== 'string' || payload.targetTileId.length > 100)
  ) {
    throw new Error('対象が正しくありません。');
  }
  if (action === 'queue' && seconds !== 0) {
    throw new Error('キュー追加時の開始位置は指定できません。');
  }
  return { videoId, action, startSeconds: seconds, targetTileId: payload.targetTileId || null };
}
module.exports = { parseTransfer };
