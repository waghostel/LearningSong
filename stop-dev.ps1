# LearningSong Development Server Stopper
# This script stops all running frontend and backend servers

Write-Host "🛑 Stopping LearningSong Development Servers..." -ForegroundColor Yellow
Write-Host ""

$stopped = $false

# Stop all uvicorn processes first (most reliable)
$uvicornProcesses = Get-Process -Name "uvicorn" -ErrorAction SilentlyContinue
foreach ($proc in $uvicornProcesses) {
    Write-Host "  → Stopping uvicorn (PID: $($proc.Id))..." -ForegroundColor Gray
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    $stopped = $true
}

# Stop python processes running uvicorn
$pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue
foreach ($proc in $pythonProcesses) {
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
        if ($cmdLine -and $cmdLine -like "*uvicorn*") {
            Write-Host "  → Stopping python/uvicorn (PID: $($proc.Id))..." -ForegroundColor Gray
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            $stopped = $true
        }
    } catch {
        # Ignore errors
    }
}

# Stop processes on port 8000 (Backend)
try {
    $backendProcess = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($backendProcess) {
        foreach ($pid in $backendProcess) {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "  → Stopping backend server (PID: $pid)..." -ForegroundColor Gray
                Stop-Process -Id $pid -Force
                $stopped = $true
            }
        }
    }
} catch {
    # Port not in use
}

# Stop processes on port 5173 or 5174 (Frontend)
foreach ($port in @(5173, 5174)) {
    try {
        $frontendProcess = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        if ($frontendProcess) {
            foreach ($pid in $frontendProcess) {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "  → Stopping frontend server on port $port (PID: $pid)..." -ForegroundColor Gray
                    Stop-Process -Id $pid -Force
                    $stopped = $true
                }
            }
        }
    } catch {
        # Port not in use
    }
}

# Also try to stop by process name
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*LearningSong*" }
foreach ($proc in $nodeProcesses) {
    Write-Host "  → Stopping Node.js process (PID: $($proc.Id))..." -ForegroundColor Gray
    Stop-Process -Id $proc.Id -Force
    $stopped = $true
}

Write-Host ""
if ($stopped) {
    Write-Host "✅ All development servers stopped" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No running development servers found" -ForegroundColor Cyan
}
Write-Host ""
