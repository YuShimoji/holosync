# SP-010: ES Module アーキテクチャ

## 概要

monolith な `main.js`（旧3000行超）を ES Module で17モジュールに分割。循環依存なし、関心の分離を維持。

## モジュール構成（17ファイル / 7,175行）

### コアチェーン（初期化順）

```
storage.js → state.js → player.js → sync.js → main.js
```

| モジュール | 行数 | 責務 |
|-----------|------|------|
| `storage.js` | 381 | StorageAdapter（localStorage/IndexedDB/URL/chrome.storage フォールバック） |
| `state.js` | 99 | アプリケーション状態（videos[], playerStates, SYNC_SETTINGS, 定数） |
| `player.js` | 810 | タイル生成、iframe管理、lazy-load、postMessage送信、永続化 |
| `sync.js` | 491 | 3段階drift補正、リーダー選出、同期ループ、グループ同期 |
| `main.js` | 560 | オーケストレーション、イベントハンドリング、初期化 |

### UIモジュール

| モジュール | 行数 | 責務 |
|-----------|------|------|
| `layout.js` | 535 | グリッドレイアウト、ドラッグ並べ替え、リサイズ、フリー配置 |
| `ui.js` | 532 | サイドバー、ツールバー、没入モード、ダークモード、embed設定UI |
| `debug.js` | 158 | 同期デバッグパネル |
| `electron.js` | 95 | Electron固有: フレームレスウィンドウ、タイトルバー制御 |
| `input.js` | 554 | URL入力、D&D、クリップボード、プレイリスト/チャンネル検出 |
| `zoom-loupe.js` | 288 | ズームルーペ（拡大表示パネル） |
| `fitmode.js` | 180 | フィットモード（動的列数/Cover/Full-Fit） |

### 機能モジュール

| モジュール | 行数 | 責務 |
|-----------|------|------|
| `search.js` | 416 | YouTube Data API検索、プリセット管理、検索履歴 |
| `share.js` | 245 | 共有URL生成/パース、JSON export/import |
| `history.js` | 101 | 視聴履歴（30件MRU、再生時間追跡） |
| `channel.js` | 515 | チャンネルLive監視（ポーリング、自動追加） |

## 依存関係ルール

1. **循環依存禁止**: 全モジュール間で単方向の依存のみ
2. **DI パターン**: `main.js` がコールバックやdepsオブジェクトで注入（例: `initPlayer({...})`, `initSearchBrowser({createTile, parseYouTubeId})`）
3. **グローバル汚染なし**: `window.*` への代入を廃止。全てモジュールスコープ
4. **エントリポイント**: `index.html` → `<script type="module" src="scripts/main.js">`

## ESLint 設定

`.eslintrc.json` の `overrides` で全17ファイルに `"sourceType": "module"` を適用。
