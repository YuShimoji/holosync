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
- [x] refactor: Phase 2（player.js/sync.js抽出）+ Phase 3（layout/ui/debug/electron抽出）+ Phase 3.5（input.js抽出）
  - 全15モジュール、main.js 381行、循環依存なし
- [x] feat(P1): パフォーマンス最適化（IntersectionObserver + staggered iframe loading + CSS content-visibility）
  - サムネイルプレースホルダ、最大2並列stagger load、同期ループ最適化
- [x] feat(P1): オーディオマスター固定（Solo/Duckingモード、永続化、タイルUI）
  - 音声ボタン+青枠インジケーター、3モード切替、muteAll/unmuteAll統合
- [x] feat(P2): プレイリスト一括追加
  - playlistItems.list API、単体/一括/D&D対応、プレビュー表示
- [x] feat(P2): 検索拡張（履歴/フィルタ）
  - 検索履歴ドロップダウン、長さ/並び順フィルタ
- [x] feat(P2): タイムスタンプ抽出・ジャンプ機能（概要欄）
  - 説明文からタイムスタンプ自動検出、クリックでseekTo
- [x] feat(P2): ダークモード（ダーク/ライト切替、localStorage永続化）
- [x] feat(P2): サムネイル先読み（IntersectionObserver + staggered loading）
  - パフォーマンス最適化(P1)の一環として実装済み
- [x] test(P2): Playwright UI回帰テスト追加（レイアウト/サイドバー/没入/ツールバー/ダークモード/ヘルプ/URL検証/一括モード/履歴）
- [x] feat(P2): 共有URLの強化（再生時刻のエンコード/復元）
  - buildShareState/generateShareUrl/parseShareUrlに再生位置(currentTime)追加、復元時seekTo
- [x] feat(P2): 設定のエクスポート/インポート（JSON形式）
  - 共有モーダルにExport JSON/Import JSONボタン追加、Blob download/FileReader upload
- [x] feat(P2): プリセットUI整備（保存・一覧・読込・削除）
  - サイドバーにプリセットセクション、サムネイル表示・メタ情報・削除確認ダイアログ
- [x] feat(P2): マスターシークバー（全動画共通のシーク操作）
  - サイドバー一括操作内、リーダー動画duration基準、オフセット考慮seekTo、rAFベース更新
- [x] feat(P2): youtube-nocookie ドメイン切替オプション
  - Embed Settingsにトグル追加、postMessage origin検証の両ドメイン対応、URL共有/永続化対応
- [x] feat(P2): プレイリストキューモード（1タイルで順次再生、自動進行）
  - loadVideoById postMessage対応、playerState===0検知→自動進行、次/前ボタン、キューインジケーター、永続化/URL共有対応
- [x] feat(P2): チャンネルLive監視（チャンネル登録→ライブ配信自動取得・再生）
  - チャンネルURL入力(/@handle, /channel/UCxxx)、search.list eventType=live、15分間隔ポーリング(設定可能)、新規ライブ自動追加、Page Visibility API、クォータ管理

## バックログ（To Do）

### P2（中優先）

- [x] fix(P2): フリータイルモード（セル配置）での拡縮が不安定 — リサイズ操作時に意図しない挙動が発生する
  - getBoundingClientRect()を毎フレーム呼ぶ代わりにリサイズ開始時キャッシュに変更 (ba67a9b)
- [x] fix(P2): サイドバー幅が狭い — アコーディオン化後も依然としてコンテンツが窮屈。幅の最小値/可変幅の検討が必要
  - --sidebar-width 280→320px、padding 16→12px、実質+48px利用可能幅 (ba67a9b)
- [x] feat(P2): 動画の自動最大化フィット — 動画数に応じて自動的に最適なサイズにフィット。現在のFull-Fitは1動画固定
  - calcOptimalLayout: 列数+行高さ同時最適化、画面内収まりを保証 (ba67a9b)
- [x] feat(P2): チャンネル一括登録プリセット — ライバーチャンネルをまとめて登録するプリセット機能。現在のチャンネルLive監視は個別登録のみ
  - storageAdapter拡張、channel.jsにプリセット保存/読込/削除、サイドバーUI (a6d7b07)
- [ ] feat(P2): YouTube自チャンネル履歴同期 — OAuth連携でユーザーのYouTubeチャンネルの視聴履歴と同期
- [x] feat(P2): 同期アルゴリズム改善 — Live Edge Sync(ライブ配信時seekTo抑制)、オフセット付きライブ同期、tolerance UI接続修正、storageAdapter非同期バグ修正 (c519972, 08a17bb, 06ef917)

### P3（長期 / 凍結）

- [ ] a11y(P3): アクセシビリティ改善（ARIA/キーボードナビ/コントラスト/フォントサイズ）— P2から降格(D): ダークモード実装済み、残りはスクリーンリーダー対応等
- [ ] security(P3): セキュリティ強化（APIキー保護/CSP）— P2から降格(D): sanitizeArgs等は実装済み、残りはCSP/キー保護
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
- [ ] test(P3): E2E自動化方針（Playwright拡充）
- [ ] feat(P3): 国際化（i18n）— P2から降格: 現フェーズでは優先度低
- [ ] feat(P3): PWA 対応（オフライン/キャッシュ）— P2から降格: YouTube API依存でオフラインの意味薄
- [ ] feat(P3): オンボーディング/チュートリアル — P2から降格: デモロードボタンで当面十分
- [ ] feat(P3): タイムスタンプブックマーク（視聴ノート）— P2から降格: コア機能ではない
- [ ] docs(P3): JSDoc整備 — P2から凍結(D): AI駆動開発ではROI低
- [ ] chore(P3): エラーテレメトリ導入（Sentry等）— P2から凍結(D): 運用フェーズで再検討
- [ ] ops(P3): GitHub Issue自動起票 — P2から凍結(D): ISSUES.md運用で当面十分

---

*本ファイルがマスター。GitHub Issue 移行は未定。*
