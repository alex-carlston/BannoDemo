@echo off
REM Double-click / cmd.exe entrypoint for Windows deploy
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" %*
exit /b %ERRORLEVEL%
