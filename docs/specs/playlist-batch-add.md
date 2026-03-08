# SP-006: プレイリスト一括追加

## 概要

YouTube プレイリストURLを入力すると、含まれる動画を一括追加する機能。

## 対応URL形式

- `https://www.youtube.com/playlist?list=PLxxxxxxxx`
- `https://www.youtube.com/watch?v=xxxxx&list=PLxxxxxxxx`（動画+プレイリスト）
- `https://youtu.be/xxxxx?list=PLxxxxxxxx`

## 変更内容

### 1. player.js: parsePlaylistId(input) 追加

URLからプレイリストIDを抽出する。`list=` パラメータの値を返す。
プレイリストでない場合は `null`。

### 2. search.js: fetchPlaylistItems(playlistId, maxItems=50) 追加

YouTube Data API `playlistItems.list` を呼び出し、動画IDの配列を返す。
- `part=contentDetails`（quota: 1 unit/call）
- `maxResults=50`（API上限）
- ページネーション対応（maxItems超過分は切り捨て）
- APIキー未設定時はエラーメッセージを返す

### 3. input.js: プレイリストURL検出と一括追加

単体入力フォーム:
- URLにプレイリストIDが含まれる場合、プレビュー領域に「プレイリストURLを検出」と表示
- submit時に `fetchPlaylistItems()` → 重複除外して `createTile()` を各動画に実行
- 結果を `addError` 領域に「X件追加（Y件重複スキップ）」と表示

一括入力・D&D:
- プレイリストURLが含まれる場合、展開して個別動画として処理

### 4. search.js: エクスポート追加

`fetchPlaylistItems` を export に追加。

## 制約

- YouTube Data API キーが必要（未設定時はエラー表示）
- 最大50件/プレイリスト（API 1回呼び出し分）
- 非公開/削除済み動画はスキップ

## 備考

チャンネルURL対応は別機能（チャンネルLive監視）として分離。DECISION LOG参照。

## 完了条件

- [x] プレイリストURLを単体入力欄に貼り付け→含まれる動画が一括追加される
- [x] 一括入力欄でプレイリストURLが展開される
- [x] D&DでプレイリストURLが処理される
- [x] APIキー未設定時にエラーメッセージが表示される
- [x] 重複動画がスキップされる
- [x] lint通過
