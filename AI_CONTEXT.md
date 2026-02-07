# AI Context

## Log: Phase3 sync buffering tolerance

- ブランチ: `feat/phase3-buffer-tolerance`
- Issue: https://github.com/YuShimoji/holosync/issues/16
- 変更概要:
  - `scripts/main.js` にプレイヤー状態トラッキング、サスペンド管理、再同期ロジックを実装
  - `docs/TESTING.md` にバッファリング/広告耐性の手動テストケースを追加
- 残課題:
  - 実機ブラウザでのバッファリング／広告シナリオ手動確認
  - コミット、push、PR（Auto-Merge設定）

## Log: Roadmap refresh for search/customization/auto-editing

- ドキュメント更新:
  - `choices-driven-development.md` を Web アプリ指針に刷新（フェーズα～γ、3案比較）
  - `docs/ISSUES.md` に検索導線/レイアウト/自動編集のバックログを再編成
  - `docs/TESTING.md` に検索・プリセット・字幕装飾・自動チャプターのテストケース(13～17)を追加
- リスク/欠落:
  - `scripts/creativity-booster.js` など中央ルール準拠の補助スクリプトが未整備
  - AI機能導入に伴うAPIキー管理とコスト試算が未着手

## Log: Phase Alpha implementation completed

- 実装完了:
  - ストレージ抽象化レイヤー (scripts/storage.js): chrome.storage/localStorage/URLフォールバック。
  - YouTube検索UI: APIキー入力、検索フォーム、結果表示。
  - プリセット機能: 保存/読込、リスト管理。
  - UI更新: サイドバー拡張、CSS追加。
- 技術選択: YouTube Data API 主軸、オプションB/Cフォールバック。
- テスト: lint/format成功、機能実装完了。
- 次のステップ: フェーズβ（レイアウトプリセット）準備。

## Log: Backlog triage and additions (2025-10-21)

- 目的: 提案機能のトリアージと `docs/ISSUES.md` バックログ更新
- 追加（採用）:
  - P1: 同期自動回復/リトライ強化、同期デバッグパネル、永続化改善
  - P1: YouTube APIキー/クオータ管理UI、Syncヘルス指標
  - P2: レイアウトカスタマイズ、プレイリスト/チャンネル一括追加、共有URL強化
  - P2: キーボードショートカット、音声コントロール拡張、検索拡張
  - P2: テーマ/アクセシビリティ、i18n、PWA、動画情報表示、タイムスタンプブックマーク
  - P3: アドバンスド自動編集、リアルタイムコラボ、アナリティクス、プラグイン、音声処理、セッションエクスポート
  - P3: 機能フラグ、クラウドプリセット（Gist）、セッション記録/再生、エラーテレメトリ
  - 新規検討: パフォーマンス最適化、オーディオマスター固定、設定Export/Import、オンボーディング
  - 新規検討: `youtube-nocookie` 切替、他プロバイダPoC、コラボ役割/招待
- 非採用（今回は追加せず）と理由:
  - サーバサイド映像合成/録画配信: TOS/法務/運用コストが高く現段階のWebアプリ範囲を超える
  - 課金/アカウント管理/SaaS化: 事業要件未定、セキュリティ/法務対応の準備が必要
  - 国内法対応のログ保管/本人確認等: 要件未定、現状は匿名利用想定
  - 専用モバイルアプリ（ネイティブ）: PWA優先。必要性が確認できた段階で再検討
  - 大規模通知配信/サブスク連携: バックエンド常時運用が必要なため優先度低
- 変更反映:
  - `docs/ISSUES.md` のコンフリクト解消とバックログ再編、提案の採用/検討項目を追記
  - 本ログに採否の根拠を記録

## Log: Phase3 sync buffering tolerance follow-up (2025-12-01)

- 概要:
  - `feat/phase3-buffer-tolerance` ブランチは main にマージ済み。
  - GitHub Issue #16 は完了扱い（docs/ISSUES.md の Done セクション参照）。
- テスト状況:
  - docs/TESTING.md ケース12（バッファ/広告耐性）は 2025-10-20 に Chrome/Firefox で実施済み。
- 残タスク:
  - docs/TESTING.md ケース1〜11, 13〜17 の手動テストと結果記録。
  - P2 フェーズ（プレイリスト一括追加、共有URL強化など）の計画と実装。

## Log: UX大規模改善 Phase 1〜4 実装 (2026-02-07)

- 目的: 「マルチ動画プレイヤーとしての実用性」を大幅に向上
- 変更ファイル: `index.html`, `styles/main.css`, `scripts/main.js`, `docs/TESTING.md`
- 実装内容:
  - **Phase 1-1**: サイドバー折りたたみ（◀トグル + ☰復帰ボタン、状態永続化）
  - **Phase 1-2**: レイアウトプリセット（自動/1列/2列/3列/4列/シアターモード、ツールバーUI、永続化）
  - **Phase 1-3**: 個別タイルフルスクリーン（⛶ボタン + ダブルクリック）
  - **Phase 2-1**: 動画情報パネル（oEmbed APIでタイトル/チャンネル取得、Data APIで概要取得、開閉式）
  - **Phase 2-2**: ドラッグ＆ドロップ/クリップボード貼り付けによる動画追加
  - **Phase 2-3**: プリセット一覧改善（サムネイル/動画数/日付/削除機能）
  - **Phase 3-1**: 同期グループ（A/B/C/独立、バッジクリックでサイクル切替、グループ単位で同期）
  - **Phase 3-2**: グループ内リーダー選択（既存pickLeaderをグループ単位で利用）
  - **Phase 3-3**: 動画間オフセット対応 + DAG循環参照チェック（hasCycle関数）
  - **Phase 4-1**: キーボードショートカット（Space/M/U/F/S/Escape/Shift+1〜9）
  - **Phase 4-3**: YouTube埋め込みパラメータ最適化（modestbranding=1, rel=0 デフォルト適用）
  - **Phase 4-4**: オーディオフォーカス（タイルクリックで選択動画のみ音声再生）
- CSS: CSS変数導入（--sidebar-width等）、レイアウトプリセットクラス、タイルUI拡張
- テスト: docs/TESTING.md にケース15〜24を追加。lint 0エラー（警告3件: 未使用変数）
- 残タスク:
  - Phase 3-3 のリファレンスオフセットUI（設定画面）
  - Phase 4-2 ピクチャー・イン・ピクチャー
  - 実機ブラウザでの手動テスト（ケース15〜24）
  - docs/ISSUES.md の完了マーク更新
  - コミット、push、PR

## Log: Phase 5 — タイルリサイズ・フリー配置・余白制御 実装

- 目的: 動画タイルのフリーサイズリサイズ、セルベース配置、行間余白制御、デバッグパネル修正
- 変更ファイル: `index.html`, `styles/main.css`, `scripts/main.js`, `docs/TESTING.md`
- 実装内容:
  - **タスクA**: デバッグパネルの閉じるボタン修正（クリック領域拡大、フレックスレイアウト修正）
  - **Phase 5-1**: セルグリッドオーバーレイ + タイル配置モデル（`cell-mode` クラス、`cell-overlay-container`）
  - **Phase 5-2**: フリーサイズリサイズ（ピクセル単位、`⤡` ハンドル、サイズバッジ表示）
  - **Phase 5-3**: タイルのドラッグ移動（`⋮⋮` ハンドル、セル間移動、ドロップターゲットハイライト）
  - **Phase 5-4**: 行間余白制御（`grid-auto-rows: min-content`、間隔スライダー 0〜24px）
  - **Phase 5-5**: 永続化（`cellCol`, `cellRow`, `tileWidth`, `tileHeight` を videos データに追加）
- UI追加:
  - ツールバーに「フリー配置」レイアウトオプション
  - ツールバーに「間隔」スライダー
  - タイルにリサイズハンドル（右下）とドラッグハンドル（上部中央）
- CSS追加:
  - `.grid.cell-mode`, `.cell-overlay`, `.tile-resize-handle`, `.tile-drag-handle`, `.tile-size-badge`
  - `.gap-controls`, `.gap-slider`
- テスト: docs/TESTING.md にケース27〜31を追加
- 残タスク:
  - 実機ブラウザでの手動テスト（ケース27〜31）
  - コミット、push、PR
