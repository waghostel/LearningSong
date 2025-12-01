# Dual Song Selection Migration Guide

This document provides guidance for deploying the dual song selection feature to existing LearningSong deployments.

**Last Updated:** December 1, 2025  
**Feature:** Dual Song Selection  
**Status:** Implemented

## Overview

The dual song selection feature introduces new database fields and API endpoints to support multiple song variations. This guide explains how to migrate existing deployments with minimal disruption.

### Key Changes

1. **Database Schema**: New `variations` array and `primary_variation_index` fields
2. **API Endpoints**: New endpoints for updating primary variation and fetching variation-specific lyrics
3. **Frontend Components**: New `SongSwitcher` component and `useSongSwitcher` hook
4. **Backward Compatibility**: Old songs automatically migrated on first access

---

## Pre-Migration Checklist

Before deploying the dual song selection feature:

- [ ] Backup Firestore database
- [ ] Review database schema changes
- [ ] Test in development environment
- [ ] Update backend code to latest version
- [ ] Update frontend code to latest version
- [ ] Review API documentation
- [ ] Plan deployment window
- [ ] Notify users of new feature (optional)
- [ ] Prepare rollback plan

---

## Database Schema Migration

### Automatic Migration

The system automatically migrates old songs when they are accessed:

**Old Schema (Before):**
```json
{
  "task_id": "abc123",
  "user_id": "user_123",
  "song_url": "https://cdn.suno.ai/abc123.mp3",
  "audio_id": "audio_id_0",
  "lyrics": "...",
  "style": "pop",
  "status": "completed",
  "created_at": "2025-11-01T10:00:00Z",
  "expires_at": "2025-11-03T10:00:00Z"
}
```

**New Schema (After):**
```json
{
  "task_id": "abc123",
  "user_id": "user_123",
  "variations": [
    {
      "audio_url": "https://cdn.suno.ai/abc123.mp3",
      "audio_id": "audio_id_0",
      "variation_index": 0
    }
  ],
  "primary_variation_index": 0,
  "song_url": "https://cdn.suno.ai/abc123.mp3",
  "audio_id": "audio_id_0",
  "lyrics": "...",
  "style": "pop",
  "status": "completed",
  "created_at": "2025-11-01T10:00:00Z",
  "expires_at": "2025-11-03T10:00:00Z"
}
```

### Migration Process

1. **Detection**: Backend checks for missing `variations` field
2. **Creation**: Creates single-item variations array from `song_url` and `audio_id`
3. **Initialization**: Sets `primary_variation_index: 0`
4. **Preservation**: Keeps old fields for backward compatibility
5. **Transparency**: User sees no change in behavior

### Migration Code

```python
# backend/app/services/song_storage.py

async def get_song_details(song_id: str) -> dict:
    """Get song details with automatic migration."""
    doc = await db.collection('songs').document(song_id).get()
    data = doc.to_dict()
    
    # Automatic migration for old songs
    if 'variations' not in data and 'song_url' in data:
        data['variations'] = [
            {
                'audio_url': data['song_url'],
                'audio_id': data['audio_id'],
                'variation_index': 0
            }
        ]
        data['primary_variation_index'] = 0
        
        # Optionally update database (lazy migration)
        # await db.collection('songs').document(song_id).update(data)
    
    return data
```

### Gradual Migration

The migration is **gradual and non-blocking**:

- Old songs are migrated on first access
- No batch migration required
- No downtime needed
- Users can continue using old songs
- New songs automatically use new schema

---

## Backend Deployment

### Step 1: Update Code

```bash
# Pull latest changes
git pull origin main

# Install dependencies
cd backend
poetry install
```

### Step 2: Update Environment Variables

Add the new `SUNO_MODEL` environment variable (optional):

```bash
# backend/.env

# New: Suno model configuration (optional, defaults to V4)
SUNO_MODEL=V4

# Existing variables remain unchanged
FIREBASE_PROJECT_ID=...
SUNO_API_KEY=...
OPENAI_API_KEY=...
```

### Step 3: Test Backend

```bash
# Start backend
poetry run uvicorn app.main:app --reload

# Test health endpoint
curl http://localhost:8000/health

# Test new endpoints
curl http://localhost:8000/api/songs/{task_id}
# Should return variations array

# Test song generation
# Should generate 2 variations
```

### Step 4: Verify API Endpoints

**New Endpoints:**
- `PATCH /api/songs/{task_id}/primary-variation` - Update primary variation
- `POST /api/songs/{task_id}/timestamped-lyrics/{variation_index}` - Fetch variation-specific lyrics

**Modified Endpoints:**
- `GET /api/songs/{task_id}` - Now returns variations array
- `GET /api/songs/{song_id}/details` - Now returns variations and primary_variation_index

### Step 5: Database Verification

```bash
# Check Firestore for new songs
# Should have:
# - variations array with 2 items
# - primary_variation_index: 0

# Check old songs
# Should still work (auto-migrated on access)
```

---

## Frontend Deployment

### Step 1: Update Code

```bash
# Pull latest changes
git pull origin main

# Install dependencies
cd frontend
pnpm install
```

### Step 2: Update API Client

The API client is automatically updated with new functions:

```typescript
// frontend/src/api/songs.ts

// New functions
export async function updatePrimaryVariation(
  taskId: string,
  variationIndex: number
): Promise<{ success: boolean; primary_variation_index: number }>

export async function fetchVariationTimestampedLyrics(
  taskId: string,
  variationIndex: number
): Promise<{ aligned_words: AlignedWord[]; waveform_data: number[] }>
```

### Step 3: Update Components

New components are available:

```typescript
// frontend/src/components/SongSwitcher.tsx
export function SongSwitcher({ variations, activeIndex, onSwitch, isLoading, disabled }: SongSwitcherProps)

// frontend/src/hooks/useSongSwitcher.ts
export function useSongSwitcher({ taskId, variations, initialIndex, onSwitch }: UseSongSwitcherOptions)
```

### Step 4: Update Pages

Update pages to use new components:

```typescript
// frontend/src/pages/SongPlaybackPage.tsx

import { SongSwitcher } from '@/components/SongSwitcher'
import { useSongSwitcher } from '@/hooks/useSongSwitcher'

export function SongPlaybackPage() {
  const { activeIndex, switchVariation, isLoading } = useSongSwitcher({
    taskId: songDetails.task_id,
    variations: songDetails.variations
  })
  
  return (
    <>
      <AudioPlayer src={songDetails.variations[activeIndex].audioUrl} />
      {songDetails.variations.length >= 2 && (
        <SongSwitcher
          variations={songDetails.variations}
          activeIndex={activeIndex}
          onSwitch={switchVariation}
          isLoading={isLoading}
        />
      )}
    </>
  )
}
```

### Step 5: Test Frontend

```bash
# Start frontend
pnpm dev

# Test song generation
# Should show 2 variations

# Test song switcher
# Should appear when 2+ variations exist

# Test switching
# Should update audio player and lyrics

# Test old songs
# Should work without switcher (1 variation)
```

---

## Deployment Strategy

### Option 1: Blue-Green Deployment (Recommended)

**Advantages:**
- Zero downtime
- Easy rollback
- No user disruption

**Steps:**

1. **Deploy Backend (Blue)**
   - Start new backend instance with dual song support
   - Run tests
   - Keep old backend running

2. **Deploy Frontend (Green)**
   - Start new frontend instance
   - Point load balancer to new frontend
   - Keep old frontend running

3. **Gradual Rollout**
   - Route 10% of traffic to new version
   - Monitor for errors
   - Gradually increase to 100%

4. **Rollback (if needed)**
   - Route traffic back to old version
   - No data loss
   - Users unaffected

### Option 2: Canary Deployment

**Advantages:**
- Gradual rollout
- Early error detection
- Minimal risk

**Steps:**

1. Deploy new version to canary environment
2. Route 5% of traffic to canary
3. Monitor metrics (errors, latency, etc.)
4. Gradually increase traffic (5% → 25% → 50% → 100%)
5. Monitor at each stage
6. Rollback if issues detected

### Option 3: Feature Flag Deployment

**Advantages:**
- Instant enable/disable
- A/B testing capability
- Gradual rollout

**Steps:**

1. Deploy code with feature flag disabled
2. Enable for 10% of users
3. Monitor for issues
4. Gradually enable for more users
5. Enable for all users

---

## Rollback Plan

### If Issues Occur

**Step 1: Identify Issue**

```bash
# Check backend logs
docker logs backend-container

# Check frontend console
# Browser DevTools > Console

# Check Firestore
# Verify data integrity
```

**Step 2: Rollback Backend**

```bash
# Stop new backend
docker stop backend-new

# Start old backend
docker start backend-old

# Verify health
curl http://localhost:8000/health
```

**Step 3: Rollback Frontend**

```bash
# Stop new frontend
docker stop frontend-new

# Start old frontend
docker start frontend-old

# Verify at http://localhost:5173
```

**Step 4: Verify Data**

```bash
# Check Firestore for data integrity
# Old songs should still work
# New songs should be accessible
```

### Data Safety

- **No data loss**: Migration is non-destructive
- **Backward compatible**: Old songs still work
- **Reversible**: Can rollback without issues
- **Gradual**: No sudden changes

---

## Testing Checklist

### Backend Tests

- [ ] Health endpoint responds
- [ ] Song generation creates 2 variations
- [ ] GET /api/songs/{task_id} returns variations array
- [ ] GET /api/songs/{song_id}/details returns variations
- [ ] PATCH /api/songs/{task_id}/primary-variation updates selection
- [ ] POST /api/songs/{task_id}/timestamped-lyrics/{variation_index} fetches lyrics
- [ ] Old songs are auto-migrated
- [ ] Error handling works correctly
- [ ] Rate limiting works
- [ ] WebSocket updates include variations

### Frontend Tests

- [ ] Song generation shows 2 variations
- [ ] SongSwitcher component renders with 2+ variations
- [ ] SongSwitcher hides with 1 variation
- [ ] Clicking switcher updates audio player
- [ ] Switching fetches new timestamped lyrics
- [ ] Loading state displays during switch
- [ ] Error handling shows error message
- [ ] Keyboard navigation works
- [ ] Screen reader announces changes
- [ ] Mobile touch targets are adequate

### Integration Tests

- [ ] Generate song → see 2 variations
- [ ] Switch variation → audio updates
- [ ] Refresh page → primary variation persists
- [ ] Share song → uses primary variation
- [ ] Old songs → work without switcher
- [ ] Offline → queue updates when online
- [ ] Concurrent switches → handled correctly

---

## User Communication

### Announcement (Optional)

```
🎵 New Feature: Choose Your Favorite Song Version

We're excited to announce that you now get TWO song variations when you generate music! 

✨ What's New:
- Generate 2 unique versions of your song
- Switch between versions to compare
- Choose your favorite as the primary version
- Your selection is saved for next time

🎯 How to Use:
1. Generate a song as usual
2. You'll see "Version 1" and "Version 2" buttons
3. Click to switch between versions
4. Your choice is automatically saved

Questions? Check out our updated documentation or contact support.
```

### Help Text Updates

**In-App Help:**
```
Song Switcher Help:
- Click "Version 1" or "Version 2" to switch between generated songs
- The active version is highlighted in blue
- Your selection is saved automatically
- Only appears when 2 versions are available
```

---

## Monitoring

### Key Metrics to Track

1. **Generation Success Rate**
   - Should remain > 95%
   - Monitor for Suno API issues

2. **Average Generation Time**
   - Should be similar to before
   - May vary by model

3. **API Response Times**
   - New endpoints should respond < 500ms
   - Timestamped lyrics may take 2-5 seconds

4. **Error Rates**
   - Should remain < 1%
   - Monitor for new error types

5. **User Engagement**
   - Track switcher usage
   - Monitor which variations users prefer

### Monitoring Queries

```python
# Monitor generation success
SELECT COUNT(*) as total, 
       SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as successful
FROM songs
WHERE created_at > NOW() - INTERVAL 1 HOUR

# Monitor average generation time
SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_time_seconds
FROM songs
WHERE status='completed'
AND created_at > NOW() - INTERVAL 1 HOUR

# Monitor variation usage
SELECT primary_variation_index, COUNT(*) as count
FROM songs
WHERE created_at > NOW() - INTERVAL 1 DAY
GROUP BY primary_variation_index
```

---

## Troubleshooting

### Issue: Variations Not Appearing

**Symptom:** New songs don't have variations array

**Solution:**
1. Verify backend is running latest code
2. Check SUNO_MODEL environment variable is set
3. Restart backend
4. Generate new song
5. Check Firestore for variations field

---

### Issue: SongSwitcher Not Showing

**Symptom:** Component doesn't appear even with 2 variations

**Solution:**
1. Verify frontend is running latest code
2. Check browser console for errors
3. Verify variations array has 2+ items
4. Check CSS is loaded
5. Clear browser cache

---

### Issue: Primary Variation Not Persisting

**Symptom:** Selected variation resets on page reload

**Solution:**
1. Check PATCH endpoint is working
2. Verify user owns the song
3. Check Firestore for primary_variation_index field
4. Check for network errors in browser console
5. Verify backend is updating database

---

### Issue: Timestamped Lyrics Not Loading

**Symptom:** Lyrics don't sync after switching

**Solution:**
1. Check POST endpoint is working
2. Verify audio_id is correct for variation
3. Check Suno API is responding
4. Check for network errors
5. Verify retry logic is working

---

## Performance Optimization

### Database Indexes

Ensure these indexes exist in Firestore:

```
Collection: songs
Index 1: user_id + created_at (for user's song list)
Index 2: expires_at (for cleanup)
Index 3: user_id + status + created_at (for filtering)
```

### Caching Strategy

```python
# Cache song details for 5 minutes
@cache.cached(timeout=300, key_prefix='song_details')
async def get_song_details(song_id: str):
    return await db.collection('songs').document(song_id).get()
```

### Query Optimization

```python
# Use projection to fetch only needed fields
doc = await db.collection('songs').document(song_id).get(
    field_paths=['variations', 'primary_variation_index', 'lyrics']
)
```

---

## Post-Deployment Verification

### Day 1 Checklist

- [ ] All endpoints responding correctly
- [ ] New songs have 2 variations
- [ ] Old songs auto-migrate correctly
- [ ] SongSwitcher appears for 2+ variations
- [ ] Switching updates audio player
- [ ] Primary variation persists
- [ ] Error handling works
- [ ] No increase in error rate
- [ ] Performance metrics normal
- [ ] User feedback positive

### Week 1 Checklist

- [ ] Monitor error rates (should be < 1%)
- [ ] Check user engagement with switcher
- [ ] Verify variation preferences
- [ ] Monitor API response times
- [ ] Check database growth
- [ ] Review user feedback
- [ ] Verify backward compatibility
- [ ] Check for edge cases

### Month 1 Checklist

- [ ] Analyze variation preference patterns
- [ ] Optimize based on usage data
- [ ] Plan next improvements
- [ ] Document lessons learned
- [ ] Update documentation
- [ ] Plan feature enhancements

---

## Support & Resources

- **Migration Issues:** Check troubleshooting section
- **API Documentation:** `docs/dual-song-selection-api.md`
- **Component Documentation:** `docs/song-switcher-component.md`
- **Configuration Guide:** `docs/suno-model-configuration.md`
- **Backend Code:** `backend/app/api/songs.py`
- **Frontend Code:** `frontend/src/components/SongSwitcher.tsx`

---

## FAQ

### Q: Will existing songs break?

**A:** No, existing songs are automatically migrated when accessed. They'll work exactly as before, just without the switcher (since they only have 1 variation).

### Q: Do I need to update the database manually?

**A:** No, migration is automatic. Old songs are migrated on first access.

### Q: Can I rollback if something goes wrong?

**A:** Yes, rollback is safe and non-destructive. No data loss occurs.

### Q: Will users see any downtime?

**A:** No, with blue-green deployment, there's zero downtime.

### Q: How long does migration take?

**A:** Migration is gradual. Old songs are migrated as users access them.

### Q: Do I need to notify users?

**A:** Optional, but recommended. Users will see new feature automatically.

### Q: What if Suno API fails?

**A:** Backend gracefully handles failures. Songs with 1 variation still work.

### Q: Can I disable the feature?

**A:** Yes, just don't deploy the frontend changes. Backend is backward compatible.

