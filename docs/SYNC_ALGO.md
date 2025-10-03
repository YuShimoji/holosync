# SYNC_ALGO 設計（初版）

## 目的
- 基準プレイヤーと各プレイヤーの時刻差（ドリフト）を監視・補正し、±0.3s 程度に収束させる。
- バッファリングや広告などの遅延発生時でも自動的に復帰する。

## 前提/制約
- プレイヤーは YouTube IFrame Player API。
- 送信は `postMessage`（`event: 'command'`）。受信は `message` イベント（`infoDelivery`）。
- 送受信ともに `origin === 'https://www.youtube.com'` を厳格に検証。

## 全体像
1. 受信側リスナで各タイルの `currentTime`, `playerState` を保持
2. 周期タスクで基準との時刻差を計測
3. 閾値を超えた場合に `seekTo` と軽い `play/pause` で追従

```
[YouTube Iframe] <= message(infoDelivery) <= [window] => periodic reconcile => [postMessage(command: seekTo/play/pause)] => [YouTube Iframe]
```

## 主要データ
- `state.players: { id, time, state, lastUpdate }[]`
- `settings: { toleranceMs: number, probeIntervalMs: number, leader: 'first'|'manual', leaderId?: string }`

## 同期ロジック（擬似）
```js
// 毎 probeIntervalMs 実行
const leader = pickLeader(state, settings);
for (const p of state.players) {
  if (p.id === leader.id) continue;
  const drift = p.time - leader.time; // 秒
  if (Math.abs(drift) > settings.toleranceMs / 1000) {
    // 追従: 位置を合わせ、必要なら再生/一時停止調整
    send(p.iframe, 'seekTo', [leader.time]);
    if (leader.state === 'playing' && p.state !== 'playing') send(p.iframe, 'playVideo');
    if (leader.state !== 'playing' && p.state === 'playing') send(p.iframe, 'pauseVideo');
  }
}
```

## 受信リスナ
- `window.addEventListener('message', onMessage, false)`
- `event.origin === 'https://www.youtube.com'` のみ受理
- `event.data.event === 'infoDelivery'` をパースし、`currentTime`, `playerState` を抽出

## 設定値（初期値）
- `toleranceMs = 300`
- `probeIntervalMs = 500`
- `leader = 'first'`

## フェーズ分割
1. フェーズ1: 受信リスナ + 状態保持 + ログ（動作観察）
2. フェーズ2: 基本同期（seekTo + 再生/一時停止）
3. フェーズ3: エッジケース（バッファ/広告）へのフォールバック

## 検証
- 手動: 2〜3動画で差分発生させ、±0.3s に収束するか観測
- ログ: ドリフト量/補正回数の計測

## リスク
- 過剰な `seekTo` による体感のガタつき → デバウンス/スロットリング調整
- 受信イベント頻度に依存 → probeInterval を保守的に設定
