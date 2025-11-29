# Complete User Flow Testing Guide

**LearningSong - End-to-End Testing**  
**Updated:** November 29, 2025

This guide walks through testing the complete user flow across all three pages (A, B, C) of the LearningSong application.

---

## Prerequisites

- Backend running: `poetry run uvicorn app.main:app --reload` (port 8000)
- Frontend running: `pnpm dev` (port 5173)
- All API keys configured in `.env` files
- Browser DevTools open (F12) for debugging

---

## Complete User Flow

### Phase 1: Page A - Content Input

**URL:** http://localhost:5173

#### Step 1: Verify Page Loads
- [ ] Page loads without errors
- [ ] Header displays "LearningSong"
- [ ] Rate limit indicator shows (e.g., "2/3 songs remaining")
- [ ] No console errors (F12 → Console)

#### Step 2: Test Text Input
- [ ] Click in text area
- [ ] Type or paste educational content (50-1000 words recommended)
- [ ] Verify word counter updates in real-time
- [ ] Verify character count displays correctly

**Test Content Examples:**
```
The water cycle is the continuous movement of water on, above, and below the surface of the Earth. 
Water evaporates from oceans, lakes, and rivers, turning into water vapor. This vapor rises into 
the atmosphere where it cools and condenses into clouds. When clouds become heavy with water droplets, 
precipitation occurs as rain or snow. This water flows back to oceans and lakes, completing the cycle.
```

#### Step 3: Test Validation
- [ ] Try to submit empty text → error message appears
- [ ] Try to submit only whitespace → error message appears
- [ ] Try to submit > 10,000 words → error message appears
- [ ] Error messages are clear and helpful

#### Step 4: Test Search Toggle
- [ ] Toggle "Enable Google Search" on/off
- [ ] Verify toggle state persists
- [ ] Verify toggle doesn't break form

#### Step 5: Generate Lyrics
- [ ] Click "Generate Lyrics" button
- [ ] Verify loading state appears (spinner + "Generating...")
- [ ] Verify progress updates (if available)
- [ ] Wait for generation to complete (typically 5-30 seconds)

**Expected Outcome:**
- Redirects to Page B with generated lyrics
- Lyrics appear in editor
- No console errors

---

### Phase 2: Page B - Lyrics Editing

**URL:** http://localhost:5173/lyrics-edit

#### Step 1: Verify Page Loads
- [ ] Page loads with generated lyrics
- [ ] Header displays "LearningSong"
- [ ] Rate limit indicator shows updated count
- [ ] No console errors

#### Step 2: Review Generated Lyrics
- [ ] Lyrics display in editor
- [ ] Character count shows (e.g., "1,245 / 3,000 characters")
- [ ] Character count updates as you type
- [ ] Visual state changes:
  - Green: 0-2000 chars (good)
  - Yellow: 2000-2800 chars (warning)
  - Red: 2800-3000 chars (limit approaching)
  - Red + disabled: > 3000 chars (too long)

#### Step 3: Test Lyrics Editing
- [ ] Click in editor
- [ ] Edit lyrics (add/remove text)
- [ ] Verify character counter updates
- [ ] Verify "Back to Edit Content" button is available
- [ ] Verify unsaved changes warning works (if you click back)

#### Step 4: Test Style Selector
- [ ] Click style selector dropdown
- [ ] Verify all 8 styles appear:
  - [ ] Pop
  - [ ] Rap
  - [ ] Folk
  - [ ] Electronic
  - [ ] Rock
  - [ ] Jazz
  - [ ] Children's
  - [ ] Classical
- [ ] Select different styles
- [ ] Verify selection persists

#### Step 5: Generate Song
- [ ] Select a music style
- [ ] Click "Generate Song" button
- [ ] Verify loading state appears
- [ ] Verify progress tracker shows:
  - [ ] Connection status (connecting/connected)
  - [ ] Progress percentage (0-100%)
  - [ ] Status message (queued/processing/completed)
  - [ ] Estimated time remaining

**Expected Outcome:**
- Song generation starts
- Progress updates in real-time
- Redirects to Page C when complete
- No console errors

#### Step 6: Test Error Scenarios
- [ ] Try to generate with empty lyrics → error message
- [ ] Try to generate with > 3000 chars → error message
- [ ] Try to generate with offline connection → offline indicator
- [ ] Verify retry button appears on error
- [ ] Click retry → generation restarts

#### Step 7: Test WebSocket Connection
- [ ] Open DevTools → Network tab
- [ ] Filter by "WS" (WebSocket)
- [ ] Generate song
- [ ] Verify WebSocket connection appears
- [ ] Watch for status messages in WebSocket frames
- [ ] Verify connection closes after generation completes

---

### Phase 3: Page C - Song Playback

**URL:** http://localhost:5173/playback/:songId

#### Step 1: Verify Page Loads
- [ ] Page loads with song data
- [ ] Header displays "LearningSong"
- [ ] Audio player displays
- [ ] Lyrics display below player
- [ ] No console errors

#### Step 2: Test Audio Player
- [ ] Click play button
- [ ] Verify audio plays (listen for sound)
- [ ] Verify play button changes to pause
- [ ] Click pause button
- [ ] Verify audio pauses
- [ ] Verify play button reappears

#### Step 3: Test Player Controls
- [ ] Verify volume slider works
- [ ] Verify seek bar works (click to jump to position)
- [ ] Verify time display updates (current / total)
- [ ] Verify playback speed selector works (if available)

#### Step 4: Test Lyrics Display
- [ ] Verify lyrics display in editor
- [ ] Verify lyrics are readable
- [ ] Verify scroll position updates with playback
- [ ] Verify lyrics sync with audio (if implemented)

#### Step 5: Test Song Metadata
- [ ] Verify music style displays (e.g., "Pop")
- [ ] Verify creation time displays
- [ ] Verify expiration time displays
- [ ] Verify time remaining shows correctly

#### Step 6: Test Share Button
- [ ] Click "Share" button
- [ ] Verify share dialog appears
- [ ] Verify share link is generated
- [ ] Copy share link
- [ ] Open link in new tab
- [ ] Verify shared song loads (read-only)
- [ ] Verify you can play shared song

#### Step 7: Test Regenerate Button
- [ ] Click "Regenerate Song" button
- [ ] Verify confirmation dialog appears
- [ ] Verify dialog shows remaining songs
- [ ] Click "Continue"
- [ ] Verify redirects to Page B with lyrics pre-filled
- [ ] Verify you can edit and regenerate

#### Step 8: Test Error Scenarios
- [ ] Try to access non-existent song ID → error message
- [ ] Try to access expired song → error message
- [ ] Try to access unauthorized song → error message
- [ ] Verify error messages are user-friendly (no technical details)
- [ ] Verify "Go Home" button works

#### Step 9: Test Offline Behavior
- [ ] Disconnect network (DevTools → Network → Offline)
- [ ] Verify offline indicator appears
- [ ] Verify audio player is disabled
- [ ] Verify share button is disabled
- [ ] Verify regenerate button is disabled
- [ ] Reconnect network
- [ ] Verify offline indicator disappears
- [ ] Verify buttons are re-enabled

---

## Complete Flow Test Scenarios

### Scenario 1: Happy Path (5-10 minutes)
1. ✅ Page A: Enter content → Generate lyrics
2. ✅ Page B: Review lyrics → Select style → Generate song
3. ✅ Page C: Play song → View lyrics → Share song

**Expected Result:** Complete flow works without errors

### Scenario 2: Editing Flow (10-15 minutes)
1. ✅ Page A: Enter content → Generate lyrics
2. ✅ Page B: Edit lyrics → Change style → Generate song
3. ✅ Page C: Play song → Click regenerate
4. ✅ Page B: Edit lyrics again → Generate new song
5. ✅ Page C: Play new song

**Expected Result:** Can edit and regenerate multiple times

### Scenario 3: Error Recovery (10-15 minutes)
1. ✅ Page A: Enter content → Generate lyrics
2. ✅ Page B: Try to generate with empty lyrics → error
3. ✅ Page B: Add lyrics → Generate song
4. ✅ Page C: Try to access expired song → error
5. ✅ Page C: Go home → Start new flow

**Expected Result:** Errors are handled gracefully

### Scenario 4: Rate Limiting (5 minutes)
1. ✅ Page A: Check rate limit (e.g., "2/3 songs remaining")
2. ✅ Generate 2 more songs
3. ✅ Verify rate limit shows "0/3 songs remaining"
4. ✅ Try to generate 4th song → rate limit error
5. ✅ Verify error message shows reset time

**Expected Result:** Rate limiting works correctly

### Scenario 5: Offline Handling (5 minutes)
1. ✅ Page A: Enter content
2. ✅ Disconnect network (DevTools → Offline)
3. ✅ Try to generate → offline error
4. ✅ Reconnect network
5. ✅ Try to generate again → works

**Expected Result:** Offline detection and recovery works

### Scenario 6: Responsive Design (10 minutes)
1. ✅ Open DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. ✅ Test on mobile (375px width)
   - [ ] All elements visible
   - [ ] Text readable
   - [ ] Buttons clickable
   - [ ] No horizontal scroll
3. ✅ Test on tablet (768px width)
   - [ ] Layout adapts
   - [ ] All features work
4. ✅ Test on desktop (1920px width)
   - [ ] Layout looks good
   - [ ] No excessive whitespace

**Expected Result:** App works on all screen sizes

### Scenario 7: Accessibility (10 minutes)
1. ✅ Page A: Test keyboard navigation
   - [ ] Tab through all elements
   - [ ] Enter/Space activates buttons
   - [ ] Ctrl+Enter generates lyrics
2. ✅ Page B: Test keyboard navigation
   - [ ] Tab through editor, style selector, button
   - [ ] Ctrl+Enter generates song
3. ✅ Page C: Test keyboard navigation
   - [ ] Tab through player controls
   - [ ] Space plays/pauses
   - [ ] Arrow keys seek
4. ✅ Test screen reader (if available)
   - [ ] All text is readable
   - [ ] Buttons have labels
   - [ ] Form fields have labels

**Expected Result:** App is keyboard accessible

---

## Debugging Checklist

### If Page A Doesn't Load
- [ ] Check backend is running: `curl http://localhost:8000/health`
- [ ] Check frontend is running: http://localhost:5173
- [ ] Check browser console for errors (F12)
- [ ] Check network tab for failed requests
- [ ] Verify CORS is configured in backend

### If Lyrics Generation Fails
- [ ] Check OpenAI API key is set in `.env`
- [ ] Check API key is valid (not expired)
- [ ] Check backend logs for errors
- [ ] Check network tab for API errors
- [ ] Try with shorter content (50-100 words)

### If Song Generation Fails
- [ ] Check Suno API key is set in `.env`
- [ ] Check API key is valid
- [ ] Check backend logs for errors
- [ ] Check WebSocket connection (DevTools → Network → WS)
- [ ] Try regenerating (click retry button)

### If Audio Doesn't Play
- [ ] Check browser volume is not muted
- [ ] Check speaker is connected
- [ ] Check browser console for errors
- [ ] Try different browser
- [ ] Check song URL is valid (DevTools → Network)

### If Share Link Doesn't Work
- [ ] Check share link is copied correctly
- [ ] Check link format: `/playback/:songId`
- [ ] Try in incognito window
- [ ] Check backend logs for errors
- [ ] Verify song hasn't expired (48 hours)

### If Offline Detection Doesn't Work
- [ ] Check network status hook is implemented
- [ ] Check offline indicator component renders
- [ ] Try actual network disconnect (not DevTools)
- [ ] Check browser console for errors

---

## Performance Benchmarks

| Operation | Expected Time | Acceptable Range |
|-----------|----------------|------------------|
| Page A load | < 1 second | < 2 seconds |
| Lyrics generation | 5-30 seconds | < 60 seconds |
| Page B load | < 1 second | < 2 seconds |
| Song generation | 30-120 seconds | < 180 seconds |
| Page C load | < 1 second | < 2 seconds |
| Audio playback start | < 2 seconds | < 5 seconds |
| Share link generation | < 1 second | < 2 seconds |

---

## Test Report Template

Use this template to document your testing:

```markdown
# Test Report - [Date]

## Environment
- Backend: Running on port 8000
- Frontend: Running on port 5173
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]

## Test Results

### Page A: Content Input
- [ ] Page loads
- [ ] Text input works
- [ ] Validation works
- [ ] Search toggle works
- [ ] Generation works

### Page B: Lyrics Editing
- [ ] Page loads with lyrics
- [ ] Character counter works
- [ ] Style selector works
- [ ] Generation works
- [ ] Error handling works

### Page C: Song Playback
- [ ] Page loads with song
- [ ] Audio player works
- [ ] Lyrics display works
- [ ] Share works
- [ ] Regenerate works

## Issues Found
- [ ] Issue 1: [Description]
- [ ] Issue 2: [Description]

## Notes
[Any additional observations]
```

---

## Next Steps

1. **Run through all scenarios** above
2. **Document any issues** found
3. **Test on different browsers** (Chrome, Firefox, Safari)
4. **Test on different devices** (mobile, tablet, desktop)
5. **Performance test** with larger content
6. **Load test** with multiple concurrent users
7. **Security test** (SQL injection, XSS, etc.)
8. **Accessibility audit** with screen reader

---

## Support

### Documentation
- Setup: `docs/API-SETUP-GUIDE.md`
- Quick Reference: `docs/QUICK-REFERENCE.md`
- Troubleshooting: `docs/QUICK-REFERENCE.md#-common-errors--fixes`

### Logs
- Backend: JSON formatted in console
- Frontend: Browser DevTools Console (F12)
- Network: Browser DevTools Network tab (F12)

### Resources
- [Suno API Docs](https://sunoapi.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [OpenAI Docs](https://platform.openai.com/docs)

---

**Status:** ✅ Complete  
**Last Updated:** November 29, 2025  
**Maintained By:** Development Team
