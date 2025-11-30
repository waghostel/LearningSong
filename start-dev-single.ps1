# LearningSong Development Server Starter (Single Window)
# This script starts both servers in the same terminal using concurrent processes

Write-Host "🚀 Starting LearningSong Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Check if pnpm is installed
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: pnpm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if poetry is installed
if (-not (Get-Command poetry -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: poetry is not installed or not in PATH" -ForegroundColor Red
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

Write-Host "✅ Prerequisites checked" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Starting servers in parallel..." -ForegroundColor Cyan
Write-Host "  → Backend:  http://localhost:8000" -ForegroundColor Gray
Write-Host "  → Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow
Write-Host ""

# Create script blocks for each server
$backendScript = {
    Set-Location backend
    poetry run uvicorn app.main:app --reload
}

$frontendScript = {
    Set-Location frontend
    pnpm dev
}

# Start both servers as background jobs
$backendJob = Start-Job -ScriptBlock $backendScript
$frontendJob = Start-Job -ScriptBlock $frontendScript

# Function to display job output
function Show-JobOutput {
    param($Job, $Prefix, $Color)
    
    $output = Receive-Job -Job $Job
    if ($output) {
        foreach ($line in $output) {
            Write-Host "[$Prefix] $line" -ForegroundColor $Color
        }
    }
}

# Monitor both jobs and display their output
try {
    while ($backendJob.State -eq 'Running' -or $frontendJob.State -eq 'Running') {
        Show-JobOutput -Job $backendJob -Prefix "Backend" -Color Magenta
        Show-JobOutput -Job $frontendJob -Prefix "Frontend" -Color Blue
        Start-Sleep -Milliseconds 500
    }
}
finally {
    # Cleanup jobs on exit
    Write-Host ""
    Write-Host "🛑 Stopping servers..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob
    Remove-Job -Job $backendJob, $frontendJob
    Write-Host "✅ Servers stopped" -ForegroundColor Green
}
