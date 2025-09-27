# Contributing to HoloSync

HoloSyncへの貢献に関するガイドラインです。

## 1. Issue起点
- 作業は必ずIssueから開始
- テンプレート（Feature/Bug/Task）を使用し、目的と受け入れ条件を明確化

## 2. ブランチ
- `feature/<issue-number>-<slug>` 形式
- 小さく短いサイクルでMRを作成

## 3. コミット規約
- Conventional Commits（例: `feat(sync): ...`, `fix(player): ...`）

## 4. コード品質
- ローカル: `npm run lint` / `npm run format:check`
- 可能なら `npm run prepare` で `husky + lint-staged` を有効化

## 5. MR
- `.gitlab/merge_request_templates/Default.md` を使用
- CIが通ること（lint/docs/deploy）

## 6. 動作確認
- `docs/TESTING.md` の手順に従って主要ケースを確認
