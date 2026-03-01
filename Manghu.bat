@echo off
setlocal EnableDelayedExpansion
title Manghu - Manga Reader
color 0D
chcp 65001 >nul 2>nul
cls

cd /d "%~dp0"

:: Check Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    call :banner
    echo   [ ERR ] Docker not found. Install from https://www.docker.com
    echo.
    pause & exit /b 1
)

:: Check Docker daemon is running
docker info >nul 2>nul
if %ERRORLEVEL% EQU 0 goto start_server

cls
call :banner
echo   [ ! ]  Docker Desktop is not running. Starting...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
<nul set /p =   [ . ]  Waiting
:waitloop
<nul set /p =.
timeout /t 2 /nobreak >nul
docker info >nul 2>nul
if %ERRORLEVEL% NEQ 0 goto waitloop
echo.
echo   [ OK ] Docker ready.
echo.

:start_server
cd docker
call :launch
goto menu

:: 
:launch
cls
call :banner
echo   [ ^>^> ] Starting server...
echo.
docker compose up -d --build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   [ ERR ] Failed to start. Is Docker Desktop running?
    echo.
    pause & exit /b 1
)
echo.
echo   +--------------------------------------------------+
echo   ^|   URL    ^>  http://localhost:3000               ^|
echo   ^|   STATUS ^>  Running                            ^|
echo   +--------------------------------------------------+
echo.
start "" "http://localhost:3000"
goto :eof

:: 
:menu
echo   [ R ]  Rebuild ^& Refresh   (docker compose up -d --build)
echo   [ Q ]  Quit ^& Stop server
echo.
choice /c RQ /n /m "   > "
if %ERRORLEVEL% EQU 1 goto refresh
if %ERRORLEVEL% EQU 2 goto quit

:refresh
echo.
echo   [ ^>^> ] Rebuilding and restarting...
echo.
docker compose up -d --build
echo.
echo   [ OK ] Refreshed  -  http://localhost:3000
echo.
goto menu

:quit
echo.
echo   [ >> ] Stopping Manghu...
docker compose down
echo.
echo   [ OK ] Server stopped. Goodbye!
echo.
timeout /t 2 /nobreak >nul
exit /b 0

:: 
:banner
echo.
echo   #####################################################
echo   ##                                                 ##
echo   ##      M A N G H U   -   Manga Reader            ##
echo   ##      Docker  ^|  http://localhost:3000          ##
echo   ##                                                 ##
echo   #####################################################
echo.
goto :eof