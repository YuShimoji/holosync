# HoloSync 機能状態テーブル

**Updated**: 2026-03-26
**Audit method**: task-scout + Explore agent + コード・仕様照合

## 実装済み機能

| # | 機能 | 仕様 | 検証手段 | 最終検証 | 備考 |
|---|------|------|----------|----------|------|
| 1 | 同期アルゴリズムv2 (3段階drift補正) | SP-001 done | E2E部分 + 手動 | 2026-03-17 | Live Edge Sync含む |
| 2 | 永続化ストレージ (4段階フォールバック) | SP-003 done | 手動 | 未記録 | chrome/IndexedDB/localStorage/URL |
| 3 | postMessageセキュリティ | SP-004 done | 手動 | 未記録 | origin検証+ALLOWED_COMMANDS |
| 4 | オーディオマスター固定 (Solo/Ducking) | SP-005 done | 手動 | 未記録 | |
| 5 | プレイリスト一括追加 | SP-006 done | 手動 | 未記録 | playlistItems.list API |
| 6 | 検索拡張 (履歴/フィルタ) | SP-007 done | 手動 | 未記録 | |
| 7 | タイムスタンプ抽出・ジャンプ | SP-008 done | 手動 | 未記録 | |
| 8 | iframe遅延ロード最適化 | SP-009 done | 手動 | 未記録 | IntersectionObserver |
| 9 | ES Moduleアーキテクチャ (16モジュール) | SP-010 done | ESLint | 2026-03-26 | 循環依存なし |
| 10 | プレイリストキューモード | SP-011 done | 手動 | 未記録 | 1タイル順次再生 |
| 11 | チャンネルLive監視 | SP-012 done | 手動 | 未記録 | ポーリング+自動追加 |
| 12 | Layout fit relayout | SP-013 done | E2E部分 | 2026-03-17 | |
| 13 | Frameless drag安定化 | SP-014 done | 手動 | 未記録 | 専用ハンドル方式 |
| 14 | Sidebar/toolbar cleanup | SP-015 done | E2E部分 | 2026-03-17 | |
| 15 | Fit Mode Controller | SP-016 done | E2E部分 | 2026-03-17 | Cover/Full-Fit/Auto |
| 16 | 動画追加UX改善 | SP-018 done | 手動 | 未記録 | 履歴/ピン/セッション復元/一括 |
| 17 | サイドバーUI再設計 | SP-019 done | E2E部分 | 2026-03-17 | アコーディオン化 |
| 18 | レイアウトUX摩擦解消 | SP-020 done | 手動 | 2026-03-19 | 5件修正 |
| 19 | F-03 ツールバーアイコン化 | SP-021 partial | 手動 | 2026-03-24 OK | SVGアイコン化 |
| 20 | F-06 動画情報オーバーレイ | SP-021 partial | 手動 | 2026-03-24 OK | ホバー表示 |
| 21 | F-11 フォーカスモード | SP-021 partial | 手動 | 2026-03-24 OK | ワンクリック最大化 |
| 22 | フレームレスボタンSVG保護 | fix | 手動 | **未確認** (再起動待ち) | textContent→title/aria-label |

## 未実装機能 (SP-021 残り)

| # | 機能 | 仕様 | Phase | 優先度 | 備考 |
|---|------|------|-------|--------|------|
| 1 | F-01 クイックフィット | SP-021 | B | 高 | 動画追加→フィットを1操作に |
| 2 | F-02 最大化モード再分類 | SP-021 | B | 中 | シアター/フォーカス/ポップアウト |
| 3 | F-10 双方向フィット | SP-021 | B | 中 | Electron専用のウィンドウサイズ調整 |
| 4 | F-07 YouTube風コントロール | SP-021 | C | 中 | iframe制約内で実装 |
| 5 | F-08 ブラウザ遷移防止 | SP-021 | C | 高 | 外部ブラウザ遷移を阻止 |
| 6 | F-05 スクロールバー/ドラッグ分離 | SP-021 | C | 低 | CSS app-region調整 |
| 7 | F-04 メインエリア検索 | SP-021 | D | 低 | ウェルカム画面+大画面検索 |
| 8 | F-09 ルーペ拡張 | SP-021 | D | 低 | サイズ拡大+角丸調整 |

## 未実装機能 (P2残り)

| # | 機能 | 仕様 | 優先度 | 備考 |
|---|------|------|--------|------|
| 1 | YouTube OAuth 履歴同期 | ISSUES P2 | 低 | 設計未定。P3降格検討 |

## 未確認機能 (検証手段ごと)

### Electron再起動が必要
| 機能 | 確認内容 | 操作手順 |
|------|----------|----------|
| フレームレスボタン | SVGアイコンが正常表示されるか | Electronアプリ再起動→最小化/最大化/閉じるボタンを目視 |

### ブラウザで確認可能
| 機能 | 確認内容 | 操作手順 |
|------|----------|----------|
| --color-accent修正 | .queue-play-btnと.error.infoの色が正常か | プレイリストURL入力→キュー再生ボタンの色を確認 |
| CSS整理後のレイアウト | 死CSS削除で既存UIが壊れていないか | 全画面要素を一通り操作 |

### E2Eテストで確認可能
| 機能 | テスト | 最終実行 |
|------|--------|----------|
| 基本UI操作 (レイアウト/サイドバー/ダークモード) | ui-regression.spec.ts (9件) | 2026-03-24 |
| 基本機能 (URL追加/一括操作) | example.spec.ts (6件) | 2026-03-17 |

## 懸念点

| # | 懸念 | 深刻度 | 状態 | 備考 |
|---|------|--------|------|------|
| 1 | ~~`--color-accent` CSS変数未定義~~ | ~~高~~ | **修正済み** (本セッション) | `.queue-play-btn`/`.error.info`の色が透明だった |
| 2 | ~~孤立CSS約286行~~ | ~~中~~ | **削除済み** (本セッション) | searchbrowser.js削除の残骸 |
| 3 | ~~`getChromeStorage`メソッド未定義~~ | ~~高~~ | **修正済み** (本セッション) | chrome環境でクラッシュする潜在バグ |
| 4 | ~~`saveLastSession`/`clearLastSession` デッドコード~~ | ~~低~~ | **削除済み** (本セッション) | history.js |
| 5 | ~~`saveSearchHistory`/`getSearchHistory` デッドコード~~ | ~~低~~ | **削除済み** (本セッション) | storage.js |
| 6 | ~~`isFocusModeActive` 未使用export~~ | ~~低~~ | **削除済み** (本セッション) | fitmode.js |
| 7 | ~~sync.js/layout.js 不要export~~ | ~~低~~ | **削除済み** (本セッション) | 内部使用のみの関数 |
| 8 | E2E 15件の最新通過状態 | 中 | 要確認 | example.spec.tsは2026-03-17以降未実行の可能性 |
| 9 | SP-017 (searchbrowser.md) 仕様書残存 | 低 | deprecated | 実装は削除済み。仕様書は参照用に残存 |
| 10 | TESTING.md「15 tests passed」記載 | 低 | 要更新 | HANDOVER.mdは「9/9 PASS」。数が不一致 |

## 本セッションで実施した修正

1. `--color-accent` CSS変数を `:root` と `[data-theme='dark']` に追加
2. 孤立CSS 286行を削除 (searchbrowser.js/mode-tab/bulk-actions/search-history/search-results/sb-* の残骸)
3. `getChromeStorage` メソッドを storage.js に追加 (chrome環境のクラッシュバグ修正)
4. デッドコード削除: `saveLastSession`/`clearLastSession` (history.js), `saveSearchHistory`/`getSearchHistory` (storage.js), `isFocusModeActive` (fitmode.js)
5. 不要export削除: sync.js (`attemptRecovery`/`reconcileGroup`/`groupAwareReconcile`/`stopSyncLoop`), layout.js (`handleLayoutChange`)
6. 到達不能条件削除: fitmode.js の `auto-dynamic` 分岐
7. 陳腐コメント修正: e2e/helpers.ts の行番号参照
