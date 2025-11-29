# E2E Helpers Guide

## Overview

The `e2e_helpers.py` module provides utility functions for E2E testing with Chrome DevTools MCP. This guide explains how to use the helper functions in your test scenarios.

## Quick Start

```python
from tests.e2e_helpers import ChromeDevToolsHelper, get_mock_data

# Create helper instance
helper = ChromeDevToolsHelper()

# Get mock data
mock_data = get_mock_data()
```

## ChromeDevToolsHelper Class

### Initialization

```python
helper = ChromeDevToolsHelper(report_dir="./report/e2e-chrome-devtools-testing")
```

The helper automatically creates the report directory structure:
```
report/e2e-chrome-devtools-testing/
├── page-a/
├── page-b/
├── page-c/
└── responsive/
```

### Browser Connection and Prerequisites

#### Verify Chrome is Running

```python
# Check if Chrome is running with remote debugging
is_running, message = helper.verify_chrome_running()

if is_running:
    print(f"✓ {message}")
else:
    print(f"✗ {message}")
    # Message will include instructions to start Chrome
```

#### Verify Frontend Server is Running

```python
# Check if frontend dev server is running on port 5173
is_running, message = helper.verify_frontend_running()

if is_running:
    print(f"✓ {message}")
else:
    print(f"✗ {message}")
    # Message will include instructions to start the server
```

#### Verify All Prerequisites

```python
# Check all prerequisites at once
success, issues = helper.verify_prerequisites()

if success:
    print("✓ All prerequisites met!")
else:
    print("✗ Issues found:")
    for issue in issues:
        print(f"  - {issue}")
```

### Browser Connection

#### Connect to Browser

```python
# Get instructions for connecting to browser via Chrome DevTools MCP
conn_instructions = helper.connect_to_browser()

print(conn_instructions["instructions"])
# Follow the steps in conn_instructions["steps"]
```

The connection instructions include:
- Chrome debug port (default: 9222)
- Step-by-step instructions for using MCP tools
- List of MCP tools to call (list_pages, select_page)

### Navigation Utilities

#### Get Page URL

```python
# Get the full URL for a specific page
url = helper.get_page_url("page-a")  # http://localhost:5173/
url = helper.get_page_url("page-b")  # http://localhost:5173/lyrics-editing
url = helper.get_page_url("page-c")  # http://localhost:5173/song-playback
```

#### Navigate to Page

```python
# Get navigation instructions for a page
nav_instructions = helper.navigate_to_page(
    page="page-a",
    timeout=30,
    wait_for_load=True
)

# Use the instructions with Chrome DevTools MCP
print(nav_instructions["instructions"])
# Navigate using: mcp_chrome_devtools_navigate_page(url=nav_instructions["url"])
```

#### Navigate with Retry

```python
# Get retry navigation instructions for handling failures
retry_instructions = helper.retry_navigation(
    page="page-b",
    max_retries=3,
    timeout=30
)

# Includes retry strategy with backoff
print(retry_instructions["retry_strategy"])
# {"initial_delay": 2, "backoff_multiplier": 1.5, "max_delay": 10}
```

#### Wait for Page Load

```python
# Get instructions for waiting for page load completion
wait_instructions = helper.wait_for_page_load(timeout=30)

# Includes verification script to check document.readyState
print(wait_instructions["verification_script"])
# Use with: mcp_chrome_devtools_evaluate_script
```

#### Wait for Element

```python
# Wait for a specific element to appear
wait_instructions = helper.wait_for_element(
    selector="textarea",
    timeout=10,
    visible=True  # Wait for element to be visible, not just in DOM
)

# Includes verification script
print(wait_instructions["verification_script"])
# Use with: mcp_chrome_devtools_evaluate_script
```

#### Verify Page Loaded

```python
# Verify a page loaded correctly by checking for expected elements
verify_instructions = helper.verify_page_loaded(
    page="page-a",
    expected_elements=["textarea", "button"]  # Optional, uses defaults if not provided
)

# Default expected elements for each page:
# page-a: ["textarea", "button"]
# page-b: ["textarea", "select", "button"]
# page-c: ["audio", "button"]

# Includes verification script
print(verify_instructions["verification_script"])
# Returns: {success: bool, results: [{selector, found}]}
```

### Screenshot Management

#### Generate Screenshot Filename

```python
# Basic usage
filename = helper.generate_screenshot_filename(
    page="page-a",
    scenario="text-input-validation"
)
# Result: "text-input-validation-20251128-120000.png"

# With step identifier
filename = helper.generate_screenshot_filename(
    page="page-b",
    scenario="lyrics-editing",
    step="character-count-update"
)
# Result: "lyrics-editing-character-count-update-20251128-120000.png"
```

#### Get Screenshot Path

```python
path = helper.get_screenshot_path(
    page="page-a",
    filename="text-input-validation-20251128-120000.png"
)
# Result: "./report/e2e-chrome-devtools-testing/page-a/text-input-validation-20251128-120000.png"
```

### Test Result Recording

```python
# Record a successful test
helper.record_test_result(
    scenario_id="page-a-text-input-validation",
    status="passed",
    duration=2.5,
    screenshots=[
        "./report/e2e-chrome-devtools-testing/page-a/screenshot1.png",
        "./report/e2e-chrome-devtools-testing/page-a/screenshot2.png"
    ]
)

# Record a failed test
helper.record_test_result(
    scenario_id="page-b-song-generation",
    status="failed",
    duration=5.0,
    screenshots=["./report/e2e-chrome-devtools-testing/page-b/error.png"],
    error="Expected element not found: #generate-button"
)
```

### Test Report Generation

```python
# Generate report with default filename
report_path = helper.generate_test_report()
# Result: "./report/e2e-chrome-devtools-testing/test-report-20251128-120000.md"

# Generate report with custom filename
report_path = helper.generate_test_report(output_filename="my-test-report.md")
# Result: "./report/e2e-chrome-devtools-testing/my-test-report.md"
```

### Mock Data

```python
mock_data = helper.create_mock_data()

# Access specific mock scenarios
lyrics_success = mock_data["lyrics_success"]
song_queued = mock_data["song_queued"]
websocket_updates = mock_data["websocket_updates"]
error_rate_limit = mock_data["error_rate_limit"]
```

Available mock data keys:
- `lyrics_success`: Successful lyrics generation response
- `lyrics_with_search`: Lyrics generation with Google Search
- `song_queued`: Song generation queued response
- `song_processing`: Song generation processing response
- `song_completed`: Song generation completed response
- `websocket_updates`: Array of WebSocket status updates
- `error_rate_limit`: 429 rate limit error
- `error_server`: 500 server error
- `error_validation`: 400 validation error
- `error_timeout`: 504 timeout error
- `song_data`: Complete song data for Page C

### Network Log Formatting

```python
network_data = [
    {
        "method": "POST",
        "url": "/api/lyrics/generate",
        "status": 200,
        "duration": 1500,
        "requestBody": {"content": "Learning content..."},
        "responseBody": {"lyrics": "[Verse 1]..."}
    }
]

formatted_log = helper.format_network_log(network_data)
# Returns formatted markdown string
```

### Console Log Formatting

```python
console_data = [
    {
        "level": "error",
        "message": "TypeError: Cannot read property 'x' of undefined",
        "timestamp": "2025-11-28T12:00:00Z",
        "stackTrace": "at Component.render (app.js:123)"
    },
    {
        "level": "warn",
        "message": "Deprecated API usage",
        "timestamp": "2025-11-28T12:00:01Z"
    }
]

formatted_log = helper.format_console_log(console_data)
# Returns formatted markdown string
```

### Responsive Testing

```python
# Get standard viewport sizes
viewports = helper.get_viewport_sizes()
# Returns: {
#   "mobile": (375, 667),
#   "tablet": (768, 1024),
#   "desktop": (1920, 1080)
# }

# Use with Chrome DevTools MCP resize_page
for device, (width, height) in viewports.items():
    # Resize page to viewport
    # Take screenshot
    pass
```

### Touch Target Validation

```python
# Validate button meets minimum touch target size
is_valid = helper.validate_touch_target_size(
    element_width=48,
    element_height=48,
    min_size=44  # Default is 44px for accessibility
)
# Returns: True
```

### Wait for Condition

```python
# Wait for an element to appear (example)
def check_element_visible():
    # Your logic to check if element is visible
    return element_is_visible

success = helper.wait_for_condition(
    condition_fn=check_element_visible,
    timeout=10,  # Wait up to 10 seconds
    interval=0.5  # Check every 0.5 seconds
)

if success:
    print("Element appeared!")
else:
    print("Timeout waiting for element")
```

## Convenience Functions

### Create Helper

```python
from tests.e2e_helpers import create_helper

helper = create_helper()
# Equivalent to: ChromeDevToolsHelper(report_dir="./report/e2e-chrome-devtools-testing")
```

### Get Mock Data

```python
from tests.e2e_helpers import get_mock_data

mock_data = get_mock_data()
lyrics = mock_data["lyrics_success"]
```

### Generate Screenshot Path

```python
from tests.e2e_helpers import generate_screenshot_path

path = generate_screenshot_path(
    page="page-a",
    scenario="text-input",
    step="initial-load"
)
```

### Browser Connection and Navigation

```python
from tests.e2e_helpers import (
    verify_chrome_running,
    verify_frontend_running,
    get_page_url,
    navigate_to_page,
    connect_to_browser
)

# Verify prerequisites
chrome_ok, chrome_msg = verify_chrome_running()
frontend_ok, frontend_msg = verify_frontend_running()

# Get page URLs
url = get_page_url("page-a")

# Get navigation instructions
nav_instructions = navigate_to_page("page-b", timeout=30)

# Get connection instructions
conn_instructions = connect_to_browser()
```

## Example Test Scenarios

### Example 1: Complete Test with Prerequisites Check

```python
from tests.e2e_helpers import ChromeDevToolsHelper
import time

def test_page_a_text_input():
    """Test Page A text input functionality."""
    helper = ChromeDevToolsHelper()
    
    # Step 1: Verify prerequisites
    success, issues = helper.verify_prerequisites()
    if not success:
        print("Prerequisites not met:")
        for issue in issues:
            print(f"  - {issue}")
        return
    
    mock_data = helper.create_mock_data()
    start_time = time.time()
    screenshots = []
    
    try:
        # Step 2: Get navigation instructions
        nav_instructions = helper.navigate_to_page("page-a", timeout=30)
        print(f"Navigating to: {nav_instructions['url']}")
        # (Use Chrome DevTools MCP navigate_page tool)
        
        # Step 3: Wait for page load
        wait_instructions = helper.wait_for_page_load(timeout=30)
        # (Use Chrome DevTools MCP evaluate_script with wait_instructions["verification_script"])
        
        # Step 4: Verify page loaded correctly
        verify_instructions = helper.verify_page_loaded("page-a")
        # (Use Chrome DevTools MCP evaluate_script with verify_instructions["verification_script"])
        
        # Step 5: Take initial screenshot
        filename = helper.generate_screenshot_filename("page-a", "text-input", "initial-load")
        screenshot_path = helper.get_screenshot_path("page-a", filename)
        # (Use Chrome DevTools MCP take_screenshot tool with screenshot_path)
        screenshots.append(screenshot_path)
        
        # Step 6: Fill text input
        # (Use Chrome DevTools MCP fill tool)
        
        # Step 7: Take screenshot after input
        filename = helper.generate_screenshot_filename("page-a", "text-input", "filled")
        screenshot_path = helper.get_screenshot_path("page-a", filename)
        # (Use Chrome DevTools MCP take_screenshot tool)
        screenshots.append(screenshot_path)
        
        # Step 8: Click submit button
        # (Use Chrome DevTools MCP click tool)
        
        # Step 9: Wait for navigation to Page B
        # (Use Chrome DevTools MCP wait_for tool)
        
        # Record success
        duration = time.time() - start_time
        helper.record_test_result(
            scenario_id="page-a-text-input",
            status="passed",
            duration=duration,
            screenshots=screenshots
        )
        
    except Exception as e:
        # Record failure
        duration = time.time() - start_time
        helper.record_test_result(
            scenario_id="page-a-text-input",
            status="failed",
            duration=duration,
            screenshots=screenshots,
            error=str(e)
        )
    
    # Generate report
    report_path = helper.generate_test_report()
    print(f"Test report generated: {report_path}")
```

### Example 2: Using Convenience Functions

```python
from tests.e2e_helpers import (
    verify_chrome_running,
    verify_frontend_running,
    navigate_to_page,
    get_page_url
)

def quick_prerequisite_check():
    """Quick check of prerequisites before running tests."""
    print("Checking prerequisites...")
    
    # Check Chrome
    chrome_ok, chrome_msg = verify_chrome_running()
    print(f"Chrome: {'✓' if chrome_ok else '✗'} {chrome_msg}")
    
    # Check Frontend
    frontend_ok, frontend_msg = verify_frontend_running()
    print(f"Frontend: {'✓' if frontend_ok else '✗'} {frontend_msg}")
    
    if chrome_ok and frontend_ok:
        print("\n✓ Ready to run E2E tests!")
        
        # Show available pages
        print("\nAvailable pages:")
        for page in ["page-a", "page-b", "page-c"]:
            url = get_page_url(page)
            print(f"  {page}: {url}")
        
        return True
    else:
        print("\n✗ Prerequisites not met. Please fix the issues above.")
        return False

# Run the check
if quick_prerequisite_check():
    # Proceed with tests
    pass
```

## Best Practices

1. **Always record test results**: Use `record_test_result()` for both passed and failed tests
2. **Capture screenshots at key states**: Take screenshots before and after important actions
3. **Use descriptive scenario IDs**: Make it easy to identify tests in reports
4. **Generate reports after test runs**: Call `generate_test_report()` at the end of your test suite
5. **Handle exceptions**: Wrap test logic in try/except to ensure results are recorded
6. **Use mock data consistently**: Reference the same mock data structures across tests

## Integration with Chrome DevTools MCP

The helpers are designed to work seamlessly with Chrome DevTools MCP tools:

```python
# Example: Taking a screenshot with MCP
filename = helper.generate_screenshot_filename("page-a", "scenario", "step")
path = helper.get_screenshot_path("page-a", filename)

# Use Chrome DevTools MCP take_screenshot tool:
# mcp_chrome_devtools_take_screenshot(filePath=path)
```

## Troubleshooting

### Issue: Report directory not created

**Solution**: The helper creates directories automatically. If issues persist, check file permissions.

### Issue: Screenshots not appearing in report

**Solution**: Ensure screenshot paths are relative to the report directory or use absolute paths.

### Issue: Mock data not matching API contract

**Solution**: Update mock data in `create_mock_data()` method to match current API responses.

## Next Steps

- Review the Chrome DevTools MCP documentation for available tools
- Create test scenarios using these helpers
- Refer to `E2E_CHROME_SETUP.md` for browser setup instructions
