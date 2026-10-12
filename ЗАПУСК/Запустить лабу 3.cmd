@echo off
chcp 65001 >nul
cd /d "%~dp0.."
title Laba 3 - funkcii, strelki, zamykaniya

where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo   Node.js NOT FOUND.
    echo   Install it from https://nodejs.org/  ^(LTS version^), then run this file again.
    echo.
    pause
    exit /b 1
)

echo ============================================================
echo   Laba 3 : funkcii, strelki, zamykaniya
echo ============================================================
echo.
node "laba3.js"
echo.
echo ============================================================
echo   Finished. Press any key to close this window.
echo ============================================================
pause >nul
