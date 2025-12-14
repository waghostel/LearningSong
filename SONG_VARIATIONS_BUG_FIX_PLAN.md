# Song Variations Bug Fix Plan

## Overview

This document outlines the plan to fix 3 critical bugs preventing the Song Switcher component from displaying dual song variations on the Song Playback page.

**Status:** Ready for implementation  
**Priority:** High (blocks core feature)  
**Estimated Effort:** 2-3 hours  
**Risk Level:** Low (isolated backend changes, no schema changes)

---

## Problem Statement

Users see 2 songs being generated (correct), but the Song Switcher component doesn't appear on the playback page. Root cause: variations are extracted from Suno API but never sent to the frontend.

**Impact:**
- Users cannot switch between song variations
- Dual song generation feature is non-functional
- Feature appears broken to end users

---

## Root Causes

### Bug #1: Variations Not Sent via WebSocket (CRITICAL)
- **File:** `backend/app/api/websocket.py`
- **Lines:** 227-233
- **Issue:** `status_update` dict missing `variations` field
- **Impact:** Frontend receives empty variations array

### Bug #2: Variations Not Stored in Firestore (SECONDARY)
- **File:** `backend/app/api/websocket.py`
- **Lines:** 237-244
- **Issue:** `update_task_status()` call missing `variations` parameter
- **Impact:** Variations lost on page refresh

### Bug #3: Variations Not Sent in Subscribe Response (TERTIARY)
- **File:** `backend/app/api/websocket.py`
- **Lines:** 450-456
- **Issue:** `current_status` dict missing `variations` field
- **Impact:** Variations not restored when client reconnects

---

## Implementation Plan

### Phase 1: Fix WebSocket Broadcasting (Bug #1)

**Objective:** Include variations in real-time status updates

**File:** `backend/app/api/websocket.py`

**Changes:**

1. **Locate the status_update creation** (around line 227)
   ```python
   # Current code:
   status_update = {
       "task_id": task_id,
       "status": generation_status.value,
       "progress": suno_status.progress,
       "song_url": suno_status.song_url,
       "error": suno_status.error,
   }
   ```

2. **Add variations field:**
   ```python
   # Fixed code:
   status_update = {
       "task_id": task_id,
       "status": generation_status.value,
       "progress": suno_status.progress,
       "song_url": suno_status.song_url,
       "variations": [
           {
               "audio_url": v.audio_url,
               "audio_id": v.audio_id,
               "variation_index": v.variation_index,
           }
           for v in suno_status.variations
       ],
       "error": suno_status.error,
   }
   ```

3. **Verify the broadcast:**
   - Ensure `broadcast_status_update(task_id, status_update)` is called with updated dict
   - No changes needed to broadcast function itself

**Testing:**
- [ ] Check browser Network tab for WebSocket messages
- [ ] Verify `variations` array is present in `song_status` event
- [ ] Confirm array has 2 items when song completes

---

### Phase 2: Fix Firestore Persistence (Bug #2)

**Objective:** Persist variations to Firestore for page refresh recovery

**File:** `backend/app/api/websocket.py`

**Changes:**

1. **Locate the update_task_status call** (around line 237)
   ```python
   # Current code:
   await update_task_status(
       task_id=task_id,
       status=generation_status.value,
       progress=suno_status.progress,
       song_url=suno_status.song_url,
       error=suno_status.error,
   )
   ```

2. **Add variations parameter:**
   ```python
   # Fixed code:
   await update_task_status(
       task_id=task_id,
       status=generation_status.value,
       progress=suno_status.progress,
       song_url=suno_status.song_url,
       error=suno_status.error,
       variations=[
           {
               "audio_url": v.audio_url,
               "audio_id": v.audio_id,
               "variation_index": v.variation_index,
           }
           for v in suno_status.variations
       ],
   )
   ```

3. **Verify the storage:**
   - Check `backend/app/services/song_storage.py` already handles `variations` parameter
   - No changes needed to storage layer

**Testing:**
- [ ] Generate a song and wait for completion
- [ ] Refresh the page
- [ ] Verify variations are still present in Firestore
- [ ] Check `GET /api/songs/{song_id}/details` returns variations

---

### Phase 3: Fix Subscribe Response (Bug #3)

**Objective:** Restore variations when client reconnects

**File:** `backend/app/api/websocket.py`

**Changes:**

1. **Locate the current_status creation** (around line 450)
   ```python
   # Current code:
   current_status = {
       "task_id": task_id,
       "status": task_data.get("status", GenerationStatus.QUEUED.value),
       "progress": task_data.get("progress", 0),
       "song_url": task_data.get("song_url"),
       "error": task_data.get("error"),
   }
   ```

2. **Add variations field:**
   ```python
   # Fixed code:
   current_status = {
       "task_id": task_id,
       "status": task_data.get("status", GenerationStatus.QUEUED.value),
       "progress": task_data.get("progress", 0),
       "song_url": task_data.get("song_url"),
       "variations": [
           {
               "audio_url": v.get("audio_url"),
               "audio_id": v.get("audio_id"),
               "variation_index": v.get("variation_index"),
           }
           for v in task_data.get("variations", [])
       ],
       "error": task_data.get("error"),
   }
   ```

3. **Verify the response:**
   - Ensure `send_status_to_client(sid, current_status)` is called with updated dict
   - No changes needed to send function itself

**Testing:**
- [ ] Generate a song and wait for completion
- [ ] Close browser tab/window
- [ ] Reopen the playback page
- [ ] Verify variations are restored immediately

---

## Implementation Steps

### Step 1: Prepare Environment
```bash
# Ensure backend is running
cd backend
poetry run uvicorn app.main:app --reload
```

### Step 2: Apply Bug #1 Fix
- [ ] Open `backend/app/api/websocket.py`
- [ ] Navigate to line 227
- [ ] Add `variations` field to `status_update` dict
- [ ] Save file

### Step 3: Apply Bug #2 Fix
- [ ] Navigate to line 237
- [ ] Add `variations` parameter to `update_task_status()` call
- [ ] Save file

### Step 4: Apply Bug #3 Fix
- [ ] Navigate to line 450
- [ ] Add `variations` field to `current_status` dict
- [ ] Save file

### Step 5: Test Locally
- [ ] Start frontend dev server: `cd frontend && pnpm dev`
- [ ] Open browser DevTools → Network tab
- [ ] Generate a test song
- [ ] Monitor WebSocket messages for `variations` field
- [ ] Verify Song Switcher appears after generation completes

### Step 6: Verify Persistence
- [ ] Refresh the page
- [ ] Confirm Song Switcher still shows
- [ ] Verify variations are still accessible

### Step 7: Test Reconnection
- [ ] Close browser tab
- [ ] Reopen playback page
- [ ] Confirm variations are restored

---

## Testing Checklist

### Unit Testing
- [ ] Verify `status_update` dict structure in WebSocket messages
- [ ] Verify `update_task_status()` receives variations parameter
- [ ] Verify Firestore document contains variations array
- [ ] Verify `current_status` dict includes variations

### Integration Testing
- [ ] End-to-end: Generate → See variations → Switch variations
- [ ] Persistence: Generate → Refresh → Variations still present
- [ ] Reconnection: Generate → Close tab → Reopen → Variations restored
- [ ] Error handling: Verify graceful fallback if variations empty

### Browser Testing
- [ ] Chrome/Edge: Verify WebSocket messages
- [ ] Firefox: Verify WebSocket messages
- [ ] Safari: Verify WebSocket messages
- [ ] Mobile: Verify Song Switcher displays correctly

### Frontend Verification
- [ ] Song Switcher component renders when `variations.length >= 2`
- [ ] Version 1 and Version 2 buttons are clickable
- [ ] Switching variations updates audio player URL
- [ ] Loading indicator shows during switch
- [ ] Error messages display if switch fails

---

## Rollback Plan

If issues arise:

1. **Revert changes:**
   ```bash
   git checkout backend/app/api/websocket.py
   ```

2. **Restart backend:**
   ```bash
   poetry run uvicorn app.main:app --reload
   ```

3. **Clear browser cache:**
   - DevTools → Application → Clear storage

---

## Risk Assessment

### Low Risk Factors
- ✅ Changes are isolated to WebSocket broadcasting layer
- ✅ No database schema changes
- ✅ No API contract changes (only adding optional field)
- ✅ Backward compatible (frontend already handles empty variations)
- ✅ No changes to Suno API integration

### Potential Issues
- ⚠️ If `suno_status.variations` is None/empty, need to handle gracefully
  - **Mitigation:** Use list comprehension with default empty list
- ⚠️ If Firestore update fails, variations won't persist
  - **Mitigation:** Already handled by existing error handling in `update_task_status()`

---

## Success Criteria

✅ **All criteria must be met:**

1. Song Switcher component displays when 2 variations generated
2. WebSocket messages include `variations` array with 2 items
3. Variations persist in Firestore after generation
4. Variations restore on page refresh
5. Variations restore on client reconnection
6. No errors in browser console
7. No errors in backend logs
8. All existing tests still pass

---

## Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | Fix WebSocket broadcasting | 15 min | Ready |
| 2 | Fix Firestore persistence | 15 min | Ready |
| 3 | Fix subscribe response | 15 min | Ready |
| 4 | Local testing | 30 min | Ready |
| 5 | Integration testing | 30 min | Ready |
| **Total** | | **~2 hours** | **Ready** |

---

## Code Review Checklist

Before committing:

- [ ] All 3 bugs fixed
- [ ] No syntax errors
- [ ] No breaking changes to existing code
- [ ] Proper error handling for edge cases
- [ ] Code follows existing style/conventions
- [ ] Comments added for clarity
- [ ] No console.log statements left
- [ ] All tests passing

---

## Post-Implementation

### Monitoring
- [ ] Monitor error logs for WebSocket issues
- [ ] Check Firestore for variations data
- [ ] Monitor frontend for Song Switcher rendering

### Documentation
- [ ] Update SONG_PLAYBACK_ANALYSIS.md with fix details
- [ ] Add comment in code explaining variations flow
- [ ] Document WebSocket message format

### Future Improvements
- [ ] Add unit tests for WebSocket message format
- [ ] Add integration tests for variations persistence
- [ ] Consider adding metrics for variation switching usage

---

## Questions & Clarifications

**Q: Will this affect existing songs without variations?**  
A: No. Backward compatibility is maintained. Songs with empty variations array will work fine.

**Q: Do we need to migrate existing data?**  
A: No. This only affects new songs generated after the fix.

**Q: Will this impact performance?**  
A: Negligible. Adding 2 objects to WebSocket message is minimal overhead.

**Q: What if Suno API returns more than 2 variations?**  
A: Current code limits to 2 variations (`suno_data[:2]`), so only 2 will be sent.

---

## Sign-Off

**Ready to implement:** ✅ Yes

**Estimated completion:** 2-3 hours

**Next step:** Begin Phase 1 implementation

