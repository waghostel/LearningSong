# Browser Connection and Navigation Utilities Guide

## Overview

This guide explains how to use the browser connection and navigation utilities added to `e2e_helpers.py`. These utilities help verify prerequisites and provide instructions for navigating the application during E2E testing with Chrome DevTools MCP.

## Quick Start

```python
from tests.e2e_helpers import (
    verify_chrome_running,
    verify_frontend_running,
    connect_to_browser,
    navigate_to_page,
    get_page_url
)

# 1. Check prerequisites
chrome_ok, chrome_msg = verify_chrome_running()
frontend_ok, frontend_msg = verify_frontend_running()

if chrome_ok and frontend_ok:
    # 2. Connect to browser (returns instructions for MCP)
    conn_instructions = connect_to_browser()
    
    # 3. Navigate to a page (returns instructions for MCP)
    nav_instructions = navigate_to_page("page-a")
```

## Prerequisites Verification

### Check Chrome Remote Debugging

```python
from tests.e2e_helpers import verify_chrome_running

is_running, message = verify_chrome_running()

if is_running:
    print(f"✓ {message}")
    # Example: "Chrome is running with remote debugging: Chrome/120.0.6099.109"
else:
    print(f"✗ {message}")
    # Example: "Cannot connect to Chrome on port 9222. Please start Chrome with: chrome --remote-debugging-port=9222"
```

**What it checks:**
- Attempts to connect to `http://localhost:9222/json/version`
- Verifies Chrome DevTools Protocol is accessible
- Returns browser version information if successful

**If it fails:**
- Start Chrome with remote debugging: `chrome --remote-debugging-port=9222`
- On Windows: `"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222`
- On macOS: `/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222`

### Check Frontend Dev Server

```python
from tests.e2e_helpers import verify_frontend_running

is_running, message = verify_frontend_running()

if is_running:
    print(f"✓ {message}")
    # Example: "Frontend dev server is running at http://localhost:5173"
else:
    print(f"✗ {message}")
    # Example: "Cannot connect to frontend server at http://localhost:5173. Please start the dev server with: cd frontend && pnpm dev"
```

**What it checks:**
- Attempts to connect to `http://localhost:5173`
- Verifies the frontend dev server is responding
- Returns success if server returns HTTP 200

**If it fails:**
- Start the frontend dev server:
  ```bash
  cd frontend
  pnpm dev
  ```

### Check All Prerequisites

```python
from tests.e2e_helpers import ChromeDevToolsHelper

helper = ChromeDevToolsHelper()
success, issues = helper.verify_prerequisites()

if success:
    print("✓ All prerequisites met!")
else:
    print("✗ Issues found:")
    for issue in issues:
        print(f"  - {issue}")
```

**What it checks:**
- Report directory exists and is writable
- Chrome is running with remote debugging
- Frontend dev server is running

## Browser Connection

### Get Connection Instructions

```python
from tests.e2e_helpers import connect_to_browser

conn_instructions = connect_to_browser()

print(conn_instructions["instructions"])
# "Use Chrome DevTools MCP to connect to the browser. The browser should be running with remote debugging on port 9222..."

# Follow the steps
for step in conn_instructions["steps"]:
    print(step)
# 1. Call mcp_chrome_devtools_list_pages to see available browser pages
# 2. Call mcp_chrome_devtools_select_page with the appropriate page index
# 3. Verify connection by taking a snapshot or screenshot
```

**Using with Chrome DevTools MCP:**

1. List available pages:
   ```python
   # Use MCP tool: mcp_chrome_devtools_list_pages
   ```

2. Select a page:
   ```python
   # Use MCP tool: mcp_chrome_devtools_select_page(pageIdx=0)
   ```

3. Verify connection:
   ```python
   # Use MCP tool: mcp_chrome_devtools_take_snapshot()
   ```

## Navigation Utilities

### Get Page URLs

```python
from tests.e2e_helpers import get_page_url

# Get URLs for different pages
home_url = get_page_url("home")        # http://localhost:5173/
page_a_url = get_page_url("page-a")    # http://localhost:5173/
page_b_url = get_page_url("page-b")    # http://localhost:5173/lyrics-editing
page_c_url = get_page_url("page-c")    # http://localhost:5173/song-playback
```

**Page Mappings:**
- `home` or `page-a`: `/` (Text Input Page)
- `page-b`: `/lyrics-editing` (Lyrics Editing Page)
- `page-c`: `/song-playback` (Song Playback Page)

### Navigate to a Page

```python
from tests.e2e_helpers import navigate_to_page

nav_instructions = navigate_to_page(
    page="page-a",
    timeout=30,
    wait_for_load=True
)

print(f"URL: {nav_instructions['url']}")
print(f"Timeout: {nav_instructions['timeout']}s")
print(f"Instructions: {nav_instructions['instructions']}")
```

**Using with Chrome DevTools MCP:**

```python
# Use MCP tool: mcp_chrome_devtools_navigate_page
# Parameters:
#   type="url"
#   url=nav_instructions["url"]
#   timeout=nav_instructions["timeout"] * 1000  # Convert to milliseconds
```

### Navigate with Retry Logic

```python
from tests.e2e_helpers import ChromeDevToolsHelper

helper = ChromeDevToolsHelper()
retry_instructions = helper.retry_navigation(
    page="page-b",
    max_retries=3,
    timeout=30
)

print(f"Max Retries: {retry_instructions['max_retries']}")
print(f"Retry Strategy: {retry_instructions['retry_strategy']}")
# {"initial_delay": 2, "backoff_multiplier": 1.5, "max_delay": 10}
```

**Retry Strategy:**
- First retry: Wait 2 seconds
- Second retry: Wait 3 seconds (2 * 1.5)
- Third retry: Wait 4.5 seconds (3 * 1.5)
- Maximum delay: 10 seconds

### Wait for Page Load

```python
from tests.e2e_helpers import ChromeDevToolsHelper

helper = ChromeDevToolsHelper()
wait_instructions = helper.wait_for_page_load(timeout=30)

print(wait_instructions["verification_script"])
# JavaScript function to check if page is loaded
```

**Using with Chrome DevTools MCP:**

```python
# Use MCP tool: mcp_chrome_devtools_evaluate_script
# Parameters:
#   function=wait_instructions["verification_script"]
# Returns: True if document.readyState === 'complete'
```

### Wait for Element

```python
from tests.e2e_helpers import ChromeDevToolsHelper

helper = ChromeDevToolsHelper()
wait_instructions = helper.wait_for_element(
    selector="textarea",
    timeout=10,
    visible=True  # Wait for element to be visible
)

print(f"Selector: {wait_instructions['selector']}")
print(f"Timeout: {wait_instructions['timeout']}s")
print(wait_instructions["verification_script"])
```

**Using with Chrome DevTools MCP:**

```python
# Use MCP tool: mcp_chrome_devtools_evaluate_script
# Parameters:
#   function=wait_instructions["verification_script"]
# Returns: True if element exists and is visible
```

### Verify Page Loaded

```python
from tests.e2e_helpers import ChromeDevToolsHelper

helper = ChromeDevToolsHelper()
verify_instructions = helper.verify_page_loaded(
    page="page-a",
    expected_elements=None  # Uses defaults for page-a
)

print(f"Expected Elements: {verify_instructions['expected_elements']}")
# ['textarea', 'button']
```

**Default Expected Elements:**
- `page-a`: `["textarea", "button"]`
- `page-b`: `["textarea", "select", "button"]`
- `page-c`: `["audio", "button"]`

**Using with Chrome DevTools MCP:**

```python
# Use MCP tool: mcp_chrome_devtools_evaluate_script
# Parameters:
#   function=verify_instructions["verification_script"]
# Returns: {success: bool, results: [{selector, found}]}
```

## Complete Example

Here's a complete example of using all the utilities together:

```python
from tests.e2e_helpers import ChromeDevToolsHelper
import time

def run_e2e_test():
    """Complete E2E test with all utilities."""
    helper = ChromeDevToolsHelper()
    
    # Step 1: Verify prerequisites
    print("Step 1: Checking prerequisites...")
    success, issues = helper.verify_prerequisites()
    
    if not success:
        print("✗ Prerequisites not met:")
        for issue in issues:
            print(f"  - {issue}")
        return False
    
    print("✓ All prerequisites met!")
    
    # Step 2: Connect to browser
    print("\nStep 2: Connecting to browser...")
    conn_instructions = helper.connect_to_browser()
    print(conn_instructions["instructions"])
    
    # TODO: Use Chrome DevTools MCP tools:
    # - mcp_chrome_devtools_list_pages
    # - mcp_chrome_devtools_select_page(pageIdx=0)
    
    # Step 3: Navigate to Page A
    print("\nStep 3: Navigating to Page A...")
    nav_instructions = helper.navigate_to_page("page-a", timeout=30)
    print(f"Navigating to: {nav_instructions['url']}")
    
    # TODO: Use Chrome DevTools MCP tool:
    # - mcp_chrome_devtools_navigate_page(type="url", url=nav_instructions["url"])
    
    # Step 4: Wait for page load
    print("\nStep 4: Waiting for page load...")
    wait_instructions = helper.wait_for_page_load(timeout=30)
    
    # TODO: Use Chrome DevTools MCP tool:
    # - mcp_chrome_devtools_evaluate_script(function=wait_instructions["verification_script"])
    
    # Step 5: Verify page loaded correctly
    print("\nStep 5: Verifying page loaded...")
    verify_instructions = helper.verify_page_loaded("page-a")
    print(f"Checking for elements: {verify_instructions['expected_elements']}")
    
    # TODO: Use Chrome DevTools MCP tool:
    # - mcp_chrome_devtools_evaluate_script(function=verify_instructions["verification_script"])
    
    # Step 6: Take screenshot
    print("\nStep 6: Taking screenshot...")
    filename = helper.generate_screenshot_filename("page-a", "initial-load")
    screenshot_path = helper.get_screenshot_path("page-a", filename)
    print(f"Screenshot path: {screenshot_path}")
    
    # TODO: Use Chrome DevTools MCP tool:
    # - mcp_chrome_devtools_take_screenshot(filePath=screenshot_path)
    
    print("\n✓ Test completed successfully!")
    return True

if __name__ == "__main__":
    run_e2e_test()
```

## Testing the Utilities

Run the test script to verify the utilities work:

```bash
cd backend/tests
python test_browser_connection.py
```

This will:
1. Check if Chrome is running with remote debugging
2. Check if the frontend dev server is running
3. Display page URLs
4. Show navigation instructions
5. Show connection instructions
6. Demonstrate all helper methods

## Troubleshooting

### Chrome not detected

**Problem:** `verify_chrome_running()` returns False

**Solutions:**
1. Start Chrome with remote debugging:
   ```bash
   chrome --remote-debugging-port=9222
   ```

2. Check if Chrome is already running without remote debugging:
   - Close all Chrome instances
   - Start Chrome with the remote debugging flag

3. Verify the port is not blocked:
   - Try accessing `http://localhost:9222/json/version` in a browser

### Frontend server not detected

**Problem:** `verify_frontend_running()` returns False

**Solutions:**
1. Start the frontend dev server:
   ```bash
   cd frontend
   pnpm dev
   ```

2. Check if the server is running on a different port:
   - Look for the port number in the terminal output
   - Update `frontend_port` in `ChromeDevToolsHelper` if needed

3. Check for port conflicts:
   - Ensure port 5173 is not being used by another application

### Navigation fails

**Problem:** Navigation instructions don't work

**Solutions:**
1. Verify the page URL is correct:
   ```python
   url = get_page_url("page-a")
   print(url)  # Should be http://localhost:5173/
   ```

2. Check if the frontend server is running:
   ```python
   is_running, msg = verify_frontend_running()
   print(msg)
   ```

3. Increase the timeout:
   ```python
   nav_instructions = navigate_to_page("page-a", timeout=60)
   ```

## Next Steps

1. Review the [E2E Helpers Guide](./E2E_HELPERS_GUIDE.md) for more utilities
2. Check the [Chrome Setup Guide](./E2E_CHROME_SETUP.md) for browser configuration
3. Start implementing test scenarios using these utilities
4. Refer to the [E2E Test Guide](./E2E_TEST_GUIDE.md) for complete test examples

## API Reference

### Functions

- `verify_chrome_running() -> Tuple[bool, str]`
- `verify_frontend_running() -> Tuple[bool, str]`
- `get_page_url(page: str) -> str`
- `navigate_to_page(page: str, timeout: int = 30) -> Dict[str, Any]`
- `connect_to_browser() -> Dict[str, Any]`

### ChromeDevToolsHelper Methods

- `verify_chrome_running() -> Tuple[bool, str]`
- `verify_frontend_running() -> Tuple[bool, str]`
- `verify_prerequisites() -> Tuple[bool, List[str]]`
- `get_page_url(page: str) -> str`
- `navigate_to_page(page: str, timeout: int = 30, wait_for_load: bool = True) -> Dict[str, Any]`
- `wait_for_page_load(timeout: int = 30, check_interval: float = 0.5) -> Dict[str, Any]`
- `wait_for_element(selector: str, timeout: int = 10, visible: bool = True) -> Dict[str, Any]`
- `connect_to_browser() -> Dict[str, Any]`
- `retry_navigation(page: str, max_retries: int = 3, timeout: int = 30) -> Dict[str, Any]`
- `verify_page_loaded(page: str, expected_elements: Optional[List[str]] = None) -> Dict[str, Any]`
