# SP-012: チャンネルLive監視

## 概要

YouTubeチャンネルを登録し、アクティブなライブ配信を自動検出してタイルに追加する。
複数チャンネル・複数同時ライブに対応。

## チャンネルURLの解析

### 対応形式

| 形式 | 例 | 解析方法 |
|------|-----|---------|
| channelId直接 | `youtube.com/channel/UCxxxxxx` | URLから直接抽出 |
| ハンドル | `youtube.com/@handle` | `channels.list?forHandle=@handle` (1 unit) |

### 非対応（初期実装）

- `youtube.com/c/customname` (legacy custom URL) — 解決にsearch.listが必要(100 units)でコスト高
- `youtube.com/user/username` — 同上

## データモデル

### 監視チャンネルリスト

localStorage に `channelWatchList` として保存:

```javascript
[
  {
    channelId: "UCxxxxxxxxxxxxxx",
    name: "チャンネル名",        // channels.list snippet.title から取得
    handle: "@handle",           // 元の入力（表示用）
    addedAt: 1709900000000,      // 登録日時
    lastChecked: 1709900000000,  // 最終チェック日時
    liveVideoIds: ["abc123xxxxx"] // 前回検出したライブ動画ID
  }
]
```

## ライブ配信の検出

### API呼び出し

```
GET https://www.googleapis.com/youtube/v3/search
  ?part=snippet
  &channelId=UCxxxxxx
  &eventType=live
  &type=video
  &key=API_KEY
```

- コスト: 100 units/call/チャンネル
- 返却: 現在ライブ中の動画一覧（videoId + タイトル）

### ポーリング

- デフォルト間隔: 15分
- Page Visibility API: タブ非表示時はポーリング停止
- 手動更新ボタン: いつでも即時チェック可能
- アプリ起動時: 登録チャンネルがあれば即時1回チェック

### クォータ考慮

日次クォータ 10,000 units（デフォルト）に対する消費見込み:
- 1チャンネル × 15分間隔 × 8時間/日 = 32 calls = 3,200 units
- 3チャンネル × 同条件 = 9,600 units（上限に近い）

推奨: 登録チャンネル数は3件程度を推奨。UI上に注意書きを表示。

## 自動追加の動作

### 新規ライブ検出時

1. `liveVideoIds` に含まれない新しいライブ動画IDを検出
2. `hasVideo()` で重複チェック
3. 新規なら `createTile(videoId)` で自動追加
4. UI通知: 「[チャンネル名] がライブ配信中: [タイトル]」

### ライブ終了時

- タイルはそのまま残す（VODとして閲覧可能）
- `liveVideoIds` から削除（次回ポーリングで自動的に消える）

## UI

### サイドバーセクション（プリセットとWatch Historyの間）

```
チャンネルLive監視
┌──────────────────────────────────┐
│ [チャンネルURL入力] [追加ボタン] │
│                                  │
│ @channel1  LIVE(1)  [更新] [削除]│
│ @channel2  --       [更新] [削除]│
│                                  │
│ [一括更新]  次回チェック: 12:30  │
│ ⚠ クォータ注意: 3件以上で...     │
└──────────────────────────────────┘
```

### チャンネル追加フロー（input.jsでの検出）

1. URLフォームにチャンネルURLを入力
2. `parseChannelInput()` でチャンネルURL/ハンドルを検出
3. 「このチャンネルを監視」ボタンを表示
4. クリックでチャンネル情報を解決 → 監視リストに追加 → ポーリング開始

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| scripts/channel.js (新規) | チャンネル監視ロジック: 解析、API呼び出し、ポーリング、通知 |
| scripts/state.js | ALLOWED_COMMANDS 変更なし |
| scripts/input.js | parseChannelInput() 追加、チャンネルURL検出時のUI |
| scripts/main.js | channel.js の初期化呼び出し |
| index.html | サイドバーにチャンネル監視セクション追加 |
| styles/main.css | チャンネルリスト・ステータス表示のスタイル |

## 完了条件

- [x] チャンネルURL（/channel/UCxxx, /@handle）から監視登録できる
- [x] ライブ配信中の動画が自動でタイルに追加される
- [x] 複数チャンネル・複数同時ライブに対応
- [x] 手動更新ボタンで即時チェック可能
- [x] Page Visibility APIでタブ非表示時にポーリング停止
- [x] 監視リストがlocalStorageに永続化される
- [x] lint通過

## 実装済みの追加仕様

- [x] ポーリング間隔がUI上で変更可能（既定値15分、1-60分の範囲で設定可能）
- [x] 新規ライブを自動追加（枠移動対応）
- [x] チャンネルURLは単体追加フィールドとメインURL入力の両方で検出・処理
- [x] 登録3件以上でクォータ警告を表示

## 未決事項

- [ ] 新規ライブのタイルを特定の同期グループに自動追加するか
