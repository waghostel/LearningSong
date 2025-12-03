"""Property-based tests for song history API functionality.

This module contains property-based tests using Hypothesis to verify
correctness properties of the song history feature.

**Feature: song-playback-improvements, Property 9: Song history ordering**
**Validates: Requirements 4.3**

**Feature: song-playback-improvements, Property 10: Song history expiration filtering**
**Validates: Requirements 4.4, 6.1**

**Feature: song-playback-improvements, Property 11: Song history response completeness**
**Validates: Requirements 6.2**

**Feature: song-playback-improvements, Property 12: Song history limit**
**Validates: Requirements 6.3**
"""

import pytest
from datetime import datetime, timedelta, timezone
from hypothesis import given, settings, strategies as st, HealthCheck
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.songs import SongHistorySummary, MusicStyle


# ============================================================================
# Strategies for generating test data
# ============================================================================

# Strategy for generating valid song IDs
song_id_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="-_"),
    min_size=1,
    max_size=64,
).filter(lambda x: len(x.strip()) > 0)

# Strategy for generating valid lyrics preview (max 100 chars)
lyrics_preview_strategy = st.text(
    min_size=1,
    max_size=100,
)

# Strategy for generating music styles
music_style_strategy = st.sampled_from([
    MusicStyle.POP,
    MusicStyle.RAP,
    MusicStyle.FOLK,
    MusicStyle.ELECTRONIC,
    MusicStyle.ROCK,
    MusicStyle.JAZZ,
    MusicStyle.CHILDREN,
    MusicStyle.CLASSICAL,
])


@st.composite
def song_history_item_strategy(draw):
    """Generate a valid song history item (dict from Firestore)."""
    now = datetime.now(timezone.utc)
    created_at = now - timedelta(hours=draw(st.integers(min_value=0, max_value=47)))
    expires_at = created_at + timedelta(hours=48)
    
    return {
        "task_id": draw(song_id_strategy),
        "style": draw(music_style_strategy).value,
        "created_at": created_at,
        "expires_at": expires_at,
        "lyrics": draw(lyrics_preview_strategy) * 10,  # Make it long enough
        "song_url": "https://example.com/song.mp3",
        "variations": [
            {
                "audio_url": "https://example.com/song1.mp3",
                "audio_id": "audio-1",
                "variation_index": 0,
            },
            {
                "audio_url": "https://example.com/song2.mp3",
                "audio_id": "audio-2",
                "variation_index": 1,
            },
        ],
        "primary_variation_index": 0,
    }


# ============================================================================
# Property Tests
# ============================================================================

class TestSongHistoryOrdering:
    """
    **Feature: song-playback-improvements, Property 9: Song history ordering**
    **Validates: Requirements 4.3**
    
    For any list of songs returned by the history API, they should be ordered
    by created_at in descending order (newest first).
    """

    @given(
        num_songs=st.integers(min_value=1, max_value=10),
    )
    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    @pytest.mark.asyncio
    async def test_history_ordered_by_created_at_descending(self, num_songs: int):
        """
        Property: For any list of songs, they should be ordered newest first.
        
        This test verifies that:
        1. Songs are ordered by created_at in descending order
        2. Each song's created_at is >= the next song's created_at
        """
        # Arrange - Create songs with different creation times
        # The get_user_tasks function already returns songs ordered by created_at DESC
        now = datetime.now(timezone.utc)
        ordered_songs = []
        
        for i in range(num_songs):
            song = {
                "task_id": f"song-{i}",
                "style": "pop",
                "created_at": now - timedelta(hours=i),
                "expires_at": now - timedelta(hours=i) + timedelta(hours=48),
                "lyrics": "Test lyrics " * 10,
                "song_url": "https://example.com/song.mp3",
                "variations": [],
                "primary_variation_index": 0,
            }
            ordered_songs.append(song)
        
        # Mock Firestore to return songs already ordered (as get_user_tasks does)
        with patch('app.services.song_storage.get_user_tasks', new_callable=AsyncMock) as mock_get_tasks:
            mock_get_tasks.return_value = ordered_songs
            
            from app.api.songs import get_song_history
            
            # Act
            result = await get_song_history(user_id="test-user", limit=20)
        
        # Assert - Verify ordering is preserved
        assert len(result) == len(ordered_songs)
        
        for i in range(len(result) - 1):
            # Each song's created_at should be >= the next song's created_at
            assert result[i].created_at >= result[i + 1].created_at


class TestSongHistoryExpirationFiltering:
    """
    **Feature: song-playback-improvements, Property 10: Song history expiration filtering**
    **Validates: Requirements 4.4, 6.1**
    
    For any song in the history response, its expires_at should be in the future
    (not expired).
    """

    @given(
        num_songs=st.integers(min_value=1, max_value=10),
    )
    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    @pytest.mark.asyncio
    async def test_expired_songs_filtered_from_history(self, num_songs: int):
        """
        Property: For any song in response, expires_at should be in the future.
        
        This test verifies that:
        1. Expired songs are not included in the response
        2. All returned songs have expires_at > now
        """
        # Arrange - Mix expired and non-expired songs
        now = datetime.now(timezone.utc)
        mixed_songs = []
        
        for i in range(num_songs):
            if i % 2 == 0:
                # Non-expired song
                song = {
                    "task_id": f"song-{i}",
                    "style": "pop",
                    "created_at": now - timedelta(hours=24),
                    "expires_at": now + timedelta(hours=24),
                    "lyrics": "Test lyrics " * 10,
                    "song_url": "https://example.com/song.mp3",
                    "variations": [],
                    "primary_variation_index": 0,
                }
            else:
                # Expired song
                song = {
                    "task_id": f"song-{i}",
                    "style": "pop",
                    "created_at": now - timedelta(hours=50),
                    "expires_at": now - timedelta(hours=2),
                    "lyrics": "Test lyrics " * 10,
                    "song_url": "https://example.com/song.mp3",
                    "variations": [],
                    "primary_variation_index": 0,
                }
            
            mixed_songs.append(song)
        
        # Mock Firestore to return mixed songs
        with patch('app.services.song_storage.get_user_tasks', new_callable=AsyncMock) as mock_get_tasks:
            mock_get_tasks.return_value = mixed_songs
            
            from app.api.songs import get_song_history
            
            # Act
            result = await get_song_history(user_id="test-user", limit=20)
        
        # Assert - Verify all returned songs are not expired
        for song in result:
            assert song.expires_at > now


class TestSongHistoryResponseCompleteness:
    """
    **Feature: song-playback-improvements, Property 11: Song history response completeness**
    **Validates: Requirements 6.2**
    
    For any song in the history response, it should contain song_id, style,
    created_at, expires_at, and lyrics_preview fields.
    """

    @given(
        num_songs=st.integers(min_value=1, max_value=10),
    )
    @settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
    @pytest.mark.asyncio
    async def test_history_response_has_all_required_fields(self, num_songs: int):
        """
        Property: For any song in response, all required fields should be present.
        
        This test verifies that:
        1. Each song has song_id, style, created_at, expires_at, lyrics_preview
        2. Each field has the correct type
        3. lyrics_preview is max 100 characters
        """
        # Arrange
        now = datetime.now(timezone.utc)
        songs = []
        
        for i in range(num_songs):
            song = {
                "task_id": f"song-{i}",
                "style": "pop",
                "created_at": now - timedelta(hours=24),
                "expires_at": now + timedelta(hours=24),
                "lyrics": "Test lyrics " * 10,
                "song_url": "https://example.com/song.mp3",
                "variations": [],
                "primary_variation_index": 0,
            }
            songs.append(song)
        
        # Mock Firestore to return songs
        with patch('app.services.song_storage.get_user_tasks', new_callable=AsyncMock) as mock_get_tasks:
            mock_get_tasks.return_value = songs
            
            from app.api.songs import get_song_history
            
            # Act
            result = await get_song_history(user_id="test-user", limit=20)
        
        # Assert - Verify all required fields are present
        for song in result:
            assert isinstance(song, SongHistorySummary)
            assert hasattr(song, "song_id")
            assert hasattr(song, "style")
            assert hasattr(song, "created_at")
            assert hasattr(song, "expires_at")
            assert hasattr(song, "lyrics_preview")
            assert hasattr(song, "has_variations")
            assert hasattr(song, "primary_variation_index")
            
            # Verify types
            assert isinstance(song.song_id, str)
            assert isinstance(song.style, MusicStyle)
            assert isinstance(song.created_at, datetime)
            assert isinstance(song.expires_at, datetime)
            assert isinstance(song.lyrics_preview, str)
            assert isinstance(song.has_variations, bool)
            assert isinstance(song.primary_variation_index, int)
            
            # Verify lyrics_preview is max 100 characters
            assert len(song.lyrics_preview) <= 100


class TestSongHistoryLimit:
    """
    **Feature: song-playback-improvements, Property 12: Song history limit**
    **Validates: Requirements 6.3**
    
    For any history API response, the number of songs should not exceed 20.
    """

    @given(
        limit=st.integers(min_value=1, max_value=100),
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_history_respects_limit_maximum(self, limit: int):
        """
        Property: For any limit parameter, response should not exceed 20 songs.
        
        This test verifies that:
        1. The limit is clamped to maximum 20
        2. Response contains at most 20 songs
        """
        # Arrange - Create more songs than the limit
        now = datetime.now(timezone.utc)
        songs = []
        
        for i in range(30):  # Create 30 songs
            song = {
                "task_id": f"song-{i}",
                "style": "pop",
                "created_at": now - timedelta(hours=i),
                "expires_at": now - timedelta(hours=i) + timedelta(hours=48),
                "lyrics": "Test lyrics " * 10,
                "song_url": "https://example.com/song.mp3",
                "variations": [],
                "primary_variation_index": 0,
            }
            songs.append(song)
        
        # Mock Firestore to return all songs
        with patch('app.services.song_storage.get_user_tasks', new_callable=AsyncMock) as mock_get_tasks:
            mock_get_tasks.return_value = songs[:limit]  # Return up to limit songs
            
            from app.api.songs import get_song_history
            
            # Act
            result = await get_song_history(user_id="test-user", limit=limit)
        
        # Assert - Verify response doesn't exceed 20
        assert len(result) <= 20
        assert len(result) <= limit


class TestSongHistoryEmptyResponse:
    """
    Test that empty history is handled correctly.
    """

    @pytest.mark.asyncio
    async def test_empty_history_returns_empty_list(self):
        """
        Test that a user with no songs gets an empty list.
        """
        # Arrange
        with patch('app.services.song_storage.get_user_tasks', new_callable=AsyncMock) as mock_get_tasks:
            mock_get_tasks.return_value = []
            
            from app.api.songs import get_song_history
            
            # Act
            result = await get_song_history(user_id="test-user", limit=20)
        
        # Assert
        assert isinstance(result, list)
        assert len(result) == 0


class TestSongHistoryWithoutAudio:
    """
    Test that songs without audio are filtered out.
    """

    @pytest.mark.asyncio
    async def test_songs_without_audio_filtered(self):
        """
        Test that songs without song_url are not included in history.
        """
        # Arrange
        now = datetime.now(timezone.utc)
        songs = [
            {
                "task_id": "song-1",
                "style": "pop",
                "created_at": now - timedelta(hours=24),
                "expires_at": now + timedelta(hours=24),
                "lyrics": "Test lyrics " * 10,
                "song_url": "https://example.com/song1.mp3",
                "variations": [],
                "primary_variation_index": 0,
            },
            {
                "task_id": "song-2",
                "style": "rock",
                "created_at": now - timedelta(hours=12),
                "expires_at": now + timedelta(hours=36),
                "lyrics": "Test lyrics " * 10,
                "song_url": None,  # No audio
                "variations": [],
                "primary_variation_index": 0,
            },
        ]
        
        # Mock Firestore to return both songs
        with patch('app.services.song_storage.get_user_tasks', new_callable=AsyncMock) as mock_get_tasks:
            mock_get_tasks.return_value = songs
            
            from app.api.songs import get_song_history
            
            # Act
            result = await get_song_history(user_id="test-user", limit=20)
        
        # Assert - Only song-1 should be returned
        assert len(result) == 1
        assert result[0].song_id == "song-1"


class TestSongHistoryVariationDetection:
    """
    Test that has_variations field is correctly set.
    """

    @pytest.mark.asyncio
    async def test_has_variations_true_for_two_variations(self):
        """
        Test that has_variations is True when variations.length >= 2.
        """
        # Arrange
        now = datetime.now(timezone.utc)
        song = {
            "task_id": "song-1",
            "style": "pop",
            "created_at": now - timedelta(hours=24),
            "expires_at": now + timedelta(hours=24),
            "lyrics": "Test lyrics " * 10,
            "song_url": "https://example.com/song.mp3",
            "variations": [
                {"audio_url": "url1", "audio_id": "id1", "variation_index": 0},
                {"audio_url": "url2", "audio_id": "id2", "variation_index": 1},
            ],
            "primary_variation_index": 0,
        }
        
        # Mock Firestore
        with patch('app.services.song_storage.get_user_tasks', new_callable=AsyncMock) as mock_get_tasks:
            mock_get_tasks.return_value = [song]
            
            from app.api.songs import get_song_history
            
            # Act
            result = await get_song_history(user_id="test-user", limit=20)
        
        # Assert
        assert len(result) == 1
        assert result[0].has_variations is True

    @pytest.mark.asyncio
    async def test_has_variations_false_for_one_variation(self):
        """
        Test that has_variations is False when variations.length < 2.
        """
        # Arrange
        now = datetime.now(timezone.utc)
        song = {
            "task_id": "song-1",
            "style": "pop",
            "created_at": now - timedelta(hours=24),
            "expires_at": now + timedelta(hours=24),
            "lyrics": "Test lyrics " * 10,
            "song_url": "https://example.com/song.mp3",
            "variations": [
                {"audio_url": "url1", "audio_id": "id1", "variation_index": 0},
            ],
            "primary_variation_index": 0,
        }
        
        # Mock Firestore
        with patch('app.services.song_storage.get_user_tasks', new_callable=AsyncMock) as mock_get_tasks:
            mock_get_tasks.return_value = [song]
            
            from app.api.songs import get_song_history
            
            # Act
            result = await get_song_history(user_id="test-user", limit=20)
        
        # Assert
        assert len(result) == 1
        assert result[0].has_variations is False
