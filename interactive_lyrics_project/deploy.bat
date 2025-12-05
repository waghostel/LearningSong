@echo off
REM Batch script to deploy Interactive Lyrics Project to Vercel

echo ========================================
echo Interactive Lyrics - Vercel Deployment
echo ========================================
echo.

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Vercel CLI not found!
    echo.
    echo Please install Vercel CLI first:
    echo   npm install -g vercel
    echo.
    echo Or deploy via Vercel Dashboard:
    echo   1. Push to Git: git add . ^&^& git commit -m "Deploy" ^&^& git push
    echo   2. Go to: https://vercel.com/new
    echo   3. Import your repository
    echo   4. Set Root Directory to: interactive_lyrics_project
    echo.
    pause
    exit /b 1
)

echo [OK] Vercel CLI found!
echo.

REM Navigate to script directory
cd /d "%~dp0"

echo Current directory: %CD%
echo.

REM Check if logged in
echo Checking Vercel authentication...
vercel whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Not logged in to Vercel!
    echo.
    echo Logging in to Vercel...
    vercel login
    
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Login failed!
        pause
        exit /b 1
    )
)

echo [OK] Authenticated!
echo.

REM Deploy to production
echo Deploying to Vercel...
echo.

vercel --prod

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Deployment successful!
    echo.
    echo Your site is now live!
) else (
    echo.
    echo [ERROR] Deployment failed!
    echo.
    echo Try running with debug mode:
    echo   vercel --prod --debug
)

echo.
pause
