# Error Handling Tests - Quick Reference

## Test File
`backend/tests/test_e2e_error_handling.py`

## Total Tests: 13

## Test Classes

### 1. TestServerErrorHandling (2 tests)
- ✓ `test_server_error_on_lyrics_generation` - Req 6.1
- ✓ `test_server_error_on_song_generation` - Req 6.1

### 2. TestRateLimitErrorHandling (2 tests)
- ✓ `test_rate_limit_error_on_lyrics_generation` - Req 6.2
- ✓ `test_rate_limit_error_on_song_generation` - Req 6.2

### 3. TestTimeoutErrorHandling (2 tests)
- ✓ `test_timeout_error_on_lyrics_generation` - Req 6.3
- ✓ `test_timeout_error_on_song_generation` - Req 6.3

### 4. TestValidationErrorHandling (4 tests)
- ✓ `test_validation_error_empty_lyrics` - Req 6.4
- ✓ `test_validation_error_lyrics_too_long` - Req 6.4
- ✓ `test_validation_error_lyrics_too_short` - Req 6.4
- ✓ `test_validation_error_no_style_selected` - Req 6.4

### 5. TestErrorRecovery (3 tests)
- ✓ `test_error_recovery_after_server_error` - Req 6.5
- ✓ `test_error_recovery_after_validation_error` - Req 6.5
- ✓ `test_error_recovery_after_rate_limit` - Req 6.5

## Requirements Coverage

| Requirement | Description | Tests |
|-------------|-------------|-------|
| 6.1 | Server error (500) response and error message display | 2 |
| 6.2 | Rate limit error (429) with retry information | 2 |
| 6.3 | Network timeout handling and error message | 2 |
| 6.4 | Validation errors with field-specific messages | 4 |
| 6.5 | Error recovery and state clearing | 3 |

## Quick Start

### View Test Summary
```python
from tests.test_e2e_error_handling import print_test_summary
print_test_summary()
```

### Run Individual Test
```python
from tests.test_e2e_error_handling import TestServerErrorHandling
test = TestServerErrorHandling()
test.test_server_error_on_lyrics_generation()
```

## Error Types Tested

1. **500 Server Error** - Internal server error
2. **429 Rate Limit** - Daily limit exceeded (3 songs/day)
3. **504 Timeout** - Request took too long
4. **400 Validation** - Empty lyrics, too long, too short, no style

## Screenshot Locations

```
report/e2e-chrome-devtools-testing/
├── page-a/
│   ├── server-error-500-*.png
│   ├── rate-limit-429-*.png
│   ├── timeout-504-*.png
│   └── error-recovery-*.png
└── page-b/
    ├── server-error-500-song-*.png
    ├── rate-limit-429-song-*.png
    ├── timeout-504-song-*.png
    ├── validation-*.png
    └── validation-recovery-*.png
```

## Key Test Patterns

### Error Display Pattern
1. Inject error mock
2. Trigger action (submit, generate)
3. Wait for error message
4. Capture screenshot
5. Verify error content

### Error Recovery Pattern
1. Trigger error state
2. Capture error screenshot
3. Clear error mock / correct input
4. Retry action
5. Verify error cleared
6. Capture recovery screenshot

## Mock Data Used

- `MOCK_ERROR_SERVER_ERROR` - 500 error
- `MOCK_ERROR_RATE_LIMIT` - 429 error with reset time
- `MOCK_ERROR_TIMEOUT` - 504 timeout error
- `MOCK_ERROR_VALIDATION_*` - Various validation errors

## Chrome DevTools MCP Tools Used

- `mcp_chrome_devtools_list_pages` - List browser pages
- `mcp_chrome_devtools_select_page` - Select page
- `mcp_chrome_devtools_navigate_page` - Navigate to URL
- `mcp_chrome_devtools_evaluate_script` - Inject mocks
- `mcp_chrome_devtools_fill` - Fill form fields
- `mcp_chrome_devtools_click` - Click buttons
- `mcp_chrome_devtools_wait_for` - Wait for elements
- `mcp_chrome_devtools_take_screenshot` - Capture screenshots
- `mcp_chrome_devtools_take_snapshot` - Get page content

## Expected Error Messages

| Error Type | Expected Message Content |
|------------|-------------------------|
| Server Error | "Internal server error", "try again later" |
| Rate Limit | "Rate limit exceeded", "3 songs per day", retry time |
| Timeout | "timeout", "took too long", "try again" |
| Empty Lyrics | "Lyrics cannot be empty" |
| Lyrics Too Long | "exceed 3,100 character limit" |
| Lyrics Too Short | "at least 50 characters" |
| No Style | "select a music style" |

## Validation States

| State | Character Count | UI Indicators |
|-------|----------------|---------------|
| Valid | 50 - 3,000 | Normal border, enabled button |
| Warning | 2,800 - 3,100 | Yellow/orange border, warning message |
| Error | > 3,100 or < 50 | Red border, error message, disabled button |

## Test Execution Checklist

- [ ] Chrome running with remote debugging (port 9222)
- [ ] Frontend dev server running (port 5173)
- [ ] Chrome DevTools MCP configured
- [ ] Report directories created
- [ ] Network mocks injected successfully
- [ ] Screenshots captured for each scenario
- [ ] Error messages verified
- [ ] Error recovery tested
- [ ] Console logs checked for errors

## Related Files

- `test_e2e_error_handling.py` - Test implementation
- `ERROR_HANDLING_TEST_GUIDE.md` - Detailed guide
- `e2e_mock_data.py` - Mock data definitions
- `e2e_network_mock.py` - Network mocking system
- `e2e_helpers.py` - Helper functions
