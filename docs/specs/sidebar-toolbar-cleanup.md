# SP-015: Sidebar / Toolbar Cleanup Stabilization

## スコープ
- sidebar / toolbar / immersive の状態管理安定化
- 既存 UI の操作導線整理と表示ルール明確化
- 状態永続化と復帰パスの整備

## 決定事項
- 常時表示する要素は content toolbar のみ
- toolbar 折畳時に表示する要素は sidebar footer toggle ボタン
- edge reveal ボタンで折畳された要素への復帰導線を確保
- immersive 解除時は sidebar / toolbar を直前の表示状態に復元する

## 実装ベースライン
- `scripts/ui.js` で immersive の状態遷移を管理
- toolbar / sidebar / immersive の表示状態を localStorage に永続化
- fullscreen exit 時に immersive 解除、sidebar / toolbar を直前状態に復元
- 状態変数: `sidebarOpen`、toolbar toggle、immersive toggle で一元管理
- sidebar footer は sticky 配置でスクロール時も操作可能

## ユーザー操作ルール
- 常時表示: content toolbar
- 折畳時: sidebar footer toolbar toggle
- 復帰導線: edge reveal buttons
- immersive 解除: immersive toggle / `Esc` / fullscreen exit

## スコープ外
- UI の大規模アーキテクチャ変更
- frameless drag の仕様変更
- channel / playlist / watch history の機能拡張
