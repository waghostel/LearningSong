# Dual Song Selection API Documentation

This document describes the API endpoints and data models for the dual song selection feature, which allows users to receive two song variations and switch between them.

**Last Updated:** December 1, 2025  
**Feature:** Dual Song Selection  
**Status:** Implemented

## Overview

The Suno API generates two song variations by default for each generation request. The dual song selection feature exposes both variations to users, allowing them to compare and select their preferred version.

### Key Concepts

- **Song Variation**: One of two songs generated from the same lyrics and style parameters
- **Primary Variation**: The user's currently selected/active song (default: first variation)
- **Variation Index**: 0-based index identifying which variation (0 or 1)
- **Audio ID**: Unique identifier for each variation used to fetch timestamped lyrics

---

## API Endpoints

### Modified Endpoints

#### GET /api/songs/{task_id}

Returns the current status of a song generation task, including all available variations.

**Request:**
```http
GET /api/songs/{task_id}
Authorization: Bearer {user_token}
```

**Response (200 OK):**
```json
{
  "task_id": "abc123def456",
  "status": "completed",
  "progress": 100,
  "variations": [
    {
      "audioUrl": "https://cdn.suno.ai/abc123_0.mp3",
      "audioId": "audio_id_0",
      "variationIndex": 0
    },
    {
      "audioUrl": "https://cdn.suno.ai/abc123_1.mp3",
      "audioId": "audio_id_1",
      "variationIndex": 1
    }
  ],
  "error": null
}
```

**Response (202 Accepted - Still Generating):**
```json
{
  "task_id": "abc123def456",
  "status": "generating",
  "progress": 45,
  "variations": [],
  "error": null
}
```

**Status Values:**
- `generating` - Song is being created (0-99% progress)
- `completed` - Both variations ready (100% progress)
- `failed` - Generation failed
- `expired` - Song data expired (48-hour TTL)

**Error Scenarios:**
- `404 Not Found` - Task ID doesn't exist
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User doesn't own this task

---

#### GET /api/songs/{song_id}/details

Returns complete song details including all variations and the user's primary selection.

**Request:**
```http
GET /api/songs/{song_id}/details
Authorization: Bearer {user_token}
```

**Response (200 OK):**
```json
{
  "song_id": "song_abc123",
  "task_id": "task_abc123",
  "variations": [
    {
      "audioUrl": "https://cdn.suno.ai/abc123_0.mp3",
      "audioId": "audio_id_0",
      "variationIndex": 0
    },
    {
      "audioUrl": "https://cdn.suno.ai/abc123_1.mp3",
      "audioId": "audio_id_1",
      "variationIndex": 1
    }
  ],
  "primary_variation_index": 1,
  "lyrics": "Verse 1: ...",
  "style": "pop",
  "created_at": "2025-12-01T10:30:00Z",
  "expires_at": "2025-12-03T10:30:00Z",
  "is_owner": true,
  "aligned_words": [...],
  "waveform_data": [...],
  "has_timestamps": true
}
```

**Notes:**
- `primary_variation_index` indicates which variation the user selected (default: 0)
- `aligned_words` and `waveform_data` are for the primary variation
- `is_owner` indicates if the authenticated user created this song

**Error Scenarios:**
- `404 Not Found` - Song doesn't exist
- `401 Unauthorized` - User not authenticated
- `410 Gone` - Song has expired (48-hour TTL)

---

### New Endpoints

#### PATCH /api/songs/{task_id}/primary-variation

Updates which song variation is the user's primary selection.

**Request:**
```http
PATCH /api/songs/{task_id}/primary-variation
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "variation_index": 1
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `variation_index` | integer | Yes | Index of variation to set as primary (0 or 1) |

**Response (200 OK):**
```json
{
  "success": true,
  "primary_variation_index": 1,
  "message": "Primary variation updated successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid variation_index. Must be 0 or 1.",
  "detail": "Received: 2"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Song not found",
  "detail": "Task ID abc123 does not exist"
}
```

**Response (403 Forbidden):**
```json
{
  "error": "Permission denied",
  "detail": "You do not own this song"
}
```

**Validation Rules:**
- `variation_index` must be 0 or 1
- User must own the song (or be viewing a shared song)
- Song must not be expired
- At least one variation must exist

**Behavior:**
- Updates database immediately
- Returns updated `primary_variation_index`
- Does not affect the variations array (both remain stored)
- Persists across sessions

---

#### POST /api/songs/{task_id}/timestamped-lyrics/{variation_index}

Fetches timestamped lyrics for a specific song variation.

**Request:**
```http
POST /api/songs/{task_id}/timestamped-lyrics/{variation_index}
Authorization: Bearer {user_token}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `task_id` | string | Song task ID |
| `variation_index` | integer | Which variation (0 or 1) |

**Response (200 OK):**
```json
{
  "aligned_words": [
    {
      "word": "Verse",
      "start_time": 0.0,
      "end_time": 0.5
    },
    {
      "word": "one",
      "start_time": 0.5,
      "end_time": 1.0
    }
  ],
  "waveform_data": [0.1, 0.2, 0.15, 0.3, ...],
  "audio_id": "audio_id_1"
}
```

**Response (202 Accepted - Processing):**
```json
{
  "status": "processing",
  "message": "Timestamped lyrics are being generated. Please retry in a few seconds."
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid variation_index",
  "detail": "variation_index must be 0 or 1"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Variation not found",
  "detail": "Variation 1 does not exist for this song"
}
```

**Response (503 Service Unavailable):**
```json
{
  "error": "Suno API unavailable",
  "detail": "Unable to fetch timestamped lyrics. Please try again later."
}
```

**Behavior:**
- Retrieves the correct `audio_id` for the specified variation
- Calls Suno API to fetch timestamped lyrics
- Returns aligned words with timing information
- Includes waveform data for visualization
- May return 202 if Suno API is still processing
- Falls back gracefully if Suno API fails

**Retry Logic:**
- Client should retry on 202 response after 2-3 seconds
- Maximum 5 retry attempts recommended
- Exponential backoff: 2s, 4s, 8s, 16s, 32s

---

## Data Models

### SongVariation

Represents a single song variation.

**Backend (Python/Pydantic):**
```python
from pydantic import BaseModel, Field

class SongVariation(BaseModel):
    """Represents a single song variation."""
    
    audio_url: str = Field(
        ...,
        description="URL of the song audio file",
        example="https://cdn.suno.ai/abc123_0.mp3"
    )
    audio_id: str = Field(
        ...,
        description="Unique identifier for fetching timestamped lyrics",
        example="audio_id_0"
    )
    variation_index: int = Field(
        ...,
        description="Index of this variation (0 or 1)",
        ge=0,
        le=1
    )
```

**Frontend (TypeScript):**
```typescript
export interface SongVariation {
  audioUrl: string
  audioId: string
  variationIndex: number
}
```

---

### SongStatusUpdate

Status of a song generation task with variations.

**Backend (Python/Pydantic):**
```python
from typing import Optional, List
from pydantic import BaseModel, Field

class SongStatusUpdate(BaseModel):
    """Status update for a song generation task."""
    
    task_id: str = Field(..., description="Unique task identifier")
    status: str = Field(
        ...,
        description="Generation status",
        enum=["generating", "completed", "failed", "expired"]
    )
    progress: int = Field(
        ...,
        description="Progress percentage (0-100)",
        ge=0,
        le=100
    )
    variations: List[SongVariation] = Field(
        default_factory=list,
        description="Array of song variations (0-2 items)"
    )
    error: Optional[str] = Field(
        None,
        description="Error message if generation failed"
    )
```

**Frontend (TypeScript):**
```typescript
export interface SongStatusUpdate {
  task_id: string
  status: 'generating' | 'completed' | 'failed' | 'expired'
  progress: number
  variations: SongVariation[]
  error?: string
}
```

---

### SongDetails

Complete song details with variations and user selection.

**Backend (Python/Pydantic):**
```python
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class SongDetails(BaseModel):
    """Complete song details with multiple variations."""
    
    song_id: str = Field(..., description="Unique song identifier")
    task_id: str = Field(..., description="Associated task ID")
    variations: List[SongVariation] = Field(
        ...,
        description="Array of song variations (1-2 items)",
        min_length=1,
        max_length=2
    )
    primary_variation_index: int = Field(
        default=0,
        description="Index of user's selected primary variation",
        ge=0,
        le=1
    )
    lyrics: str = Field(..., description="Song lyrics")
    style: str = Field(..., description="Music style (e.g., 'pop', 'rap')")
    created_at: datetime = Field(..., description="Creation timestamp")
    expires_at: datetime = Field(..., description="Expiration timestamp (48 hours)")
    is_owner: bool = Field(..., description="Whether user owns this song")
    aligned_words: Optional[List[dict]] = Field(
        None,
        description="Timestamped lyrics for primary variation"
    )
    waveform_data: Optional[List[float]] = Field(
        None,
        description="Waveform visualization data"
    )
    has_timestamps: bool = Field(
        default=False,
        description="Whether timestamped lyrics are available"
    )
```

**Frontend (TypeScript):**
```typescript
export interface SongDetails {
  song_id: string
  task_id: string
  variations: SongVariation[]
  primary_variation_index: number
  lyrics: string
  style: string
  created_at: string
  expires_at: string
  is_owner: boolean
  aligned_words?: AlignedWord[]
  waveform_data?: number[]
  has_timestamps: boolean
}
```

---

### UpdatePrimaryVariationRequest

Request body for updating primary variation.

**Backend (Python/Pydantic):**
```python
from pydantic import BaseModel, Field

class UpdatePrimaryVariationRequest(BaseModel):
    """Request to update primary variation selection."""
    
    variation_index: int = Field(
        ...,
        description="Index of the variation to set as primary",
        ge=0,
        le=1
    )
```

---

## Database Schema

### Firestore Songs Collection

The `songs` collection in Firestore stores song data with support for multiple variations.

**Document Structure:**
```typescript
{
  // Existing fields
  task_id: string                    // Unique task identifier
  user_id: string                    // Owner's user ID
  content_hash: string               // Hash of original content
  lyrics: string                     // Song lyrics
  style: string                      // Music style
  status: string                     // Generation status
  progress: number                   // Progress percentage
  error: string | null               // Error message if failed
  created_at: Timestamp              // Creation time
  updated_at: Timestamp              // Last update time
  expires_at: Timestamp              // Expiration time (48 hours)
  
  // New fields for dual songs
  variations: [
    {
      audio_url: string              // URL to audio file
      audio_id: string               // ID for timestamped lyrics
      variation_index: number        // 0 or 1
    },
    {
      audio_url: string
      audio_id: string
      variation_index: number
    }
  ]
  primary_variation_index: number    // User's selected variation (default: 0)
  
  // Deprecated but kept for backward compatibility
  song_url: string                   // Points to primary variation
  audio_id: string                   // Points to primary variation
  
  // Timestamped lyrics (for primary variation)
  aligned_words: object[]            // Timestamped words
  waveform_data: number[]            // Waveform visualization
  has_timestamps: boolean            // Whether timestamps available
}
```

**Indexes:**
- Primary: `user_id` + `created_at` (for user's song list)
- Secondary: `expires_at` (for cleanup queries)
- Composite: `user_id` + `status` + `created_at` (for filtering)

**TTL Policy:**
- Documents automatically deleted 48 hours after `created_at`
- Configured via Firestore TTL policy on `expires_at` field

---

## Backward Compatibility

### Migration from Single to Dual Songs

Existing songs in the database that only have `song_url` and `audio_id` fields are automatically migrated when accessed:

**Old Schema:**
```json
{
  "task_id": "abc123",
  "song_url": "https://cdn.suno.ai/abc123.mp3",
  "audio_id": "audio_id_0"
}
```

**Migration Process:**
1. Backend detects missing `variations` field
2. Creates single-item variations array from `song_url` and `audio_id`
3. Sets `primary_variation_index: 0`
4. Returns migrated data to frontend
5. Frontend hides switcher (only 1 variation)

**Migrated Schema:**
```json
{
  "task_id": "abc123",
  "variations": [
    {
      "audio_url": "https://cdn.suno.ai/abc123.mp3",
      "audio_id": "audio_id_0",
      "variation_index": 0
    }
  ],
  "primary_variation_index": 0,
  "song_url": "https://cdn.suno.ai/abc123.mp3",
  "audio_id": "audio_id_0"
}
```

**Behavior:**
- Gradual migration as users access old songs
- No batch migration required
- Old fields remain for compatibility
- New code always uses `variations` array

---

## Error Handling

### Common Error Scenarios

#### 1. Invalid Variation Index

**Scenario:** Client sends `variation_index: 2`

**Response:**
```json
{
  "error": "Invalid variation_index",
  "detail": "variation_index must be 0 or 1. Received: 2"
}
```

**Client Action:** Validate input before sending (0 or 1 only)

---

#### 2. Variation Not Found

**Scenario:** Song only has 1 variation, client requests variation 1

**Response:**
```json
{
  "error": "Variation not found",
  "detail": "Variation 1 does not exist for this song. Available: 1 variation"
}
```

**Client Action:** Check `variations.length` before allowing switch

---

#### 3. Song Expired

**Scenario:** User tries to access song after 48-hour TTL

**Response:**
```json
{
  "error": "Song expired",
  "detail": "This song expired on 2025-12-03T10:30:00Z"
}
```

**Client Action:** Show message "This song has expired. Generate a new one."

---

#### 4. Suno API Unavailable

**Scenario:** Suno API is down when fetching timestamped lyrics

**Response:**
```json
{
  "error": "Suno API unavailable",
  "detail": "Unable to fetch timestamped lyrics. Please try again later."
}
```

**Client Action:** 
- Show error toast
- Fall back to plain lyrics
- Allow retry after delay

---

#### 5. Permission Denied

**Scenario:** User tries to update primary variation for song they don't own

**Response:**
```json
{
  "error": "Permission denied",
  "detail": "You do not own this song"
}
```

**Client Action:** Disable primary variation update for shared songs

---

## Rate Limiting

### API Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| GET /api/songs/{task_id} | 60 requests | 1 minute |
| GET /api/songs/{song_id}/details | 60 requests | 1 minute |
| PATCH /api/songs/{task_id}/primary-variation | 30 requests | 1 minute |
| POST /api/songs/{task_id}/timestamped-lyrics/{variation_index} | 20 requests | 1 minute |

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1701432000
```

### Handling Rate Limits

**Response (429 Too Many Requests):**
```json
{
  "error": "Rate limit exceeded",
  "detail": "Too many requests. Please wait 30 seconds before retrying.",
  "retry_after": 30
}
```

**Client Action:**
- Wait `retry_after` seconds before retrying
- Implement exponential backoff
- Show user-friendly message

---

## Examples

### Example 1: Generate and Switch Songs

```typescript
// 1. Poll for generation status
const status = await fetch('/api/songs/task_abc123').then(r => r.json())
// Returns: { status: 'completed', variations: [...] }

// 2. Display both variations
console.log(`Version 1: ${status.variations[0].audioUrl}`)
console.log(`Version 2: ${status.variations[1].audioUrl}`)

// 3. User switches to version 2
await fetch('/api/songs/task_abc123/primary-variation', {
  method: 'PATCH',
  body: JSON.stringify({ variation_index: 1 })
})

// 4. Fetch timestamped lyrics for version 2
const lyrics = await fetch(
  '/api/songs/task_abc123/timestamped-lyrics/1',
  { method: 'POST' }
).then(r => r.json())

// 5. Update audio player with new variation
audioPlayer.src = status.variations[1].audioUrl
audioPlayer.play()
```

### Example 2: Handle Single Variation

```typescript
const details = await fetch('/api/songs/song_abc123/details').then(r => r.json())

if (details.variations.length === 1) {
  // Hide switcher - only one version available
  songSwitcher.style.display = 'none'
} else {
  // Show switcher - two versions available
  songSwitcher.style.display = 'block'
}
```

### Example 3: Retry Timestamped Lyrics

```typescript
async function fetchTimestampedLyricsWithRetry(taskId, variationIndex, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(
      `/api/songs/${taskId}/timestamped-lyrics/${variationIndex}`,
      { method: 'POST' }
    )
    
    if (response.status === 200) {
      return response.json()
    }
    
    if (response.status === 202) {
      // Still processing - wait and retry
      const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay))
      continue
    }
    
    // Other error - fail
    throw new Error(`Failed to fetch timestamped lyrics: ${response.status}`)
  }
  
  throw new Error('Max retries exceeded')
}
```

---

## Testing

### Unit Tests

Test the API endpoints with various scenarios:

```bash
# Backend
cd backend
poetry run pytest tests/test_songs_api.py -v

# Frontend
cd frontend
pnpm test -- songs.test.ts
```

### Integration Tests

Test the complete flow:

```bash
cd backend
poetry run pytest tests/test_dual_song_integration.py -v
```

### Manual Testing

1. Generate a song and verify both variations are returned
2. Switch between variations and verify audio updates
3. Verify timestamped lyrics fetch for each variation
4. Test error scenarios (invalid index, expired song, etc.)
5. Test backward compatibility with old single-variation songs

---

## Support & Resources

- **API Documentation:** http://localhost:8000/docs (Swagger UI)
- **Backend Code:** `backend/app/api/songs.py`
- **Frontend Code:** `frontend/src/api/songs.ts`
- **Database Schema:** `backend/app/models/songs.py`
- **Tests:** `backend/tests/test_dual_song_*.py`

