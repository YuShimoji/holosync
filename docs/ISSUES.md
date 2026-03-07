# Issues (Project Hub)

GitHub Issue への移行は未完了のため、本ファイルをマスターとして運用する。

## 完了（Done）

- [x] docs: README を Web アプリ仕様に全面更新（拡張機能の記述を削除）
- [x] feat: Web アプリの土台を追加（`index.html`, `scripts/main.js`, `styles/main.css`）
- [x] chore: レガシーファイルを `legacy/` へ移動
- [x] build(ci): `lint` ステージ（Prettier/ESLint）導入
- [x] chore: Prettier/ESLint の ignore を整理
- [x] MR: `chore/workflow-ci-lint` のレビュー/マージ
- [x] docs: テスト手順に検索・プリセット・字幕関連ケースを追記
- [x] feat(P3): 同期アルゴリズムの改善（バッファリング・広告耐性）
- [x] feat(Pα): 検索導線拡張（YouTube Data API検索 + プリセット機能）
- [x] feat(P1): 同期アルゴリズムの改善（基準選択/ドリフト補正/遅延対策）
  - v2: least-bufferedモード修復、3段階drift補正(softTolerance/速度微調整/seekTo)、グループ対応同期
- [x] feat(P1): 自動回復/リトライ強化（ロード失敗/広告/バッファリング）
- [x] chore(P1): 同期デバッグパネル（内部状態可視化）
- [x] feat(P1): 永続化の改善（localStorage/IndexedDB/URL共有）
- [x] feat(P2): レイアウトカスタマイズ（プリセット/編集/ドラッグ並べ替え）
  - Phase 5: フリーサイズリサイズ、セル配置モード、ドラッグ移動、行間余白制御
- [x] feat(P2): キーボードショートカット（再生/停止/同期/音量/速度/選択）
- [x] feat(P2): 音声コントロール拡張（個別ミュート/ソロ/正規化の下準備）
- [x] feat(P2): 動画情報表示UI（長さ/解像度/字幕/チャプター）
- [x] feat(P2): 埋め込みパラメータUI（controls/modestbranding/rel/playsinline）
- [x] chore(P1): YouTube API キー/クオータ管理UI
- [x] feat(P1): Syncヘルス指標（ドリフト/復帰時間の可視化）
- [x] test(P2): E2Eテスト自動化（Playwright基盤構築）
- [x] chore(P1): shared-workflows submodule廃止（2026-03-07）
- [x] docs(P1): README.md に dist 再生成手順を追記
- [x] refactor: main.js ES Module化 + Phase 1分割（state/share/search/history抽出）

## 進行中（In Progress）

- [ ] refactor(P2): main.js Phase 2分割（player.js/sync.js抽出）
  - Phase 1完了(e09a82c)。Phase 2は計画のみ。

## バックログ（To Do）

### P1（高優先）

- [ ] feat(P1): パフォーマンス最適化（10+タイルの遅延ロード/仮想化）
  - 受け入れ基準: 大規模表示時に操作のカクつきが許容内（目標: 60fps近傍）

- [ ] feat(P1): オーディオマスター固定（音声源の指定/切替）
  - 受け入れ基準: 選択タイルの音声を優先し、他を自動ミュート/減衰

### P2（中優先）

- [ ] feat(P2): プリセット/ブックマーク（URL セット保存・読み込み・共有）
  - 受け入れ基準: 現在の動画セットを保存/読み込み、共有URL/QRから復元可能

- [ ] feat(P2): プレイリスト/チャンネルからの一括追加
  - 受け入れ基準: playlistId/channelId 指定で複数動画を一括追加、並び替え対応

- [ ] feat(P2): 共有URLの強化（時刻/速度/レイアウトを含むディープリンク）
  - 受け入れ基準: 現在状態をURLにエンコードして共有/復元

- [ ] feat(P2): 検索拡張（履歴/フィルタ/関連動画サジェスト）
  - 受け入れ基準: クエリ履歴保持、長さ/チャンネル等フィルタ、関連動画表示

- [ ] feat(P2): 高度な再生コントロール（マスターシークバー/個別オフセット）

- [ ] feat(P2): タイムスタンプ抽出・ジャンプ機能（概要欄/コメント）
  - 受け入れ基準: YouTube Data APIで説明からタイムスタンプを抽出・クリックでシーク

- [ ] feat(P2): タイムスタンプブックマーク（視聴ノート）
  - 受け入れ基準: 各動画の任意時刻を保存/名称付与/共有

- [ ] feat(P2): テーマ/ダークモード・アクセシビリティ
  - 受け入れ基準: ダーク/ライト切替、コントラスト/フォントサイズ設定

- [ ] feat(P2): 国際化（i18n）
  - 受け入れ基準: 言語切替（日本語/英語優先）、文言辞書化

- [ ] feat(P2): PWA 対応（オフライン/キャッシュ）
  - 受け入れ基準: インストール可能、主要画面のオフライン閲覧

- [ ] feat(P2): 設定のエクスポート/インポート（JSON）
  - 受け入れ基準: プリセット/ショートカット/レイアウト/埋め込み設定の保存/復元

- [ ] feat(P2): オンボーディング/チュートリアル（初回ガイド/キーバインド）

- [ ] feat(P2): サムネイル先読み/`youtube-nocookie` 切替オプション

- [ ] docs(P2): JSDoc整備

- [ ] perf(P2): パフォーマンスプロファイリングと最適化

- [ ] a11y(P2): アクセシビリティ改善（ARIA/キーボードナビ/スクリーンリーダー）

- [ ] security(P2): セキュリティ強化（APIキー暗号化/XSS対策/CSP）

- [ ] chore(P2): エラーテレメトリ導入（Sentry等）

- [ ] test(P2): Playwright UI回帰テスト追加（全画面/履歴/概要/没入表示）

- [ ] ops(P2): GitHubトークン設定後にGitHub Issue自動起票

### P3（長期）

- [ ] feat(P3): アドバンスド自動編集（字幕装飾・ワイプ・チャプター）
- [ ] feat(P3): リアルタイムコラボレーション（セッション共有/同時操作）
- [ ] feat(P3): アナリティクス（匿名の使用統計/パフォーマンス）
- [ ] feat(P3): プラグインシステム（同期アルゴリズム/UI拡張の拡張ポイント）
- [ ] feat(P3): 音声処理（分離/正規化/ノイズ抑制）※WebAudio前提
- [ ] feat(P3): セッションエクスポート（JSON/CSV、制約調査含む）
- [ ] feat(P3): セッション記録/再生（操作マクロ）
- [ ] feat(P3): 機能フラグ（実験機能のオン/オフ）
- [ ] feat(P3): クラウドプリセット同期（GitHub Gist/匿名）
- [ ] feat(P3): マルチプラットフォーム埋め込み（Vimeo/Twitch）
- [ ] feat(P3): コラボ役割（ホスト/ゲスト）と招待リンク
- [ ] docs(P3): JSDoc + Doxygen 連携
- [ ] test(P3): E2E自動化方針（Playwright拡充）

---

運用メモ:
- GitHub Issue 移行が完了するまで、本ファイルをマスターとする
- 自動起票は `scripts/create-issues.ps1` を使用（GitHubトークン必要）
