# feat: 永続化の改善（localStorage フォールバック）

## 背景

- 現状、`chrome.storage` に依存しており、非 Chrome 環境では復元が効かない場合がある

## 目的

- `chrome.storage` が無い環境でも、追加済み動画と音量設定がブラウザ再読込で復元される
- 既存挙動を損なわない（優先度: chrome.storage > localStorage）

## 受け入れ基準

- `scripts/main.js` にストレージ抽象を実装し、`chrome.storage` が無い場合は `localStorage` を自動使用
- 追加済み動画（ID 配列）と音量（0..100）が再読込で復元
- Prettier/ESLint を通過

## 実装方針

- `storageGet(defaults, cb)` / `storageSet(obj)` を追加
- 既存の `persistVideos()` / `persistVolume()` / 初期復元部をこの抽象経由に置換
- ドキュメント `docs/PERSISTENCE.md` を追加（仕様と検証手順）

## 検証

- Chrome: 既存通り `chrome.storage` を使用
- 非 Chrome: `localStorage` を使用し、再読込で復元されることを確認
