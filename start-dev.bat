@echo off
REM LearningSong Development Server Starter (Batch Version)
REM This script starts both frontend and backend servers concurrently

echo.
echo ========================================
echo   LearningSong Development Servers
echo ========================================
echo.

REM Check if pnpm is installed
where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] pnpm is not installed or not in PATH
    echo Please install pnpm: npm install -g pnpm
    pause
    exit /b 1
)

REM Check if poetry is installed
where poetry >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] poetry is not installed or not in PATH
    echo Please install poetry: https://python-poetry.org/docs/#installation
    pause
    exit /b 1
)

REM Check if frontend/.env exists
if not exist "frontend\.env" (
    echo [WARNING] frontend/.env not found
    if exist "frontend\.env.example" (
        echo Creating from .env.example...
        copy "frontend\.env.example" "frontend\.env" >nul
        echo [OK] Created frontend/.env
    )
)

REM Check if backend/.env exists
if not exist "backend\.env" (
    echo [WARNING] backend/.env not found
    if exist "backend\.env.example" (
        echo Creating from .env.example...
        copy "backend\.env.example" "backend\.env" >nul
        echo [OK] Created backend/.env
    )
)

echo.
echo [INFO] Installing dependencies...
echo.

REM Install frontend dependencies
echo   - Installing frontend dependencies...
cd frontend
call pnpm install --silent
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
cd ..

REM Install backend dependencies
echo   - Installing backend dependencies...
cd backend
call poetry install --quiet
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [OK] Dependencies installed successfully!
echo.
echo ========================================
echo   Starting Servers
echo ========================================
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C in each window to stop servers
echo.

REM Start backend in a new window
start "LearningSong Backend" cmd /k "cd /d %CD%\backend && echo [Backend Server] && poetry run uvicorn app.main:app --reload"

REM Wait a moment for backend to start
timeout /t 2 /nobreak >nul

REM Start frontend in a new window
start "LearningSong Frontend" cmd /k "cd /d %CD%\frontend && echo [Frontend Server] && pnpm dev"

echo.
echo [OK] Servers started in separate windows!
echo.
echo Happy coding! ^_^
echo.
pause
