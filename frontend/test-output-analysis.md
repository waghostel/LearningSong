# Frontend Test Failure Analysis

## Test Summary
- **Total Test Suites**: 54 (4 failed, 50 passed)
- **Total Tests**: 762 (8 failed, 754 passed)
- **Execution Time**: 50.742 seconds

## Failed Test Suites

### 1. SongHistory.integration.test.tsx (4 failures)

All 4 failures are in the "Song History Navigation Integration Tests" suite:

#### Failure 1: "displays both songs when history is loaded"
- **Error**: Unable to find element with text `/This is the first song lyrics preview/i`
- **Root Cause**: The component is stuck in a loading state and never transitions to the loaded state
- **DOM State**: Shows "Loading your songs..." spinner indefinitely
- **Issue**: Mock data is not being resolved or the query hook is not completing

#### Failure 2: "navigates to playback page when song is clicked"
- **Error**: Unable to find element with text `/This is the first song lyrics preview/i`
- **Root Cause**: Same as Failure 1 - loading state never resolves
- **DOM State**: Stuck on loading spinner

#### Failure 3: "displays empty state when no songs available"
- **Error**: Unable to find element with text `/No songs yet/i`
- **Root Cause**: Component not rendering empty state when query returns empty array
- **DOM State**: Stuck on loading spinner instead of showing empty state

#### Failure 4: "displays error state when API fails"
- **Error**: Unable to find element with text `/Failed to load song history/i`
- **Root Cause**: Error state not being rendered when API fails
- **DOM State**: Stuck on loading spinner instead of showing error message

#### Failure 5: "shows loading state while fetching history"
- **Error**: Unable to find element with text `/This is the first song lyrics preview/i`
- **Root Cause**: Same as Failures 1 & 2 - loading state never resolves
- **DOM State**: Stuck on loading spinner

## Root Cause Analysis

### Primary Issue: Incorrect Mock Return Format
The test mocks `apiClient.get()` with the wrong return format.

**The Problem**: 
- The test sets up: `mockedApiClient.get.mockResolvedValueOnce({ data: mockSongHistory })`
- But `apiClient.get()` returns `response.data` directly (see client.ts line 127: `return response.data`)
- So the mock should return just the array: `mockSongHistory`

**Current (Wrong)**:
```typescript
mockedApiClient.get.mockResolvedValueOnce({
  data: mockSongHistory,  // ❌ Wrong - adds extra 'data' wrapper
})
```

**Correct**:
```typescript
mockedApiClient.get.mockResolvedValueOnce(mockSongHistory)  // ✅ Correct - returns array directly
```

When the component calls `getSongHistory()` → `apiClient.get()` → mock returns `{ data: mockSongHistory }`, the component receives an object instead of an array, causing `setSongs()` to fail silently and the component to remain in loading state forever.

### Why This Causes the Tests to Fail:
1. Component calls `getSongHistory()` in `useEffect`
2. `getSongHistory()` calls `apiClient.get()` 
3. Mock returns `{ data: mockSongHistory }` instead of `mockSongHistory`
4. Component receives an object, not an array
5. `setSongs(history)` sets songs to an object instead of array
6. Component's conditional `songs.length === 0` fails (objects don't have `.length`)
7. Component stays in loading state indefinitely
8. Test times out waiting for content that never appears

## Affected Component
- **File**: `frontend/src/pages/SongHistoryPage.tsx` (or similar)
- **Hook**: Likely using `useQuery` from TanStack Query
- **Issue**: Component logic for handling query states

## Other Test Suites
- **50 test suites passed** - Most of the codebase is working correctly
- **754 tests passed** - Only 8 failures out of 762 tests

## Solution

### Option 1: Fix the Mock Return Format (Recommended - Minimal Change)
Change all mock calls in the test from:
```typescript
mockedApiClient.get.mockResolvedValueOnce({
  data: mockSongHistory,
})
```

To:
```typescript
mockedApiClient.get.mockResolvedValueOnce(mockSongHistory)
```

Also fix the error case:
```typescript
// For empty state test
mockedApiClient.get.mockResolvedValueOnce([])

// For error test - keep as is (error handling works correctly)
mockedApiClient.get.mockRejectedValueOnce(new Error('Network error'))
```

### Option 2: Mock `getSongHistory` Directly (More Robust)
Mock the function at the source:
```typescript
jest.mock('@/api/songs')
const mockedGetSongHistory = getSongHistory as jest.MockedFunction<typeof getSongHistory>

// In each test:
mockedGetSongHistory.mockResolvedValueOnce(mockSongHistory)
```

This is more robust because it doesn't depend on internal implementation details of `apiClient.get()`.

## Implementation Priority
1. **Immediate**: Apply Option 1 (fix mock return format) - 5 minute fix
2. **Follow-up**: Consider Option 2 for better test isolation
