#requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Resolve-PreferredPath {
    param(
        [string[]]$Candidates
    )
    foreach ($candidate in $Candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }
    return $null
}

$everySessionPath = Resolve-PreferredPath @(
    ".shared-workflows/docs/windsurf_workflow/EVERY_SESSION.md",
    "docs/windsurf_workflow/EVERY_SESSION.md"
)

$coreModulePath = Resolve-PreferredPath @(
    ".shared-workflows/prompts/orchestrator/modules/00_core.md",
    "prompts/orchestrator/modules/00_core.md"
)

$requiredPaths = @(
    ".cursor/MISSION_LOG_TEMPLATE.md",
    "docs/ISSUES.md",
    $everySessionPath,
    $coreModulePath,
    "data/presentation.json"
)

foreach ($path in $requiredPaths) {
    if ([string]::IsNullOrWhiteSpace($path) -or -not (Test-Path $path)) {
        Write-Host "Missing required workflow file: $path" -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path ".cursor/MISSION_LOG.md")) {
    Copy-Item ".cursor/MISSION_LOG_TEMPLATE.md" ".cursor/MISSION_LOG.md"
    Write-Host "Created .cursor/MISSION_LOG.md from template." -ForegroundColor Green
}

Write-Host "Shared Workflow is ready." -ForegroundColor Green
if (Test-Path ".shared-workflows") {
    Write-Host "Workflow source: .shared-workflows (submodule)" -ForegroundColor Green
} else {
    Write-Host "Workflow source: local fallback files" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Start sequence:"
Write-Host "1) Open .cursor/MISSION_LOG.md"
Write-Host ("2) Open {0}" -f $coreModulePath)
Write-Host "3) Open current phase module"
Write-Host "4) Execute next task in MISSION_LOG"
