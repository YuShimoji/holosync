# HoloSync

マルチ動画 YouTube 同期再生 Web アプリ + Electron ラッパー。JavaScript / HTML5 / CSS3。

## Key Paths

- Source: `scripts/`
- Entry: `index.html`
- Modules: storage.js → state.js → player.js → sync.js → main.js
- UI modules: layout.js, ui.js, debug.js, electron.js, input.js（全14モジュール、循環依存なし）

## Rules

- Respond in Japanese
- No emoji
- Use Serena's symbolic tools (find_symbol, get_symbols_overview) instead of reading entire source files
- When exploring code, start with get_symbols_overview, then read only the specific symbols needed
- Keep responses concise — avoid repeating file contents back to the user
- `dist/` 以下は直接編集しない（`npm run build` で再生成）
- UIや基本機能の既存アーキテクチャを事前相談なしに大きく変更しない

## DECISION LOG

| 日付       | 決定事項                                                     | 選択肢                                                      | 決定理由                                                                                             |
| ---------- | ------------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 2026-03-07 | 同期アルゴリズムv2: 3段階drift補正                           | softTolerance段階方式 / 即seekTo方式                        | 視聴体験の滑らかさと同期精度の両立                                                                   |
| 2026-03-07 | ES Module 14モジュール分割                                   | 14モジュール / より細かく / monolith維持                    | main.js肥大化解消、循環依存なしを維持できる粒度                                                      |
| 2026-03-07 | shared-workflows submodule廃止                               | 廃止 / 維持                                                 | 単一プロジェクトでのsubmodule管理コストが利点を上回る                                                |
| 2026-03-07 | WORKFLOW_STATE_SSOT.md廃止→CLAUDE.md統合                     | 統合 / 併存                                                 | SSOTの二重管理を排除                                                                                 |
| 2026-03-08 | テスト基盤: Playwright Chromiumのみ                          | 全ブラウザ / Chromiumのみ                                   | Electronターゲット+CI速度重視                                                                        |
| 2026-03-08 | パフォーマンス最適化: IntersectionObserver+staggered loading | lazy-load方式 / eager-load維持                              | 多タイル時のページ負荷軽減                                                                           |
| 2026-03-08 | 次フェーズ方針: コンテンツ活用フェーズ(C)                    | 体験深化(A) / 公開準備(B) / コンテンツ活用(C)               | YouTube APIを活かした機能拡張を優先                                                                  |
| 2026-03-08 | 次フェーズ方針: 共有・復元強化(A)                            | 共有・復元(A) / 操作性深化(B) / 公開準備(C) / 新機能探索(D) | 復元性(C)重視。URL時刻/JSON設定/プリセットUI                                                         |
| 2026-03-08 | P2再編成: 16件→P2: 4件、Done: 8件、P3降格: 7件               | 全採用 / 部分採用 / 個別確認                                | 実コード照合で完了・凍結を判定                                                                       |
| 2026-03-08 | マスターシークバー配置: サイドバー一括操作内                 | サイドバー内 / グリッド上部 / 画面下部固定                  | コンパクト、既存UIとの一貫性                                                                         |
| 2026-03-08 | シークバー基準: リーダー動画duration                         | リーダー動画 / 最長動画                                     | 同期ロジックとの整合性                                                                               |
| 2026-03-08 | チャンネル一括追加→チャンネルLive監視に方針転換              | 最新動画追加 / チャンネル内検索 / Live監視 / 見送り         | チャンネル登録→ライブ配信自動取得・再生が真のユースケース。単純な動画追加はプレイリストURLで代替可能 |
| 2026-03-08 | SP-006からチャンネル対応を分離                               | 含める / 分離                                               | プレイリスト一括追加は完了。チャンネルLive監視は別機能として独立追跡                                 |
| 2026-03-08 | プレイリスト順次再生: キューモード(A)を採用                  | キューモード(A) / iframeネイティブ(B) / タイル分配(C)       | 1タイルで順次再生+他タイルとの同期維持。Cは必要時に検討                                              |
| 2026-03-08 | loadVideoById: ALLOWED_COMMANDSに追加                        | postMessage切替 / iframe.src書替                            | iframe再読み込み不要でシームレスな動画切替                                                           |

## Done条件（P2バックログ消化フェーズ）

- [x] feat(P2): youtube-nocookie ドメイン切替オプション
- [x] feat(P2): プレイリストキューモード（1タイル順次再生、自動進行、次/前ボタン）

### 前フェーズ（操作性深化 -- 完了）

- [x] feat(P2): マスターシークバー（リーダー動画基準、rAFベース更新、オフセット考慮seekTo）

### 前フェーズ（共有・復元強化 -- 完了）

- [x] feat(P2): 共有URLの強化（再生時刻のエンコード/復元）
- [x] feat(P2): 設定のエクスポート/インポート（JSON形式）
- [x] feat(P2): プリセットUI整備（保存・一覧・読込・削除の操作UI）— 調査の結果、既に実装済み

### 前々フェーズ（コンテンツ活用 -- 完了）

- [x] feat(P1): オーディオマスター固定（音声源の指定/切替 + sync回復・lazy-load・削除時の堅牢化）
- [x] feat(P2): プレイリスト一括追加（playlistItems.list API、単体/一括/D&D対応）
- [x] feat(P2): 検索拡張（履歴ドロップダウン/長さ・並び順フィルタ）
- [x] feat(P2): タイムスタンプ抽出・ジャンプ機能（説明文から自動検出、クリックでseekTo）

### 前々フェーズ（基盤整備 -- 完了）

- [x] 同期アルゴリズムv2（3段階drift補正、グループ対応）
- [x] ES Module Phase 1-3.5（全14モジュール分割完了、main.js 381行）
- [x] ISSUES.md棚卸し + レガシー資産削除
- [x] spec-index.json作成
- [x] Playwright UI回帰テスト追加
- [x] `dist/HoloSync-win32-x64/HoloSync.exe` でホットフィックス挙動を手動確認

## 選別規則

- A. コア機能・目的の達成
- B. 制作/開発速度の向上・互換設定
- C. 失敗からの復旧しやすさ
- D. テスト拡充、過度なレポート、当面に直結しないリファクタリング → **凍結**
