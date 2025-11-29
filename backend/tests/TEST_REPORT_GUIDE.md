# E2E Test Report Generation Guide

This guide explains how to use the E2E test report generation system for Chrome DevTools testing.

## Overview

The test report generation system (`e2e_test_report.py`) provides comprehensive reporting capabilities for E2E tests, including:

- Test result aggregation and summary generation
- Screenshot embedding in reports
- Network activity log formatting
- Console error/warning log formatting
- Markdown and JSON report generation

## Quick Start

```python
from tests.e2e_test_report import (
    E2ETestReportGenerator,
    create_report_generator,
    format_test_result_for_report,
)

# Create a report generator
generator = create_report_generator("./report/e2e-chrome-devtools-testing")

# Start test run
generator.start_test_run({"browser": "Chrome", "viewport": "1920x1080"})

# Add test results
generator.add_test_result(
    scenario_id="page-a-001",
    scenario_name="Page A Initial Load",
    status="passed",
    duration_seconds=2.5,
    page="page-a",
    requirements=["1.1", "1.2"]
)

# End test run and generate report
generator.end_test_run()
report_path = generator.generate_report()
print(f"Report saved to: {report_path}")
```

## Core Components

### E2ETestReportGenerator

The main class for generating test reports.

#### Initialization

```python
generator = E2ETestReportGenerator(
    report_dir="./report/e2e-chrome-devtools-testing"
)
```

#### Adding Test Results

```python
generator.add_test_result(
    scenario_id="test-001",           # Unique identifier
    scenario_name="Test Page A Load", # Human-readable name
    status="passed",                  # passed, failed, skipped, error
    duration_seconds=2.5,             # Test duration
    page="page-a",                    # Page being tested
    description="Verify page loads",  # Optional description
    screenshots=["path/to/screenshot.png"],  # Screenshot paths
    error_message="Error details",    # For failed tests
    error_stack="Stack trace",        # Optional stack trace
    assertions=[                      # Assertion results
        {"description": "Element visible", "passed": True}
    ],
    requirements=["1.1", "1.2"]       # Requirements covered
)
```

#### Adding Screenshots

```python
generator.add_screenshot(
    filename="initial-load.png",
    filepath="./report/e2e-chrome-devtools-testing/page-a/initial-load.png",
    page="page-a",
    scenario="initial-load",
    step="01",
    description="Initial page load state",
    viewport_width=1920,
    viewport_height=1080
)
```

#### Setting Network Summary

```python
generator.set_network_summary(
    total_requests=50,
    api_requests=10,
    failed_requests=2,
    cached_requests=5,
    websocket_connections=1,
    avg_response_time_ms=150.5,
    requests=[
        {"method": "GET", "url": "/api/test", "status": 200, "duration_ms": 100}
    ],
    failed_request_details=[
        {"method": "POST", "url": "/api/submit", "status": 500, "error": "Server error"}
    ],
    websocket_details=[
        {"url": "ws://localhost:8000/ws", "state": "open", "message_count": 10}
    ]
)
```

#### Setting Console Summary

```python
generator.set_console_summary(
    total_messages=100,
    error_count=5,
    warning_count=10,
    critical_error_count=1,
    should_fail_test=True,
    failure_reasons=["Critical error detected"],
    errors=[
        {"timestamp": "2025-01-01T00:00:00", "message": "Error message", "stack_trace": "..."}
    ],
    warnings=[
        {"message": "Warning message"}
    ],
    critical_errors=[
        {"message": "Critical error", "stack_trace": "..."}
    ]
)
```

#### Generating Reports

```python
# Generate markdown report
md_path = generator.generate_report("test-report.md")

# Generate JSON report
json_path = generator.generate_json_report("test-report.json")

# Generate both reports
paths = generator.save_all_reports("test-report")
# Returns: {"markdown": "path/to/test-report.md", "json": "path/to/test-report.json"}
```

## Integration with Existing Modules

### Using with NetworkActivityMonitor

```python
from tests.e2e_network_monitor import NetworkActivityMonitor
from tests.e2e_test_report import create_report_from_monitors

# Create and populate network monitor
network_monitor = NetworkActivityMonitor()
network_monitor.add_request_log(
    reqid=1,
    url="/api/lyrics/generate",
    method="POST",
    status=200,
    duration_ms=150
)

# Create report generator from monitors
generator = create_report_from_monitors(
    network_monitor=network_monitor,
    report_dir="./report/e2e-chrome-devtools-testing"
)

# Generate report
report_path = generator.generate_report()
```

### Using with ConsoleMonitor

```python
from tests.e2e_console_monitor import ConsoleMonitor
from tests.e2e_test_report import create_report_from_monitors

# Create and populate console monitor
console_monitor = ConsoleMonitor()
console_monitor.add_message(
    level="error",
    message="JavaScript error",
    stack_trace="Error at line 10..."
)

# Create report generator from monitors
generator = create_report_from_monitors(
    console_monitor=console_monitor,
    report_dir="./report/e2e-chrome-devtools-testing"
)

# Generate report
report_path = generator.generate_report()
```

### Using with ChromeDevToolsHelper

```python
from tests.e2e_helpers import ChromeDevToolsHelper
from tests.e2e_test_report import create_report_from_monitors

# Create and use helper
helper = ChromeDevToolsHelper()
helper.capture_screenshot(
    page="page-a",
    scenario="initial-load",
    description="Initial page load"
)
helper.record_test_result(
    scenario_id="test-001",
    status="passed",
    duration=2.5,
    screenshots=["path/to/screenshot.png"]
)

# Create report generator from helper
generator = create_report_from_monitors(
    helper=helper,
    report_dir="./report/e2e-chrome-devtools-testing"
)

# Generate report
report_path = generator.generate_report()
```

## Convenience Functions

### format_test_result_for_report

```python
from tests.e2e_test_report import format_test_result_for_report

result = format_test_result_for_report(
    scenario_id="test-001",
    scenario_name="Test Scenario",
    passed=True,
    duration_seconds=1.5,
    page="page-a",
    error_message=None,
    screenshots=["path/to/screenshot.png"],
    requirements=["1.1"]
)
```

### embed_screenshot_in_report

```python
from tests.e2e_test_report import embed_screenshot_in_report

markdown = embed_screenshot_in_report(
    filepath="./report/e2e-chrome-devtools-testing/page-a/screenshot.png",
    report_dir="./report/e2e-chrome-devtools-testing"
)
# Returns: "![Screenshot](page-a/screenshot.png)"
```

### format_network_logs_for_report

```python
from tests.e2e_test_report import format_network_logs_for_report

requests = [
    {"method": "GET", "url": "/api/test", "status": 200, "duration_ms": 100},
    {"method": "POST", "url": "/api/submit", "status": 201, "duration_ms": 150}
]

formatted = format_network_logs_for_report(requests, max_requests=20)
```

### format_console_logs_for_report

```python
from tests.e2e_test_report import format_console_logs_for_report

errors = [{"timestamp": "2025-01-01T00:00:00", "message": "Error 1"}]
warnings = [{"message": "Warning 1"}]

formatted = format_console_logs_for_report(
    errors=errors,
    warnings=warnings,
    include_stack_traces=True
)
```

## Report Structure

### Markdown Report Sections

1. **Header** - Report title, generation timestamp, test configuration
2. **Summary** - Test statistics (total, passed, failed, skipped, pass rate)
3. **Failed Tests Summary** - Quick overview of failed tests
4. **Test Results** - Detailed results grouped by page
5. **Network Activity** - API requests, failed requests, WebSocket connections
6. **Console Activity** - Errors, warnings, critical errors
7. **Visual Evidence** - Screenshots grouped by page
8. **Requirements Coverage** - Which requirements were tested

### JSON Report Structure

```json
{
  "generated_at": "2025-11-29T12:00:00",
  "test_start_time": "2025-11-29T11:55:00",
  "test_end_time": "2025-11-29T12:00:00",
  "metadata": {"browser": "Chrome"},
  "summary": {
    "total_tests": 10,
    "passed": 8,
    "failed": 2,
    "skipped": 0,
    "pass_rate": 80.0
  },
  "test_results": [...],
  "screenshots": [...],
  "network_summary": {...},
  "console_summary": {...}
}
```

## Report Output Location

Reports are saved to: `./report/e2e-chrome-devtools-testing/`

Default filenames:
- Markdown: `test-report-YYYYMMDD-HHMMSS.md`
- JSON: `test-report-YYYYMMDD-HHMMSS.json`

## Best Practices

1. **Start and end test runs** - Always call `start_test_run()` and `end_test_run()` to track timing
2. **Include requirements** - Link test results to requirements for coverage tracking
3. **Capture screenshots** - Add screenshots for visual evidence of test states
4. **Log network activity** - Include API request details for debugging
5. **Monitor console** - Track JavaScript errors and warnings
6. **Use descriptive names** - Make scenario names clear and descriptive
7. **Include error details** - For failed tests, include error messages and stack traces
