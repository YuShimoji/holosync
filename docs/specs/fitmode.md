# SP-016: Fit Mode Controller

## 概要

動画タイルの表示調整を担当するコントローラー。通常のレイアウト選択に加え、Cover、Focus、Quick Fit、およびウィンドウサイズ調整を提供する。Full-FitはSP-021/F-02で廃止済み。

## 現行機能

### 動的列数計算 (Auto Dynamic)

- レイアウト「自動」選択時にグリッドの列数と必要に応じた行高を計算する。
- コンテナサイズと動画数を使い、16:9からの歪みと未使用領域を考慮する。
- `ResizeObserver` でコンテナのサイズ変更に追従し、CSS変数 `--auto-cols` と必要に応じて `--auto-row-height` を設定する。

### Cover Mode

- `#fitModeBtn` で切り替える。
- `fit-cover` クラスを設定し、動画表示をCoverにする。
- `fitCoverMode` を `storageAdapter` に保存する。

### Focus Mode

- タイルのダブルクリックまたはタイルのフォーカスボタンから、対象動画1本を表示するモードに切り替える。実装上の入口は `toggleFocusMode(videoId)`。
- `body.focus-mode` と対象タイルの `focus-target` を設定し、サイドバーとツールバーを折りたたむ。
- ESCで解除し、開始前のサイドバー／ツールバー状態を復元する。フォーカス中のエッジ表示ボタンから解除する経路もある。
- これは旧Full-Fitの後継としてSP-021/F-02とF-11で採用された別実装であり、Full-Fitの継続動作を意味しない。

### Quick Fit

- `#quickFitBtn` またはFキーから切り替える (`toggleQuickFit()`)。
- グリッド内の全タイルを維持したまま、サイドバーとツールバーを折りたたみ、Electronでは必要に応じてフレームレス表示にする。
- ESCまたは再度の切り替えで解除し、保存していた表示状態を復元する。
- `quickFitAutoAspect` が有効でElectron APIが利用可能な場合、16:9にウィンドウ内容比率を設定する。

### Fit Window to Videos

- Electronの `#fitWindowBtn` から `fitWindowToVideos()` を一度実行する。動画がない場合は何もしない。
- 現在の列数と行数をもとに、各動画を16:9と仮定してウィンドウ内容の比率を設定する。
- Web環境ではボタンを隠す。これはトグルモードではない。

## 廃止済み機能

- **Full-Fit**: SP-021/F-02でFocus Modeに置き換えて廃止。`#fullFitBtn`、`layout-fullfit`、`setFullFit`、`toggleFullFit` は現行実装にない。残存する `fitFullFit` 保存キーは初期化時に `null` を書き込み、旧値を整理するためのもの。
- **Cover Mode**は現行機能であり、独立した表示調整として残る。

## モジュール構成

- 実装: [`scripts/fitmode.js`](../../scripts/fitmode.js)
- 依存: `storage.js`, `state.js`
- 公開関数: `initFitMode`, `exitFocusMode`, `isFocusModeActive`, `toggleQuickFit`, `fitWindowToVideos`, `toggleFocusMode`, `onVideosChanged`
- DOM入口: `#fitModeBtn`, `#quickFitBtn`, Electron用 `#fitWindowBtn`, `#layoutSelect`
- Focus Modeのタイル入口は `scripts/player.js` が `toggleFocusMode(videoId)` を呼び出す。
