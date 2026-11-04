# SECURITY: postMessage Hardening

## Summary

HoloSyncは、YouTube IFrame APIとの通信にpostMessageを使用している。セキュリティリスクを最小化するため、送信側と受信側の両方で厳格な検証を実装している。

- 送信側: 8コマンドのホワイトリスト、対象引数の検証、YouTube iframeに対応するターゲットorigin
- 受信側: origin検証、イベントタイプホワイトリスト、数値データの検証
- iframe作成時のセキュリティ属性設定

## 1. 送信側セキュリティ (scripts/player.js)

### 1.1 許可コマンドのホワイトリスト

**定義箇所**: `scripts/state.js` の `ALLOWED_COMMANDS`

```javascript
ALLOWED_ORIGIN = 'https://www.youtube.com'
ALLOWED_COMMANDS = new Set([
  'playVideo',
  'pauseVideo',
  'mute',
  'unMute',
  'setVolume',
  'seekTo',
  'setPlaybackRate',
  'loadVideoById',
])
```

8つのYouTube IFrame APIコマンドを許可する。ホワイトリストにないコマンドは`sendCommand()`で無視される。

### 1.2 引数のサニタイズ

**実装箇所**: `scripts/player.js` の `sanitizeArgs()` 関数

各コマンドに応じて引数を検証・クランプする。

| コマンド           | バリデーション                                  | デフォルト値 |
|--------------------|------------------------------------------------|--------------|
| `setVolume`        | `[0, 100]` にクランプ、非数値は50にフォールバック | 50           |
| `seekTo`           | 負数は0にクランプ、非数値は0、第2引数に`true`を固定 | 0            |
| `setPlaybackRate`  | `[0.25, 2.0]` の範囲外は1.0にフォールバック      | 1.0          |
| `loadVideoById`    | 11文字のYouTube動画ID形式に一致する場合のみ通す | 不正時は空配列 |
| その他             | 空配列を返す                                   | `[]`         |

```javascript
function sanitizeArgs(func, args) {
  if (!Array.isArray(args)) {
    return [];
  }
  if (func === 'setVolume') {
    const v = parseInt(args[0], 10);
    if (Number.isFinite(v)) {
      const clamped = Math.max(0, Math.min(100, v));
      return [clamped];
    }
    return [50];
  }
  if (func === 'seekTo') {
    const t = Number(args?.[0]);
    const seconds = Number.isFinite(t) ? Math.max(0, t) : 0;
    return [seconds, true];
  }
  if (func === 'setPlaybackRate') {
    const r = parseFloat(args[0]);
    if (Number.isFinite(r) && r >= 0.25 && r <= 2) {
      return [r];
    }
    return [1];
  }
  if (func === 'loadVideoById') {
    const id = String(args?.[0] || '');
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? [id] : [];
  }
  return [];
}
```

### 1.3 postMessage送信

**実装箇所**: `scripts/player.js` の `sendCommand()` 関数

1. コマンドがホワイトリストに含まれるか検証
2. `sanitizeArgs()` で引数をサニタイズ
3. iframe URLに応じたターゲットorigin (`https://www.youtube.com` または `https://www.youtube-nocookie.com`) を選んでpostMessage

```javascript
export function sendCommand(iframe, func, args = []) {
  if (!ALLOWED_COMMANDS.has(func)) {
    return;
  }
  const win = iframe.contentWindow;
  if (!win) {
    return;
  }
  const safeArgs = sanitizeArgs(func, args);
  const message = JSON.stringify({ event: 'command', func, args: safeArgs });
  win.postMessage(message, getIframeOrigin(iframe));
  // ...
}
```

### 1.4 iframe作成時のセキュリティ属性

**実装箇所**: `scripts/player.js` の `createTile()` 関数

YouTube iframeを作成する際、以下のセキュリティ属性を設定する。

```javascript
const iframe = document.createElement('iframe');
iframe.src = buildEmbedUrl(videoId, { mute: 0 });
iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
iframe.loading = 'lazy';
iframe.setAttribute('referrerpolicy', 'origin');
iframe.setAttribute('allowfullscreen', '');
iframe.title = `YouTube video ${videoId}`;
```

- `loading=lazy`: パフォーマンス最適化（遅延読み込み）
- `referrerpolicy=origin`: Refererヘッダーをoriginのみに制限
- `allow`: 必要最小限の機能のみ許可

## 2. 受信側セキュリティ (scripts/main.js + scripts/sync.js)

### 2.1 origin検証

**実装箇所**: `scripts/main.js` の `window.addEventListener('message', ...)`

受信したpostMessageのoriginを検証し、`https://www.youtube.com` と `https://www.youtube-nocookie.com` 以外のメッセージは無視する。

```javascript
window.addEventListener('message', (event) => {
  try {
    if (event.origin !== ALLOWED_ORIGIN && event.origin !== ALLOWED_ORIGIN_NOCOOKIE) {
      return;
    }
    // ...
  } catch (_) {
    // ignore
  }
});
```

### 2.2 イベントタイプのホワイトリスト

**実装箇所**: `scripts/sync.js` の `normalizePlayerInfoMessage()` 関数

YouTube IFrame APIから受信するイベントタイプを4種類に限定。

- `infoDelivery`: 定期的な状態更新
- `initialDelivery`: 初回状態配信
- `onStateChange`: 再生状態変更
- `onError`: エラーコード

```javascript
function normalizePlayerInfoMessage(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const eventType = payload.event;
  if (
    eventType !== 'infoDelivery' &&
    eventType !== 'initialDelivery' &&
    eventType !== 'onStateChange' &&
    eventType !== 'onError'
  ) {
    return null;
  }
  // ...
}
```

### 2.3 データの数値検証

**実装箇所**: `scripts/sync.js` の `normalizePlayerInfoMessage()` 関数

抽出したデータが数値として有効かを検証し、不正な値は破棄する。

```javascript
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
  return Object.keys(normalized).length ? normalized : null;
}

const st = Number(info);
if (eventType === 'onStateChange' && Number.isFinite(st)) {
  return { playerState: st };
}
return null;
```

検証対象のフィールド:

- `currentTime`: 再生位置（秒）
- `playerState`: 再生状態（-1=未開始, 0=終了, 1=再生中, 2=停止, 3=バッファリング, 5=頭出し済み）
- `duration`: 正数の動画長（有限数の場合）
- `errorCode`: 有限数の場合のエラーコード。`onError`の非数値情報は`unknown`として扱う。

## 3. セキュリティ保証

### 3.1 送信側

- ホワイトリストにない任意のコマンドを送信できない
- 音量・シーク位置・再生速度・動画IDは、それぞれ実装された範囲／形式に合わせて処理される。他の許可コマンドの引数は空配列になる。
- ターゲットoriginは選択中のYouTube iframe originに限定される（通常またはno-cookie）。

### 3.2 受信側

- `https://www.youtube.com` と `https://www.youtube-nocookie.com` 以外からのメッセージは無視
- 期待されるイベントタイプのみを処理
- 数値データは`Number.isFinite()`で厳格に検証

### 3.3 iframe

- Referrerヘッダーがoriginのみに制限される
- 遅延読み込みによりリソース消費を最小化
- 必要最小限の機能のみ許可

## 4. 非対応事項

- CSP（Content Security Policy）の強化はホスティング環境に依存するため、本リポジトリでは設定しない
- XSS対策は別途実装する必要がある（本ドキュメントのスコープ外）

## 5. 手動検証手順

1. 複数の動画を追加し、以下のコマンドを実行する
   - 再生/一時停止
   - ミュート/ミュート解除
   - 音量スライダー操作
   - シークバー操作
   - 再生速度変更

2. DevToolsでpostMessageを監視
   - Consoleで以下を実行し、targetOriginが `https://www.youtube.com` であることを確認
   ```javascript
   const originalPostMessage = window.postMessage;
   window.postMessage = function(message, targetOrigin) {
     console.log('postMessage:', { message, targetOrigin });
     return originalPostMessage.apply(this, arguments);
   };
   ```

3. 不正な値を入力して境界値検証
   - 音量: -10, 1000 → `[0, 100]` にクランプされる
   - シーク: -5, NaN → 0 にクランプされる
   - 動画ID: 11文字形式に一致しない値は引数なしで送信される
   - 再生速度: 0.1, 5.0 → 1.0 にフォールバックされる

4. 未知イベントタイプを許可originから送信しても処理されないことを確認する。ページ上の `window.postMessage` では送信元originを偽装できないため、未知originの拒否はorigin検査を単体検証する。
   ```javascript
   window.postMessage(JSON.stringify({ event: 'unknownEvent' }), '*');
   // → scripts/sync.js のイベント種別検査で無視される
   ```

## 6. 今後の拡張

- 新しいYouTube IFrame APIコマンドを使用する場合、`ALLOWED_COMMANDS`と`sanitizeArgs()`を更新する
- ホスティング環境でCSPを設定する場合、`frame-src 'self' https://www.youtube.com` を追加する
