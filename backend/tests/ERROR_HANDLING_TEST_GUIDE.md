# Error Handling Test Guide

## Overview

This guide provides instructions for executing error handling test scenarios for the LearningSong application using Chrome DevTools MCP. These tests verify that the application handles various error conditions gracefully and provides appropriate user feedback.

## Test Coverage

The error handling tests cover the following requirements:

- **Requirement 6.1**: 500 server error response and error message display
- **Requirement 6.2**: 429 rate limit error response with retry information
- **Requirement 6.3**: Network timeout handling and error message
- **Requirement 6.4**: Validation errors with field-specific messages
- **Requirement 6.5**: Error recovery and state clearing

## Prerequisites

Before running the error handling tests, ensure:

1. **Chrome Browser** is running with remote debugging enabled:
   ```bash
   chrome --remote-debugging-port=9222
   ```

2. **Frontend Development Server** is running:
   ```bash
   cd frontend
   pnpm dev
   ```
   The server should be accessible at `http://localhost:5173`

3. **Chrome DevTools MCP** is configured in `.kiro/settings/mcp.json`

4. **Report Directory** exists:
   ```bash
   mkdir -p report/e2e-chrome-devtools-testing/page-a
   mkdir -p report/e2e-chrome-devtools-testing/page-b
   ```

## Test Scenarios

### 1. Server Error Handling (Requirement 6.1)

#### Test 1.1: Server Error on Lyrics Generation

**Objective**: Verify that a 500 server error on lyrics generation displays an appropriate error message.

**Steps**:
1. Run the test to see instructions:
   ```python
   from tests.test_e2e_error_handling import TestServerErrorHandling
   test = TestServerErrorHandling()
   test.test_server_error_on_lyrics_generation()
   ```

2. Follow the displayed instructions to:
   - Connect to browser via Chrome DevTools MCP
   - Inject network mocks for server error
   - Navigate to Page A
   - Fill text input and submit
   - Verify error message is displayed
   - Capture screenshot

**Expected Results**:
- Error message contains "Internal server error"
- Message suggests trying again later
- Submit button remains enabled for retry
- No navigation occurs (stays on Page A)

#### Test 1.2: Server Error on Song Generation

**Objective**: Verify that a 500 server error on song generation displays an appropriate error message on Page B.

**Steps**: Similar to Test 1.1, but occurs on Page B during song generation.

### 2. Rate Limit Error Handling (Requirement 6.2)

#### Test 2.1: Rate Limit Error on Lyrics Generation

**Objective**: Verify that a 429 rate limit error displays a message with retry information.

**Steps**:
1. Run the test:
   ```python
   from tests.test_e2e_error_handling import TestRateLimitErrorHandling
   test = TestRateLimitErrorHandling()
   test.test_rate_limit_error_on_lyrics_generation()
   ```

2. Follow instructions to inject rate limit mock and verify error message

**Expected Results**:
- Error message explains rate limit (3 songs per day)
- Message includes when user can try again
- Submit button state allows retry after reset time

#### Test 2.2: Rate Limit Error on Song Generation

**Objective**: Verify rate limit error handling on Page B during song generation.

**Steps**: Similar to Test 2.1, but occurs on Page B.

### 3. Timeout Error Handling (Requirement 6.3)

#### Test 3.1: Timeout Error on Lyrics Generation

**Objective**: Verify that network timeout displays an appropriate error message.

**Steps**:
1. Run the test:
   ```python
   from tests.test_e2e_error_handling import TestTimeoutErrorHandling
   test = TestTimeoutErrorHandling()
   test.test_timeout_error_on_lyrics_generation()
   ```

2. Follow instructions to inject timeout mock and verify error message

**Expected Results**:
- Timeout error message is displayed
- Message explains the timeout
- Message suggests trying again
- Submit button remains enabled for retry

#### Test 3.2: Timeout Error on Song Generation

**Objective**: Verify timeout error handling on Page B during song generation.

**Steps**: Similar to Test 3.1, but occurs on Page B.

### 4. Validation Error Handling (Requirement 6.4)

#### Test 4.1: Empty Lyrics Validation Error

**Objective**: Verify that empty lyrics displays a field-specific validation error.

**Steps**:
1. Run the test:
   ```python
   from tests.test_e2e_error_handling import TestValidationErrorHandling
   test = TestValidationErrorHandling()
   test.test_validation_error_empty_lyrics()
   ```

2. Navigate to Page B, clear lyrics, and attempt to generate song

**Expected Results**:
- Validation error message: "Lyrics cannot be empty"
- Error is shown near the lyrics field
- Generate button is disabled or shows error state

#### Test 4.2: Lyrics Too Long Validation Error

**Objective**: Verify that lyrics exceeding 3,100 characters displays a field-specific error.

**Steps**:
1. Run the test:
   ```python
   test.test_validation_error_lyrics_too_long()
   ```

2. Edit lyrics to exceed 3,100 characters and observe error state

**Expected Results**:
- Character count shows > 3,100
- Error state is displayed (red border on textarea)
- Field-specific error message: "Lyrics exceed 3,100 character limit"
- Generate button is disabled

#### Test 4.3: Lyrics Too Short Validation Error

**Objective**: Verify that lyrics under 50 characters displays a validation error.

**Steps**:
1. Run the test:
   ```python
   test.test_validation_error_lyrics_too_short()
   ```

2. Edit lyrics to be very short (< 50 characters)

**Expected Results**:
- Validation error message mentions minimum 50 characters
- Error is shown near the lyrics field

#### Test 4.4: No Style Selected Validation Error

**Objective**: Verify that attempting to generate without selecting a style shows an error.

**Steps**:
1. Run the test:
   ```python
   test.test_validation_error_no_style_selected()
   ```

2. Attempt to generate song without selecting a music style

**Expected Results**:
- Validation error message mentions selecting a music style
- Error is shown near the style selector

### 5. Error Recovery (Requirement 6.5)

#### Test 5.1: Recovery After Server Error

**Objective**: Verify that the application recovers from server error and clears error state.

**Steps**:
1. Run the test:
   ```python
   from tests.test_e2e_error_handling import TestErrorRecovery
   test = TestErrorRecovery()
   test.test_error_recovery_after_server_error()
   ```

2. Follow instructions to:
   - Trigger server error
   - Clear error mock and inject success mock
   - Retry submission
   - Verify error state is cleared

**Expected Results**:
- Error message is displayed initially
- After retry with successful mock:
  - Error message is cleared
  - Application navigates to Page B
  - No error state remains
  - Normal functionality is restored

#### Test 5.2: Recovery After Validation Error

**Objective**: Verify that validation errors are cleared when user corrects input.

**Steps**:
1. Run the test:
   ```python
   test.test_error_recovery_after_validation_error()
   ```

2. Trigger validation error, then correct the input

**Expected Results**:
- Error state is displayed when lyrics exceed limit
- After correction:
  - Error message is cleared
  - Red border is removed from textarea
  - Character count shows valid number
  - Generate button is enabled
  - Normal functionality is restored

#### Test 5.3: Recovery After Rate Limit

**Objective**: Verify that the application can retry after rate limit reset.

**Steps**:
1. Run the test:
   ```python
   test.test_error_recovery_after_rate_limit()
   ```

2. Trigger rate limit error, simulate reset, then retry

**Expected Results**:
- Rate limit error is displayed initially
- After simulated reset and retry:
  - Error message is cleared
  - Application navigates to Page B
  - Lyrics are generated successfully
  - Normal functionality is restored

## Running All Tests

To see a summary of all error handling tests:

```python
from tests.test_e2e_error_handling import print_test_summary
print_test_summary()
```

## Screenshot Organization

All screenshots are saved to:
```
report/e2e-chrome-devtools-testing/
├── page-a/
│   ├── server-error-500-error-message-[timestamp].png
│   ├── rate-limit-429-error-message-[timestamp].png
│   ├── timeout-504-error-message-[timestamp].png
│   ├── error-recovery-01-error-state-[timestamp].png
│   └── error-recovery-02-recovered-state-[timestamp].png
└── page-b/
    ├── server-error-500-song-error-message-[timestamp].png
    ├── rate-limit-429-song-error-message-[timestamp].png
    ├── timeout-504-song-error-message-[timestamp].png
    ├── validation-empty-lyrics-error-message-[timestamp].png
    ├── validation-lyrics-too-long-error-message-[timestamp].png
    ├── validation-lyrics-too-short-error-message-[timestamp].png
    ├── validation-no-style-error-message-[timestamp].png
    ├── validation-recovery-01-error-state-[timestamp].png
    └── validation-recovery-02-recovered-state-[timestamp].png
```

## Common Issues and Troubleshooting

### Issue: Cannot connect to Chrome

**Solution**: Ensure Chrome is running with remote debugging:
```bash
chrome --remote-debugging-port=9222
```

Verify connection at: `http://localhost:9222/json`

### Issue: Frontend server not running

**Solution**: Start the frontend development server:
```bash
cd frontend
pnpm dev
```

Verify at: `http://localhost:5173`

### Issue: Network mocks not working

**Solution**: 
1. Verify mocks are injected correctly using `mcp_chrome_devtools_evaluate_script`
2. Check `window.__networkMockInjected === true` in browser console
3. Re-inject mocks if needed

### Issue: Screenshots not saving

**Solution**: Ensure report directory exists and is writable:
```bash
mkdir -p report/e2e-chrome-devtools-testing/page-a
mkdir -p report/e2e-chrome-devtools-testing/page-b
```

## Test Execution Tips

1. **Run tests one at a time**: Error handling tests are designed to be run individually to allow for careful observation of error states.

2. **Capture screenshots**: Always capture screenshots at key states (error displayed, error cleared) for documentation.

3. **Verify error messages**: Check that error messages are user-friendly and provide actionable information.

4. **Test error recovery**: Always verify that the application can recover from error states and return to normal functionality.

5. **Check console logs**: Use Chrome DevTools MCP to monitor console for JavaScript errors during testing.

## Next Steps

After completing error handling tests:

1. Review captured screenshots
2. Verify all error messages are user-friendly
3. Document any issues found
4. Update error handling implementation if needed
5. Proceed to next test scenario (complete user journey, screenshot organization, etc.)

## Related Documentation

- `E2E_TEST_GUIDE.md` - General E2E testing guide
- `NETWORK_MOCK_GUIDE.md` - Network mocking documentation
- `e2e_mock_data.py` - Mock data definitions
- `e2e_network_mock.py` - Network mocking implementation
- `e2e_helpers.py` - Helper functions for E2E testing
