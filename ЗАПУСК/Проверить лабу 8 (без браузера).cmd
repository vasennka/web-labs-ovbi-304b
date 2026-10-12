@echo off
chcp 65001 >nul
cd /d "%~dp0.."
title Laba 8 - self test (AJAX, Comet, SSE, JSONP, WebSocket)

if not exist "node_modules\ws" (
    echo   Installing the "ws" package... please wait.
    call npm install --no-audit --no-fund
    echo.
)

set SELFTEST_EXIT=1
node "laba8.js" --selftest
echo.
echo   The test is finished. Press any key to close.
pause >nul
