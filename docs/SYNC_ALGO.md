# SYNC_ALGO -- 同期アルゴリズム仕様

## 1. 概要

YouTube IFrame Player APIの`postMessage`経由で複数動画の再生位置を揃える。
基準プレイヤー(リーダー)の再生位置に対し、他の動画をseekTo/再生速度調整で追従させる。

## 2. 制約 (YouTube IFrame API)

- 通信は`postMessage`のみ。直接的なDOM/JSアクセス不可
- `seekTo`後の実際の移動完了タイミングは検知不可
- バッファリング/広告の長さ・タイミングは制御不可
- 受信イベント(`infoDelivery`)の頻度はYouTube側が決定(概ね250ms間隔)
- origin検証: `https://www.youtube.com` のみ受理

## 3. 現在の実装 (v2)

### 3.1 データ構造

```
playerStates: Map<Window, {
  time: number,       // 再生位置(秒)
  state: number,      // -1=未開始, 0=終了, 1=再生中, 2=一時停止, 3=バッファリング, >=100=広告
  lastUpdate: number, // Date.now()
  lastSeekAt: number  // seekTo実行時のDate.now() (least-bufferedモード用)
}>

suspendedPlayers: Map<Window, {
  since: number,      // 保留開始時刻
  reason: string      // 'buffering' | 'paused' | 'ad' | 'stalled' | 'no-state' | 'no-time'
}>

speedAdjustedPlayers: Set<Window>  // 速度補正中のプレイヤー追跡
```

### 3.2 同期ループ

- **間隔**: デフォルト500ms (`SYNC_SETTINGS.probeIntervalMs`)、UIスライダーで1-10Hzに変更可能
- **エントリ**: `groupAwareReconcile()` → グループごとに `reconcileGroup()`
- **対象**: `syncGroupId`がnullでない動画のみ (null = 独立、同期しない)

### 3.3 リーダー選出 (`pickLeader`)

state === 1 (再生中) の動画のみ候補。

| モード | 挙動 |
|--------|------|
| `first` (デフォルト) | activeEntriesの最初の再生中動画 |
| `manual` | `leaderId`で指定した動画 (再生中でなければフォールバック) |
| `longest-playing` | time値が最大の動画 (=動画内で最も進んでいる) |
| `least-buffered` | lastSeekAtが最も古い(=最もseekされていない安定した)動画 |

### 3.4 drift検出と3段階補正

```
drift = followerTime - (leaderTime + followerOffsetSec)
```

| 条件 | アクション |
|------|------------|
| `|drift| <= softToleranceMs/1000` (150ms) | 何もしない。速度補正中なら通常速度(1x)に戻す |
| `softToleranceMs < |drift| <= hardToleranceMs` (1000ms) | 再生速度を微調整 (drift>0: 0.95x, drift<0: 1.05x) |
| `|drift| > hardToleranceMs` (1000ms) | `seekTo`で即時補正 + 速度を1xに戻す |

再生状態の同期:
- リーダーが再生中でフォロワーが停止中 → `playVideo`
- リーダーが停止中でフォロワーが再生中 → `pauseVideo`

### 3.5 設定値 (`SYNC_SETTINGS`)

```javascript
{
  toleranceMs: 300,           // 旧来のtolerance (rejoin時に使用)
  softToleranceMs: 150,       // これ以下: 補正不要
  hardToleranceMs: 1000,      // これ以上: seekToで強制補正
  probeIntervalMs: 500,       // 同期ループ間隔
  stallThresholdMs: 2500,     // stall判定閾値
  rejoinSyncBufferMs: 500,    // 復帰時の追加tolerance
  leaderMode: 'first',       // リーダー選出方式
  leaderId: null,             // manualモード時のリーダーID
  retryOnError: true,
  fallbackMode: 'mute-continue',
  speedCorrectionFactor: 0.05 // 速度微調整幅 (+-5%)
}
```

### 3.6 suspend/復旧

| 状態 | 判定 | 復旧アクション (mute-continue) |
|------|------|------|
| buffering (state=3) | 即時 | ミュート + 再生継続 |
| paused (state=2) | 即時 | playVideo送信 |
| ad (state>=100) | 即時 | ミュート |
| stalled | lastUpdateから2500ms経過 | スナップショット再要求 |
| no-state/no-time | 状態未取得 | スナップショット再要求 |

復帰時は `toleranceMs + rejoinSyncBufferMs` (800ms) の許容幅で再同期。
復帰時に速度補正中だった場合は通常速度(1x)にリセット。

### 3.7 同期グループ

- A, B, C の3グループ + null(独立)
- 各グループは独立したリーダーを持つ
- グループ切り替え: タイルの同期バッジクリック (A→B→C→null→A)
- `syncAll()`(手動同期ボタン): グループごとにリーダーを選出し、各グループ内で同期。独立(null)動画は対象外

### 3.8 オフセット

各動画に`offsetMs`設定可能。リーダーとの意図的な時間差。
- offsetMs = +5000: リーダーより5秒先行
- offsetMs = -5000: リーダーより5秒遅延

`syncAll()`でもオフセットが考慮される。

## 4. 設計判断

### 4.1 なぜ3段階補正か

seekToのみの離散的補正は視覚的に「ジャンプ」する。小さいdrift(150ms-1000ms)は再生速度の微調整(+-5%)で吸収することで、ユーザーに知覚されにくい滑らかな収束を実現する。

- YouTube APIの`setPlaybackRate`は0.25-2.0の範囲で、+-5%は十分に安全な範囲
- `speedAdjustedPlayers` Setで追跡し、drift解消後に確実に通常速度に戻す
- リーダー変更時にも前リーダーの速度を1xにリセット
- 動画削除時にSetからクリーンアップ

### 4.2 代替アプローチ (検討済み・不採用)

| 方式 | 不採用理由 |
|------|------------|
| requestAnimationFrame同期 | postMessage遅延が支配的で精度向上限定的。CPU負荷増大 |
| サーバー介在型 (WebSocket/WebRTC) | ローカル複数動画ユースケースには過剰 |
| Web Audio API基準クロック | YouTube動画の音声とは別レイヤーで位置合わせ不可 |

## 5. 今後の改善候補

| 優先度 | 項目 | 分類 |
|--------|------|------|
| P2 | seekToデバウンス (lastSeekAt追跡の活用) | 安定性 |
| P3 | デバッグパネルにdrift補正履歴表示 | 開発支援 |
