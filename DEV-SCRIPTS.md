# Development Scripts

This directory contains scripts to help you start the LearningSong development environment quickly.

## Available Scripts

### 1. `start-dev.ps1` (Recommended for Windows PowerShell)
Starts both frontend and backend servers in **separate terminal windows**.

**Usage:**
```powershell
.\start-dev.ps1
```

**Features:**
- ✅ Checks for required tools (pnpm, poetry)
- ✅ Auto-creates `.env` files from examples if missing
- ✅ Installs dependencies automatically
- ✅ Opens separate windows for each server (easier to monitor)
- ✅ Shows process IDs for easy management

### 2. `start-dev.bat` (For Windows Command Prompt)
Batch file version that works in CMD.

**Usage:**
```cmd
start-dev.bat
```

**Features:**
- ✅ Same functionality as PowerShell version
- ✅ Works in Command Prompt (cmd.exe)
- ✅ Separate windows for each server

### 3. `start-dev-single.ps1` (Single Window)
Starts both servers in the **same terminal window** with interleaved output.

**Usage:**
```powershell
.\start-dev-single.ps1
```

**Features:**
- ✅ All output in one terminal
- ✅ Color-coded output (Backend: Magenta, Frontend: Blue)
- ✅ Ctrl+C stops both servers cleanly

### 4. `stop-dev.ps1` (Stop All Servers)
Stops all running development servers automatically.

**Usage:**
```powershell
.\stop-dev.ps1
```

**Features:**
- ✅ Finds and stops backend server (port 8000)
- ✅ Finds and stops frontend server (port 5173/5174)
- ✅ Cleans up any orphaned processes
- ✅ Safe to run even if servers aren't running

## Quick Start

### First Time Setup

1. **Run the script:**
   ```powershell
   .\start-dev.ps1
   ```

2. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Stopping Servers

**Option 1: Use the stop script (Easiest)**
```powershell
.\stop-dev.ps1
```
This will automatically find and stop all running development servers.

**Option 2: Manual stop**

**For separate windows (start-dev.ps1 / start-dev.bat):**
- Close each terminal window, or
- Press Ctrl+C in each window

**For single window (start-dev-single.ps1):**
- Press Ctrl+C once to stop both servers

## Troubleshooting

### "Execution of scripts is disabled on this system"

If you get this error when running PowerShell scripts:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Already in Use

If you see "port already in use" errors:

**Frontend (port 5173):**
```powershell
# Find and kill the process
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process
```

**Backend (port 8000):**
```powershell
# Find and kill the process
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process
```

### Missing Dependencies

The scripts will automatically install dependencies, but if you want to do it manually:

**Frontend:**
```bash
cd frontend
pnpm install
```

**Backend:**
```bash
cd backend
poetry install
```

## Manual Start (Without Scripts)

If you prefer to start servers manually:

**Terminal 1 - Backend:**
```bash
cd backend
poetry run uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
pnpm dev
```

## Environment Variables

The scripts will create `.env` files from `.env.example` if they don't exist. Make sure to update them with your actual credentials:

- `frontend/.env` - Frontend configuration (API URLs, Firebase)
- `backend/.env` - Backend configuration (Firebase, Suno API, etc.)

## Tips

- Use `start-dev.ps1` for the best experience (separate windows)
- Use `start-dev-single.ps1` if you prefer all logs in one place
- Use `start-dev.bat` if you're more comfortable with Command Prompt
- The scripts check for prerequisites and will warn you if something is missing
