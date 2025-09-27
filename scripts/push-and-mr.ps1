# GitLab Personal Access Token (PAT) を環境変数から取得
$gitlabToken = $env:GITLAB_TOKEN
if ([string]::IsNullOrEmpty($gitlabToken)) {
    Write-Host "エラー: 環境変数 GITLAB_TOKEN が設定されていません。" -ForegroundColor Red
    exit 1
}

# プロジェクト情報をGitから取得
$remoteUrl = git remote get-url origin
$projectId = $remoteUrl -replace '.*gitlab.com[:/](.*).git', '$1' -replace '/', '%2F'
$currentBranch = git rev-parse --abbrev-ref HEAD
$targetBranch = "main"

# GitLab APIのエンドポイント
$gitlabApiUrl = "https://gitlab.com/api/v4"
$headers = @{ "PRIVATE-TOKEN" = $gitlabToken }

# 1. 現在のブランチをプッシュ
Write-Host "Pushing branch '$currentBranch' to origin..." -ForegroundColor Cyan
$null = git push origin $currentBranch
if ($LASTEXITCODE -ne 0) {
    Write-Host "エラー: git push に失敗しました。" -ForegroundColor Red
    exit 1
}
Write-Host "Push successful." -ForegroundColor Green

# 2. 既存のMRをチェック
Write-Host "Checking for existing merge requests..." -ForegroundColor Cyan
$mrListUrl = "$gitlabApiUrl/projects/$projectId/merge_requests?source_branch=$currentBranch&target_branch=$targetBranch&state=opened"
$existingMrs = Invoke-RestMethod -Uri $mrListUrl -Method Get -Headers $headers

if ($existingMrs.Count -gt 0) {
    Write-Host "An open merge request already exists for this branch: $($existingMrs[0].web_url)" -ForegroundColor Yellow
    exit 0
}

# 3. 新しいマージリクエストを作成
Write-Host "Creating a new merge request..." -ForegroundColor Cyan
$mrUrl = "$gitlabApiUrl/projects/$projectId/merge_requests"
$commitTitle = git log -1 --pretty=%s

$body = @{
    "source_branch" = $currentBranch
    "target_branch" = $targetBranch
    "title" = "Merge $currentBranch into $targetBranch"
    "description" = "Created by automated script. Last commit: `"$commitTitle`""
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $mrUrl -Method Post -Headers $headers -ContentType "application/json" -Body $body
    Write-Host "Merge request created successfully: $($response.web_url)" -ForegroundColor Green
} catch {
    Write-Host "エラー: マージリクエストの作成に失敗しました。" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host $_.Exception.Response.StatusCode.Value__ $_.Exception.Response.StatusDescription
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $reader.BaseStream.Position = 0
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response Body: $errorBody"
    }
    exit 1
}
