# IDE 互換ガイド

各 IDE における Markdown / Mermaid 表示の差異とフォールバック戦略。

最終更新: 2026-02-06
更新者: Cascade

---

## 対応状況一覧

| IDE | Mermaid チャット | Mermaid プレビュー | Markdown テーブル | 備考 |
|-----|-----------------|-------------------|------------------|------|
| **Windsurf** | ✅ | ✅ | ✅ | メイン IDE。チャット内で Mermaid 直接レンダリング |
| **Google Antigravity** | ✅ | ✅ | ✅ | メイン IDE。チャット内で Mermaid 直接レンダリング |
| **Cursor** | ✅ | ✅ | ✅ | サブ IDE。チャット内で Mermaid 直接レンダリング |
| **VS Code** | ✅ | ✅（拡張） | ✅ | サブ IDE。Markdown Preview Enhanced 等の拡張で Mermaid 対応 |
| **Visual Studio** | ❌ | ❌（拡張依存） | ✅ | サブ IDE。Mermaid 非対応。Markdown テーブルにフォールバック |

---

## フォールバック戦略

`data/presentation.json` の `ide_compatibility` セクションで定義:

1. **Mermaid 対応 IDE**（Windsurf / Antigravity / Cursor / VS Code）
   - Mermaid 図をそのまま使用
   - チャット出力・レポートファイル両方で Mermaid を優先

2. **Mermaid 非対応 IDE**（Visual Studio）
   - Markdown テーブル + インデントリストで代替
   - `templates/diagrams/` の各テンプレートに「フォールバック」セクションを併置
   - XMLドキュメントコメント形式を補足的に使用（C# プロジェクトの場合）

3. **判定方法**
   - Worker / Orchestrator は出力先の IDE を意識する必要はない
   - **原則 Mermaid で出力**し、Visual Studio ユーザーがレポートを閲覧する場合は手元でフォールバック版を参照する
   - レポートファイル（`docs/inbox/REPORT_*.md`）には Mermaid 版のみ記載（SSOT を1つに保つ）

---

## Visual Studio 向け補足

### Markdown プレビュー
- Visual Studio 2022 以降: 組み込み Markdown プレビューあり（Mermaid 非対応）
- 拡張機能: Markdown Editor (Mads Kristensen) を推奨

### C# プロジェクトでの XML ドキュメントコメント
```csharp
/// <summary>
/// データフロー:
/// Config.asset (SO) → GameManager → UI Components
/// </summary>
```

### 推奨ワークフロー
1. タスク確認・チャットは Windsurf / Antigravity で実施（Mermaid 対応）
2. C# 実装は Visual Studio で実施
3. レポート閲覧は VS Code で実施（Mermaid プレビュー対応）

---

## 関連ドキュメント

- `data/presentation.json` — 表示ポリシー SSOT（`ide_compatibility` セクション）
- `templates/diagrams/` — 図テンプレート集（各テンプレにフォールバック版を併置）
- `docs/references/PATTERN_mermaid_usage.md` — Mermaid 図の書き方と表示例
