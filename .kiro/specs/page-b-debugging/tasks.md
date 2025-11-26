# Implementation Plan: Page B Debugging with Chrome DevTools MCP

## Prerequisites

- [ ] 0. Setup Environment
- [ ] 0.1 Start backend server
  - Run: `cd backend && poetry run uvicorn app.main:app --reload`
  - Verify server is running on port 8000
  - _Requirements: All_

- [ ] 0.2 Start frontend dev server
  - Run: `cd frontend && pnpm dev`
  - Verify server is running on port 5173
  - _Requirements: All_

- [ ] 0.3 Verify Chrome DevTools MCP is available
  - Check MCP server connection
  - Test basic `chrome_navigate` command
  - _Requirements: All_

---

## Phase 1: Page Load Verification

- [ ] 1. Verify Page Load and Initialization
- [ ] 1.1 Navigate to Page B via Page A flow
  - Use `chrome_navigate` to go to `http://localhost:5173`
  - Enter test content on Page A
  - Generate lyrics and navigate to Page B
  - Capture screenshot of Page B
  - _Requirements: 1.1_

- [ ] 1.2 Check console for errors on load
  - Use `chrome_console_messages` to capture all console output
  - Filter for error-level messages
  - Document any errors found
  - _Requirements: 1.1_

- [ ] 1.3 Verify Zustand store initialization
  - Use `chrome_evaluate` to inspect store state
  - Check `originalLyrics` is populated from navigation
  - Check `editedLyrics` matches `originalLyrics`
  - Check `selectedStyle` defaults to "pop"
  - Check `isGenerating` is false
  - _Requirements: 1.2_

- [ ] 1.4 Test direct URL access without state
  - Use `chrome_navigate` to go directly to `/lyrics-edit`
  - Verify redirect to Page A occurs
  - Check console for redirect logs
  - _Requirements: 1.3_

---

## Phase 2: Component State Debugging

- [ ] 2. Debug LyricsEditor Component
- [ ] 2.1 Verify character counter accuracy
  - Use `chrome_evaluate` to get textarea value length
  - Compare with displayed character count
  - Verify format shows "X / 3000"
  - _Requirements: 2.1_

- [ ] 2.2 Test character counter visual states
  - Use `chrome_evaluate` to set lyrics to 2500 chars (normal state)
  - Capture screenshot, verify normal styling
  - Set lyrics to 2800 chars (warning state)
  - Capture screenshot, verify warning styling (yellow/orange)
  - Set lyrics to 3100 chars (error state)
  - Capture screenshot, verify error styling (red)
  - _Requirements: 2.1_

- [ ] 2.3 Verify textarea accessibility attributes
  - Use `chrome_evaluate` to check aria-label
  - Check aria-describedby points to character counter
  - Verify focus indicators are visible
  - _Requirements: 2.1_

- [ ] 3. Debug StyleSelector Component
- [ ] 3.1 Verify dropdown options
  - Use `chrome_click` to open dropdown
  - Use `chrome_evaluate` to list all options
  - Verify 8 styles present: pop, rap, folk, electronic, rock, jazz, children, classical
  - _Requirements: 2.2_

- [ ] 3.2 Test style selection
  - Use `chrome_click` to select "rock" style
  - Use `chrome_evaluate` to verify store updated
  - Verify description text updates
  - Capture screenshot of selected state
  - _Requirements: 2.2_

- [ ] 4. Debug GenerateSongButton Component
- [ ] 4.1 Verify disabled states
  - Clear lyrics textarea
  - Use `chrome_evaluate` to check button disabled attribute
  - Set lyrics to 3100 chars (over limit)
  - Verify button is disabled
  - Set valid lyrics
  - Verify button is enabled
  - _Requirements: 2.3_

- [ ] 4.2 Test keyboard shortcut
  - Use `chrome_evaluate` to simulate Ctrl+Enter keypress
  - Verify generation starts (or check if shortcut is registered)
  - _Requirements: 2.3_

- [ ] 4.3 Verify loading state
  - Trigger song generation
  - Capture screenshot of loading spinner
  - Verify button shows loading indicator
  - _Requirements: 2.3_

- [ ] 5. Debug ProgressTracker Component
- [ ] 5.1 Verify initial state
  - Use `chrome_evaluate` to check progress tracker visibility
  - Verify shows "idle" or hidden when not generating
  - _Requirements: 2.4_

- [ ] 5.2 Test progress updates
  - Start song generation
  - Use `chrome_evaluate` to monitor progress value
  - Capture screenshots at different progress levels
  - Verify status messages update (queued → processing → completed)
  - _Requirements: 2.4_

- [ ] 5.3 Verify WebSocket connection indicator
  - Use `chrome_evaluate` to check connection status element
  - Verify shows "connected" when WebSocket is active
  - _Requirements: 2.4_

---

## Phase 3: WebSocket Connection Debugging

- [ ] 6. Debug WebSocket Connection
- [ ] 6.1 Monitor WebSocket connection establishment
  - Use `chrome_network_requests` to capture WebSocket upgrade
  - Verify connection to `/socket.io/` endpoint
  - Check authentication token is sent
  - _Requirements: 3.1_

- [ ] 6.2 Verify authentication handshake
  - Use `chrome_console_messages` to check Socket.IO logs
  - Verify "connected" event is logged
  - Check for any authentication errors
  - _Requirements: 3.1_

- [ ] 6.3 Monitor WebSocket messages
  - Start song generation
  - Use `chrome_console_messages` to capture status updates
  - Verify message format matches SongStatusUpdate schema
  - Log progress updates as they arrive
  - _Requirements: 3.2_

- [ ] 6.4 Test WebSocket disconnection handling
  - Use Chrome DevTools to simulate network offline
  - Verify disconnection is detected
  - Check console for reconnection attempts
  - Verify UI shows disconnected state
  - _Requirements: 3.3, 3.4_

- [ ] 6.5 Verify auto-reconnect behavior
  - After simulating offline, restore network
  - Verify WebSocket reconnects automatically
  - Check exponential backoff in retry timing
  - Verify UI updates to connected state
  - _Requirements: 3.3_

---

## Phase 4: API Request Debugging

- [ ] 7. Debug Song Generation API
- [ ] 7.1 Capture song generation request
  - Use `chrome_network_requests` to monitor `/api/songs/generate`
  - Trigger song generation
  - Capture request payload (lyrics, style, content_hash)
  - Verify Content-Type is application/json
  - Verify Authorization header is present
  - _Requirements: 4.1_

- [ ] 7.2 Verify response handling
  - Capture response from generate endpoint
  - Verify response contains task_id
  - Verify response contains estimated_time
  - Check response status is 200 or 201
  - _Requirements: 4.1_

- [ ] 7.3 Monitor status polling (fallback)
  - If WebSocket fails, verify polling starts
  - Use `chrome_network_requests` to capture `/api/songs/{task_id}` requests
  - Verify polling interval (should be ~5 seconds)
  - _Requirements: 4.2_

- [ ] 7.4 Test API error responses
  - Simulate rate limit by making multiple requests
  - Capture 429 response
  - Verify error message is displayed in UI
  - _Requirements: 4.3_

---

## Phase 5: Error Scenario Debugging

- [ ] 8. Debug Error Handling
- [ ] 8.1 Test network offline handling
  - Use Chrome DevTools to go offline
  - Attempt to generate song
  - Use `chrome_evaluate` to check offline indicator visibility
  - Verify error message is user-friendly
  - Capture screenshot of offline state
  - _Requirements: 5.1_

- [ ] 8.2 Test rate limit error handling
  - Generate 3 songs to hit rate limit
  - Attempt 4th generation
  - Verify rate limit message appears
  - Check countdown timer is displayed
  - Capture screenshot of rate limit state
  - _Requirements: 5.2_

- [ ] 8.3 Test lyrics validation errors
  - Set lyrics to empty string
  - Attempt generation
  - Verify validation error appears
  - Set lyrics to >3000 characters
  - Verify character limit error appears
  - Capture screenshots of validation errors
  - _Requirements: 5.3_

- [ ] 8.4 Test Suno API timeout handling
  - This requires backend modification or mock
  - Monitor for timeout after 90 seconds
  - Verify timeout error message appears
  - Verify retry option is available
  - _Requirements: 5.4_

---

## Phase 6: Visual Verification

- [ ] 9. Capture Visual Documentation
- [ ] 9.1 Capture component screenshots
  - Screenshot of full Page B layout
  - Screenshot of LyricsEditor in each state
  - Screenshot of StyleSelector dropdown open
  - Screenshot of ProgressTracker during generation
  - _Requirements: All_

- [ ] 9.2 Verify responsive layout
  - Use `chrome_evaluate` to resize viewport to mobile (375px)
  - Capture mobile screenshot
  - Resize to tablet (768px)
  - Capture tablet screenshot
  - Verify all components are accessible
  - _Requirements: All_

---

## Debugging Checklist Summary

- [ ] 10. Final Verification
- [ ] 10.1 Review all captured data
  - Compile console errors found
  - List network request issues
  - Document component state issues
  - Create summary of findings
  - _Requirements: All_

---

## Notes

- All debugging tasks use Chrome DevTools MCP tools
- Screenshots should be saved for documentation
- Console errors should be logged with timestamps
- Network requests should include timing data
- Store state snapshots should be captured at key points
- This is a manual debugging workflow, not automated tests

