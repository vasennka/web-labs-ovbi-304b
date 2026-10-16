@echo off
chcp 65001 >nul
cd /d "%~dp0..\project"
title Project check - automatic tests

echo ============================================================
echo   PROJECT CHECK: automatic tests (30 checks)
echo ============================================================
echo.
echo   The test starts the server on a free port with its own
echo   database and checks: REST API, EJS pages, contact form,
echo   admin login, CSRF protection, React build and SPA routing.
echo.

where node >nul 2>nul
if errorlevel 1 goto :no_node

if not exist "backend\node_modules" (
    echo   Dependencies are not installed yet.
    echo   First run "Ustanovit proekt (zapustit odin raz).cmd"
    pause
    exit /b 1
)

call npm --prefix backend run smoke
if errorlevel 1 goto :failed

echo.
echo   All checks passed.
pause
exit /b 0

:failed
echo.
echo   Some checks failed - read the messages above.
pause
exit /b 1

:no_node
echo   Node.js NOT FOUND. Install the LTS version from https://nodejs.org/
pause
exit /b 1
