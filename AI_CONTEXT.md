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

## Next Steps

- Phase3 tolerance:
  - Chrome/Firefox で `docs/TESTING.md` ケース12を実施し、許容差(±0.3s)復帰を記録
  - 広告挿入テスト時は非プレミアムアカウントで復帰時間を秒数記録
  - Issue #16 へ結果報告後、Conventional Commit → push → PR（Auto-Merge設定）
- Roadmap follow-up:
  - フェーズαの実装案選定（YouTube Data API vs OEmbed vs 履歴サジェスト）と試作タスク化
  - レイアウトプリセットUIのプロトタイプ設計（CSS Grid切替案を優先検証）
  - 自動編集機能のPoCスコープ定義（字幕装飾・チャプター生成のAPI比較、コスト試算）
  - `AI_CONTEXT.md` に進捗を継続記録し、`docs/ISSUES.md` と整合させる
