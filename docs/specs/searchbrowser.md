# SP-017: Search Browser Panel

## 概要

サイドバーの「動画を追加」セクション内に YouTube 風リッチ検索ブラウザを追加。カード形式の検索結果表示、フィルタリング、ページング、ライブ検索を提供する。

## 機能

### 1. 追加モードタブ拡張

- 既存の「単体 / 一括」タブに「検索」タブを追加
- タブ切替で対応パネルの表示/非表示を制御

### 2. API検索モード

- YouTube Data API `search.list` を使用（`maxResults=12`）
- フィルタ: 動画の長さ（short/medium/long）、並び順（関連度/日付/再生数/評価）、タイプ（動画/ライブ）
- ライブ検索時は `eventType=live` パラメータを付与
- 検索履歴は `storageAdapter.saveSearchHistory` で保存

### 3. 結果カードUI

- サムネイル（100px幅、16:9）、タイトル（2行clamp）、チャンネル名、日付を表示
- ライブ配信には赤い「LIVE」バッジ
- 追加済み動画は緑の「✓」表示
- カードクリックまたは「+」ボタンで動画を追加
- 「もっと見る」ボタンで次ページ読み込み（`nextPageToken`）

### 4. URL追加モード (Quick-add)

- API検索の代替として直接URL/動画IDで追加
- `parseYouTubeId` でID抽出、無効入力はエラー表示（3秒後自動消去）

### 5. APIキー状態表示

- 設定済み: 緑チェック表示
- 未設定: サイドバーのAPI Key設定への誘導メッセージ

## モジュール構成

- ファイル: `scripts/searchbrowser.js` (282行)
- 依存: `storage.js`, `state.js`（`youtubeApiKey`, `hasVideo`）
- 外部依存（DI）: `createTile`, `parseYouTubeId`（`initSearchBrowser(deps)` で注入）
- エクスポート: `initSearchBrowser`
- DOM: `#searchBrowserPanel` + 内部要素23個

## UI 配置

サイドバー「動画を追加」セクションの `.add-mode-tabs` に「検索」タブ追加。タブ選択で検索パネルを表示。

## セキュリティ

- HTML出力は `escapeHtml()` でXSSエスケープ済み
- APIキーはURLパラメータに直接埋め込み（既存search.jsと同方式）
