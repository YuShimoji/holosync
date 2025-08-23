# Choices-Driven Development: HoloSync

最終更新: 2025-08-23 21:15 (JST)

## ゴール（MVP）
- 手動URL追加で複数YouTubeをタイル表示
- 一括操作（再生/一時停止/ミュート/音量）

## 現在の進捗
- MV3 拡張雛形: `manifest.json`, `background.js`, `app.html`, `app.js`, `styles.css`, `README.md` 完了
- CSP設定: `frame-src` に YouTube を許可
- 直接 `postMessage` による一括制御（`enablejsapi=1`）
- 保存機能: 追加動画IDと音量を `chrome.storage.local` に保存/復元 完了

## 次のマイルストーン
- フェーズ2: レイアウトプリセット追加、基礎的な手動同期UI（オフセット設定）
- フェーズ3: YouTube Data API によるチャンネル検索、`chrome.storage.local` によるレイアウト保存

## Docs & CI
- Doxygen を導入し、`app.js`/`background.js` に JSDoc コメントを追加
- `Doxyfile` を追加し、`docs/html` に HTML 出力
- GitLab CI（`.gitlab-ci.yml`）で `alpine` + `doxygen` + `graphviz` を使用し、`public/` にコピーして Pages 公開
- 予想公開URL: `https://yushimoji.gitlab.io/holosync/`（main ブランチ push で更新）

## 主要な意思決定と代替案
- SoC: UI（`app.html/css/js`）と背景（`background.js`）を分離
- YT制御: IFrame Player API ライブラリを使わず `postMessage` で最小実装（MVPの軽量化）。代替: `YT.Player` を使うがスクリプト追加・型定義が増える
- レイアウト: CSS Grid でレスポンシブタイル。代替: flex だと列揃えが崩れやすい
- Autoplay対策: 初回はミュートで `playAll`

## リスク・制約
- ブラウザの自動再生制限
- ライブ遅延差 → 同期機能は次フェーズ

## テスト手順（MVP）
1) `chrome://extensions/` で本拡張を読み込み
2) 拡張アイコンクリック → HoloSync タブ起動
3) URLを複数追加（watch/youtu.be/live/embed）
4) 一括操作の各ボタンと音量が期待動作すること
5) タブをリロードし、動画と音量が復元されること

## TODO 概要
- レイアウトプリセット（メイン/サブ）
- 手動同期UI（全体/個別オフセット）
- 自動同期調査（Web Audio API）
