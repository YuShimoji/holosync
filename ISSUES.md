# Backlog / Issues (Local Tracking)

GitLab の Issue 作成用テンプレートとスクリプトを用意済みですが、PAT 未設定のため一時的にローカルで管理します。

## 未作成（GitLab 移行予定）
- [ ] docs: READMEの内容と実装の整合性を確認・更新
  - 現在の README は Chrome 拡張ベースの内容。実装は Web アプリ（`index.html`/`scripts/main.js`）。整合性を取る。
- [ ] feat: 同期アルゴリズムの改善（基準選択/ドリフト補正/遅延対策）
  - 基準プレイヤー選定、ドリフト検知/補正、バッファリング時の追従、広告停止の扱い
- [ ] feat: プリセット/ブックマーク機能（URLセット保存・読み込み・共有）
- [ ] feat: キーボードショートカット（再生/停止/同期/音量/速度）
- [ ] feat: レイアウト改善（ドラッグ&ドロップ並べ替え/プリセット）
- [ ] feat: 音声コントロールの拡張（個別ミュート/ソロ）
- [ ] chore: GitHubミラーの追加（リモート設定と同期運用）
- [ ] test: E2E自動化方針の検討（Playwright）

## 進め方
1. `scripts/create-issues.ps1` を利用してGitLabに一括作成（`GITLAB_TOKEN` 環境変数が必要）
2. 作成後、本ファイルは GitLab の Issue リンク集に置き換え
