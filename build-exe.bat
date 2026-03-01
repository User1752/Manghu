@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

cls
call :banner

:: ─── Step 1: ensure dist\ exists ──────────────────────────────────────────
if not exist "dist" mkdir dist

:: ─── Step 2: build the Docker image ───────────────────────────────────────
echo  [ ^>^> ]  Building Docker image  ^(this may take a while on first run^)...
echo.
docker build -f Dockerfile.build -t manghu-builder . 2>&1
if %errorlevel% neq 0 (
  echo.
  call :err "Docker image build failed. Is Docker Desktop running?"
  goto :end
)
echo.
echo  [ OK ]  Docker image ready.
echo.

:: ─── Step 3: compile the exe ──────────────────────────────────────────────
echo  [ ^>^> ]  Compiling Manghu.exe  ^(this takes 1-3 min^)...
echo.
docker run --rm -v "%cd%\dist:/out" manghu-builder 2>&1
if %errorlevel% neq 0 (
  echo.
  call :err "pkg compilation failed. See output above."
  goto :end
)

:: ─── Step 4: verify output ────────────────────────────────────────────────
if not exist "dist\Manghu.exe" (
  call :err "dist\Manghu.exe was not created. See output above."
  goto :end
)
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                                                          ║
echo  ║   [ OK ]  dist\Manghu.exe is ready!                     ║
echo  ║                                                          ║
echo  ║   Copy dist\Manghu.exe anywhere and double-click it.    ║
echo  ║   No Docker, no Node.js required on the target machine. ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
goto :end

:: ─────────────────────────────────────────────────────────────────────────
:banner
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                                                          ║
echo  ║           M  A  N  G  H  U   —   EXE  Builder          ║
echo  ║                                                          ║
echo  ║   Packages the server + Node.js runtime into one .exe  ║
echo  ║   Uses Docker internally — no Node.js on host needed.  ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
exit /b

:err
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  [ ERR ]  %~1
echo  ╚══════════════════════════════════════════════════════════╝
echo.
pause
exit /b

:end
pause
endlocal
