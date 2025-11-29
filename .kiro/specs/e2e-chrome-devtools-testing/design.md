# Design Document

## Overview

This design document outlines the architecture and implementation strategy for end-to-end testing of the LearningSong application using Chrome DevTools MCP (Model Context Protocol). The testing framework will verify all three pages (Text Input, Lyrics Editing, Song Playback) function correctly with mocked API responses, providing comprehensive validation of the user journey in a real browser environment.

The testing approach leverages Chrome DevTools MCP's browser automation capabilities to interact with the application as a real user would, while intercepting and mocking network requests to ensure consistent, repeatable test scenarios without requiring backend services.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Orchestrator                         │
│  (Kiro Agent with Chrome DevTools MCP)                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──────────────┬──────────────┬──────────────────┐
             ▼              ▼              ▼                  ▼
      ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐
      │  Chrome  │   │  Network │   │  Visual  │   │   Console    │
      │ Browser  │   │  Monitor │   │ Capture  │   │   Monitor    │
      └──────────┘   └──────────┘   └──────────┘   └──────────────┘
             │              │              │                  │
             └──────────────┴──────────────┴──────────────────┘
                                   │
                                   ▼
                        ┌────────────────────┐
                        │  LearningSong App  │
                        │  (localhost:5173)  │
                        └────────────────────┘
```

### Component Interaction Flow


1. **Test Orchestrator** (Kiro Agent) initiates test scenarios
2. **Chrome DevTools MCP** controls browser and monitors activity
3. **Network Interceptor** mocks API responses for consistent testing
4. **Application** runs in development mode with mocked data
5. **Visual Capture** takes screenshots at key states
6. **Console Monitor** tracks JavaScript errors and warnings
7. **Test Reporter** generates comprehensive test reports

### Testing Layers

**Layer 1: Browser Automation**
- Navigate pages, click buttons, fill forms
- Simulate user interactions (typing, scrolling, clicking)
- Handle keyboard shortcuts and accessibility features

**Layer 2: Network Mocking**
- Intercept API requests to `/api/lyrics/generate`
- Intercept API requests to `/api/songs/generate`
- Mock WebSocket connections for real-time updates
- Simulate various response scenarios (success, errors, timeouts)

**Layer 3: Visual Verification**
- Capture screenshots of UI states
- Verify element visibility and positioning
- Check responsive design at different viewports
- Document visual states for regression testing

**Layer 4: Console Monitoring**
- Track JavaScript errors and exceptions
- Monitor console warnings
- Verify no critical errors during user flows

## Components and Interfaces

### 1. Test Orchestrator

**Responsibility**: Coordinate test execution and manage test scenarios

**Key Functions**:
- `runFullUserJourney()`: Execute complete A→B→C flow
- `testPageA()`: Test Text Input Page functionality
- `testPageB()`: Test Lyrics Editing Page functionality
- `testPageC()`: Test Song Playback Page functionality
- `setupMockAPIs()`: Configure network interception
- `generateTestReport()`: Create comprehensive test report

### 2. Mock API Manager

**Responsibility**: Provide consistent mock responses for API calls

**Mock Data Structure**:

```typescript
interface MockLyricsResponse {
  lyrics: string
  content_hash: string
  word_count: number
  search_used: boolean
}

interface MockSongGenerationResponse {
  task_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  message: string
}

interface MockWebSocketUpdate {
  task_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  song_url?: string
  song_id?: string
  error?: string
}

interface MockSongData {
  id: string
  audio_url: string
  title: string
  style: string
  duration: number
  created_at: string
  lyrics: string
}
```

**Mock Scenarios**:
- Success flow: Valid responses for all API calls
- Validation errors: Empty lyrics, too long lyrics
- Rate limit errors: 429 responses with retry information
- Server errors: 500 responses for error handling
- Network timeouts: Delayed responses to test timeout handling
- WebSocket failures: Connection drops and reconnection

### 3. Browser Controller

**Responsibility**: Control browser via Chrome DevTools MCP

**Key Operations**:
- `navigateTo(url)`: Navigate to specific page
- `fillInput(selector, value)`: Fill form fields
- `clickElement(selector)`: Click buttons/links
- `waitForElement(selector)`: Wait for element to appear
- `takeSnapshot()`: Capture page state
- `takeScreenshot(filename)`: Save visual evidence
- `getNetworkRequests()`: Retrieve network activity
- `getConsoleLogs()`: Retrieve console messages
- `emulateViewport(width, height)`: Test responsive design

### 4. Visual Verification System

**Responsibility**: Capture and organize visual evidence

**Screenshot Organization**:
```
report/
└── e2e-chrome-devtools-testing/
    ├── page-a/
    │   ├── 01-initial-load.png
    │   ├── 02-text-input-filled.png
    │   ├── 03-validation-error.png
    │   └── 04-generating-lyrics.png
    ├── page-b/
    │   ├── 01-lyrics-loaded.png
    │   ├── 02-lyrics-edited.png
    │   ├── 03-style-selected.png
    │   ├── 04-progress-tracker.png
    │   └── 05-error-state.png
    ├── page-c/
    │   ├── 01-song-loaded.png
    │   ├── 02-playing-state.png
    │   └── 03-metadata-display.png
    └── responsive/
        ├── mobile-375px.png
        ├── tablet-768px.png
        └── desktop-1920px.png
```

### 5. Test Reporter

**Responsibility**: Generate comprehensive test reports

**Report Structure**:

```markdown
# E2E Test Report - [Timestamp]

## Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Duration: Xm Ys

## Test Results

### Page A: Text Input
✓ Initial load displays all UI elements
✓ Text input validation works correctly
✗ Error handling for API failures
  - Expected: Error message displayed
  - Actual: No error message shown
  - Screenshot: page-a/03-validation-error.png

### Page B: Lyrics Editing
[Test results...]

### Page C: Song Playback
[Test results...]

## Network Activity
- Total Requests: X
- Failed Requests: Y
- Average Response Time: Xms

## Console Errors
[List of errors found]

## Visual Evidence
[Links to screenshots]
```

## Data Models

### Test Scenario Model

```typescript
interface TestScenario {
  id: string
  name: string
  description: string
  page: 'A' | 'B' | 'C' | 'full-journey'
  steps: TestStep[]
  mockData: MockDataConfig
  expectedOutcome: ExpectedOutcome
}

interface TestStep {
  action: 'navigate' | 'fill' | 'click' | 'wait' | 'verify' | 'screenshot'
  target?: string  // CSS selector or URL
  value?: string   // For fill actions
  timeout?: number // For wait actions
  description: string
}

interface MockDataConfig {
  lyricsResponse?: MockLyricsResponse
  songGenerationResponse?: MockSongGenerationResponse
  webSocketUpdates?: MockWebSocketUpdate[]
  errorScenario?: 'rate-limit' | 'server-error' | 'timeout' | 'validation'
}

interface ExpectedOutcome {
  pageUrl?: string
  elementsVisible?: string[]  // CSS selectors
  elementsHidden?: string[]
  consoleErrors?: number
  networkRequests?: number
}
```

### Test Result Model

```typescript
interface TestResult {
  scenarioId: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  timestamp: string
  screenshots: string[]
  networkLogs: NetworkLog[]
  consoleLogs: ConsoleLog[]
  error?: TestError
}

interface NetworkLog {
  url: string
  method: string
  status: number
  duration: number
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  requestBody?: unknown
  responseBody?: unknown
}

interface ConsoleLog {
  level: 'log' | 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  stackTrace?: string
}

interface TestError {
  message: string
  stack?: string
  screenshot?: string
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid text input enables submission

*For any* text content with word count between 1 and 10,000 words, when entered into the text input area, the submit button should be enabled.

**Validates: Requirements 1.2**

### Property 2: Valid submission navigates to Page B

*For any* valid text content submitted with mocked API success response, the application should navigate to Page B and display the generated lyrics.

**Validates: Requirements 1.4**

### Property 3: API errors display appropriate messages

*For any* mocked API error response (rate limit, server error, timeout, validation), the application should display a user-friendly error message corresponding to the error type.

**Validates: Requirements 1.5**

### Property 4: Lyrics editing updates character count

*For any* edit made to the lyrics content, the character count display should update in real-time to reflect the current length.

**Validates: Requirements 2.2**

### Property 5: Style selection updates UI

*For any* music style selected from the dropdown (Pop, Rap, Folk, Electronic, Rock, Jazz, Children's, Classical), the UI should reflect the selected style.

**Validates: Requirements 2.5**

### Property 6: Valid lyrics initiate song generation

*For any* valid lyrics (50-3000 characters) with selected style and mocked API success response, clicking generate should initiate the generation process and eventually navigate to Page C.

**Validates: Requirements 2.6**

### Property 7: WebSocket updates display progress

*For any* mocked WebSocket status update received during song generation, the progress tracker should display the updated status and progress percentage.

**Validates: Requirements 2.7, 4.2**

### Property 8: Volume adjustment changes audio level

*For any* volume level set via the volume slider (0-100), the audio playback volume should match the selected level.

**Validates: Requirements 3.4**

### Property 9: Viewport changes adapt layout

*For any* viewport size change, the application layout should adapt responsively without breaking functionality or causing layout issues.

**Validates: Requirements 5.4**

### Property 10: Touch targets meet minimum size on mobile

*For any* interactive element displayed on mobile viewport (375px width), the touch target size should meet minimum accessibility requirements (44x44px).

**Validates: Requirements 5.5**

### Property 11: Validation errors show field-specific messages

*For any* validation error triggered (empty lyrics, too long lyrics, invalid characters), the application should display a field-specific error message that clearly indicates the issue.

**Validates: Requirements 6.4**

### Property 12: Error recovery clears error state

*For any* error state entered (API error, validation error, network error), when the user takes corrective action, the application should clear the error message and restore normal functionality.

**Validates: Requirements 6.5**

### Property 13: Data preservation across page transitions

*For any* user input or generated content, when navigating between pages (A→B→C), the data should be preserved and accessible on the destination page.

**Validates: Requirements 10.2**

### Property 14: State management during navigation

*For any* page transition in the user journey, the application state (Zustand stores) should maintain consistency and not lose critical data.

**Validates: Requirements 10.3**


## Error Handling

### Browser-Level Errors

**Connection Failures**
- Chrome DevTools MCP cannot connect to browser
- Solution: Verify Chrome is running with remote debugging enabled on port 9222
- Fallback: Provide clear error message with setup instructions

**Page Load Failures**
- Application fails to load at localhost:5173
- Solution: Verify frontend development server is running
- Fallback: Attempt to start dev server automatically or provide instructions

**Navigation Timeouts**
- Page navigation exceeds timeout threshold
- Solution: Increase timeout for slow operations
- Retry: Attempt navigation up to 3 times before failing

### Application-Level Errors

**Element Not Found**
- Expected UI element is not present on page
- Solution: Wait with retry logic (up to 10 seconds)
- Fallback: Take screenshot and fail test with clear error message

**Unexpected Error States**
- Application displays unexpected error messages
- Solution: Capture error details, console logs, and screenshot
- Report: Include in test failure report for investigation

**State Inconsistencies**
- Application state doesn't match expected state
- Solution: Capture current state via JavaScript evaluation
- Report: Compare expected vs actual state in test report

### Network-Level Errors

**Mock Setup Failures**
- Unable to intercept network requests
- Solution: Verify Chrome DevTools Protocol network interception is enabled
- Fallback: Use alternative mocking strategy (service worker, proxy)

**WebSocket Mock Failures**
- Unable to mock WebSocket connections
- Solution: Use JavaScript injection to override WebSocket constructor
- Fallback: Test with real WebSocket server in mock mode

### Test Infrastructure Errors

**Screenshot Capture Failures**
- Unable to save screenshot to disk
- Solution: Verify report directory exists and is writable
- Fallback: Continue test execution without visual evidence

**Report Generation Failures**
- Unable to generate test report
- Solution: Log test results to console as fallback
- Ensure: Critical test data is not lost

## Testing Strategy

### Dual Testing Approach

This E2E testing framework complements the existing unit and integration tests by providing browser-based validation of the complete user experience. The testing strategy includes:

**Manual E2E Testing with Chrome DevTools MCP**
- Execute test scenarios interactively via Kiro Agent
- Verify visual appearance and user interactions
- Capture screenshots for documentation and regression testing
- Monitor network activity and console logs in real-time
- Validate complete user journeys with mocked APIs

**Test Execution Modes**

1. **Interactive Mode**: Kiro Agent executes tests step-by-step with human oversight
2. **Scenario Mode**: Execute predefined test scenarios automatically
3. **Exploratory Mode**: Use Chrome DevTools MCP to investigate issues and edge cases

### Test Scenarios

**Scenario 1: Happy Path - Complete User Journey**
- Navigate to Page A
- Enter valid educational content (500 words)
- Submit and verify navigation to Page B
- Review generated lyrics
- Select music style (Pop)
- Generate song and monitor progress
- Verify navigation to Page C
- Verify audio player and metadata display
- Test playback controls (play, pause, volume)

**Scenario 2: Validation Testing**
- Test empty input validation on Page A
- Test 10,000+ word limit on Page A
- Test empty lyrics validation on Page B
- Test 3,100+ character limit on Page B
- Test warning state (2,800-3,100 characters) on Page B

**Scenario 3: Error Handling**
- Test 500 server error response
- Test 429 rate limit error response
- Test network timeout handling
- Test WebSocket connection failure
- Test WebSocket reconnection after failure

**Scenario 4: Responsive Design**
- Test mobile viewport (375px)
- Test tablet viewport (768px)
- Test desktop viewport (1920px)
- Test viewport transitions
- Verify touch target sizes on mobile

**Scenario 5: Real-time Updates**
- Test WebSocket connection establishment
- Test progress updates during song generation
- Test completion notification
- Test offline indicator
- Test reconnection behavior

### Mock Data Strategy

**Lyrics Generation Mocks**
```typescript
const mockLyricsSuccess = {
  lyrics: "[Verse 1]\nLearning is a journey...",
  content_hash: "abc123def456",
  word_count: 150,
  search_used: false
}

const mockLyricsWithSearch = {
  lyrics: "[Verse 1]\nEnriched with context...",
  content_hash: "xyz789uvw012",
  word_count: 200,
  search_used: true
}
```

**Song Generation Mocks**
```typescript
const mockSongQueued = {
  task_id: "task_123",
  status: "queued",
  message: "Song generation queued"
}

const mockWebSocketUpdates = [
  { task_id: "task_123", status: "queued", progress: 0 },
  { task_id: "task_123", status: "processing", progress: 25 },
  { task_id: "task_123", status: "processing", progress: 50 },
  { task_id: "task_123", status: "processing", progress: 75 },
  { 
    task_id: "task_123", 
    status: "completed", 
    progress: 100,
    song_url: "https://mock-cdn.com/song.mp3",
    song_id: "song_456"
  }
]
```

**Error Scenario Mocks**
```typescript
const mockRateLimitError = {
  status: 429,
  detail: "Rate limit exceeded. You can generate 3 songs per day.",
  reset_time: "2025-11-29T00:00:00Z"
}

const mockServerError = {
  status: 500,
  detail: "Internal server error. Please try again later."
}

const mockValidationError = {
  status: 400,
  detail: "Lyrics must be between 50 and 3000 characters"
}
```

### Network Interception Strategy

**Using Chrome DevTools Protocol**

Chrome DevTools MCP provides network interception capabilities through the Chrome DevTools Protocol. The testing framework will:

1. Enable network interception before test execution
2. Define request patterns to intercept (e.g., `/api/lyrics/generate`, `/api/songs/generate`)
3. Provide mock responses for intercepted requests
4. Allow real requests for static assets (JS, CSS, images)
5. Monitor all network activity for verification

**Alternative: JavaScript Injection**

If network interception is not available, use JavaScript injection to mock API calls:

```typescript
// Inject mock API client
await evaluateScript(() => {
  window.__mockApiClient = {
    generateLyrics: async () => ({ /* mock data */ }),
    generateSong: async () => ({ /* mock data */ })
  }
  
  // Override real API client
  window.apiClient = window.__mockApiClient
})
```

### Visual Regression Testing

While this spec focuses on functional testing, the screenshot capture capability enables future visual regression testing:

1. Capture baseline screenshots during initial test run
2. Compare subsequent test run screenshots against baselines
3. Flag visual differences for human review
4. Update baselines when intentional UI changes are made

### Test Reporting

**Report Contents**:
- Test execution summary (passed/failed/skipped)
- Detailed test results for each scenario
- Screenshots organized by page and scenario
- Network activity logs
- Console error and warning logs
- Performance metrics (page load times, API response times)
- Recommendations for issues found

**Report Format**: Markdown file with embedded images and structured data

**Report Location**: `./report/e2e-chrome-devtools-testing/test-report-[timestamp].md`


## Implementation Considerations

### Prerequisites

**Browser Setup**
- Chrome/Chromium must be running with remote debugging enabled
- Command: `chrome --remote-debugging-port=9222`
- Verify connection at: `http://localhost:9222/json`

**Application Setup**
- Frontend development server must be running on port 5173
- Backend server is NOT required (all APIs will be mocked)
- Application should be in a clean state (no cached data)

**Chrome DevTools MCP Configuration**
- MCP server must be enabled in `.kiro/settings/mcp.json`
- Browser URL configured: `http://127.0.0.1:9222`
- Auto-approve permissions for common operations

### Test Execution Workflow

1. **Setup Phase**
   - Verify Chrome is running with remote debugging
   - Verify frontend dev server is running
   - Connect Chrome DevTools MCP to browser
   - Create report directory structure

2. **Test Phase**
   - Execute test scenarios sequentially or in parallel
   - Capture screenshots at key states
   - Monitor network and console activity
   - Record test results

3. **Teardown Phase**
   - Disconnect from browser (but don't close it)
   - Generate test report
   - Organize screenshots and logs
   - Display summary to user

### Limitations and Constraints

**Browser Limitations**
- Tests run in a real browser, so they're slower than unit tests
- Browser must remain open during test execution
- Only one test session can control the browser at a time

**Mocking Limitations**
- WebSocket mocking may require JavaScript injection
- Some browser APIs (notifications, file downloads) may behave differently
- Audio playback testing is limited (can verify controls, but not audio quality)

**Timing Considerations**
- Real browser rendering takes time
- Network interception adds latency
- Tests should use appropriate timeouts and waits

### Future Enhancements

**Automated Test Execution**
- Create reusable test scripts that can be executed on-demand
- Integrate with CI/CD pipeline for automated testing
- Schedule regular test runs to catch regressions

**Enhanced Mocking**
- Create a mock server that simulates backend behavior
- Support for more complex WebSocket scenarios
- Configurable delays and error rates for realistic testing

**Visual Regression Testing**
- Implement pixel-by-pixel screenshot comparison
- Automated baseline management
- Visual diff reporting

**Performance Testing**
- Measure and track page load times
- Monitor memory usage and resource consumption
- Identify performance bottlenecks

**Accessibility Testing**
- Verify ARIA attributes and roles
- Test keyboard navigation
- Check color contrast ratios
- Validate screen reader compatibility

## Technology Stack

**Testing Framework**: Chrome DevTools MCP (Model Context Protocol)
**Browser**: Chrome/Chromium with remote debugging
**Mocking Strategy**: Network interception via Chrome DevTools Protocol
**Screenshot Library**: Chrome DevTools Protocol screenshot API
**Report Format**: Markdown with embedded images
**Test Orchestration**: Kiro Agent with interactive execution

## Dependencies

**Required**:
- Chrome/Chromium browser
- Chrome DevTools MCP server (configured in `.kiro/settings/mcp.json`)
- Frontend development server (Vite on port 5173)

**Optional**:
- Backend server (not required, all APIs mocked)
- Image comparison tools (for future visual regression testing)

## Success Criteria

The E2E testing framework will be considered successful when:

1. All test scenarios can be executed reliably with mocked APIs
2. Screenshots are captured and organized for all major UI states
3. Network activity and console logs are monitored and reported
4. Test reports provide clear, actionable information about test results
5. The framework can detect regressions in the user journey
6. Tests can be executed on-demand by developers and QA engineers
7. The testing process is documented and easy to understand

## Maintenance and Evolution

**Regular Updates**:
- Update mock data when API contracts change
- Add new test scenarios for new features
- Update screenshots when UI changes intentionally
- Review and update test timeouts as needed

**Continuous Improvement**:
- Collect feedback from test execution
- Identify flaky tests and improve reliability
- Optimize test execution time
- Enhance error messages and reporting

**Documentation**:
- Maintain test scenario documentation
- Document mock data structures
- Provide troubleshooting guide for common issues
- Create video tutorials for test execution
