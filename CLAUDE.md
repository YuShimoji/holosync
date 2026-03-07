# HoloSync

マルチ動画 YouTube 同期再生 Web アプリ + Electron ラッパー。JavaScript / HTML5 / CSS3。

## Key Paths

- Source: `scripts/`
- Entry: `index.html`
- Modules: storage.js → state.js → player.js → sync.js → main.js
- UI modules: layout.js, ui.js, debug.js, electron.js（全13モジュール、循環依存なし）

## Rules

- Respond in Japanese
- No emoji
- Use Serena's symbolic tools (find_symbol, get_symbols_overview) instead of reading entire source files
- When exploring code, start with get_symbols_overview, then read only the specific symbols needed
- Keep responses concise — avoid repeating file contents back to the user
- `dist/` 以下は直接編集しない（`npm run build` で再生成）
- UIや基本機能の既存アーキテクチャを事前相談なしに大きく変更しない

## Done条件（当面の目標）

- [x] 同期アルゴリズムv2（3段階drift補正、グループ対応）
- [x] ES Module Phase 1-3（全13モジュール分割完了、main.js 743行）
- [x] ISSUES.md棚卸し + レガシー資産削除
- [x] spec-index.json作成
- [ ] Playwright UI回帰テスト追加
- [ ] `dist/HoloSync-win32-x64/HoloSync.exe` でホットフィックス挙動を手動確認

## 選別規則

- A. コア機能・目的の達成
- B. 制作/開発速度の向上・互換設定
- C. 失敗からの復旧しやすさ
- D. テスト拡充、過度なレポート、当面に直結しないリファクタリング → **凍結**
