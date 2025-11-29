# Page B (Lyrics Editing) E2E Test Guide

## Overview

This guide provides comprehensive instructions for executing end-to-end tests for Page B (Lyrics Editing) using Chrome DevTools MCP. The tests validate lyrics editing, character count updates, validation states, style selection, song generation, and WebSocket progress updates.

## Prerequisites

### 1. Chrome Browser Setup
```bash
# Start Chrome with remote debugging enabled
chrome --remote-debugging-port=9222
```

### 2. Frontend Development Server
```bash
# In the frontend directory
cd frontend
pnpm dev
# Server should be running on http://localhost:5173
```

### 3. Verify Prerequisites
```bash
# In the backend directory
cd backend
poetry run pytest tests/test_e2e_page_b.py::TestPageBInitialLoad::test_page_b_loads_with_lyrics_data -v -s
```

## Test Scenarios

### Scenario 1: Initial Page Load with Lyrics Data

**Requirement**: 2.1 - Page load with mocked lyrics data and UI element visibility

**Steps**:
1. Navigate to Page A
2. Inject network mocks for lyrics generation
3. Submit text to generate lyrics
4. Verify navigation to Page B
5. Verify all UI elements are present (textarea, style selector, generate button)
6. Verify lyrics are displayed in the editor

**Expected Result**: Page B loads with generated lyrics, all UI elements visible

**Screenshots**: 
- `page-a/before-navigation-to-b-*.png`
- `page-b/initial-load-*.png`

---

### Scenario 2: Lyrics Editing with Character Count Updates

**Requirement**: 2.2 - Lyrics editing and real-time character count updates

**Property**: For any edit made to the lyrics content, the character count display updates in real-time

**Test Cases**:
- Short lyrics (100 characters)
- Medium lyrics (500 characters)
- Normal lyrics (1,500 characters)
- Long lyrics (2,500 characters)

**Steps**:
1. Clear textarea and enter test content
2. Verify character count updates immediately
3. Verify displayed count matches actual length
4. Capture screenshot for each length

**Expected Result**: Character count updates in real-time for all lengths

**Screenshots**: 
- `page-b/editing-short-*.png`
- `page-b/editing-medium-*.png`
- `page-b/editing-normal-*.png`
- `page-b/editing-long-*.png`

---

### Scenario 3: Error State (3,100+ Characters)

**Requirement**: 2.3 - 3,100+ character error state (edge case)

**Steps**:
1. Fill textarea with 3,101 characters
2. Verify error message is displayed
3. Verify error text mentions character limit
4. Verify generate button is disabled
5. Capture screenshot showing error state

**Expected Result**: Error message displayed, generate button disabled

**Screenshot**: `page-b/error-state-3100plus-*.png`

---

### Scenario 4: Warning State (2,800-3,100 Characters)

**Requirement**: 2.4 - 2,800-3,100 character warning state (edge case)

**Test Cases**:
- Lower bound: 2,800 characters
- Mid range: 2,950 characters
- Upper bound: 3,099 characters

**Steps**:
1. Fill textarea with test content in warning range
2. Verify warning message is displayed
3. Verify warning text indicates approaching limit
4. Verify generate button remains enabled
5. Capture screenshot for each test case

**Expected Result**: Warning displayed, button still enabled

**Screenshots**:
- `page-b/warning-state-2800-*.png`
- `page-b/warning-state-2950-*.png`
- `page-b/warning-state-3099-*.png`

---

### Scenario 5: Music Style Selection

**Requirement**: 2.5 - Music style selection for all available styles

**Property**: For any music style selected from the dropdown, the UI reflects the selected style

**Styles to Test**:
1. Pop
2. Rap
3. Folk
4. Electronic
5. Rock
6. Jazz
7. Children's
8. Classical

**Steps**:
1. Select each style from dropdown
2. Verify selected value matches
3. Verify UI updates to show selected style
4. Capture screenshot for each style

**Expected Result**: All styles can be selected, UI updates correctly

**Screenshots**: `page-b/style-{style}-*.png` (8 screenshots)

---

### Scenario 6: Song Generation with Valid Lyrics

**Requirement**: 2.6 - Song generation initiation with valid lyrics and mocked responses

**Steps**:
1. Inject network mocks for song generation API
2. Inject WebSocket mocks for progress updates
3. Ensure valid lyrics (500-2,000 characters) are present
4. Select a music style
5. Click generate button
6. Verify progress tracker appears
7. Monitor WebSocket updates
8. Verify navigation to Page C on completion

**Expected Result**: Generation initiates, progress updates received, navigates to Page C

**Screenshots**:
- `page-b/before-generation-*.png`
- `page-b/generating-*.png`
- `page-c/generation-complete-*.png`

---

### Scenario 7: WebSocket Progress Updates

**Requirement**: 2.7 - WebSocket progress updates during generation

**Property**: For any mocked WebSocket status update, the progress tracker displays the updated status and progress percentage

**Progress Stages**:
1. Queued (0%)
2. Processing (25%)
3. Processing (50%)
4. Processing (75%)
5. Completed (100%)

**Steps**:
1. Initiate song generation
2. Monitor progress tracker for each update
3. Verify status text updates
4. Verify progress percentage updates
5. Capture screenshot at each stage

**Expected Result**: Progress tracker updates for all stages

**Screenshots**:
- `page-b/progress-queued-*.png`
- `page-b/progress-processing-25-*.png`
- `page-b/progress-processing-50-*.png`
- `page-b/progress-processing-75-*.png`
- `page-b/progress-completed-*.png`

---

### Scenario 8: Navigation to Page C on Completion

**Requirement**: 2.6, 2.7 - Navigation to Page C when generation completes

**Steps**:
1. Complete song generation flow
2. Wait for 100% completion
3. Verify automatic navigation to Page C
4. Verify Page C URL
5. Verify Page C elements (audio player, metadata)

**Expected Result**: Automatic navigation to Page C with song data

**Screenshots**:
- `page-b/before-completion-*.png`
- `page-b/completing-*.png`
- `page-c/after-navigation-*.png`

---

## Chrome DevTools MCP Commands Reference

### Connection and Navigation
```javascript
// List available pages
mcp_chrome_devtools_list_pages()

// Select a page
mcp_chrome_devtools_select_page(pageIdx=0)

// Navigate to URL
mcp_chrome_devtools_navigate_page(type='url', url='http://localhost:5173')

// Wait for text to appear
mcp_chrome_devtools_wait_for(text='Lyrics', timeout=10000)
```

### Taking Snapshots and Screenshots
```javascript
// Take page snapshot
mcp_chrome_devtools_take_snapshot()

// Take screenshot
mcp_chrome_devtools_take_screenshot(filePath='./report/e2e-chrome-devtools-testing/page-b/test.png')
```

### Interacting with Elements
```javascript
// Fill input/textarea
mcp_chrome_devtools_fill(uid='<element-uid>', value='test content')

// Click element
mcp_chrome_devtools_click(uid='<element-uid>')
```

### Evaluating JavaScript
```javascript
// Execute JavaScript
mcp_chrome_devtools_evaluate_script(
  function=() => {
    const textarea = document.querySelector('textarea');
    return {
      length: textarea.value.length,
      content: textarea.value
    };
  }
)
```

### Injecting Mocks
```javascript
// Inject network mocks
mcp_chrome_devtools_evaluate_script(
  function=<network-mock-script>
)

// Inject WebSocket mocks
mcp_chrome_devtools_evaluate_script(
  function=<websocket-mock-script>
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

## Mock Data Reference

### Lyrics Mock
```python
MOCK_LYRICS_SUCCESS = {
    "lyrics": "[Verse 1]\nLearning is a journey...",
    "content_hash": "abc123def456ghi789",
    "word_count": 150,
    "search_used": False
}
```

### Song Generation Mock
```python
MOCK_SONG_GENERATION_QUEUED = {
    "task_id": "task_abc123def456",
    "status": "queued",
    "message": "Song generation queued successfully"
}
```

### WebSocket Update Sequence
```python
MOCK_WEBSOCKET_SEQUENCE_SUCCESS = [
    {"task_id": "task_abc123def456", "status": "queued", "progress": 0},
    {"task_id": "task_abc123def456", "status": "processing", "progress": 25},
    {"task_id": "task_abc123def456", "status": "processing", "progress": 50},
    {"task_id": "task_abc123def456", "status": "processing", "progress": 75},
    {
        "task_id": "task_abc123def456",
        "status": "completed",
        "progress": 100,
        "song_url": "https://mock-cdn.suno.ai/song_xyz789uvw012.mp3",
        "song_id": "song_xyz789uvw012"
    }
]
```

## Running Tests

### Run All Page B Tests
```bash
cd backend
poetry run pytest tests/test_e2e_page_b.py -v -s
```

### Run Specific Test Class
```bash
poetry run pytest tests/test_e2e_page_b.py::TestPageBLyricsEditing -v -s
```

### Run Specific Test Method
```bash
poetry run pytest tests/test_e2e_page_b.py::TestPageBStyleSelection::test_style_selection_all_styles -v -s
```

## Troubleshooting

### Chrome Not Connected
**Issue**: Cannot connect to Chrome on port 9222
**Solution**: 
```bash
# Ensure Chrome is running with remote debugging
chrome --remote-debugging-port=9222

# Verify connection
curl http://localhost:9222/json/version
```

### Frontend Not Running
**Issue**: Cannot connect to frontend at localhost:5173
**Solution**:
```bash
cd frontend
pnpm dev
# Verify server is running
curl http://localhost:5173
```

### Mocks Not Working
**Issue**: Network or WebSocket mocks not intercepting requests
**Solution**:
1. Verify injection: Check `window.__networkMockInjected` and `window.__websocketMockInjected`
2. Re-inject mocks if needed
3. Check browser console for mock logs (look for `[MOCK]` prefix)

### Elements Not Found
**Issue**: Cannot find UI elements with selectors
**Solution**:
1. Take a snapshot to see current page structure
2. Verify you're on the correct page
3. Wait for page load completion before interacting
4. Check element UIDs in snapshot output

### Navigation Not Working
**Issue**: Page doesn't navigate after generation
**Solution**:
1. Verify WebSocket mocks are injected
2. Check that completion message is sent
3. Monitor browser console for navigation errors
4. Verify application routing is working

## Expected Test Results

### Success Criteria
- All 8 test methods should generate instructions successfully
- Screenshots should be captured for all scenarios
- Mock data should be properly injected
- UI elements should be found and interacted with
- Navigation between pages should work correctly

### Test Report Location
```
./report/e2e-chrome-devtools-testing/
├── page-a/
│   └── before-navigation-to-b-*.png
├── page-b/
│   ├── initial-load-*.png
│   ├── editing-*.png
│   ├── error-state-*.png
│   ├── warning-state-*.png
│   ├── style-*.png
│   ├── before-generation-*.png
│   ├── generating-*.png
│   ├── progress-*.png
│   ├── before-completion-*.png
│   └── completing-*.png
└── page-c/
    ├── generation-complete-*.png
    └── after-navigation-*.png
```

## Additional Notes

- Tests are designed to be executed manually with Chrome DevTools MCP
- Each test prints detailed instructions for execution
- Screenshots provide visual evidence of test execution
- Mock data ensures consistent, repeatable test scenarios
- All tests are independent and can be run in any order
- WebSocket mocking simulates real-time updates without backend

## Next Steps

After completing Page B tests:
1. Review captured screenshots
2. Verify all requirements are covered
3. Document any issues found
4. Proceed to Page C (Song Playback) tests
5. Execute complete user journey test (A→B→C)
