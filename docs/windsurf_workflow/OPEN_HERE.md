# OPEN HERE（運用者の入口）

このドキュメントは、**shared-workflows を運用する人間**が「どのフォルダを開いて、どのテンプレをコピペするか」を迷わないための入口です。

- プロジェクト側（Submodule運用）: `.shared-workflows/docs/windsurf_workflow/OPEN_HERE.md`
- このリポジトリ直読み: `docs/windsurf_workflow/OPEN_HERE.md`

---

## 最短ルート（迷ったらこれだけ）

開くフォルダ（参照）:

- `.shared-workflows/docs/windsurf_workflow/`

開くフォルダ（コピペ）:

- `.shared-workflows/prompts/`

毎回コピペするもの（**1つに統一**）:

- **Orchestrator起動/再開（毎回これだけ）**: `.shared-workflows/prompts/every_time/ORCHESTRATOR_DRIVER.txt`

初回だけコピペするもの（環境が未整備の場合）:

- **Kickstart（初回）**: `.shared-workflows/prompts/first_time/PROJECT_KICKSTART.txt`
- **Kickstart再開（セットアップが途中で止まった場合）**: `.shared-workflows/prompts/first_time/PROJECT_KICKSTART_RESUME.txt`

補足:

- 以前の `.shared-workflows/prompts/every_time/ORCHESTRATOR_METAPROMPT.txt` と `ORCHESTRATOR_RESUME.txt` は互換ラッパー（Deprecated）。貼っても Driver へ誘導される。

Global Rules（エディタごとの統一）:

- **Windsurf**: Windsurf Global Rules に `.shared-workflows/prompts/global/WINDSURF_GLOBAL_RULES.txt` を貼り付け
- **Cursor**: PowerShell（推奨: スクリプトで一括適用）:
  ```powershell
  # 消費側プロジェクト（.shared-workflows がある）
  pwsh -NoProfile -File .shared-workflows/scripts/apply-cursor-rules.ps1 -ProjectRoot .

  # shared-workflows リポジトリ直下で試す
  pwsh -NoProfile -File scripts/apply-cursor-rules.ps1 -ProjectRoot .
  ```

  代替（非推奨: 手動での取りこぼし/運用ブレが出やすい）:
  - `.cursorrules` と `.cursor/rules.md` を templates からコピーする

参照するもの（コピペは原則しない）:

- **毎回の運用SSOT（最優先）**: `.shared-workflows/docs/windsurf_workflow/EVERY_SESSION.md`

- **Worker生成テンプレ（参照）**: `.shared-workflows/docs/windsurf_workflow/WORKER_PROMPT_TEMPLATE.md`
  - Orchestrator がチケット内容（Tier/Focus/Forbidden/DoD）に合わせて Worker Prompt を都度生成するためのベース
- **Worker起動判定（準備ループ防止）**: `.shared-workflows/docs/windsurf_workflow/WORKER_ACTIVATION_CHECKLIST.md`
  - Worker 投入の直前に GO/NO-GO を判断し、整合取りで停滞するループを防ぐ

- **タスク委譲ショートカット**: `EVERY_SESSION.md` の「3. タスク委譲のショートカット運用」を参照
  - チケット全文コピペ不要。`TASK_007 を実行して` だけで Worker が自律的に動く
  - スクリプト版: `node .shared-workflows/scripts/worker-dispatch.js --ticket docs/tasks/TASK_XXX.md`

- **実運用手順（成功/失敗判定つき）**: `.shared-workflows/docs/windsurf_workflow/OPERATIONS_RUNBOOK.md`

- **デモ（WritingPage等の消費側でどう使うか）**: `.shared-workflows/docs/windsurf_workflow/DEMO_SCENARIOS.md`

- **更新チェック（推奨）**: `.shared-workflows/scripts/sw-update-check.js`
  - 例: `node .shared-workflows/scripts/sw-update-check.js`

- **サブモジュール更新（クイックコマンド）**: `.shared-workflows/docs/SUBMODULE_GUIDE.md`

- **終了時チェック（推奨）**: `.shared-workflows/scripts/session-end-check.js`
  - 例: `node .shared-workflows/scripts/session-end-check.js --project-root .`

---

## 運用ストレージ（プロジェクト側で必ず見る場所）

- `AI_CONTEXT.md`（プロジェクトルート）: 状態/中断可能点/意思決定
- `docs/HANDOVER.md`: 全体の進捗、ブロッカー、運用フラグ（例: `GitHubAutoApprove: true`）
- `docs/tasks/`: チケット（Status: OPEN/IN_PROGRESS/DONE がSSOT）
- `docs/inbox/`: Worker の納品レポート（次回 Orchestrator が回収して HANDOVER に統合）

---

## 迷いがちなポイント（判断だけ固定）

- GitHub操作（push/PR/merge）を承認待ちで止めない運用にしたい場合は、`docs/HANDOVER.md` に `GitHubAutoApprove: true` を記載して判断根拠を固定する。
- ただし `rebase` / `reset` / `force push` など **破壊的/復旧困難な操作は常に停止して合意を取る**。

---

## 追加の参照（必要なときだけ）

- ルール本体（SSOT）: `.shared-workflows/docs/Windsurf_AI_Collab_Rules_latest.md`
- Worker起動判定（準備ループ防止）: `.shared-workflows/docs/windsurf_workflow/WORKER_ACTIVATION_CHECKLIST.md`
- テンプレ一覧: `.shared-workflows/docs/PROMPT_TEMPLATES.md`
- オーケストレーション手順（参照）: `.shared-workflows/docs/windsurf_workflow/ORCHESTRATOR_PROTOCOL.md`
- コピペ用プロンプト集（貼るだけ）: `.shared-workflows/prompts/`
- 進行の全体像（任意）: プロジェクトルート `ORCHESTRATION_PROMPT.md`（採用している場合のみ）
- **設計原則（データ分離等）**: `.shared-workflows/templates/DESIGN_PRINCIPLES.md`
- **Mermaid図テンプレ集**: `.shared-workflows/templates/diagrams/`
- **サンプルリファレンス**: `.shared-workflows/docs/references/`
- **IDE互換ガイド**: `.shared-workflows/docs/windsurf_workflow/IDE_COMPATIBILITY.md`
- **表示ポリシー（v2）**: `.shared-workflows/data/presentation.json`
- SSOTファイル（`docs/Windsurf_AI_Collab_Rules_latest.md`）がプロジェクトに無い場合は、作業開始前に以下いずれかで `scripts/ensure-ssot.js --project-root .` を実行して補完する:
  1. Submodule推奨: `node .shared-workflows/scripts/ensure-ssot.js --project-root .`
  2. 共有ディレクトリを直接参照: `node ../shared-workflows/scripts/ensure-ssot.js --project-root .` 等
  3. プロジェクト側 `scripts/` にコピーした `ensure-ssot.js` を実行
  - いずれも `.shared-workflows/` が無くても SSOT を揃えられる。コマンドで解決できない場合は停止して参照方法を調整する。
