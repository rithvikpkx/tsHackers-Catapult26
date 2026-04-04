$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-StateDirectory([string]$repoRoot) {
    return Join-Path $repoRoot ".grind-runtime"
}

function Stop-TrackedWindow([string]$statePath) {
    $record = Get-Content $statePath -Raw | ConvertFrom-Json
    $process = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $record.pid -Force
        Write-Host "Stopped $($record.title) (PowerShell process $($record.pid))." -ForegroundColor Green
    } else {
        Write-Host "$($record.title) was already closed." -ForegroundColor Yellow
    }
    Remove-Item $statePath -Force -ErrorAction SilentlyContinue
}

$repoRoot = Get-RepoRoot
$stateDirectory = Get-StateDirectory $repoRoot

if (-not (Test-Path $stateDirectory)) {
    Write-Host "No tracked MVP services were found." -ForegroundColor Yellow
    exit 0
}

$stateFiles = Get-ChildItem $stateDirectory -Filter *.json -ErrorAction SilentlyContinue
if (-not $stateFiles) {
    Write-Host "No tracked MVP services were found." -ForegroundColor Yellow
    exit 0
}

foreach ($stateFile in $stateFiles) {
    Stop-TrackedWindow $stateFile.FullName
}

if (-not (Get-ChildItem $stateDirectory -ErrorAction SilentlyContinue)) {
    Remove-Item $stateDirectory -Force -ErrorAction SilentlyContinue
}
