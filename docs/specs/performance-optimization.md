# SP-009: パフォーマンス最適化（iframe遅延ロード）

## 概要

多タイル時のページ負荷を軽減するため、YouTube iframe の遅延ロードとサムネイルプレースホルダを実装。

## 実装詳細

### IntersectionObserver + staggered loading

- `player.js` の `initTileObserver()` で `IntersectionObserver` を初期化
- `rootMargin: '50%'` で可視領域の50%手前からプリロードを開始
- ロードキューで最大2並列（`MAX_CONCURRENT_LOADS = 2`）に制限
- iframe ロード完了後、300ms 間隔（`LOAD_STAGGER_MS`）で次のタイルをロード
- ロード完了時に `_tileObserver.unobserve(tile)` で監視解除

### サムネイルプレースホルダ

- `createTile()` でタイル生成時、iframe の `src` は空
- 代わりに `.tile-thumbnail` 要素に `https://img.youtube.com/vi/{id}/hqdefault.jpg` を背景画像として設定
- iframe ロード完了時に `.loaded` クラスを追加してサムネイルをフェードアウト

### CSS content-visibility

- `.tile` に `content-visibility: auto` を適用（styles/main.css）
- オフスクリーンのタイルの描画コストを削減

### 同期ループの最適化

- `sync.js` の同期ループは `iframeLoaded === false` のタイルを自動スキップ
- 未ロードタイルへの `postMessage` 送信を回避

## 定数

| 定数 | 値 | 説明 |
|------|-----|------|
| `MAX_CONCURRENT_LOADS` | 2 | 同時 iframe ロード数上限 |
| `LOAD_STAGGER_MS` | 300 | ロード間の待機時間 (ms) |
| `rootMargin` | 50% | IntersectionObserver のプリロード距離 |

## モジュール配置

- 主要ロジック: `scripts/player.js`（`initTileObserver`, `_processLoadQueue`, `_loadTileIframe`）
- CSS: `styles/main.css`（`.tile` の `content-visibility`）
