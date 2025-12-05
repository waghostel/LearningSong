# Frontend Test Failure Root Cause Summary

## Quick Summary
**8 tests failing in `SongHistory.integration.test.tsx`** due to incorrect mock return format.

## The Issue
The test mocks `apiClient.get()` to return `{ data: mockSongHistory }`, but the API client's `get()` method already extracts and returns just `response.data`. This causes the mock to return a double-wrapped object.

### Code Flow
```
Test Mock:        { data: mockSongHistory }
                         ↓
apiClient.get():  returns response.data directly
                         ↓
Component gets:   { data: mockSongHistory }  ❌ WRONG (should be array)
                         ↓
setSongs():       receives object, not array
                         ↓
Component:        stays in loading state forever
```

## Failing Tests (All in SongHistory.integration.test.tsx)
1. ✗ displays song history list when API returns songs
2. ✗ navigates to playback page when song is clicked
3. ✗ displays empty state when no songs available
4. ✗ displays error state when API fails
5. ✗ shows loading state while fetching history

## The Fix
Change mock setup from:
```typescript
mockedApiClient.get.mockResolvedValueOnce({
  data: mockSongHistory,  // ❌ Wrong
})
```

To:
```typescript
mockedApiClient.get.mockResolvedValueOnce(mockSongHistory)  // ✅ Correct
```

## Files to Update
- `frontend/tests/SongHistory.integration.test.tsx` - Lines 93, 107, 125, 140, 156

## Test Results
- **Before Fix**: 8 failed, 754 passed (99% pass rate)
- **After Fix**: Expected 0 failed, 762 passed (100% pass rate)

## Why This Happened
The test was written assuming `apiClient.get()` returns the full axios response object `{ data: ... }`, but the actual implementation extracts and returns just the data payload. This is a common pattern in API client wrappers to simplify usage.

## Verification
After applying the fix, run:
```bash
cd frontend
pnpm test -- SongHistory.integration.test.tsx
```

All 5 tests should pass.
