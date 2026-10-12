@echo off
chcp 65001 >nul
cd /d "%~dp0..\project"
title Project - PRISMA server (port 4000)

if not exist "backend\node_modules" (
    echo   Dependencies are not installed yet.
    echo   First run "Ustanovit proekt (zapustit odin raz).cmd"
    pause
    exit /b 1
)
if not exist "frontend\dist\index.html" (
    echo   React build not found. Building it now, please wait...
    call npm run build
    echo.
)

echo ============================================================
echo   Public site (React) : http://127.0.0.1:4000/
echo   Public site (EJS)   : http://127.0.0.1:4000/site/
echo   Admin panel         : http://127.0.0.1:4000/admin/login   (admin / admin123)
echo   REST API            : http://127.0.0.1:4000/api/v1/news
echo   Stop: Ctrl+C or close this window.
echo ============================================================
echo.
call npm start
echo.
pause >nul
