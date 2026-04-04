param(
    [switch]$SkipBackend,
    [switch]$SkipMl,
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-StateDirectory([string]$repoRoot) {
    $stateDirectory = Join-Path $repoRoot ".grind-runtime"
    New-Item -ItemType Directory -Force -Path $stateDirectory | Out-Null
    return $stateDirectory
}

function Get-StatePath([string]$stateDirectory, [string]$serviceName) {
    return Join-Path $stateDirectory "$serviceName.json"
}

function Get-TrackedProcess([string]$stateDirectory, [string]$serviceName) {
    $statePath = Get-StatePath $stateDirectory $serviceName
    if (-not (Test-Path $statePath)) {
        return $null
    }

    try {
        $record = Get-Content $statePath -Raw | ConvertFrom-Json
    } catch {
        Remove-Item $statePath -Force -ErrorAction SilentlyContinue
        return $null
    }

    $process = Get-Process -Id $record.pid -ErrorAction SilentlyContinue
    if (-not $process) {
        Remove-Item $statePath -Force -ErrorAction SilentlyContinue
        return $null
    }

    return $record
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
    [string]$serviceName,
    [string]$title,
    [string]$workingDirectory,
    [string]$command,
    [string]$stateDirectory
) {
    $existing = Get-TrackedProcess $stateDirectory $serviceName
    if ($existing) {
        Write-Host "$title is already running in PowerShell process $($existing.pid)." -ForegroundColor Yellow
        return
    }

    $script = @"
`$Host.UI.RawUI.WindowTitle = '$title'
Set-Location '$workingDirectory'
$command
"@

    $process = Start-Process -FilePath "powershell.exe" -WorkingDirectory $workingDirectory -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command", $script
    ) -PassThru

    @{
        service = $serviceName
        pid = $process.Id
        title = $title
        working_directory = $workingDirectory
        started_at = (Get-Date).ToString("o")
    } | ConvertTo-Json | Set-Content -Path (Get-StatePath $stateDirectory $serviceName) -Encoding ASCII

    Write-Host "Started $title in PowerShell process $($process.Id)." -ForegroundColor Green
}

$repoRoot = Get-RepoRoot
$stateDirectory = Get-StateDirectory $repoRoot
$backendRoot = Join-Path $repoRoot "services\backend"
$mlRoot = Join-Path $repoRoot "services\ml"
$frontendRoot = Join-Path $repoRoot "apps\frontend"

Ensure-BackendEnv $backendRoot
Ensure-FrontendEnv $frontendRoot

if (-not $SkipMl) {
    $mlPython = Find-PythonInterpreter $mlRoot
    Open-ServiceWindow `
        -serviceName "ml" `
        -title "GRIND ML" `
        -workingDirectory $mlRoot `
        -command "& '$mlPython' -m uvicorn app.main:app --port 8001" `
        -stateDirectory $stateDirectory
}

if (-not $SkipBackend) {
    $backendPython = Find-PythonInterpreter $backendRoot
    Open-ServiceWindow `
        -serviceName "backend" `
        -title "GRIND Backend" `
        -workingDirectory $backendRoot `
        -command "& '$backendPython' -m uvicorn app.main:app --port 8000" `
        -stateDirectory $stateDirectory
}

if (-not $SkipFrontend) {
    $npmPath = Find-Npm
    Open-ServiceWindow `
        -serviceName "frontend" `
        -title "GRIND Frontend" `
        -workingDirectory $frontendRoot `
        -command "`$env:BROWSER='none'; `$env:REACT_APP_BACKEND_URL='http://127.0.0.1:8000'; & '$npmPath' run dev" `
        -stateDirectory $stateDirectory
}

Write-Host ""
Write-Host "Started the GRIND MVP services in separate PowerShell windows." -ForegroundColor Green
Write-Host "Next: run .\scripts\check_mvp.cmd after 10-15 seconds." -ForegroundColor Green
Write-Host "Use .\scripts\stop_mvp.cmd to close the tracked service windows later." -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://127.0.0.1:3000"
Write-Host "Backend:  http://127.0.0.1:8000/health"
Write-Host "ML:       http://127.0.0.1:8001/health"
