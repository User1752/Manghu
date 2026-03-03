@echo off
setlocal EnableDelayedExpansion
title Manghu - EXE Builder
chcp 65001 >nul 2>&1
cls

::  ANSI colour palette
for /F "delims=#" %%E in ('"prompt #$E# & for %%e in (1) do rem"') do set "ESC=%%E"
set "R=!ESC![0m"
set "BOLD=!ESC![1m"
set "DIM=!ESC![2m"
set "PUR=!ESC![35m"
set "BPUR=!ESC![95m"
set "CYN=!ESC![36m"
set "BCYN=!ESC![96m"
set "GRN=!ESC![32m"
set "BGRN=!ESC![92m"
set "RED=!ESC![31m"
set "BRED=!ESC![91m"
set "YLW=!ESC![33m"
set "BYLW=!ESC![93m"
set "WHT=!ESC![97m"
set "GRY=!ESC![90m"

::  Carriage-return trick for in-place animation
for /f %%a in ('copy /z "%~f0" nul') do set "CR=%%a"

cd /d "%~dp0"
call :banner

:: --- Step 1: ensure dist\ exists ------------------------------------------
if not exist "dist" mkdir dist

:: --- Step 2: build the Docker image ---------------------------------------
echo   !BCYN!  [ .. ]!R!  Building Docker image !DIM!(first run may take a while)!R!...
echo.
docker build -f Dockerfile.build -t manghu-builder . 2>&1
if %errorlevel% neq 0 (
    echo.
    call :err "Docker image build failed" "Is Docker Desktop running?"
    goto :end
)
echo.
echo   !BGRN!  [ OK ]!R!  Docker image ready.
echo.

:: --- Step 3: compile the exe -----------------------------------------------
echo   !BCYN!  [ .. ]!R!  Compiling !BOLD!Manghu.exe!R! !DIM!(this takes 1-3 min)!R!...
echo.
docker run --rm -v "%cd%\dist:/out" manghu-builder 2>&1
if %errorlevel% neq 0 (
    echo.
    call :err "pkg compilation failed" "See output above."
    goto :end
)

:: --- Step 4: verify output -------------------------------------------------
if not exist "dist\Manghu.exe" (
    call :err "dist\Manghu.exe was not created" "See output above."
    goto :end
)

echo.
echo   !GRY!  +-----------------------------------------------+!R!
echo   !GRY!  ^|!R!    !BGRN![ OK ]!R!  !BOLD!dist\Manghu.exe is ready!!R!             !GRY!^|!R!
echo   !GRY!  ^|!R!                                                 !GRY!^|!R!
echo   !GRY!  ^|!R!    !WHT!Copy it anywhere and double-click it.!R!    !GRY!^|!R!
echo   !GRY!  ^|!R!    !DIM!No Docker or Node.js needed on the target.!R! !GRY!^|!R!
echo   !GRY!  +-----------------------------------------------+!R!
echo.
goto :end

:: =============================================================================
:: SUBROUTINES
:: =============================================================================

:banner
cls
echo.
echo   !GRY!  +=======================================================+!R!
echo   !GRY!  ^|!R!                                                           !GRY!^|!R!
echo   !GRY!  ^|!R!    !BOLD!!BPUR! ^|V^|   /\   ^|\^|   (^~   ^|-^|   ^| ^|!R!             !GRY!^|!R!
echo   !GRY!  ^|!R!    !BOLD!!PUR! ^|  ^|  /--\  ^| \^|  (_    ^|_^|   ^| ^|!R!             !GRY!^|!R!
echo   !GRY!  ^|!R!    !DIM!!PUR! ^|  ^| /    \ ^|  \^|   _^)  ^| ^|  \__/!R!               !GRY!^|!R!
echo   !GRY!  ^|!R!                                                           !GRY!^|!R!
echo   !GRY!  ^|!R!    !DIM!EXE Builder  .  pkg  .  Docker!R!                      !GRY!^|!R!
echo   !GRY!  +=======================================================+!R!
echo.
goto :eof

:err
echo   !GRY!  +-----------------------------------------------+!R!
echo   !GRY!  ^|!R!    !BRED![ ERR ]!R!  !BOLD!%~1!R!
if not "%~2"=="" echo   !GRY!  ^|!R!             !DIM!%~2!R!
echo   !GRY!  +-----------------------------------------------+!R!
echo.
goto :eof

:end
for /f "delims=" %%k in ('powershell -noprofile -nologo -command "$k=$Host.UI.RawUI.ReadKey(''NoEcho,IncludeKeyDown''); Write-Output $k.Character"') do set "_key=%%k"
endlocal
