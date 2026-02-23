#requires -Version 5.1

param(
    [ValidateSet("github", "markdown")]
    [string]$Target = "github",
    [switch]$DryRun = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-GitHubRepoFromOrigin {
    $remoteUrl = git remote get-url origin 2>$null
    if (-not $remoteUrl) {
        throw "origin remote was not found."
    }

    if ($remoteUrl -match 'github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)(\.git)?$') {
        return @{
            owner = $Matches.owner
            repo = $Matches.repo
            remoteUrl = $remoteUrl
        }
    }

    throw "origin is not a GitHub repo URL: $remoteUrl"
}

function New-IssueDrafts {
    param(
        [array]$Issues
    )

    $outDir = "docs\tasks"
    if (-not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir | Out-Null
    }

    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $path = Join-Path $outDir "ISSUE_DRAFT_$stamp.md"

    $lines = @(
        "# Issue Drafts ($stamp)",
        "",
        "This file is generated because GitHub API auth was not available.",
        ""
    )

    $index = 1
    foreach ($issue in $Issues) {
        $labels = if ($issue.labels.Count -gt 0) { ($issue.labels -join ", ") } else { "(none)" }
        $lines += @(
            "## $index. $($issue.title)",
            "",
            "**Labels**: $labels",
            "",
            $issue.body.Trim(),
            "",
            "---",
            ""
        )
        $index++
    }

    Set-Content -Path $path -Value $lines -Encoding UTF8
    return $path
}

$issues = @(
    @{
        title = "fix(account): stabilize app watch-history and YouTube-history flow"
        body = @"
Background:
- Embedded playback may not always reflect in YouTube account history.
- Local app-side history must always persist.

Done criteria:
- App-side watch history is recorded after meaningful playback.
- History items can restore a tile with one click.
- A direct open path to youtube.com/watch is available.
"@
        labels = @("type::bug", "priority::P1")
    },
    @{
        title = "fix(layout): remove title space pressure and maximize video viewport"
        body = @"
Background:
- Header/title rows consume playable area.

Done criteria:
- Tile title uses overlay style on video.
- Toolbar collapse + immersive mode maximize visible area.
"@
        labels = @("type::bug", "priority::P1")
    },
    @{
        title = "fix(fullscreen): prevent fullscreen lock-in and guarantee exit paths"
        body = @"
Done criteria:
- Esc exits fullscreen reliably.
- Exit button works while fullscreen is active.
- F11 immersive toggle and fullscreen behavior do not conflict.
"@
        labels = @("type::bug", "priority::P1")
    },
    @{
        title = "feat(layout): allow user-controlled tile order and front stacking"
        body = @"
Done criteria:
- Tile order can be moved left/right.
- Drag start brings target tile to front in free layout.
- Order is persisted.
"@
        labels = @("type::feature", "priority::P2")
    },
    @{
        title = "fix(meta): description panel always shows meaningful state"
        body = @"
Done criteria:
- Existing tiles refresh description after API key change.
- Clear hint appears when API key is missing or API fetch fails.
"@
        labels = @("type::bug", "priority::P1")
    },
    @{
        title = "chore(workflow): adopt and maintain shared-workflows submodule"
        body = @"
Done criteria:
- .shared-workflows is managed as submodule (main tracking).
- scripts/session-start.ps1 resolves workflow assets from submodule first.
- docs/WORKFLOW.md includes init and update commands.
"@
        labels = @("type::task", "priority::P1")
    },
    @{
        title = "test(e2e): add regression coverage for latest UI hotfixes"
        body = @"
Add Playwright cases for:
- fullscreen enter/exit
- watch-history recording and restore
- title overlay and info expansion
- toolbar collapse and immersive mode
"@
        labels = @("type::test", "priority::P2")
    }
)

if ($Target -eq "markdown") {
    $draftPath = New-IssueDrafts -Issues $issues
    Write-Host "Markdown draft created: $draftPath" -ForegroundColor Green
    exit 0
}

$token = $env:GITHUB_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
    $token = $env:GH_TOKEN
}

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "GITHUB_TOKEN/GH_TOKEN is not set. Skipping GitHub API." -ForegroundColor Yellow
    $draftPath = New-IssueDrafts -Issues $issues
    Write-Host "Draft file created instead: $draftPath" -ForegroundColor Green
    exit 0
}

$repo = Get-GitHubRepoFromOrigin
$headers = @{
    Authorization = "Bearer $token"
    Accept = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

foreach ($issue in $issues) {
    if ($DryRun) {
        Write-Host "[DryRun] $($issue.title)" -ForegroundColor Cyan
        continue
    }

    $payload = @{
        title = $issue.title
        body = $issue.body
        labels = $issue.labels
    }

    try {
        $resp = Invoke-RestMethod `
            -Uri "https://api.github.com/repos/$($repo.owner)/$($repo.repo)/issues" `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body ($payload | ConvertTo-Json -Depth 5)
        Write-Host ("Created: #{0} {1}" -f $resp.number, $resp.html_url) -ForegroundColor Green
    } catch {
        Write-Host ("Label create failed, retrying without labels: {0}" -f $issue.title) -ForegroundColor Yellow
        $retryPayload = @{
            title = $issue.title
            body = $issue.body
        }
        try {
            $resp = Invoke-RestMethod `
                -Uri "https://api.github.com/repos/$($repo.owner)/$($repo.repo)/issues" `
                -Method Post `
                -Headers $headers `
                -ContentType "application/json" `
                -Body ($retryPayload | ConvertTo-Json -Depth 5)
            Write-Host ("Created: #{0} {1}" -f $resp.number, $resp.html_url) -ForegroundColor Green
        } catch {
            Write-Host ("Failed to create issue: {0}" -f $issue.title) -ForegroundColor Red
        }
    }
}
