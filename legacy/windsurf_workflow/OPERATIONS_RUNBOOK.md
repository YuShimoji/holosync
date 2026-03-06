# Operations Runbook（実稼働手順 / 成功・失敗判定）

**毎回の運用SSOT（最優先）**: `docs/windsurf_workflow/EVERY_SESSION.md`  
この Runbook は「詳細手順/背景/例/トラブルシュート」を扱う。毎回の判断や終了時テンプレは SSOT に従う。

目的: shared-workflows を他プロジェクトへ適用し、**再現性のある運用**（止まりにくい・壊れにくい）を実現する。

---

## 1) ユーザー（運用者）がやること

### 初回（プロジェクト導入）

1. `.shared-workflows/` を導入（submodule 推奨）
2. Cursor ルールを適用（推奨）
   - `pwsh -NoProfile -File .shared-workflows/scripts/apply-cursor-rules.ps1 -ProjectRoot .`
3. Kickstart を実行（初回のみ）
   - `.shared-workflows/prompts/first_time/PROJECT_KICKSTART.txt`

### 毎回（セッション開始）

1. （推奨）診断
   - `node .shared-workflows/scripts/sw-doctor.js --profile shared-orch-bootstrap --format text`
2. Orchestrator Driver を貼る（**毎回これだけ**）
   - `.shared-workflows/prompts/every_time/ORCHESTRATOR_DRIVER.txt`

---

## 2) Orchestrator が毎回やること（運用の骨格）

### 入力（Orchestratorへの指示）

- **投入するのは Driver だけ**: `ORCHESTRATOR_DRIVER.txt`
- 状態SSOT: `.cursor/MISSION_LOG.md`
- タスクSSOT: `docs/tasks/`
- 納品: `docs/inbox/` → 次回Orchestratorが回収して `docs/HANDOVER.md` へ統合

### 期待される成果物（ファイル）

- `.cursor/MISSION_LOG.md` が更新され続ける（Current Phase/Blockers/Next）
- `docs/tasks/TASK_*.md` が Status/DoD/Report で整合
- `docs/inbox/REPORT_*.md`（Worker納品）→回収後は `docs/reports/` へアーカイブ
- `docs/HANDOVER.md` が最新に反映される

### 期待されるチャット出力（成功時）

Orchestrator のチャット出力は **固定5セクション**:
1. `## 現状`
2. `## 次のアクション`
3. `## ガイド`
4. `## メタプロンプト再投入条件`
5. `## 改善提案（New Feature Proposal）`

追加セクション（作業評価/結論 等）が混ざっていたら失敗。

### 中間報告（長大作業の安定化）

- ツール呼び出し10回ごと、またはファイル編集5回ごとに **中間報告**を出す
- 中間報告には「次のメッセージでユーザーが返すべき選択肢（1-3件）」を含める

---

## 3) 成功判定（Definition of Success）

最低限、以下が満たされていれば成功:

- Driver どおりにフェーズが進み、MISSION_LOG が更新されている
- `docs/tasks/` と `docs/HANDOVER.md` の整合が取れている
- `report-validator.js` が OK（少なくとも HANDOVER と最新レポート）
- チャット出力が固定5セクションで、改善提案が含まれる

---

## 4) 失敗判定（Failure Signals）

以下は “要修正” の失敗シグナル:

- Driver を貼ったのに、Orchestrator が **一度きりで終了**し次の行動が残らない
- 固定5セクションが崩れる（改善提案欠落、セクション追加など）
- `docs/tasks` が DONE なのに DoD根拠が無い / report が無い
- `docs/inbox` が回収されず残り続ける
- `.shared-workflows/scripts/apply-cursor-rules.ps1` など **新ファイルが submodule に無い**（= 更新遅れ）

対応:
- `sw-doctor` を実行し、WARN/ERROR を潰す
- submodule を更新（親repo側で `git submodule update --init --recursive --remote` 等）


