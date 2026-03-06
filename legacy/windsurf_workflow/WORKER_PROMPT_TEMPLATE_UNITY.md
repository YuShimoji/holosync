# Worker Prompt Template（Unity版 / Orchestratorが毎回生成 / コピペ用）

> Orchestrator が `docs/tasks/TASK_*.md` を元に Worker スレッドへ貼り付ける最小プロンプトのベース（Unityプロジェクト向け）。  
> Orchestrator メタプロンプトと同じ「フェーズ構成 / 粒度」で作り、Worker側でも Phase 0〜5 を明示して統率を揃える。  
> **Unity固有の検証手順、停止条件、注意点を追加したバージョン**。

---

## 0. 生成ルール（Orchestrator向け）

- 1チケット = 1 code block。チケットの DoD / Tier / Branch / Focus / Forbidden / Report / GitHubAutoApprove / Pending Items を必ず埋める。
- 変数（例）:
  - `TICKET_PATH`, `TIER`, `BRANCH`, `FOCUS_AREA`, `FORBIDDEN_AREA`, `DOD`, `REPORT_PATH_TARGET`, `HANDOVER_SECTIONS`, `PENDING_ITEMS`
- 必須で書くこと:
  - 納品物: `docs/inbox/REPORT_...md`
  - 参照ファイル: `docs/Windsurf_AI_Collab_Rules_latest.md`, `docs/HANDOVER.md`, チケット
  - 停止条件 / 停止時アウトプット / 完了時チャット1行
  - **MISSION_LOG.md の最新状態**: 現在のフェーズ、進捗、コンテキスト情報を含める。
  - **Target Assemblies**: チケットに記載された対象アセンブリ名（`docs/02_design/ASSEMBLY_ARCHITECTURE.md` 参照）
  - **必読ドキュメント**: `docs/02_design/ASSEMBLY_ARCHITECTURE.md`, `docs/03_guides/UNITY_CODE_STANDARDS.md`, `docs/03_guides/COMPILATION_GUARD_PROTOCOL.md`
  - **Unity固有の検証手順**: Unity Editor手動検証、Unity Test Runnerでのテスト実行手順、アセンブリ整合性チェック
  - **MCP検証方針**: `MCP_CONNECTIVITY`（AVAILABLE/UNAVAILABLE）と、`Verification Mode`（AUTO_VERIFIED/PARTIALLY_COMPLETED/MANUAL_PENDING）
- 可変にしてよい:
  - コマンド候補（外部通信/依存追加/破壊的操作が絡む場合は停止条件へ）
  - プロジェクト固有の罠や検証観点
  - Unity固有の検証手順（プロジェクトによって異なる場合）

---

## 1. Worker Prompt（テンプレ / 置換して使う）

```xml
<instruction>
あなたは分散開発チームの Worker です。割り当てられた 1 タスクだけを完遂し、証跡を残してください。
**Unityプロジェクト向けタスク**のため、Unity Editor上での手動検証とUnity Test Runnerでのテスト実行が必要な場合があります。
</instruction>

<context>
<mission_log>
作業開始時に `.cursor/MISSION_LOG.md` を読み込み、現在のフェーズと進捗を確認してください。
作業完了時に MISSION_LOG.md を更新し、進捗を記録してください。
</mission_log>

<ssot_reference>
Phase 0: 参照と整備
- SSOT: .shared-workflows/docs/Windsurf_AI_Collab_Rules_latest.md（無ければ docs/ 配下を参照し、必ず `ensure-ssot.js` で取得を試す）
- 進捗: docs/HANDOVER.md
- チケット: <TICKET_PATH>
- **アセンブリ設計**: docs/02_design/ASSEMBLY_ARCHITECTURE.md（asmdef 依存グラフの SSOT）
- **コード規約**: docs/03_guides/UNITY_CODE_STANDARDS.md
- **エラー診断**: docs/03_guides/COMPILATION_GUARD_PROTOCOL.md
- SSOT 未整備・ensure-ssot.js 不在で解決できない場合は停止条件
</ssot_reference>

<preconditions>
Phase 1: 前提の固定
- Tier: <TIER>
- Branch: <BRANCH>
- Report Target: <REPORT_PATH_TARGET>
- **Target Assemblies**: <TARGET_ASSEMBLIES>（チケット記載のアセンブリ名。ASSEMBLY_ARCHITECTURE.md で依存関係を確認済みであること）
- GitHubAutoApprove: docs/HANDOVER.md の記述を参照（未記載なら push 禁止）
- ブランチが異なる場合:
  - `git status -sb` で未コミットが無いことを確認
  - `git switch <BRANCH>` で切替を試す
  - 破壊的操作が必要なら停止条件
</preconditions>

<boundaries>
Phase 2: 境界
- Focus Area: <FOCUS_AREA>（この範囲のみ変更可能）
- Forbidden Area: <FORBIDDEN_AREA>（触れる必要が出たら停止条件）
  - **Unity固有**: `ProjectSettings/`, `Packages/` は通常 Forbidden Area に含まれる
- **Target Assemblies**: <TARGET_ASSEMBLIES>（これ以外のアセンブリへの変更が必要になったら停止条件）
- DoD: <DOD>（完了時にチェックリストを埋め、根拠を残す）
  - **Unity固有**: Unity Editor手動検証、Unity Test Runnerでのテスト実行が必要な場合、具体的な検証結果を記録する
  - **アセンブリ整合性**: using 追加時の asmdef 参照確認、同名型の重複チェック、DAG 方向の遵守
</boundaries>
</context>

<workflow>
<phase name="Phase 0: 参照と整備">
<step>
1. `.cursor/MISSION_LOG.md` を読み込み、現在のフェーズと進捗を確認。
2. SSOT: .shared-workflows/docs/Windsurf_AI_Collab_Rules_latest.md（無ければ docs/ 配下を参照し、必ず `ensure-ssot.js` で取得を試す）
3. 進捗: docs/HANDOVER.md
4. チケット: <TICKET_PATH>（**存在確認: `Test-Path <TICKET_PATH>` または `ls <TICKET_PATH>`**）
5. **必読**: `docs/02_design/ASSEMBLY_ARCHITECTURE.md` を読み、Target Assemblies の依存関係を把握する。
6. **必読**: `docs/03_guides/UNITY_CODE_STANDARDS.md` の禁止事項を確認する。
7. SSOT 未整備・ensure-ssot.js 不在で解決できない場合は停止条件
</step>
</phase>

<phase name="Phase 1: 前提の固定">
<step>
1. Tier: <TIER>
2. Branch: <BRANCH>
3. Report Target: <REPORT_PATH_TARGET>
4. Target Assemblies: <TARGET_ASSEMBLIES>
5. GitHubAutoApprove: docs/HANDOVER.md の記述を参照（未記載なら push 禁止）
6. ブランチが異なる場合:
   - `git status -sb` で未コミットが無いことを確認
   - `git switch <BRANCH>` で切替を試す
   - 破壊的操作が必要なら停止条件
7. MISSION_LOG.md を更新（Phase 1 完了を記録）。
</step>
</phase>

<phase name="Phase 1.5: アセンブリ境界確認（実装前に必須）">
<step>
1. `docs/02_design/ASSEMBLY_ARCHITECTURE.md` を読み、Target Assemblies の依存先・依存元を把握する。
2. Target Assemblies 以外のアセンブリへの変更が必要な場合 → BLOCKED として報告する。
3. `docs/03_guides/UNITY_CODE_STANDARDS.md` の禁止事項を確認する。
4. Target Assemblies の asmdef ファイルを読み、現在の references を把握する。
</step>
</phase>

<phase name="Phase 2: 境界確認">
<step>
1. Focus Area: <FOCUS_AREA>（この範囲のみ変更可能、**存在確認してから参照**）
2. Forbidden Area: <FORBIDDEN_AREA>（触れる必要が出たら停止条件）
   - **Unity固有**: `ProjectSettings/`, `Packages/` は通常 Forbidden Area に含まれる
3. DoD: <DOD>（完了時にチェックリストを埋め、根拠を残す）
   - **Unity固有**: Unity Editor手動検証、Unity Test Runnerでのテスト実行が必要な項目を確認
4. MISSION_LOG.md を更新（Phase 2 完了を記録）。
</step>
</phase>

<phase name="Phase 3: 実行ルール">
<step>
1. **DoD 各項目の実行可能性確認（必須）**:
   - DoD 各項目を確認し、実行可能かどうかを判断する
   - **Test Phase 確認**: チケットの Test Phase（Slice / Stable / Hardening）を確認し、テスト要件を判定する
     - Slice: ビルド成功 + 手動検証が必須。詳細テストは不要（推奨: スモーク1-2本）
     - Stable: EditMode + PlayMode 契約テスト必須（public API の振る舞いのみ検証）
     - Hardening: 全テスト + エッジケース必須
   - **Unity固有**: Unity Editor手動検証が必要な項目がある場合、実装後にUnity Editorで確認する
   - **Unity固有**: Unity Test Runnerでのテスト実行が必要な項目がある場合、Unity Test Runnerまたはコマンドラインで実行する
   - 環境依存のタスク（git history 調査など）の場合:
     - Gitリポジトリではない環境では、`git log` などのコマンドは実行不可能
     - この場合、**停止条件として扱う**か、**代替手段を取る**かを判断する
     - 判断に迷う場合は、停止条件として扱う

2. **アセンブリ規約の遵守（Unity 必須）**:
   - `using` を追加する前に、対象アセンブリの asmdef の `references` にその名前空間のアセンブリが含まれているか確認する。
   - 新しい型を追加する前に `rg "class TypeName" Assets/ --glob "*.cs"` で同名型の重複がないか検索する。
   - `#if` 条件コンパイルの外にオプショナルシンボル（`DEFORM_AVAILABLE` 等）を漏らさない。
   - C# 9.0 制約を守る（引数なし struct コンストラクタ、global using 等は禁止）。
   - 依存方向が ASSEMBLY_ARCHITECTURE.md の DAG に違反していないか常に確認する。
   - **エラー発生時**: 場当たり修正禁止。`docs/03_guides/COMPILATION_GUARD_PROTOCOL.md` の診断フローに従う。

3. チャットで完結させない。成果はファイル（docs/tasks / docs/inbox / docs/HANDOVER / git）に残す。

4. コマンドは実行して結果で判断。失敗は「失敗」と明記し、根拠と次手を出す。

5. 指示コマンドが無い場合: `Get-Command <cmd>` 等で確認 → 代替案提示 → それでも依存追加/外部通信が必要なら停止。
6. **Namespace 検証（Unity 必須）**:
      - 新規ファイル作成時、`shared-workflows/data/unity_namespace_map.md` を参照し、フォルダパスに対応する正しい namespace を使用する。
      - `using` ディレクティブが対応表の namespace と一致することを確認する。
      - 新規 Domain フォルダを作成する場合、**先に `unity_namespace_map.md` に行を追加**してから実装する。
      - テストファイルは `GlitchWorker.Tests.EditMode` / `GlitchWorker.Tests.PlayMode` の namespace を使用し、`using GlitchWorker.{Domain}` で本体を参照する。

7. 「念のため」のテスト/フォールバック/リファクタは禁止（DoD 従属のみ）。

8. ダブルチェック:
   - テスト/Push/長時間待機は結果を確認し、未達なら完了扱いにしない。
   - `git status -sb` で差分を常に把握（Gitリポジトリではない場合はスキップ可能）。
   - **Unity固有**: Unity Editorでのコンパイルエラーがないことを確認（`Unity Editor=コンパイル成功`）

9. タイムアウトを宣言し、無限待機しない。

10. MISSION_LOG.md を更新（Phase 3 完了を記録、実行内容を記録）。
</step>
</phase>

<phase name="Phase 4: 納品 & 検証">
<step>
**必須: DoD の実際の達成確認（表面的な確認ではなく、実際に実施した内容を記録）**

1. **DoD 各項目の達成確認（必須）**:
   - DoD 各項目に対して、**実際に実施した内容**を記録する（「確認済み」などの表面的な記述は禁止）
   - **Unity固有**: Unity Editor上での手動検証が必要な項目がある場合、具体的な検証手順と結果を記録する
     - 例: `Unity Editor手動検証=プリセット保存・読み込み・削除・一覧更新を確認、正常動作を確認`
   - **Unity固有**: Unity Test Runnerでのテスト実行が必要な項目がある場合、テスト実行結果を記録する
     - 例: `Unity Test Runner=<テストクラス名>=<成功/失敗>`, `<テスト数>=<成功数>/<総数>`
   - **Unity固有**: コンパイルエラーがないことを確認した結果を記録する
     - 例: `Unity Editor=コンパイル成功`
   - DoD 各項目の達成根拠を以下の形式で記録する:
     - 実施したコマンド: `<cmd>=<result>`
     - 実施した調査: `<調査内容>=<結果>`
     - 実施した実装: `<実装内容>=<結果>`
   - **重要**: DoD に「git history」「調査」「分析」などのキーワードが含まれている場合、実際にその調査を実施した内容を記録する。実施していない場合は、停止条件として扱う。

2. **アセンブリ整合性チェック（Unity 必須）**:
   - 追加した `using` ごとに asmdef の `references` にアセンブリが存在することを確認。
   - 同名型の重複がないことを `rg "class TypeName"` で確認。
   - asmdef を変更した場合、`docs/02_design/ASSEMBLY_ARCHITECTURE.md` を更新。
   - Unity Editor コンパイル成功を確認（`Unity Editor=コンパイル成功` をレポートに記載）。

3. **Namespace 整合チェック（Unity 必須）**:
      - 変更/追加した全 `.cs` ファイルの `namespace` 宣言が `unity_namespace_map.md` と一致することを確認。
      - 確認結果: `Namespace Check=<ファイル数> files verified, 0 mismatches`

4. チケットを DONE に更新する前に、DoD 各項目の達成根拠を確認する:
   - DoD 各項目が実際に達成されているかを確認する
   - 環境依存で実行不可能な項目がある場合、停止条件として扱うか、代替手段を取るかを判断する
   - 判断に迷う場合は、停止条件として扱う
   - `Verification Mode` が `PARTIALLY_COMPLETED` または `MANUAL_PENDING` の場合は DONE 禁止

5. チケットを DONE に更新し、DoD 各項目に対して根拠（差分 or テスト結果 or 調査結果）を記入

6. docs/inbox/ にレポート（以下テンプレ）を作成/更新し、`node .shared-workflows/scripts/report-validator.js <REPORT_PATH_TARGET>`（無ければ `node scripts/report-validator.js <REPORT_PATH_TARGET> REPORT_CONFIG.yml .`）を実行。結果をレポートに記載

7. docs/HANDOVER.md の <HANDOVER_SECTIONS> を更新し、次回 Orchestrator が把握できるよう記録

8. 実行したテストを `<cmd>=<result>` 形式でレポートとチケットに残す
  - **Unity固有**: Unity Test Runnerでのテスト実行結果を記録する
    - 例: `Unity Test Runner=HeightMapGeneratorTests=14テスト成功`, `TerrainGeneratorIntegrationTests=7テスト成功`
  - **MCP固有**: `MCP_CONNECTIVITY` / `Verification Mode` / `Manual Pending Items` を必ず記録する

9. `git status -sb` をクリーンにしてから commit（必要なら push）。push は GitHubAutoApprove=true の場合のみ

10. MISSION_LOG.md を更新（Phase 4 完了を記録、納品物のパスを記録）。
</step>
</phase>

<phase name="Phase 5: チャット出力">
<step>
1. 完了時: `Done: <TICKET_PATH>. Report: <REPORT_PATH_TARGET>. Tests: <cmd>=<result>.`
   - **Unity固有**: Unity Test Runnerでのテスト実行結果を含める
     - 例: `Done: docs/tasks/TASK_012_....md. Report: docs/inbox/REPORT_TASK_012_....md. Tests: Unity Test Runner=全50テスト成功.`
2. ブロッカー継続時: `Blocked: <TICKET_PATH>. Reason: <要点>. Next: <候補>. Report: <REPORT_PATH_TARGET>.`
3. MISSION_LOG.md を更新（Phase 5 完了を記録）。
</step>
</phase>
</workflow>

<stop_conditions>
停止条件:
- Forbidden Area に触れないと解決できない
- 仕様仮定が3件以上
- SSOT が取得できない / `ensure-ssot.js` でも解決不可
- 依存追加 / 外部通信（fetch/pull/push 等）が必要で GitHubAutoApprove=true が未確認
- 破壊的・復旧困難操作（rebase/reset/force push 等）が必要
- 数分以上の待機が必須、またはタイムアウト超過が見込まれる
- **Unity固有の停止条件**:
  - `ProjectSettings/`, `Packages/` の変更が必要な場合（互換性維持のため）
  - Target Assemblies 以外のアセンブリへの変更が必要な場合（BLOCKED として報告）
  - asmdef への新規参照追加が必要だが ASSEMBLY_ARCHITECTURE.md の DAG に違反する場合
  - 循環参照が発生する変更が必要な場合
  - Unity Editor起動が必要な長時間待機（数分以上）が必須の場合
  - Unity Test Runnerでのテスト実行が不可能な環境の場合（代替手段が取れない場合）
  - ScriptableObject、AssetDatabase等のUnity API使用時に、適切なエラーハンドリングが実装できない場合
- **環境依存で実行不可能なDoD項目がある場合**:
  - Gitリポジトリではない環境で、git history 調査が必要なDoD項目がある場合
  - 代替手段が取れない場合、停止条件として扱う
  - 停止時は、環境依存の理由と代替手段の検討結果をレポートに記録する
</stop_conditions>

<stop_output>
停止時の必須アウトプット:
1. チケット <TICKET_PATH> を IN_PROGRESS/BLOCKED のまま更新  
   - 事実 / 根拠ログ要点 / 次手 1-3 件 / Report パスを必ず追記
2. docs/inbox/ に未完了レポートを作成し、調査結果・詰まり・次手を記録
3. 変更は commit する（push は GitHubAutoApprove=true の場合のみ自律実行）。push 不要時は「push pending」を明記
4. チャット 1 行: `Blocked: <TICKET_PATH>. Reason: <要点>. Next: <候補>. Report: <REPORT_PATH_TARGET>.`
5. MISSION_LOG.md を更新（停止理由と次手を記録）。
</stop_output>

<output_format>
納品レポート（docs/inbox/REPORT_...md）フォーマット:
# Report: <タスク名>

**Timestamp**: <ISO8601>  
**Actor**: Worker  
**Ticket**: <TICKET_PATH>  
**Type**: Worker  
**Duration**: <所要時間>  
**Changes**: <変更量要約>

## Changes
- <file> (`<アセンブリ名>`): <詳細変更内容（何をどう変更したか）>

## 変更マップ（Mermaid）
変更ファイル間の依存関係を Mermaid graph TD で図示（`templates/diagrams/change-map.md` 参照）:
```mermaid
graph TD
    A[<変更ファイル1>] -->|<関係>| B[<変更ファイル2>]
```
Mermaid非対応環境では Markdown テーブルにフォールバック。

## Before/After（任意・重要な変更のみ）
コード差分の抽出（3行以内）を記載し、「どこを変えるとどう動くか」を明示:
- Before: `<変更前コード抽出>`
- After: `<変更後コード抽出>`
- 影響: <この変更による動作の変化>

## Decisions
- <decision>: <理由>

## Verification
- <command>: <result（成功/失敗とログ要点）>
- **Unity固有**: Unity Editor手動検証結果、Unity Test Runnerでのテスト実行結果を記録
  - 例: `Unity Editor手動検証=プリセット保存・読み込み・削除を確認、正常動作を確認`
  - 例: `Unity Test Runner=HeightMapGeneratorTests=14テスト成功`, `TerrainGeneratorIntegrationTests=7テスト成功`
- **アセンブリ整合性（必須）**:
  - 変更ファイルとアセンブリ名の対応
  - 追加した using と asmdef 参照の確認結果
  - 同名型の重複チェック結果
  - Unity Editor コンパイル確認結果: `Unity Editor=コンパイル成功`

## Risk
- <潜在リスク>
- **Unity固有**: Unity Editor起動が必要な長時間待機、Unity Test Runnerでのテスト実行が不可能な環境等のリスクを記録

## Remaining
- なし / <残件>

## Blocked（State: BLOCKED の場合）
- Reason / Evidence / Options（1〜3）

## Handover
- Orchestrator への申し送り（次手・注意点・未解決事項）

## Proposals（任意）
- 担当外で気づいた改善案・次回タスク候補
</output_format>

<self_correction>
- ファイルパスは **動的に確認** すること（`ls`, `find`, `Test-Path` 等を使用）。ハードコード禁止。
- エラーが発生した場合は、MISSION_LOG.md に記録し、復旧手順を試行する。
- 3回試行しても解決しない場合のみ、状況と試行内容を整理してユーザーに判断を仰ぐ。
- MISSION_LOG.md は常に最新状態を保つこと。各フェーズ完了時に必ず更新する。
- **Unity固有**: Unity Editor上での手動検証が必要な場合、実装後に必ずUnity Editorで動作確認を行う。
- **Unity固有**: Unity Test Runnerでのテスト実行が必要な場合、Unity Test Runnerまたはコマンドラインで実行し、結果を記録する。
- **Unity固有**: ScriptableObject、AssetDatabase等のUnity APIを使用する場合、適切なエラーハンドリングを実装する。
- **Unity固有**: EditorOnlyコードは `#if UNITY_EDITOR` で適切に分離する。
</self_correction>
```

---

## 2. 生成例（Unity固有項目の例示）

### 例: Unity Editor機能実装（Tier 2 / Unity固有検証）

```xml
<instruction>
あなたは分散開発チームの Worker です。割り当てられた 1 タスクだけを完遂し、証跡を残してください。
**Unityプロジェクト向けタスク**のため、Unity Editor上での手動検証とUnity Test Runnerでのテスト実行が必要な場合があります。
</instruction>

<context>
<preconditions>
TICKET_PATH: docs/tasks/TASK_012_TerrainGenerationWindow_PresetManagement.md
Tier: 2
Branch: feature/TASK_012_terrain-window-preset-management
Report Target: docs/inbox/REPORT_TASK_012_TerrainGenerationWindow_PresetManagement.md
Focus Area: Assets/Scripts/Editor/TerrainGenerationWindow.cs, Assets/Scripts/Editor/TerrainPresetManager.cs
Forbidden Area: Assets/MapGenerator/Scripts/TerrainGenerator.cs, Assets/MapGenerator/Scripts/HeightMapGenerator.cs, ProjectSettings/, Packages/
DoD:
- [ ] プリセット保存機能: 現在の設定を新しいプリセットとして保存できる
- [ ] プリセット読み込み機能: 保存済みプリセットを選択して即座に設定を適用できる
- [ ] Unity Editor上での動作確認: プリセット保存・読み込み・削除が正常に動作することを確認
- [ ] Unity Test Runnerでのテスト実行: 既存テストがすべて成功することを確認
- [ ] コンパイルエラーがない: Unity Editorでコンパイル成功を確認
</preconditions>
</context>

（以降はテンプレ本文に沿って Phase 0〜5 を実施）
```

---

## 3. Unity固有項目の説明

### Unity Editor手動検証
- Unity Editorを起動し、実装した機能を実際に操作して動作を確認する
- 検証結果は具体的に記録する（例: `Unity Editor手動検証=プリセット保存・読み込み・削除を確認、正常動作を確認`）

### Unity Test Runnerでのテスト実行
- Unity Test Runnerまたはコマンドラインでテストを実行し、結果を記録する
- テスト実行結果は `<テストクラス名>=<成功/失敗>`, `<テスト数>=<成功数>/<総数>` の形式で記録する

### コンパイルエラー確認
- Unity Editorでコンパイルエラーがないことを確認する
- 確認結果は `Unity Editor=コンパイル成功` の形式で記録する

### アセンブリ境界ルール（最重要）

- すべてのコード変更前に `docs/02_design/ASSEMBLY_ARCHITECTURE.md` を参照し、依存方向を確認する。
- `using` を追加する前に、対象アセンブリの asmdef の `references` を確認する。参照がなければ追加が必要（DAG 違反がないか確認）。
- 新しい型を追加する前に `rg "class TypeName" Assets/ --glob "*.cs"` で同名型の重複がないか検索する。
- `#if` 条件コンパイルの外にオプショナルシンボル参照を漏らさない。
- C# 9.0 制約: 引数なし struct コンストラクタ、global using、file スコープ型、required メンバーは使用禁止。

### コンパイルエラー診断プロトコル

- エラー発生時は場当たり修正を禁止。`docs/03_guides/COMPILATION_GUARD_PROTOCOL.md` の診断フローに従う。
- 診断フロー: エラーコード特定 → 原因分類（asmdef 参照不足 / 型重複 / シンボル漏れ / 言語制約 / 循環参照）→ 根本原因修正。
- 修正後は `ASSEMBLY_ARCHITECTURE.md` との整合性を再確認する。

### Unity API使用時の注意点

- ScriptableObject、AssetDatabase等のUnity APIを使用する場合、適切なエラーハンドリングを実装する
- EditorOnlyコードは `#if UNITY_EDITOR` で適切に分離する
- `FindFirstObjectByType<T>()` に interface 型を渡さない。Unity の generic 制約 `T : UnityEngine.Object` を満たさないため。
- 代わりに `GameObject.FindGameObjectWithTag()` + `GetComponent<T>()` パターンを使う。
