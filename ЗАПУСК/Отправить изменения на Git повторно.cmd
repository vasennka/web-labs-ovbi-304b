@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."
title Send changes to GitHub

echo ============================================================
echo   SEND CHANGES TO GITHUB
echo ============================================================
echo   Use this after the first publish: it commits your edits
echo   and uploads them to the same repository.
echo.

where git >nul 2>nul
if errorlevel 1 goto :no_git

if not exist ".git" goto :no_repo

echo   Current remote repository:
git remote -v
echo.

set MSG=
set /p MSG=Commit message, press Enter for "update": 
if "!MSG!"=="" set MSG=update

git add .
git commit -m "!MSG!"
if errorlevel 1 echo   Note: there were no changes to commit.
if not errorlevel 1 echo   Commit created: !MSG!

echo.
echo   Uploading...
git push
if errorlevel 1 goto :push_failed

echo.
echo ============================================================
echo   DONE - changes are on GitHub.
echo ============================================================
pause
exit /b 0

:no_git
echo   ERROR: Git is not installed. Download it from https://git-scm.com/
pause
exit /b 1

:no_repo
echo   ERROR: this folder is not a git repository yet.
echo   First run the launcher: "VYLOZHIT NA GIT (zapolnit i zapustit).cmd"
pause
exit /b 1

:push_failed
echo.
echo   ------------------------------------------------------------
echo   PUSH FAILED. Check:
echo     - internet connection;
echo     - the token is still valid - GitHub - Settings - Developer settings;
echo     - if someone else changed the repository, run first:
echo         git pull --rebase origin main
echo       and then push again.
echo   ------------------------------------------------------------
pause
exit /b 1
