@echo off
chcp 65001 >nul
cd /d "%~dp0.."
title Laba 8 - self test (AJAX, Comet, SSE, JSONP, WebSocket)

echo ============================================================
echo   LAB 8 SELF TEST: AJAX, long polling, SSE, JSONP, WebSocket
echo ============================================================
echo.
echo   The script starts the lab server and checks every data
echo   transport. Results are printed below with check marks.
echo.

where node >nul 2>nul
if errorlevel 1 goto :no_node

if not exist "node_modules\ws" (
    echo   Installing the "ws" package needed for WebSocket, please wait...
    call npm install --no-audit --no-fund
    if errorlevel 1 goto :failed
    echo.
)

set SELFTEST_EXIT=1
node "laba8.js" --selftest
echo.
echo   Test finished. To open the pages in a browser use
echo   "Zapustit labu 8 (server).cmd" and open http://localhost:3000/
pause
exit /b 0

:failed
echo   ERROR: could not install dependencies (check the internet connection).
pause
exit /b 1

:no_node
echo   Node.js NOT FOUND. Install the LTS version from https://nodejs.org/
pause
exit /b 1
