# SP-020: レイアウトUX摩擦の解消

## 概要

動画追加から視聴までのワークフローに存在するUX摩擦5件を一括修正する。
いずれもレイアウト・ツールバー・フィットモードの連携不足が原因。

## 課題一覧

### F-1: 動画追加後にレイアウトが自動調整されない

**症状**: 動画を追加した後、上部ツールバーとサイドバーを行き来してフィットモードを手動設定する必要がある。

**原因**: `input.js:submitSelected()` が `createTile()` 呼び出し後に `fitmode.onVideosChanged()` を呼んでいない。動画数の変化がレイアウト計算に伝播しない。

**修正**:
- `submitSelected()` 末尾で `onVideosChanged()` を呼び出す
- `handleDroppedText()` (D&D追加) でも同様に呼び出す
- チャンネルLive監視の自動追加 (`channel.js`) でも同様

### F-2: ウィンドウリサイズ時に余白が残る

**症状**: ウィンドウサイズを変えても動画サイズが追従せず、余白ができる。

**原因**: `fitmode.js:applyDynamicColumns()` が `fullFit` または `coverMode` 時に早期returnしており、リサイズイベントが無視される。また `.content { overflow: auto }` のスクロールバー出現で幅が変動する。

**修正**:
- `applyDynamicColumns()` の早期return条件を見直し、coverMode時もリサイズに追従させる
- fullFit時のリサイズ追従も別途処理する（iframe が100%幅なら自動だが、高さの再計算が必要）
- `.content` に `scrollbar-gutter: stable` を追加し、スクロールバーによる幅変動を防止

### F-3: 1列表示時に動画が画面中央で最大化しない（上下が切れる）

**症状**: 1動画または1列表示時、16:9比率の動画が画面幅いっぱいに拡がり、高さが画面を超過する。上下が切れてスクロールが必要になる。

**原因**: `fitmode.js:calcOptimalLayout()` が `count <= 1` のとき `rowHeight: null` を返す。`grid-auto-rows: min-content` (main.css:781) により、タイルは16:9 × 画面幅で描画され、縦方向にオーバーフローする。

**修正**:
- `calcOptimalLayout()` の `count <= 1` 分岐で、`containerH` を考慮した `rowHeight` を計算する
  ```javascript
  if (count <= 1) {
    const naturalH = containerW * (9 / 16);
    const rowHeight = naturalH > containerH ? containerH : null;
    return { cols: 1, rowHeight };
  }
  ```
- auto-dynamic レイアウト以外でも、1列時の高さオーバーフローを CSS `max-height` で抑制する

### F-4: スクロールバーがドラッグ移動に重なり機能しない

**症状**: Electron framelessモード時、`.content` 領域のスクロールバーをクリックしてもウィンドウドラッグが発動し、スクロール操作ができない。

**原因**: `body.frameless-mode .content` に `-webkit-app-region: drag` が設定されている (main.css:728-730)。スクロールバーは `.content` の一部なので drag 領域に含まれ、スクロール操作が奪われる。

**修正**:
- `.content` 全体を drag にするのではなく、`.content` 内の空白領域のみを drag にする
- 方法: `.content` から drag を外し、grid 内の空白（タイルがない部分）に drag を適用
  ```css
  body.frameless-mode .content {
    -webkit-app-region: no-drag;  /* 変更: 全体ではなく空白のみ */
  }
  body.frameless-mode .grid {
    -webkit-app-region: drag;
  }
  body.frameless-mode .tile {
    -webkit-app-region: no-drag;  /* 既存 */
  }
  ```
- ツールバー領域は既に `no-drag` (main.css:733)

### F-5: 上部ツールバーがスクロールしないと表示されない

**症状**: グリッドの動画が画面に収まりきらずスクロールが必要な場合、上部ツールバーもスクロールアウトして消える。レイアウト変更やフィットモード切替にアクセスできなくなる。

**原因**: `.content-toolbar` が `position: static`（デフォルト）で、`.content { overflow: auto }` 内のフローに含まれている。グリッドが縦に伸びるとツールバーも一緒にスクロールアウトする。

**修正**:
- `.content-toolbar` に `position: sticky; top: 0; z-index: 10;` を追加
  ```css
  .content-toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--color-bg);  /* 既存 */
  }
  ```
- `background` は既に設定済みなので、下のグリッドが透けることはない

## 実装順序

| 優先度 | 課題 | 修正コスト | 理由 |
|--------|------|----------|------|
| 1 | F-5 (ツールバー固定) | 低 (CSS 3行) | 全操作の前提。これがないと他の修正も使えない |
| 2 | F-1 (動画追加後の自動レイアウト) | 低 (JS 3箇所) | 最も頻繁なワークフロー改善 |
| 3 | F-3 (1列時の高さ制限) | 低 (JS 5行) | F-1と連動して効果を発揮 |
| 4 | F-2 (リサイズ追従) | 中 (JS + CSS) | スクロールバー幅変動の根本対策 |
| 5 | F-4 (スクロールバー vs ドラッグ) | 中 (CSS再設計) | Electron限定の問題 |

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| styles/main.css | F-5: sticky toolbar / F-2: scrollbar-gutter / F-4: drag領域再設計 |
| scripts/fitmode.js | F-2: applyDynamicColumns早期return修正 / F-3: calcOptimalLayout高さ制限 |
| scripts/input.js | F-1: submitSelected/handleDroppedText後にonVideosChanged呼び出し |
| scripts/channel.js | F-1: ライブ自動追加後にonVideosChanged呼び出し |

## 完了条件

- [x] F-5: content-toolbar が position: sticky でスクロールしても上部に固定される
- [x] F-1: 動画追加後にレイアウトが自動再計算される（手動操作不要）
- [x] F-3: 1列/1動画時に動画が画面内に収まる（上下切れなし）
- [x] F-2: ウィンドウリサイズ時に動画が追従し余白が出ない
- [x] F-4: Electron framelessモード時にスクロールバーが正常に操作できる
- [x] 既存E2E 15件がPASS
- [x] ESLint clean

## 実装済みの詳細

### F-5 (main.css)
`.content-toolbar` に `position: sticky; top: 0; z-index: 10;` を追加。

### F-1 (input.js, channel.js)
- `input.js`: `submitSelected()` と `handleDroppedText()` の末尾で `onVideosChanged()` を呼び出し
- `channel.js`: ライブ自動追加ループ後に `onVideosChanged()` を呼び出し
- `fitmode.js` からの import 追加

### F-3 (fitmode.js)
`calcOptimalLayout()` の `count <= 1` 分岐で `containerW * (9/16) > containerH` の場合に `rowHeight = Math.floor(containerH)` を返す。

### F-2 (fitmode.js, main.css)
- `applyDynamicColumns()` の早期return条件から `fitState.coverMode` を除去 — coverMode時もリサイズ追従
- `.content` に `scrollbar-gutter: stable` を追加 — スクロールバー出現時の幅変動を防止

### F-4 (main.css)
`body.frameless-mode .content` → `body.frameless-mode .grid` に `-webkit-app-region: drag` を移動。スクロールバーが `.content` の一部として drag 領域に含まれなくなる。
