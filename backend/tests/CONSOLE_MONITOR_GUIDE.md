# Console Monitoring and Error Detection Guide

This guide explains how to use the console monitoring system for E2E Chrome DevTools testing.

## Overview

The console monitoring system (`e2e_console_monitor.py`) provides functionality to:
- Retrieve and log console messages via Chrome DevTools MCP
- Filter errors and warnings
- Capture error stack traces
- Detect critical errors and determine test failure
- Generate console activity reports

## Requirements Covered

- **9.1**: Monitor console messages for errors
- **9.2**: Capture error messages with stack traces
- **9.3**: Capture warning messages for review
- **9.4**: Report all console errors and warnings found
- **9.5**: Fail test and report error details when critical errors occur

## Quick Start

### Basic Usage

```python
from tests.e2e_console_monitor import ConsoleMonitor, create_console_monitor

# Create a monitor instance
monitor = create_console_monitor()

# Add messages from Chrome DevTools MCP
mcp_messages = [
    {"level": "error", "message": "Test error", "stackTrace": "..."},
    {"level": "warn", "message": "Test warning"},
]
monitor.add_messages_from_mcp(mcp_messages)

# Get errors and warnings
errors = monitor.get_errors()
warnings = monitor.get_warnings()

# Check if test should fail
should_fail, reasons = monitor.should_fail_test()

# Generate report
report_path = monitor.generate_console_report()
```

### With Chrome DevTools MCP

```python
# 1. List console messages using MCP
# Use: mcp_chrome_devtools_list_console_messages()

# 2. Parse and add messages to monitor
from tests.e2e_console_monitor import ConsoleMonitor

monitor = ConsoleMonitor()

# Assuming mcp_response contains the console messages
mcp_messages = [
    {"level": "error", "message": "Uncaught TypeError: x is undefined"},
    {"level": "warn", "message": "Deprecation warning"},
]
monitor.add_messages_from_mcp(mcp_messages)

# 3. Analyze results
analysis = monitor.analyze()
print(f"Errors: {analysis.error_count}")
print(f"Warnings: {analysis.warning_count}")
print(f"Critical: {len(analysis.critical_errors)}")
print(f"Should fail: {analysis.should_fail_test}")
```

## Key Classes

### ConsoleMessage

Represents a single console message:

```python
from tests.e2e_console_monitor import ConsoleMessage

msg = ConsoleMessage(
    level="error",
    message="Test error",
    url="http://localhost:5173/main.js",
    line_number=42,
    column_number=10,
    stack_trace="Error: Test\n    at main.js:42:10"
)

# Check message type
msg.is_error()    # True
msg.is_warning()  # False

# Get severity
msg.get_severity()  # ErrorSeverity.HIGH
```

### ConsoleMonitor

Main class for monitoring console activity:

```python
from tests.e2e_console_monitor import ConsoleMonitor

monitor = ConsoleMonitor(report_dir="./report/e2e-chrome-devtools-testing")

# Add messages
monitor.add_message(level="error", message="Error message")

# Get filtered messages
errors = monitor.get_errors()
warnings = monitor.get_warnings()
with_stack = monitor.get_messages_with_stack_trace()

# Detect critical errors
critical = monitor.detect_critical_errors()

# Check if test should fail
should_fail, reasons = monitor.should_fail_test()

# Generate reports
monitor.save_logs("console-logs.json")
monitor.generate_console_report("console-report.md")
```

### ErrorPattern

Define custom error patterns for detection:

```python
from tests.e2e_console_monitor import ErrorPattern, create_error_pattern

# Create a custom pattern
pattern = create_error_pattern(
    name="custom_error",
    pattern=r"my\s+custom\s+error",
    severity="high",
    is_critical=True,
    should_fail_test=True,
    description="Custom application error"
)

# Use with monitor
monitor = ConsoleMonitor()
monitor.critical_patterns.append(pattern)
```

## Pre-defined Error Patterns

### Critical Patterns (Default)

These patterns are checked by default and will cause test failure:

| Pattern Name | Description | Example Match |
|-------------|-------------|---------------|
| `uncaught_error` | Uncaught JavaScript error | "Uncaught TypeError: x is undefined" |
| `unhandled_rejection` | Unhandled Promise rejection | "Unhandled promise rejection" |
| `react_error` | React rendering error | "React error boundary" |
| `syntax_error` | JavaScript syntax error | "SyntaxError: Unexpected token" |
| `reference_error` | Reference to undefined variable | "ReferenceError: x is not defined" |
| `type_error` | Type error in JavaScript | "TypeError: Cannot read property" |

### React Patterns

```python
from tests.e2e_console_monitor import REACT_ERROR_PATTERNS

# Includes:
# - react_hydration_error
# - react_key_warning
# - react_state_update_unmounted
```

### Network Patterns

```python
from tests.e2e_console_monitor import NETWORK_ERROR_PATTERNS

# Includes:
# - fetch_failed
# - network_error
# - timeout_error
```

### WebSocket Patterns

```python
from tests.e2e_console_monitor import WEBSOCKET_ERROR_PATTERNS

# Includes:
# - websocket_connection_failed
# - websocket_closed
```

## Ignore Patterns

By default, these patterns are ignored (not reported as errors):

- React DevTools download message
- Source map warnings
- Favicon.ico errors
- Hot Module Replacement (HMR) messages
- Vite HMR messages

Add custom ignore patterns:

```python
monitor = ConsoleMonitor()
monitor.ignore_patterns.append(r"my\s+custom\s+ignore\s+pattern")
```

## Analysis and Reporting

### Comprehensive Analysis

```python
analysis = monitor.analyze()

# Access analysis results
print(f"Total messages: {analysis.total_messages}")
print(f"Errors: {analysis.error_count}")
print(f"Warnings: {analysis.warning_count}")
print(f"Critical errors: {len(analysis.critical_errors)}")
print(f"Should fail test: {analysis.should_fail_test}")
print(f"Failure reasons: {analysis.failure_reasons}")
```

### Generate Reports

```python
# Save raw logs as JSON
json_path = monitor.save_logs("console-logs.json")

# Generate markdown report
report_path = monitor.generate_console_report("console-report.md")

# Get summary dictionary
summary = monitor.get_summary()
```

### Format for Test Reports

```python
from tests.e2e_console_monitor import format_console_messages_for_report

messages = monitor.messages
formatted = format_console_messages_for_report(messages, include_stack_traces=True)
```

## Error Handlers

Register callbacks to be notified when errors occur:

```python
def on_error(error):
    print(f"Error detected: {error.message}")
    # Take screenshot, log to file, etc.

monitor = ConsoleMonitor()
monitor.register_error_handler(on_error)

# Handler will be called when errors are added
monitor.add_message(level="error", message="This triggers the handler")
```

## Integration with E2E Tests

### Example Test Flow

```python
from tests.e2e_console_monitor import ConsoleMonitor

def test_page_a_no_console_errors():
    """Test that Page A loads without console errors."""
    monitor = ConsoleMonitor()
    
    # 1. Navigate to page (using Chrome DevTools MCP)
    # mcp_chrome_devtools_navigate_page(url="http://localhost:5173/")
    
    # 2. Perform test actions
    # ...
    
    # 3. Get console messages
    # mcp_messages = mcp_chrome_devtools_list_console_messages()
    # monitor.add_messages_from_mcp(mcp_messages)
    
    # 4. Check for errors
    should_fail, reasons = monitor.should_fail_test()
    
    if should_fail:
        # Generate report for debugging
        monitor.generate_console_report("page-a-errors.md")
        raise AssertionError(f"Console errors detected: {reasons}")
    
    # 5. Save logs for reference
    monitor.save_logs("page-a-console.json")
```

### Checking Specific Error Types

```python
# Check for network errors
from tests.e2e_console_monitor import check_for_critical_errors, NETWORK_ERROR_PATTERNS

messages = monitor.messages
has_network_errors, descriptions = check_for_critical_errors(
    messages, 
    custom_patterns=NETWORK_ERROR_PATTERNS
)
```

## MCP Tool Reference

Use these Chrome DevTools MCP tools for console monitoring:

```
# List all console messages
mcp_chrome_devtools_list_console_messages()

# List only errors and warnings
mcp_chrome_devtools_list_console_messages(types=["error", "warn"])

# Get specific message details
mcp_chrome_devtools_get_console_message(index=0)
```

## Best Practices

1. **Clear messages between tests**: Call `monitor.clear()` before each test scenario
2. **Check for critical errors**: Always call `should_fail_test()` at the end of each test
3. **Save logs for debugging**: Use `save_logs()` to preserve console output for failed tests
4. **Use appropriate patterns**: Add custom patterns for application-specific errors
5. **Review warnings**: Even if not failing tests, review warnings for potential issues

## Troubleshooting

### No Messages Captured

- Ensure Chrome DevTools MCP is connected
- Verify the page has loaded completely
- Check that console messages exist in the browser

### False Positives

- Add patterns to `ignore_patterns` for known non-critical messages
- Adjust `should_fail_test` flag on patterns as needed

### Missing Stack Traces

- Some console messages may not include stack traces
- Use `get_messages_with_stack_trace()` to filter messages with traces

## File Locations

- **Module**: `backend/tests/e2e_console_monitor.py`
- **Tests**: `backend/tests/test_console_monitor.py`
- **Reports**: `./report/e2e-chrome-devtools-testing/`
