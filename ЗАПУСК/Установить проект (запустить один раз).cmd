@echo off
chcp 65001 >nul
cd /d "%~dp0..\project"
title Project - install dependencies, seed database, build React

where node >nul 2>nul
if errorlevel 1 (
    echo   Node.js NOT FOUND. Install LTS from https://nodejs.org/
    pause
    exit /b 1
)

echo ============================================================
echo   STEP 1/3 - installing backend and frontend dependencies
echo ============================================================
call npm run install:all
if errorlevel 1 goto :error

echo.
echo ============================================================
echo   STEP 2/3 - filling the database with demo data
echo ============================================================
call npm --prefix backend run seed
if errorlevel 1 goto :error

echo.
echo ============================================================
echo   STEP 3/3 - building the React application
echo ============================================================
call npm run build
if errorlevel 1 goto :error

echo.
echo ============================================================
echo   DONE. Now run "Zapustit proekt (server).cmd"
echo   Admin login: admin / admin123
echo ============================================================
pause >nul
exit /b 0

:error
echo.
echo   ERROR: something failed. Read the message above.
pause >nul
exit /b 1
