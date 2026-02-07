# Test Artifacts Directory Structure

このフォルダはPlaywright E2Eテストの実行結果と成果物を管理します。

## フォルダ構成

```
test-artifacts/
├── README.md                    # このファイル
├── .gitkeep                     # 空フォルダ保持用
├── 2025-02/                     # 年月ベースのフォルダ
│   ├── 2025-02-07_001/          # 実行日時_連番
│   │   ├── index.html           # レポート入口
│   │   ├── report/              # Playwright HTMLレポート
│   │   ├── screenshots/         # スクリーンショット
│   │   ├── videos/              # 動画録画
│   │   ├── traces/              # Playwrightトレース
│   │   └── summary.json         # 実行サマリー
│   └── latest -> 2025-02-07_001 # 最新へのシンボリックリンク
└── archive/                     # 古い成果物アーカイブ
```

## 命名規則

- **実行フォルダ**: `YYYY-MM-DD_NNN` (日付_3桁連番)
- **スクリーンショット**: `{test-name}-{browser}-{timestamp}.png`
- **動画**: `{test-name}-{browser}.webm`
- **トレース**: `{test-name}-{browser}.zip`

## 保持ポリシー

- **最新30日**: `test-artifacts/YYYY-MM/` 内に保持
- **それ以前**: `archive/` に圧縮して移動
- **最大容量**: 1GB超過時に古いものから自動削除
