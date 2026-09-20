# OpportunityGuard AI - Local Development Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       Starting OpportunityGuard AI Local Services         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Backend in new window
Write-Host "[1/2] Launching Python Flask Backend on http://localhost:5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .\.venv\Scripts\python.exe app.py"

# 2. Start Frontend in new window
Write-Host "[2/2] Launching React Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm.cmd run dev"

Write-Host "`nOpportunityGuard AI is now running!" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend:  http://localhost:5000/api/health" -ForegroundColor White
Write-Host "Tip: Click 'Instant Demo Mode' on http://localhost:5173 to test immediately." -ForegroundColor Cyan
