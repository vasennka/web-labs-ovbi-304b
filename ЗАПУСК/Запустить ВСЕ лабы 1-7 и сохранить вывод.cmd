@echo off
chcp 65001 >nul
cd /d "%~dp0.."
title Labs 1-7 - run all and save output

where node >nul 2>nul
if errorlevel 1 (
    echo   Node.js NOT FOUND. Install LTS from https://nodejs.org/
    pause
    exit /b 1
)

node "tools\run-labs.js"
echo.
echo   Output files: "vyvod_labaN.txt" in the main folder
echo   Press any key to close this window.
pause >nul
