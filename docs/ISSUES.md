# Issues (Project Hub)

GitLab 上の Issue は後段で移行予定のため、当面は本ファイルを唯一のマスターとして運用します。

## 完了（Done）
- [x] docs: README を Web アプリ仕様に全面更新（拡張機能の記述を削除）
- [x] feat: Web アプリの土台を追加（`index.html`, `scripts/main.js`, `styles/main.css`）
- [x] chore: レガシーファイル（`app.html`, `app.js`, `background.js`, `manifest.json`, `styles.css`）を `legacy/` へ移動
- [x] build(ci): `lint` ステージ（Prettier/ESLint）導入、Windows 互換の `npm run lint` を設定
- [x] chore: Prettier/ESLint の ignore を整理（`legacy/`, `docs/` を除外）

## 進行中（In Progress）
- [ ] MR: `chore/workflow-ci-lint` のレビュー/マージ（手動で作成）
- [ ] QA: `docs/TESTING.md` に沿った手動テストの実行とフィードバック反映

## バックログ（To Do）

- [ ] feat(P1): 同期アルゴリズムの改善（基準選択/ドリフト補正/遅延対策）
  - 受け入れ基準:
    - 指定した基準プレイヤーに対し、他プレイヤーの時刻差が許容範囲（例: ±0.3s）に収まる
    - バッファリング/広告発生時のフォールバック動作を定義し、同期崩れを自動復帰
    - 閾値・同期頻度を設定化（UI もしくは定数）

- [ ] feat(P1): 永続化の改善（localStorage フォールバック）
  - 受け入れ基準:
    - `chrome.storage` が無い環境でも、追加済み動画と音量設定がブラウザ再読込で復元される
    - 既存挙動を損なわない（優先度: chrome.storage > localStorage）

- [ ] feat(P2): プリセット/ブックマーク（URL セット保存・読み込み・共有）
  - 受け入れ基準:
    - 現在の動画セット（ID/タイトル）を保存/読み込み
    - 共有用 URL（クエリ or 短縮 URL）から復元可能

- [ ] feat(P2): 音声コントロール拡張（個別ミュート/ソロ）
  - 受け入れ基準:
    - 各タイルの個別ミュート/ソロ切替が可能
    - グローバル操作との整合（ソロ中の全体ミュートなど）

- [ ] feat(P2): レイアウト改善（ドラッグ&ドロップ並べ替え/プリセット）
  - 受け入れ基準:
    - タイルをドラッグ&ドロップで並べ替え可能
    - レイアウトプリセットを保存/適用可能

- [ ] feat(P2): キーボードショートカット（再生/停止/同期/音量/速度）
  - 受け入れ基準:
    - 主要操作（再生/停止/同期/音量/速度）に対するショートカットが動作
    - ショートカット一覧をヘルプに表示

- [ ] feat(P3): タイル操作の拡張（削除/個別ボリューム/個別速度）
  - 受け入れ基準:
    - 各タイルのコンテキストメニューから削除・音量・速度が操作可能

- [ ] chore(P3): GitHub ミラーの追加と運用（手動）
  - 受け入れ基準:
    - GitHub リポジトリを作成し、`github` リモートとして追加（手動）
    - 主要ブランチ/タグの同期運用手順を `docs/WORKFLOW.md` に追記

- [ ] docs(P3): JSDoc 整備と Doxygen 連携（`scripts/main.js`）
  - 受け入れ基準:
    - 主要関数/データ構造に JSDoc を付与し、Doxygen で HTML 化

- [ ] test(P3): E2E 自動化方針（Playwright）
  - 受け入れ基準:
    - 主要フロー（追加/再生/停止/同期/削除/音量/速度）のシナリオを整理し、優先度付け

---

運用メモ:
- MR/Issue の作成は当面「手動」で実施します（セキュリティポリシーに準拠）。
- 自動登録が必要になった場合は `scripts/create-issues.ps1` を使用（`GITLAB_TOKEN` 必要）。
