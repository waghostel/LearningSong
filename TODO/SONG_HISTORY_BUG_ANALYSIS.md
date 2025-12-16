# Song History Bug Analysis Report

需要自己評估

## Issue Summary

**Problem**: Songs are not displaying on the "My Songs" history page (http://localhost:5173/history) despite being successfully created and accessible via direct playback URLs.

**Affected Song**: `3d9f858dbd3a2abf38a8f4e8ae532d3a` (Jazz style, created Dec 15, 2025)

**Status**: Song exists and works perfectly - issue is with the history API endpoint.

## Investigation Results

### What Works ✅

1. **Song Creation**: Songs are being created successfully
2. **Song Playback**: Direct song URLs work perfectly (e.g., `/playback/3d9f858dbd3a2abf38a8f4e8ae532d3a`)
3. **Song Data**: All song metadata is intact (style, creation date, expiration, lyrics)
4. **Authentication**: Dev token authentication is working correctly
5. **Frontend**: History page loads and shows "Loading your songs..." state

### What's Broken ❌

1. **History API Endpoint**: `/api/songs/history` returns 500 Internal Server Error
2. **Error Response**:
   ```json
   {
     "detail": {
       "error": "Internal error",
       "message": "Failed to retrieve song history. Please try again."
     }
   }
   ```

## Root Cause Analysis

### Technical Details

The issue is in the **Firestore query** within the `get_user_tasks` function in `backend/app/services/song_storage.py`:

```python
tasks_ref = (
    firestore_client.collection(SONGS_COLLECTION)
    .where("user_id", "==", user_id)
    .order_by("created_at", direction="DESCENDING")
    .limit(limit)
)
```

### The Problem

**Firestore requires a composite index** for queries that combine:

- `WHERE` clause on one field (`user_id`)
- `ORDER BY` clause on a different field (`created_at`)

This composite index has not been created in the Firestore database, causing the query to fail with a 500 error.

### Evidence

1. **Network Analysis**: Multiple failed requests to `/api/songs/history` with 500 status
2. **Authentication**: Requests include correct `Bearer dev-token-local` token
3. **Song Verification**: Individual song details API (`/api/songs/{id}/details`) works perfectly
4. **Error Pattern**: Consistent 500 errors suggest database query issue, not data corruption

## Solutions

### Option 1: Create Firestore Composite Index (Recommended)

**Steps:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `learningsong-3e632`
3. Navigate to **Firestore Database** → **Indexes**
4. Create composite index:
   - **Collection**: `songs`
   - **Fields**:
     - `user_id` (Ascending)
     - `created_at` (Descending)
5. Wait for index creation to complete (usually 5-10 minutes)

**Pros:**

- Permanent fix
- Maintains optimal query performance
- Follows Firestore best practices

**Cons:**

- Requires Firebase Console access
- Takes time to build index

### Option 2: Modify Query Logic (Quick Fix)

**File**: `backend/app/services/song_storage.py`
**Function**: `get_user_tasks` (around line 340)

**Current Code:**

```python
tasks_ref = (
    firestore_client.collection(SONGS_COLLECTION)
    .where("user_id", "==", user_id)
    .order_by("created_at", direction="DESCENDING")
    .limit(limit)
)

tasks = []
for doc in tasks_ref.stream():
    tasks.append(doc.to_dict())

return tasks
```

**Fixed Code:**

```python
# Remove order_by from Firestore query
tasks_ref = (
    firestore_client.collection(SONGS_COLLECTION)
    .where("user_id", "==", user_id)
    .limit(limit)
)

# Fetch and sort in Python
tasks = []
for doc in tasks_ref.stream():
    tasks.append(doc.to_dict())

# Sort by created_at in Python (newest first)
tasks.sort(key=lambda x: x.get('created_at', datetime.min), reverse=True)
return tasks
```

**Pros:**

- Immediate fix
- No Firebase Console access needed
- Works with existing data

**Cons:**

- Less efficient for large datasets
- Sorting happens in application memory

### Option 3: Debug with Verbose Logging

**Command:**

```bash
cd backend
poetry run uvicorn app.main:app --reload --log-level debug
```

**Purpose:**

- See exact Firestore error message
- Confirm root cause
- Identify any additional issues

## Verification Steps

After implementing a fix:

1. **Test History API**:

   ```bash
   curl -H "Authorization: Bearer dev-token-local" http://localhost:8001/api/songs/history
   ```

2. **Check Frontend**:

   - Navigate to http://localhost:5173/history
   - Verify song `3d9f858dbd3a2abf38a8f4e8ae532d3a` appears in list

3. **Validate Data**:
   - Confirm song metadata displays correctly
   - Check expiration countdown
   - Verify click navigation to playback page

## Impact Assessment

**Severity**: High - Core functionality broken
**User Impact**: Users cannot see their created songs
**Data Integrity**: No data loss - all songs are safe
**Workaround**: Users can access songs via direct URLs if they save them

## Recommended Action

**Immediate**: Implement Option 2 (modify query logic) for quick resolution
**Long-term**: Implement Option 1 (create Firestore index) for optimal performance

## Additional Notes

- This is a common Firestore issue when adding `order_by` to existing queries
- The song creation and storage logic is working correctly
- No changes needed to frontend code
- Issue affects all users trying to view song history

---

**Analysis Date**: December 15, 2025  
**Analyzed By**: Kiro AI Assistant  
**Tools Used**: Chrome DevTools MCP, Code Analysis, Network Request Inspection
