#requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$requiredPaths = @(
    ".cursor/MISSION_LOG_TEMPLATE.md",
    "docs/ISSUES.md",
    "docs/windsurf_workflow/EVERY_SESSION.md",
    "prompts/orchestrator/modules/00_core.md",
    "data/presentation.json"
)

foreach ($path in $requiredPaths) {
    if (-not (Test-Path $path)) {
        Write-Host "Missing required workflow file: $path" -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path ".cursor/MISSION_LOG.md")) {
    Copy-Item ".cursor/MISSION_LOG_TEMPLATE.md" ".cursor/MISSION_LOG.md"
    Write-Host "Created .cursor/MISSION_LOG.md from template." -ForegroundColor Green
}

Write-Host "Shared Workflow is ready." -ForegroundColor Green
Write-Host ""
Write-Host "Start sequence:"
Write-Host "1) Open .cursor/MISSION_LOG.md"
Write-Host "2) Open prompts/orchestrator/modules/00_core.md"
Write-Host "3) Open current phase module"
Write-Host "4) Execute next task in MISSION_LOG"
