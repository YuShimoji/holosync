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

1. このリポジトリをクローンし、依存関係をインストールする。
   ```bash
   npm install
   ```
2. アプリを起動する。
   - **デスクトップアプリとして起動（推奨）**:
     ```bash
     npm start
     ```
   - ブラウザで起動（開発用）:
     ```bash
     npm run dev
     ```

3. 画面上部のフォームに YouTube URL（任意にタイトル）を入力し、「動画を追加」。
4. 「すべて再生」「同期」「音量」「再生速度」などの操作で一括制御。

## デスクトップアプリ化（配布用ビルド）

以下のコマンドを実行すると、`dist` ディレクトリ内にポータブル版（`.exe`）が生成されます。

```bash
npm run build
```

ビルド後、`dist/HoloSync-win32-x64/HoloSync.exe` をダブルクリックするだけで起動できます。

詳細な確認項目は `docs/TESTING.md` を参照してください。

## 他の端末での使用方法

### 方法1: ソースからセットアップ（開発者向け）

1. リポジトリをクローン
   ```bash
   git clone https://github.com/YuShimoji/holosync.git
   cd holosync
   ```

2. 依存関係をインストール
   ```bash
   npm install
   ```

3. アプリを起動
   ```bash
   npm start
   ```

4. （オプション）配布用ビルドを作成
   ```bash
   npm run build
   ```
   → `dist/HoloSync-win32-x64/HoloSync.exe` が生成されます

### 方法2: ビルド済みファイルを配布

1. ビルド実行済みの端末で `dist/HoloSync-win32-x64/` フォルダをコピー
2. 他の端末にフォルダごと配置
3. `HoloSync.exe` をダブルクリックで起動

**注意**: Node.js や npm のインストールは不要です。ビルド済みフォルダには実行に必要なすべてが含まれています。

### 動作要件

- **OS**: Windows 10/11（64bit）
- **ネットワーク**: YouTube動画の再生にインターネット接続が必要

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
