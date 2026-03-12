# SP-016: Fit Mode Controller

## 概要

動画タイル表示のフィットモード制御。レイアウトセレクトとは独立して、動的列数計算・余白なし表示・1動画最大化の3機能を提供する。

## 機能

### 1. 動的列数計算 (Auto Dynamic)

- レイアウト「自動」選択時に有効
- コンテナサイズと動画数から 16:9 アスペクト比を考慮した最適列数を算出
- `ResizeObserver` でリサイズ追従
- CSS 変数 `--auto-cols` でグリッド列数を制御

### 2. Cover Mode (余白なし表示)

- `fitModeBtn` クリックでトグル
- `object-fit: cover` で動画タイルを隙間なく埋める（レターボックス除去）
- SVG アイコンが状態に応じて変化（grid → solid）
- `fitCoverMode` として `storageAdapter` に永続化

### 3. Full-Fit Mode (1動画最大化)

- `fullFitBtn` クリックでトグル
- 先頭動画のみ表示し、グリッド全体に最大化
- 元のレイアウトクラスを保存・復元
- `fitFullFit` として `storageAdapter` に永続化

## モジュール構成

- ファイル: `scripts/fitmode.js` (180行)
- 依存: `storage.js`, `state.js`
- エクスポート: `initFitMode`, `toggleCoverMode`, `toggleFullFit`, `onVideosChanged`
- DOM: `#fitModeBtn`, `#fullFitBtn`, `#fitModeIcon` (SVG), `#layoutSelect`

## UI 配置

ツールバーの `.layout-controls` 内、`layoutSelect` の右隣に2ボタンを配置。
