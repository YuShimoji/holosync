# HoloSync Handover

**Updated**: 2026-02-23  
**Branch**: `main`  
**Status**: Shared-workflows 連携 + UIホットフィックス反映済み（要: 手動確認とリリース反映）

## 1) 今回完了したこと

- ユーザー報告のホットフィックスを実装
  - 視聴履歴（アプリ内）記録とサイドバー表示
  - タイトルオーバーレイ化（表示領域の圧迫を軽減）
  - 全画面復帰導線の強化（Esc / Exit Fullscreen / F11 immersive）
  - タイル並び順操作（←/→）と自由配置時の前面化
  - 概要欄の再取得改善（API Key 変更時の再フェッチ）
  - Electron側のメニューバー非表示・タイトルバー圧縮

- shared-workflows 更新を取り込み
  - `.shared-workflows` サブモジュールを追加（`main` tracking）
  - `docs/windsurf_workflow/` を最新同期
  - `prompts/orchestrator/modules/` に `P2.5_diverge.md` / `P2.5_slice.md` を追加
  - `scripts/session-start.ps1` を submodule 優先解決に更新
  - `docs/WORKFLOW.md` に submodule 運用手順を追記
  - `docs/tasks/`, `docs/inbox/`, `REPORT_CONFIG.yml` を整備

- 引き継ぎ資産を更新
  - `AI_CONTEXT.md` 追記
  - `docs/ISSUES.md` に直近引き継ぎタスク追加
  - `scripts/create-issues.ps1` を GitHub API / markdown 下書き対応に刷新

## 2) 現在の未完了タスク（優先順）

1. `dist/HoloSync-win32-x64/HoloSync.exe` で手動受け入れ確認
2. Playwright 回帰テスト追加（全画面復帰 / 履歴 / 概要 / immersive）
3. README にビルド再生成手順と検証観点を追記
4. `scripts/main.js` の段階的分割（player/layout/history/workflow）

## 3) 再開時のコマンド

```powershell
git pull --rebase
git submodule update --init --recursive
powershell -NoProfile -File scripts/session-start.ps1
npm install
npm run lint
npm run build
```

shared-workflows の更新確認:

```powershell
node .shared-workflows/scripts/sw-update-check.js
node .shared-workflows/scripts/sw-doctor.js --profile shared-orch-bootstrap --format text
```

## 4) 注意点

- `dist` はビルド成果物なので、ソース変更後は `npm run build` が必須。
- GitHub API への Issue 自動起票は `GITHUB_TOKEN` または `GH_TOKEN` が必要。
  - トークン未設定時は `scripts/create-issues.ps1` が `docs/tasks/ISSUE_DRAFT_*.md` を生成する。
