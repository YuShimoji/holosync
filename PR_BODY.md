# feat: postMessage セキュリティ強化

本PRでは YouTube IFrame Player API への postMessage 送信側をハードニングしました。

- ALLOWED_ORIGIN を `https://www.youtube.com` に固定
- 許可コマンドのホワイトリスト化: `playVideo`, `pauseVideo`, `mute`, `unMute`, `setVolume`
- `sanitizeArgs()` により `setVolume` を [0,100] にクランプ（無効値は 50）
- iframe に `loading=lazy`, `referrerpolicy=origin` を付与

詳細: `docs/SECURITY_POSTMESSAGE.md`

Closes #1
