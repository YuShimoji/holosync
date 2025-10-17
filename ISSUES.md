# Issues (Project Hub)

## 新規: 中央ワークフロー採用（shared-workflows）

- 種別: chore
- 目的: 本リポジトリのCI運用を中央標準（YuShimoji/shared-workflows）へ統一
- 受け入れ基準:
  - `.github/workflows/` のワークフローが中央の再利用ワークフローを参照（`ci-smoke.yml@main`）
  - ルートに `DEVELOPMENT_PROTOCOL.md` を配置（中央プロトコルへのリンクを記載）
  - ルートに `AI_CONTEXT.md` を配置（作業記録用の空テンプレ）
- 作業項目:
  - [x] ブランチ作成: `chore/adopt-shared-workflows`
  - [x] `.github/workflows/lint.yml` を作成し中央ワークフロー `@main` を参照
  - [x] CIのスモークに必要な `scripts/dev-server.js` と `scripts/dev-check.js` を追加
  - [x] `DEVELOPMENT_PROTOCOL.md` と `AI_CONTEXT.md` を追加
  - [x] PR作成（Auto-merge on green）
    - PR: https://github.com/YuShimoji/holosync/pull/15
- 備考:
  - 中央リポジトリ: https://github.com/YuShimoji/shared-workflows
  - 参照ブランチ: `main`（安定版）
