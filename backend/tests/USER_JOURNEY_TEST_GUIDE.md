# Complete User Journey E2E Test Guide

This guide provides comprehensive instructions for executing the complete user journey test using Chrome DevTools MCP.

## Overview

The complete user journey test validates the full flow from Page A (Text Input) through Page B (Lyrics Editing) to Page C (Song Playback), ensuring:

- **Requirements 10.1**: Full journey through all three pages
- **Requirements 10.2**: Data preservation across page transitions
- **Requirements 10.3**: State management during navigation
- **Requirements 10.4**: All expected API calls are made
- **Requirements 7.1-7.5**: Screenshots at each major step

## Prerequisites

### 1. Chrome Browser with Remote Debugging

Start Chrome with remote debugging enabled:

```bash
# Windows
chrome.exe --remote-debugging-port=9222 --user-data-dir=C:\temp\chrome-debug

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

Verify Chrome is running:
- Open http://localhost:9222/json in another browser
- You should see a JSON response with browser information

### 2. Frontend Development Server

Start the frontend dev server:

```bash
cd frontend
pnpm dev
```

Verify the server is running:
- Open http://localhost:5173 in a browser
- You should see the LearningSong application

### 3. Chrome DevTools MCP Configuration

Ensure Chrome DevTools MCP is configured in `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-chrome-devtools"],
      "env": {
        "BROWSER_WS_ENDPOINT": "http://127.0.0.1:9222"
      }
    }
  }
}
```

## Test Execution

### Phase 1: Setup and Connection

#### Step 1.1: Connect to Browser

```
Use: mcp_chrome_devtools_list_pages
```

This will show all open pages in Chrome. Note the page index you want to use.

```
Use: mcp_chrome_devtools_select_page
Parameters:
  - pageIdx: <index from list_pages>
```

#### Step 1.2: Inject Network Mocks

The network mock script intercepts fetch and XMLHttpRequest to return mock responses.

```
Use: mcp_chrome_devtools_evaluate_script
Parameters:
  - function: <network_mock_script from test>
```

Verify injection:
```
Use: mcp_chrome_devtools_evaluate_script
Parameters:
  - function: () => { return window.__networkMockInjected === true; }
```

Expected result: `true`

#### Step 1.3: Inject WebSocket Mocks

The WebSocket mock script intercepts WebSocket connections to simulate status updates.

```
Use: mcp_chrome_devtools_evaluate_script
Parameters:
  - function: <websocket_mock_script from test>
```

Verify injection:
```
Use: mcp_chrome_devtools_evaluate_script
Parameters:
  - function: () => { return window.__websocketMockInjected === true; }
```

Expected result: `true`

### Phase 2: Page A - Text Input

#### Step 2.1: Navigate to Page A

```
Use: mcp_chrome_devtools_navigate_page
Parameters:
  - type: url
  - url: http://localhost:5173/
```

Wait for page load completion.

#### Step 2.2: Capture Initial Screenshot

```
Use: mcp_chrome_devtools_take_screenshot
Parameters:
  - filePath: ./report/e2e-chrome-devtools-testing/page-a/01-initial-load.png
```

#### Step 2.3: Take Snapshot to Find Elements

```
Use: mcp_chrome_devtools_take_snapshot
```

Look for:
- `textarea` element (for text input)
- `button` element (for submit button)

Note the `uid` values for these elements.

#### Step 2.4: Enter Educational Content

```
Use: mcp_chrome_devtools_fill
Parameters:
  - uid: <textarea_uid>
  - value: "Photosynthesis is the process by which plants convert light energy into chemical energy. This process occurs in the chloroplasts of plant cells..."
```

#### Step 2.5: Capture Screenshot After Content Entry

```
Use: mcp_chrome_devtools_take_screenshot
Parameters:
  - filePath: ./report/e2e-chrome-devtools-testing/page-a/02-content-entered.png
```

#### Step 2.6: Submit Content

```
Use: mcp_chrome_devtools_click
Parameters:
  - uid: <submit_button_uid>
```

Wait for navigation to Page B (URL should change to `/lyrics-editing`).

### Phase 3: Page B - Lyrics Editing

#### Step 3.1: Verify Page B Loaded

```
Use: mcp_chrome_devtools_take_snapshot
```

Verify:
- URL is `http://localhost:5173/lyrics-editing`
- `textarea` contains generated lyrics
- `select` element for music style is present
- Generate button is present

#### Step 3.2: Capture Screenshot of Lyrics

```
Use: mcp_chrome_devtools_take_screenshot
Parameters:
  - filePath: ./report/e2e-chrome-devtools-testing/page-b/03-lyrics-loaded.png
```

#### Step 3.3: Verify Lyrics Content

```
Use: mcp_chrome_devtools_evaluate_script
Parameters:
  - function: () => {
      const textarea = document.querySelector('textarea');
      return {
        lyricsPresent: textarea && textarea.value.length > 0,
        lyricsLength: textarea.value.length,
        lyricsPreview: textarea.value.substring(0, 100)
      };
    }
```

Expected:
- `lyricsPresent`: true
- `lyricsLength`: > 0
- `lyricsPreview`: Should match mock lyrics

#### Step 3.4: Select Music Style

```
Use: mcp_chrome_devtools_take_snapshot
```

Find the `select` element uid.

```
Use: mcp_chrome_devtools_fill
Parameters:
  - uid: <select_uid>
  - value: Pop
```

#### Step 3.5: Capture Screenshot After Style Selection

```
Use: mcp_chrome_devtools_take_screenshot
Parameters:
  - filePath: ./report/e2e-chrome-devtools-testing/page-b/04-style-selected.png
```

#### Step 3.6: Generate Song

```
Use: mcp_chrome_devtools_click
Parameters:
  - uid: <generate_button_uid>
```

#### Step 3.7: Monitor Progress

The WebSocket mock will automatically send progress updates. Capture screenshots at different stages:

```
Use: mcp_chrome_devtools_take_screenshot
Parameters:
  - filePath: ./report/e2e-chrome-devtools-testing/page-b/05-progress-queued.png
```

Wait 1-2 seconds between screenshots:

```
Use: mcp_chrome_devtools_take_screenshot
Parameters:
  - filePath: ./report/e2e-chrome-devtools-testing/page-b/05-progress-processing-25.png
```

Continue for 50%, 75%, and 100% progress.

#### Step 3.8: Wait for Navigation to Page C

After the final WebSocket message (status: completed), the app should automatically navigate to Page C.

### Phase 4: Page C - Song Playback

#### Step 4.1: Verify Page C Loaded

```
Use: mcp_chrome_devtools_take_snapshot
```

Verify:
- URL is `http://localhost:5173/song-playback`
- `audio` element is present
- Song metadata is displayed (title, style, duration)
- Play/pause button is present
- Volume control is present
- Download button is present

#### Step 4.2: Capture Screenshot of Song Page

```
Use: mcp_chrome_devtools_take_screenshot
Parameters:
  - filePath: ./report/e2e-chrome-devtools-testing/page-c/06-song-loaded.png
```

#### Step 4.3: Verify Song Metadata

```
Use: mcp_chrome_devtools_evaluate_script
Parameters:
  - function: () => {
      const audio = document.querySelector('audio');
      return {
        audioPresent: audio !== null,
        audioSrc: audio ? audio.src : null,
        // Add more checks based on actual UI structure
      };
    }
```

#### Step 4.4: Test Play Button

```
Use: mcp_chrome_devtools_click
Parameters:
  - uid: <play_button_uid>
```

#### Step 4.5: Capture Screenshot of Playing State

```
Use: mcp_chrome_devtools_take_screenshot
Parameters:
  - filePath: ./report/e2e-chrome-devtools-testing/page-c/07-playing.png
```

#### Step 4.6: Test Pause Button

```
Use: mcp_chrome_devtools_click
Parameters:
  - uid: <pause_button_uid>
```

#### Step 4.7: Test Volume Control

```
Use: mcp_chrome_devtools_fill
Parameters:
  - uid: <volume_slider_uid>
  - value: 50
```

### Phase 5: Verification

#### Step 5.1: Verify Data Preservation

```
Use: mcp_chrome_devtools_evaluate_script
Parameters:
  - function: () => {
      const textInputStore = window.__textInputStore__ || {};
      const lyricsEditingStore = window.__lyricsEditingStore__ || {};
      const songPlaybackStore = window.__songPlaybackStore__ || {};
      
      return {
        originalContent: textInputStore.content,
        generatedLyrics: lyricsEditingStore.lyrics,
        selectedStyle: lyricsEditingStore.selectedStyle,
        playbackLyrics: songPlaybackStore.lyrics,
        playbackStyle: songPlaybackStore.style,
        lyricsConsistent: lyricsEditingStore.lyrics === songPlaybackStore.lyrics,
        styleConsistent: lyricsEditingStore.selectedStyle === songPlaybackStore.style
      };
    }
```

Expected:
- `lyricsConsistent`: true
- `styleConsistent`: true

#### Step 5.2: Verify API Calls

```
Use: mcp_chrome_devtools_list_network_requests
```

Expected requests:
1. POST `/api/lyrics/generate`
2. POST `/api/songs/generate`

For each request:
```
Use: mcp_chrome_devtools_get_network_request
Parameters:
  - reqid: <request_id>
```

Verify:
- Request method and URL
- Request payload
- Response status code
- Response body

#### Step 5.3: Check Console for Errors

```
Use: mcp_chrome_devtools_list_console_messages
Parameters:
  - types: ["error", "warn"]
```

Expected: No critical errors

## Expected Results

### Data Preservation

| Data | Page A | Page B | Page C |
|------|--------|--------|--------|
| Original Content | Stored in textInputStore | - | - |
| Generated Lyrics | - | Stored in lyricsEditingStore | Preserved in songPlaybackStore |
| Selected Style | - | Stored in lyricsEditingStore | Preserved in songPlaybackStore |
| Song ID | - | - | Stored in songPlaybackStore |
| Audio URL | - | - | Stored in songPlaybackStore |

### API Calls

1. **POST /api/lyrics/generate**
   - Request: `{ content: "...", search_enabled: false }`
   - Response: `{ lyrics: "...", content_hash: "...", word_count: 150, search_used: false }`

2. **POST /api/songs/generate**
   - Request: `{ lyrics: "...", style: "Pop" }`
   - Response: `{ task_id: "...", status: "queued", message: "..." }`

3. **WebSocket Messages**
   - Message 1: `{ status: "queued", progress: 0 }`
   - Message 2: `{ status: "processing", progress: 25 }`
   - Message 3: `{ status: "processing", progress: 50 }`
   - Message 4: `{ status: "processing", progress: 75 }`
   - Message 5: `{ status: "completed", progress: 100, song_url: "...", song_id: "..." }`

### Screenshots

Total: 10-15 screenshots

- Page A: 2 screenshots (initial load, content entered)
- Page B: 6-7 screenshots (lyrics loaded, style selected, progress stages)
- Page C: 3-4 screenshots (song loaded, playing, paused, volume adjusted)

## Troubleshooting

### Chrome Connection Issues

**Problem**: Cannot connect to Chrome on port 9222

**Solution**:
1. Verify Chrome is running with `--remote-debugging-port=9222`
2. Check http://localhost:9222/json in another browser
3. Restart Chrome with the correct flags

### Frontend Server Issues

**Problem**: Cannot access http://localhost:5173

**Solution**:
1. Verify frontend dev server is running: `cd frontend && pnpm dev`
2. Check for port conflicts
3. Try accessing the URL in a regular browser first

### Mock Injection Issues

**Problem**: Mocks not working, real API calls are being made

**Solution**:
1. Verify mock injection scripts ran successfully
2. Check `window.__networkMockInjected` and `window.__websocketMockInjected`
3. Re-inject the mocks if needed
4. Refresh the page after injection

### Navigation Issues

**Problem**: Page doesn't navigate after submission

**Solution**:
1. Check console for JavaScript errors
2. Verify mock responses are correct
3. Check that the submit button was actually clicked
4. Verify the application's navigation logic

### Data Preservation Issues

**Problem**: Data is lost between page transitions

**Solution**:
1. Check if Zustand stores are properly configured
2. Verify state persistence mechanism (localStorage, sessionStorage)
3. Check browser console for state management errors
4. Verify the application's state management implementation

## Success Criteria

The test is successful when:

1. ✓ All three pages load correctly
2. ✓ User can input content on Page A
3. ✓ Content is submitted and lyrics are generated
4. ✓ Navigation to Page B occurs automatically
5. ✓ Generated lyrics are displayed on Page B
6. ✓ User can select music style
7. ✓ Song generation is initiated
8. ✓ Progress updates are displayed via WebSocket
9. ✓ Navigation to Page C occurs automatically
10. ✓ Song metadata and audio player are displayed
11. ✓ Playback controls work correctly
12. ✓ Data is preserved across all transitions
13. ✓ All expected API calls are made
14. ✓ No critical console errors
15. ✓ All screenshots are captured

## Report Generation

After completing the test, generate a report:

```python
from tests.e2e_helpers import create_helper

helper = create_helper()
report_path = helper.generate_test_report("user-journey-test-report.md")
print(f"Report generated: {report_path}")
```

The report will include:
- Test summary (passed/failed/skipped)
- Detailed test results
- Screenshots with descriptions
- Network activity logs
- Console messages
- Verification results
