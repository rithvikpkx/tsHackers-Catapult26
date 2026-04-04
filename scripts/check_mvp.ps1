param(
    [int]$TimeoutSeconds = 20
)

$ErrorActionPreference = "Stop"

function Wait-ForUrl(
    [string]$name,
    [string]$url,
    [int]$timeoutSeconds
) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    $lastError = ""

    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 4
            return [pscustomobject]@{
                Name = $name
                Url = $url
                Status = "up"
                Code = [int]$response.StatusCode
            }
        } catch {
            $lastError = $_.Exception.Message
            Start-Sleep -Seconds 1
        }
    }

    return [pscustomobject]@{
        Name = $name
        Url = $url
        Status = "down"
        Code = ""
        Error = $lastError
    }
}

$checks = @(
    Wait-ForUrl -name "Frontend" -url "http://127.0.0.1:3000" -timeoutSeconds $TimeoutSeconds
    Wait-ForUrl -name "Backend" -url "http://127.0.0.1:8000/health" -timeoutSeconds $TimeoutSeconds
    Wait-ForUrl -name "ML" -url "http://127.0.0.1:8001/health" -timeoutSeconds $TimeoutSeconds
)

$checks | Format-Table -AutoSize

$failed = $checks | Where-Object { $_.Status -ne "up" }
if ($failed) {
    Write-Host ""
    Write-Host "One or more services are still down." -ForegroundColor Yellow
    $failed | ForEach-Object {
        Write-Host "- $($_.Name): $($_.Error)" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host ""
Write-Host "All MVP services are reachable." -ForegroundColor Green
