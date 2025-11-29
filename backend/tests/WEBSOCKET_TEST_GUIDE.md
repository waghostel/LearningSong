# WebSocket Connectivity Test Guide

## Overview

This guide provides instructions for executing WebSocket connectivity E2E tests using Chrome DevTools MCP. These tests validate connection establishment, real-time updates, failure handling, reconnection, and automatic navigation.

## Prerequisites

### 1. Chrome Browser Setup
Start Chrome with remote debugging enabled:
```bash
chrome --remote-debugging-port=9222
```

Verify Chrome is running:
- Open: http://localhost:9222/json
- Should see list of open pages

### 2. Frontend Development Server
Start the frontend dev server:
```bash
cd frontend
pnpm dev
```

Verify frontend is running:
- Open: http://localhost:5173
- Should see the LearningSong application

### 3. Chrome DevTools MCP
Ensure Chrome DevTools MCP is configured in `.kiro/settings/mcp.json`

## Test Execution

### Running All WebSocket Tests
```bash
cd backend
poetry run pytest tests/test_e2e_websocket.py -v -s
```

### Running Individual Tests
```bash
# Test 1: Connection Establishment
poetry run pytest tests/test_e2e_websocket.py::TestWebSocketConnectionEstablishment -v -s

# Test 2: Real-time Updates
poetry run pytest tests/test_e2e_websocket.py::TestWebSocketRealtimeUpdates -v -s

# Test 3: Connection Failure
poetry run pytest tests/test_e2e_websocket.py::TestWebSocketConnectionFailure -v -s

# Test 4: Reconnection
poetry run pytest tests/test_e2e_websocket.py::TestWebSocketReconnection -v -s

# Test 5: Automatic Navigation
poetry run pytest tests/test_e2e_websocket.py::TestWebSocketAutomaticNavigation -v -s
```

## Test Scenarios

### Test 1: WebSocket Connection Establishment
**Validates**: Requirement 4.1

**What it tests**:
- WebSocket connection is established successfully
- Connection status indicator is displayed
- Connection state transitions from CONNECTING (0) to OPEN (1)

**Expected behavior**:
- Connection opens within 100-200ms
- Status indicator shows "Connecting..." then "Connected"
- No errors in console

**Screenshots captured**:
- Before connection
- During connection (connecting state)
- After connection (connected state)

### Test 2: Real-time Status Updates
**Validates**: Requirement 4.2

**What it tests**:
- Status updates are received in real-time
- Progress tracker displays current status and percentage
- Updates occur at expected intervals (~1 second)

**Expected behavior**:
- 5 progress updates: 0% → 25% → 50% → 75% → 100%
- Each update displays within 1-2 seconds
- Progress bar reflects current percentage
- Status text updates appropriately

**Screenshots captured**:
- Queued (0%)
- Processing (25%, 50%, 75%)
- Completed (100%)

### Test 3: Connection Failure
**Validates**: Requirement 4.3

**What it tests**:
- Connection failure is detected
- Offline indicator is displayed
- Error messaging is user-friendly

**Expected behavior**:
- Connection drops after 2 status updates
- Offline indicator appears immediately
- Error message explains connection was lost
- Suggests checking internet connection

**Screenshots captured**:
- Before failure (connected)
- During failure (connection dropping)
- After failure (offline indicator)

### Test 4: Reconnection
**Validates**: Requirement 4.4

**What it tests**:
- Automatic reconnection after failure
- Reconnection attempts (max 3)
- Status updates resume after reconnection

**Expected behavior**:
- Reconnection attempt starts within 2 seconds
- UI shows "Reconnecting..." status
- Connection re-establishes successfully
- Status updates continue from where they left off

**Screenshots captured**:
- Connected state
- Disconnected state
- Reconnecting state
- Reconnected state

### Test 5: Automatic Navigation
**Validates**: Requirement 4.5

**What it tests**:
- Automatic navigation to Page C on completion
- Navigation occurs without user interaction
- Page C loads with song data

**Expected behavior**:
- Navigation happens when status becomes "completed"
- No user click required
- Page C loads within 1-2 seconds
- Song data is available (audio player, metadata)

**Screenshots captured**:
- Page B start
- Page B mid-progress
- Page B completing
- Page C after navigation

## Chrome DevTools MCP Workflow

### Step 1: Connect to Browser
```javascript
// List available pages
mcp_chrome_devtools_list_pages()

// Select the page (usually index 0)
mcp_chrome_devtools_select_page(pageIdx=0)
```

### Step 2: Navigate to Application
```javascript
// Navigate to Page A (home)
mcp_chrome_devtools_navigate_page(
  type='url',
  url='http://localhost:5173'
)
```

### Step 3: Inject Mocks
Each test provides specific injection scripts. General pattern:

```javascript
// Inject network mocks
mcp_chrome_devtools_evaluate_script(
  function=<network_mock_script>
)

// Inject WebSocket mocks
mcp_chrome_devtools_evaluate_script(
  function=<websocket_mock_script>
)

// Verify injection
mcp_chrome_devtools_evaluate_script(
  function=() => {
    return {
      networkMock: window.__networkMockInjected === true,
      websocketMock: window.__websocketMockInjected === true
    };
  }
)
```

### Step 4: Execute Test Scenario
Follow the detailed instructions printed by each test.

### Step 5: Capture Screenshots
```javascript
mcp_chrome_devtools_take_screenshot(
  filePath='./report/e2e-chrome-devtools-testing/page-b/ws-connected.png'
)
```

## Verification Scripts

### Check WebSocket Connection State
```javascript
() => {
  const connections = window.__websocketMockConnections;
  if (!connections) return { error: 'No connections' };
  
  const wsArray = Array.from(connections.values());
  return {
    connectionCount: wsArray.length,
    connections: wsArray.map(ws => ({
      url: ws.url,
      readyState: ws.readyState,
      isOpen: ws.readyState === 1,
      isClosed: ws.readyState === 3
    }))
  };
}
```

### Check Progress Tracker
```javascript
() => {
  const progressEl = document.querySelector('[class*="progress"]');
  const statusEl = document.querySelector('[class*="status"]');
  const percentEl = document.querySelector('[class*="percent"]');
  
  return {
    hasProgressTracker: progressEl !== null,
    statusText: statusEl?.textContent || null,
    progressPercent: percentEl?.textContent || null
  };
}
```

### Check Offline Indicator
```javascript
() => {
  const offlineEl = document.querySelector('[class*="offline"], [class*="disconnected"]');
  const errorEl = document.querySelector('[role="alert"], .error');
  
  return {
    hasOfflineIndicator: offlineEl !== null,
    offlineText: offlineEl?.textContent || null,
    hasError: errorEl !== null,
    errorText: errorEl?.textContent || null
  };
}
```

### Check Navigation
```javascript
() => {
  return {
    pathname: window.location.pathname,
    isPageC: window.location.pathname.includes('playback') ||
             window.location.pathname.includes('song'),
    previousPage: document.referrer
  };
}
```

## Mock Data Configuration

### WebSocket Sequences

**Success Sequence** (5 updates):
```javascript
[
  { status: "queued", progress: 0 },
  { status: "processing", progress: 25 },
  { status: "processing", progress: 50 },
  { status: "processing", progress: 75 },
  { status: "completed", progress: 100, song_url: "...", song_id: "..." }
]
```

**Failed Sequence** (3 updates):
```javascript
[
  { status: "queued", progress: 0 },
  { status: "processing", progress: 25 },
  { status: "failed", progress: 25, error: "..." }
]
```

**Slow Sequence** (9 updates):
- More granular progress: 0%, 10%, 20%, 35%, 50%, 65%, 80%, 95%, 100%

### Connection Behaviors

- **NORMAL**: Standard connection flow (100ms delay)
- **DELAYED_OPEN**: 3-second connection delay
- **IMMEDIATE_CLOSE**: Connection closes immediately
- **INTERMITTENT_FAILURE**: Connection drops after 2 messages
- **PERMANENT_FAILURE**: Connection never opens

## Troubleshooting

### Chrome Not Running
**Error**: "Cannot connect to Chrome on port 9222"

**Solution**:
```bash
chrome --remote-debugging-port=9222
```

### Frontend Not Running
**Error**: "Cannot connect to frontend server at http://localhost:5173"

**Solution**:
```bash
cd frontend
pnpm dev
```

### WebSocket Mocks Not Working
**Issue**: WebSocket connections use real backend

**Solution**:
1. Verify injection: `window.__websocketMockInjected === true`
2. Check console for mock logs: `[MOCK] WebSocket connection intercepted`
3. Re-inject mocks if needed

### Screenshots Not Saving
**Issue**: Screenshots fail to save

**Solution**:
1. Verify report directory exists: `./report/e2e-chrome-devtools-testing/`
2. Check write permissions
3. Use absolute paths if relative paths fail

### Connection State Issues
**Issue**: readyState doesn't match expected value

**Solution**:
1. Wait for state transitions (use timeouts)
2. Check mock configuration
3. Verify connection behavior setting

## Screenshot Organization

Screenshots are saved to:
```
./report/e2e-chrome-devtools-testing/
├── page-b/
│   ├── ws-before-connection-*.png
│   ├── ws-connecting-*.png
│   ├── ws-connected-*.png
│   ├── ws-status-queued-*.png
│   ├── ws-status-processing-25-*.png
│   ├── ws-status-processing-50-*.png
│   ├── ws-status-processing-75-*.png
│   ├── ws-status-completed-*.png
│   ├── ws-connection-failure-*.png
│   ├── ws-offline-indicator-*.png
│   ├── ws-reconnecting-*.png
│   └── ws-reconnected-*.png
└── page-c/
    └── ws-nav-complete-*.png
```

## Expected Test Results

All 5 tests should PASS:
```
tests/test_e2e_websocket.py::TestWebSocketConnectionEstablishment::test_websocket_connection_establishment PASSED
tests/test_e2e_websocket.py::TestWebSocketRealtimeUpdates::test_realtime_status_updates PASSED
tests/test_e2e_websocket.py::TestWebSocketConnectionFailure::test_connection_failure_and_offline_indicator PASSED
tests/test_e2e_websocket.py::TestWebSocketReconnection::test_reconnection_after_failure PASSED
tests/test_e2e_websocket.py::TestWebSocketAutomaticNavigation::test_automatic_navigation_on_completion PASSED
```

## Additional Resources

- **E2E Helpers**: `backend/tests/e2e_helpers.py`
- **WebSocket Mock Manager**: `backend/tests/e2e_websocket_mock.py`
- **Mock Data**: `backend/tests/e2e_mock_data.py`
- **Network Mocks**: `backend/tests/e2e_network_mock.py`
- **Requirements**: `.kiro/specs/e2e-chrome-devtools-testing/requirements.md`
- **Design**: `.kiro/specs/e2e-chrome-devtools-testing/design.md`

## Summary

These WebSocket connectivity tests provide comprehensive validation of real-time communication features in the LearningSong application. By following this guide, you can execute all tests successfully and verify that WebSocket functionality works correctly across all scenarios: connection establishment, real-time updates, failure handling, reconnection, and automatic navigation.
