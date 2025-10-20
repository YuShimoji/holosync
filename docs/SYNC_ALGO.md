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

```text
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

## フェーズ3 詳細設計

- **バッファ/広告耐性**: `playerStates` の `lastUpdate` と `state` を監視し、一定期間 (`bufferGraceMs=1500` 目安) 以上 `state` がバッファ系コード（`2=buffering` など）のまま、または `lastUpdate` が古いプレイヤーには `seekTo` を即時送信せず「保留キュー」に積む。基準プレイヤーが再生状態へ復帰したタイミング、もしくは保留プレイヤーが再生可能 (`state === 1`) に戻ったタイミングで再同期を実施する。保留中に差分が閾値を大幅超過した場合でも、最大で `requeueAttempts` 回までリトライし、それ以上はユーザー通知（ハイライト）を検討。
- **スラッシング抑制**: `seekTo` 実行後にクールダウン (`cooldownMs=800` 目安) を導入し、同一プレイヤーへ連続で `seekTo` を送らないようにする。`lastSeekAt` を `playerStates` に追記して制御する。さらに `toleranceMs` を二段階（通常±0.3s、保留復帰時±0.5s）で扱い、復帰直後の過剰補正を避ける。
- **リーダー選択 UI**: タイルに「基準に設定」ボタンを設け、クリック時に `SYNC_SETTINGS.leaderMode = 'manual'`、`leaderId = videoId` を保存。基準切替時は旧基準との差分を即時計測し、必要なら `reconcile()` を1回強制実行。UI は現在の基準タイルを強調表示する。
- **同期設定 UI**: サイドバーに「同期設定」セクションを追加し、`toleranceMs`・`probeIntervalMs`・クールダウン値等をフォーム入力で調整できるようにする。値は `chrome.storage`（存在しない場合は `localStorage`）へ保存し、起動時に読み戻して `SYNC_SETTINGS` に適用。入力は数値バリデーションと単位表示（ms/秒換算）を行う。
- **テレメトリ/デバッグ表示**: 開発者向けに `playerStates` の最新スナップショット（ID、time、state、lastUpdate、lastSeekAt）を一覧表示する隠しパネルを用意。UIトグル（例: Alt+S）で表示し、同期挙動の観測や Phase3 チューニングに利用する。

## 検証

- 手動: 2〜3動画で差分発生させ、±0.3s に収束するか観測
- ログ: ドリフト量/補正回数の計測

## リスク

- 過剰な `seekTo` による体感のガタつき → デバウンス/スロットリング調整
- 受信イベント頻度に依存 → probeInterval を保守的に設定
