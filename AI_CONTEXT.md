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
