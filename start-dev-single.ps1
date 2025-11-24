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
