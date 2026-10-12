@echo off
chcp 65001 >nul
cd /d "%~dp0..\project"
title Project server - PRISMA photo studio (port 4000)

echo ============================================================
echo   PROJECT: PRISMA photo studio website
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :no_node

REM --- ??? ?????? ??????? ??? ???????????? ????????????? ---------------
if not exist "backend\node_modules" (
    echo   Step 1/3: installing dependencies of backend and frontend...
    call npm run install:all
    if errorlevel 1 goto :failed
    echo.
)

if not exist "backend\data\db.json" (
    echo   Step 2/3: creating the database with demo data...
    call npm --prefix backend run seed
    if errorlevel 1 goto :failed
    echo.
)

if not exist "frontend\dist\index.html" (
    echo   Step 3/3: building the React application...
    call npm run build
    if errorlevel 1 goto :failed
    echo.
)

echo ============================================================
echo   The server is starting. The browser will open automatically.
echo.
echo   Public site - React : http://127.0.0.1:4000/
echo   Public site - EJS   : http://127.0.0.1:4000/site/
echo   Admin panel         : http://127.0.0.1:4000/admin/login
echo                         login: admin   password: admin123
echo   REST API            : http://127.0.0.1:4000/api/v1/news
echo.
echo   To stop the server press Ctrl+C or close this window.
echo ============================================================
echo.

start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process 'http://127.0.0.1:4000/'"

call npm start
pause
exit /b 0

:failed
echo.
echo   ERROR: the step above failed. Read the message above.
pause
exit /b 1

:no_node
echo   Node.js NOT FOUND. Install the LTS version from https://nodejs.org/
echo   Then run this file again.
pause
exit /b 1
