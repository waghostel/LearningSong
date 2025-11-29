# Page A (Text Input) E2E Test Guide

This guide explains how to execute the Page A end-to-end tests using Chrome DevTools MCP.

## Overview

The Page A test suite validates the Text Input page functionality including:
- Initial page load and UI visibility
- Text input with various valid lengths (property test)
- Submit button enable/disable based on input validity
- 10,000+ word validation error (edge case)
- Successful submission with mocked API response
- API error handling (rate limit, server error, timeout)

## Prerequisites

Before running the tests, ensure the following are set up:

### 1. Chrome with Remote Debugging

Start Chrome with remote debugging enabled:

```bash
# Windows
chrome.exe --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug"

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome-debug"

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome-debug"
```

Verify Chrome is running by visiting: http://localhost:9222/json

### 2. Frontend Development Server

Start the frontend development server:

```bash
cd frontend
pnpm dev
```

The server should be running at: http://localhost:5173

### 3. Chrome DevTools MCP Configuration

Ensure Chrome DevTools MCP is configured in `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-chrome-devtools"],
      "env": {
        "BROWSER_URL": "http://127.0.0.1:9222"
      }
    }
  }
}
```

## Running the Tests

### Run All Page A Tests

```bash
cd backend
poetry run pytest tests/test_e2e_page_a.py -v -s
```

### Run Specific Test Class

```bash
# Test initial page load
poetry run pytest tests/test_e2e_page_a.py::TestPageAInitialLoad -v -s

# Test text input validation
poetry run pytest tests/test_e2e_page_a.py::TestPageATextInput -v -s

# Test error handling
poetry run pytest tests/test_e2e_page_a.py::TestPageAErrorHandling -v -s
```

### Run Individual Test

```bash
poetry run pytest tests/test_e2e_page_a.py::TestPageAInitialLoad::test_page_a_initial_load -v -s
```

## Test Execution Workflow

Each test prints detailed Chrome DevTools MCP instructions. Follow these steps:

### 1. Connect to Browser

```
Call: mcp_chrome_devtools_list_pages
Call: mcp_chrome_devtools_select_page(pageIdx=0)
```

### 2. Navigate to Page A

```
Call: mcp_chrome_devtools_navigate_page(type='url', url='http://localhost:5173/')
```

### 3. Take Snapshot

```
Call: mcp_chrome_devtools_take_snapshot()
```

This shows you all interactive elements with their UIDs.

### 4. Interact with Elements

```
# Fill textarea
Call: mcp_chrome_devtools_fill(uid='<textarea-uid>', value='Your test content')

# Click button
Call: mcp_chrome_devtools_click(uid='<button-uid>')
```

### 5. Verify State

```
# Check element state
Call: mcp_chrome_devtools_evaluate_script(
  function=() => {
    const button = document.querySelector('button[type="submit"]');
    return { disabled: button.disabled };
  }
)
```

### 6. Capture Screenshot

```
Call: mcp_chrome_devtools_take_screenshot(
  filePath='report/e2e-chrome-devtools-testing/page-a/test-scenario.png'
)
```

## Test Scenarios

### 1. Initial Page Load (Requirement 1.1)

**Test**: `test_page_a_initial_load`

Verifies that Page A loads with all required UI elements:
- Textarea for content input
- Submit button
- Other UI components

**Expected Result**: All elements are present and visible.

### 2. Text Input Valid Lengths (Requirement 1.2)

**Test**: `test_text_input_valid_lengths`

Property test that verifies submit button is enabled for valid text lengths:
- Short text (50 words)
- Medium text (500 words)
- Long text (5,000 words)
- Maximum text (9,999 words)

**Expected Result**: Submit button is enabled for all valid lengths.

### 3. Submit Button Disabled When Empty (Requirement 1.2)

**Test**: `test_submit_button_disabled_when_empty`

Verifies that submit button is disabled when textarea is empty.

**Expected Result**: Submit button is disabled.

### 4. Validation Error - Text Too Long (Requirement 1.3)

**Test**: `test_validation_error_text_too_long`

Edge case test that verifies validation error for 10,001+ words.

**Expected Result**: 
- Validation error message is displayed
- Submit button is disabled
- Error message mentions "10,000" word limit

### 5. Successful Submission (Requirement 1.4)

**Test**: `test_successful_submission_navigates_to_page_b`

Tests complete flow with mocked API:
1. Inject network mocks
2. Fill valid content
3. Submit form
4. Verify navigation to Page B
5. Verify lyrics are displayed

**Expected Result**: 
- Navigation to Page B (/lyrics-editing)
- Generated lyrics are displayed

### 6. Rate Limit Error (Requirement 1.5)

**Test**: `test_rate_limit_error`

Tests rate limit error handling with mocked 429 response.

**Expected Result**: 
- Error message is displayed
- Message mentions rate limit and retry information

### 7. Server Error (Requirement 1.5)

**Test**: `test_server_error`

Tests server error handling with mocked 500 response.

**Expected Result**: 
- Error message is displayed
- Message suggests trying again later

### 8. Timeout Error (Requirement 1.5)

**Test**: `test_timeout_error`

Tests timeout error handling with mocked 504 response.

**Expected Result**: 
- Error message is displayed
- Message mentions timeout and suggests retry

## Network Mocking

Tests use JavaScript injection to mock API responses. The mock system intercepts:
- `fetch()` calls
- `XMLHttpRequest` calls

### Mock Data

Mock responses are defined in `tests/e2e_mock_data.py`:

```python
MOCK_LYRICS_SUCCESS = {
    "lyrics": "[Verse 1]\nLearning is a journey...",
    "content_hash": "abc123def456",
    "word_count": 150,
    "search_used": False
}

MOCK_ERROR_RATE_LIMIT = {
    "status": 429,
    "detail": "Rate limit exceeded. You can generate 3 songs per day.",
    "reset_time": "2025-11-29T00:00:00Z"
}
```

### Injecting Mocks

The test framework generates JavaScript code to inject mocks:

```javascript
window.fetch = function(url, options) {
  // Check if URL matches mock pattern
  // Return mock response if matched
  // Otherwise use original fetch
}
```

## Screenshots

All screenshots are saved to:
```
report/e2e-chrome-devtools-testing/page-a/
```

Screenshot naming convention:
```
<scenario>-<step>-<timestamp>.png
```

Examples:
- `initial-load-20251128-143000.png`
- `text-input-short-20251128-143100.png`
- `validation-error-too-long-20251128-143200.png`
- `error-rate-limit-20251128-143300.png`

## Troubleshooting

### Chrome Not Running

**Error**: "Cannot connect to Chrome on port 9222"

**Solution**: Start Chrome with remote debugging:
```bash
chrome --remote-debugging-port=9222
```

### Frontend Not Running

**Error**: "Cannot connect to frontend server at http://localhost:5173"

**Solution**: Start the frontend dev server:
```bash
cd frontend && pnpm dev
```

### Element Not Found

**Error**: Element with UID not found

**Solution**: 
1. Take a fresh snapshot: `mcp_chrome_devtools_take_snapshot()`
2. Find the correct UID from the snapshot
3. Use the updated UID in your commands

### Network Mocks Not Working

**Error**: Real API calls are being made instead of mocks

**Solution**:
1. Verify mock injection: 
   ```javascript
   () => { return window.__networkMockInjected === true; }
   ```
2. Re-inject mocks if needed
3. Ensure you're testing on the correct page

### Screenshots Not Saving

**Error**: Screenshot file not created

**Solution**:
1. Ensure report directory exists: `report/e2e-chrome-devtools-testing/page-a/`
2. Check file path is absolute or relative to workspace root
3. Verify write permissions

## Test Results

After running tests, check:

1. **Console Output**: Test results and instructions
2. **Screenshots**: Visual evidence in `report/e2e-chrome-devtools-testing/page-a/`
3. **Test Report**: Generated by helper functions (if enabled)

## Next Steps

After completing Page A tests:
1. Review screenshots to verify UI states
2. Check console logs for any errors
3. Proceed to Page B tests (Lyrics Editing)
4. Execute complete user journey test

## Requirements Coverage

| Requirement | Test Method | Status |
|-------------|-------------|--------|
| 1.1 - Initial page load | `test_page_a_initial_load` | ✓ |
| 1.2 - Valid text input | `test_text_input_valid_lengths` | ✓ |
| 1.2 - Submit button state | `test_submit_button_disabled_when_empty` | ✓ |
| 1.3 - Validation error | `test_validation_error_text_too_long` | ✓ |
| 1.4 - Successful submission | `test_successful_submission_navigates_to_page_b` | ✓ |
| 1.5 - Rate limit error | `test_rate_limit_error` | ✓ |
| 1.5 - Server error | `test_server_error` | ✓ |
| 1.5 - Timeout error | `test_timeout_error` | ✓ |

All requirements for Page A are covered by the test suite.
