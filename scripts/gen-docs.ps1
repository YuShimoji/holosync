# Requires: Docker Desktop or local Doxygen
# Usage: pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\\scripts\\gen-docs.ps1
$ErrorActionPreference = 'Stop'

# Move to repo root
Set-Location -Path (Split-Path -Parent $PSScriptRoot)

Write-Host "[HoloSync] Generating Doxygen docs..." -ForegroundColor Cyan

function Has-Cmd($name) {
  try { Get-Command $name -ErrorAction Stop | Out-Null; return $true } catch { return $false }
}

# Ensure docs directory exists for outputs and warning log
if (-not (Test-Path -Path "docs")) {
  New-Item -ItemType Directory -Path "docs" | Out-Null
}

# Prefer local doxygen if available
if (Has-Cmd 'doxygen') {
  Write-Host "Using local doxygen" -ForegroundColor Green
  doxygen Doxyfile
}
else {
  if (-not (Has-Cmd 'docker')) { throw "Neither doxygen nor docker is available." }
  $pwd = (Get-Location).Path
  # Strategy: try Windows path mount first (Docker Desktop on Windows usually accepts this),
  # then try Linux-style "/c/..." mount if the first attempt fails.
  $winMount = $pwd
  $nixMount = $pwd
  if ($pwd -match '^[A-Za-z]:\\') {
    $drive = $pwd.Substring(0,1).ToLower()
    $rest  = $pwd.Substring(2).Replace('\\','/')
    $nixMount = "/$drive/$rest"
  }

  $attempts = @(
    @{ Name = 'doxygen/doxygen (win path)'; Img = 'doxygen/doxygen:1.9.8'; Mount = $winMount; Cmd = 'doxygen Doxyfile' },
    @{ Name = 'doxygen/doxygen (linux path)'; Img = 'doxygen/doxygen:1.9.8'; Mount = $nixMount; Cmd = 'doxygen Doxyfile' },
    @{ Name = 'alpine+apk (win path)'; Img = 'alpine:3.19'; Mount = $winMount; Cmd = 'sh -lc "apk add --no-cache doxygen graphviz && doxygen Doxyfile"' },
    @{ Name = 'alpine+apk (linux path)'; Img = 'alpine:3.19'; Mount = $nixMount; Cmd = 'sh -lc "apk add --no-cache doxygen graphviz && doxygen Doxyfile"' }
  )

  $success = $false
  foreach ($a in $attempts) {
    Write-Host ("Trying Docker: {0} (mount: {1})" -f $a.Name, $a.Mount) -ForegroundColor Yellow
    docker run --rm -v "$($a.Mount):/work" -w /work $($a.Img) $($a.Cmd)
    if ($LASTEXITCODE -eq 0) { $success = $true; break }
    Write-Warning ("Docker attempt failed: {0}" -f $a.Name)
  }
  if (-not $success) { throw "All Docker attempts failed. Please ensure Docker Desktop is running and images can be pulled." }
}

$index = Join-Path -Path (Join-Path -Path (Get-Location).Path -ChildPath 'docs') -ChildPath 'index.html'
if (-not (Test-Path $index)) { throw "Docs generation failed. Not found: $index" }

Write-Host "Docs generated at: $index" -ForegroundColor Green
