# Chrome DevTools MCP Debugging Plan
## Page A: Text Input Page Feature Testing

**Application URL:** http://localhost:5173/  
**Backend API:** http://localhost:8000  
**Date Created:** November 24, 2025

---

## Overview

This document outlines a comprehensive debugging and testing plan for the Text Input Page features using Chrome DevTools MCP. The plan covers all user stories, functional requirements, and edge cases.

---

## Test Environment Setup

### Prerequisites
- ✅ Frontend running at http://localhost:5173/
- ✅ Backend running at http://localhost:8000
- Chrome DevTools MCP configured and connected
- Firebase authentication configured
- Test data prepared

### Initial Setup Steps
1. Navigate to http://localhost:5173/
2. Take initial snapshot to understand page structure
3. Verify Firebase anonymous authentication
4. Check initial rate limit status

---

## Test Suite

### 1. Page Load & Initial State Testing

**Objective:** Verify the page loads correctly and all components are present

**Test Steps:**
1. Navigate to http://localhost:5173/
2. Take page snapshot
3. Verify presence of:
   - Text input area (textarea)
   - Word counter display
   - Search toggle switch
   - Rate limit indicator
   - Generate button
4. Check console for errors
5. Verify network requests (Firebase auth, rate limit API)

**Expected Results:**
- Page loads within 2 seconds
- All components visible and accessible
- No console errors
- Firebase anonymous auth completes
- Rate limit shows "3/3 songs remaining today"

**MCP Tools to Use:**
- `navigate_page` - Load the application
- `take_snapshot` - Capture page structure
- `list_console_messages` - Check for errors
- `list_network_requests` - Verify API calls

---

### 2. Text Input Area Testing (US-1)

**Objective:** Test text input functionality and word counter

#### Test 2.1: Basic Text Input
**Steps:**
1. Take snapshot to identify textarea element
2. Click on textarea
3. Fill with sample text (100 words)
4. Verify word counter updates
5. Take screenshot

**Expected Results:**
- Textarea accepts input
- Word counter shows "100 / 10,000 words"
- No visual warnings

#### Test 2.2: Word Counter - Normal State
**Steps:**
1. Clear textarea
2. Fill with 5,000 words of content
3. Verify counter display
4. Check textarea styling (should be normal)

**Expected Results:**
- Counter shows "5,000 / 10,000 words"
- Textarea has normal border color
- No warning indicators

#### Test 2.3: Word Counter - Warning State
**Steps:**
1. Clear textarea
2. Fill with 9,500 words
3. Verify counter turns yellow/warning
4. Check textarea border color
5. Take screenshot

**Expected Results:**
- Counter shows "9,500 / 10,000 words"
- Warning visual indicator (yellow border)
- Generate button still enabled

#### Test 2.4: Word Counter - Error State
**Steps:**
1. Clear textarea
2. Fill with 10,500 words
3. Verify counter turns red/error
4. Check textarea border color
5. Verify generate button is disabled
6. Take screenshot

**Expected Results:**
- Counter shows "10,500 / 10,000 words" in red
- Error visual indicator (red border)
- Generate button disabled
- Error message displayed

#### Test 2.5: Empty Input
**Steps:**
1. Clear textarea completely
2. Verify generate button state
3. Try to click generate button

**Expected Results:**
- Counter shows "0 / 10,000 words"
- Generate button disabled
- No error message

**MCP Tools to Use:**
- `take_snapshot` - Identify elements
- `click` - Focus textarea
- `fill` - Enter text
- `take_screenshot` - Capture visual states
- `evaluate_script` - Check computed styles

---

### 3. Search Toggle Testing (US-2)

**Objective:** Test Google Search grounding toggle functionality

#### Test 3.1: Default State
**Steps:**
1. Take snapshot
2. Locate search toggle switch
3. Verify default state is OFF
4. Check tooltip text

**Expected Results:**
- Toggle is OFF by default
- Label reads "Enrich with Google Search"
- Tooltip explains the feature

#### Test 3.2: Toggle ON
**Steps:**
1. Click search toggle
2. Verify visual state changes
3. Check Zustand store state (via console)
4. Take screenshot

**Expected Results:**
- Toggle switches to ON
- Visual indicator shows enabled state
- Store state updated: `searchEnabled: true`

#### Test 3.3: Toggle OFF
**Steps:**
1. Click search toggle again
2. Verify returns to OFF state
3. Check store state

**Expected Results:**
- Toggle switches to OFF
- Store state updated: `searchEnabled: false`

#### Test 3.4: State Persistence
**Steps:**
1. Enable search toggle
2. Enter some text
3. Verify toggle state persists during session

**Expected Results:**
- Toggle state remains ON
- State persists in Zustand store

**MCP Tools to Use:**
- `take_snapshot` - Identify toggle
- `click` - Toggle switch
- `hover` - Show tooltip
- `evaluate_script` - Check store state
- `take_screenshot` - Capture states

---

### 4. Rate Limit Indicator Testing (US-3)

**Objective:** Test rate limit display and countdown functionality

#### Test 4.1: Initial Rate Limit Display
**Steps:**
1. Take snapshot
2. Locate rate limit indicator
3. Verify initial display
4. Check color coding

**Expected Results:**
- Shows "🎵 3/3 songs remaining today"
- Green color indicator
- No countdown timer visible

#### Test 4.2: Rate Limit API Call
**Steps:**
1. Monitor network requests
2. Find GET /api/user/rate-limit request
3. Inspect response data
4. Verify UI matches API response

**Expected Results:**
- API returns: `{remaining: 3, reset_time: "..."}`
- UI displays correct remaining count
- No errors in console

#### Test 4.3: After First Generation
**Steps:**
1. Generate lyrics (see Test 6)
2. Wait for completion
3. Check rate limit updates
4. Verify color changes

**Expected Results:**
- Shows "🎵 2/3 songs remaining today"
- Yellow color indicator
- Updates automatically

#### Test 4.4: Rate Limit Reached (0 remaining)
**Steps:**
1. Generate 3 songs total
2. Verify rate limit shows 0
3. Check countdown timer appears
4. Verify generate button disabled
5. Take screenshot

**Expected Results:**
- Shows "🎵 0/3 songs remaining today"
- Red color indicator
- Countdown timer visible
- Generate button disabled with message

**MCP Tools to Use:**
- `take_snapshot` - Identify indicator
- `list_network_requests` - Monitor API calls
- `get_network_request` - Inspect responses
- `evaluate_script` - Check component state
- `take_screenshot` - Capture states

---

### 5. Generate Button Testing (US-4)

**Objective:** Test generate button states and functionality

#### Test 5.1: Button Disabled States
**Steps:**
1. Test with empty content → button disabled
2. Test with >10,000 words → button disabled
3. Test with rate limit reached → button disabled
4. Test during generation → button disabled
5. Take screenshots of each state

**Expected Results:**
- Button disabled in all invalid states
- Appropriate tooltip/message shown
- Visual indication of disabled state

#### Test 5.2: Button Enabled State
**Steps:**
1. Enter valid content (100-9000 words)
2. Ensure rate limit available
3. Verify button enabled
4. Check button styling

**Expected Results:**
- Button enabled and clickable
- Proper styling (not grayed out)
- Hover effect works

#### Test 5.3: Keyboard Shortcut (Ctrl+Enter)
**Steps:**
1. Enter valid content
2. Focus textarea
3. Press Ctrl+Enter
4. Verify generation starts

**Expected Results:**
- Keyboard shortcut triggers generation
- Same behavior as clicking button

**MCP Tools to Use:**
- `take_snapshot` - Identify button
- `click` - Test button click
- `press_key` - Test keyboard shortcut
- `hover` - Check hover states
- `take_screenshot` - Capture states

---

### 6. Lyrics Generation Flow Testing (US-4, FR-3)

**Objective:** Test complete lyrics generation workflow

#### Test 6.1: Happy Path - Generate Lyrics
**Steps:**
1. Enter valid educational content (500 words)
2. Keep search toggle OFF
3. Click "Generate Lyrics" button
4. Monitor network requests
5. Watch loading progress
6. Wait for completion
7. Verify response

**Test Content:**
```
Photosynthesis is the process by which plants convert light energy into chemical energy. 
Chloroplasts contain chlorophyll which absorbs light. The light-dependent reactions occur 
in the thylakoid membranes. The Calvin cycle occurs in the stroma. Carbon dioxide is 
converted into glucose. Oxygen is released as a byproduct.
```

**Expected Results:**
- POST /api/lyrics/generate called
- Request body: `{content: "...", search_enabled: false}`
- Loading progress shows stages
- Response contains: `{lyrics: "...", content_hash: "...", cached: false}`
- Success message displayed
- Rate limit decrements

#### Test 6.2: Generate with Search Enabled
**Steps:**
1. Enter short content (50 words)
2. Enable search toggle
3. Click generate
4. Monitor network and console
5. Verify longer processing time

**Expected Results:**
- Request includes `search_enabled: true`
- Processing takes 5-10 seconds longer
- Pipeline includes search grounding stage
- Lyrics generated successfully

#### Test 6.3: Cache Hit Scenario
**Steps:**
1. Generate lyrics for specific content
2. Wait for completion
3. Enter SAME content again
4. Generate again
5. Monitor network response time

**Expected Results:**
- Second request much faster (<1 second)
- Response includes `cached: true`
- Same lyrics returned
- Rate limit still decrements

**MCP Tools to Use:**
- `fill` - Enter content
- `click` - Trigger generation
- `list_network_requests` - Monitor API calls
- `get_network_request` - Inspect request/response
- `wait_for` - Wait for completion
- `list_console_messages` - Check for errors

---

### 7. Loading Progress Testing (US-5)

**Objective:** Test loading indicator and progress stages

#### Test 7.1: Progress Stages Display
**Steps:**
1. Start lyrics generation
2. Take snapshots during generation
3. Verify stages appear:
   - Cleaning text
   - (Searching - if enabled)
   - Summarizing
   - Converting to lyrics
4. Check progress bar updates

**Expected Results:**
- Loading indicator appears immediately
- Current stage highlighted
- Progress bar animates
- Stages appear in correct order

#### Test 7.2: Estimated Time Display
**Steps:**
1. Start generation
2. Check if estimated time shown
3. Verify time updates

**Expected Results:**
- Estimated time displayed
- Time counts down or updates
- Reasonable estimate (15-30 seconds)

#### Test 7.3: Cancel Operation (if implemented)
**Steps:**
1. Start generation
2. Click cancel button
3. Verify request cancelled
4. Check UI returns to ready state

**Expected Results:**
- Generation stops
- API request aborted
- UI resets to input state
- No error messages

**MCP Tools to Use:**
- `take_snapshot` - Capture progress states
- `evaluate_script` - Check component state
- `click` - Test cancel button
- `take_screenshot` - Document stages

---

### 8. Error Handling Testing (US-6)

**Objective:** Test error scenarios and user feedback

#### Test 8.1: Network Error
**Steps:**
1. Stop backend server temporarily
2. Try to generate lyrics
3. Observe error handling
4. Check error message
5. Verify retry option

**Expected Results:**
- User-friendly error message
- "Retry" button appears
- No technical jargon
- Console logs error details

#### Test 8.2: Rate Limit Error (429)
**Steps:**
1. Generate 3 songs to reach limit
2. Try to generate 4th song
3. Check error message
4. Verify reset time shown

**Expected Results:**
- Error: "Daily limit reached"
- Shows reset time
- No retry button
- Generate button disabled

#### Test 8.3: Validation Error (>10,000 words)
**Steps:**
1. Enter 10,500 words
2. Try to generate (button should be disabled)
3. Check error message

**Expected Results:**
- Button disabled
- Clear error message
- Explains word limit
- Counter shows red

#### Test 8.4: Invalid Content Error
**Steps:**
1. Enter only special characters or gibberish
2. Try to generate
3. Check backend validation

**Expected Results:**
- Backend returns validation error
- User-friendly message shown
- Suggests valid content

**MCP Tools to Use:**
- `list_console_messages` - Check error logs
- `get_console_message` - Inspect error details
- `list_network_requests` - Check failed requests
- `take_screenshot` - Document error states

---

### 9. Accessibility Testing (NFR-2)

**Objective:** Verify WCAG 2.1 AA compliance

#### Test 9.1: Keyboard Navigation
**Steps:**
1. Use Tab key to navigate through all elements
2. Verify tab order is logical
3. Check focus indicators visible
4. Test all interactions with keyboard only

**Expected Results:**
- All interactive elements reachable
- Logical tab order
- Clear focus indicators
- All actions possible via keyboard

#### Test 9.2: ARIA Labels and Roles
**Steps:**
1. Take verbose snapshot
2. Check ARIA attributes on:
   - Textarea (aria-label, aria-describedby)
   - Toggle (aria-checked)
   - Button (aria-disabled)
   - Progress (aria-valuenow, aria-live)
3. Verify roles are correct

**Expected Results:**
- All form controls have aria-label
- Dynamic content has aria-live
- Roles properly assigned
- Screen reader compatible

#### Test 9.3: Color Contrast
**Steps:**
1. Take screenshots of all states
2. Use evaluate_script to check computed colors
3. Verify contrast ratios:
   - Normal text: 4.5:1
   - Large text: 3:1
   - UI components: 3:1

**Expected Results:**
- All text meets contrast requirements
- Warning/error colors distinguishable
- Not relying on color alone

**MCP Tools to Use:**
- `press_key` - Test keyboard navigation
- `take_snapshot` with verbose=true - Check ARIA
- `evaluate_script` - Check computed styles
- `take_screenshot` - Document accessibility

---

### 10. Mobile Responsiveness Testing (NFR-4)

**Objective:** Test mobile layouts and touch interactions

#### Test 10.1: Mobile Viewport (375x667)
**Steps:**
1. Resize page to 375x667 (iPhone SE)
2. Take screenshot
3. Verify layout adapts
4. Test all interactions

**Expected Results:**
- Layout responsive
- No horizontal scroll
- Touch targets ≥44x44px
- All features accessible

#### Test 10.2: Tablet Viewport (768x1024)
**Steps:**
1. Resize to 768x1024 (iPad)
2. Take screenshot
3. Verify layout

**Expected Results:**
- Optimal use of space
- Readable text sizes
- Proper spacing

#### Test 10.3: Desktop Viewport (1920x1080)
**Steps:**
1. Resize to 1920x1080
2. Take screenshot
3. Verify layout doesn't stretch awkwardly

**Expected Results:**
- Max-width container
- Centered layout
- Proper proportions

**MCP Tools to Use:**
- `resize_page` - Test different viewports
- `take_screenshot` - Document layouts
- `click` - Test touch targets

---

### 11. Performance Testing (NFR-1)

**Objective:** Verify performance requirements

#### Test 11.1: Page Load Time
**Steps:**
1. Clear cache
2. Navigate to page
3. Use Performance panel to measure
4. Check network waterfall

**Expected Results:**
- Page load < 2 seconds
- First Contentful Paint < 1 second
- Time to Interactive < 2 seconds

#### Test 11.2: API Response Time
**Steps:**
1. Generate lyrics
2. Measure time from request to response
3. Check processing_time in response

**Expected Results:**
- Response < 30 seconds
- UI remains responsive
- No blocking operations

#### Test 11.3: UI Responsiveness During Generation
**Steps:**
1. Start generation
2. Try to interact with other elements
3. Verify UI not frozen

**Expected Results:**
- UI remains interactive
- Can cancel operation
- Smooth animations

**MCP Tools to Use:**
- `performance_start_trace` - Record performance
- `performance_stop_trace` - Analyze metrics
- `list_network_requests` - Check timing
- `get_network_request` - Inspect duration

---

### 12. Integration Testing

**Objective:** Test complete user workflows

#### Test 12.1: First-Time User Flow
**Steps:**
1. Clear localStorage and cookies
2. Navigate to page
3. Verify anonymous auth creates user
4. Check rate limit initialized to 3
5. Generate first song
6. Verify all data persisted

**Expected Results:**
- Anonymous user created
- Rate limit: 3/3 initially
- After generation: 2/3
- User ID stored in localStorage

#### Test 12.2: Returning User Flow
**Steps:**
1. Keep localStorage intact
2. Refresh page
3. Verify user ID persists
4. Check rate limit restored
5. Verify previous state

**Expected Results:**
- Same user ID used
- Rate limit accurate
- No re-authentication needed

#### Test 12.3: Multi-Generation Flow
**Steps:**
1. Generate 3 songs with different content
2. Verify rate limit decrements each time
3. Check all stored in Firestore
4. Verify 4th attempt blocked

**Expected Results:**
- Each generation successful
- Rate limit: 3→2→1→0
- All lyrics stored
- 4th attempt shows error

**MCP Tools to Use:**
- `evaluate_script` - Clear/check localStorage
- `navigate_page` - Reload page
- `list_network_requests` - Monitor all API calls
- `take_screenshot` - Document flow

---

## Test Data

### Sample Educational Content

#### Short Content (50 words)
```
The water cycle describes how water moves through Earth's systems. 
Evaporation occurs when water becomes vapor. Condensation forms clouds. 
Precipitation returns water to Earth. This cycle is essential for life.
```

#### Medium Content (500 words)
```
[Use photosynthesis example from Test 6.1, expanded to 500 words]
```

#### Long Content (9,500 words - Warning State)
```
[Generate or use Lorem Ipsum educational content]
```

#### Too Long Content (10,500 words - Error State)
```
[Generate or use Lorem Ipsum educational content]
```

---

## Debugging Checklist

### Before Each Test Session
- [ ] Frontend running at http://localhost:5173/
- [ ] Backend running at http://localhost:8000
- [ ] Chrome DevTools MCP connected
- [ ] Clear browser cache and localStorage
- [ ] Check backend logs are accessible
- [ ] Verify Firebase credentials configured

### During Testing
- [ ] Take snapshots before interactions
- [ ] Monitor console messages continuously
- [ ] Track network requests for each action
- [ ] Document unexpected behaviors
- [ ] Take screenshots of visual bugs
- [ ] Note performance issues

### After Each Test
- [ ] Review console errors
- [ ] Check network request failures
- [ ] Verify data persisted correctly
- [ ] Document bugs found
- [ ] Create bug reports with screenshots

---

## Bug Report Template

When bugs are found, document using this template:

```markdown
### Bug #[NUMBER]: [Brief Description]

**Severity:** Critical / High / Medium / Low
**Test:** [Test number and name]
**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots:**
[Attach screenshots]

**Console Errors:**
[Paste relevant errors]

**Network Requests:**
[Paste relevant request/response]

**Environment:**
- Browser: Chrome [version]
- Frontend: http://localhost:5173/
- Backend: http://localhost:8000
```

---

## Success Criteria

All tests pass when:
- ✅ All user stories (US-1 through US-6) verified
- ✅ All functional requirements (FR-1 through FR-5) working
- ✅ All non-functional requirements (NFR-1 through NFR-4) met
- ✅ No critical or high severity bugs
- ✅ Accessibility standards met
- ✅ Performance targets achieved
- ✅ Error handling graceful and user-friendly

---

## Next Steps

After completing this debugging plan:
1. Document all bugs found
2. Prioritize fixes
3. Create GitHub issues for bugs
4. Re-test after fixes
5. Proceed to Page B (Lyrics Editing) testing
