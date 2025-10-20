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
