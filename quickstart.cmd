@echo off
setlocal EnableExtensions
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

findstr /B /C:"CLIENT_ID=" .env | findstr /V /C:"CLIENT_ID=$" >nul
if errorlevel 1 (
  echo Missing CLIENT_ID in .env — edit .env and re-run.
  exit /b 1
)
findstr /B /C:"CLIENT_SECRET=" .env | findstr /V /C:"CLIENT_SECRET=$" >nul
if errorlevel 1 (
  echo Missing CLIENT_SECRET in .env — edit .env and re-run.
  exit /b 1
)
findstr /B /C:"SESSION_ENC_SECRET=" .env | findstr /V /C:"SESSION_ENC_SECRET=$" >nul
if errorlevel 1 (
  echo Missing SESSION_ENC_SECRET in .env — edit .env and re-run.
  exit /b 1
)
findstr /B /C:"COOKIE_SIGNING_SECRET=" .env | findstr /V /C:"COOKIE_SIGNING_SECRET=$" >nul
if errorlevel 1 (
  echo Missing COOKIE_SIGNING_SECRET in .env — edit .env and re-run.
  exit /b 1
)

echo Using repo: %cd%
echo Starting Docker quickstart...
echo.

docker compose run --rm quickstart
exit /b %ERRORLEVEL%
