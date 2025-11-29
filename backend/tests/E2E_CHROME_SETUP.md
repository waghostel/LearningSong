# Chrome DevTools E2E Testing Setup Guide

## Prerequisites

Before running E2E tests with Chrome DevTools MCP, ensure you have the following:

1. **Chrome or Chromium browser** installed
2. **Chrome DevTools MCP** configured in `.kiro/settings/mcp.json`
3. **Frontend development server** running on port 5173

## Browser Setup Instructions

### Step 1: Start Chrome with Remote Debugging

Chrome must be started with remote debugging enabled on port 9222 for the Chrome DevTools MCP to connect.

#### Windows

```powershell
# Close all Chrome instances first
taskkill /F /IM chrome.exe

# Start Chrome with remote debugging
Start-Process "chrome.exe" -ArgumentList "--remote-debugging-port=9222", "--user-data-dir=C:\temp\chrome-debug"
```

Or use the shortcut:
```powershell
chrome.exe --remote-debugging-port=9222 --user-data-dir=C:\temp\chrome-debug
```

#### macOS

```bash
# Close all Chrome instances first
killall "Google Chrome"

# Start Chrome with remote debugging
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
```

#### Linux

```bash
# Close all Chrome instances first
killall chrome

# Start Chrome with remote debugging
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
```

### Step 2: Verify Chrome is Running with Remote Debugging

Open a browser and navigate to:
```
http://localhost:9222/json
```

You should see a JSON response listing the open browser tabs. If you see this, Chrome is correctly configured for remote debugging.

### Step 3: Start the Frontend Development Server

```bash
cd frontend
pnpm dev
```

The frontend should be accessible at `http://localhost:5173`

### Step 4: Verify Chrome DevTools MCP Configuration

Check that Chrome DevTools MCP is enabled in `.kiro/settings/mcp.json`:

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

## Running E2E Tests

Once the setup is complete, you can run E2E tests using the Kiro Agent with Chrome DevTools MCP tools.

### Test Execution Checklist

- [ ] Chrome is running with remote debugging on port 9222
- [ ] Frontend dev server is running on port 5173
- [ ] Chrome DevTools MCP is enabled in Kiro settings
- [ ] Report directory exists at `./report/e2e-chrome-devtools-testing/`

### Common Issues and Troubleshooting

#### Issue: "Cannot connect to browser"

**Solution**: Verify Chrome is running with remote debugging:
```bash
curl http://localhost:9222/json
```

If this fails, restart Chrome with the correct flags.

#### Issue: "Frontend not accessible"

**Solution**: Verify the frontend dev server is running:
```bash
curl http://localhost:5173
```

If this fails, start the dev server with `pnpm dev` in the frontend directory.

#### Issue: "Chrome DevTools MCP not found"

**Solution**: The MCP server will be automatically installed when first used. If issues persist, manually install:
```bash
npx chrome-devtools-mcp@latest --help
```

#### Issue: "Port 9222 already in use"

**Solution**: Another Chrome instance may be using the port. Close all Chrome instances and try again:
```powershell
# Windows
taskkill /F /IM chrome.exe

# macOS/Linux
killall chrome
```

## Test Report Location

Test reports and screenshots are saved to:
```
./report/e2e-chrome-devtools-testing/
├── page-a/          # Page A (Text Input) screenshots
├── page-b/          # Page B (Lyrics Editing) screenshots
├── page-c/          # Page C (Song Playback) screenshots
├── responsive/      # Responsive design screenshots
└── test-report-[timestamp].md  # Comprehensive test report
```

## Notes

- **User Data Directory**: The `--user-data-dir` flag creates a separate Chrome profile for testing, preventing interference with your regular browsing session.
- **Backend Not Required**: E2E tests use mocked API responses, so the backend server does not need to be running.
- **Browser State**: Tests assume a clean browser state. Clear cookies/storage if tests behave unexpectedly.
- **Multiple Tabs**: You can have multiple tabs open in the debugging Chrome instance. The tests will create new tabs as needed.

## Next Steps

After completing the setup, refer to the test execution documentation for running specific test scenarios.
