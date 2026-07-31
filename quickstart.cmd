@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

where docker >nul 2>&1
if errorlevel 1 (
  echo Docker not found. Install Docker Desktop, start it, then re-run quickstart.cmd
  exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
  echo Docker is not running. Start Docker Desktop, then re-run quickstart.cmd
  exit /b 1
)

if not exist ".env" (
  if not exist ".env.example" (
    echo Missing .env.example. Clone https://github.com/alex-carlston/BannoDemo.git and run from that folder.
    exit /b 1
  )
  copy /Y ".env.example" ".env" >nul
  echo Created .env from .env.example.
  echo Edit .env: set CLIENT_ID, CLIENT_SECRET, SESSION_ENC_SECRET, COOKIE_SIGNING_SECRET.
  echo Then run quickstart.cmd again.
  exit /b 1
)

set "MISSING=0"
call :require_env CLIENT_ID
call :require_env CLIENT_SECRET
call :require_env SESSION_ENC_SECRET
call :require_env COOKIE_SIGNING_SECRET
if "!MISSING!"=="1" (
  echo.
  echo Edit .env ^(from .env.example^), set every required field, save, then re-run quickstart.cmd
  echo Generate secrets with:  openssl rand -base64 32
  exit /b 1
)

echo Using repo: %cd%
echo Starting Docker quickstart...
echo.

docker compose run --rm quickstart
exit /b %ERRORLEVEL%

:require_env
set "KEY=%~1"
set "VAL="
for /f "usebackq tokens=1,* delims==" %%A in (`findstr /B /C:"%KEY%=" ".env"`) do (
  if /I "%%A"=="%KEY%" set "VAL=%%B"
)
if "!VAL!"=="" (
  echo Missing required value in .env: %KEY%
  set "MISSING=1"
)
exit /b 0
