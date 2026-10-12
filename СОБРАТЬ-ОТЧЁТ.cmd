@echo off
cd /d "%~dp0"
title Build the Word report

where node >nul 2>nul
if errorlevel 1 goto :no_node

echo   1. Rebuilding the markdown report and console screenshots (HTML)...
node "tools\build-report.js"

echo.
echo   2. Collecting screenshots and building the Word document...
node "tools\make-report-docx.js"

echo.
echo   Done. File: "Otchet po laboratornym rabotam 1-8.docx"
pause
exit /b 0

:no_node
echo   Node.js NOT FOUND. Install the LTS version from https://nodejs.org/
pause
exit /b 1