# Persistence: ストレージ抽象化層

## 概要

HoloSyncは`StorageAdapter`クラスによるストレージ抽象化層を提供し、複数のストレージ方式を自動フォールバックで利用する。

- ファイル: `scripts/storage.js`
- エクスポート: `storageAdapter` (シングルトンインスタンス)
- 初期化: `detectStorage()` により実行環境に最適なストレージ方式を自動選択

## フォールバック戦略

4段階のフォールバック順序で動作する。`detectStorage()` が起動時に利用可能な方式を自動選択する。

1. **chrome.storage.local** (`chrome`)
   - Chrome拡張機能環境で利用可能な場合に優先
   - 条件: `chrome.storage.local` API が存在

2. **IndexedDB** (`indexeddb`)
   - DB名: `HoloSyncDB` (version 1)
   - ObjectStore: `keyValueStore`
   - 条件: `window.indexedDB` 系API が利用可能

3. **localStorage** (`local`)
   - 基本的なブラウザストレージ
   - JSON形式でシリアライズして保存
   - フォールバックの最終手段

4. **URL Parameters** (`url`)
   - セッション共有用の読み取り専用ソース
   - レガシー個別パラメータ (`videos`, `volume`, `preset`) と圧縮Base64形式 (`session`) に対応

各方式でエラーが発生した場合、`fallbackSet()` / `fallbackGet()` により次の方式に自動移行する。

## 保存キー一覧

全キーとその用途を以下に記載する。

| キー | 型 | 用途 | 保存元 |
|------|-----|------|--------|
| `videos` | Array<Object> | 動画ID配列（同期グループ、オフセット、グリッド配置情報を含む） | `scripts/player.js` |
| `volume` | Number | グローバル音量 (0..100) | `scripts/player.js` |
| `embedSettings` | Object | YouTube埋め込みパラメータ (controls, modestbranding, rel, playsinline) | `scripts/player.js` |
| `layoutMode` | String | レイアウトモード (`auto`, `grid`, `custom` など) | `scripts/layout.js` |
| `layoutSettings` | Object | レイアウト設定（グリッド列数、ギャップ、カスタム配置情報など） | `scripts/layout.js` |
| `darkMode` | Boolean | ダークモード有効/無効 | `scripts/ui.js` |
| `sidebarCollapsed` | Boolean | サイドバー折りたたみ状態 | `scripts/ui.js` |
| `toolbarCollapsed` | Boolean | ツールバー折りたたみ状態 | `scripts/ui.js` |
| `presets` | Array<Object> | プリセット配列（最大10件、古いものから削除） | `scripts/search.js` + `storage.js` |
| `searchHistory` | Array<String> | 検索履歴（最大5件、新しい順） | `storage.js` |
| `watchHistory` | Array<Object> | 視聴履歴（最大30件、タイムスタンプ順） | `scripts/history.js` |
| `youtubeApiKey` | String/null | YouTube Data API v3キー | `scripts/search.js` |

## URL共有機能

### セッション圧縮共有 (`generateShareUrl`)

現在のセッション状態をBase64圧縮してURLパラメータ `session` に格納する。

- 圧縮方式: JSON → URI encode → Base64
- キー短縮: `videos` → `v`, `settings` → `s`, `embedSettings` → `e` など
- 不要なundefinedフィールドは除外してサイズ削減
- レガシーパラメータ (`videos`, `volume`, `preset`) は削除

含まれる状態:
- 動画配列（ID、同期グループ、オフセット、グリッド配置、タイル寸法）
- 設定（レイアウト、音量、速度、ギャップ）
- 埋め込み設定（controls, modestbranding, rel, playsinline）

### セッション復元 (`parseShareUrl`)

URLパラメータ `session` からBase64圧縮状態を復元する。

- デコード: Base64 → URI decode → JSON
- キー展開: 短縮キーを元のプロパティ名に復元
- バリデーション: 不正なデータは `null` を返す

レガシーパラメータのサポート:
- `?videos=ID1,ID2` → 動画ID配列（11文字のYouTube IDのみ許可）
- `?volume=50` → 音量値
- `?preset=ID1,ID2` → プリセット動画配列

## API

### StorageAdapter の公開メソッド

#### `async getItem(key)`

指定キーの値を取得する。

- 戻り値: 保存された値、存在しない場合は `null`
- 自動フォールバック: エラー時は次のストレージ方式を試行

#### `async setItem(key, value)`

指定キーに値を保存する。

- 内部的にタイムスタンプ付きオブジェクト `{ value, timestamp }` として保存
- 自動フォールバック: エラー時は次のストレージ方式を試行

### プリセット専用メソッド

#### `async savePreset(name, videoIds)`

プリセットを保存する。既存の同名プリセットは上書き、最大10件まで保持。

- 戻り値: 保存したプリセットオブジェクト (id, name, videoIds, createdAt, updatedAt)

#### `async loadPresets()`

全プリセット配列を取得する。

#### `async loadPreset(name)`

名前でプリセットを検索して取得する。

### 検索履歴専用メソッド

#### `async saveSearchHistory(query)`

検索クエリを履歴に追加する。既存のものは先頭に移動、最大5件まで保持。

#### `async getSearchHistory()`

検索履歴配列を取得する。

## セーフティ

- JSON シリアライズ/デシリアライズは try/catch で保護
- IndexedDB トランザクションエラーは Promise reject で処理
- URL パラメータの動画IDは11文字チェックでバリデーション
- フォールバック失敗時はコンソール警告を出力し、`null` を返す
