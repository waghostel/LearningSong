# E2E Test Execution Guide

## Overview

This guide provides complete instructions for executing end-to-end tests for the LearningSong application using Chrome DevTools MCP. The tests verify all three pages (Text Input, Lyrics Editing, Song Playback) with mocked API responses.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup Instructions](#setup-instructions)
3. [Test Execution](#test-execution)
4. [Test Scenarios](#test-scenarios)
5. [Mock Data Configuration](#mock-data-configuration)
6. [Troubleshooting](#troubleshooting)
7. [Test Reports](#test-reports)

## Prerequisites

### Required Software

- **Chrome or Chromium browser** (latest version recommended)
- **Python 3.11+** with Poetry
- **Node.js 18+** with pnpm
- **Kiro IDE** with Chrome DevTools MCP configured

### Required Services

- **Frontend development server** (Vite on port 5173)
- **Chrome DevTools MCP** enabled in Kiro settings

### NOT Required

- Backend server (all APIs are mocked)
- Firebase services (authentication is mocked)
- External API services (Suno, Google Search are mocked)

## Setup Instructions

### Step 1: Start Chrome with Remote Debugging

Chrome must run with remote debugging enabled for MCP to connect.

#### Windows

```powershell
# Close all Chrome instances
taskkill /F /IM chrome.exe

# Start Chrome with remote debugging
chrome.exe --remote-debugging-port=9222 --user-data-dir=C:\temp\chrome-debug
```

#### macOS

```bash
# Close all Chrome instances
killall "Google Chrome"

# Start Chrome with remote debugging
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug &
```

#### Linux

```bash
# Close all Chrome instances
killall chrome

# Start Chrome with remote debugging
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
```

### Step 2: Verify Chrome Remote Debugging

Open a browser and navigate to:
```
http://localhost:9222/json
```

You should see JSON output listing browser tabs. If this works, Chrome is correctly configured.

### Step 3: Start Frontend Development Server

```bash
cd frontend
pnpm install  # First time only
pnpm dev
```

Verify the frontend is accessible at `http://localhost:5173`

### Step 4: Verify Chrome DevTools MCP Configuration


Check `.kiro/settings/mcp.json` contains:

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

### Step 5: Create Report Directory

```bash
mkdir -p report/e2e-chrome-devtools-testing/page-a
mkdir -p report/e2e-chrome-devtools-testing/page-b
mkdir -p report/e2e-chrome-devtools-testing/page-c
mkdir -p report/e2e-chrome-devtools-testing/responsive
```

## Test Execution

### Running Tests via Kiro Agent

The E2E tests are designed to be executed interactively through the Kiro Agent using Chrome DevTools MCP tools.

#### Execute All Tests

Ask Kiro to run the complete test suite:

```
Run all E2E tests for the LearningSong application
```

#### Execute Specific Page Tests

Test individual pages:

```
Run E2E tests for Page A (Text Input)
Run E2E tests for Page B (Lyrics Editing)
Run E2E tests for Page C (Song Playback)
```

#### Execute Specific Scenarios


Test specific functionality:

```
Test Page A validation with 10,000+ word input
Test Page B lyrics editing with character count warnings
Test WebSocket connectivity and reconnection
Test responsive design at mobile viewport
Test error handling for rate limit errors
```

### Running Pytest Tests

Some E2E tests can be executed via pytest:

```bash
cd backend

# Run all E2E tests
poetry run pytest tests/test_e2e*.py -v

# Run specific test file
poetry run pytest tests/test_e2e_page_a.py -v

# Run with detailed output
poetry run pytest tests/test_e2e_page_a.py -v -s

# Run specific test function
poetry run pytest tests/test_e2e_page_a.py::test_page_a_initial_load -v
```

### Test Execution Checklist

Before running tests, verify:

- [ ] Chrome is running with remote debugging on port 9222
- [ ] Frontend dev server is running on port 5173
- [ ] Chrome DevTools MCP is enabled in Kiro settings
- [ ] Report directory exists
- [ ] No other processes are using port 9222

## Test Scenarios

### Page A: Text Input Tests

**Test Files:**
- `test_e2e_page_a.py` - Automated pytest tests
- `PAGE_A_TEST_GUIDE.md` - Manual test procedures

**Scenarios:**
1. Initial page load and UI element visibility
2. Text input with various word counts (property test)
3. Submit button enable/disable based on validity
4. 10,000+ word validation error (edge case)
5. Successful submission with mocked API response
6. API error handling (rate limit, server error, timeout)


**Example Execution:**

```python
# Via pytest
poetry run pytest tests/test_e2e_page_a.py -v

# Via Kiro Agent
"Test Page A with valid text input and verify navigation to Page B"
```

### Page B: Lyrics Editing Tests

**Test Files:**
- `test_e2e_page_b.py` - Automated pytest tests
- `PAGE_B_TEST_GUIDE.md` - Manual test procedures

**Scenarios:**
1. Page load with mocked lyrics data
2. Lyrics editing and real-time character count
3. 3,100+ character error state (edge case)
4. 2,800-3,100 character warning state (edge case)
5. Music style selection for all styles
6. Song generation with mocked responses
7. WebSocket progress updates during generation
8. Navigation to Page C on completion

**Example Execution:**

```python
# Via pytest
poetry run pytest tests/test_e2e_page_b.py -v

# Via Kiro Agent
"Test Page B lyrics editing with character count validation"
```

### Page C: Song Playback Tests

**Test Files:**
- `test_e2e_page_c.py` - Automated pytest tests

**Scenarios:**
1. Page load with mocked song data
2. Audio player controls (play, pause)
3. Volume adjustment across different levels
4. Download button functionality
5. Song metadata display (title, style, duration, timestamp)

**Example Execution:**

```python
# Via pytest
poetry run pytest tests/test_e2e_page_c.py -v

# Via Kiro Agent
"Test Page C audio player controls and metadata display"
```


### WebSocket Connectivity Tests

**Test Files:**
- `test_e2e_websocket.py` - Automated pytest tests
- `WEBSOCKET_TEST_GUIDE.md` - Manual test procedures

**Scenarios:**
1. WebSocket connection establishment
2. Real-time status updates during generation
3. Connection failure and offline indicator
4. Reconnection after failure
5. Automatic navigation on completion

**Example Execution:**

```python
# Via pytest
poetry run pytest tests/test_e2e_websocket.py -v

# Via Kiro Agent
"Test WebSocket connectivity and real-time status updates"
```

### Responsive Design Tests

**Test Files:**
- `test_e2e_responsive.py` - Automated pytest tests
- `RESPONSIVE_TEST_SUMMARY.md` - Test summary

**Scenarios:**
1. Mobile viewport (375px) layout
2. Tablet viewport (768px) layout
3. Desktop viewport (1920px) layout
4. Viewport size transitions
5. Touch target sizes on mobile

**Example Execution:**

```python
# Via pytest
poetry run pytest tests/test_e2e_responsive.py -v

# Via Kiro Agent
"Test responsive design at mobile, tablet, and desktop viewports"
```

### Error Handling Tests

**Test Files:**
- `test_e2e_error_handling.py` - Automated pytest tests
- `ERROR_HANDLING_TEST_GUIDE.md` - Manual test procedures

**Scenarios:**
1. 500 server error response
2. 429 rate limit error with retry information
3. Network timeout handling
4. Validation errors with field-specific messages
5. Error recovery and state clearing


**Example Execution:**

```python
# Via pytest
poetry run pytest tests/test_e2e_error_handling.py -v

# Via Kiro Agent
"Test error handling for rate limit and server errors"
```

### Complete User Journey Test

**Test Files:**
- `test_e2e_user_journey.py` - Automated pytest tests
- `USER_JOURNEY_TEST_GUIDE.md` - Manual test procedures

**Scenarios:**
1. Full flow from Page A through Page B to Page C
2. Data preservation across page transitions
3. State management during navigation
4. All expected API calls are made

**Example Execution:**

```python
# Via pytest
poetry run pytest tests/test_e2e_user_journey.py -v

# Via Kiro Agent
"Test complete user journey from text input to song playback"
```

## Mock Data Configuration

### Overview

Mock data is defined in `e2e_mock_data.py` and provides consistent, repeatable test scenarios without requiring backend services.

### Mock Data Structure

```python
# Lyrics generation response
MOCK_LYRICS_SUCCESS = {
    "lyrics": "[Verse 1]\nLearning is a journey...",
    "content_hash": "abc123def456",
    "word_count": 150,
    "search_used": False
}

# Song generation response
MOCK_SONG_QUEUED = {
    "task_id": "task_123",
    "status": "queued",
    "message": "Song generation queued"
}

# WebSocket updates
MOCK_WEBSOCKET_UPDATES = [
    {"task_id": "task_123", "status": "queued", "progress": 0},
    {"task_id": "task_123", "status": "processing", "progress": 50},
    {"task_id": "task_123", "status": "completed", "progress": 100}
]
```


### Customizing Mock Data

To customize mock responses for specific test scenarios:

1. **Edit Mock Data File:**

```bash
# Open the mock data file
code backend/tests/e2e_mock_data.py
```

2. **Add New Mock Scenarios:**

```python
# Add custom lyrics response
MOCK_LYRICS_CUSTOM = {
    "lyrics": "[Verse 1]\nYour custom lyrics here...",
    "content_hash": "custom_hash",
    "word_count": 200,
    "search_used": True
}

# Add custom error response
MOCK_CUSTOM_ERROR = {
    "status": 400,
    "detail": "Custom error message for testing"
}
```

3. **Use Custom Mocks in Tests:**

```python
from e2e_mock_data import MOCK_LYRICS_CUSTOM

# In your test function
mock_response = MOCK_LYRICS_CUSTOM
```

### Mock Data Categories

**Success Scenarios:**
- `MOCK_LYRICS_SUCCESS` - Standard lyrics generation
- `MOCK_LYRICS_WITH_SEARCH` - Lyrics with search enrichment
- `MOCK_SONG_COMPLETED` - Completed song generation
- `MOCK_SONG_DATA` - Song playback data

**Error Scenarios:**
- `MOCK_RATE_LIMIT_ERROR` - 429 rate limit exceeded
- `MOCK_SERVER_ERROR` - 500 internal server error
- `MOCK_VALIDATION_ERROR` - 400 validation failure
- `MOCK_TIMEOUT_ERROR` - Request timeout

**WebSocket Scenarios:**
- `MOCK_WS_QUEUED` - Song queued for generation
- `MOCK_WS_PROCESSING` - Song generation in progress
- `MOCK_WS_COMPLETED` - Song generation completed
- `MOCK_WS_FAILED` - Song generation failed
- `MOCK_WS_CONNECTION_FAILED` - WebSocket connection failure

### Configuring Mock Delays

To simulate realistic API response times:

```python
# In e2e_network_mock.py
MOCK_DELAYS = {
    "/api/lyrics/generate": 2.0,  # 2 second delay
    "/api/songs/generate": 1.0,   # 1 second delay
}
```


## Troubleshooting

### Common Issues and Solutions

#### Issue: "Cannot connect to browser"

**Symptoms:**
- Error message: "Failed to connect to Chrome DevTools"
- Tests cannot start

**Solutions:**

1. Verify Chrome is running with remote debugging:
```bash
curl http://localhost:9222/json
```

2. If no response, restart Chrome with correct flags:
```bash
# Windows
taskkill /F /IM chrome.exe
chrome.exe --remote-debugging-port=9222 --user-data-dir=C:\temp\chrome-debug

# macOS/Linux
killall chrome
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
```

3. Check if another process is using port 9222:
```bash
# Windows
netstat -ano | findstr :9222

# macOS/Linux
lsof -i :9222
```

#### Issue: "Frontend not accessible"

**Symptoms:**
- Error: "Cannot navigate to http://localhost:5173"
- Page fails to load

**Solutions:**

1. Verify frontend dev server is running:
```bash
curl http://localhost:5173
```

2. If not running, start the dev server:
```bash
cd frontend
pnpm dev
```

3. Check for port conflicts:
```bash
# Windows
netstat -ano | findstr :5173

# macOS/Linux
lsof -i :5173
```

4. Try alternative port:
```bash
cd frontend
pnpm dev --port 5174
```

#### Issue: "Chrome DevTools MCP not found"

**Symptoms:**
- Error: "MCP server 'chrome-devtools' not available"
- Tools not accessible in Kiro

**Solutions:**

1. Check MCP configuration in `.kiro/settings/mcp.json`

2. Manually install the MCP server:
```bash
npx chrome-devtools-mcp@latest --help
```

3. Restart Kiro IDE to reload MCP servers

4. Check MCP server status in Kiro's MCP panel


#### Issue: "Element not found"

**Symptoms:**
- Error: "Cannot find element with selector '#submit-button'"
- Tests fail to interact with UI elements

**Solutions:**

1. Verify page has fully loaded:
```python
# Add wait before interaction
await wait_for_element("#submit-button", timeout=10)
```

2. Check if element selector has changed:
- Inspect element in browser DevTools
- Update selector in test code

3. Increase timeout for slow-loading elements:
```python
await wait_for_element("#submit-button", timeout=30)
```

4. Check if element is hidden or disabled:
```python
# Check element state
element_visible = await check_element_visible("#submit-button")
```

#### Issue: "Network interception not working"

**Symptoms:**
- Real API calls are being made instead of mocked responses
- Tests fail due to missing backend

**Solutions:**

1. Verify network mock is properly initialized:
```python
from e2e_network_mock import setup_network_mocks
await setup_network_mocks()
```

2. Check mock patterns match actual requests:
```python
# In e2e_network_mock.py
MOCK_PATTERNS = {
    "*/api/lyrics/generate": MOCK_LYRICS_SUCCESS,
    "*/api/songs/generate": MOCK_SONG_QUEUED,
}
```

3. Use JavaScript injection as fallback:
```python
# Inject mock API client
await inject_mock_api_client()
```

4. Check browser console for network errors:
```python
console_logs = await get_console_logs()
print(console_logs)
```

#### Issue: "Screenshots not saving"

**Symptoms:**
- Screenshots are not created in report directory
- Error: "Permission denied" or "Directory not found"

**Solutions:**

1. Verify report directory exists:
```bash
mkdir -p report/e2e-chrome-devtools-testing/page-a
mkdir -p report/e2e-chrome-devtools-testing/page-b
mkdir -p report/e2e-chrome-devtools-testing/page-c
```

2. Check write permissions:
```bash
# Windows
icacls report /grant Users:F

# macOS/Linux
chmod -R 755 report
```

3. Use absolute path for screenshots:
```python
import os
screenshot_path = os.path.abspath("report/e2e-chrome-devtools-testing/page-a/test.png")
```


#### Issue: "WebSocket mocking not working"

**Symptoms:**
- WebSocket connections fail
- Real-time updates don't work in tests

**Solutions:**

1. Use JavaScript injection for WebSocket mocking:
```python
from e2e_websocket_mock import inject_websocket_mock
await inject_websocket_mock()
```

2. Verify WebSocket mock patterns:
```python
# In e2e_websocket_mock.py
WS_MOCK_MESSAGES = [
    {"type": "status", "data": {"status": "queued"}},
    {"type": "status", "data": {"status": "processing"}},
]
```

3. Check WebSocket URL in frontend code matches mock:
```javascript
// Should match mock configuration
const ws = new WebSocket('ws://localhost:8000/ws/song-status')
```

#### Issue: "Tests are flaky"

**Symptoms:**
- Tests pass sometimes, fail other times
- Inconsistent results

**Solutions:**

1. Add explicit waits instead of fixed delays:
```python
# Bad: Fixed delay
await asyncio.sleep(2)

# Good: Wait for condition
await wait_for_element("#result", timeout=10)
```

2. Increase timeouts for slow operations:
```python
# Increase timeout for API calls
await wait_for_network_idle(timeout=30)
```

3. Ensure clean state between tests:
```python
# Clear browser state before each test
await clear_local_storage()
await clear_cookies()
```

4. Add retry logic for transient failures:
```python
# Retry up to 3 times
for attempt in range(3):
    try:
        await run_test()
        break
    except Exception as e:
        if attempt == 2:
            raise
        await asyncio.sleep(1)
```

#### Issue: "Console errors during tests"

**Symptoms:**
- Browser console shows errors
- Tests fail due to JavaScript errors

**Solutions:**

1. Check console logs:
```python
console_logs = await get_console_logs()
errors = [log for log in console_logs if log['level'] == 'error']
print(errors)
```

2. Common causes:
- Missing mock data
- Incorrect API response format
- React rendering errors
- Network request failures

3. Fix by updating mocks to match expected format:
```python
# Ensure mock data matches TypeScript interfaces
MOCK_LYRICS_SUCCESS = {
    "lyrics": "...",
    "content_hash": "...",
    "word_count": 150,
    "search_used": False  # All required fields present
}
```


### Performance Issues

#### Issue: "Tests are too slow"

**Solutions:**

1. Run tests in parallel (if using pytest):
```bash
poetry run pytest tests/test_e2e*.py -n 4
```

2. Reduce unnecessary waits:
```python
# Use shorter timeouts when possible
await wait_for_element("#button", timeout=5)  # Instead of 30
```

3. Skip screenshot capture for faster execution:
```python
# Add flag to skip screenshots
SKIP_SCREENSHOTS = True
```

4. Use headless Chrome for faster rendering:
```bash
chrome --remote-debugging-port=9222 --headless --user-data-dir=/tmp/chrome-debug
```

### Debugging Tips

1. **Enable verbose logging:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

2. **Pause test execution to inspect state:**
```python
# Add breakpoint
import pdb; pdb.set_trace()

# Or pause for manual inspection
input("Press Enter to continue...")
```

3. **Capture page HTML for debugging:**
```python
html = await get_page_html()
with open("debug.html", "w") as f:
    f.write(html)
```

4. **Take screenshot at failure point:**
```python
try:
    await run_test_step()
except Exception as e:
    await take_screenshot("error-state.png")
    raise
```

5. **Check network activity:**
```python
requests = await list_network_requests()
for req in requests:
    print(f"{req['method']} {req['url']} - {req['status']}")
```

## Test Reports

### Report Structure

Test reports are generated in Markdown format with embedded screenshots and logs.

**Report Location:**
```
./report/e2e-chrome-devtools-testing/
├── page-a/
│   ├── 01-initial-load.png
│   ├── 02-text-input-filled.png
│   └── 03-validation-error.png
├── page-b/
│   ├── 01-lyrics-loaded.png
│   └── 02-progress-tracker.png
├── page-c/
│   ├── 01-song-loaded.png
│   └── 02-playing-state.png
├── responsive/
│   ├── mobile-375px.png
│   ├── tablet-768px.png
│   └── desktop-1920px.png
└── test-report-[timestamp].md
```


### Generating Test Reports

**Automated Report Generation:**

```python
# Via pytest
poetry run pytest tests/test_e2e_report.py

# Via Kiro Agent
"Generate comprehensive E2E test report"
```

**Manual Report Generation:**

```python
from e2e_test_report import generate_test_report

# Generate report with test results
report = generate_test_report(
    test_results=results,
    screenshots=screenshot_paths,
    network_logs=network_activity,
    console_logs=console_messages
)

# Save report
with open("report/e2e-chrome-devtools-testing/test-report.md", "w") as f:
    f.write(report)
```

### Report Contents

A complete test report includes:

1. **Executive Summary**
   - Total tests executed
   - Pass/fail counts
   - Overall test duration
   - Test environment details

2. **Test Results by Page**
   - Page A (Text Input) results
   - Page B (Lyrics Editing) results
   - Page C (Song Playback) results
   - Responsive design results
   - Error handling results

3. **Visual Evidence**
   - Screenshots for each test scenario
   - Before/after comparisons
   - Error state captures

4. **Network Activity**
   - API requests made
   - Response times
   - Mock data used
   - Failed requests

5. **Console Logs**
   - JavaScript errors
   - Warnings
   - Debug messages
   - Performance metrics

6. **Recommendations**
   - Issues found
   - Suggested improvements
   - Known limitations

### Viewing Test Reports

Open the generated report in any Markdown viewer:

```bash
# View in VS Code
code report/e2e-chrome-devtools-testing/test-report-*.md

# View in browser (with Markdown extension)
open report/e2e-chrome-devtools-testing/test-report-*.md
```

## Additional Resources

### Documentation Files

- `E2E_CHROME_SETUP.md` - Chrome setup instructions
- `E2E_TEST_GUIDE.md` - Manual testing procedures
- `PAGE_A_TEST_GUIDE.md` - Page A specific tests
- `PAGE_B_TEST_GUIDE.md` - Page B specific tests
- `WEBSOCKET_TEST_GUIDE.md` - WebSocket testing
- `ERROR_HANDLING_TEST_GUIDE.md` - Error scenario tests
- `USER_JOURNEY_TEST_GUIDE.md` - Complete user journey
- `NETWORK_MOCK_GUIDE.md` - Network mocking details
- `WEBSOCKET_MOCK_GUIDE.md` - WebSocket mocking details
- `SCREENSHOT_SYSTEM_GUIDE.md` - Screenshot capture system
- `TEST_REPORT_GUIDE.md` - Report generation details


### Helper Modules

- `e2e_helpers.py` - Common helper functions
- `e2e_mock_data.py` - Mock data definitions
- `e2e_network_mock.py` - Network interception
- `e2e_websocket_mock.py` - WebSocket mocking
- `e2e_network_monitor.py` - Network activity monitoring
- `e2e_console_monitor.py` - Console log monitoring
- `e2e_test_report.py` - Report generation

### Test Files

- `test_e2e_page_a.py` - Page A automated tests
- `test_e2e_page_b.py` - Page B automated tests
- `test_e2e_page_c.py` - Page C automated tests
- `test_e2e_websocket.py` - WebSocket tests
- `test_e2e_responsive.py` - Responsive design tests
- `test_e2e_error_handling.py` - Error handling tests
- `test_e2e_user_journey.py` - Complete user journey tests

## Best Practices

### Test Design

1. **Keep tests independent** - Each test should run in isolation
2. **Use descriptive names** - Test names should clearly describe what they test
3. **Test one thing at a time** - Focus each test on a single behavior
4. **Use appropriate waits** - Wait for conditions, not fixed delays
5. **Clean up after tests** - Clear browser state between tests

### Mock Data

1. **Keep mocks realistic** - Mock data should match real API responses
2. **Cover edge cases** - Include mocks for error scenarios
3. **Document mock scenarios** - Explain what each mock represents
4. **Version mock data** - Update mocks when API contracts change

### Screenshots

1. **Capture at key states** - Take screenshots at important moments
2. **Use descriptive filenames** - Names should indicate what's shown
3. **Organize by scenario** - Group related screenshots together
4. **Include timestamps** - Add timestamps to screenshot filenames

### Reporting

1. **Generate reports automatically** - Include reports in test execution
2. **Include all relevant data** - Screenshots, logs, network activity
3. **Highlight failures** - Make failed tests easy to identify
4. **Provide context** - Explain what was being tested and why it failed

## Quick Reference

### Essential Commands

```bash
# Start Chrome with remote debugging
chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# Start frontend dev server
cd frontend && pnpm dev

# Run all E2E tests
cd backend && poetry run pytest tests/test_e2e*.py -v

# Run specific page tests
poetry run pytest tests/test_e2e_page_a.py -v

# Generate test report
poetry run pytest tests/test_e2e_report.py
```

### Essential URLs

- Chrome DevTools: `http://localhost:9222/json`
- Frontend: `http://localhost:5173`
- Test Reports: `./report/e2e-chrome-devtools-testing/`

### Essential Files

- Mock Data: `backend/tests/e2e_mock_data.py`
- Network Mocking: `backend/tests/e2e_network_mock.py`
- Helper Functions: `backend/tests/e2e_helpers.py`
- MCP Config: `.kiro/settings/mcp.json`

## Support

For issues or questions:

1. Check this guide's troubleshooting section
2. Review specific test guide documents
3. Check console logs and network activity
4. Consult the development team

---

**Last Updated:** 2025-11-29
**Version:** 1.0
