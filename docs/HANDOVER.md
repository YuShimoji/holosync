# HoloSync Handover

**Updated**: 2026-03-07
**Branch**: `main`
**Status**: ES Module Phase 2完了、レガシー資産削除完了、SSOT統合完了。

## 1) 直近セッションで完了したこと

### 2026-03-07（セッション3）
- ES Module Phase 2: player.js(529行) + sync.js(470行)抽出、main.js 2300→1787行
- レガシー資産削除: legacy/全削除、session-start.ps1/create-issues.ps1削除
- 不要ファイル削除: PR_BODY.md, PR_SYNC_PHASE1.md, MR_DESCRIPTION.md, MISSION_LOG_TEMPLATE
- WORKFLOW_STATE_SSOT.md をCLAUDE.mdに統合して廃止

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

1. spec-index.json作成 — CLAUDE.mdで必須だが未整備
2. Playwright UI回帰テスト追加
3. `dist/HoloSync.exe` での手動受け入れ確認

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
