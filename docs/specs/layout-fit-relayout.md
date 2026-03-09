# SP-013: レイアウト追従とウィンドウフィット改善（最小改修）

## 背景
- 1列表示や UI 開閉（sidebar / toolbar / immersive）時に、動画タイルの余白・ズレ・横伸び違和感が発生しやすい。
- 既存アーキテクチャ（layout / grid / free(cell)）は維持しつつ、体感改善を優先する。

## スコープ
- 対象: `scripts/layout.js`
- 非対象: frameless drag の仕様変更、大規模リファクタリング

## 仕様
1. `setLayout` は `handleLayoutChange` を経由してレイアウト適用する。
2. cell モード再配置は `relayoutCellModeTiles()` に共通化する。
3. 再レイアウトトリガー:
   - `window.resize` で再配置
   - `holosync:ui-chrome-changed` 受信で再配置（即時 + 遅延1回）
   - フォールバックとして `MutationObserver` で `body.class` の
     `sidebar-collapsed` / `toolbar-collapsed` / `immersive-mode` 変化を監視し再配置
4. Deep Link（share URL）に `layout` または `gap` がある場合、
   `loadLayoutSettings()` は保存済み設定で上書きしない。

## 期待効果
- free(cell) モードで UI 開閉後の位置ズレ・サイズズレを抑制
- レイアウト適用経路の差分を減らし、再現性を向上
- 大改修なしで違和感の強い表示崩れを低減

## リスクと回避
- 再配置回数増加による処理負荷: デバウンス（遅延再計算）で緩和
- 既存UI通知未配線: DOM監視フォールバックで補完

## 検証観点
- free(cell) で sidebar/toolbar/immersive 開閉時にタイルが追従する
- grid モードの既存挙動を壊さない
- share URL の `layout/gap` 復元が local 設定で上書きされない
