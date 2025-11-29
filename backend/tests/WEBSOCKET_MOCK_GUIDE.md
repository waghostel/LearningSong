# WebSocket Mocking Strategy Guide

## Overview

This guide explains the enhanced WebSocket mocking strategy for E2E testing with Chrome DevTools MCP. The system provides advanced capabilities for simulating WebSocket connections, including connection lifecycle management, message injection, failure scenarios, and reconnection behavior.

## Architecture

The WebSocket mocking system uses **JavaScript injection** to override the native `WebSocket` constructor in the browser. This approach:

1. Intercepts all WebSocket connection attempts
2. Simulates connection lifecycle (connecting → open → closing → closed)
3. Injects mock messages with configurable timing
4. Simulates connection failures and reconnection attempts
5. Falls back to real WebSocket if no mock configuration matches

## Key Components

### 1. WebSocketMockManager

The main class for managing WebSocket mocks.

```python
from tests.e2e_websocket_mock import WebSocketMockManager

# Create a manager
manager = WebSocketMockManager()

# Add WebSocket connection configuration
manager.add_song_generation_websocket(sequence_type="success")

# Get injection instructions
instructions = manager.get_injection_instructions()
```

### 2. WebSocketConnectionConfig

Defines configuration for a WebSocket connection mock.

```python
from tests.e2e_websocket_mock import WebSocketConnectionConfig, ConnectionBehavior

config = WebSocketConnectionConfig(
    url_pattern="/ws",
    behavior=ConnectionBehavior.NORMAL,
    connection_delay_ms=100,
    auto_reconnect=False,
    max_reconnect_attempts=3
)

# Add messages
config.add_message(
    data={"status": "queued", "progress": 0},
    delay_ms=1000
)
```

### 3. WebSocketMessage

Represents a message to be sent over the WebSocket.

```python
from tests.e2e_websocket_mock import WebSocketMessage

message = WebSocketMessage(
    data={"status": "processing", "progress": 50},
    delay_ms=1000,  # Delay before sending
    trigger_event="subscribe"  # Optional trigger
)
```

### 4. ConnectionBehavior

Enum defining different connection behaviors.

```python
from tests.e2e_websocket_mock import ConnectionBehavior

# Available behaviors:
ConnectionBehavior.NORMAL  # Normal connection and message flow
ConnectionBehavior.DELAYED_OPEN  # Slow connection establishment (3s delay)
ConnectionBehavior.IMMEDIATE_CLOSE  # Connection closes immediately
ConnectionBehavior.INTERMITTENT_FAILURE  # Connection drops and may reconnect
ConnectionBehavior.PERMANENT_FAILURE  # Connection fails permanently
```

## Quick Start

### Setup Song Generation WebSocket

```python
from tests.e2e_websocket_mock import setup_song_generation_websocket, inject_websocket_mocks

# Create manager with song generation mocks
manager = setup_song_generation_websocket(
    sequence_type="success",  # or "failed", "slow"
    behavior=ConnectionBehavior.NORMAL
)

# Get injection instructions
instructions = inject_websocket_mocks(manager)

# Inject using Chrome DevTools MCP:
# mcp_chrome_devtools_evaluate_script(function=instructions["script"])
```

### Setup Connection Failure Scenario

```python
from tests.e2e_websocket_mock import setup_connection_failure_scenario

# Create manager with failure scenario
manager = setup_connection_failure_scenario()

# Get injection instructions
instructions = manager.get_injection_instructions()

# Inject using Chrome DevTools MCP
# mcp_chrome_devtools_evaluate_script(function=instructions["script"])
```

### Setup Reconnection Scenario

```python
from tests.e2e_websocket_mock import setup_reconnection_scenario

# Create manager with reconnection behavior
manager = setup_reconnection_scenario(max_attempts=3)

# Get injection instructions
instructions = manager.get_injection_instructions()

# Inject using Chrome DevTools MCP
# mcp_chrome_devtools_evaluate_script(function=instructions["script"])
```

## Usage Examples

### Example 1: Normal Song Generation Flow

```python
from tests.e2e_websocket_mock import WebSocketMockManager, ConnectionBehavior

manager = WebSocketMockManager()

# Add song generation WebSocket with success sequence
config = manager.add_song_generation_websocket(
    sequence_type="success",
    behavior=ConnectionBehavior.NORMAL
)

# Get injection script
instructions = manager.get_injection_instructions()
script = instructions["script"]

# Inject using Chrome DevTools MCP
# mcp_chrome_devtools_evaluate_script(function=script)
```

### Example 2: Slow Generation with Progress Updates

```python
from tests.e2e_websocket_mock import WebSocketMockManager

manager = WebSocketMockManager()

# Add slow generation sequence (more progress updates)
config = manager.add_song_generation_websocket(
    sequence_type="slow",
    behavior=ConnectionBehavior.NORMAL
)

# Messages will be sent with 1500ms delays
instructions = manager.get_injection_instructions()
```

### Example 3: Connection Failure After 2 Messages

```python
from tests.e2e_websocket_mock import WebSocketMockManager

manager = WebSocketMockManager()

# Add connection that fails after 2 messages
config = manager.add_connection_failure_scenario(
    url_pattern="/ws",
    failure_after_messages=2
)

instructions = manager.get_injection_instructions()
```

### Example 4: Auto-Reconnection on Failure

```python
from tests.e2e_websocket_mock import WebSocketMockManager

manager = WebSocketMockManager()

# Add connection with auto-reconnection
config = manager.add_reconnection_scenario(
    url_pattern="/ws",
    max_attempts=3
)

# Connection will automatically attempt to reconnect up to 3 times
instructions = manager.get_injection_instructions()
```

### Example 5: Custom Message Sequence

```python
from tests.e2e_websocket_mock import WebSocketMockManager, ConnectionBehavior

manager = WebSocketMockManager()

# Add custom connection
config = manager.add_connection(
    url_pattern="/ws/custom",
    behavior=ConnectionBehavior.NORMAL
)

# Add custom messages
config.add_message(
    data={"type": "init", "message": "Connection established"},
    delay_ms=100
)
config.add_message(
    data={"type": "update", "progress": 25},
    delay_ms=1000
)
config.add_message(
    data={"type": "update", "progress": 50},
    delay_ms=1000
)
config.add_message(
    data={"type": "complete", "result": "success"},
    delay_ms=1000
)

instructions = manager.get_injection_instructions()
```

## Connection Behaviors

### NORMAL

Normal connection establishment and message flow.

```python
manager.add_connection(
    url_pattern="/ws",
    behavior=ConnectionBehavior.NORMAL,
    connection_delay_ms=100  # Opens after 100ms
)
```

**Behavior:**
- Connection opens after specified delay (default 100ms)
- Messages are sent according to their delays
- Connection remains open until closed by application

### DELAYED_OPEN

Slow connection establishment (simulates network latency).

```python
manager.add_connection(
    url_pattern="/ws",
    behavior=ConnectionBehavior.DELAYED_OPEN
)
```

**Behavior:**
- Connection takes 3 seconds to open
- Useful for testing loading states
- Messages sent normally after connection opens

### IMMEDIATE_CLOSE

Connection closes immediately after creation.

```python
manager.add_connection(
    url_pattern="/ws",
    behavior=ConnectionBehavior.IMMEDIATE_CLOSE
)
```

**Behavior:**
- Connection closes within 10ms
- `onerror` event is triggered
- `onclose` event is triggered with code 1006
- No messages are sent

### INTERMITTENT_FAILURE

Connection drops during message transmission.

```python
manager.add_connection_failure_scenario(
    url_pattern="/ws",
    failure_after_messages=2
)
```

**Behavior:**
- Connection opens normally
- Sends specified number of messages
- Connection drops unexpectedly
- Can trigger auto-reconnection if configured

### PERMANENT_FAILURE

Connection never opens (simulates server unavailable).

```python
manager.add_connection(
    url_pattern="/ws",
    behavior=ConnectionBehavior.PERMANENT_FAILURE
)
```

**Behavior:**
- Connection attempt fails
- `onerror` event is triggered
- `onclose` event is triggered with code 1006
- No messages are sent

## Message Sequences

### Success Sequence

Complete song generation with progress updates.

```python
manager.add_song_generation_websocket(sequence_type="success")
```

**Messages:**
1. Queued (progress: 0%)
2. Processing (progress: 25%)
3. Processing (progress: 50%)
4. Processing (progress: 75%)
5. Completed (progress: 100%, includes song_url and song_id)

### Failed Sequence

Song generation that fails during processing.

```python
manager.add_song_generation_websocket(sequence_type="failed")
```

**Messages:**
1. Queued (progress: 0%)
2. Processing (progress: 25%)
3. Failed (includes error message)

### Slow Sequence

Song generation with more frequent progress updates.

```python
manager.add_song_generation_websocket(sequence_type="slow")
```

**Messages:**
1. Queued (progress: 0%)
2. Processing (progress: 10%)
3. Processing (progress: 20%)
4. Processing (progress: 35%)
5. Processing (progress: 50%)
6. Processing (progress: 65%)
7. Processing (progress: 80%)
8. Processing (progress: 95%)
9. Completed (progress: 100%)

## Advanced Features

### Multiple WebSocket Connections

```python
manager = WebSocketMockManager()

# Add multiple connections with different patterns
manager.add_connection(url_pattern="/ws/songs")
manager.add_connection(url_pattern="/ws/lyrics")
manager.add_connection(url_pattern="/ws/status")

# All connections will be mocked independently
instructions = manager.get_injection_instructions()
```

### Simulate Connection Failure

Manually trigger connection failure for testing.

```python
manager = WebSocketMockManager()
manager.add_song_generation_websocket()

# Get script to simulate failure
failure_script = manager.simulate_connection_failure()

# Inject using Chrome DevTools MCP
# mcp_chrome_devtools_evaluate_script(function=failure_script)
```

### Simulate Reconnection

Manually trigger reconnection for testing.

```python
manager = WebSocketMockManager()
manager.add_reconnection_scenario("/ws")

# Get script to simulate reconnection
reconnect_script = manager.simulate_reconnection()

# Inject using Chrome DevTools MCP
# mcp_chrome_devtools_evaluate_script(function=reconnect_script)
```

### Clear All Connections

```python
manager = WebSocketMockManager()
manager.add_song_generation_websocket()
manager.add_connection_failure_scenario("/ws/status")

# Clear all configurations
manager.clear_connections()
```

## Verification

### Verify WebSocket Mocks Are Injected

```python
from tests.e2e_websocket_mock import WebSocketMockManager

manager = WebSocketMockManager()
manager.add_song_generation_websocket()

instructions = manager.get_injection_instructions()

# Get verification script
verification_script = instructions["verification_script"]

# Use with Chrome DevTools MCP:
# result = mcp_chrome_devtools_evaluate_script(function=verification_script)
# 
# Expected result:
# {
#     "injected": true,
#     "activeConnections": 0  # or number of active connections
# }
```

### Check Console for Mock Messages

After injecting mocks, the browser console will show messages like:

```
[MOCK] WebSocket mocking initialized with 1 configurations
[MOCK] WebSocket connection intercepted: ws://localhost:8000/ws
[MOCK] Behavior: normal
[MOCK] WebSocket connection opened
[MOCK] Sending message: {status: "queued", progress: 0}
[MOCK] Sending message: {status: "processing", progress: 25}
[MOCK] Sending message: {status: "completed", progress: 100}
```

## Complete E2E Test Example

```python
from tests.e2e_helpers import ChromeDevToolsHelper
from tests.e2e_websocket_mock import setup_song_generation_websocket, inject_websocket_mocks

def test_song_generation_with_websocket():
    """Test song generation with WebSocket status updates."""
    
    # Step 1: Setup
    helper = ChromeDevToolsHelper()
    
    # Step 2: Setup WebSocket mocks
    ws_manager = setup_song_generation_websocket(sequence_type="success")
    ws_instructions = inject_websocket_mocks(ws_manager)
    
    # Step 3: Connect to browser
    # Use Chrome DevTools MCP:
    # - mcp_chrome_devtools_list_pages
    # - mcp_chrome_devtools_select_page(pageIdx=0)
    
    # Step 4: Navigate to Page B (Lyrics Editing)
    nav_instructions = helper.navigate_to_page("page-b")
    # Use Chrome DevTools MCP:
    # - mcp_chrome_devtools_navigate_page(type="url", url=nav_instructions["url"])
    
    # Step 5: Inject WebSocket mocks
    # Use Chrome DevTools MCP:
    # - mcp_chrome_devtools_evaluate_script(function=ws_instructions["script"])
    
    # Step 6: Verify injection
    # Use Chrome DevTools MCP:
    # - mcp_chrome_devtools_evaluate_script(function=ws_instructions["verification_script"])
    
    # Step 7: Trigger song generation
    # - Click generate button
    # - WebSocket connection will be intercepted
    # - Mock messages will be sent automatically
    
    # Step 8: Verify progress updates
    # - Check that progress tracker updates
    # - Verify navigation to Page C on completion
    
    # Step 9: Capture screenshots
    screenshot_path = helper.get_screenshot_path("page-b", "websocket-progress.png")
    # Use Chrome DevTools MCP:
    # - mcp_chrome_devtools_take_screenshot(filePath=screenshot_path)
```

## Integration with Chrome DevTools MCP

The WebSocket mocking system integrates seamlessly with Chrome DevTools MCP:

1. **Connect to browser:**
   - `mcp_chrome_devtools_list_pages`
   - `mcp_chrome_devtools_select_page`

2. **Navigate to application:**
   - `mcp_chrome_devtools_navigate_page`

3. **Inject WebSocket mocks:**
   - `mcp_chrome_devtools_evaluate_script(function=injection_script)`

4. **Verify injection:**
   - `mcp_chrome_devtools_evaluate_script(function=verification_script)`

5. **Simulate failures (optional):**
   - `mcp_chrome_devtools_evaluate_script(function=failure_script)`

6. **Monitor console:**
   - `mcp_chrome_devtools_list_console_messages`

## Requirements Covered

This WebSocket mocking strategy covers the following requirements:

- ✅ **2.7**: Mock WebSocket status updates during song generation
- ✅ **4.1**: Mock WebSocket connection establishment and status indicators
- ✅ **4.2**: Mock real-time status updates during song generation
- ✅ **4.3**: Mock WebSocket connection failure and offline indicator
- ✅ **4.4**: Mock WebSocket reconnection after failure
- ✅ **4.5**: Mock automatic navigation on generation completion

## Troubleshooting

### WebSocket Mocks Not Working

1. **Verify injection**: Check that `window.__websocketMockInjected === true`
2. **Check console**: Look for `[MOCK]` messages in browser console
3. **Verify URL pattern**: Ensure pattern matches actual WebSocket URL
4. **Timing**: Inject mocks before WebSocket connection is created

### Messages Not Appearing

1. **Check connection state**: Verify connection opened successfully
2. **Check message delays**: Ensure delays are reasonable
3. **Check console**: Look for "Sending message" logs
4. **Verify onmessage handler**: Ensure application has message handler

### Reconnection Not Working

1. **Check auto_reconnect**: Verify it's set to `True`
2. **Check max_attempts**: Ensure attempts haven't been exceeded
3. **Check reconnect_delay**: Verify delay is reasonable
4. **Check console**: Look for reconnection attempt logs

## Best Practices

1. **Inject before connection**: Always inject mocks before WebSocket connection is created
2. **Use realistic delays**: Use delays that match real-world scenarios
3. **Test all sequences**: Test success, failure, and slow sequences
4. **Verify injection**: Always verify mocks are injected successfully
5. **Monitor console**: Watch browser console for mock activity
6. **Test reconnection**: Test both successful and failed reconnection attempts
7. **Clear between tests**: Clear connections between test scenarios
8. **Use appropriate behaviors**: Choose behavior that matches test scenario

## Next Steps

With the WebSocket mocking strategy complete, you can:

1. Implement Page B test scenarios with WebSocket mocks (Task 7)
2. Implement WebSocket connectivity test scenarios (Task 9)
3. Test real-time status updates during song generation
4. Test connection failure and recovery scenarios
5. Test offline indicator behavior

## References

- [WebSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [E2E Helpers Guide](./E2E_HELPERS_GUIDE.md)
- [Network Mock Guide](./NETWORK_MOCK_GUIDE.md)
- [E2E Mock Data](./e2e_mock_data.py)
