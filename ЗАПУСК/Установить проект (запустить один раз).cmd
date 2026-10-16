@echo off
chcp 65001 >nul
cd /d "%~dp0..\project"
title Project setup - install, database, build

echo ============================================================
echo   PROJECT SETUP: PRISMA photo studio website
echo ============================================================
echo.
echo   This step is needed ONCE after downloading the project.
echo   It installs dependencies, creates the database and builds
echo   the React application. Then use "Zapustit proekt (server)".
echo.

where node >nul 2>nul
if errorlevel 1 goto :no_node

echo ============================================================
echo   STEP 1 of 3 - installing dependencies of backend and frontend
echo   (this may take a minute)
echo ============================================================
call npm run install:all
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo   STEP 2 of 3 - creating the database with demo data
echo ============================================================
call npm --prefix backend run seed
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo   STEP 3 of 3 - building the React application
echo ============================================================
call npm run build
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo   DONE. The project is ready.
echo.
echo   Next step: run "Zapustit proekt (server).cmd"
echo   Admin panel: http://127.0.0.1:4000/admin/login
echo   login: admin   password: admin123
echo ============================================================
pause
exit /b 0

:failed
echo.
echo   ERROR: the step above failed. Read the message above.
echo   Most common reasons:
echo     - no internet connection (npm cannot download packages);
echo     - Node.js is too old (need version 18 or newer).
pause
exit /b 1

:no_node
echo   Node.js NOT FOUND. Install the LTS version from https://nodejs.org/
echo   Then run this file again.
pause
exit /b 1
