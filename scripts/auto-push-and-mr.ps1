# Auto push current branch and create GitLab MR with Auto-Merge (when pipeline succeeds)
$ErrorActionPreference = 'Stop'

# 1) Token
$gitlabToken = $env:GITLAB_TOKEN
if ([string]::IsNullOrEmpty($gitlabToken)) {
  Write-Host "エラー: 環境変数 GITLAB_TOKEN が設定されていません。" -ForegroundColor Red
  exit 1
}

# 2) Repo info
$remoteUrl = git remote get-url origin
if ($LASTEXITCODE -ne 0) { Write-Host "エラー: git remote の取得に失敗" -ForegroundColor Red; exit 1 }
$projectId = $remoteUrl -replace '.*gitlab.com[:/](.*).git', '$1' -replace '/', '%2F'
$currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
$targetBranch = 'main'

$gitlabApiUrl = 'https://gitlab.com/api/v4'
$headers = @{ 'PRIVATE-TOKEN' = $gitlabToken }

# 3) Push branch
Write-Host "Pushing branch '$currentBranch' to origin..." -ForegroundColor Cyan
$null = git push -u origin $currentBranch
if ($LASTEXITCODE -ne 0) { Write-Host "エラー: git push に失敗しました。" -ForegroundColor Red; exit 1 }
Write-Host "Push successful." -ForegroundColor Green

# 4) Find existing MR
$mrListUrl = "$gitlabApiUrl/projects/$projectId/merge_requests?source_branch=$currentBranch&target_branch=$targetBranch&state=opened"
try {
  $existingMrs = Invoke-RestMethod -Uri $mrListUrl -Method Get -Headers $headers
} catch {
  $existingMrs = @()
}

function Enable-AutoMerge($iid) {
  $sha = (git rev-parse HEAD).Trim()
  $mergeUrl = "$gitlabApiUrl/projects/$projectId/merge_requests/$iid/merge"
  $mergeBody = @{
    merge_when_pipeline_succeeds = $true
    should_remove_source_branch   = $true
    sha                           = $sha
  } | ConvertTo-Json
  $null = Invoke-RestMethod -Uri $mergeUrl -Method Put -Headers $headers -ContentType 'application/json' -Body $mergeBody
  Write-Host "Auto-merge (when pipeline succeeds) has been enabled for MR IID=$iid." -ForegroundColor Green
}

if ($existingMrs -and $existingMrs.Count -gt 0) {
  $iid = $existingMrs[0].iid
  Write-Host "Found existing MR: $($existingMrs[0].web_url) (IID=$iid)" -ForegroundColor Yellow
  try { Enable-AutoMerge -iid $iid } catch { Write-Host "警告: Auto-Merge設定に失敗（後で手動設定可）。" -ForegroundColor Yellow }
  exit 0
}

# 5) Create new MR
Write-Host "Creating a new merge request..." -ForegroundColor Cyan
$mrUrl = "$gitlabApiUrl/projects/$projectId/merge_requests"
$commitTitle = (git log -1 --pretty=%s).Trim()
$body = @{
  source_branch = $currentBranch
  target_branch = $targetBranch
  title         = "Merge $currentBranch into $targetBranch"
  description   = "Created by automated script. Last commit: $commitTitle"
} | ConvertTo-Json

try {
  $response = Invoke-RestMethod -Uri $mrUrl -Method Post -Headers $headers -ContentType 'application/json' -Body $body
  Write-Host "Merge request created successfully: $($response.web_url)" -ForegroundColor Green
  try { Enable-AutoMerge -iid $response.iid } catch { Write-Host "警告: Auto-Merge設定に失敗（後で手動設定可）。" -ForegroundColor Yellow }
  exit 0
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
