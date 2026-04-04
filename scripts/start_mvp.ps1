param(
    [switch]$SkipBackend,
    [switch]$SkipMl,
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Find-PythonInterpreter([string]$serviceRoot) {
    $candidates = @(
        ".venv312-win\Scripts\python.exe",
        ".venv312\Scripts\python.exe",
        ".venv\Scripts\python.exe"
    )

    foreach ($candidate in $candidates) {
        $fullPath = Join-Path $serviceRoot $candidate
        if (Test-Path $fullPath) {
            return (Resolve-Path $fullPath).Path
        }
    }

    throw "No Python virtual environment was found in $serviceRoot. Create one and install requirements first."
}

function Find-Npm {
    $preferred = "C:\Program Files\nodejs\npm.cmd"
    if (Test-Path $preferred) {
        return $preferred
    }

    $command = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    throw "npm.cmd was not found. Install Node.js LTS first."
}

function Ensure-FrontendEnv([string]$frontendRoot) {
    $envPath = Join-Path $frontendRoot ".env"
    if (-not (Test-Path $envPath)) {
        Set-Content -Path $envPath -Value "REACT_APP_BACKEND_URL=http://127.0.0.1:8000`r`n" -Encoding ASCII
        Write-Host "Created apps/frontend/.env with local backend URL." -ForegroundColor Yellow
    }
}

function Ensure-BackendEnv([string]$backendRoot) {
    $envPath = Join-Path $backendRoot ".env"
    $examplePath = Join-Path $backendRoot ".env.example"
    if (-not (Test-Path $envPath) -and (Test-Path $examplePath)) {
        Copy-Item $examplePath $envPath
        Write-Host "Created services/backend/.env from .env.example." -ForegroundColor Yellow
        Write-Host "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET later if you want live Google Calendar." -ForegroundColor Yellow
    }
}

function Open-ServiceWindow(
    [string]$title,
    [string]$workingDirectory,
    [string]$command
) {
    $script = @"
`$Host.UI.RawUI.WindowTitle = '$title'
Set-Location '$workingDirectory'
$command
"@

    Start-Process -FilePath "powershell.exe" -WorkingDirectory $workingDirectory -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command", $script
    ) | Out-Null
}

$repoRoot = Get-RepoRoot
$backendRoot = Join-Path $repoRoot "services\backend"
$mlRoot = Join-Path $repoRoot "services\ml"
$frontendRoot = Join-Path $repoRoot "apps\frontend"

Ensure-BackendEnv $backendRoot
Ensure-FrontendEnv $frontendRoot

if (-not $SkipMl) {
    $mlPython = Find-PythonInterpreter $mlRoot
    Open-ServiceWindow `
        -title "GRIND ML" `
        -workingDirectory $mlRoot `
        -command "& '$mlPython' -m uvicorn app.main:app --port 8001"
}

if (-not $SkipBackend) {
    $backendPython = Find-PythonInterpreter $backendRoot
    Open-ServiceWindow `
        -title "GRIND Backend" `
        -workingDirectory $backendRoot `
        -command "& '$backendPython' -m uvicorn app.main:app --port 8000"
}

if (-not $SkipFrontend) {
    $npmPath = Find-Npm
    Open-ServiceWindow `
        -title "GRIND Frontend" `
        -workingDirectory $frontendRoot `
        -command "`$env:BROWSER='none'; `$env:REACT_APP_BACKEND_URL='http://127.0.0.1:8000'; & '$npmPath' run dev"
}

Write-Host ""
Write-Host "Started the GRIND MVP services in separate PowerShell windows." -ForegroundColor Green
Write-Host "Next: run .\scripts\check_mvp.ps1 after 10-15 seconds." -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://127.0.0.1:3000"
Write-Host "Backend:  http://127.0.0.1:8000/health"
Write-Host "ML:       http://127.0.0.1:8001/health"
