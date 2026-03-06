# Worker再開ガイド

## 状況判断

Workerが停止した場合、以下の2つの方法で再開できます：

### 方法1: WORKER_COMPLETION_DRIVER.txt を使用（推奨）

**適用条件**:

- 作業は進んでいるが、DoDの達成確認が不十分
- レポートは作成されているが、検証が完了していない
- タスクのStatus更新は完了しているが、DoDチェックリストが未検証

**手順**:

1. **実際のプロジェクトで、停止したタスクの状態を確認**:

   ```powershell
   # 対象プロジェクトで実行
   cd "<project-root>"
   
   # タスクファイルを確認
   Get-Content docs/tasks/TASK_005_missing_reports.md
   
   # レポートファイルを確認
   Get-ChildItem docs/inbox/REPORT_TASK_005*.md
   
   # HANDOVER.mdを確認
   Get-Content docs/HANDOVER.md | Select-Object -First 50
   ```

2. **変数を埋めたWORKER_COMPLETION_DRIVER.txtを生成**:

   以下のテンプレートを使用し、実際の値に置き換えます：

   ```text
   あなたは分散開発チームの Worker です。DoD / Report / テストを未完のまま残さず、以下の残タスクを完了させてください。
   
   ## Phase 0: 状況
   - Ticket: docs/tasks/TASK_005_missing_reports.md
   - Branch: main
   - Focus Area: docs/tasks/, docs/inbox/, docs/reports/, docs/HANDOVER.md
   - Forbidden Area: .shared-workflows/ の直接変更、破壊的Git操作
   - Pending Items: 
     - DoD各項目の実際の達成確認（git history調査、原因分析、予防策実装）
     - 環境依存のタスク（gitリポジトリではない環境）の適切な処理
     - report-validator.jsの正しい実行と結果記録
   - Report Target: docs/inbox/REPORT_TASK_005_missing_reports_20250101.md（既存レポートを更新）
   - HANDOVER Sections: Latest Orchestrator Report, 進捗, バックログ
   
   ## Phase 1: ミッション
   1. docs/tasks/TASK_005_missing_reports.md を最新化（Status / Report パス / 事実追記）
   2. DoD を 1 項目ずつ検証し、差分 or テスト結果の根拠を残す
      - 特に「git history から欠損レポートを特定」については、環境依存で実行不可能な場合の代替手段を記録
      - 各DoD項目に対して、実際に実施した内容を具体的に記録（「確認済み」などの表面的な記述は禁止）
   3. docs/inbox/REPORT_TASK_005_missing_reports_20250101.md を更新し、`report-validator.js` の実行結果を記録
   4. 必須テストを実行し、`<cmd>=<result>` 形式で残す
   5. docs/HANDOVER.md の Latest Orchestrator Report, 進捗, バックログ を更新
   6. `git status -sb` をクリーンにし、必要なら commit / push（push は GitHubAutoApprove=true の場合のみ自律実行）
   
   ## Phase 2: 停止条件（該当時は即報告）
   - Forbidden Area に触れないと DoD を満たせない
   - 仕様仮定が3件以上必要
   - 依存追加 / 外部通信 / 破壊的操作 / 長時間待機が必須
   - SSOT やテンプレが obtain できない（`ensure-ssot.js` でも不可）
   - 実装の代わりに TODO やモックで完結させない（API不明や実測不能時は速やかに BLOCKED とし残件化する）
   
   ## Phase 3: 必須アウトプット
   - Report パス
   - 実行テストログ（`<cmd>=<result>`）
   - DoD 各項目の充足状況（各項目に対して、実際に実施した内容を具体的に記録）
   - `git status -sb` の結果（差分が残る場合は理由と次手）
   
   ## Phase 4: チャット1行
   - Done: `Done: docs/tasks/TASK_005_missing_reports.md. Report: docs/inbox/REPORT_TASK_005_missing_reports_20250101.md. Tests: <cmd>=<result>.`
   - Blocked: `Blocked: docs/tasks/TASK_005_missing_reports.md. Reason: <要点>. Next: <候補>. Report: docs/inbox/REPORT_TASK_005_missing_reports_20250101.md.`
   ```

3. **Workerスレッドに貼り付けて実行**

### 方法2: 新しいWorkerプロンプトを貼り直す

**適用条件**:

- 作業が全く進んでいない
- レポートが作成されていない
- タスクのStatus更新も完了していない
- 最初からやり直したい

**手順**:

1. **WORKER_METAPROMPT.txtを読み込む**:

   ```powershell
   # shared-workflows-1リポジトリで実行
   Get-Content prompts/every_time/WORKER_METAPROMPT.txt
   ```

2. **Orchestratorが生成したWorkerプロンプトを確認**:

   ```powershell
   # WritingPageプロジェクトで実行
   Get-Content docs/inbox/WORKER_PROMPT_TASK_005_missing_reports.md
   ```

3. **Workerスレッドに貼り付けて実行**:
   - まず `WORKER_METAPROMPT.txt` を貼り付ける
   - 次に `docs/inbox/WORKER_PROMPT_TASK_005_missing_reports.md` の内容を貼り付ける

## 推奨判断基準

| 状況 | 推奨方法 |
|------|---------|
| レポートは作成されているが、DoD検証が不十分 | **方法1: WORKER_COMPLETION_DRIVER.txt** |
| タスクのStatus更新は完了しているが、DoDチェックリストが未検証 | **方法1: WORKER_COMPLETION_DRIVER.txt** |
| 作業が全く進んでいない | **方法2: 新しいWorkerプロンプト** |
| レポートが作成されていない | **方法2: 新しいWorkerプロンプト** |

## 注意事項

1. **環境依存のタスクの扱い**:
   - gitリポジトリではない環境で、git history調査が必要なDoD項目がある場合
   - 停止条件として扱うか、代替手段を取るかを判断する
   - 判断結果と理由をレポートに記録する

2. **DoDの達成確認**:
   - 各DoD項目に対して、実際に実施した内容を具体的に記録する
   - 「確認済み」などの表面的な記述は禁止
   - 環境依存で実行不可能な項目がある場合の停止条件を明確化

3. **report-validator.jsの実行**:
   - 正しい引数順で実行する（`node .shared-workflows/scripts/report-validator.js <REPORT_PATH> --profile <PROFILE> <CONFIG_PATH>`）
   - 実行結果をレポートに記録する

4. **PowerShell構文エラーの回避**:
   - コマンド実行前に、`Get-Command <cmd>` で存在確認
   - 複雑な条件分岐は、スクリプトファイルに分離する
