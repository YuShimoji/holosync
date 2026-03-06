# サブモジュール復旧ガイド（中途半端ロード状態からの修復）

このガイドは、`.shared-workflows` サブモジュールが中途半端にロードされた状態（ファイルが見つからない、スクリプトが実行できない）から最新状態に復旧する手順を説明します。

## 症状の確認

以下のようなエラーが発生している場合、サブモジュールが中途半端にロードされています：

```powershell
# エラー例1: スクリプトが見つからない
pwsh -NoProfile -File .shared-workflows/scripts/apply-cursor-rules.ps1 -ProjectRoot .
# → The argument '.shared-workflows/scripts/apply-cursor-rules.ps1' is not recognized

# エラー例2: Node.jsスクリプトが見つからない
node .shared-workflows/scripts/sw-update-check.js
# → Error: Cannot find module 'C:\...\.shared-workflows\scripts\sw-update-check.js'
```

## 修復手順（段階的アプローチ）

### ステップ1: サブモジュールの状態確認

まず、現在のサブモジュールの状態を確認します：

```powershell
# サブモジュールの状態を確認
git submodule status --recursive

# サブモジュール内のGit状態を確認
git -C .shared-workflows status -sb

# 現在のブランチとコミットを確認
git -C .shared-workflows rev-parse --abbrev-ref HEAD
git -C .shared-workflows rev-parse HEAD

# ディレクトリの存在確認
Test-Path .shared-workflows
Test-Path .shared-workflows/scripts
Test-Path .shared-workflows/scripts/apply-cursor-rules.ps1
```

### ステップ2: サブモジュールの同期と更新（推奨：まずこれを試す）

サブモジュールの設定を同期し、最新状態に更新します：

```powershell
# プロジェクトルートで実行
git submodule sync --recursive
git submodule update --init --recursive --remote
```

**重要**: `--remote` オプションを付けることで、リモートリポジトリの最新コミットを取得します。

### ステップ3: 更新後の確認

更新後、必要なファイルが存在することを確認します：

```powershell
# スクリプトの存在確認
Test-Path .shared-workflows/scripts/apply-cursor-rules.ps1
Test-Path .shared-workflows/scripts/sw-update-check.js
Test-Path .shared-workflows/scripts/ensure-ssot.js

# 更新チェックスクリプトを実行（動作確認）
node .shared-workflows/scripts/sw-update-check.js --no-fetch
```

### ステップ4: 完全再初期化（ステップ2で解決しない場合）

サブモジュールが完全に壊れている場合は、一度削除して再追加します：

```powershell
# ⚠️ 注意: この手順はサブモジュール内のローカル変更を失います

# 1. サブモジュールを非初期化
git submodule deinit -f .shared-workflows

# 2. サブモジュールを削除（Git管理から外す）
git rm -f .shared-workflows

# 3. サブモジュールを再追加
git submodule add https://github.com/YuShimoji/shared-workflows.git .shared-workflows

# 4. 同期と更新
git submodule sync --recursive
git submodule update --init --recursive --remote
```

**注意**: ステップ4を実行すると、親リポジトリの `.gitmodules` と `.shared-workflows` の参照が更新されます。変更をコミットする必要があります：

```powershell
# 変更を確認
git status -sb

# コミット（必要に応じて）
git add .shared-workflows .gitmodules
git commit -m "chore: shared-workflows submodule再初期化"
```

### ステップ5: 親リポジトリでの参照更新（重要）

サブモジュールを更新した後は、**必ず親リポジトリ側で参照コミットを更新**する必要があります：

```powershell
# サブモジュールの参照が更新されていることを確認
git status -sb
# → .shared-workflows が変更対象として表示されるはず

# 変更をステージング
git add .shared-workflows

# コミット（他の変更と一緒でも可）
git commit -m "chore: shared-workflows submodule更新"

# プッシュ（必要に応じて）
git push origin main
```

**禁止事項**: `git -C .shared-workflows pull` だけで「更新完了」と判断しないこと。親側の参照コミットが更新されず、他の環境で再現できなくなります。

## トラブルシューティング

### 問題1: `git submodule update` が何も出力しない

**原因**: サブモジュールが既に最新と判断されている、または設定が壊れている可能性があります。

**対処**:
```powershell
# 強制的に再取得
git submodule update --init --recursive --remote --force
```

### 問題2: サブモジュールディレクトリは存在するが、中身が空

**原因**: サブモジュールのワークツリーが欠損しています。

**対処**: ステップ4（完全再初期化）を実行してください。

### 問題3: ネットワークエラーでリモートから取得できない

**対処**: ローカルに共有クローンがある場合は、一時的にパスを直接指定してスクリプトを実行できます：

```powershell
# 例: 親ディレクトリに shared-workflows のクローンがある場合
node ../shared-workflows/scripts/sw-update-check.js --project-root .
```

ただし、これは一時的な回避策です。可能な限りサブモジュールを正しく修復してください。

### 問題4: PowerShellでパスが認識されない

**原因**: パスの指定方法や実行ポリシーの問題です。

**対処**:
```powershell
# 絶対パスで実行
pwsh -NoProfile -File "$PWD\.shared-workflows\scripts\apply-cursor-rules.ps1" -ProjectRoot .

# または、先にディレクトリに移動
cd .shared-workflows/scripts
pwsh -NoProfile -File apply-cursor-rules.ps1 -ProjectRoot ../..
```

## 検証チェックリスト

修復が完了したら、以下を確認してください：

- [ ] `git submodule status --recursive` でサブモジュールが正常に表示される
- [ ] `.shared-workflows/scripts/apply-cursor-rules.ps1` が存在する
- [ ] `.shared-workflows/scripts/sw-update-check.js` が存在する
- [ ] `node .shared-workflows/scripts/sw-update-check.js --no-fetch` が正常に実行される
- [ ] `pwsh -NoProfile -File .shared-workflows/scripts/apply-cursor-rules.ps1 -ProjectRoot .` が正常に実行される
- [ ] `git status -sb` で `.shared-workflows` が更新対象として表示される（更新した場合）

## 参考ドキュメント

- **運用入口**: `.shared-workflows/docs/windsurf_workflow/OPEN_HERE.md`
- **初回セットアップ**: `.shared-workflows/prompts/first_time/PROJECT_KICKSTART.txt`
- **他プロジェクト適用**: `docs/APPLY_TO_OTHER_PROJECTS.md`
- **更新ガイド**: `docs/inbox/REPORT_OTHER_PROJECTS_UPDATE_GUIDE_20250105.md`

## まとめ

1. **まず試す**: `git submodule sync --recursive` → `git submodule update --init --recursive --remote`
2. **それでもダメ**: サブモジュールを完全に削除して再追加（ステップ4）
3. **必ず実行**: 親リポジトリで参照コミットを更新（ステップ5）
4. **検証**: スクリプトが正常に実行できることを確認
