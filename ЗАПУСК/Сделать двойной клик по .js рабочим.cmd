@echo off
chcp 65001 >nul
title Make .js files open with Node.js (optional)

net session >nul 2>&1
if errorlevel 1 (
    echo   This action changes system settings and needs administrator rights.
    echo   Right-click this file and choose "Run as administrator".
    pause
    exit /b 1
)

for /f "delims=" %%i in ('where node') do set NODEPATH=%%i
if "%NODEPATH%"=="" (
    echo   Node.js NOT FOUND in PATH.
    pause
    exit /b 1
)

echo   Node.js path: %NODEPATH%
echo   Setting the .js file association to Node.js...
ftype NodeJSFile="%NODEPATH%" "%%1" %%*
assoc .js=NodeJSFile

echo.
echo   Done. Now double-clicking a .js file runs it with Node.js.
echo   To revert to the Windows default (Windows Script Host):
echo       assoc .js=JSFile
echo       ftype JSFile="C:\Windows\System32\WScript.exe" "%%1" %%*
echo.
pause
