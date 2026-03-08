# SP-005: オーディオマスター固定

## 概要

選択タイルの音声を優先し、他タイルを自動ミュート/減衰する「オーディオマスター」機能の堅牢化。
既存のAudio Focus + Audio Mode（solo/ducking）システムは機能するが、状態遷移時に一貫性が崩れる問題を修正する。

## 現状の問題

| # | 問題 | 発生箇所 | 影響 |
|---|------|----------|------|
| 1 | sync回復がaudio focusを破壊 | sync.js:180,200 | mute-continueで一律mute→回復後にfocus状態が復元されない |
| 2 | 遅延ロードタイルがfocusを無視 | player.js:72-91 | iframe load後にaudio mode/focusが適用されない |
| 3 | タイル削除でfocusが残存 | player.js:599-621 | マスター削除後もaudioFocusVideoIdが古い値 |

## 変更内容

### 1. player.js: タイル読み込み完了コールバック追加

`_loadTileIframe()` のiframe loadイベント内で `_deps.onTileIframeLoaded(videoEntry)` を呼び出す。
main.js側でこのコールバックを受けて `applyAudioFocus()` を実行。

### 2. player.js: タイル削除時のaudio focus cleanup

`removeVideo()` 内で、削除対象が `state.audioFocusVideoId` と一致する場合、
`_deps.clearAudioFocus(videoId)` を呼び出す。

### 3. sync.js: 回復後のaudio focus復元

`reconcileGroup()` のrejoinQueue処理後、回復したプレーヤーがある場合に
コールバック `_onRecovery()` を呼び出し、main.jsが `applyAudioFocus()` を実行する。
sync.jsに `setSyncCallbacks({ onRecovery })` 関数を追加。

### 4. main.js: コールバック登録と実装

- `onTileIframeLoaded`: 該当タイルにaudio focus状態を適用
- `clearAudioFocus`: `setAudioFocus(null)` でクリーンアップ
- `onRecovery`: `applyAudioFocus()` で全タイルの音声状態を再適用

## 完了条件

- [ ] solo/duckingモードでマスター設定→バッファリング発生→回復後にマスターの音声状態が維持される
- [ ] 遅延ロードされたタイルが、現在のaudio mode/focusに従って音声状態が設定される
- [ ] マスタータイル削除後に `state.audioFocusVideoId` が `null` になる
- [ ] normalモードでは既存動作に変更なし
- [ ] lint通過
