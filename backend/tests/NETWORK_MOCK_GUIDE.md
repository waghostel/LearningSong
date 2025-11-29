# Network Interception and Mocking Guide

## Overview

This guide explains how to use the network interception and mocking system for E2E testing with Chrome DevTools MCP. The system allows you to intercept and mock API requests and WebSocket connections during testing, providing consistent and repeatable test scenarios without requiring backend services.

## Architecture

The network mocking system uses **JavaScript injection** as the primary strategy. This approach:

1. Injects JavaScript code into the browser page
2. Overrides `window.fetch` and `XMLHttpRequest` to intercept requests
3. Overrides `window.WebSocket` to mock WebSocket connections
4. Returns mock responses based on configured rules
5. Falls back to real requests if no mock rule matches

## Key Components

### 1. NetworkMockManager

The main class for managing network mocks.

```python
from tests.e2e_network_mock import NetworkMockManager

# Create a manager
manager = NetworkMockManager()

# Add mock rules
manager.add_lyrics_generation_mock(response_type="success")
manager.add_song_generation_mock(response_type="queued")

# Get injection instructions
instructions = manager.get_injection_instructions()
```

### 2. RequestPattern

Defines patterns for matching network requests.

```python
from tests.e2e_network_mock import RequestPattern

# Match by URL contains
pattern = RequestPattern(
    url_pattern="/api/lyrics/generate",
    method="POST",
    match_type="contains"
)

# Match by exact URL
pattern = RequestPattern(
    url_pattern="http://localhost:5173/api/lyrics/generate",
    method="POST",
    match_type="exact"
)

# Match by regex
pattern = RequestPattern(
    url_pattern=r"/api/(lyrics|songs)/generate",
    method="POST",
    match_type="regex"
)
```

### 3. MockResponse

Defines the mock response to return.

```python
from tests.e2e_network_mock import MockResponse

response = MockResponse(
    status=200,
    body={"lyrics": "test lyrics", "content_hash": "abc123"},
    headers={"Content-Type": "application/json"},
    delay_ms=100  # Simulate network delay
)
```

### 4. MockRule

Combines a pattern and response into a rule.

```python
from tests.e2e_network_mock import MockRule, RequestPattern, MockResponse

pattern = RequestPattern("/api/lyrics/generate", "POST", "contains")
response = MockResponse(200, {"lyrics": "test"})
rule = MockRule(pattern, response, enabled=True)
```

## Quick Start

### Setup Happy Path Mocks

```python
from tests.e2e_network_mock import setup_happy_path_mocks, inject_network_mocks

# Create manager with happy path mocks
manager = setup_happy_path_mocks()

# Get injection instructions
instructions = inject_network_mocks(manager)

# Use with Chrome DevTools MCP:
# 1. Call mcp_chrome_devtools_evaluate_script(function=instructions["script"])
# 2. Verify injection with instructions["verification_script"]
```

### Setup Error Scenario Mocks

```python
from tests.e2e_network_mock import setup_error_scenario_mocks, inject_network_mocks

# Create manager with error mocks
manager = setup_error_scenario_mocks("rate_limit")

# Get injection instructions
instructions = inject_network_mocks(manager)

# Inject into browser
# mcp_chrome_devtools_evaluate_script(function=instructions["script"])
```

### Setup WebSocket Mocks

```python
from tests.e2e_network_mock import inject_websocket_mocks

# Get WebSocket injection instructions
instructions = inject_websocket_mocks(sequence_type="success")

# Inject into browser
# mcp_chrome_devtools_evaluate_script(function=instructions["script"])
```

## Usage Examples

### Example 1: Mock Lyrics Generation API

```python
from tests.e2e_network_mock import NetworkMockManager, MockResponse

manager = NetworkMockManager()

# Add mock for successful lyrics generation
manager.add_lyrics_generation_mock(
    response_type="success",
    with_search=False
)

# Get injection script
instructions = manager.get_injection_instructions()
script = instructions["script"]

# Inject using Chrome DevTools MCP
# mcp_chrome_devtools_evaluate_script(function=script)
```

### Example 2: Mock Song Generation with Error

```python
from tests.e2e_network_mock import NetworkMockManager

manager = NetworkMockManager()

# Add mock for rate limit error
manager.add_error_mock(
    endpoint="/api/songs/generate",
    error_type="rate_limit",
    method="POST"
)

# Get injection script
instructions = manager.get_injection_instructions()

# Inject using Chrome DevTools MCP
# mcp_chrome_devtools_evaluate_script(function=instructions["script"])
```

### Example 3: Mock WebSocket Status Updates

```python
from tests.e2e_network_mock import NetworkMockManager

manager = NetworkMockManager()

# Get WebSocket mock script
instructions = manager.get_websocket_injection_instructions(
    sequence_type="success"  # or "failed", "slow"
)

script = instructions["script"]

# Inject using Chrome DevTools MCP
# mcp_chrome_devtools_evaluate_script(function=script)
```

### Example 4: Custom Mock Rule

```python
from tests.e2e_network_mock import NetworkMockManager, MockResponse

manager = NetworkMockManager()

# Add custom mock rule
response = MockResponse(
    status=200,
    body={"custom": "data"},
    headers={"X-Custom-Header": "value"},
    delay_ms=500  # 500ms delay
)

manager.add_rule(
    url_pattern="/api/custom/endpoint",
    response=response,
    method="GET",
    match_type="contains"
)

# Get injection script
instructions = manager.get_injection_instructions()
```

## Complete E2E Test Example

Here's a complete example of using network mocks in an E2E test:

```python
from tests.e2e_helpers import ChromeDevToolsHelper
from tests.e2e_network_mock import setup_happy_path_mocks, inject_network_mocks

def test_complete_user_journey():
    """Test complete user journey with mocked APIs."""
    
    # Step 1: Setup
    helper = ChromeDevToolsHelper()
    
    # Verify prerequisites
    success, issues = helper.verify_prerequisites()
    if not success:
        print("Prerequisites not met:")
        for issue in issues:
            print(f"  - {issue}")
        return
    
    # Step 2: Setup network mocks
    manager = setup_happy_path_mocks()
    mock_instructions = inject_network_mocks(manager)
    
    # Step 3: Connect to browser
    # Use Chrome DevTools MCP:
    # - mcp_chrome_devtools_list_pages
    # - mcp_chrome_devtools_select_page(pageIdx=0)
    
    # Step 4: Navigate to application
    nav_instructions = helper.navigate_to_page("page-a")
    # Use Chrome DevTools MCP:
    # - mcp_chrome_devtools_navigate_page(type="url", url=nav_instructions["url"])
    
    # Step 5: Inject network mocks
    # Use Chrome DevTools MCP:
    # - mcp_chrome_devtools_evaluate_script(function=mock_instructions["script"])
    
    # Step 6: Verify mocks are injected
    # Use Chrome DevTools MCP:
    # - mcp_chrome_devtools_evaluate_script(function=mock_instructions["verification_script"])
    
    # Step 7: Perform test actions
    # - Fill text input
    # - Click submit button
    # - Verify navigation to Page B
    # - Edit lyrics
    # - Generate song
    # - Verify navigation to Page C
    
    # Step 8: Capture screenshots
    screenshot_path = helper.get_screenshot_path("page-a", "initial-load.png")
    # Use Chrome DevTools MCP:
    # - mcp_chrome_devtools_take_screenshot(filePath=screenshot_path)
    
    # Step 9: Check mock rule statistics
    stats = manager.get_rule_stats()
    print("Mock rule statistics:")
    for stat in stats:
        print(f"  {stat['url_pattern']}: {stat['hit_count']} hits")
```

## Available Mock Scenarios

### Lyrics Generation

- `success`: Successful lyrics generation without search
- `with_search`: Successful lyrics generation with Google search
- `error`: Server error response

### Song Generation

- `queued`: Song generation queued successfully
- `completed`: Song generation completed
- `error`: Server error response

### Error Types

- `rate_limit`: 429 rate limit exceeded
- `server_error`: 500 internal server error
- `timeout`: 504 gateway timeout
- `validation_empty_text`: 400 empty text validation error
- `validation_text_too_long`: 400 text too long validation error
- `validation_empty_lyrics`: 400 empty lyrics validation error
- `validation_lyrics_too_long`: 400 lyrics too long validation error
- `validation_lyrics_too_short`: 400 lyrics too short validation error
- `validation_no_style`: 400 no style selected validation error
- `unauthorized`: 401 authentication required
- `forbidden`: 403 permission denied
- `not_found`: 404 resource not found
- `network_offline`: Network connection lost

### WebSocket Sequences

- `success`: Successful song generation with progress updates
- `failed`: Song generation failed during processing
- `slow`: Slow generation with many progress updates

## Advanced Features

### Disable/Enable Rules

```python
manager = NetworkMockManager()
manager.add_lyrics_generation_mock()
manager.add_song_generation_mock()

# Disable a specific rule
manager.disable_rule("/api/lyrics/generate")

# Enable it again
manager.enable_rule("/api/lyrics/generate")
```

### Track Rule Usage

```python
manager = NetworkMockManager()
manager.add_lyrics_generation_mock()

# Get statistics
stats = manager.get_rule_stats()
for stat in stats:
    print(f"Pattern: {stat['url_pattern']}")
    print(f"Method: {stat['method']}")
    print(f"Enabled: {stat['enabled']}")
    print(f"Hit count: {stat['hit_count']}")
```

### Clear All Rules

```python
manager = NetworkMockManager()
manager.add_lyrics_generation_mock()
manager.add_song_generation_mock()

# Clear all rules
manager.clear_rules()
```

### Simulate Network Delay

```python
from tests.e2e_network_mock import NetworkMockManager, MockResponse

manager = NetworkMockManager()

response = MockResponse(
    status=200,
    body={"lyrics": "test"},
    delay_ms=2000  # 2 second delay
)

manager.add_rule(
    url_pattern="/api/lyrics/generate",
    response=response,
    method="POST"
)
```

## Verification

### Verify Mocks Are Injected

```python
from tests.e2e_network_mock import verify_mocks_injected

# Get verification script
verification_script = verify_mocks_injected()

# Use with Chrome DevTools MCP:
# result = mcp_chrome_devtools_evaluate_script(function=verification_script)
# 
# Expected result:
# {
#     "networkMockInjected": true,
#     "websocketMockInjected": true
# }
```

### Check Console for Mock Messages

After injecting mocks, the browser console will show messages like:

```
[MOCK] Network mocking initialized with 2 rules
[MOCK] Intercepted fetch: POST http://localhost:5173/api/lyrics/generate
[MOCK] WebSocket mocking initialized with 5 messages
[MOCK] WebSocket connection intercepted: ws://localhost:8000/ws
```

## Troubleshooting

### Mocks Not Working

1. **Verify injection**: Check that `window.__networkMockInjected === true`
2. **Check console**: Look for `[MOCK]` messages in browser console
3. **Verify URL patterns**: Ensure patterns match actual request URLs
4. **Check method**: Ensure HTTP method matches (GET, POST, etc.)

### WebSocket Mocks Not Working

1. **Verify injection**: Check that `window.__websocketMockInjected === true`
2. **Check console**: Look for WebSocket mock messages
3. **Timing**: Ensure mocks are injected before WebSocket connection is created

### Requests Still Going to Real Backend

1. **Pattern matching**: Verify URL pattern matches the request
2. **Rule enabled**: Check that rule is enabled
3. **Injection timing**: Inject mocks before navigating to the page

## Best Practices

1. **Inject before navigation**: Always inject mocks before navigating to the application page
2. **Use specific patterns**: Use specific URL patterns to avoid unintended matches
3. **Verify injection**: Always verify mocks are injected successfully
4. **Check statistics**: Use rule statistics to verify mocks are being used
5. **Clear between tests**: Clear rules between test scenarios
6. **Simulate delays**: Add realistic network delays for better testing
7. **Test error scenarios**: Test both success and error scenarios
8. **Monitor console**: Watch browser console for mock activity

## Integration with Chrome DevTools MCP

The network mocking system is designed to work seamlessly with Chrome DevTools MCP tools:

1. **Connect to browser**: `mcp_chrome_devtools_list_pages`, `mcp_chrome_devtools_select_page`
2. **Navigate**: `mcp_chrome_devtools_navigate_page`
3. **Inject mocks**: `mcp_chrome_devtools_evaluate_script`
4. **Verify injection**: `mcp_chrome_devtools_evaluate_script`
5. **Take screenshots**: `mcp_chrome_devtools_take_screenshot`
6. **Monitor network**: `mcp_chrome_devtools_list_network_requests`
7. **Check console**: `mcp_chrome_devtools_list_console_messages`

## Requirements Covered

This network mocking system covers the following requirements:

- **1.4**: Mock API responses for lyrics generation
- **1.5**: Mock error responses for error handling
- **2.6**: Mock song generation responses
- **2.7**: Mock WebSocket status updates
- **6.1**: Mock 500 server error responses
- **6.2**: Mock 429 rate limit error responses
- **6.3**: Mock network timeout responses
- **6.4**: Mock validation error responses

## Next Steps

After setting up network mocks, you can:

1. Implement Page A test scenarios (Task 6)
2. Implement Page B test scenarios (Task 7)
3. Implement Page C test scenarios (Task 8)
4. Implement WebSocket connectivity tests (Task 9)
5. Implement error handling tests (Task 11)

## References

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [E2E Helpers Guide](./E2E_HELPERS_GUIDE.md)
- [E2E Mock Data](./e2e_mock_data.py)
- [Browser Connection Guide](./BROWSER_CONNECTION_GUIDE.md)
