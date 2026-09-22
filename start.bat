@echo off
title OpportunityGuard AI Launcher
color 0B
echo ======================================================================
echo                  OpportunityGuard AI - System Launcher
echo ======================================================================
echo.

:: 1. Check MongoDB
echo [*] Checking local MongoDB service...
sc query MongoDB | find "RUNNING" >nul
if %ERRORLEVEL% EQU 0 (
    echo [+] MongoDB is currently running.
) else (
    echo [!] Attempting to start MongoDB service...
    net start MongoDB >nul 2>&1
)

:: 2. Launch Backend
echo.
echo [*] Launching Python Flask Backend on http://localhost:5000 ...
start "OpportunityGuard Backend [Port 5000]" cmd /k "cd /d "%~dp0backend" && if exist .venv\Scripts\python.exe (.venv\Scripts\python.exe app.py) else (python app.py)"

:: 3. Launch Frontend
echo [*] Launching React Vite Frontend on http://localhost:5173 ...
start "OpportunityGuard Frontend [Port 5173]" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"

echo.
echo ======================================================================
echo [+] OpportunityGuard AI services are starting!
echo     - Web App:   http://localhost:5173
echo     - REST API:  http://localhost:5000/api/health
echo ======================================================================
echo.
timeout /t 4 >nul
start http://localhost:5173
