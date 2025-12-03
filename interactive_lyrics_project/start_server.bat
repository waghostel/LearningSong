@echo off
echo ========================================
echo  Interactive Song Player - Local Server
echo ========================================
echo.
echo Starting local web server...
echo Server will run at: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

cd /d "%~dp0"
python -m http.server 8000

pause
