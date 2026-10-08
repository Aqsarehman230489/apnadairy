@echo off
REM ============================================================
REM  ApnaDairy (farmer portal) — dev starter (Windows)
REM  Opens 2 terminals: the farmer backend on :8000 and the
REM  Expo app. Run the PREREQ installs once first (see README.md).
REM
REM  If your folders live somewhere else, edit the SET lines.
REM ============================================================

SET FARMER_BACKEND=%~dp0..\..\backend\farmer
SET MOBILE_APP=%~dp0

echo Starting Farmer backend :8000 ...
start "ApnaDairy Farmer API :8000" cmd /k "cd /d %FARMER_BACKEND% && uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo Starting Expo app ...
start "ApnaDairy Expo" cmd /k "cd /d %MOBILE_APP% && npx expo start"

echo.
echo Done. Scan the QR in Expo Go (same Wi-Fi as this laptop).
pause
