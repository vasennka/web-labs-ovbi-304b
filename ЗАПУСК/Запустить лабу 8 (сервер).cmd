@echo off
chcp 65001 >nul
cd /d "%~dp0.."
title Laba 8 - server (React + AJAX + Comet + WebSocket)

where node >nul 2>nul
if errorlevel 1 (
    echo   Node.js NOT FOUND. Install LTS from https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules\ws" (
    echo   Installing the "ws" package needed for WebSocket... please wait.
    call npm install --no-audit --no-fund
    echo.
)

echo ============================================================
echo   Server will start on http://localhost:3000
echo   Open in browser:
echo      http://localhost:3000/           - React (task 1, ProgressBar)
echo      http://localhost:3000/ajax.html  - task 2 (AJAX, open in 2 tabs)
echo      http://localhost:3000/poll.html  - task 3 (long polling)
echo      http://localhost:3000/ws.html    - task 3 (WebSocket)
echo   To stop the server press Ctrl+C or close this window.
echo ============================================================
echo.
node "laba8.js"
echo.
pause >nul
