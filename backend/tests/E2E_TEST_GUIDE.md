# End-to-End Testing Guide for Page A: Text Input

This document provides a comprehensive guide for manually testing the complete Page A functionality.

## Prerequisites

1. **Backend Setup:**
   ```bash
   cd backend
   poetry install
   # Set up .env file with Firebase credentials
   poetry run uvicorn app.main:app --reload
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   pnpm install
   # Set up .env file with API URL and Firebase config
   pnpm dev
   ```

3. **Firebase Setup:**
   - Create a Firebase project
   - Enable Anonymous Authentication
   - Create Firestore database
   - Download service account credentials for backend
   - Get Firebase config for frontend

## Test Scenarios

### 20.1 Happy Path Test

**Objective:** Test complete flow from content input to lyrics generation

**Steps:**
1. Open browser to `http://localhost:5173`
2. Verify page loads with:
   - Text input area
   - Search toggle (OFF by default)
   - Rate limit indicator showing "3/3 songs remaining"
   - Generate button (disabled when empty)

3. Enter educational content:
   ```
   Photosynthesis is the process by which plants convert light energy into chemical energy. 
   Plants use sunlight, water, and carbon dioxide to produce glucose and oxygen.
   ```

4. Verify:
   - Word counter updates in real-time
   - Generate button becomes enabled
   - No error messages

5. Click "Generate Lyrics" button

6. Verify:
   - Loading progress appears
   - Progress shows stages: cleaning → summarizing → converting
   - Button is disabled during generation

7. Wait for completion

8. Verify:
   - Lyrics are displayed
   - Rate limit updates to "2/3 songs remaining"
   - Success message appears
   - Processing time is shown

**Expected Result:** ✅ Lyrics generated successfully, all UI elements update correctly

---

### 20.2 Rate Limit Test

**Objective:** Verify rate limiting after 3 generations

**Steps:**
1. Start with fresh anonymous user (clear browser data or use incognito)
2. Generate 3 songs with different content:
   - Song 1: "The water cycle includes evaporation, condensation, and precipitation."
   - Song 2: "Newton's laws of motion describe the relationship between force and motion."
   - Song 3: "The periodic table organizes elements by atomic number and properties."

3. After each generation, verify:
   - Rate limit counter decrements: 3→2→1→0
   - Each generation succeeds

4. Attempt 4th generation with new content

5. Verify:
   - Generate button is disabled
   - Error message: "Rate limit exceeded"
   - Countdown timer appears showing time until reset
   - Message: "You have reached your daily limit of 3 songs"

6. Wait for countdown or check back after midnight UTC

7. Verify:
   - Rate limit resets to 3/3
   - Generate button becomes enabled again

**Expected Result:** ✅ Rate limit enforced correctly, clear user feedback

---

### 20.3 Cache Test

**Objective:** Verify caching returns faster results for duplicate content

**Steps:**
1. Generate lyrics with specific content:
   ```
   The Pythagorean theorem states that in a right triangle, 
   the square of the hypotenuse equals the sum of squares of the other two sides.
   ```

2. Note the processing time (should be 15-30 seconds)

3. Immediately generate lyrics again with THE EXACT SAME content

4. Verify:
   - Response is much faster (< 1 second)
   - "Cached" indicator appears
   - Processing time shows 0.0s
   - Lyrics are identical to first generation
   - Rate limit counter does NOT decrement (cached results don't count against quota)

5. Try with slightly different content (add a space or change capitalization)

6. Verify:
   - Still returns cached result (content is normalized)
   - Still fast response

**Expected Result:** ✅ Cache hit provides instant results, saves user quota

---

### 20.4 Error Scenarios Test

**Objective:** Verify error handling for various failure cases

#### Test 4a: Content Exceeds Word Limit

**Steps:**
1. Generate content with >10,000 words:
   ```python
   # Use this to generate test content
   content = ' '.join(['word'] * 10001)
   ```

2. Paste into text area

3. Verify:
   - Word counter shows "10,001 / 10,000" in RED
   - Error message: "Content exceeds limit"
   - Generate button is DISABLED

**Expected Result:** ✅ Clear validation error, generation prevented

#### Test 4b: Empty Content

**Steps:**
1. Leave text area empty
2. Try to click Generate button

3. Verify:
   - Button is disabled
   - No error message (just disabled state)

**Expected Result:** ✅ Generation prevented for empty input

#### Test 4c: Network Disconnected

**Steps:**
1. Enter valid content
2. Open browser DevTools → Network tab
3. Set network to "Offline"
4. Click Generate

5. Verify:
   - Error message: "Network error - please check your connection"
   - Retry button appears
   - User can retry after reconnecting

6. Set network back to "Online"
7. Click Retry

8. Verify:
   - Generation proceeds normally

**Expected Result:** ✅ Network errors handled gracefully with retry option

#### Test 4d: Invalid Firebase Token

**Steps:**
1. Open browser DevTools → Application → Local Storage
2. Find and delete Firebase auth token
3. Try to generate lyrics

4. Verify:
   - Automatic re-authentication attempt
   - If re-auth fails: clear error message
   - User is prompted to refresh page

**Expected Result:** ✅ Auth errors handled, user guided to resolution

---

### 20.5 Search Grounding Test

**Objective:** Verify Google Search enrichment works correctly

#### Test 5a: Search Enabled

**Steps:**
1. Enter SHORT content (< 100 words):
   ```
   Quantum entanglement
   ```

2. Enable "Enrich with Google Search" toggle

3. Verify:
   - Toggle shows ON state
   - Tooltip explains feature

4. Click Generate

5. Verify:
   - Processing takes longer (~25-35 seconds vs 15-25 seconds)
   - Progress shows "searching" stage
   - Generated lyrics include enriched context from search results

**Expected Result:** ✅ Search grounding adds relevant context

#### Test 5b: Search Disabled

**Steps:**
1. Use same short content:
   ```
   Quantum entanglement
   ```

2. Ensure "Enrich with Google Search" toggle is OFF

3. Click Generate

4. Verify:
   - Processing is faster (~15-25 seconds)
   - No "searching" stage in progress
   - Lyrics are based only on provided content

5. Compare lyrics from Test 5a and 5b

6. Verify:
   - Lyrics are different
   - Search-enabled version has more detail/context

**Expected Result:** ✅ Search toggle controls enrichment behavior

---

## Accessibility Testing

### Keyboard Navigation

**Steps:**
1. Load page
2. Press Tab repeatedly
3. Verify tab order:
   - Skip to main content link
   - Text area
   - Search toggle
   - Generate button

4. Use Enter/Space to activate controls
5. Use Ctrl+Enter in text area to generate

**Expected Result:** ✅ All controls keyboard accessible

### Screen Reader

**Steps:**
1. Enable screen reader (NVDA/JAWS/VoiceOver)
2. Navigate page
3. Verify announcements for:
   - Form labels
   - Button states
   - Error messages
   - Loading progress
   - Rate limit status

**Expected Result:** ✅ All content announced correctly

### Color Contrast

**Steps:**
1. Use browser DevTools → Lighthouse
2. Run Accessibility audit
3. Verify WCAG 2.1 AA compliance

**Expected Result:** ✅ All text meets contrast requirements

---

## Performance Testing

### Page Load Time

**Steps:**
1. Open DevTools → Network tab
2. Hard refresh page (Ctrl+Shift+R)
3. Check "Load" time

**Expected Result:** ✅ < 2 seconds

### API Response Time

**Steps:**
1. Open DevTools → Network tab
2. Generate lyrics
3. Find `/api/lyrics/generate` request
4. Check response time

**Expected Result:** ✅ < 30 seconds (non-cached)

### Cache Performance

**Steps:**
1. Generate lyrics (note time)
2. Generate same content again
3. Compare times

**Expected Result:** ✅ Cached response < 1 second

---

## Test Results Template

```markdown
## Test Execution: [Date]

### Environment
- Backend: Running on port 8000
- Frontend: Running on port 5173
- Firebase: [Project ID]
- Browser: [Chrome/Firefox/Safari] [Version]

### Test Results

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 20.1 | Happy Path | ✅ PASS | |
| 20.2 | Rate Limit | ✅ PASS | |
| 20.3 | Cache | ✅ PASS | |
| 20.4a | Word Limit | ✅ PASS | |
| 20.4b | Empty Content | ✅ PASS | |
| 20.4c | Network Error | ✅ PASS | |
| 20.4d | Auth Error | ✅ PASS | |
| 20.5a | Search Enabled | ✅ PASS | |
| 20.5b | Search Disabled | ✅ PASS | |

### Issues Found
[List any bugs or issues discovered]

### Recommendations
[List any improvements or concerns]
```

---

## Automated Test Coverage

While manual E2E testing is comprehensive, the following automated tests provide coverage:

- **Unit Tests:** Individual component and service tests
- **Integration Tests:** Frontend component integration tests
- **API Tests:** Backend endpoint tests with mocked dependencies

Run automated tests:
```bash
# Backend
cd backend
poetry run pytest --cov=app

# Frontend
cd frontend
pnpm test
```

---

## Notes

- These tests validate all User Stories (US-1 through US-6)
- Tests cover all Functional Requirements (FR-1 through FR-5)
- Tests verify Non-Functional Requirements (NFR-1 through NFR-4)
- Manual testing is required because:
  - Real Firebase integration
  - Real AI pipeline behavior
  - Real network conditions
  - Real user experience validation
