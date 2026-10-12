@echo off
chcp 65001 >nul
cd /d "%~dp0..\project"
title Project - smoke test (28 checks)

if not exist "backend\node_modules" (
    echo   Dependencies are not installed. Run the install launcher first.
    pause
    exit /b 1
)

call npm --prefix backend run smoke
echo.
echo   Press any key to close this window.
pause >nul
