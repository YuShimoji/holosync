# SP-011: プレイリストキューモード

## 概要

プレイリストの動画を1タイルで順次再生する。動画終了時に自動で次の動画に切り替わる。
他タイルとの同期は維持される。

## データモデル

videoEntry に以下を追加:

```javascript
{
  queue: string[] | null,    // キュー内の動画ID配列（null = キュー無効）
  queueIndex: number,        // 現在再生中のインデックス（0始まり）
}
```

## キューの作成経路

### A. プレイリストURL入力時（input.js）

プレイリストURLが検出された場合、既存の「全動画を個別タイル化」に加えて
「1タイルでキュー再生」を選択可能にする。

- 単体入力欄: プレイリストURL検出時に「キュー再生」ボタンを表示
- クリックで `createTile(firstVideoId, { queue: videoIds })` を実行

### B. 既存タイルへのキュー追加（将来拡張）

現時点では実装しない。必要になった時点で検討。

## 動画切替メカニズム

### loadVideoById の追加

`ALLOWED_COMMANDS` に `loadVideoById` を追加。
YouTube IFrame postMessage API で直接動画を切替可能（iframe再読み込み不要）。

sanitizeArgs に loadVideoById 用の検証を追加:
- args[0]: 文字列（videoId）、11文字英数字+ハイフン+アンダースコア

### 自動進行

`trackPlayerState()` (main.js) で `playerState === 0`（終了）を検出した際:
1. videoEntry.queue が存在するか確認
2. queueIndex を +1
3. queueIndex < queue.length なら `sendCommand(iframe, 'loadVideoById', [queue[queueIndex]])`
4. videoEntry.id を新しい動画IDに更新
5. タイルのメタ情報（タイトル等）を更新
6. queueIndex >= queue.length なら停止（ループしない）

### 手動操作

タイルに次/前ボタンを追加:
- 次（>>|）: queueIndex + 1 の動画をロード
- 前（|<<）: queueIndex - 1 の動画をロード（先頭では無効化）

## タイルUI

### キューインジケーター

タイル上部に表示: `3 / 12` （現在位置 / 全件数）

### 次/前ボタン

タイルのボタン行に追加。キューが存在するタイルのみ表示。

## 同期との関係

- キュータイルは通常のタイルと同じ同期グループに参加可能
- 動画切替時、同期グループ内のリーダー再計算が必要
- 切替直後はsync loopがseekToで位置合わせする

## 永続化

- localStorage: queue と queueIndex を videoEntry に含めて保存
- URL共有: storage.js の generateShareUrl / parseShareUrl に queue/queueIndex を追加
- プリセット: queue 情報を含めて保存/復元

## 制約

- ループ再生は初期実装では非対応（将来拡張）
- シャッフルは初期実装では非対応（将来拡張）
- キュー内の動画削除/並べ替えは初期実装では非対応

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| state.js | ALLOWED_COMMANDS に loadVideoById 追加 |
| player.js | sanitizeArgs に loadVideoById 検証追加、createTile に queue オプション対応、キューUI描画 |
| main.js | trackPlayerState で終了検知→キュー進行、メタ情報更新 |
| input.js | プレイリストURL検出時に「キュー再生」ボタン追加 |
| storage.js | generateShareUrl / parseShareUrl に queue/queueIndex 追加 |
| styles/main.css | キューインジケーター、次/前ボタンのスタイル |

## 完了条件

- [x] プレイリストURLから「キュー再生」で1タイル・キューモードが起動する
- [x] 動画終了時に自動で次の動画に切り替わる
- [x] 次/前ボタンで手動切替できる
- [x] キューインジケーター（N/M）がタイルに表示される
- [x] loadVideoById がpostMessage経由で動作する
- [x] キュー状態がlocalStorageに永続化される
- [x] lint通過
