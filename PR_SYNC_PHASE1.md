# feat(sync): Phase1 - receive-side listener and state collection

本PRでは、将来のドリフト補正に向けた基盤として下記を実装しました。

- YouTube IFrame API の `infoDelivery` メッセージを受信するリスナーを追加
- 各 iframe ごとの `currentTime` / `playerState` / `lastUpdate` を `Map` で保持
- iframe ロード後に `listening` を送信し、`getPlayerState`/`getCurrentTime` を要求する初期化処理
- 既存の送信側ハードニング（許可コマンド/引数サニタイズ/送信オリジン固定）に合流

検証:

- 2〜3本の動画を追加して、DevTools で `message` イベントが `https://www.youtube.com` 由来のみ処理されることを確認
- `playerStates` に `currentTime` と `playerState` が更新されることを確認

備考:

- これはフェーズ1であり、実際のドリフト補正（seek/play/pause）は次フェーズで追加します（Issue #11）。
