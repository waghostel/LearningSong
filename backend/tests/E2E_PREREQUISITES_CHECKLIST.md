# E2E Testing Prerequisites Checklist

## Overview

This checklist ensures all prerequisites are met before executing E2E tests for the LearningSong application.

## Software Requirements

### ✅ Chrome/Chromium Browser

**Required Version:** Latest stable version recommended

**Check Installation:**
```bash
# Windows
chrome --version

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version

# Linux
google-chrome --version
```

**Install if Missing:**
- Windows: Download from https://www.google.com/chrome/
- macOS: `brew install --cask google-chrome`
- Linux: `sudo apt install google-chrome-stable`

---

### ✅ Python 3.11+

**Required Version:** 3.11 or higher

**Check Installation:**
```bash
python --version
# or
python3 --version
```

**Install if Missing:**
- Windows: Download from https://www.python.org/downloads/
- macOS: `brew install python@3.11`
- Linux: `sudo apt install python3.11`

---

### ✅ Poetry (Python Package Manager)

**Check Installation:**
```bash
poetry --version
```

**Install if Missing:**
```bash
# Windows (PowerShell)
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -

# macOS/Linux
curl -sSL https://install.python-poetry.org | python3 -
```

---

### ✅ Node.js 18+

**Required Version:** 18 or higher

**Check Installation:**
```bash
node --version
```

**Install if Missing:**
- Windows: Download from https://nodejs.org/
- macOS: `brew install node@18`
- Linux: `sudo apt install nodejs npm`

---

### ✅ pnpm (Node Package Manager)

**Check Installation:**
```bash
pnpm --version
```

**Install if Missing:**
```bash
npm install -g pnpm
```

---

### ✅ Kiro IDE

**Required:** Latest version with MCP support

**Check Installation:**
- Kiro IDE should be running
- MCP panel should be accessible

**Install if Missing:**
- Download from Kiro website
- Follow installation instructions

---

## Project Setup

### ✅ Frontend Dependencies

**Check:**
```bash
cd frontend
ls node_modules  # Should exist
```

**Install if Missing:**
```bash
cd frontend
pnpm install
```

---

### ✅ Backend Dependencies

**Check:**
```bash
cd backend
poetry show  # Should list installed packages
```

**Install if Missing:**
```bash
cd backend
poetry install
```

---

## Service Configuration

### ✅ Chrome DevTools MCP

**Check Configuration:**

1. Open `.kiro/settings/mcp.json`
2. Verify `chrome-devtools` server is configured:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--browserUrl=http://127.0.0.1:9222"
      ],
      "disabled": false,
      "autoApprove": [
        "take_screenshot",
        "list_network_requests",
        "navigate_page",
        "take_snapshot",
        "fill",
        "click",
        "wait_for"
      ]
    }
  }
}
```

**Fix if Missing:**

1. Create `.kiro/settings/` directory if it doesn't exist
2. Create or update `mcp.json` with the configuration above
3. Restart Kiro IDE

---

### ✅ Chrome Remote Debugging

**Check:**

```bash
curl http://localhost:9222/json
```

**Expected:** JSON response with browser tabs

**Fix if Not Running:**

```bash
# Windows
taskkill /F /IM chrome.exe
chrome.exe --remote-debugging-port=9222 --user-data-dir=C:\temp\chrome-debug

# macOS
killall "Google Chrome"
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug &

# Linux
killall chrome
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
```

---

### ✅ Frontend Development Server

**Check:**

```bash
curl http://localhost:5173
```

**Expected:** HTML response from Vite dev server

**Fix if Not Running:**

```bash
cd frontend
pnpm dev
```

**Verify in Browser:**
- Open http://localhost:5173
- Page should load without errors

---

## Directory Structure

### ✅ Report Directory

**Check:**
```bash
ls -la report/e2e-chrome-devtools-testing/
```

**Create if Missing:**

```bash
mkdir -p report/e2e-chrome-devtools-testing/page-a
mkdir -p report/e2e-chrome-devtools-testing/page-b
mkdir -p report/e2e-chrome-devtools-testing/page-c
mkdir -p report/e2e-chrome-devtools-testing/responsive
```

---

### ✅ Test Files

**Check:**
```bash
ls backend/tests/test_e2e*.py
```

**Expected Files:**
- `test_e2e_page_a.py`
- `test_e2e_page_b.py`
- `test_e2e_page_c.py`
- `test_e2e_websocket.py`
- `test_e2e_responsive.py`
- `test_e2e_error_handling.py`
- `test_e2e_user_journey.py`

---

### ✅ Helper Modules

**Check:**
```bash
ls backend/tests/e2e_*.py
```

**Expected Files:**
- `e2e_helpers.py`
- `e2e_mock_data.py`
- `e2e_network_mock.py`
- `e2e_websocket_mock.py`
- `e2e_network_monitor.py`
- `e2e_console_monitor.py`
- `e2e_test_report.py`

---

## Port Availability

### ✅ Port 9222 (Chrome Remote Debugging)

**Check:**
```bash
# Windows
netstat -ano | findstr :9222

# macOS/Linux
lsof -i :9222
```

**Expected:** Only Chrome process using this port

**Fix if Conflict:**
```bash
# Kill conflicting process
# Windows
taskkill /F /PID <PID>

# macOS/Linux
kill -9 <PID>
```

---

### ✅ Port 5173 (Frontend Dev Server)

**Check:**
```bash
# Windows
netstat -ano | findstr :5173

# macOS/Linux
lsof -i :5173
```

**Expected:** Only Vite dev server using this port

**Fix if Conflict:**
```bash
# Kill conflicting process or use alternative port
cd frontend
pnpm dev --port 5174
```

---

## Environment Variables

### ✅ Frontend Environment

**Check:**
```bash
cat frontend/.env
```

**Required Variables:**
```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Note:** For E2E tests with mocked APIs, these can be dummy values since backend is not required.

---

### ✅ Backend Environment (Optional)

**Note:** Backend is NOT required for E2E tests since all APIs are mocked.

If you want to run tests against real backend:

```bash
cat backend/.env
```

**Required Variables:**
```env
FIREBASE_CREDENTIALS_PATH=path/to/credentials.json
GOOGLE_SEARCH_API_KEY=your_api_key
GOOGLE_SEARCH_ENGINE_ID=your_engine_id
SUNO_API_KEY=your_suno_key
```

---

## Permissions

### ✅ File System Permissions

**Check Write Access:**
```bash
# Test write to report directory
touch report/e2e-chrome-devtools-testing/test.txt
rm report/e2e-chrome-devtools-testing/test.txt
```

**Fix if Permission Denied:**
```bash
# macOS/Linux
chmod -R 755 report

# Windows
icacls report /grant Users:F
```

---

### ✅ Chrome User Data Directory

**Check:**
```bash
# Windows
dir C:\temp\chrome-debug

# macOS/Linux
ls -la /tmp/chrome-debug
```

**Create if Missing:**
```bash
# Windows
mkdir C:\temp\chrome-debug

# macOS/Linux
mkdir -p /tmp/chrome-debug
```

---

## Network Connectivity

### ✅ Localhost Access

**Check:**
```bash
ping localhost
```

**Expected:** Successful ping responses

---

### ✅ NPM Registry Access (for MCP installation)

**Check:**
```bash
npm ping
```

**Expected:** "Ping success" message

---

## Pre-Flight Test

Run this quick test to verify everything is working:

```bash
# 1. Start Chrome with remote debugging
chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &

# 2. Verify Chrome is accessible
curl http://localhost:9222/json

# 3. Start frontend
cd frontend
pnpm dev &

# 4. Verify frontend is accessible
curl http://localhost:5173

# 5. Run a simple test
cd ../backend
poetry run pytest tests/test_browser_connection.py -v
```

**Expected:** All steps complete successfully

---

## Troubleshooting Common Issues

### Chrome won't start with remote debugging

**Solution:**
1. Close all Chrome instances completely
2. Check if port 9222 is available
3. Try with a fresh user data directory

### Frontend won't start

**Solution:**
1. Delete `node_modules` and reinstall: `rm -rf node_modules && pnpm install`
2. Clear pnpm cache: `pnpm store prune`
3. Check for port conflicts on 5173

### MCP server not connecting

**Solution:**
1. Verify MCP configuration in `.kiro/settings/mcp.json`
2. Restart Kiro IDE
3. Check MCP server status in Kiro's MCP panel
4. Manually test MCP: `npx chrome-devtools-mcp@latest --help`

---

## Final Checklist

Before running E2E tests, verify:

- [ ] Chrome is running with remote debugging on port 9222
- [ ] Frontend dev server is running on port 5173
- [ ] Chrome DevTools MCP is configured and enabled
- [ ] Report directories exist
- [ ] All test files are present
- [ ] No port conflicts
- [ ] File system permissions are correct
- [ ] Pre-flight test passes

---

## Ready to Test!

Once all items are checked, you're ready to run E2E tests:

```bash
# Run all E2E tests
cd backend
poetry run pytest tests/test_e2e*.py -v

# Or use Kiro Agent
"Run all E2E tests for the LearningSong application"
```

---

**Last Updated:** 2025-11-29
