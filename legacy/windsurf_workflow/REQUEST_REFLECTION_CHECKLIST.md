# Request Reflection Checklist

最終更新: 2025-12-23  
更新者: Cascade

ユーザーからの依頼を「実行済み + レポート済み」の状態で確実に残すための共通チェックリスト。Orchestrator/Worker は **セッション開始直後に参照し、完了前に必ず再確認** する。

---

## 1. Intake（依頼受領直後）

1. 依頼内容を `docs/tasks/` にタスク化し、Tier / Branch / Focus / Forbidden / DoD を明記する。
2. `docs/HANDOVER.md` と `AI_CONTEXT.md`（Nextセクション）に反映予定を記録する。
3. todo_list を更新し、進行中は **1件だけ in_progress** を保つ。

## 2. Execution（実装中の共通確認）

- `git status -sb` で不要差分が無いかを常に監視し、目的外のファイルを早期に整理する。
- SSOT不足・スクリプト欠如があれば `.shared-workflows/scripts/ensure-ssot.js` で補完し、解決ログを残す。
- 依頼内容と異なる作業が発生した場合は即座にタスクへ反映し、DoDを更新する。
- 「実装できた」だけで終えず、DoDに沿って検証コマンド/結果をまとめる。

## 3. Completion（チャット報告前の必須項目）

1. `docs/inbox/REPORT_<ISO8601>.md` を作成し、Changes/Decisions/Verification/Risk/Remaining を記入する。
2. チケット（`docs/tasks/TASK_*.md`）を DONE にし、Report パスと結果要約を追記する。
3. `docs/HANDOVER.md` の最新状況を更新し、未統合レポートをゼロにする。
4. `node .shared-workflows/scripts/report-validator.js <report>`（または `node scripts/report-validator.js ...`）で検証する。
5. `git status -sb` がクリーン（`??` や `M` なし）であることを確認してから `git push origin <branch>` を実行する。GitHubAutoApprove=false の場合は push 必要性を Next に明記して STOP する。
6. 競合やテスト失敗があれば「失敗」として事実/根拠/次手をチケットとレポートに残す。

## 4. Chat Guard

- **Orchestrator**: チャット出力は固定5セクション（`data/presentation.json` の `chat_output.orchestrator` 準拠）。
- **Worker**: チャット出力は固定3セクション（結果 / 変更マップ / 次の選択肢。`data/presentation.json` の `chat_output.worker` 準拠）。
- チャット送信前に必ず本チェックリストを再確認し、「未反映の依頼」が残っていないかを `docs/tasks/` と `git status` で再確認する。

---

このチェックリストは `prompts/every_time/ORCHESTRATOR_DRIVER.txt` / `WORKER_METAPROMPT.txt` からも参照される。手順を省略せず、依頼が未反映のまま終了しないよう運用すること。

---
