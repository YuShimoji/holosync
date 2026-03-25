# HoloSync

マルチ動画 YouTube 同期再生 Web アプリ + Electron ラッパー。JavaScript / HTML5 / CSS3。

## PROJECT CONTEXT

プロジェクト名: HoloSync
環境: Node.js 20 / Electron / JavaScript ES Modules / Playwright (Chromium)
ブランチ戦略: main (トランクベース)
現フェーズ: SP-021 UI/UX洗練 Phase 1
直近の状態 (2026-03-26):

- SP-021 UI/UX洗練 Phase 1: 3/11件実装済み (F-03ツールバーアイコン化, F-06情報オーバーレイ, F-11フォーカスモード)
- レガシー根絶: 孤立CSS 286行削除, デッドJS削除, getChromeStorageバグ修正, --color-accent未定義修正
- E2E 15/15 PASS, ESLint clean
- 仕様: 21エントリ (18 done + 1 deprecated + 1 superseded + 1 partial/SP-021 pct30)
- docs: feature-audit.md (機能状態テーブル), runtime-state.md 新設

## CURRENT DEVELOPMENT AXIS

- 主軸: UI/UX洗練 Phase 1 (SP-021)
- この軸を優先する理由: 基本機能は安定(E2E 15/15)だが、YouTube視聴体験としての洗練度にギャップ。11件のUX摩擦をユーザーが明示
- 今ここで避けるべき脱線: OAuth / Electron配布 / 新規コア機能

## CURRENT LANE

- 主レーン: Experience Slice (UI/UX)
- 副レーン: なし
- 今このレーンを優先する理由: ユーザーが11件の具体的UX摩擦を特定。視聴体験の品質が主要課題
- いまは深入りしないレーン: Runtime Core, Acceptance/E2E拡充, ドキュメント整合

## CURRENT SLICE

- スライス名: SP-021 UI/UX洗練 Phase 1
- 操作列: 動画追加 → ワンアクション最大化 → YouTube風コントロール操作 → 情報確認(展開) → 別動画クリック(アプリ内再生)
- 成功条件: 動画追加→最大化視聴が3操作以内 / ツールバーのボタン数半減(折りたたみ含む) / 動画情報が動画領域を圧迫しない / 動画クリックで外部ブラウザが開かない
- 基盤能力: fitmode.js拡張 / タイルUI改修 / Electron window制御
- 実装フェーズ: Phase A(情報密度) → Phase B(最大化/フィット) → Phase C(操作体験) → Phase D(拡張)

## Key Paths

- Source: `scripts/`
- Entry: `index.html`
- Modules: storage.js → state.js → player.js → sync.js → main.js
- UI modules: layout.js, ui.js, debug.js, electron.js, input.js, zoom-loupe.js, fitmode.js（全16モジュール、循環依存なし）

## Rules

- Respond in Japanese
- No emoji
- Use Serena's symbolic tools (find_symbol, get_symbols_overview) instead of reading entire source files
- When exploring code, start with get_symbols_overview, then read only the specific symbols needed
- Keep responses concise — avoid repeating file contents back to the user
- `dist/` 以下は直接編集しない（`npm run build` で再生成）
- UIや基本機能の既存アーキテクチャを事前相談なしに大きく変更しない

## DECISION LOG

| 日付       | 決定事項                                                               | 選択肢                                                           | 決定理由                                                                                                               |
| ---------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 2026-03-07 | 同期アルゴリズムv2: 3段階drift補正                                     | softTolerance段階方式 / 即seekTo方式                             | 視聴体験の滑らかさと同期精度の両立                                                                                     |
| 2026-03-07 | ES Module分割（現在: 全16モジュール）                                  | 14モジュール / より細かく / monolith維持                         | main.js肥大化解消、循環依存なしを維持できる粒度。channel.js+fitmode.js追加で最終16モジュール                           |
| 2026-03-07 | shared-workflows submodule廃止                                         | 廃止 / 維持                                                      | 単一プロジェクトでのsubmodule管理コストが利点を上回る                                                                  |
| 2026-03-07 | WORKFLOW_STATE_SSOT.md廃止→AGENTS.md統合                               | 統合 / 併存                                                      | SSOTの二重管理を排除                                                                                                   |
| 2026-03-08 | テスト基盤: Playwright Chromiumのみ                                    | 全ブラウザ / Chromiumのみ                                        | Electronターゲット+CI速度重視                                                                                          |
| 2026-03-08 | パフォーマンス最適化: IntersectionObserver+staggered loading           | lazy-load方式 / eager-load維持                                   | 多タイル時のページ負荷軽減                                                                                             |
| 2026-03-08 | 次フェーズ方針: コンテンツ活用フェーズ(C)                              | 体験深化(A) / 公開準備(B) / コンテンツ活用(C)                    | YouTube APIを活かした機能拡張を優先                                                                                    |
| 2026-03-08 | 次フェーズ方針: 共有・復元強化(A)                                      | 共有・復元(A) / 操作性深化(B) / 公開準備(C) / 新機能探索(D)      | 復元性(C)重視。URL時刻/JSON設定/プリセットUI                                                                           |
| 2026-03-08 | P2再編成: 16件→P2: 4件、Done: 8件、P3降格: 7件                         | 全採用 / 部分採用 / 個別確認                                     | 実コード照合で完了・凍結を判定                                                                                         |
| 2026-03-08 | マスターシークバー配置: サイドバー一括操作内                           | サイドバー内 / グリッド上部 / 画面下部固定                       | コンパクト、既存UIとの一貫性                                                                                           |
| 2026-03-08 | シークバー基準: リーダー動画duration                                   | リーダー動画 / 最長動画                                          | 同期ロジックとの整合性                                                                                                 |
| 2026-03-08 | チャンネル一括追加→チャンネルLive監視に方針転換                        | 最新動画追加 / チャンネル内検索 / Live監視 / 見送り              | チャンネル登録→ライブ配信自動取得・再生が真のユースケース。単純な動画追加はプレイリストURLで代替可能                   |
| 2026-03-08 | SP-006からチャンネル対応を分離                                         | 含める / 分離                                                    | プレイリスト一括追加は完了。チャンネルLive監視は別機能として独立追跡                                                   |
| 2026-03-08 | プレイリスト順次再生: キューモード(A)を採用                            | キューモード(A) / iframeネイティブ(B) / タイル分配(C)            | 1タイルで順次再生+他タイルとの同期維持。Cは必要時に検討                                                                |
| 2026-03-08 | loadVideoById: ALLOWED_COMMANDSに追加                                  | postMessage切替 / iframe.src書替                                 | iframe再読み込み不要でシームレスな動画切替                                                                             |
| 2026-03-09 | チャンネル監視ポーリング間隔: UI設定可能                               | 固定15分 / 設定可能                                              | 既定値15分、1-60分の範囲でユーザーが調整可能。監視チャンネル数・クォータ状況に応じて柔軟対応                           |
| 2026-03-09 | 新規ライブ自動追加: 実装                                               | 実装する / 通知のみ                                              | 枠移動などの場面があるため、新規ライブを自動でタイル追加。既存タイルの重複チェック済み                                 |
| 2026-03-10 | レイアウト補正トリガー: UIイベント通知 + body.class監視フォールバック  | UI側のみ通知 / layout側でDOM監視 / 併用                          | 既存アーキテクチャを壊さず、通知未発火時の取りこぼしを低リスクで防ぐ                                                   |
| 2026-03-10 | frameless dragは専用ハンドル方式を採用                                 | toolbar全面drag / 専用ハンドル / 広域drag                        | iframe衝突と誤操作を最小化し、安定性優先                                                                               |
| 2026-03-10 | UI chrome管理: immersive/sidebar/toolbar状態の永続化と復帰パスを安定化 | 全状態再計算 / toolbar単独 / edge reveal含む安定化               | 全画面終了時の確実な状態復帰と、狭幅時の制御優先度を明確化                                                             |
| 2026-03-12 | AGENTS.md廃止→CLAUDE.md一本化                                          | 統合削除 / 同期維持 / 保留                                       | WORKFLOW_STATE_SSOT.md統合と同じ理由。SSOTの二重管理を排除                                                             |
| 2026-03-12 | 次フェーズ方針: UX磨き上げ（動画追加の手間削減）                       | UX磨き上げ(A) / 公開準備(B) / 新機能探索(C) / Electron強化(D)    | 実運用でのペインポイントが「動画追加の手間」。基本機能は揃っているため体験の質を優先                                   |
| 2026-03-13 | タイルUI改善を次フェーズとして着手                                     | タイルUI改善 / Watch History UX / 新機能                         | 検証で発見されたUI発見性の低さ（ドラッグハンドル/オーディオマスター/syncBadge重なり）を優先                            |
| 2026-03-14 | サイドバーアコーディオン: `<details>/<summary>`でネイティブ実装        | details/summary / JSアコーディオン / ライブラリ使用              | ブラウザネイティブ、JSなしで動作、CSSトランジション可能                                                                |
| 2026-03-14 | アコーディオン3グループ: ライブラリ/チャンネルLive監視/設定            | 3グループ / 4グループ / 全セクション個別                         | 頻度で分類。高頻度（動画追加+一括操作）は常時表示、中低頻度を3アコーディオンに集約                                     |
| 2026-03-14 | Electron confirm()をcontextBridge経由のdialog APIに置換                | contextBridge / preload直接 / renderer内                         | contextIsolation:trueでpreloadのwindow.confirmはrendererに届かない。contextBridge必須                                  |
| 2026-03-14 | 一括操作: 4ボタン→2トグル+同期アイコン+詳細折りたたみ                  | テキストボタン維持 / アイコン化 / ツールバー移動                 | サイドバー幅を圧迫していた。高頻度(再生/ミュート)をトグル化、低頻度(速度/音量)を折りたたみに                           |
| 2026-03-14 | フレームレスドラッグ: グリッド+サイドバー空白+Alt+iframe上             | 空白のみ / Alt+ドラッグ / タイトルバー帯                         | 空白だけでは動画が画面を占めると移動不能。Altキーで透明オーバーレイ前面化→時分割でiframe操作と両立                     |
| 2026-03-14 | オーディオマスター表示: box-shadow強化+♪バッジ(CSS疑似要素)            | JSでバッジ要素追加 / CSS疑似要素 / アニメーション                | CSS ::afterのみでJS変更不要。bottom-leftに配置しsyncBadge(top-left)との干渉を回避                                      |
| 2026-03-17 | Live Edge Sync: ライブ配信時seekTo抑制                                 | seekTo維持 / 全スキップ / オフセット時のみ許可                   | ライブのcurrentTimeはDVR相対値でseekToが逆効果。play/pause同期のみに制限                                               |
| 2026-03-17 | 音声/映像解析による自動遅延検出: 不採用                                | 音声フィンガープリント / 映像解析 / 手動オフセット               | YouTube iframeはcross-originでcaptureStream/Canvas取得不可。技術的に実装不能。手動オフセットで代替                     |
| 2026-03-18 | SP-002 superseded化                                                    | 内容更新 / superseded / 削除                                     | 2025-10-19のフェーズα初期原案。機能はSP-007/010/018/019に分散実装済み。原案を残しつつsuperseded注記                    |
| 2026-03-19 | SP-020 レイアウトUX摩擦5件を一括修正                                   | 個別対応 / 一括修正 / 後送り                                     | ユーザーフィードバックで特定した5件のUX摩擦。ツールバー固定/自動レイアウト/高さ制限/リサイズ追従/ドラッグ領域分離      |
| 2026-03-23 | SP-021 UI/UX洗練 Phase 1: 11件のUX改善を仕様化+Phase A/B部分実装       | 個別対応 / 一括仕様化+段階実装 / 後送り                          | ユーザーが11件のUX摩擦を明示。Phase A(情報密度)→B(最大化)→C(操作)→D(拡張)の4段階。F-03/F-06/F-11を先行実装             |
| 2026-03-24 | フレームレスボタン: textContent→title/aria-labelに変更                 | textContent維持 / SVG保護(title/aria-label) / setButtonLabel経由 | applyFramelessState()がtextContentでSVGアイコンを破壊していた。他のツールバーボタンはui.jsのsetButtonLabel()で保護済み |

## Done条件（P2バックログ消化フェーズ）

- [x] fix(P2): フリータイル拡縮安定化（リサイズ中reflow削減）
- [x] fix(P2): サイドバー幅改善（280→320px、padding縮小）
- [x] feat(P2): 自動最大化フィット（calcOptimalLayout拡張、全動画画面内フィット）
- [x] feat(P2): チャンネル一括登録プリセット（保存/読込/削除、サイドバーUI）
- [ ] feat(P2): YouTube自チャンネル履歴同期
- [x] feat(P2): 同期アルゴリズム改善 — Live Edge Sync（ライブ配信時seekTo抑制+play/pause同期）、tolerance UIスライダー接続修正、storageAdapter非同期バグ修正

### 前フェーズ（UX磨き上げ -- 完了）

- [x] feat(SP-018): 動画追加UX改善 Phase 1-3（履歴再追加/チャンネルピン/セッション復元/検索一括追加/スマート提案）

### 前々フェーズ（P2バックログ消化 -- 完了）

- [x] feat(P2): youtube-nocookie ドメイン切替オプション
- [x] feat(P2): プレイリストキューモード（1タイル順次再生、自動進行、次/前ボタン）
- [x] feat(P2): チャンネルLive監視（チャンネル登録、live検出、15分間隔ポーリング、新規ライブ自動追加）

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
- [x] ES Module Phase 1-3.5（全15モジュール構成、main.js 381行）
- [x] ISSUES.md棚卸し + レガシー資産削除
- [x] spec-index.json作成
- [x] Playwright UI回帰テスト追加
- [x] `dist/HoloSync-win32-x64/HoloSync.exe` でホットフィックス挙動を手動確認

### 安定化フェーズ（Worker A/B/C -- 完了）

- [x] feat: Layout fit relayout（SP-013）— UI chrome変更時のfit modeレイアウト再計算
- [x] feat: Frameless drag stabilization（SP-014）— 専用dragハンドル方式
- [x] feat: Sidebar/toolbar cleanup stabilization（SP-015）— immersive/sidebar/toolbar状態管理安定化

## 選別規則

- A. コア機能・目的の達成
- B. 制作/開発速度の向上・互換設定
- C. 失敗からの復旧しやすさ
- D. テスト拡充、過度なレポート、当面に直結しないリファクタリング → **凍結**
