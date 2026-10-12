@echo off
chcp 65001 >nul
cd /d "%~dp0.."
title Laba 2 - real git repository demo (branches, pull requests, conflict)

where git >nul 2>nul
if errorlevel 1 (
    echo   Git NOT FOUND. Install it from https://git-scm.com/
    pause
    exit /b 1
)

echo   The script creates a real git repository laba2\git-demo,
echo   builds branches main / develop / feature/*, merges pull requests
echo   and resolves a merge conflict. Log is saved to laba2\git-demo-log.txt
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "laba2\git-demo.ps1" | Out-File -Encoding utf8 "laba2\git-demo-log.txt"

echo   Done. Log file: laba2\git-demo-log.txt
echo   Press any key to open it in Notepad.
pause >nul
start "" notepad "laba2\git-demo-log.txt"
