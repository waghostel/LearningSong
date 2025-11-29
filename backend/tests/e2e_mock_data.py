"""
Mock data definitions for E2E Chrome DevTools testing.

This module provides comprehensive mock data structures for testing the LearningSong
application's complete user journey without requiring actual backend services.

Requirements covered:
- 1.4: Mocked API responses for lyrics generation
- 1.5: Mocked error responses for error handling
- 2.1: Mocked lyrics data for Page B
- 2.6: Mocked song generation responses
- 2.7: Mocked WebSocket update sequences
- 3.1: Mocked song data for Page C playback
- 4.2: Mocked WebSocket status updates
- 6.1, 6.2, 6.3, 6.4: Mocked error responses (rate limit, server error, timeout, validation)
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List

# ============================================================================
# LYRICS GENERATION MOCKS
# ============================================================================

MOCK_LYRICS_SUCCESS = {
    "lyrics": """[Verse 1]
Learning is a journey, step by step we go
Building up our knowledge, watching as we grow
Every single concept, every single fact
Helps us understand the world, that's an actual fact

[Chorus]
Education opens doors, shows us what's in store
Knowledge is the key to unlock so much more
From the basics to advanced, we're taking our chance
Learning makes us better, gives our minds a dance

[Verse 2]
Practice makes us perfect, repetition is the way
Understanding deepens when we study every day
Questions lead to answers, curiosity's our guide
With each new discovery, we're learning with pride

[Chorus]
Education opens doors, shows us what's in store
Knowledge is the key to unlock so much more
From the basics to advanced, we're taking our chance
Learning makes us better, gives our minds a dance

[Bridge]
Never stop exploring, never cease to learn
Every page we turn, there's wisdom we can earn
The journey never ends, there's always more to know
Education lights the path wherever we may go

[Outro]
So keep on learning, keep on growing strong
With education by our side, we can't go wrong""",
    "content_hash": "abc123def456ghi789",
    "word_count": 150,
    "search_used": False
}

MOCK_LYRICS_WITH_SEARCH = {
    "lyrics": """[Verse 1]
Enriched with context from the world around
Deep research and knowledge, wisdom we have found
Google's vast resources help us understand
Every topic better, information at hand

[Chorus]
Learning with the internet, facts at our command
Understanding grows when we explore the land
Of knowledge and discovery, truth is what we seek
Education empowered, future looking sleek

[Verse 2]
Search results enlighten, articles explain
Multiple perspectives help us use our brain
Critical thinking matters, sources we must check
Quality information keeps our learning on deck

[Chorus]
Learning with the internet, facts at our command
Understanding grows when we explore the land
Of knowledge and discovery, truth is what we seek
Education empowered, future looking sleek

[Bridge]
Digital age learning, technology's our friend
Combining human wisdom with the tools we blend
Research and reflection, both are key to growth
Education's evolution, we embrace them both

[Outro]
Keep searching, keep learning, knowledge has no end
With research as our ally, understanding we extend""",
    "content_hash": "xyz789uvw012rst345",
    "word_count": 200,
    "search_used": True
}

MOCK_LYRICS_SHORT = {
    "lyrics": """[Verse]
Learning is fun, knowledge is key
Education sets us free

[Chorus]
Study hard, reach for the stars
Education takes us far""",
    "content_hash": "short123abc456",
    "word_count": 50,
    "search_used": False
}

MOCK_LYRICS_LONG = {
    "lyrics": """[Verse 1]
""" + ("Learning is a journey that never ends, " * 50) + """

[Chorus]
""" + ("Education is the key to success, " * 30) + """

[Verse 2]
""" + ("Knowledge grows with every lesson learned, " * 50) + """

[Bridge]
""" + ("Understanding comes from dedication, " * 40) + """

[Outro]
""" + ("Keep learning forever, " * 20),
    "content_hash": "long789xyz012",
    "word_count": 500,
    "search_used": False
}

# ============================================================================
# SONG GENERATION MOCKS
# ============================================================================

MOCK_SONG_GENERATION_QUEUED = {
    "task_id": "task_abc123def456",
    "status": "queued",
    "message": "Song generation queued successfully"
}

MOCK_SONG_GENERATION_PROCESSING = {
    "task_id": "task_abc123def456",
    "status": "processing",
    "message": "Song is being generated"
}

MOCK_SONG_GENERATION_COMPLETED = {
    "task_id": "task_abc123def456",
    "status": "completed",
    "message": "Song generation completed",
    "song_id": "song_xyz789uvw012",
    "song_url": "https://mock-cdn.suno.ai/song_xyz789uvw012.mp3"
}

MOCK_SONG_GENERATION_FAILED = {
    "task_id": "task_abc123def456",
    "status": "failed",
    "message": "Song generation failed due to an error",
    "error": "Suno API returned an error"
}

# ============================================================================
# WEBSOCKET UPDATE SEQUENCES
# ============================================================================

MOCK_WEBSOCKET_SEQUENCE_SUCCESS: List[Dict[str, Any]] = [
    {
        "task_id": "task_abc123def456",
        "status": "queued",
        "progress": 0,
        "message": "Your song is queued for generation"
    },
    {
        "task_id": "task_abc123def456",
        "status": "processing",
        "progress": 25,
        "message": "Generating musical composition..."
    },
    {
        "task_id": "task_abc123def456",
        "status": "processing",
        "progress": 50,
        "message": "Creating vocals and melody..."
    },
    {
        "task_id": "task_abc123def456",
        "status": "processing",
        "progress": 75,
        "message": "Finalizing audio production..."
    },
    {
        "task_id": "task_abc123def456",
        "status": "completed",
        "progress": 100,
        "message": "Song generation completed!",
        "song_url": "https://mock-cdn.suno.ai/song_xyz789uvw012.mp3",
        "song_id": "song_xyz789uvw012"
    }
]

MOCK_WEBSOCKET_SEQUENCE_FAILED: List[Dict[str, Any]] = [
    {
        "task_id": "task_abc123def456",
        "status": "queued",
        "progress": 0,
        "message": "Your song is queued for generation"
    },
    {
        "task_id": "task_abc123def456",
        "status": "processing",
        "progress": 25,
        "message": "Generating musical composition..."
    },
    {
        "task_id": "task_abc123def456",
        "status": "failed",
        "progress": 25,
        "message": "Song generation failed",
        "error": "Suno API error: Unable to generate song"
    }
]

MOCK_WEBSOCKET_SEQUENCE_SLOW: List[Dict[str, Any]] = [
    {
        "task_id": "task_abc123def456",
        "status": "queued",
        "progress": 0,
        "message": "Your song is queued for generation"
    },
    {
        "task_id": "task_abc123def456",
        "status": "processing",
        "progress": 10,
        "message": "Initializing generation..."
    },
    {
        "task_id": "task_abc123def456",
        "status": "processing",
        "progress": 20,
        "message": "Analyzing lyrics structure..."
    },
    {
        "task_id": "task_abc123def456",
        "status": "processing",
        "progress": 35,
        "message": "Generating musical composition..."
    },
    {
        "task_id": "task_abc123def456",
        "status": "processing",
        "progress": 50,
        "message": "Creating vocals..."
    },
    {
        "task_id": "task_abc123def456",
        "status": "processing",
        "progress": 65,
        "message": "Adding instrumentation..."
    },
    {
        "task_id": "task_abc123def456",
        "status": "processing",
        "progress": 80,
        "message": "Mixing audio tracks..."
    },
    {
        "task_id": "task_abc123def456",
        "status": "processing",
        "progress": 95,
        "message": "Finalizing production..."
    },
    {
        "task_id": "task_abc123def456",
        "status": "completed",
        "progress": 100,
        "message": "Song generation completed!",
        "song_url": "https://mock-cdn.suno.ai/song_xyz789uvw012.mp3",
        "song_id": "song_xyz789uvw012"
    }
]

# ============================================================================
# ERROR RESPONSE MOCKS
# ============================================================================

MOCK_ERROR_RATE_LIMIT = {
    "status": 429,
    "detail": "Rate limit exceeded. You can generate 3 songs per day. Please try again tomorrow.",
    "reset_time": (datetime.now() + timedelta(days=1)).replace(hour=0, minute=0, second=0).isoformat() + "Z"
}

MOCK_ERROR_SERVER_ERROR = {
    "status": 500,
    "detail": "Internal server error. Our team has been notified. Please try again later."
}

MOCK_ERROR_TIMEOUT = {
    "status": 504,
    "detail": "Request timeout. The server took too long to respond. Please try again."
}

MOCK_ERROR_VALIDATION_EMPTY_TEXT = {
    "status": 400,
    "detail": "Text content cannot be empty. Please enter some educational content to convert into lyrics."
}

MOCK_ERROR_VALIDATION_TEXT_TOO_LONG = {
    "status": 400,
    "detail": "Text content exceeds 10,000 word limit. Please shorten your content and try again."
}

MOCK_ERROR_VALIDATION_EMPTY_LYRICS = {
    "status": 400,
    "detail": "Lyrics cannot be empty. Please enter lyrics before generating a song."
}

MOCK_ERROR_VALIDATION_LYRICS_TOO_LONG = {
    "status": 400,
    "detail": "Lyrics exceed 3,100 character limit. Please shorten your lyrics to continue."
}

MOCK_ERROR_VALIDATION_LYRICS_TOO_SHORT = {
    "status": 400,
    "detail": "Lyrics must be at least 50 characters. Please add more content."
}

MOCK_ERROR_VALIDATION_NO_STYLE = {
    "status": 400,
    "detail": "Please select a music style before generating your song."
}

MOCK_ERROR_UNAUTHORIZED = {
    "status": 401,
    "detail": "Authentication required. Please sign in to continue."
}

MOCK_ERROR_FORBIDDEN = {
    "status": 403,
    "detail": "You don't have permission to perform this action."
}

MOCK_ERROR_NOT_FOUND = {
    "status": 404,
    "detail": "The requested resource was not found."
}

MOCK_ERROR_NETWORK_OFFLINE = {
    "status": 0,
    "detail": "Network connection lost. Please check your internet connection and try again."
}

# ============================================================================
# SONG DATA MOCKS FOR PAGE C
# ============================================================================

MOCK_SONG_DATA_POP = {
    "id": "song_pop_123abc",
    "audio_url": "https://mock-cdn.suno.ai/song_pop_123abc.mp3",
    "title": "Learning Journey",
    "style": "Pop",
    "duration": 180,  # 3 minutes in seconds
    "created_at": datetime.now().isoformat() + "Z",
    "lyrics": MOCK_LYRICS_SUCCESS["lyrics"],
    "user_id": "anonymous_user_123"
}

MOCK_SONG_DATA_RAP = {
    "id": "song_rap_456def",
    "audio_url": "https://mock-cdn.suno.ai/song_rap_456def.mp3",
    "title": "Knowledge Flow",
    "style": "Rap",
    "duration": 165,
    "created_at": datetime.now().isoformat() + "Z",
    "lyrics": MOCK_LYRICS_WITH_SEARCH["lyrics"],
    "user_id": "anonymous_user_123"
}

MOCK_SONG_DATA_FOLK = {
    "id": "song_folk_789ghi",
    "audio_url": "https://mock-cdn.suno.ai/song_folk_789ghi.mp3",
    "title": "Wisdom Tales",
    "style": "Folk",
    "duration": 195,
    "created_at": datetime.now().isoformat() + "Z",
    "lyrics": MOCK_LYRICS_SUCCESS["lyrics"],
    "user_id": "anonymous_user_123"
}

MOCK_SONG_DATA_ELECTRONIC = {
    "id": "song_electronic_012jkl",
    "audio_url": "https://mock-cdn.suno.ai/song_electronic_012jkl.mp3",
    "title": "Digital Learning",
    "style": "Electronic",
    "duration": 210,
    "created_at": datetime.now().isoformat() + "Z",
    "lyrics": MOCK_LYRICS_WITH_SEARCH["lyrics"],
    "user_id": "anonymous_user_123"
}

MOCK_SONG_DATA_ROCK = {
    "id": "song_rock_345mno",
    "audio_url": "https://mock-cdn.suno.ai/song_rock_345mno.mp3",
    "title": "Education Revolution",
    "style": "Rock",
    "duration": 175,
    "created_at": datetime.now().isoformat() + "Z",
    "lyrics": MOCK_LYRICS_SUCCESS["lyrics"],
    "user_id": "anonymous_user_123"
}

MOCK_SONG_DATA_JAZZ = {
    "id": "song_jazz_678pqr",
    "audio_url": "https://mock-cdn.suno.ai/song_jazz_678pqr.mp3",
    "title": "Smooth Knowledge",
    "style": "Jazz",
    "duration": 200,
    "created_at": datetime.now().isoformat() + "Z",
    "lyrics": MOCK_LYRICS_WITH_SEARCH["lyrics"],
    "user_id": "anonymous_user_123"
}

MOCK_SONG_DATA_CHILDRENS = {
    "id": "song_childrens_901stu",
    "audio_url": "https://mock-cdn.suno.ai/song_childrens_901stu.mp3",
    "title": "Learning is Fun",
    "style": "Children's",
    "duration": 150,
    "created_at": datetime.now().isoformat() + "Z",
    "lyrics": MOCK_LYRICS_SHORT["lyrics"],
    "user_id": "anonymous_user_123"
}

MOCK_SONG_DATA_CLASSICAL = {
    "id": "song_classical_234vwx",
    "audio_url": "https://mock-cdn.suno.ai/song_classical_234vwx.mp3",
    "title": "Symphony of Knowledge",
    "style": "Classical",
    "duration": 240,
    "created_at": datetime.now().isoformat() + "Z",
    "lyrics": MOCK_LYRICS_LONG["lyrics"],
    "user_id": "anonymous_user_123"
}

# ============================================================================
# MUSIC STYLES
# ============================================================================

MUSIC_STYLES = [
    "Pop",
    "Rap",
    "Folk",
    "Electronic",
    "Rock",
    "Jazz",
    "Children's",
    "Classical"
]

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_mock_song_by_style(style: str) -> Dict[str, Any]:
    """Get mock song data for a specific music style."""
    style_map = {
        "Pop": MOCK_SONG_DATA_POP,
        "Rap": MOCK_SONG_DATA_RAP,
        "Folk": MOCK_SONG_DATA_FOLK,
        "Electronic": MOCK_SONG_DATA_ELECTRONIC,
        "Rock": MOCK_SONG_DATA_ROCK,
        "Jazz": MOCK_SONG_DATA_JAZZ,
        "Children's": MOCK_SONG_DATA_CHILDRENS,
        "Classical": MOCK_SONG_DATA_CLASSICAL
    }
    return style_map.get(style, MOCK_SONG_DATA_POP)


def get_mock_error_by_type(error_type: str) -> Dict[str, Any]:
    """Get mock error response by error type."""
    error_map = {
        "rate_limit": MOCK_ERROR_RATE_LIMIT,
        "server_error": MOCK_ERROR_SERVER_ERROR,
        "timeout": MOCK_ERROR_TIMEOUT,
        "validation_empty_text": MOCK_ERROR_VALIDATION_EMPTY_TEXT,
        "validation_text_too_long": MOCK_ERROR_VALIDATION_TEXT_TOO_LONG,
        "validation_empty_lyrics": MOCK_ERROR_VALIDATION_EMPTY_LYRICS,
        "validation_lyrics_too_long": MOCK_ERROR_VALIDATION_LYRICS_TOO_LONG,
        "validation_lyrics_too_short": MOCK_ERROR_VALIDATION_LYRICS_TOO_SHORT,
        "validation_no_style": MOCK_ERROR_VALIDATION_NO_STYLE,
        "unauthorized": MOCK_ERROR_UNAUTHORIZED,
        "forbidden": MOCK_ERROR_FORBIDDEN,
        "not_found": MOCK_ERROR_NOT_FOUND,
        "network_offline": MOCK_ERROR_NETWORK_OFFLINE
    }
    return error_map.get(error_type, MOCK_ERROR_SERVER_ERROR)


def get_websocket_sequence_by_type(sequence_type: str) -> List[Dict[str, Any]]:
    """Get WebSocket update sequence by type."""
    sequence_map = {
        "success": MOCK_WEBSOCKET_SEQUENCE_SUCCESS,
        "failed": MOCK_WEBSOCKET_SEQUENCE_FAILED,
        "slow": MOCK_WEBSOCKET_SEQUENCE_SLOW
    }
    return sequence_map.get(sequence_type, MOCK_WEBSOCKET_SEQUENCE_SUCCESS)


# ============================================================================
# TEST SCENARIO CONFIGURATIONS
# ============================================================================

TEST_SCENARIOS = {
    "happy_path": {
        "lyrics_response": MOCK_LYRICS_SUCCESS,
        "song_generation_response": MOCK_SONG_GENERATION_QUEUED,
        "websocket_sequence": MOCK_WEBSOCKET_SEQUENCE_SUCCESS,
        "song_data": MOCK_SONG_DATA_POP
    },
    "with_search": {
        "lyrics_response": MOCK_LYRICS_WITH_SEARCH,
        "song_generation_response": MOCK_SONG_GENERATION_QUEUED,
        "websocket_sequence": MOCK_WEBSOCKET_SEQUENCE_SUCCESS,
        "song_data": MOCK_SONG_DATA_ELECTRONIC
    },
    "slow_generation": {
        "lyrics_response": MOCK_LYRICS_SUCCESS,
        "song_generation_response": MOCK_SONG_GENERATION_QUEUED,
        "websocket_sequence": MOCK_WEBSOCKET_SEQUENCE_SLOW,
        "song_data": MOCK_SONG_DATA_JAZZ
    },
    "generation_failed": {
        "lyrics_response": MOCK_LYRICS_SUCCESS,
        "song_generation_response": MOCK_SONG_GENERATION_QUEUED,
        "websocket_sequence": MOCK_WEBSOCKET_SEQUENCE_FAILED,
        "song_data": None
    },
    "rate_limit_error": {
        "lyrics_response": None,
        "error": MOCK_ERROR_RATE_LIMIT
    },
    "server_error": {
        "lyrics_response": None,
        "error": MOCK_ERROR_SERVER_ERROR
    },
    "validation_error_text_too_long": {
        "lyrics_response": None,
        "error": MOCK_ERROR_VALIDATION_TEXT_TOO_LONG
    },
    "validation_error_lyrics_too_long": {
        "song_generation_response": None,
        "error": MOCK_ERROR_VALIDATION_LYRICS_TOO_LONG
    }
}