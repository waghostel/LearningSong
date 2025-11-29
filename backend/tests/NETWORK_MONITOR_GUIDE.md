# Network Activity Monitoring Guide

This guide explains how to use the network activity monitoring and logging system for E2E Chrome DevTools testing.

## Overview

The `e2e_network_monitor.py` module provides comprehensive network activity monitoring capabilities:

- **Request Logging**: Capture HTTP requests with headers, payloads, and responses
- **WebSocket Monitoring**: Track WebSocket connections and messages
- **API Verification**: Verify expected API calls were made with correct parameters
- **Timing Metrics**: Collect performance timing data
- **Cache Analysis**: Verify cache headers and behavior
- **Report Generation**: Generate markdown and JSON reports

## Requirements Covered

- **8.1**: Capture and verify request headers and payloads
- **8.2**: Verify response status codes and data structure
- **8.3**: Verify WebSocket connection establishment and message flow
- **8.4**: Verify appropriate error handling when API requests fail
- **8.5**: Verify cache headers and behavior

## Quick Start

```python
from tests.e2e_network_monitor import (
    NetworkActivityMonitor,
    create_network_monitor,
    setup_expected_api_calls_for_user_journey,
    verify_api_call_made
)

# Create monitor
monitor = create_network_monitor()

# Set up expected API calls
setup_expected_api_calls_for_user_journey(monitor)

# Add request logs (from Chrome DevTools MCP)
monitor.add_request_log(
    reqid=1,
    url="http://localhost:8000/api/lyrics/generate",
    method="POST",
    resource_type="fetch",
    status=200,
    request_headers={"Content-Type": "application/json"},
    response_body={"lyrics": "Generated lyrics"}
)

# Verify expected calls
all_verified, results = monitor.verify_expected_calls()
print(f"All API calls verified: {all_verified}")

# Generate report
report_path = monitor.generate_network_report()
```

## Core Classes

### NetworkRequestLog

Represents a single network request:

```python
from tests.e2e_network_monitor import NetworkRequestLog

log = NetworkRequestLog(
    reqid=1,
    url="http://localhost:8000/api/test",
    method="POST",
    resource_type="fetch",
    status=200,
    status_text="OK",
    request_headers={"Content-Type": "application/json"},
    response_headers={"Cache-Control": "no-cache"},
    request_body={"text": "input"},
    response_body={"result": "output"},
    duration_ms=150.0,
    from_cache=False
)
```

### WebSocketLog

Tracks WebSocket connections and messages:

```python
from tests.e2e_network_monitor import WebSocketLog

ws_log = WebSocketLog(
    url="ws://localhost:8000/ws/songs/task123",
    state="open"
)
ws_log.add_message("received", {"status": "processing", "progress": 50})
ws_log.add_message("received", {"status": "completed"})
```

### NetworkActivityMonitor

Main class for monitoring network activity:

```python
from tests.e2e_network_monitor import NetworkActivityMonitor

monitor = NetworkActivityMonitor(report_dir="./report/e2e-chrome-devtools-testing")

# Add request logs
monitor.add_request_log(...)

# Add WebSocket logs
monitor.add_websocket_log(...)

# Add expected API calls
monitor.add_expected_call(...)

# Add timing metrics
monitor.add_timing_metrics(...)
```

## Verification Methods

### Verify Expected API Calls

```python
# Add expected calls
monitor.add_expected_call(
    url_pattern="/api/lyrics/generate",
    method="POST",
    expected_status=200,
    expected_body_contains=["lyrics"],
    description="Lyrics generation API"
)

# Verify all expected calls were made
all_verified, results = monitor.verify_expected_calls()
```

### Verify Request Headers

```python
success, issues = monitor.verify_request_headers(
    reqid=1,
    expected_headers={"Content-Type": "application/json"}
)
```

### Verify Response Structure

```python
success, missing = monitor.verify_response_structure(
    reqid=1,
    expected_fields=["lyrics", "title", "style"]
)
```

### Verify Cache Headers

```python
result = monitor.verify_cache_headers(reqid=1)
# Returns: {"cacheable": True, "cache_duration": 3600, ...}
```

### Verify WebSocket Connection

```python
connected, info = monitor.verify_websocket_connection("/ws/songs/")
# Returns: (True, {"state": "open", "message_count": 5, ...})
```

### Verify WebSocket Messages

```python
verified, result = monitor.verify_websocket_messages(
    "/ws/songs/",
    expected_message_count=3,
    expected_message_types=["queued", "processing", "completed"]
)
```

## Query Methods

```python
# Get requests by URL pattern
requests = monitor.get_requests_by_url("/api/lyrics", match_type="contains")

# Get requests by resource type
fetch_requests = monitor.get_requests_by_type("fetch")

# Get failed requests (status >= 400 or has error)
failed = monitor.get_failed_requests()

# Get API requests (requests to /api/ endpoints)
api_requests = monitor.get_api_requests()

# Get cached requests
cached = monitor.get_cached_requests()
```

## Timing Metrics

```python
# Add timing metrics
monitor.add_timing_metrics(
    reqid=1,
    dns_lookup_ms=10.0,
    tcp_connection_ms=20.0,
    waiting_ms=100.0,  # TTFB
    total_ms=150.0
)

# Get timing summary
summary = monitor.get_timing_summary()
# Returns: {"request_count": 3, "total_time": {"min_ms": 100, "max_ms": 200, "avg_ms": 150}, ...}
```

## Report Generation

```python
# Save logs to JSON
json_path = monitor.save_logs("network-logs.json")

# Generate markdown report
report_path = monitor.generate_network_report("network-report.md")

# Format for test report inclusion
formatted = monitor.format_for_test_report()
```

## Chrome DevTools MCP Integration

Parse responses from Chrome DevTools MCP:

```python
from tests.e2e_network_monitor import (
    parse_network_request_from_mcp,
    parse_network_list_from_mcp
)

# Parse single request
mcp_response = {"reqid": 1, "url": "...", "method": "GET", ...}
log = parse_network_request_from_mcp(mcp_response)

# Parse list of requests
mcp_list = [{"reqid": 1, ...}, {"reqid": 2, ...}]
logs = parse_network_list_from_mcp(mcp_list)
```

## Convenience Functions

```python
from tests.e2e_network_monitor import (
    create_network_monitor,
    setup_expected_api_calls_for_user_journey,
    setup_expected_api_calls_for_error_testing,
    verify_api_call_made,
    get_request_payload,
    get_response_data
)

# Create monitor with default report directory
monitor = create_network_monitor()

# Set up expected calls for user journey
setup_expected_api_calls_for_user_journey(monitor)

# Set up expected calls for error testing
setup_expected_api_calls_for_error_testing(monitor, "rate_limit")  # 429
setup_expected_api_calls_for_error_testing(monitor, "server_error")  # 500

# Verify specific API call
found, request = verify_api_call_made(monitor, "/api/lyrics/generate", "POST")

# Get request payload
payload = get_request_payload(monitor, "/api/lyrics/generate", "POST")

# Get response data
response = get_response_data(monitor, "/api/lyrics/generate", "POST")
```

## Example: Complete User Journey Monitoring

```python
from tests.e2e_network_monitor import (
    create_network_monitor,
    setup_expected_api_calls_for_user_journey
)

# Initialize
monitor = create_network_monitor()
setup_expected_api_calls_for_user_journey(monitor)

# During test execution, add request logs from Chrome DevTools MCP
# ... (requests are logged as they occur)

# After test, verify and report
all_verified, results = monitor.verify_expected_calls()

if not all_verified:
    for result in results:
        if result["issues"]:
            print(f"Issues with {result['expected']['url_pattern']}:")
            for issue in result["issues"]:
                print(f"  - {issue}")

# Generate report
monitor.generate_network_report()
monitor.save_logs()
```
