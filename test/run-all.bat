@echo off
REM ============================================================
REM  SSC JHT Quiz — Complete Test Runner (All Suites)
REM  Runs all 5 test suites sequentially.
REM  Exits with non-zero if ANY suite fails.
REM ============================================================
setlocal enabledelayedexpansion

set START_TIME=%TIME%

echo ============================================================
echo  SSC JHT Quiz — Complete Test Suite
echo  %DATE% %TIME%
echo ============================================================
echo.

REM Kill any existing node processes
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start Vite in background
start /B npx vite --port 5173 --host 0.0.0.0 > test\vite.log 2>&1
echo Waiting for server...
:wait_server
timeout /t 1 /nobreak >nul
findstr "ready" test\vite.log >nul
if errorlevel 1 goto wait_server
echo Server ready.
echo.

set ALL_PASSED=1

REM ---- Suite 1: Integration + Routing ----
echo [1/5] Suite 1: Integration + Routing (browser-test.mjs)
node test\browser-test.mjs
if !ERRORLEVEL! NEQ 0 (
  set ALL_PASSED=0
  echo   *** Suite 1 FAILED ***
) else (
  echo   Suite 1 PASSED
)
echo.

REM ---- Suite 2: Unit + Edge + Security + A11y ----
echo [2/5] Suite 2: Unit + Edge + Security + A11y (suite2.mjs)
node test\suite2.mjs
if !ERRORLEVEL! NEQ 0 (
  set ALL_PASSED=0
  echo   *** Suite 2 FAILED ***
) else (
  echo   Suite 2 PASSED
)
echo.

REM ---- Suite 3: Core + Data + Store + Domain + Shared ----
echo [3/5] Suite 3: Core + Data + Store + Domain + Shared (suite3.mjs)
node test\suite3.mjs
if !ERRORLEVEL! NEQ 0 (
  set ALL_PASSED=0
  echo   *** Suite 3 FAILED ***
) else (
  echo   Suite 3 PASSED
)
echo.

REM ---- Suite 4: Learning Module Unit Tests ----
echo [4/5] Suite 4: Learning Module Unit Tests (suite4.mjs)
node test\suite4.mjs
if !ERRORLEVEL! NEQ 0 (
  set ALL_PASSED=0
  echo   *** Suite 4 FAILED ***
) else (
  echo   Suite 4 PASSED
)
echo.

REM ---- Suite 5: Integration Smoke / Regression ----
echo [5/5] Suite 5: Integration Smoke / Regression (suite5.mjs)
node test\suite5.mjs
if !ERRORLEVEL! NEQ 0 (
  set ALL_PASSED=0
  echo   *** Suite 5 FAILED ***
) else (
  echo   Suite 5 PASSED
)
echo.

REM Stop server
taskkill /f /im node.exe >nul 2>&1

set END_TIME=%TIME%

echo ============================================================
if !ALL_PASSED! EQU 1 (
  echo  ALL SUITES PASSED
) else (
  echo  SOME SUITES FAILED - check results above
)
echo  Started: %START_TIME%
echo  Ended:   %END_TIME%
echo ============================================================

if !ALL_PASSED! EQU 1 exit /b 0
exit /b 1
