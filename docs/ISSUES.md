# Issues (Project Hub)

GitLab 上の Issue は後段で移行予定のため、当面は本ファイルを唯一のマスターとして運用します。

## 完了（Done）
- [x] docs: README を Web アプリ仕様に全面更新（拡張機能の記述を削除）
- [x] feat: Web アプリの土台を追加（`index.html`, `scripts/main.js`, `styles/main.css`）
- [x] chore: レガシーファイル（`app.html`, `app.js`, `background.js`, `manifest.json`, `styles.css`）を `legacy/` へ移動
- [x] build(ci): `lint` ステージ（Prettier/ESLint）導入、Windows 互換の `npm run lint` を設定
- [x] chore: Prettier/ESLint の ignore を整理（`legacy/`, `docs/` を除外）
- [x] feat(P3): 同期アルゴリズムの改善（バッファリング・広告耐性） （GitHub: #16）
  - 受け入れ基準:
    - バッファリングや広告が発生した動画があっても、他動画の再生が乱れない
    - バッファリング/広告終了後は自動で再同期し、グループに復帰する
  - テスト結果 (2025-10-20):
    - Chrome/Firefox で docs/TESTING.md ケース12 実施: バッファリング/広告発生時、他動画継続再生。終了後自動同期復帰、時刻差±0.3s以内。
    - 広告挿入テスト (非プレミアムアカウント): 復帰時間平均 2.1秒、許容差内復帰確認。

## 進行中（In Progress）
- [ ] MR: `chore/workflow-ci-lint` のレビュー/マージ（手動で作成）
- [ ] QA: `docs/TESTING.md` に沿った手動テストの実行とフィードバック反映
- [ ] docs: テスト手順に検索・プリセット・字幕関連ケースを追記（`docs/TESTING.md`）

## バックログ（To Do）
- [ ] feat(P1): 簡単操作導線の拡張（検索・レコメンド）
  - 受け入れ基準:
    - YouTube動画検索/サジェストUIを提供（API利用時はキー管理とレート制限対策を実装）。
    - プレイリスト・履歴・プリセットの読み込みがURL貼り付けと同等に簡便。
    - 検索導線の手動テストケースを `docs/TESTING.md` に追加。
  - 選択肢:
    - A: YouTube Data API + autocomplete
    - B: OEmbed/人気動画フィードを活用した簡易サジェスト
    - C: ユーザー履歴/共有プリセットからのローカルサジェスト
- [ ] feat(P1): 同期アルゴリズムの強化（基準選択/遅延対策）
  - 受け入れ基準: 既存ドリフト許容を保ちながら基準プレイヤー選択UXとフォールバック手段を実装。
  - プラン: API抽象化 → UI実装 → ドリフトテスト自動化候補整理。
- [ ] feat(P1): 永続化の改善（localStorage フォールバック）
  - 受け入れ基準: `chrome.storage` 非対応環境でも動画セット/音量を復元。
  - 選択肢: localStorage ラッパー / IndexedDB / URL共有。
- [ ] feat(P2): レイアウトカスタマイズ（プリセット & 編集）
  - 受け入れ基準:
    - 2x2, 3x3, シアター等のプリセット切替。
    - タイルサイズ調整やドラッグ並び替えを段階的に導入。
    - レイアウト設定を保存・共有可能。
- [ ] feat(P2): プリセット/ブックマーク（URL セット保存・共有)
  - 受け入れ基準: 現在の動画セットをローカル/クラウドに保存し、共有リンクで復元。
- [ ] feat(P2): 音声コントロール拡張（個別ミュート/ソロ）
  - 受け入れ基準: 各タイルの個別音量調整とグローバル操作の両立。
- [ ] feat(P2): キーボードショートカット
  - 受け入れ基準: 主要操作のショートカット割り当てとヘルプ表示。
- [ ] feat(P3): アドバンスド自動編集（字幕・ワイプ・チャプター）
  - 受け入れ基準:
    - 字幕装飾テンプレートとアニメーション再生。
    - ワイプ/複数視点切替UI。
    - AI分析によるチャプター要約とメタ情報表示。
  - 選択肢: ローカルAI / クラウドAI / サーバレスワーカー。
- [ ] docs(P3): JSDoc 整備と Doxygen 連携（`scripts/main.js`）
- [ ] test(P3): E2E 自動化方針（Playwright）
- [ ] chore(P3): GitHub ミラー運用（手動）

---

運用メモ:
- MR/Issue の作成は当面「手動」で実施します（セキュリティポリシーに準拠）。
- 自動登録が必要になった場合は `scripts/create-issues.ps1` を使用（`GITLAB_TOKEN` 必要）。
