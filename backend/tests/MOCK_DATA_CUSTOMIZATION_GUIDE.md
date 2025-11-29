# Mock Data Customization Guide

## Overview

This guide explains how to customize mock data for E2E testing scenarios. Mock data allows testing without requiring backend services, providing consistent and repeatable test results.

## Mock Data Files

### Primary Mock Data File

**Location:** `backend/tests/e2e_mock_data.py`

This file contains all mock data definitions used across E2E tests.

### Mock Data Categories

1. **Lyrics Generation Responses**
2. **Song Generation Responses**
3. **WebSocket Update Sequences**
4. **Error Responses**
5. **Song Playback Data**

## Understanding Mock Data Structure

### Lyrics Generation Mock

```python
MOCK_LYRICS_SUCCESS = {
    "lyrics": "[Verse 1]\nLearning is a journey...",
    "content_hash": "abc123def456",
    "word_count": 150,
    "search_used": False
}
```

**Fields:**
- `lyrics` (string): The generated lyrics in structured format
- `content_hash` (string): Unique hash for caching
- `word_count` (int): Number of words in original content
- `search_used` (bool): Whether Google Search was used

### Song Generation Mock

```python
MOCK_SONG_QUEUED = {
    "task_id": "task_123",
    "status": "queued",
    "message": "Song generation queued"
}

MOCK_SONG_COMPLETED = {
    "task_id": "task_123",
    "status": "completed",
    "song_url": "https://mock-cdn.com/song.mp3",
    "song_id": "song_456"
}
```

**Fields:**
- `task_id` (string): Unique task identifier
- `status` (string): One of: queued, processing, completed, failed
- `message` (string): Status message
- `song_url` (string, optional): URL to audio file (when completed)
- `song_id` (string, optional): Song identifier (when completed)

### WebSocket Update Mock

```python
MOCK_WEBSOCKET_UPDATES = [
    {"task_id": "task_123", "status": "queued", "progress": 0},
    {"task_id": "task_123", "status": "processing", "progress": 25},
    {"task_id": "task_123", "status": "processing", "progress": 50},
    {"task_id": "task_123", "status": "processing", "progress": 75},
    {
        "task_id": "task_123",
        "status": "completed",
        "progress": 100,
        "song_url": "https://mock-cdn.com/song.mp3",
        "song_id": "song_456"
    }
]
```

**Fields:**
- `task_id` (string): Task identifier
- `status` (string): Current status
- `progress` (int): Progress percentage (0-100)
- `song_url` (string, optional): Audio URL when completed
- `song_id` (string, optional): Song ID when completed

### Error Response Mock

```python
MOCK_RATE_LIMIT_ERROR = {
    "status": 429,
    "detail": "Rate limit exceeded. You can generate 3 songs per day.",
    "reset_time": "2025-11-29T00:00:00Z"
}

MOCK_SERVER_ERROR = {
    "status": 500,
    "detail": "Internal server error. Please try again later."
}

MOCK_VALIDATION_ERROR = {
    "status": 400,
    "detail": "Lyrics must be between 50 and 3000 characters"
}
```

**Fields:**
- `status` (int): HTTP status code
- `detail` (string): Error message
- `reset_time` (string, optional): When rate limit resets (ISO 8601)

## Customizing Mock Data

### Step 1: Open Mock Data File

```bash
code backend/tests/e2e_mock_data.py
```

### Step 2: Add Custom Mock Data

#### Example: Custom Lyrics Response

```python
# Add to e2e_mock_data.py

MOCK_LYRICS_MATH_TOPIC = {
    "lyrics": """[Verse 1]
Numbers dance in perfect harmony
Equations solve the mystery
From algebra to geometry
Mathematics sets us free

[Chorus]
Calculate, integrate, differentiate
Every problem has a solution
In the world of mathematics
We find our resolution""",
    "content_hash": "math_topic_hash_001",
    "word_count": 250,
    "search_used": True
}
```

#### Example: Custom Error Scenario

```python
# Add to e2e_mock_data.py

MOCK_CUSTOM_TIMEOUT_ERROR = {
    "status": 504,
    "detail": "Request timeout. The server took too long to respond.",
    "retry_after": 5
}
```

#### Example: Custom WebSocket Sequence

```python
# Add to e2e_mock_data.py

MOCK_WS_SLOW_GENERATION = [
    {"task_id": "slow_task", "status": "queued", "progress": 0},
    {"task_id": "slow_task", "status": "processing", "progress": 10},
    {"task_id": "slow_task", "status": "processing", "progress": 20},
    {"task_id": "slow_task", "status": "processing", "progress": 30},
    # ... more incremental updates
    {"task_id": "slow_task", "status": "completed", "progress": 100}
]
```

### Step 3: Use Custom Mock in Tests

```python
# In your test file
from e2e_mock_data import MOCK_LYRICS_MATH_TOPIC

async def test_math_topic_lyrics():
    # Configure mock to use custom data
    await setup_network_mock("/api/lyrics/generate", MOCK_LYRICS_MATH_TOPIC)
    
    # Run test
    await navigate_to_page_a()
    await fill_text_input("Explain calculus")
    await click_generate_button()
    
    # Verify custom mock data is used
    lyrics = await get_lyrics_text()
    assert "mathematics" in lyrics.lower()
```

## Common Customization Scenarios

### Scenario 1: Testing Different Music Styles

```python
# Create mocks for each style
MOCK_SONG_POP_STYLE = {
    "task_id": "pop_song",
    "status": "completed",
    "song_url": "https://mock-cdn.com/pop-song.mp3",
    "song_id": "pop_001",
    "style": "Pop"
}

MOCK_SONG_JAZZ_STYLE = {
    "task_id": "jazz_song",
    "status": "completed",
    "song_url": "https://mock-cdn.com/jazz-song.mp3",
    "song_id": "jazz_001",
    "style": "Jazz"
}

# Use in test
async def test_different_styles():
    for style_mock in [MOCK_SONG_POP_STYLE, MOCK_SONG_JAZZ_STYLE]:
        await setup_network_mock("/api/songs/generate", style_mock)
        await test_song_generation()
```

### Scenario 2: Testing Character Count Boundaries

```python
# Lyrics at warning threshold (2800 chars)
MOCK_LYRICS_WARNING_LENGTH = {
    "lyrics": "A" * 2800,  # Exactly at warning threshold
    "content_hash": "warning_length",
    "word_count": 400,
    "search_used": False
}

# Lyrics at error threshold (3100 chars)
MOCK_LYRICS_ERROR_LENGTH = {
    "lyrics": "A" * 3100,  # Exceeds maximum
    "content_hash": "error_length",
    "word_count": 450,
    "search_used": False
}
```

### Scenario 3: Testing WebSocket Failures

```python
# WebSocket connection failure
MOCK_WS_CONNECTION_FAILED = {
    "error": "WebSocket connection failed",
    "code": "WS_CONNECTION_ERROR",
    "retry": True
}

# WebSocket message with error
MOCK_WS_GENERATION_FAILED = {
    "task_id": "failed_task",
    "status": "failed",
    "progress": 45,
    "error": "Song generation failed due to content policy violation"
}
```

### Scenario 4: Testing Search Enrichment

```python
# Short content without search
MOCK_LYRICS_SHORT_NO_SEARCH = {
    "lyrics": "[Verse 1]\nQuantum physics\nParticles and waves",
    "content_hash": "short_no_search",
    "word_count": 50,
    "search_used": False
}

# Short content with search enrichment
MOCK_LYRICS_SHORT_WITH_SEARCH = {
    "lyrics": """[Verse 1]
Quantum physics explores the nature
Of particles and waves in motion
Heisenberg's uncertainty principle
Defines the limits of our notion

[Chorus]
From Planck's constant to wave functions
Quantum mechanics reveals
The probabilistic nature
Of what the universe conceals""",
    "content_hash": "short_with_search",
    "word_count": 50,
    "search_used": True
}
```

## Configuring Mock Response Delays

To simulate realistic API response times, configure delays in `e2e_network_mock.py`:

```python
# In e2e_network_mock.py

MOCK_DELAYS = {
    "/api/lyrics/generate": 2.0,      # 2 seconds
    "/api/songs/generate": 1.0,       # 1 second
    "/api/songs/status": 0.5,         # 500ms
}

# For specific scenarios
MOCK_DELAYS_SLOW = {
    "/api/lyrics/generate": 10.0,     # 10 seconds (slow network)
    "/api/songs/generate": 5.0,       # 5 seconds
}

MOCK_DELAYS_TIMEOUT = {
    "/api/lyrics/generate": 60.0,     # 60 seconds (will timeout)
}
```

## Mock Data Validation

Ensure your custom mock data matches the expected TypeScript interfaces:

### Lyrics Response Interface

```typescript
interface LyricsResponse {
  lyrics: string
  content_hash: string
  word_count: number
  search_used: boolean
}
```

### Song Generation Response Interface

```typescript
interface SongGenerationResponse {
  task_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  message?: string
  song_url?: string
  song_id?: string
  error?: string
}
```

### WebSocket Update Interface

```typescript
interface WebSocketUpdate {
  task_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  song_url?: string
  song_id?: string
  error?: string
}
```

## Testing Your Custom Mocks

### Step 1: Create Test Function

```python
async def test_custom_mock():
    """Test with custom mock data."""
    from e2e_mock_data import MOCK_LYRICS_CUSTOM
    
    # Setup mock
    await setup_network_mock("/api/lyrics/generate", MOCK_LYRICS_CUSTOM)
    
    # Run test
    await navigate_to_page_a()
    await fill_text_input("Test content")
    await click_generate_button()
    
    # Verify
    lyrics = await get_lyrics_text()
    assert lyrics == MOCK_LYRICS_CUSTOM["lyrics"]
```

### Step 2: Run Test

```bash
cd backend
poetry run pytest tests/test_custom_mock.py -v
```

### Step 3: Verify Results

Check that:
- Mock data is used instead of real API
- Response format matches expected interface
- UI displays mock data correctly
- No console errors occur

## Best Practices

### 1. Keep Mocks Realistic

Mock data should closely match real API responses:

```python
# Good: Realistic lyrics structure
MOCK_LYRICS_GOOD = {
    "lyrics": "[Verse 1]\nRealistic content\n\n[Chorus]\nWith proper structure",
    "content_hash": "realistic_hash",
    "word_count": 150,
    "search_used": False
}

# Bad: Unrealistic data
MOCK_LYRICS_BAD = {
    "lyrics": "test",
    "content_hash": "x",
    "word_count": -1,
    "search_used": "maybe"  # Wrong type
}
```

### 2. Document Custom Mocks

Add comments explaining what each mock represents:

```python
# Mock for testing math-related content with search enrichment
# Used in: test_math_topic_with_search()
MOCK_LYRICS_MATH_WITH_SEARCH = {
    "lyrics": "...",
    "content_hash": "math_search_001",
    "word_count": 200,
    "search_used": True
}
```

### 3. Version Control Mock Data

When API contracts change, update mocks accordingly:

```python
# v1: Original format
MOCK_LYRICS_V1 = {
    "lyrics": "...",
    "hash": "..."  # Old field name
}

# v2: Updated format
MOCK_LYRICS_V2 = {
    "lyrics": "...",
    "content_hash": "..."  # New field name
}
```

### 4. Organize by Scenario

Group related mocks together:

```python
# === Success Scenarios ===
MOCK_LYRICS_SUCCESS = {...}
MOCK_SONG_SUCCESS = {...}

# === Error Scenarios ===
MOCK_RATE_LIMIT_ERROR = {...}
MOCK_SERVER_ERROR = {...}

# === Edge Cases ===
MOCK_LYRICS_MAX_LENGTH = {...}
MOCK_LYRICS_MIN_LENGTH = {...}
```

## Troubleshooting Mock Data Issues

### Issue: Mock not being used

**Solution:** Verify mock setup is called before test:
```python
await setup_network_mock("/api/lyrics/generate", MOCK_DATA)
```

### Issue: Type mismatch errors

**Solution:** Ensure mock data matches TypeScript interfaces exactly

### Issue: Mock data not displaying in UI

**Solution:** Check browser console for errors, verify data format

## Additional Resources

- `e2e_mock_data.py` - All mock data definitions
- `e2e_network_mock.py` - Network mocking implementation
- `e2e_websocket_mock.py` - WebSocket mocking implementation
- `E2E_TEST_EXECUTION_GUIDE.md` - Complete testing guide

---

**Last Updated:** 2025-11-29
