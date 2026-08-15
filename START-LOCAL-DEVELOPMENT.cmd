@echo off
setlocal
cd /d "%~dp0"
if not exist "outputs\local-development\index.html" (
  echo Building Local Development...
  node scripts\build-local-development.mjs || goto :error
)
echo Starting Local Development for this PC and devices on the same Wi-Fi...
node scripts\serve-local-development.mjs
goto :eof
:error
echo.
echo Local Development could not be started.
pause
exit /b 1
