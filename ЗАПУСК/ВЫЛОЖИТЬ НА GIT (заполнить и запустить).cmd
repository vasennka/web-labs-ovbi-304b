@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."
title Publish the works folder to GitHub

echo ============================================================
echo   PUBLISH TO GITHUB - all labs, project and reports
echo ============================================================
echo.
echo   This helper will:
echo     1. ask a few questions - name, email, GitHub login, repo name;
echo     2. create a local git repository and make the first commit;
echo     3. open the GitHub page to create an empty repository;
echo     4. push everything to GitHub.
echo.
echo   Nothing is sent anywhere until the push step at the end.
echo.

where git >nul 2>nul
if errorlevel 1 goto :no_git

where node >nul 2>nul
if errorlevel 1 echo   NOTE: Node.js was not found. The site will need it after cloning: https://nodejs.org/

REM ============ 1. Questions ================================================
set GITNAME=
set GITMAIL=
set GHLOGIN=
set REPO=

set /p GITNAME=Your name for commits, for example Ivan Petrov: 
if "!GITNAME!"=="" goto :empty_name

set /p GITMAIL=Your email for commits, for example ivan@mail.ru: 
if "!GITMAIL!"=="" goto :empty_mail

set /p GHLOGIN=Your GitHub login - username: 
if "!GHLOGIN!"=="" goto :empty_login

set /p REPO=Repository name, press Enter for web-labs-prisma: 
if "!REPO!"=="" set REPO=web-labs-prisma

echo.
echo   Repository address: https://github.com/!GHLOGIN!/!REPO!
echo   Public or private - you choose it on the GitHub page.
echo.

REM ============ 2. Local repository =========================================
echo ============================================================
echo   STEP 1 of 3 - creating the local repository and first commit
echo ============================================================
if not exist ".git" (
    git init -q .
    git branch -M main
)
git config user.name "!GITNAME!"
git config user.email "!GITMAIL!"
git config core.autocrlf false

git add .
git status --short > "%TEMP%\prisma-git-status.txt"
git status --short | find /c /v "" > "%TEMP%\prisma-git-count.txt"
set /p FILECOUNT=<"%TEMP%\prisma-git-count.txt"

echo.
echo   Total files to commit: !FILECOUNT!
echo.
echo   Safety check. These lines must NOT appear below:
echo     node_modules, database file db.json, .sqlite, built frontend dist
findstr /i /c:"node_modules/" /c:"db.json" /c:".sqlite" /c:"/dist/" "%TEMP%\prisma-git-status.txt" >nul
if errorlevel 1 echo   OK - nothing extra: node_modules, database and builds are ignored by .gitignore
if not errorlevel 1 echo   WARNING - look at the files above before pushing
del "%TEMP%\prisma-git-status.txt" >nul 2>&1
del "%TEMP%\prisma-git-count.txt" >nul 2>&1
echo   ------------------------------------------------------------
git commit -q -m "Laboratory works 1-8 and project PRISMA, topic 25"
if errorlevel 1 echo   Note: nothing new to commit - this commit already exists.
if not errorlevel 1 echo   First commit created.

REM ============ 3. Empty repository on GitHub ===============================
echo.
echo ============================================================
echo   STEP 2 of 3 - create an EMPTY repository on GitHub
echo ============================================================
echo   A browser page will open. On that page:
echo     - keep the name !REPO!;
echo     - choose Public or Private;
echo     - do NOT add README, .gitignore or license - they already exist here;
echo     - press the green button "Create repository".
echo.
start "" "https://github.com/new?name=!REPO!&description=Laboratory%20works%20JS%20Node.js%20React"
echo   When the repository is created - come back to this window
echo   and press any key to continue.
pause >nul

git remote remove origin >nul 2>&1
git remote add origin https://github.com/!GHLOGIN!/!REPO!.git
echo   Remote added: https://github.com/!GHLOGIN!/!REPO!.git

REM ============ 4. Push =====================================================
echo.
echo ============================================================
echo   STEP 3 of 3 - uploading to GitHub
echo ============================================================
echo   Git will ask for credentials:
echo     Username: your GitHub login, that is !GHLOGIN!
echo     Password: PASTE A PERSONAL ACCESS TOKEN - not the account password!
echo.
echo   How to get a token in one minute:
echo     GitHub - avatar - Settings - Developer settings -
echo     Personal access tokens - Tokens classic - Generate new token
echo     - tick the box "repo" - Generate - copy the token.
echo.
echo   Windows will remember the token, so the next push will not ask again.
echo.
pause >nul

git push -u origin main
if errorlevel 1 goto :push_failed

echo.
echo ============================================================
echo   DONE. Repository: https://github.com/!GHLOGIN!/!REPO!
echo ============================================================
echo.
echo   What to send to the teacher: the link above and a short note
echo   about how to run everything - see section 4.4 of INSTRUKCIYA.md
echo.
pause
exit /b 0

REM ============ Error handlers ==============================================
:no_git
echo   ERROR: Git is not installed. Download it from https://git-scm.com/
pause
exit /b 1

:empty_name
echo   ERROR: the name cannot be empty.
pause
exit /b 1

:empty_mail
echo   ERROR: the email cannot be empty.
pause
exit /b 1

:empty_login
echo   ERROR: the GitHub login cannot be empty.
pause
exit /b 1

:push_failed
echo.
echo   ------------------------------------------------------------
echo   PUSH FAILED. Most common reasons:
echo     - the repository on GitHub is not created yet;
echo     - wrong login in the URL, it must be !GHLOGIN!;
echo     - the account password was used instead of an access token;
echo     - the repository was created WITH a README file, so your histories
echo       differ. In that case run:  git pull --rebase origin main
echo       and then push again.
echo   ------------------------------------------------------------
pause
exit /b 1
