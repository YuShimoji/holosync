# DEMO_SCENARIOS（WritingPageでの具体運用シナリオ集）

このファイルは「消費側プロジェクト（例: WritingPage）」で shared-workflows をどう回すかの **実例集**です。  
毎回の運用ルールは SSOT `docs/windsurf_workflow/EVERY_SESSION.md` に従います（矛盾したら SSOT 優先）。

---

## 前提（WritingPage側の配置）

- shared-workflows が submodule として `.shared-workflows/` に存在する
- `docs/tasks/` / `docs/inbox/` / `docs/HANDOVER.md` / `AI_CONTEXT.md` が存在する

---

## シナリオ1: 「開始（今日は何も分からない）」から安全に起動する

目的: 作業開始前に「更新遅れ/環境不備/参照漏れ」を潰し、Driver を貼るだけの状態にする。

WritingPage ルートで実行:

```powershell
node .shared-workflows/scripts/sw-update-check.js
node .shared-workflows/scripts/sw-doctor.js --profile shared-orch-bootstrap --format text
pwsh -NoProfile -File .shared-workflows/scripts/apply-cursor-rules.ps1 -ProjectRoot .
```

期待結果:
- `sw-update-check`: `Behind origin/main: 0`（最新）  
  - もし `Behind origin/main: N` なら、**先に submodule を更新**してから続行する（シナリオ4参照）
- `sw-doctor`: ERROR が無い（WARN は理由が分かれば許容）
- `apply-cursor-rules`: `.cursorrules` と `.cursor/rules.md` が配置される

次にやること:
- チャットに `.shared-workflows/prompts/every_time/ORCHESTRATOR_DRIVER.txt` を貼る（毎回これだけ）

---

## シナリオ2: 新規タスクを1件起票→Workerに委譲→納品回収の流れを回す

目的: “Orchestratorが実装しない”を守ったまま、確実に前進する。

### 2-A: Orchestrator（あなた）が行うこと

1. Driver を貼って Orchestrator を起動
2. Phase 4（チケット発行）で `docs/tasks/TASK_XXX_*.md` を起票（Status: OPEN）
3. Phase 5（Worker起動）で Worker prompt を生成
4. Worker に貼り付けて実行させる

### 2-B: Worker（別スレッド）が納品するもの

- `docs/inbox/REPORT_TASK_XXX_<ISO8601>.md`（必須）
- チケット (`docs/tasks/TASK_XXX_*.md`) の更新（Status / Report path / 根拠）
- commit（必要なら push。GitHubAutoApprove の扱いは HANDOVER に従う）

### 2-C: 次回Orchestratorが回収するもの

- `docs/inbox/` の REPORT を `docs/HANDOVER.md` へ統合（Phase 1）
- その後、inbox の REPORT を整理（finalize-phase が使えるなら優先）

終了時の強制（重要）:
- Orchestrator はチャット `## 次のアクション` に **ユーザー返信テンプレ（完了判定+選択肢1-3）**を必ず出す  
  （report-validator が無いと ERROR になります）

---

## シナリオ3: 長大作業で止まった/再開したい（コンテキストロスト対策）

目的: “チャット依存”を減らし、状態ファイルで再開できるようにする。

推奨:
- `.cursor/MISSION_LOG.md` を作る（無ければ `.cursor/MISSION_LOG_TEMPLATE.md` から作成）
- Orchestrator はフェーズ更新/ブロッカー/次手を **毎回** `MISSION_LOG.md` に残す

再開手順（WritingPage側）:

```powershell
node .shared-workflows/scripts/sw-update-check.js
node .shared-workflows/scripts/sw-doctor.js --profile shared-orch-bootstrap --format text
```

次に:
- Driver を同じチャットに貼る（再開も Driver で統一）
- Orchestrator は `MISSION_LOG.md` の Current Phase をSSOTとして続きを進める

補足:
- `sw-doctor` は `MISSION_LOG.md` が IN_PROGRESS のまま長時間更新されない場合に WARN を出す（停止検知の代理）

---

## シナリオ4: 「shared-workflows 側が更新されていて、WritingPageが追従できていない」

症状:
- `.shared-workflows/scripts/apply-cursor-rules.ps1` が無い
- `EVERY_SESSION.md` が無い
- Driver / モジュールが見つからない
- `sw-doctor` が「outdated submodule の可能性」を WARN する

対応（WritingPage側）:

```powershell
git -C .shared-workflows fetch origin
git -C .shared-workflows checkout main
git -C .shared-workflows pull --ff-only
node .shared-workflows/scripts/sw-update-check.js --no-fetch
node .shared-workflows/scripts/sw-doctor.js --profile shared-orch-bootstrap --format text
```

期待結果:
- `Behind origin/main: 0`
- `sw-doctor` の workflow asset WARN が消える

---

## シナリオ5: 「完了したと思ったが、実は完了ではない」事故を仕組みで潰す

目的: “完了宣言の甘さ”を、テンプレ＋validator で強制する。

Orchestrator Report の保存後に必ず実行:

```powershell
node .shared-workflows/scripts/report-validator.js docs/inbox/REPORT_ORCH_<ISO8601>.md REPORT_CONFIG.yml .
```

重要:
- Orchestrator（固定5セクション形式）では、`## 次のアクション` に **ユーザー返信テンプレ**が無いと validator が ERROR になる  
  → “次の指示が曖昧なまま終わる”のを **機械的に禁止**できる


