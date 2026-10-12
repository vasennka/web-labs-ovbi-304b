@echo off
chcp 65001 >nul
cd /d "%~dp0.."
title Laba 5 - obekty, prototipy, nasledovanie

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
echo   Laba 5 : obekty, prototipy, nasledovanie
echo ============================================================
echo.
node "laba5.js"
echo.
echo ============================================================
echo   Finished. Press any key to close this window.
echo ============================================================
pause >nul
