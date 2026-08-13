# SP-021: UI/UX洗練 Phase 1

**Status**: in-progress (10/11 done; F-04 のみ未着手)
**Priority**: P1
**Category**: ui
**Created**: 2026-03-23
**Last updated**: 2026-07-10

## 概要

HoloSyncの基本機能は安定しているが、YouTube視聴体験としての洗練度に大きなギャップがある。
ユーザーフィードバックで特定された11件のUX摩擦を体系化し、段階的に解消する。

## 改善項目一覧

### F-01: 動画読込からウィンドウフィット/最大化までの手数削減

**Status**: done (2026-04-14)
**現状**: 動画追加後、ウィンドウにフィットさせるまでに複数の操作(フィットモード切替、ウィンドウ枠切替等)が必要。
**目標**: 1アクションでフィット状態に到達。
**決定事項** (2026-04-14 user 協議):

| # | 決定 | 内容 |
|---|---|---|
| 1 | 動画追加時デフォルト | 現状維持 (自動フィットしない) |
| 2 | クイックフィットトリガー | 1キー (F) + 1ツールバーボタン (#quickFitBtn) の両方 |
| 3 | 同時適用範囲 | フィットモード維持 + サイドバー/ツールバー/ウィンドウ枠非表示 |
| 4 | Electron 自動ウィンドウサイズ | オプション実装 (既定 OFF) / 16:9 固定 |
| 5 | 3操作カウント | URL添付=1操作として算入 (URL貼付→Enter→F で 3操作) |

**実装**:
- `toggleQuickFit()` in [scripts/fitmode.js](../../scripts/fitmode.js)
- F キーバインド in [scripts/ui.js](../../scripts/ui.js) (既存入力要素ガード継承)
- `#quickFitBtn` in [index.html](../../index.html)
- ESC または再トグルで元の chrome 状態に完全復帰
- F-11 フォーカスモード(1タイル最大化)との違い: 全タイル表示を維持

**オプション (自動ウィンドウサイズ)**:
- `electronWindow.setContentAspect(w, h)` preload API
- `window:set-content-aspect` IPC handler
- 設定項目: サイドバー「クイックフィット (F)」セクションのチェックボックス
- 既定 OFF。有効時はクイックフィット発動毎に 16:9 へ調整
- 動画実比の取得は cross-origin で不可能なため 16:9 固定 (YouTube 動画ほぼ全てに該当)

### F-02: 動画最大化モードの再分類

**Status**: done (2026-04-15, F-11 と統合実装)
**結果**: モード体系を以下に再分類。Full-Fit は Focus Mode で代替し廃止。

| モード | 入口 | 挙動 | ESC復帰 |
|--------|------|------|---------|
| Quick Fit | F キー / ボタン | 全タイル表示 + 全chrome非表示 | Yes |
| Focus | タイルダブルクリック / タイルボタン | 1動画のみ + 全chrome非表示 + エッジホバーで復帰 | Yes |
| Immersive | F11 | OSフルスクリーン + chrome非表示 | Yes |
| Theater | レイアウトセレクト | 1本目全幅 + 残りを下段 | No (レイアウト) |

**廃止**:
- **Full-Fit**: Focus Mode で代替。CSS (`layout-fullfit`)・JS (`setFullFit`)・storage (`fitFullFit`) を除去
- **Pop-out (PiP)**: Electron BrowserWindow 分離が必要でコスト大。今回は見送り（別スライスで検討可）
- **Cover Mode**: アスペクト比切替の補助機能として残存（モード体系には含めない）

### F-03: ツールバーの整理・簡素化

**Status**: done (2026-03-24)
**現状**: content-toolbarにボタンと文字が密集しており、視覚的にゴチャついている。
**目標**: 高頻度操作のみ表示し、低頻度操作は折りたたみまたはコンテキストメニューに移動。
**仕様**:
- **常時表示**: レイアウト切替(アイコンのみ)、フィットモード、共有
- **折りたたみ/メニュー**: 間隔調整、ウィンドウ枠切替、ウィンドウ操作(最小化/最大化/閉じる)
- テキストラベルをアイコン+ツールチップに置換
- ツールバー幅が狭い場合のレスポンシブ対応(オーバーフロー→メニュー化)

### F-04: 検索/入力UIのメインエリア活用

**Status**: not-started
**現状**: 検索はサイドバー内の狭い入力欄に配置。メインエリア(動画グリッド)には検索UIがない。
**目標**: 動画未追加時やアクティブ検索時に、メインエリアを検索結果表示に活用。
**仕様**:
- 動画が0件のとき: メインエリアにウェルカム画面+大きな検索入力欄を表示
- 検索アクティブ時: メインエリアにオーバーレイまたは分割表示で検索結果グリッドを表示
- 検索結果からワンクリックで動画追加(現在のサイドバー内検索結果と同等の機能)
- サイドバーの検索入力欄は維持(クイックアクセス用)

#### 方向チェックポイント（未決定、2026-07-10）

実装後の微修正往復を避けるため、F-04と広域ビジュアルは同じ基準画面で可逆プレビューを比較してから、方向選択と実装承認を一度に行う。現時点では案の記録であり、実装承認ではない。

**検索レイアウト候補**:

| 候補 | 利点 | 制約 / 判断 |
|---|---|---|
| 右側検索トレイ（推奨） | 再生中の動画を見失わず、検索候補と同期対象を分離できる | 左サイドバーとの同時表示時は、検索中だけ左を収納する挙動を比較する |
| 全面追加モード | 候補カードを広く表示し、セッション構築に集中できる | iframe非表示時のライブ更新挙動をSP-023受入後に確認してから比較する |
| 動画グリッドへ候補を混在 | 直接追加に見える | Dense採点、同期対象、並べ替え、永続化の意味が崩れるため通常候補から除外する |

**製品の佇まい候補**:

| 方向 | 主な体験 | 対象 / 解けること | 規模 |
|---|---|---|---|
| Calm Utility | 現行の白いchromeと濃紺stageを維持し、余白・SVG・文言・コントラストを統一 | 1〜4本の一般視聴。配置変更を抑えて古さと表記揺れを解消 | S〜M |
| Operator Desk（推奨） | 濃紺stageをchrome全体へ延長し、LIVE赤・同期シアン・警告黄、タイル操作列を整理 | 8〜12本の高密度監視。Dense、hover衝突、同期健全性表示を一体化 | M |
| Session Builder | 0件時は大きな統合入力、再生中は検索トレイ、保存セット・前回セッションを前面化 | 配信セットを探して組む利用者。F-04と既存履歴/プリセットの発見性を統合 | M〜L |

**比較に固定する状態**:

- 1280x720で動画0件、4件、12件通常、12件hover、sidebar/toolbar表示の5状態。
- 同じ動画・文言・寸法を使い、見た目以外の変数を増やさない。
- 方向選択後は、Calm Utilityなら「token + toolbar + 現行1〜4 tile」、Operator Deskなら「token + toolbar + 1 tile」、Session Builderなら「0件画面」を最初の縦切り実装にする。
- 主観修正は統合プレビュー後に一括で受け、選択済み領域を同時に再設計しない。

**隣接候補と境界**:

- 伸ばしやすい候補: layout・音声master・sync groupまで保存する監視セット、登録channel/前回session/保存setを集めるLive Hub、SP-023を縮約した再生健全性chip、timestamp/offsetを使う同期moment。
- 日本語と英語が混在するcopy/helpの整合は小スライス候補。message辞書化と日英切替はそれぞれ独立スライスとして明示的にscope承認し、full i18nは別途再承認する。
- Operator Deskの視覚仮説は既存`#0f172a`を基調に、状態色の役割固定、local SVG統一、時刻/同期値のみtabular monospace、120〜180msの短い状態遷移、`prefers-reduced-motion`尊重とする。

### F-05: スクロールバーとウィンドウドラッグの衝突解消

**Status**: done (2026-04-14)
**現状**: SP-020/F-4でdrag領域を.gridに移動したが、スクロールバー領域でドラッグが発動する場合がある。
**目標**: スクロールバー操作とウィンドウドラッグが完全に分離される。
**実装**: [styles/main.css](../../styles/main.css) に `::-webkit-scrollbar` / `::-webkit-scrollbar-track` / `::-webkit-scrollbar-thumb` / `::-webkit-scrollbar-corner` へ `-webkit-app-region: no-drag` を付与。`.grid` / `.sidebar` / `.content-toolbar` を対象。Alt+ドラッグは `.drag-overlay` 側で drag 化済みのため両立。

### F-06: 動画情報パネルの面積最適化

**Status**: done (2026-03-24)
**現状**: tile-info-header と tile-info が常時表示され、動画表示エリアを圧迫。枠(ボーダー)も常時表示。
**目標**: 動画情報はデフォルト非表示。必要時にのみ展開。枠は最小限に。
**仕様**:
- デフォルト: tile-info を折りたたみ(display: none)。tile-info-header は小さなアイコンのみ表示
- ホバーまたはクリックで tile-info を展開
- 展開時はオーバーレイ表示(動画領域に重ならない位置、またはフロート表示)
- 常時表示の枠線(border)を除去。ホバー時のみ薄い枠を表示

### F-07: YouTube風オーディオコントロール

**Status**: done (2026-04-15)
**現状 (修正前)**: 動画下部に独自UIの情報パネルが配置されており、通常のYouTubeプレイヤーとUIが異なる。再生制御はサイドバー一括操作パネルのみ。
**目標**: 動画下部のコントロールをYouTube本家の配置に近づける。
**実装**:
- 各タイル下部に YouTube 風コントロールバー（ホバー時表示、グラデーション背景）
- シークバー: 薄い進捗バー、ホバーで拡大、赤いサム。同期対象全タイルに連動
- コントロール行: 再生/一時停止、ミュート、音量スライダー（ホバー展開）、経過時間/総時間
- iframe 外側下部に配置（YouTube ネイティブコントロールと物理的に重ならない）
- 音量はマスター音量と連動（audioMode normal/solo/ducking との整合）
- ライブ配信時はシークバー無効化 + "LIVE" 表示
- tile-actions（右上4ボタン）はそのまま維持（再生制御 vs タイル管理の関心事分離）
- フォーカスモード時は常時表示
- `scripts/tile-controls.js` 新規モジュール、`playerStates` の rAF 更新で同期

### F-08: 動画クリック時のブラウザ遷移防止

**Status**: done (最小版 / 2026-04-14)
**現状 (修正前)**: 動画終了時や途中でクリックすると外部ブラウザが開いてしまう。
**目標**: 外部ブラウザを開かない。
**実装 (最小版)**:
- `setWindowOpenHandler` を全 deny に変更 ([electron-main.js](../../electron-main.js))
- `will-navigate` も preventDefault のみ (shell.openExternal 呼び出し削除)
- 明示的な外部遷移 (「YTで開く」/「共有URLを開く」) は preload の `electronShell.openExternal(url)` → `shell:open-external` IPC → `shell.openExternal` ルートに変更
- iframe 内 YouTube ロゴ/関連動画クリック → 外部ブラウザは開かず無反応 (iframe 内で何も起きない)
**縮退**:
- 「関連動画クリック → 新タイル追加」「再生完了時の同タイル差替」は iframe cross-origin で URL 捕捉不能のため未実装
- iframe `sandbox` 属性は既存 cross-origin 境界で同等効果が得られるため未付与

### F-09: ルーペ(ズームパネル)の拡張

**Status**: done (2026-04-15)
**実装**:
- デフォルト直径 250 → 375 (1.5 倍)
- wheel ズーム範囲 100-600 → 100-1000
- shape select (circle/rounded/square) を radius slider (0-50%) に置換
- `resolveRadius()` で旧 `zoomShape` を radius 値に自動変換 (後方互換)
- アスペクト比変更は将来検討 (未実装)

### F-10: ウィンドウ-動画サイズの双方向フィット

**Status**: done (2026-04-15)
**実装**:
- `#fitWindowBtn` ツールバーボタン追加 (Electron 専用、Web 環境では hidden)
- `fitWindowToVideos()` in [scripts/fitmode.js](../../scripts/fitmode.js):
  - `resolveCurrentCols()` で現在レイアウトから実質列数を判定 (固定列/theater/fullfit/auto-dynamic)
  - 各セルを 16:9 と仮定、`cols*16 : rows*9` の比率を `setContentAspect` で適用
- 逆方向 (ウィンドウ→動画) は既存の Cover/auto-dynamic で十分カバー済み (Full-Fit は F-02 で廃止)

### F-11: ワンアクション動画最大化

**Status**: done (2026-04-15, F-02 と統合実装)
**実装**:
- タイルダブルクリック → `toggleFocusMode(videoId)` ([scripts/player.js](../../scripts/player.js))
  - `.tile-actions`, `.tile-info`, `.tile-offset-control` 等の子要素上のダブルクリックは除外
- タイルアクションボタン（拡大矢印 SVG アイコン）→ 同上
- Focus Mode: 選択動画のみ全画面表示、全 chrome 非表示 (`body.focus-mode`)
- **ESC キー**で元のレイアウトに復帰（chrome 状態を `_savedFocusState` から復元）
- **エッジホバー**（即応式）: Focus 中も `edge-reveal` ボタンが z-index: 1010 で表示。クリックで Focus 解除 + chrome 復元
- F-02 のフォーカスモード定義と統合完了

## 実装フェーズ

Phase A/B/C は完了。Phase D は F-09 完了、F-04 のみ未着手。

### Phase A: 情報密度の最適化 (F-03, F-06)
- ツールバー簡素化
- 動画情報パネルの折りたたみ化
- 即効性が高く、他の改善の前提となる

### Phase B: 最大化・フィット体験 (F-01, F-02, F-10, F-11)
- フォーカスモード実装
- ウィンドウ-動画双方向フィット
- クイックフィットショートカット

### Phase C: 操作体験の洗練 (F-07, F-08, F-05)
- YouTube風コントロール
- ブラウザ遷移防止
- スクロールバー/ドラッグ衝突の完全解消

### Phase D: 拡張 (F-04, F-09)
- メインエリア検索
- ルーペ拡張

## 成功条件

- 動画追加→最大化視聴が3操作以内で完了する
- ツールバーのボタン数が現在の半分以下に見える(折りたたみ含む)
- 動画情報が動画表示エリアを圧迫しない
- 動画クリックで外部ブラウザが開かない
- YouTube経験者が違和感なく操作できるコントロール配置

## 関連仕様

- SP-016: Fit Mode Controller (現行フィットモード)
- SP-020: レイアウトUX摩擦の解消 (前提改善済み)
- SP-015: Sidebar/toolbar cleanup stabilization
- SP-019: サイドバーUI再設計

## 未決定事項

- F-04 メインエリア検索: 右側検索トレイと全面追加モードを同一条件で比較する。グリッド混在は通常候補から除外。
- ビジュアル方向: Calm Utility / Operator Desk / Session Builderのプレビュー比較後に一つを選び、同じ判断で実装可否を明示する。

## 消化済み未決定事項

- F-08 ブラウザ遷移防止: iframe sandbox 調査 → 付与不要と判定 (2026-04-14)。既存 cross-origin 境界で十分。関連動画の新タイル追加は縮退
- F-07 YouTube風コントロール: iframe 外側下部に配置。ネイティブコントロール維持 (controls=0 は規約リスク)。音量はマスター連動。(2026-04-15)
