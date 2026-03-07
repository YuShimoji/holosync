# HoloSync Handover

**Updated**: 2026-03-07
**Branch**: `main`
**Status**: 同期v2実装完了 + ISSUES.md棚卸し完了。未push(3b2347b)あり。

## 1) 直近セッションで完了したこと

### 2026-03-07（セッション2）
- ISSUES.md棚卸し: 完了済み12件を「完了」へ移動、重複5件統合、セクション整理
- docs/tasks/ 3ファイル削除（TASK_013, TASK_014, ISSUE_DRAFT — 全て完了済み）
- ルートISSUE_*.md 3ファイル削除（GHA/POSTMESSAGE/PERSISTENCE — 完了or空）
- HANDOVER.md / WORKFLOW_STATE_SSOT.md を現状に同期（本更新）

### 2026-03-07（セッション1）
- 同期アルゴリズムv2: 3段階drift補正（softTolerance/速度微調整/seekTo）実装
- least-bufferedリーダーモード修復（lastSeekAt追跡）
- syncAll()グループ対応改修
- SYNC_SETTINGS未使用値削除、probeIntervalMs直接制御に統一
- SYNC_ALGO.md全面更新（v1→v2）

### 2026-02-23 ~ 2026-03-07
- ES Module化: Phase 0（main.js ES Module化）+ Phase 1（state/share/search/history抽出）
- shared-workflows submodule廃止、資産をlegacy/に移動
- テストワークフロー簡素化（Chromiumのみ）

## 2) 現在の未完了タスク（優先順）

1. **未pushコミット(3b2347b)のpush** — 同期v2修正
2. main.js Phase 2分割（player.js/sync.js抽出）— 進行中の最大リファクタ課題
3. spec-index.json作成 — CLAUDE.mdで必須だが未整備
4. Playwright UI回帰テスト追加
5. `dist/HoloSync.exe` での手動受け入れ確認

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
- GitHub API への Issue 自動起票は `GITHUB_TOKEN` または `GH_TOKEN` が必要。
  - トークン未設定時は `scripts/create-issues.ps1` が `docs/tasks/ISSUE_DRAFT_*.md` を生成する。
- `choices-driven-development.md`（ルート配置）の現役性が不明。要判定。
