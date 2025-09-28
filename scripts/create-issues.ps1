#requires -Version 5.1
param(
    [int]$DaysUntilStale = 21
)

# 1) 環境変数からGitLabトークン取得
$gitlabToken = $env:GITLAB_TOKEN
if ([string]::IsNullOrEmpty($gitlabToken)) {
    Write-Host "エラー: 環境変数 GITLAB_TOKEN が設定されていません。" -ForegroundColor Red
    exit 1
}

# 2) プロジェクト情報の解決
$remoteUrl = git remote get-url origin
if (-not $remoteUrl) {
    Write-Host "エラー: origin リモートが見つかりません。" -ForegroundColor Red
    exit 1
}
$projectId = $remoteUrl -replace '.*gitlab.com[:/](.*).git', '$1' -replace '/', '%2F'
$gitlabApiUrl = "https://gitlab.com/api/v4"
$headers = @{ "PRIVATE-TOKEN" = $gitlabToken }

# 3) 追加するIssue定義（タイトル、説明、ラベル）
$issues = @(
    @{ title = "docs: READMEの内容と実装の整合性を確認・更新"; 
       description = @"
READMEの記述（Chrome拡張）と現在のWebアプリ実装（`index.html`/`scripts/main.js`）に差異があります。整合性のある内容に更新してください。
- 現状: Webアプリとして動作（YouTube IFrame Player API, HTML/CSS/JS）
- 期待: 使い方/機能/仕様/ドキュメント/CIの説明を最新化
"@; 
       labels = "type::task,priority::P1" },

    @{ title = "feat: 同期アルゴリズムの改善（基準選択/ドリフト補正/遅延対策）"; 
       description = @"
同期の品質向上:
- 基準プレイヤーの選定ロジック（手動/自動）
- ドリフト検知と補正の頻度/閾値見直し
- バッファリング時の追従戦略
- ネットワーク遅延や広告による停止の扱い
"@;
       labels = "type::feature,priority::P1" },

    @{ title = "feat: プリセット/ブックマーク機能（URLセット保存・読み込み・共有）"; 
       description = @"
以下に対応:
- 現在の動画セット（ID/タイトル）をローカル保存
- プリセットの読み込み/削除
- 共有用URL生成（クエリ文字列 or JSON短縮URL）
"@; 
       labels = "type::feature,priority::P2" },

    @{ title = "feat: キーボードショートカット（再生/停止/同期/音量/速度）"; 
       description = "アクセシビリティと操作性向上のため、主要操作へショートカット割当て"; 
       labels = "type::feature,priority::P3" },

    @{ title = "feat: レイアウト改善（ドラッグ&ドロップ並べ替え/プリセット）"; 
       description = "動画カードの順序変更、レイアウトプリセットの保存・適用"; 
       labels = "type::feature,priority::P3" },

    @{ title = "feat: 音声コントロールの拡張（個別ミュート/ソロ）"; 
       description = "複数動画の中で1つだけ音声ON、他を自動ミュートなどのユースケースに対応"; 
       labels = "type::feature,priority::P2" },

    @{ title = "chore: GitHubミラーの追加（リモート設定と同期運用）"; 
       description = @"
GitHub側のリモートを追加し、ミラー運用を開始:
- 追加: `git remote add github <repo-url>`
- 運用: `git push github --all` / `--tags`
- CIのバッジ/リンクが混在しないようREADMEに注記
"@; 
       labels = "type::task,priority::P3" },

    @{ title = "test: E2E自動化方針の検討（Playwright）"; 
       description = "主要フロー（追加/再生/停止/同期/削除/音量/速度）の自動化方針を整理"; 
       labels = "type::task,priority::P3" }
)

# 4) Issue作成
foreach ($issue in $issues) {
    $body = @{ title = $issue.title; description = $issue.description; labels = $issue.labels } | ConvertTo-Json
    try {
        $resp = Invoke-RestMethod -Uri "$gitlabApiUrl/projects/$projectId/issues" -Method Post -Headers $headers -ContentType "application/json" -Body $body
        Write-Host ("Created: {0} -> {1}" -f $resp.iid, $resp.web_url) -ForegroundColor Green
    } catch {
        Write-Host "エラー: Issue作成に失敗しました -> $($issue.title)" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host $_.Exception.Response.StatusCode.Value__ $_.Exception.Response.StatusDescription
        }
    }
}
