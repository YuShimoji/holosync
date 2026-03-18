# HoloSync Handover

**Updated**: 2026-03-19
**Branch**: `main`
**Status**: SP-020 レイアウトUX摩擦5件修正完了。全20仕様（17 done + 1 deprecated + 1 superseded + 1 todo/SP-020）。Playwright 15/15 passed、ESLint clean。

## 1) 直近セッションで完了したこと

### 2026-03-19（SP-020 レイアウトUX摩擦の解消）
- feat(SP-020/F-5): content-toolbar を position: sticky に変更 — スクロールしてもツールバーが上部に固定される
- feat(SP-020/F-1): 動画追加後に onVideosChanged() を自動呼び出し — input.js (submitSelected/handleDroppedText) + channel.js (ライブ自動追加)
- feat(SP-020/F-3): calcOptimalLayout の count<=1 分岐で containerH を考慮した rowHeight を計算 — 1列時の上下切れ防止
- feat(SP-020/F-2): applyDynamicColumns の coverMode 早期return を除去 + .content に scrollbar-gutter: stable 追加 — リサイズ追従改善
- feat(SP-020/F-4): frameless-mode の -webkit-app-region: drag を .content → .grid に移動 — スクロールバーがドラッグ領域から分離
- docs: SP-020 仕様書作成 (docs/specs/layout-ux-friction.md) + spec-index.json にエントリ追加
- docs: CLAUDE.md CURRENT AXIS/LANE/SLICE を SP-020 に更新

### 2026-03-18 nightshift（ドキュメント整合）
- docs: SP-002 superseded化 — フェーズα初期原案を後続仕様(SP-007/010/018/019)への参照に更新
- docs: spec-index.json SP-002 status:superseded, pct:100 に修正
- docs: CLAUDE.md PROJECT CONTEXT/CURRENT AXIS/LANE/SLICE を最新状態に更新
- docs: TESTING.md に E2E テストと手動テストの対応表を追加
- docs: ISSUES.md 運用メモを簡素化
- docs: HANDOVER.md 状態更新

### 2026-03-17〜18（同期基盤 + ドキュメント整合 + テスト修正）
- feat: Live Edge Sync — ライブ配信時seekTo抑制+play/pause同期のみ (08a17bb)
- feat: ライブ+オフセット時seekTo許可 — 手動オフセット付きフォロワーはseekTo実行 (06ef917)
- fix: storageAdapter非同期バグ — fallbackGet() async化+setItem内await追加 (c519972)
- fix: tolerance UIスライダーがsoft/hardToleranceMsに連動していなかった問題を修正 (c519972)
- fix(test): Playwright テストをPhase 2/3のUI変更に追従 — 15/15 passed (63966b7)
- docs: SP-019 サイドバーUI再設計の仕様本文作成 (665f356)
- docs: HANDOVER.md更新、TESTING.md整合 (665f356, dc81a12)
- CLAUDE.md: CURRENT DEVELOPMENT AXIS / LANE / SLICE 追加、DECISION LOG 2件追記
  (Live Edge Sync採用、音声映像解析不採用)

### 2026-03-17（ドキュメント整合 — 上記に統合）
- spec-index.json の SP-019 file フィールド修正
- HANDOVER.md 更新 (本ファイル)

### 2026-03-16（P2バックログ消化 4/6件）
- fix(P2): フリータイル拡縮安定化 — getBoundingClientRectをリサイズ開始時キャッシュに変更 (ba67a9b)
- fix(P2): サイドバー幅拡大 280→320px、padding 16→12px (ba67a9b)
- feat(P2): 自動最大化フィット — calcOptimalLayout拡張、列数+行高さ同時最適化 (ba67a9b)
- feat(P2): チャンネル一括登録プリセット — storageAdapter拡張、保存/読込/削除UI (a6d7b07)
- docs: P2バックログ状態同期 (862e28e)

### 2026-03-15（サイドバーUI再設計 SP-019 Phase 1-3 + UX改善）
- refactor: 検索UI統合 — searchbrowser.js (531行) 削除、input.jsに一本化 (8207c01)
- feat: Phase 2 サイドバーアコーディオン化 — details/summary、3グループ、開閉永続化 (533be07)
- feat: Phase 3 一括操作コンパクト化 — トグルアイコン+シークバー分離+詳細折りたたみ (817ea35)
- feat: タイルUI改善 — ドラッグハンドル発見性向上、オーディオマスターバッジ、syncBadge位置調整 (b12a002)
- feat: Alt+ドラッグでiframe上からもウィンドウ移動可能に (e0b65f2)
- fix: APIキー設定時にクォータを自動チェック (d2203fd)
- fix: Electron confirm()後のフォーカス喪失をcontextBridge経由dialog APIに置換 (150a8c0)
- fix: クォータ表示テキスト修正 + 死CSSの削除 (ac0bc51)
- DECISION LOG 6件追記 (アコーディオン構成、confirm()置換、一括操作コンパクト化、framelessドラッグ方式、オーディオマスター表示)

### 2026-03-14（UX磨き上げ準備）
- feat: 単体/一括タブを統合URL追加UIに置換 (64fc0d1)
- fix: 固定ポートでAPIキー永続化 + 単体追加でプレイリスト一括追加を阻止 (262f633, c4a11ea)

### 2026-03-12（ライブ対応 + エンコーディング修復）
- feat: ライブ配信対応マスターシークバー + 通知表示切替 (db70ea8)
- fix: CLAUDE.md と SP-015 のエンコーディング破壊を修復 (06122a3)

### 2026-03-10（Worker A/B/C — UI安定化）
- Worker B: レイアウト追従改善（SP-013）
  - `scripts/layout.js` の最小改修: `setLayout` と `handleLayoutChange` の責務重複を縮小
  - cellモード再配置処理を `relayoutCellModeTiles()` に共通化
  - `holosync:ui-chrome-changed` 受信 + `body.class` MutationObserver フォールバックで sidebar/toolbar/immersive 変化を検知
  - Deep Link（share URL）に layout/gap がある場合は `loadLayoutSettings` の上書きを抑止
- Worker C: frameless drag安定化 + 機能棚卸し（SP-014）
  - frameless modeでの専用dragハンドル方式を確定（`scripts/electron.js` + CSS `app-region`）
  - toolbar全面dragやiframe衝突を回避する安全側方針
  - channel/playlist/watch historyの棚卸し（新規機能追加なし、安定性改善のみ）
- Worker A: sidebar/toolbar cleanup（SP-015）
  - sidebar / toolbar / immersive の状態永続化と操作ルール整理
  - immersive解除時のsidebar/toolbar直前状態復元
  - UI chrome操作: content toolbar常時表示、sidebar footer toggle、edge reveal復帰
  - Playwright UI回帰テスト 10/10 通過確認
- 仕様追加: SP-013, SP-014, SP-015（spec-index.json同期済み）
- CLAUDE.md文字化け発生（Worker A/Bのセッションでエンコーディング破壊、2026-03-12に修復）

### 2026-03-09（セッション12）
- チャンネルLive監視（SP-012）:
  - scripts/channel.js 新規作成（15個目のES Module）
  - parseChannelInput: /channel/UCxxx, /@handle対応
  - YouTube API: channels.list（handle解決1unit、ID解決1unit）+ search.list eventType=live（100units）
  - ポーリング: 15分間隔（UI設定可能1-60分）、Page Visibility API対応
  - 新規ライブ自動追加: hasVideo重複チェック→createTile、通知トースト表示
  - UI: サイドバーにチャンネル監視セクション（プリセットとWatch Historyの間）
  - クォータ管理: 3件以上で警告表示（3ch×15min×8h = 9,600 units / 10,000 daily）
  - input.js: URL入力でチャンネルURL検出→監視登録ボタン表示
  - CSS: channel-panel, channel-list, channel-notification（スライドイン通知）
- DECISION LOG 2件追記: ポーリング間隔設定可能、新規ライブ自動追加
- spec-index.json: SP-012追加（計12件）
- ISSUES.md: チャンネルLive監視をDoneに移動、P2バックログ空に
- .eslintrc.json: scripts/channel.js をoverridesに追加
- lint通過、全仕様書完了条件チェック済み

### 2026-03-09（セッション11）
- 仕様振り返り:
  - spec-index.json 11件 vs 実コード整合性検証 → 全4仕様書がコードと一致
  - DECISION LOG 11件の妥当性検証 → 10件OK、1件数値修正（#9: P2再編成の数値を正確化）
  - プロジェクト全体の盲点チェック → 🔴未追跡仕様書6件検出（git add待ち）
  - 暗黙仕様の棚卸し → 9カテゴリ・約40項目をカタログ化（Ducking減衰率0.2、検索履歴5件、視聴履歴30件等）
- 盲点チェック結果:
  - 循環依存なし、デッドインポートなし、未使用依存なし、リソース参照整合OK
  - 🔴 未追跡の仕様書6件: audio-master-pinning, channel-live-monitor, playlist-batch-add, playlist-queue-mode, search-enhancements, timestamp-extraction
  - 🔴 未追跡の実装1件: scripts/channel.js
- DECISION LOG #9修正: 「16→7件」→「16件→P2: 4件、Done: 8件、P3降格: 7件」

### 2026-03-08（セッション10）
- youtube-nocookie ドメイン切替オプション:
  - Embed Settingsにトグル追加（state.js noCookie、player.js buildEmbedUrl分岐）
  - postMessage origin検証の両ドメイン対応（ALLOWED_ORIGIN_NOCOOKIE追加）
  - sendCommand / requestPlayerSnapshot / zoom-loupe のorigin動的判定
  - storage.js URL共有/永続化対応
- プレイリストキューモード（SP-011）:
  - loadVideoById を ALLOWED_COMMANDS に追加、sanitizeArgs検証追加
  - advanceQueue/queuePrev/queueNext 関数（player.js）
  - createTile に queue/queueIndex オプション、キューバーUI（次/前ボタン + インジケーター）
  - main.js trackPlayerState で playerState===0 検知→自動進行
  - input.js にキュー再生ボタン（プレイリストURL検出時）
  - storage.js generateShareUrl/parseShareUrl にqueue永続化
  - CSS: tile-queue-bar, queue-indicator, queue-play-btn スタイル
- SP-011仕様書作成、spec-index.json同期（計11件）
- DECISION LOG 2件追記（loadVideoById採用、youtube-nocookie実装）
- ISSUES.md Done移動: youtube-nocookie + キューモード、P2残り1件に

### 2026-03-08（セッション9）
- P2バックログ再編成: 16件→P2: 4件 / Done移動: 8件 / P3降格: 7件
- spec-index.json: SP-009(パフォーマンス最適化), SP-010(ES Moduleアーキテクチャ)追加 → 計10件
- 共有・復元強化フェーズ実装:
  - 共有URL時刻エンコード: buildShareState/generateShareUrl/parseShareUrlにcurrentTime追加、復元時seekTo
  - 設定JSONエクスポート/インポート: 共有モーダルにExport/Importボタン追加
  - プリセットUI: 調査の結果、既に実装済み（search.js savePreset/loadPresets/deletePreset）
- マスターシークバー実装:
  - サイドバー一括操作内にシークバー+時刻表示配置
  - リーダー動画のduration基準、rAFベース更新
  - ドラッグでオフセット考慮seekTo（全動画に適用）
  - YouTube infoDeliveryからdurationキャプチャ追加（sync.js normalizePlayerInfoMessage）
- CLAUDE.md: フェーズ更新3回、DECISION LOG 4件追記
- 選別規則(A/B/C/D)は現フェーズに適合と判定
- CLAUDE.md: 共有・復元強化フェーズDone条件3/3完了、DECISION LOG追記
- 選別規則(A/B/C/D)は現フェーズに適合と判定

### 2026-03-08（セッション8）
- コンテンツ活用フェーズ: 全4機能実装（+466行、11ファイル変更）
- DECISION LOG作成（過去7件の意思決定を記録）
- オーディオマスター堅牢化:
  - sync回復後のaudio focus復元（setSyncCallbacks）
  - lazy-load完了時のaudio focus適用（onTileIframeLoaded）
  - タイル削除時のaudioFocusVideoIdクリーンアップ
- プレイリスト一括追加:
  - parsePlaylistId() でプレイリストURL検出
  - fetchPlaylistItems() でplaylistItems.list API呼び出し
  - 単体/一括/D&D全入力経路でプレイリスト展開対応
  - プレビュー表示（「プレイリストURLを検出」インジケーター）
- 検索拡張:
  - 検索履歴ドロップダウン（MRU 5件、クリアボタン付き）
  - 長さフィルタ（short/medium/long）
  - 並び順フィルタ（relevance/date/viewCount/rating）
- タイムスタンプ抽出・ジャンプ:
  - 説明文からM:SS / MM:SS / H:MM:SS形式を自動検出
  - クリックでseekTo実行、XSSエスケープ付きHTML描画
  - ts-linkスタイル（アクセントカラー、hover背景）
- 仕様書4件追加（SP-005～SP-008）、spec-index.json同期

### 2026-03-08（セッション7）
- パフォーマンス最適化: iframe遅延ロード実装（+116行）
  - IntersectionObserver + staggered loading（最大2並列、300ms間隔）
  - タイル生成時はYouTubeサムネイルをプレースホルダ表示
  - 同期ループが未ロードタイルを自動スキップ
  - CSS content-visibility適用でオフスクリーン描画最適化
- オーディオマスター固定機能（+113行）
  - タイルごとの音声ボタン + 青枠の視覚インジケーター
  - 3モード: 通常 / Solo（マスターのみ） / Ducking（他を20%減衰）
  - audioFocusVideoId + audioModeをlocalStorageに永続化
  - muteAll/unmuteAllがaudioFocusを自動解除

### 2026-03-08（セッション6）
- Playwright UI回帰テスト9件追加（e2e/ui-regression.spec.ts）
  - レイアウト切替/サイドバー/没入表示/ツールバー/ダークモード/ヘルプ/URL検証/一括モード/履歴
- レガシー残存物徹底整理: 9ファイル削除（-557行）
  - .gitlab-ci.yml, push-and-mr.ps1, gen-docs.ps1, doxygen-pages.yml
  - REPORT_CONFIG.yml, presentation.json, .cursorrules, .cursor/rules.md, detect-project-type.js
- 設定ファイルクリーンアップ: .prettierignore/.eslintignore/.eslintrc.json/.gitignore/package.json
- dist/HoloSync.exe 手動受け入れ確認完了
- CLAUDE.md Done条件 6/6 完了

### 2026-03-07（セッション5）
- ES Module Phase 3.5: input.js(265行)抽出 + 「moved to」コメント66行削除
  - main.js 743→381行 (-49%)、全15モジュール
- docs/棚卸し: Doxygen生成物103件+レガシー資産18件削除（-7248行）
  - PERSISTENCE.md全面書き直し、SECURITY_POSTMESSAGE.md更新
  - WORKFLOW.md/AI_CONTEXT.md/CONTRIBUTING.md/.gitlab/削除
  - spec-index.json同期、README.md参照修正

### 2026-03-07（セッション4）
- ES Module Phase 3: layout.js(492行), ui.js(457行), debug.js(158行), electron.js(75行)抽出
  - main.js 1787→743行 (-58%)
- storage.js/zoom-loupe.js ESM化（window.storageAdapter/window.HoloSyncZoomLoupe廃止）
- window.YOUTUBE_API_KEY → state.js youtubeApiKey モジュール変数化
- catch(_)エラーハンドリング改善（5箇所にconsole.warn追加）

### 2026-03-07（セッション3）
- ES Module Phase 2: player.js(529行) + sync.js(470行)抽出、main.js 2300→1787行
- レガシー資産削除: legacy/全削除、session-start.ps1/create-issues.ps1削除
- 不要ファイル削除: PR_BODY.md, PR_SYNC_PHASE1.md, MR_DESCRIPTION.md, MISSION_LOG_TEMPLATE
- WORKFLOW_STATE_SSOT.md をCLAUDE.mdに統合して廃止
- spec-index.json作成（4仕様文書を登録）

### 2026-03-07（セッション2）
- ISSUES.md棚卸し: 完了済み12件移動、重複5件統合
- docs/tasks/・ルートISSUE_*.md 6ファイル削除

### 2026-03-07（セッション1）
- 同期アルゴリズムv2: 3段階drift補正実装
- SYNC_ALGO.md全面更新（v1→v2）

### 2026-02-23 ~ 2026-03-07
- ES Module化: Phase 0 + Phase 1（state/share/search/history抽出）
- shared-workflows submodule廃止
- テストワークフロー簡素化（Chromiumのみ）

## 2) 現在の未完了タスク（優先順）

1. 次スライス決定 (HUMAN_AUTHORITY) — OAuth / 手動テスト / 新方向のいずれか
2. feat(P2): YouTube OAuth 履歴同期 — P2最後の1件
3. 手動テスト24項目消化 — TESTING.md参照、E2Eカバレッジ表で自動/手動の分担確認可能

詳細は [docs/ISSUES.md](ISSUES.md) 参照。

## 3) 再開時のコマンド

```powershell
git pull --rebase
npm install
npm run lint
npm run build
```

## 4) 注意点

- `dist` はビルド成果物なので、ソース変更後は `npm run build` が必須。
- Issue起票は GitHub Web UI または `gh issue create` を使用。
- プロジェクト指針は `CLAUDE.md` が唯一の正。
