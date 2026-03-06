# Worker Activation Checklist

最終更新: 2025-12-23  
更新者: Cascade

目的: Orchestrator が「準備作業の整合取り」に滞留して Worker を起動できない状態（準備ループ）を防ぐ。

原則: **起動を止める理由は最小化する（Stop the loop）。**

- 大半の整合崩れ（Handover/Inbox/Archiveの不一致、Reportの整理待ち等）は Worker タスクとして切り出して進められる。
- **本当に危険な状態だけを NO-GO とする。**

---

## 1. GO / NO-GO 判定（最小）

- GO（起動してよい）:
  - チケット（`docs/tasks/TASK_*.md`）が存在し、Focus/Forbidden/DoD が定義されている
  - Worker に渡す最小プロンプト（例: `docs/inbox/WORKER_PROMPT_TASK_*.md`）が作成できる

- NO-GO（起動を止める）:
  - Git 競合がある（unmerged paths / conflict markers）
  - 指定したチケットファイルが存在しない（`--ticket` 指定時）
  - 指定した Worker Prompt が存在しない（`--worker-prompt` 指定時）

上記以外は、基本的に WARNING として扱い、起動を止めない。

---

## 2. ループブレーカー（必須運用）

準備作業が次のいずれかに当てはまる場合、以降は「整合取りを続ける」のではなく **Worker タスクへ切り出して前進する**。

- 同じ確認（Handover/Inbox/Archive照合 等）を 2 回以上繰り返した
- 15 分以上、チケット発行/Worker 起動に到達できていない

対応:

1. 既存チケットを `IN_PROGRESS` のまま保つ（DONE にしない）
2. 「準備タスク」を Tier 1 の別チケットとして発行する（例: `TASK_XXX_prep_cleanup.md`）
3. Worker は prep チケットを処理する（成果は Report + チケット更新 + commit）
4. Orchestrator は「prep が終わるのを待つ」ではなく、次の Worker 起動に進む

---

## 3. 推奨コマンド（1コマンド判定）

Worker 起動の直前に次を実行し、出力に従う。

- Submodule 利用時:
  - `node .shared-workflows/scripts/worker-activation-check.js --ticket docs/tasks/TASK_XXX.md --worker-prompt docs/inbox/WORKER_PROMPT_TASK_XXX.md`

- Submodule 無し（プロジェクトに scripts/ がコピーされている場合）:
  - `node scripts/worker-activation-check.js --ticket docs/tasks/TASK_XXX.md --worker-prompt docs/inbox/WORKER_PROMPT_TASK_XXX.md`

---

## 4. 出力の解釈

- `GO`:
  - Worker を起動する（準備は Worker タスクに含めてよい）

- `NO-GO`:
  - Blocker を解消する
  - 解消が重い場合は、Blocker 解消自体をチケット化して Worker に割り当てる
