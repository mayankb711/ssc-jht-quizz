@echo off
REM Start Vite in background, run tests, clean up
start /B npx vite --port 5173 --host 0.0.0.0 > test\vite.log 2>&1
echo Waiting for server...
:wait
timeout /t 1 /nobreak >nul
findstr "ready" test\vite.log >nul
if errorlevel 1 goto wait
node test\browser-test.mjs
if %ERRORLEVEL% NEQ 0 taskkill /f /im node.exe >nul 2>&1 & exit /b %ERRORLEVEL%
node test\suite2.mjs
set EXIT_CODE=%ERRORLEVEL%
taskkill /f /im node.exe >nul 2>&1
exit /b %EXIT_CODE%
