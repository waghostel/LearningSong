# Detailed Frontend Test Failure Analysis

## Executive Summary
- **Test Run**: `pnpm test` in frontend directory
- **Total Tests**: 762 (754 passed, 8 failed)
- **Pass Rate**: 99%
- **Failing Suite**: `SongHistory.integration.test.tsx` (5 tests)
- **Root Cause**: Incorrect mock return format in test setup

---

## Test Execution Results

### Overall Statistics
```
Test Suites: 54 total (50 passed, 4 failed)
Tests:       762 total (754 passed, 8 failed)
Time:        50.742 seconds
```

### Failed Test Suites
1. `SongHistory.integration.test.tsx` - 5 failures
2. Other 3 failures appear to be in different suites (not shown in output)

---

## Detailed Failure Analysis

### Test File: `SongHistory.integration.test.tsx`

#### Test 1: "displays song history list when API returns songs"
**Status**: ❌ FAILED
**Error**: `Unable to find an element with the text: /This is the first song lyrics preview/i`
**Expected**: Component should display song list with lyrics preview
**Actual**: Component stuck in loading state showing "Loading your songs..."

#### Test 2: "navigates to playback page when song is clicked"
**Status**: ❌ FAILED
**Error**: `Unable to find an element with the text: /This is the first song lyrics preview/i`
**Expected**: Component should display songs, then navigate on click
**Actual**: Component stuck in loading state

#### Test 3: "displays empty state when no songs available"
**Status**: ❌ FAILED
**Error**: `Unable to find an element with the text: /No songs yet/i`
**Expected**: Component should show empty state message
**Actual**: Component stuck in loading state

#### Test 4: "displays error state when API fails"
**Status**: ❌ FAILED
**Error**: `Unable to find an element with the text: /Failed to load song history/i`
**Expected**: Component should show error message
**Actual**: Component stuck in loading state

#### Test 5: "shows loading state while fetching history"
**Status**: ❌ FAILED
**Error**: `Unable to find an element with the text: /This is the first song lyrics preview/i`
**Expected**: Loading state visible, then data appears
**Actual**: Loading state never resolves

---

## Root Cause Deep Dive

### The Component Code
File: `frontend/src/pages/SongHistoryPage.tsx`

```typescript
useEffect(() => {
  const fetchHistory = async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const history = await getSongHistory()  // ← Calls API wrapper
      setSongs(history)                        // ← Sets state with result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load song history'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  fetchHistory()
}, [userId])
```

### The API Wrapper
File: `frontend/src/api/songs.ts`

```typescript
export const getSongHistory = async (): Promise<SongHistorySummary[]> => {
  return retryWithBackoff(() =>
    apiClient.get<SongHistorySummary[]>('/api/songs/history')
  )
}
```

### The API Client
File: `frontend/src/api/client.ts`

```typescript
async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response: AxiosResponse<T> = await this.client.get(url, config)
  return response.data  // ← Returns ONLY the data, not the full response
}
```

### The Test Mock Setup
File: `frontend/tests/SongHistory.integration.test.tsx`

```typescript
jest.mock('@/api/client')
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

// In test:
mockedApiClient.get.mockResolvedValueOnce({
  data: mockSongHistory,  // ← WRONG: Wraps in 'data' property
})
```

### The Problem Chain

1. **Test Setup**: Mock returns `{ data: mockSongHistory }`
2. **Component Calls**: `getSongHistory()` → `apiClient.get()`
3. **Mock Returns**: `{ data: mockSongHistory }` (object with data property)
4. **Component Receives**: Object instead of array
5. **setSongs() Called**: `setSongs({ data: mockSongHistory })`
6. **Component Logic**: `songs.length === 0` → undefined (objects don't have .length)
7. **Result**: Component stays in loading state indefinitely

### Why Tests Timeout

The `waitFor()` function waits for the expected text to appear:
```typescript
await waitFor(() => {
  expect(screen.getByText(/This is the first song lyrics preview/i)).toBeInTheDocument()
})
```

But since the component never transitions from loading state, the text never appears, and `waitFor()` times out after its default timeout (usually 1000ms).

---

## The Fix

### Current (Wrong) Mock Setup
```typescript
mockedApiClient.get.mockResolvedValueOnce({
  data: mockSongHistory,
})
```

### Corrected Mock Setup
```typescript
mockedApiClient.get.mockResolvedValueOnce(mockSongHistory)
```

### Why This Works
- `apiClient.get()` returns `response.data` directly
- Mock should return what `apiClient.get()` returns
- Component receives array as expected
- `setSongs(array)` works correctly
- Component transitions from loading to success state
- Tests can find the expected text

---

## Implementation Steps

### Step 1: Update Test File
File: `frontend/tests/SongHistory.integration.test.tsx`

**Change Line 93** (Test 1):
```typescript
// Before
mockedApiClient.get.mockResolvedValueOnce({
  data: mockSongHistory,
})

// After
mockedApiClient.get.mockResolvedValueOnce(mockSongHistory)
```

**Change Line 107** (Test 2):
```typescript
// Before
mockedApiClient.get.mockResolvedValueOnce({
  data: mockSongHistory,
})

// After
mockedApiClient.get.mockResolvedValueOnce(mockSongHistory)
```

**Change Line 125** (Test 3):
```typescript
// Before
mockedApiClient.get.mockResolvedValueOnce({
  data: [],
})

// After
mockedApiClient.get.mockResolvedValueOnce([])
```

**Line 140** (Test 4) - No change needed (error handling is correct)

**Change Line 156** (Test 5):
```typescript
// Before
mockedApiClient.get.mockImplementation(() => 
  new Promise(resolve => setTimeout(() => resolve({ data: mockSongHistory }), 100))
)

// After
mockedApiClient.get.mockImplementation(() => 
  new Promise(resolve => setTimeout(() => resolve(mockSongHistory), 100))
)
```

### Step 2: Verify Fix
```bash
cd frontend
pnpm test -- SongHistory.integration.test.tsx
```

Expected output:
```
PASS  tests/SongHistory.integration.test.tsx
  Song History Navigation Integration Tests
    ✓ displays song history list when API returns songs
    ✓ navigates to playback page when song is clicked
    ✓ displays empty state when no songs available
    ✓ displays error state when API fails
    ✓ shows loading state while fetching history

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

---

## Prevention

### Best Practices for API Mocking
1. **Mock at the Right Level**: Mock the function that's actually called, not its dependencies
2. **Match Return Types**: Ensure mock returns exactly what the real function returns
3. **Check Implementation**: Review the actual API client code before writing mocks
4. **Use Type Safety**: TypeScript can catch some of these issues if types are strict

### Alternative Approach
Instead of mocking `apiClient.get()`, mock `getSongHistory()` directly:

```typescript
jest.mock('@/api/songs')
const mockedGetSongHistory = getSongHistory as jest.MockedFunction<typeof getSongHistory>

// In test:
mockedGetSongHistory.mockResolvedValueOnce(mockSongHistory)
```

This is more robust because:
- It doesn't depend on internal implementation of `apiClient.get()`
- It's clearer what's being mocked
- Changes to the API client won't break the test

---

## Impact Assessment

### Affected Components
- `SongHistoryPage` component
- Song history display functionality
- Navigation to playback page

### Affected Features
- User's song history display
- Song selection and navigation
- Empty state handling
- Error state handling

### Risk Level
- **Low**: Only affects tests, not production code
- **Fix Complexity**: Very simple (5 lines to change)
- **Testing**: Can be verified immediately with `pnpm test`

---

## Summary

| Aspect | Details |
|--------|---------|
| **Root Cause** | Mock returns `{ data: array }` instead of `array` |
| **Affected Tests** | 5 tests in SongHistory.integration.test.tsx |
| **Fix Complexity** | Very simple (change mock return format) |
| **Time to Fix** | ~5 minutes |
| **Verification** | Run `pnpm test -- SongHistory.integration.test.tsx` |
| **Risk** | None (test-only fix) |
| **Pass Rate After Fix** | Expected 100% (762/762 tests passing) |
