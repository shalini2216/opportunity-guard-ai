# OpportunityGuard AI - Local Development Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       Starting OpportunityGuard AI Local Services         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 0. Check MongoDB
$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -ne 'Running') {
    Write-Host "[*] Starting local MongoDB service..." -ForegroundColor Yellow
    Start-Service -Name MongoDB -ErrorAction SilentlyContinue
}

# 1. Start Backend in new window
Write-Host "[1/2] Launching Python Flask Backend on http://localhost:5000..." -ForegroundColor Green
$backendCmd = "cd '$PSScriptRoot\backend'; if (Test-Path '.\.venv\Scripts\python.exe') { .\.venv\Scripts\python.exe app.py } else { python.exe app.py }"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# 2. Start Frontend in new window
Write-Host "[2/2] Launching React Vite Frontend on http://localhost:5173..." -ForegroundColor Green
$frontendCmd = "cd '$PSScriptRoot\frontend'; npm.cmd run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host "`nOpportunityGuard AI is now running!" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend:  http://localhost:5000/api/health" -ForegroundColor White
Write-Host "Tip: Open http://localhost:5173 in your browser to start!" -ForegroundColor Cyan

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
