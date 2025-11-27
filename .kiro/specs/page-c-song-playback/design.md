# Design Document: Page C - Song Playback

## Overview

Page C is the Song Playback Page for the LearningSong application. It serves as the final destination in the user flow where users can play, download, and share AI-generated songs created from their educational content. The page integrates with the existing backend infrastructure to retrieve song data and provides a rich audio playback experience with synchronized lyrics display.

The implementation follows the existing patterns established in Pages A and B, using React with TypeScript, Zustand for state management, and the existing API client infrastructure.

## Architecture

```mermaid
graph TB
    subgraph Frontend
        SongPlaybackPage[SongPlaybackPage.tsx]
        AudioPlayer[AudioPlayer Component]
        LyricsDisplay[LyricsDisplay Component]
        SongMetadata[SongMetadata Component]
        ShareButton[ShareButton Component]
        SongPlaybackStore[songPlaybackStore.ts]
    end
    
    subgraph Backend
        SongsAPI[/api/songs/:song_id]
        ShareAPI[/api/songs/:song_id/share]
        RateLimitAPI[/api/user/rate-limit]
        SongStorage[song_storage.py]
        Firestore[(Firestore)]
    end
    
    subgraph External
        SunoAudio[Suno Audio CDN]
    end
    
    SongPlaybackPage --> AudioPlayer
    SongPlaybackPage --> LyricsDisplay
    SongPlaybackPage --> SongMetadata
    SongPlaybackPage --> ShareButton
    SongPlaybackPage --> SongPlaybackStore
    
    SongPlaybackStore --> SongsAPI
    SongPlaybackStore --> ShareAPI
    SongPlaybackStore --> RateLimitAPI
    
    SongsAPI --> SongStorage
    ShareAPI --> SongStorage
    SongStorage --> Firestore
    
    AudioPlayer --> SunoAudio
```

## Components and Interfaces

### Backend Components

#### 1. Song Details Endpoint (`GET /api/songs/{song_id}/details`)

New endpoint to retrieve complete song details for playback.

```python
@router.get("/{song_id}/details", response_model=SongDetails)
async def get_song_details(
    song_id: str,
    user_id: str = Depends(get_current_user)
) -> SongDetails:
    """
    Get complete song details for playback page.
    
    Returns:
        SongDetails with song_url, lyrics, style, metadata, and expiration info
        
    Raises:
        HTTPException: 404 if song not found
        HTTPException: 410 if song has expired
        HTTPException: 403 if user doesn't own the song
    """
```

#### 2. Share Link Endpoint (`POST /api/songs/{song_id}/share`)

New endpoint to generate shareable links.

```python
@router.post("/{song_id}/share", response_model=ShareLinkResponse)
async def create_share_link(
    song_id: str,
    user_id: str = Depends(get_current_user)
) -> ShareLinkResponse:
    """
    Generate a shareable link for a song.
    
    Returns:
        ShareLinkResponse with share_url and expires_at
    """
```

#### 3. Public Song Access Endpoint (`GET /api/songs/shared/{share_token}`)

New endpoint for accessing shared songs without authentication.

```python
@router.get("/shared/{share_token}", response_model=SongDetails)
async def get_shared_song(share_token: str) -> SongDetails:
    """
    Get song details via share token (no auth required).
    
    Returns:
        SongDetails for the shared song
        
    Raises:
        HTTPException: 404 if share token not found
        HTTPException: 410 if share link has expired
    """
```

### Frontend Components

#### 1. SongPlaybackPage (`frontend/src/pages/SongPlaybackPage.tsx`)

Main page component that orchestrates the playback experience.

```typescript
interface SongPlaybackPageProps {
  // Route params
  songId?: string
  shareToken?: string
}
```

#### 2. AudioPlayer (`frontend/src/components/AudioPlayer.tsx`)

HTML5 audio player with custom controls.

```typescript
interface AudioPlayerProps {
  songUrl: string
  onTimeUpdate: (currentTime: number, duration: number) => void
  onEnded: () => void
  onError: (error: Error) => void
  disabled?: boolean
}
```

#### 3. LyricsDisplay (`frontend/src/components/LyricsDisplay.tsx`)

Synchronized lyrics display with auto-scroll.

```typescript
interface LyricsDisplayProps {
  lyrics: string
  currentTime: number
  duration: number
  onManualScroll: () => void
}
```

#### 4. SongMetadata (`frontend/src/components/SongMetadata.tsx`)

Displays song information and expiration status.

```typescript
interface SongMetadataProps {
  style: MusicStyle
  createdAt: Date
  expiresAt: Date
}
```

#### 5. ShareButton (`frontend/src/components/ShareButton.tsx`)

Share functionality with clipboard integration.

```typescript
interface ShareButtonProps {
  songId: string
  onShareSuccess: (shareUrl: string) => void
  onShareError: (error: Error) => void
}
```

### State Management

#### songPlaybackStore (`frontend/src/stores/songPlaybackStore.ts`)

```typescript
interface SongPlaybackState {
  // Song data
  songId: string | null
  songUrl: string | null
  lyrics: string
  style: MusicStyle | null
  createdAt: Date | null
  expiresAt: Date | null
  
  // Playback state
  isPlaying: boolean
  currentTime: number
  duration: number
  isLoading: boolean
  error: string | null
  
  // Share state
  shareUrl: string | null
  isSharing: boolean
  
  // Actions
  loadSong: (songId: string) => Promise<void>
  loadSharedSong: (shareToken: string) => Promise<void>
  setPlaybackState: (isPlaying: boolean) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  createShareLink: () => Promise<string>
  reset: () => void
}
```

## Data Models

### Backend Models

#### SongDetails (Response Model)

```python
class SongDetails(BaseModel):
    """Complete song details for playback page."""
    
    song_id: str
    song_url: str
    lyrics: str
    style: MusicStyle
    created_at: datetime
    expires_at: datetime
    is_owner: bool  # True if requesting user owns the song
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
```

#### ShareLinkResponse (Response Model)

```python
class ShareLinkResponse(BaseModel):
    """Response for share link creation."""
    
    share_url: str
    share_token: str
    expires_at: datetime
```

#### ShareLink (Firestore Document)

```python
# Collection: share_links
{
    "share_token": str,      # Unique token for the share link
    "song_id": str,          # Reference to the song
    "created_by": str,       # User ID who created the share
    "created_at": datetime,
    "expires_at": datetime,  # 48 hours from creation
}
```

### Frontend Types

```typescript
// frontend/src/api/songs.ts (additions)

export interface SongDetails {
  song_id: string
  song_url: string
  lyrics: string
  style: MusicStyle
  created_at: string  // ISO datetime
  expires_at: string  // ISO datetime
  is_owner: boolean
}

export interface ShareLinkResponse {
  share_url: string
  share_token: string
  expires_at: string
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties have been identified:

### Property 1: Time Display Format Consistency

*For any* audio duration and current time values, the displayed time format SHALL always be in MM:SS format with proper zero-padding.

**Validates: Requirements 1.5**

### Property 2: Lyrics Section Highlighting Progression

*For any* song with lyrics and duration, as playback time increases, the highlighted lyrics section index SHALL be monotonically non-decreasing (sections are highlighted in order).

**Validates: Requirements 2.2**

### Property 3: Download Filename Contains Style

*For any* song with a valid style, the generated download filename SHALL contain the style name as a substring.

**Validates: Requirements 3.2**

### Property 4: Expiration Warning Threshold

*For any* song where (expires_at - current_time) is less than 6 hours, the expiration warning indicator SHALL be visible.

**Validates: Requirements 6.2**

### Property 5: Song Details API Response Completeness

*For any* valid song in the database, the GET /api/songs/{song_id}/details response SHALL contain all required fields: song_id, song_url, lyrics, style, created_at, and expires_at.

**Validates: Requirements 8.1**

### Property 6: Song Serialization Round Trip

*For any* valid SongDetails object, serializing to JSON and deserializing back SHALL produce an equivalent object with all fields preserved.

**Validates: Requirements 8.4**

### Property 7: Error Message User-Friendliness

*For any* backend error response, the displayed error message SHALL NOT contain technical details such as stack traces, internal error codes, or system paths.

**Validates: Requirements 9.3**

## Error Handling

### Backend Error Responses

| Scenario | Status Code | Error Response |
|----------|-------------|----------------|
| Song not found | 404 | `{"error": "Song not found", "message": "The requested song could not be found."}` |
| Song expired | 410 | `{"error": "Song expired", "message": "This song has expired and is no longer available."}` |
| Unauthorized access | 403 | `{"error": "Forbidden", "message": "You do not have permission to access this song."}` |
| Share link expired | 410 | `{"error": "Link expired", "message": "This share link has expired. Ask the owner to create a new one."}` |
| Rate limit exceeded | 429 | `{"error": "Rate limit exceeded", "message": "You've reached your daily limit. Try again tomorrow."}` |

### Frontend Error Handling

1. **Audio Load Failure**: Display toast with "Unable to load audio. Please try again." and retry button
2. **Network Offline**: Pause playback, show offline indicator, queue retry on reconnection
3. **API Errors**: Map backend errors to user-friendly messages, never expose technical details
4. **Expired Song**: Disable all controls, show expiration notice with link to create new song

## Testing Strategy

### Dual Testing Approach

This implementation uses both unit tests and property-based tests for comprehensive coverage:

- **Unit tests** verify specific examples, edge cases, and integration points
- **Property-based tests** verify universal properties that should hold across all inputs

### Property-Based Testing Framework

- **Backend**: pytest with `hypothesis` library
- **Frontend**: Jest with `fast-check` library

Each property-based test will:
1. Run a minimum of 100 iterations
2. Be tagged with a comment referencing the correctness property
3. Use smart generators that constrain to valid input spaces

### Test Categories

#### Backend Tests (pytest + hypothesis)

1. **API Endpoint Tests**
   - Test song details retrieval with various song states
   - Test share link creation and validation
   - Test expired song handling
   - Test authorization checks

2. **Property Tests**
   - Property 5: Song Details API Response Completeness
   - Property 6: Song Serialization Round Trip

#### Frontend Tests (Jest + fast-check + RTL)

1. **Component Tests**
   - AudioPlayer controls and state management
   - LyricsDisplay rendering and scroll behavior
   - SongMetadata display formatting
   - ShareButton clipboard integration

2. **Property Tests**
   - Property 1: Time Display Format Consistency
   - Property 2: Lyrics Section Highlighting Progression
   - Property 3: Download Filename Contains Style
   - Property 4: Expiration Warning Threshold
   - Property 7: Error Message User-Friendliness

3. **Integration Tests**
   - Full page load with mocked API
   - Playback flow from start to finish
   - Share flow with clipboard mock
   - Regenerate flow with navigation

### Test File Structure

```
backend/tests/
  test_song_details_api.py      # API endpoint tests
  test_song_details_props.py    # Property-based tests for backend

frontend/tests/
  AudioPlayer.test.tsx          # Component unit tests
  LyricsDisplay.test.tsx        # Component unit tests
  SongMetadata.test.tsx         # Component unit tests
  ShareButton.test.tsx          # Component unit tests
  SongPlaybackPage.test.tsx     # Page integration tests
  songPlaybackStore.test.ts     # Store unit tests
  song-playback.props.test.ts   # Property-based tests for frontend
```
