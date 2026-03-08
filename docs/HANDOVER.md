# HoloSync Handover

**Updated**: 2026-03-08
**Branch**: `main`
**Status**: パフォーマンス最適化（iframe遅延ロード）実装済み。セッション7進行中。

## 1) 直近セッションで完了したこと

### 2026-03-08（セッション7）
- パフォーマンス最適化: iframe遅延ロード実装（+116行）
  - IntersectionObserver + staggered loading（最大2並列、300ms間隔）
  - タイル生成時はYouTubeサムネイルをプレースホルダ表示
  - 同期ループが未ロードタイルを自動スキップ
  - CSS content-visibility適用でオフスクリーン描画最適化
- オーディオマスター固定機能（+113行）
  - タイルごとの音声ボタン + 青枠の視覚インジケーター
  - 3モード: 通常 / Solo（マスターのみ） / Ducking（他を20%減衰）
  - audioFocusVideoId + audioModeをlocalStorageに永続化
  - muteAll/unmuteAllがaudioFocusを自動解除

### 2026-03-08（セッション6）
- Playwright UI回帰テスト9件追加（e2e/ui-regression.spec.ts）
  - レイアウト切替/サイドバー/没入表示/ツールバー/ダークモード/ヘルプ/URL検証/一括モード/履歴
- レガシー残存物徹底整理: 9ファイル削除（-557行）
  - .gitlab-ci.yml, push-and-mr.ps1, gen-docs.ps1, doxygen-pages.yml
  - REPORT_CONFIG.yml, presentation.json, .cursorrules, .cursor/rules.md, detect-project-type.js
- 設定ファイルクリーンアップ: .prettierignore/.eslintignore/.eslintrc.json/.gitignore/package.json
- dist/HoloSync.exe 手動受け入れ確認完了
- CLAUDE.md Done条件 6/6 完了

### 2026-03-07（セッション5）
- ES Module Phase 3.5: input.js(265行)抽出 + 「moved to」コメント66行削除
  - main.js 743→381行 (-49%)、全14モジュール
- docs/棚卸し: Doxygen生成物103件+レガシー資産18件削除（-7248行）
  - PERSISTENCE.md全面書き直し、SECURITY_POSTMESSAGE.md更新
  - WORKFLOW.md/AI_CONTEXT.md/CONTRIBUTING.md/.gitlab/削除
  - spec-index.json同期、README.md参照修正

### 2026-03-07（セッション4）
- ES Module Phase 3: layout.js(492行), ui.js(457行), debug.js(158行), electron.js(75行)抽出
  - main.js 1787→743行 (-58%)
- storage.js/zoom-loupe.js ESM化（window.storageAdapter/window.HoloSyncZoomLoupe廃止）
- window.YOUTUBE_API_KEY → state.js youtubeApiKey モジュール変数化
- catch(_)エラーハンドリング改善（5箇所にconsole.warn追加）

### 2026-03-07（セッション3）
- ES Module Phase 2: player.js(529行) + sync.js(470行)抽出、main.js 2300→1787行
- レガシー資産削除: legacy/全削除、session-start.ps1/create-issues.ps1削除
- 不要ファイル削除: PR_BODY.md, PR_SYNC_PHASE1.md, MR_DESCRIPTION.md, MISSION_LOG_TEMPLATE
- WORKFLOW_STATE_SSOT.md をCLAUDE.mdに統合して廃止
- spec-index.json作成（4仕様文書を登録）

### 2026-03-07（セッション2）
- ISSUES.md棚卸し: 完了済み12件移動、重複5件統合
- docs/tasks/・ルートISSUE_*.md 6ファイル削除

### 2026-03-07（セッション1）
- 同期アルゴリズムv2: 3段階drift補正実装
- SYNC_ALGO.md全面更新（v1→v2）

### 2026-02-23 ~ 2026-03-07
- ES Module化: Phase 0 + Phase 1（state/share/search/history抽出）
- shared-workflows submodule廃止
- テストワークフロー簡素化（Chromiumのみ）

## 2) 現在の未完了タスク（優先順）

（P1バックログ完了。P2バックログは [docs/ISSUES.md](ISSUES.md) 参照）

詳細は [docs/ISSUES.md](ISSUES.md) 参照。

## 3) 再開時のコマンド

```powershell
git pull --rebase
npm install
npm run lint
npm run build
```

## 4) 注意点

- `dist` はビルド成果物なので、ソース変更後は `npm run build` が必須。
- Issue起票は GitHub Web UI または `gh issue create` を使用。
- プロジェクト指針は `CLAUDE.md` が唯一の正。
