# EVERY_SESSION（毎回の運用SSOT / これだけ見れば迷わない）

目的: shared-workflows の運用を **毎回ブレずに**実行する。  
このファイルは「運用まとめ」の **Single Source of Truth (SSOT)**。他ドキュメントは詳細/背景/補足であり、矛盾した場合は本ファイルの方針を優先する。

---

## 0. 入口（必ずここから）

- **入口（運用者）**: `docs/windsurf_workflow/OPEN_HERE.md`
- **実運用の詳細（手順/期待結果）**: `docs/windsurf_workflow/OPERATIONS_RUNBOOK.md`
- **具体シナリオ（WritingPage等）**: `docs/windsurf_workflow/DEMO_SCENARIOS.md`

Submodule 運用（推奨）の場合は、上記パスの先頭に `.shared-workflows/` を付けて読む:

- 例: `.shared-workflows/docs/windsurf_workflow/EVERY_SESSION.md`

---

## 1. 非交渉ルール（毎回徹底）

- **変更は必ず commit し、必要なら push する**（作業終了時に「push済み/未push」を曖昧にしない）
- **プロジェクトをクリーンに保つ**（`git status -sb` がクリーンであることを確認してから完了を名乗る）
- **推奨対応で強力に進める**（ただし、破壊的/復旧困難操作は常に停止して合意を取る）
- **検証は MCP/自動実行を優先**し、手動検証は「自動で代替不能な項目」に限定する
- **MCP未接続・自動実行失敗のときは完了扱いにしない**（`IN_PROGRESS/BLOCKED` を維持し、理由と次手を明記）
- **SSOT更新を先に行う**（状態が曖昧なときは新規タスク起票より先に `docs/WORKFLOW_STATE_SSOT.md` を更新）
- **作業終了時は必ず**:
  - **完了/未完了**を明言する
  - **次にユーザーが返すべきテンプレ**を提示する（下記「4. 終了時テンプレ」）

---

## 2. 毎回の実行（最短ルート）

### Step A: 更新チェック（推奨）

Submodule を使っている場合（`.shared-workflows/` がある場合）:

- `node .shared-workflows/scripts/sw-update-check.js`

期待結果:

- `Behind origin/main: 0` なら最新
- `Behind origin/main: N` なら更新が必要（更新してから着手）

### Step B: 環境診断（推奨）

- `node .shared-workflows/scripts/sw-doctor.js --profile shared-orch-bootstrap --format text`

期待結果:

- 重大な ERROR が無い
- WARN は「理由が分かっていて許容できる」ものだけ

### Step C: ルール適用（Cursor / 推奨）

- `pwsh -NoProfile -File .shared-workflows/scripts/apply-cursor-rules.ps1 -ProjectRoot .`

期待結果:

- `.cursorrules` と `.cursor/rules.md` が配置される

### Step D: Orchestrator 起動（毎回これだけ）

- `.shared-workflows/prompts/every_time/ORCHESTRATOR_DRIVER.txt` をチャットに貼る  
  （再開も同じ Driver で良い）

---

### Step E: 終了時チェック（推奨）

- `node .shared-workflows/scripts/session-end-check.js --project-root .`

期待結果:

- `Result: OK`

補足:

- `--no-fetch` を付けると外部通信（fetch）を抑制できる

---

## 2.5 Windsurf 側の推奨ユーザー対応（毎回）

目的: 「AIが止まった/終わった気になる/指示無視」を、ユーザー側でも **機械的に判定**できるようにする。

- **ユーザーがやること（毎回）**:
  - `node .shared-workflows/scripts/sw-update-check.js`
  - `node .shared-workflows/scripts/sw-doctor.js --profile shared-orch-bootstrap --format text`
  - （Cursorなら）`pwsh -NoProfile -File .shared-workflows/scripts/apply-cursor-rules.ps1 -ProjectRoot .`
  - チャットに `.shared-workflows/prompts/every_time/ORCHESTRATOR_DRIVER.txt` を貼る

- **期待される結果（成功判定）**:
  - `sw-update-check`: `Behind origin/main: 0`
  - `sw-doctor`: ERROR が無い（WARN は理由が明確）
  - Orchestrator のチャット出力が **固定5セクションのみ**（追加セクション無し）
  - `## 次のアクション` に **ユーザー返信テンプレ（完了判定 + 選択肢1-3）** が含まれる

- **失敗と判断する結果（即STOPして再投入/再試行）**:
  - `Behind origin/main: N (N>0)`（submodule更新が必要）
  - `sw-doctor` が ERROR を出す（環境不備）
  - Orchestrator が固定5セクション以外を出力（例: 結論/作業評価）
  - `## 次のアクション` にユーザー返信テンプレが無い（= report-validator でも ERROR になる）
  - `git status -sb` が汚いのに「完了」と言う（完了条件違反）
  - 「停止していません」という返答をしたが、固定5セクション形式が不完全（プロトコル違反）

---

## 2.6 MCP 検証ガード（再発防止）

- **完了判定に必要な最小記録**:
  - `MCP_CONNECTIVITY=AVAILABLE/UNAVAILABLE`
  - `Verification Mode=AUTO_VERIFIED/PARTIALLY_COMPLETED/MANUAL_PENDING`
  - `Manual Pending Items=<なし/項目一覧>`
- **DONE 禁止条件**:
  - `Verification Mode` が `PARTIALLY_COMPLETED` または `MANUAL_PENDING`
  - レポートに `ready for manual testing` 等の保留文言がある
  - 実測値が `TBD` のまま残っている
- **MCP未接続時の扱い**:
  - 独断で「手動確認済み」にしない
  - 必ず `IN_PROGRESS` または `BLOCKED` にして、ユーザー実行ステップを `## 次のアクション` に具体化する
  - タスク全体を停止させず、**実行可能部分を分割して `PARTIALLY_COMPLETED` で前進**させる
  - 進め方は「`完了済み` / `保留` / `次の最短手順`」の3点を固定で記録する
  - 保留項目は 1 回の往復で消化できる粒度（例: 「スクショ3枚不足」）まで分解して提示する

- **滞留回避の原則（MCP不可/不安定時）**:
  - 「検証不能」だけで作業全体を止めない
  - DoD を `自動で回収済み` と `手動入力が必要` に分離し、前者を先にクローズする
  - 手動項目はテンプレート化し、実施後は即時に成果物へ反映して再判定する
  - `BLOCKED` は「代替手順が存在しない場合」に限定する

- **検証深度の制御（開発優先）**:
  - 原則: **ゲーム本体開発を優先**し、検証は「品質ゲートに直結する最小セット」に限定する
  - 高重要（継続必須）:
    - クラッシュ/データ破損/進行不能/リリース可否に直結する検証
  - 低〜中重要（切り上げ可）:
    - 最終判定に影響しない追加観測、重複確認、過剰な再実測
  - 運用:
    - 低〜中重要の未実施項目は `Deferred Verification` として記録し、開発タスクを先に進める
    - `Deferred` を理由にタスク全体を `BLOCKED` にしない

- **終了時の推奨ユーザー返信（固定テンプレ）**:
  - 本ファイル「4. 終了時テンプレ」をそのまま使う

## 2.7 BLOCKED 正規形（停止を情報に変換）

- BLOCKED は次のテンプレで必ず記録する（不足項目がある BLOCKED は無効）:

```text
Blocker Type: <Environment|Permission|Dependency|Missing Reference|Spec Undefined|Other>
Blocked Scope: <Task ID + Layer A/B>
AI-Completable Scope (Layer A): <AIだけで完了可能な範囲>
User Runbook (Layer B): <ユーザーが実行する具体手順>
Resume Trigger: <再開条件（ファイル更新/証跡追加/権限解除など）>
Re-proposal Suppression:
- If blocker type + resume trigger are unchanged, do not propose a new ticket.
- Instead, output only the user run steps and expected evidence path.
```

## 2.8 ループブレーカー（強制遷移）

- 同一準備（同一チェック、同一照合、同一「実測待ち」案内）を **2回連続**で行った場合:
  - 3回目は同じ準備を繰り返さない
  - 「準備タスク」と「実行タスク」を分離し、準備側は Layer A として完了させる
  - 残件は Layer B のユーザー手順として固定テンプレで引き渡す
- `docs/WORKFLOW_STATE_SSOT.md` の `Next Action` は常に1件に保つ（分岐提案より先に一本化）

---

## 3. タスク委譲のショートカット運用

### 方法A: 1行指定（推奨）

Worker スレッドに貼るだけ:

```text
TASK_007 を実行してください。Worker Metaprompt: .shared-workflows/prompts/every_time/WORKER_METAPROMPT.txt
```

Worker が `docs/tasks/TASK_007*.md` を読み取り、WORKER_METAPROMPT に従って実行→固定3セクションで報告。

### 方法B: スクリプト生成（任意）

```powershell
node .shared-workflows/scripts/worker-dispatch.js --ticket docs/tasks/TASK_007.md
```

オプション: `--unity`（Unity版）/ `--dry-run`（確認のみ）/ `--output <path>`（ファイル出力）

---

## 4. "同期が不要な仕組み"へ寄せる方針（散逸対策）

散逸しやすい情報（運用まとめ/ルール/手順/テンプレ）を「手で同期」しないため、次を原則とする:

- **入口は `OPEN_HERE.md` に一本化**（導線だけを短く保つ）
- **運用SSOTは本ファイルに一本化**（毎回の判断/テンプレはここ）
- **詳細は `OPERATIONS_RUNBOOK.md` に寄せる**（手順の背景/例/トラブルシュート）
- **検査はスクリプトに寄せる**（`sw-update-check` / `sw-doctor` / `report-validator`）

この方針に反する新規ドキュメント追加は禁止（必要なら本ファイルか Runbook を更新する）。

---

## 5. 終了時テンプレ（毎回ブレない / ユーザー返信用）

作業終了時（完了でも未完了でも）に、必ずこのテンプレを提示する。  
テンプレは **コピーしてそのまま送れる**ことが要件（内容が薄い場合は「未完了」を選ぶ）。

```text
【確認】完了判定: 完了 / 未完了

【状況】（1-3行）
- いま何が終わっていて、何が残っているか:

【次に私（ユーザー）が返す内容】以下から1つ選んで返信します:

### 推奨アクション
1) ⭐⭐⭐ 「選択肢1を実行して」: <ここに選択肢1> - <理由・影響>
2) ⭐⭐ 「選択肢2を実行して」: <ここに選択肢2> - <理由・影響>

### その他の選択肢
3) ⭐ 「選択肢3を実行して」: <ここに選択肢3> - <理由・影響>
<追加の選択肢がある場合は4, 5...と続ける>

### 現在積み上がっているタスクとの連携
- 選択肢1を実行すると、<TASK_ID>（優先度: High/Medium/Low）の<前提条件/並行作業/依存関係>が整います
- 選択肢2を実行すると、<TASK_ID>（優先度: High/Medium/Low）と並行して進められます

【補足（任意）】
- 制約/優先度/締切:
```

**注記**: 選択肢の数は3つに限定せず、状況に応じて増減可能。推奨度（⭐⭐⭐/⭐⭐/⭐）とタスク連携情報を必ず含めること。

### 完了を名乗る最低条件（強制）

- `git status -sb` がクリーン（`M`/`??` が無い）
- 変更がある場合は commit 済み
- push が必要なら push 済み（または GitHubAutoApprove=false で **push pending を明記**）
- Orchestrator/Worker のレポート保存が要求される場合は `report-validator` を通過済み

---

## 6. 改善提案（提案するべき"類する機能"）

- **(導入済み) session-end-check**: 終了時テンプレの有無 / git clean / push pending を検査し、NOT OK を出す簡易チェッカー（`scripts/session-end-check.js`）
- **(提案) docs-entrypoint-check**: `OPEN_HERE` が本ファイルと Runbook を参照しているか、Driver が固定5セクションと終了テンプレを要求しているかを検査する（散逸の早期検知）
