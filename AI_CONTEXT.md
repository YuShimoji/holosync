# AI Context

このファイルは、AIによる作業計画・進捗メモ・決定事項（CDD）ログのためのスペースです。

- 現状: 初期化済み（中央プロトコル移行ブランチ作成）
- 運用: 大きなタスク開始時に要約・決定・残課題を箇条書きで追記してください

## Log: Central protocol migration

- ブランチ: `chore/adopt-shared-workflows`
- 変更:
  - `/.github/workflows/lint.yml` を追加し、中央WF `YuShimoji/shared-workflows/.github/workflows/ci-smoke.yml@main` を参照
  - 一時対応: GitHub Actions安定化のため、`@c659f8f705...` にピン留め（中央側 main 反映後に `@main` へ戻す）
  - `DEVELOPMENT_PROTOCOL.md`（中央プロトコルへのリンク）追加
  - `AI_CONTEXT.md` 初期化（本ファイル）
  - スモーク用 `scripts/dev-server.js` / `scripts/dev-check.js` 追加
  - `.gitignore` に `server.log` 追加
  - `ISSUES.md` に移行Issueを追記
- コミット済み、push 完了: `chore/adopt-shared-workflows` → origin
- MR 自動作成: `scripts/auto-push-and-mr.ps1` で対応（Auto-Merge 有効化）
  - 実行前提: 環境変数 `GITLAB_TOKEN` が必要
  - 代替: Web UI で MR 作成 → Auto-Merge (when pipeline succeeds) 有効化

Trigger: re-run Docs & Pages with updated workflow
