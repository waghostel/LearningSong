# 🚨 Quick Fix Guide - Critical Bugs

**Status:** 🔴 2 Critical Bugs Blocking Testing  
**Estimated Fix Time:** 1-2 hours  
**Priority:** P0 - Fix immediately  

---

## 🔴 Bug #1: Rate Limit Endpoint Missing (404)

### Problem
```
GET http://localhost:8000/api/user/rate-limit
Response: 404 Not Found
```

### Quick Fix Steps

#### Step 1: Check if endpoint exists
```bash
# Search for the endpoint in backend code
cd backend
grep -r "rate-limit" app/
```

#### Step 2: Verify endpoint implementation
Check `backend/app/api/lyrics.py` should have:
```python
@router.get("/user/rate-limit", response_model=RateLimitResponse)
async def get_rate_limit(user_id: str = Depends(get_current_user)):
    """Get current user's rate limit status"""
    return await rate_limiter.get_rate_limit(user_id)
```

#### Step 3: Verify router registration
Check `backend/app/main.py` should have:
```python
from app.api import lyrics

app.include_router(lyrics.router, prefix="/api")
```

#### Step 4: Check router prefix
In `backend/app/api/lyrics.py`:
```python
router = APIRouter(prefix="/lyrics", tags=["lyrics"])
```

**Expected full path:** `/api/lyrics/user/rate-limit`  
**Frontend calls:** `/api/user/rate-limit`

**⚠️ PATH MISMATCH DETECTED!**

### Most Likely Issue
The router prefix is `/api/lyrics` but the endpoint is defined as `/user/rate-limit`, making the full path `/api/lyrics/user/rate-limit`.

However, the frontend is calling `/api/user/rate-limit`.

### Solution Options

**Option A: Move endpoint to separate router (RECOMMENDED)**
```python
# In backend/app/api/user.py (create new file)
from fastapi import APIRouter, Depends
from app.models.user import RateLimitResponse
from app.services.rate_limiter import get_rate_limit
from app.core.auth import get_current_user

router = APIRouter(prefix="/user", tags=["user"])

@router.get("/rate-limit", response_model=RateLimitResponse)
async def get_user_rate_limit(user_id: str = Depends(get_current_user)):
    """Get current user's rate limit status"""
    return await get_rate_limit(user_id)
```

Then in `main.py`:
```python
from app.api import lyrics, user

app.include_router(lyrics.router, prefix="/api")
app.include_router(user.router, prefix="/api")
```

**Option B: Change frontend API call**
Update `frontend/src/api/lyrics.ts` to call `/api/lyrics/user/rate-limit`

**Option C: Change router prefix**
In `backend/app/api/lyrics.py`, remove `/lyrics` from router prefix and add to individual endpoints.

### Test the Fix
```bash
# Test with curl
curl http://localhost:8000/api/user/rate-limit

# Expected response:
# {"remaining": 3, "reset_time": "2025-11-25T00:00:00Z"}
```

---

## 🔴 Bug #2: Generate Button Stays Disabled

### Problem
Generate button remains disabled even with valid content (60 words).

### Root Cause
Likely caused by Bug #1. The button probably checks:
1. ✅ Content is valid (1-10,000 words)
2. ❌ Rate limit is available (fails because endpoint returns 404)
3. ✅ Not currently generating

### Quick Fix
**Fix Bug #1 first** - this will likely resolve Bug #2 automatically.

### If Bug #2 Persists After Fixing Bug #1

Check `frontend/src/components/GenerateButton.tsx`:
```typescript
// Look for disabled condition
const isDisabled = 
  !content.trim() ||                    // Empty content
  wordCount > 10000 ||                  // Too many words
  wordCount === 0 ||                    // No content
  isGenerating ||                       // Currently generating
  rateLimitData?.remaining === 0;       // Rate limit reached

// If rateLimitData is undefined (error state), button stays disabled
// Fix: Allow generation if rate limit check fails
const isDisabled = 
  !content.trim() ||
  wordCount > 10000 ||
  wordCount === 0 ||
  isGenerating ||
  (rateLimitData?.remaining === 0);     // Only disable if explicitly 0
```

### Test the Fix
1. Enter 60 words in textarea
2. Verify word counter shows "60 / 10,000 words"
3. Verify button is enabled (not grayed out)
4. Click button or press Ctrl+Enter
5. Verify generation starts

---

## ✅ Verification Checklist

After implementing fixes, verify:

### Backend Verification
- [ ] `curl http://localhost:8000/api/user/rate-limit` returns 200 OK
- [ ] Response includes `remaining` and `reset_time` fields
- [ ] No 404 errors in backend logs
- [ ] Endpoint appears in Swagger docs: http://localhost:8000/docs

### Frontend Verification
- [ ] Open http://localhost:5173/
- [ ] Rate limit indicator shows "🎵 3/3 songs remaining today" (not error)
- [ ] No 404 errors in browser console
- [ ] Enter 60 words in textarea
- [ ] Generate button becomes enabled (not grayed out)
- [ ] Can click generate button

### Network Verification
- [ ] Open Chrome DevTools → Network tab
- [ ] Refresh page
- [ ] See successful GET /api/user/rate-limit request (200 OK)
- [ ] No 404 errors
- [ ] Response body contains rate limit data

---

## 🧪 Quick Test Script

```bash
# Terminal 1: Start backend
cd backend
poetry run uvicorn app.main:app --reload

# Terminal 2: Test endpoint
curl -X GET http://localhost:8000/api/user/rate-limit \
  -H "Content-Type: application/json"

# Expected output:
# {"remaining":3,"reset_time":"2025-11-25T00:00:00Z"}

# Terminal 3: Start frontend
cd frontend
pnpm dev

# Then open browser to http://localhost:5173/
```

---

## 📋 Implementation Checklist

### For Backend Developer

- [ ] Create `backend/app/api/user.py` with rate limit endpoint
- [ ] Register user router in `backend/app/main.py`
- [ ] Test endpoint with curl
- [ ] Verify Swagger docs show endpoint
- [ ] Check backend logs for errors
- [ ] Verify mock authentication works
- [ ] Test with Postman/curl

### For Frontend Developer (if needed)

- [ ] Update API call path if backend uses different route
- [ ] Adjust button disabled logic if needed
- [ ] Test rate limit indicator updates
- [ ] Test generate button enables
- [ ] Verify error handling for rate limit failures

---

## 🆘 If Fixes Don't Work

### Debug Rate Limit Endpoint

1. **Check backend is running:**
   ```bash
   curl http://localhost:8000/docs
   # Should return Swagger UI HTML
   ```

2. **Check all registered routes:**
   ```bash
   curl http://localhost:8000/openapi.json | jq '.paths'
   # Look for /api/user/rate-limit
   ```

3. **Check backend logs:**
   ```bash
   # Look for route registration messages
   # Look for any errors during startup
   ```

4. **Test with authentication:**
   ```bash
   # If endpoint requires auth, add header
   curl -X GET http://localhost:8000/api/user/rate-limit \
     -H "Authorization: Bearer mock-token"
   ```

### Debug Generate Button

1. **Check browser console:**
   ```javascript
   // In browser console
   // Check rate limit data
   console.log(window.__REACT_QUERY_DEVTOOLS__);
   ```

2. **Check component state:**
   ```javascript
   // In browser console
   // Find button element
   const button = document.querySelector('button[aria-label="Generate lyrics from content"]');
   console.log('Disabled:', button.disabled);
   console.log('Button:', button);
   ```

3. **Check Zustand store:**
   ```javascript
   // In browser console
   // Access store (if exposed)
   console.log('Store:', window.__ZUSTAND_STORES__);
   ```

---

## 📞 Need Help?

If you're stuck:

1. Check the detailed debug report: `debug-findings-summary.md`
2. Review the full debug plan: `chrome-devtools-debug-plan.md`
3. Check the design document: `design.md`
4. Review the tasks: `tasks.md`

---

## ⏱️ Time Estimates

- **Bug #1 Fix:** 30-60 minutes
- **Bug #2 Verification:** 10-15 minutes (should auto-fix)
- **Testing:** 15-30 minutes
- **Total:** 1-2 hours

---

**Last Updated:** November 24, 2025  
**Status:** Ready for implementation  
**Blocking:** 42 test cases
