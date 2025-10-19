# HoloSync

複数の YouTube 動画を同時に表示・一括操作・再生位置の同期を行う Web アプリケーションです。ライバーの同時視聴や学習動画の比較視聴など、複数の動画を並べて使うユースケースに最適化されています。

## 概要

- 同一/異なる配信の YouTube 動画を複数追加し、1画面で同時に操作・視聴できます。
- 再生/停止、音量、再生速度、同期（手動・自動）を一括制御できます。
- 同期状態をリアルタイムに可視化します。

## 主な機能

- 動画管理
  - YouTube URL を入力して動画を追加（`watch`/`youtu.be`/`embed` をサポート）
  - 不要な動画の個別削除
- 再生制御
  - すべて再生/停止（ワンクリック）
  - 再生位置の自動同期/手動同期
  - 音量の一括調整（0〜100%）
  - 再生速度の統一（0.25x〜2x）
- ユーザビリティ
  - レスポンシブデザイン（PC/タブレット/スマホ）
  - 同期状態のリアルタイム表示
  - 読み込みエラーのガード（埋め込み不可など）

## 使い方（ローカル）

1. このリポジトリをクローンする。
2. ブラウザで `index.html` を開く（ローカルサーバ経由推奨）。
   - 例: VS Code の Live Server、または `python -m http.server 8080` など
3. 画面上部のフォームに YouTube URL（任意にタイトル）を入力し、「動画を追加」。
4. 「すべて再生」「同期」「音量」「再生速度」などの操作で一括制御。

詳細な確認項目は `docs/TESTING.md` を参照してください。

## 開発ワークフロー（要約）

- ルール/フローの詳細は `docs/WORKFLOW.md` を参照。
- コミット規約: Conventional Commits（例: `feat(sync): ...`, `fix(player): ...`）。
- ブランチ戦略: `feature/<issue-number>-<slug>` / `docs/<topic>` / `chore/<topic>`。
- CI/CD: `lint`（Prettier/ESLint）→ `docs`（Doxygen）→ `deploy`（Pages）。
- タスク管理: `docs/ISSUES.md` をハブとして運用。

## 技術仕様

- フロントエンド: HTML5, CSS3, Vanilla JavaScript
- YouTube API: YouTube IFrame Player API
- レイアウト: CSS Grid / Flexbox
- 同期制御: JavaScript（`setInterval`）+ YouTube Player API
- 対応ブラウザ: 最新版の Chrome / Firefox / Safari / Edge

## ドキュメント

- Live Docs（GitLab Pages）: https://yushimoji.gitlab.io/holosync/
- Doxygen 設定: `Doxyfile`（`README.md` ベース、`docs/html` 出力）

## ライセンス

TBD（選定中）
