@echo off
cd /d "%~dp0"
title Run all works (labs 1-8)

where node >nul 2>nul
if errorlevel 1 goto :no_node

echo ============================================================
echo   1 of 2 - running labs 1-7 and saving their output
echo ============================================================
node "tools\run-labs.js"

echo.
echo ============================================================
echo   2 of 2 - checking lab 8 (server self test)
echo ============================================================
if not exist "node_modules\ws" (
    echo   Installing the "ws" package, please wait...
    call npm install --no-audit --no-fund
)
set SELFTEST_EXIT=1
node "laba8.js" --selftest

echo.
echo ============================================================
echo   ALL DONE
echo   Report for the teacher:  "Otchet po laboratornym rabotam 1-8.docx"
echo   Reports about topics:    doklady\word\*.docx
echo   Console output files:    vyvod_laba1..7.txt
echo ============================================================
start "" explorer "%~dp0"
pause
exit /b 0

:no_node
echo   Node.js NOT FOUND. Install the LTS version from https://nodejs.org/
echo   Then run this file again.
pause
exit /b 1