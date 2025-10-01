# chore: GitHub Actions へのCI移行とテンプレート整備

## 目的

- GitHub運用へ移行したため、CIをGitHub Actionsへ統一し、PR/Issueテンプレートを整備する

## 変更内容

- `.github/workflows/lint.yml`: Node 20 で Prettier/ESLint を実行
- `.github/workflows/doxygen-pages.yml`: doxygen+graphviz でドキュメント生成、Pages へデプロイ（main）
- `.github/pull_request_template.md`: PR本文テンプレート
- `.github/ISSUE_TEMPLATE/*`: Feature / Bug / Task テンプレート
- `docs/WORKFLOW.md`: GitHub Actions / PR フローへ記述更新

## 受け入れ基準

1. PR の CI（Lint）が成功する
2. main への push で GitHub Pages が公開される
3. 新規 Issue / PR でテンプレートが適用される

## 影響

- GitLab CIは温存（共存）するが、運用上は GitHub Actions が主
