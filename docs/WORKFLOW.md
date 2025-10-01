# 開発ワークフロー（HoloSync）

このドキュメントは、HoloSyncの開発・運用を円滑に進めるための標準ワークフローを定義します。Issueベースの運用、ブランチ戦略、コミット規約、MRフロー、CI/CD、品質ゲート（Lint/Format）を含みます。

## 目的

- 誰でも同じ手順で開発・レビュー・リリースができること
- Issueベースで進捗が見えること（カンバン運用）
- コード品質をCIで自動検証すること（ESLint/Prettier）

## Issue運用

- 種類: `Feature`（新機能）, `Bug`（不具合）, `Task/Chore`（雑務/整備）
- テンプレート: `.github/ISSUE_TEMPLATE/` に3種用意（Feature/Bug/Task）。新規作成時にテンプレートを必ず選択
- ラベル例: `type::feature`, `type::bug`, `type::task`, `priority::P0..P3`, `size::S/M/L`
- カンバン: `To Do` → `In Progress` → `Review` → `Done`
- 参照: Issueに必ず根拠情報（スクショ、ログ、関連PR/ドキュメント）を添付

## ブランチ戦略

- デフォルトブランチ: `main`
- 作業ブランチ: `feature/<issue-number>-<slug>` 例: `feature/42-sync-tolerance-ui`
  - ドキュメント作業のみ: `docs/<topic>` 例: `docs/workflow`
  - メンテ・雑務: `chore/<topic>`
- 作業は必ずIssue起点。ブランチ説明にIssueリンクを含める

## コミット規約（Conventional Commits）

- 例: `feat(sync): 同期許容差のUIを追加`, `fix(player): 削除後に再生状態が残る問題を修正`, `docs(readme): 使用方法を追記`
- 主な種類: `feat`, `fix`, `docs`, `chore`, `refactor`, `build`, `ci`, `test`

## Pull Request（PR）フロー

1. Issueを参照するPRを作成（テンプレート `.github/pull_request_template.md` を使用）
2. CI（GitHub Actions）が通ること（`Lint` ワークフロー、必要に応じて `Docs & Pages`）
3. レビュー観点: 動作確認手順, 受け入れ条件, UIスクショ/動画, 影響範囲, 逆レビュー観点
4. Auto-Merge（squash）と作業ブランチ自動削除を有効化。Checks通過後に自動マージ

## CI/CD（GitHub Actions）

- ワークフロー:
  - `.github/workflows/doxygen-pages.yml`: Doxygen 生成と GitHub Pages へ公開（main）
- 注意: GitLab CI（`.gitlab-ci.yml`）は併存するが、運用は GitHub Actions を基本とする

## 品質ゲート（Lint/Format）

- ESLint/Prettierを導入。ローカルでは `npm run lint` / `npm run format:check`
- 可能であれば `husky + lint-staged` を有効化（`npm run prepare` を実行）

## テスト運用

- 手動E2Eテスト手順を `docs/TESTING.md` に定義
- PRでは必ず主要ケースを自己確認（追加/再生/停止/同期/削除/音量/速度/レスポンシブ/エラー）
{{ ... }}
## 参考

- 運用思想: `docs/choices-driven-development.md`
- GitHub Actions: `.github/workflows/`
