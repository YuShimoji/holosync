# SP-019: サイドバーUI再設計

## スコープ

サイドバーの情報密度と操作性を段階的に改善する3Phase構成。

- Phase 1: 検索UI統合 (searchbrowser.js廃止、統合入力欄に一本化)
- Phase 2: サイドバーアコーディオン化 (3グループ + セクション並替 + 開閉永続化)
- Phase 3: 一括操作コンパクト化 (トグルアイコン + シークバー分離 + 詳細折りたたみ)

## Phase 1: 統合入力一本化

### 決定事項
- `searchbrowser.js` (531行) を完全削除し、`input.js` に検索機能を統合
- URL貼り付けとキーワード検索を単一の `<textarea>` で自動判定

### 実装
- `scripts/input.js` の `classifyInput()` が入力行を4分岐で判定:
  - YouTube動画URL → `parseYouTubeId()` で動画ID抽出
  - プレイリストURL → `parsePlaylistId()` で識別
  - チャンネルURL → `parseChannelInput()` で識別
  - それ以外 → YouTube Data API `search.list` でキーワード検索
- 検索モード時のみフィルタUI (長さ / 並び順 / タイプ) を表示
- 複数URL入力時は改行区切りで一括処理

### コミット
- `8207c01` refactor: 検索UI統合 -- searchbrowser.js削除、URL/検索を統合入力欄に一本化

## Phase 2: アコーディオン化

### 決定事項
- `<details>/<summary>` によるネイティブ実装 (JSなしで動作)
- 頻度別に3グループに分類
- 開閉状態を `storageAdapter` で永続化

### 3グループ構成

| グループ | ID | 内容 |
|---------|-----|------|
| ライブラリ | `accordionLibrary` | プリセット保存/読込、Watch History、よく見るチャンネル |
| チャンネルLive監視 | `accordionChannel` | チャンネル登録、ライブ検出、ポーリング設定、チャンネルプリセット |
| 設定 | `accordionSettings` | APIキー、同期設定、回復設定、Embed設定、クイックスタート |

### 開閉永続化
- `scripts/ui.js` の `restoreAccordionState()` / `saveAccordionState()` で管理
- `storageAdapter.getItem('accordionState')` にオブジェクト `{accordionLibrary: bool, ...}` として保存
- 各 `<details>` の `toggle` イベントで自動保存

### CSS
- デフォルトリストマーカーを非表示、`::before` 疑似要素で `▸` を表示
- `[open]` 状態で `rotate(90deg)` トランジション (0.2s)

### コミット
- `533be07` feat: Phase 2 サイドバーアコーディオン化

## Phase 3: 一括操作コンパクト化

### 決定事項
- 高頻度操作 (再生/ミュート/同期) をSVGアイコントグルボタンに変更
- マスターシークバーを独立行に分離
- 低頻度操作 (Audio/速度/音量) を `<details>` 折りたたみに格納

### レイアウト
```
行1: [Play/Pause] [Mute/Unmute] [Sync] -- SVGアイコン 32x32px
行2: 0:00 [====== シークバー ======] 3:15
行3: ▸ 詳細設定
     ├ Audio: [通常/Solo/Ducking]
     ├ 速度: [0.25x ~ 2x]
     └ 音量: [スライダー 0-100]
```

### シークバー更新ロジック
- `requestAnimationFrame` ループで常時更新
- ドラッグ中 (`_seekDragging`) は更新を一時停止
- ライブ配信判定: `duration > 43200` または edge gap < 30s で "LIVE" 表示、シークバー無効化
- seekTo時に各動画のオフセット (`offsetMs`) を考慮

### トグルボタン
- `.batch-icon-btn` クラスで統一スタイル (32x32, border-radius: 6px)
- `.active` 状態で `--color-primary` 背景 + 白文字
- 再生状態の変化を `updatePlayPauseIcon()` で即時反映

### コミット
- `817ea35` feat: Phase 3 一括操作コンパクト化 -- トグルアイコン+シークバー分離+詳細折りたたみ

## 関連ファイル

| ファイル | Phase | 役割 |
|---------|-------|------|
| `scripts/input.js` | 1 | 統合入力・自動判定・API検索 |
| `scripts/ui.js` | 2 | アコーディオン永続化 |
| `scripts/main.js` | 3 | トグルアイコン管理・シークバー更新 |
| `index.html` | 1-3 | サイドバーDOM構造 |
| `styles/main.css` | 1-3 | レイアウト・アニメーション |

## スコープ外
- サイドバーの幅変更 (別途 P2 fix で対応済み: 280→320px)
- フレームレスモードのドラッグ領域 (SP-014)
- sidebar/toolbar の状態管理 (SP-015)
