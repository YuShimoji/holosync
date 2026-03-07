# WORKFLOW STATE SSOT

## Mission

**ES Module Phase 2分割と仕様管理基盤の整備**
（同期v2実装完了・ISSUES.md棚卸し完了を受け、コード構造整理とドキュメント基盤構築を次の主目標とする）

## Done 条件

- [x] 同期アルゴリズムv2（3段階drift補正、グループ対応、least-buffered修復）
- [x] ES Module Phase 1（state/share/search/history抽出）
- [x] ISSUES.md棚卸し（完了タスク移動、重複統合、散在ファイル削除）
- [x] `README.md` に `dist` 再生成手順を記載
- [x] ~~`.shared-workflows` 更新運用~~ → submodule廃止済み
- [ ] ES Module Phase 2（main.jsからplayer.js/sync.js抽出）
- [ ] spec-index.json作成（CLAUDE.md必須要件）
- [ ] Playwright UI回帰テスト追加
- [ ] `dist/HoloSync-win32-x64/HoloSync.exe` でホットフィックス挙動を手動確認

## 選別規則

当面は以下の作業分類に従い、D（将来のための品質や汎化）は凍結とする。

- A. コア機能・目的の達成
- B. 制作/開発速度の向上・互換設定
- C. 失敗からの復旧しやすさ
- D. テスト拡充、過度なレポート、当面に直結しないリファクタリング → **凍結**

## 禁止事項

- `dist/` 以下のファイルはビルド成果物であるため、直接編集しないこと（ソース変更後は必ず `npm run build` を実行する）。
- Issue や MR の自動作成は、GitHub トークンが明示的に設定されていない限り行わず、基本は手動操作やドキュメントベースで管理すること。
- UIや基本機能（同期処理、プレイヤー管理など）の既存アーキテクチャを、事前の相談なしに大きく破壊・リファクタリングしないこと。
- 常に本ファイル（`docs/WORKFLOW_STATE_SSOT.md`）及び `CLAUDE.md` の指針を正とすること。
