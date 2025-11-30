# LearningSong Development Server Starter
# This script starts both frontend and backend servers concurrently

Write-Host "🚀 Starting LearningSong Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Check if pnpm is installed
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: pnpm is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install pnpm: npm install -g pnpm" -ForegroundColor Yellow
    exit 1
}

# Check if poetry is installed
if (-not (Get-Command poetry -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: poetry is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install poetry: https://python-poetry.org/docs/#installation" -ForegroundColor Yellow
    exit 1
}

# Function to kill processes on specific ports
function Stop-ProcessOnPort {
    param($Port, $ServiceName)
    
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        if ($processes) {
            Write-Host "⚠️  Port $Port is occupied by $ServiceName. Stopping existing processes..." -ForegroundColor Yellow
            foreach ($pid in $processes) {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "  → Stopping process (PID: $pid)..." -ForegroundColor Gray
                    Stop-Process -Id $pid -Force
                }
            }
            Write-Host "✅ Port $Port cleared" -ForegroundColor Green
            Start-Sleep -Seconds 1
        }
    } catch {
        # Port not in use, continue
    }
}

# Clear ports before starting
Write-Host "🔍 Checking for occupied ports..." -ForegroundColor Cyan
Stop-ProcessOnPort -Port 8000 -ServiceName "Backend"
Stop-ProcessOnPort -Port 5173 -ServiceName "Frontend"
Stop-ProcessOnPort -Port 5174 -ServiceName "Frontend (alt)"

# Check if frontend/.env exists
if (-not (Test-Path "frontend/.env")) {
    Write-Host "⚠️  Warning: frontend/.env not found" -ForegroundColor Yellow
    Write-Host "Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path "frontend/.env.example") {
        Copy-Item "frontend/.env.example" "frontend/.env"
        Write-Host "✅ Created frontend/.env" -ForegroundColor Green
    }
}

# Check if backend/.env exists
if (-not (Test-Path "backend/.env")) {
    Write-Host "⚠️  Warning: backend/.env not found" -ForegroundColor Yellow
    Write-Host "Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path "backend/.env.example") {
        Copy-Item "backend/.env.example" "backend/.env"
        Write-Host "✅ Created backend/.env" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan

# Install frontend dependencies
Write-Host "  → Installing frontend dependencies..." -ForegroundColor Gray
Set-Location frontend
pnpm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Install backend dependencies
Write-Host "  → Installing backend dependencies..." -ForegroundColor Gray
Set-Location backend
poetry install --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

Write-Host ""
Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Starting servers..." -ForegroundColor Cyan
Write-Host "  → Backend:  http://localhost:8000" -ForegroundColor Gray
Write-Host "  → Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host "  → API Docs: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow
Write-Host ""

# Start backend in a new window
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host '🐍 Backend Server Starting...' -ForegroundColor Magenta; poetry run uvicorn app.main:app --reload" -PassThru

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend in a new window
$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host '⚛️  Frontend Server Starting...' -ForegroundColor Blue; pnpm dev" -PassThru

Write-Host "✅ Servers started in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Server Process IDs:" -ForegroundColor Cyan
Write-Host "  → Backend PID:  $($backendJob.Id)" -ForegroundColor Gray
Write-Host "  → Frontend PID: $($frontendJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop servers, close the terminal windows or run:" -ForegroundColor Yellow
Write-Host "  Stop-Process -Id $($backendJob.Id), $($frontendJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "Happy coding! 🎉" -ForegroundColor Green
