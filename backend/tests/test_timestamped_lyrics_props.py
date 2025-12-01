"""Property-based tests for timestamped lyrics functionality.

This module contains property-based tests using Hypothesis to verify
correctness properties of the timestamped lyrics feature.

**Feature: timestamped-lyrics-sync, Property 1: Timestamped lyrics fetch on song completion**
**Validates: Requirements 1.1, 2.1**
"""

import pytest
from hypothesis import given, settings, strategies as st, HealthCheck
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.suno_client import (
    SunoClient,
    AlignedWord,
    TimestampedLyrics,
)


# ============================================================================
# Strategies for generating test data
# ============================================================================

# Strategy for generating valid task IDs
task_id_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="-_"),
    min_size=1,
    max_size=64,
).filter(lambda x: len(x.strip()) > 0)

# Strategy for generating valid audio IDs
audio_id_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="-_"),
    min_size=1,
    max_size=64,
).filter(lambda x: len(x.strip()) > 0)

# Strategy for generating valid word text
word_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N", "P", "Z")),
    min_size=1,
    max_size=50,
).filter(lambda x: len(x.strip()) > 0)

# Strategy for generating valid time values (non-negative floats)
time_strategy = st.floats(min_value=0.0, max_value=600.0, allow_nan=False, allow_infinity=False)

# Strategy for generating valid palign values
palign_strategy = st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)

# Strategy for generating waveform data
waveform_strategy = st.lists(
    st.floats(min_value=-1.0, max_value=1.0, allow_nan=False, allow_infinity=False),
    min_size=0,
    max_size=100,
)


# Strategy for generating a single aligned word with valid time range
@st.composite
def aligned_word_dict_strategy(draw):
    """Generate a valid aligned word dictionary with start_s <= end_s."""
    word = draw(word_strategy)
    start_s = draw(time_strategy)
    # Ensure end_s >= start_s
    duration = draw(st.floats(min_value=0.0, max_value=10.0, allow_nan=False, allow_infinity=False))
    end_s = start_s + duration
    success = draw(st.booleans())
    palign = draw(palign_strategy)
    
    return {
        "word": word,
        "startS": start_s,
        "endS": end_s,
        "success": success,
        "palign": palign,
    }


# Strategy for generating a list of aligned words
aligned_words_list_strategy = st.lists(
    aligned_word_dict_strategy(),
    min_size=0,
    max_size=50,
)


# ============================================================================
# Property Tests
# ============================================================================

class TestTimestampedLyricsFetch:
    """
    **Feature: timestamped-lyrics-sync, Property 1: Timestamped lyrics fetch on song completion**
    **Validates: Requirements 1.1, 2.1**
    
    For any successfully completed song generation task, the system should call
    the Suno timestamped lyrics endpoint with the correct task_id and audio_id
    parameters and correctly parse the response.
    """

    @given(
        task_id=task_id_strategy,
        audio_id=audio_id_strategy,
        aligned_words=aligned_words_list_strategy,
        waveform_data=waveform_strategy,
        hoot_cer=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
        is_streamed=st.booleans(),
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    @pytest.mark.asyncio
    async def test_timestamped_lyrics_parsing_preserves_data(
        self,
        task_id: str,
        audio_id: str,
        aligned_words: list[dict],
        waveform_data: list[float],
        hoot_cer: float,
        is_streamed: bool,
    ):
        """
        **Feature: timestamped-lyrics-sync, Property 1: Timestamped lyrics fetch on song completion**
        **Validates: Requirements 1.1, 2.1**
        
        Test that for any valid API response, the get_timestamped_lyrics method
        correctly parses all aligned words with their word, startS, and endS fields.
        """
        # Create mock response matching Suno API format
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "code": 200,
            "msg": "success",
            "data": {
                "alignedWords": aligned_words,
                "waveformData": waveform_data,
                "hootCer": hoot_cer,
                "isStreamed": is_streamed,
            }
        }
        
        # Create mock HTTP client
        mock_http_client = AsyncMock()
        mock_http_client.post = AsyncMock(return_value=mock_response)
        mock_http_client.is_closed = False
        
        # Create SunoClient with mock
        client = SunoClient(api_key="test-api-key")
        client._client = mock_http_client
        
        # Call get_timestamped_lyrics
        result = await client.get_timestamped_lyrics(task_id, audio_id)
        
        # Verify the method was called with correct parameters
        mock_http_client.post.assert_called_once()
        call_args = mock_http_client.post.call_args
        assert call_args[0][0] == "/api/v1/generate/get-timestamped-lyrics"
        assert call_args[1]["json"]["taskId"] == task_id
        assert call_args[1]["json"]["audioId"] == audio_id
        
        # Verify result is TimestampedLyrics
        assert isinstance(result, TimestampedLyrics)
        
        # Verify all aligned words are parsed correctly
        assert len(result.aligned_words) == len(aligned_words)
        
        for i, (parsed, original) in enumerate(zip(result.aligned_words, aligned_words)):
            assert isinstance(parsed, AlignedWord)
            assert parsed.word == original["word"]
            assert parsed.start_s == original["startS"]
            assert parsed.end_s == original["endS"]
            assert parsed.success == original["success"]
            assert parsed.palign == original["palign"]
        
        # Verify waveform data is preserved
        assert result.waveform_data == waveform_data
        
        # Verify other fields
        assert result.hoot_cer == hoot_cer
        assert result.is_streamed == is_streamed

    @given(
        task_id=task_id_strategy,
        audio_id=audio_id_strategy,
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    @pytest.mark.asyncio
    async def test_timestamped_lyrics_handles_api_errors_gracefully(
        self,
        task_id: str,
        audio_id: str,
    ):
        """
        **Feature: timestamped-lyrics-sync, Property 1: Timestamped lyrics fetch on song completion**
        **Validates: Requirements 2.4**
        
        Test that for any task_id and audio_id, API errors are handled gracefully
        without raising exceptions (returns None instead).
        """
        # Create mock response with error
        mock_response = MagicMock()
        mock_response.status_code = 500
        
        # Create mock HTTP client
        mock_http_client = AsyncMock()
        mock_http_client.post = AsyncMock(return_value=mock_response)
        mock_http_client.is_closed = False
        
        # Create SunoClient with mock
        client = SunoClient(api_key="test-api-key")
        client._client = mock_http_client
        
        # Call get_timestamped_lyrics - should not raise
        result = await client.get_timestamped_lyrics(task_id, audio_id)
        
        # Verify it returns None on error (graceful handling)
        assert result is None


class TestTimestampedLyricsStorageIntegrity:
    """
    **Feature: timestamped-lyrics-sync, Property 3: Timestamped lyrics storage integrity**
    **Validates: Requirements 2.2, 2.3**
    
    For any timestamped lyrics response from the Suno API, storing and retrieving
    the data should preserve all aligned words with their word, startS, and endS
    fields intact.
    """

    @given(
        task_id=task_id_strategy,
        aligned_words=aligned_words_list_strategy,
        waveform_data=waveform_strategy,
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    @pytest.mark.asyncio
    async def test_store_and_retrieve_preserves_aligned_words(
        self,
        task_id: str,
        aligned_words: list[dict],
        waveform_data: list[float],
    ):
        """
        **Feature: timestamped-lyrics-sync, Property 3: Timestamped lyrics storage integrity**
        **Validates: Requirements 2.2, 2.3**
        
        Test that for any valid aligned words data, storing and retrieving
        preserves all word, startS, and endS fields.
        """
        from app.services.song_storage import store_timestamped_lyrics, get_task_from_firestore
        
        # Mock Firestore client
        stored_data = {}
        
        mock_doc = MagicMock()
        mock_doc.exists = True
        
        def mock_update(data):
            stored_data.update(data)
        
        def mock_get():
            mock_snapshot = MagicMock()
            mock_snapshot.exists = True
            mock_snapshot.to_dict.return_value = stored_data.copy()
            return mock_snapshot
        
        mock_doc.update = mock_update
        mock_doc.get = mock_get
        
        mock_collection = MagicMock()
        mock_collection.document.return_value = mock_doc
        
        mock_client = MagicMock()
        mock_client.collection.return_value = mock_collection
        
        with patch("app.services.song_storage.get_firestore_client", return_value=mock_client):
            # Store the timestamped lyrics
            result = await store_timestamped_lyrics(
                task_id=task_id,
                aligned_words=aligned_words,
                waveform_data=waveform_data,
            )
            
            assert result is True
            
            # Retrieve the stored data
            retrieved = await get_task_from_firestore(task_id)
            
            assert retrieved is not None
            
            # Verify aligned_words are preserved
            retrieved_words = retrieved.get("aligned_words", [])
            assert len(retrieved_words) == len(aligned_words)
            
            for original, retrieved_word in zip(aligned_words, retrieved_words):
                # Verify word field is preserved
                assert retrieved_word["word"] == original["word"]
                # Verify startS field is preserved
                assert retrieved_word["startS"] == original["startS"]
                # Verify endS field is preserved
                assert retrieved_word["endS"] == original["endS"]
                # Verify success field is preserved
                assert retrieved_word["success"] == original["success"]
                # Verify palign field is preserved
                assert retrieved_word["palign"] == original["palign"]
            
            # Verify has_timestamps flag
            assert retrieved.get("has_timestamps") == (len(aligned_words) > 0)
            
            # Verify waveform_data is preserved
            if waveform_data:
                assert retrieved.get("waveform_data") == waveform_data

    @given(
        task_id=task_id_strategy,
        aligned_words=aligned_words_list_strategy,
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    @pytest.mark.asyncio
    async def test_update_task_status_with_timestamps_preserves_data(
        self,
        task_id: str,
        aligned_words: list[dict],
    ):
        """
        **Feature: timestamped-lyrics-sync, Property 3: Timestamped lyrics storage integrity**
        **Validates: Requirements 2.2, 2.3**
        
        Test that update_task_status with aligned_words preserves all timing data.
        """
        from app.services.song_storage import update_task_status
        
        # Mock Firestore client
        stored_data = {}
        
        mock_doc = MagicMock()
        
        def mock_update(data):
            stored_data.update(data)
        
        mock_doc.update = mock_update
        
        mock_collection = MagicMock()
        mock_collection.document.return_value = mock_doc
        
        mock_client = MagicMock()
        mock_client.collection.return_value = mock_collection
        
        with patch("app.services.song_storage.get_firestore_client", return_value=mock_client):
            # Update task status with aligned words
            result = await update_task_status(
                task_id=task_id,
                status="completed",
                progress=100,
                song_url="https://example.com/song.mp3",
                aligned_words=aligned_words,
            )
            
            assert result is True
            
            # Verify aligned_words were stored
            assert "aligned_words" in stored_data
            stored_words = stored_data["aligned_words"]
            assert len(stored_words) == len(aligned_words)
            
            for original, stored_word in zip(aligned_words, stored_words):
                assert stored_word["word"] == original["word"]
                assert stored_word["startS"] == original["startS"]
                assert stored_word["endS"] == original["endS"]
            
            # Verify has_timestamps flag is set correctly
            assert stored_data.get("has_timestamps") == (len(aligned_words) > 0)


class TestAlignedWordDataclass:
    """
    Tests for AlignedWord dataclass validation.
    """

    @given(
        word=word_strategy,
        start_s=time_strategy,
        duration=st.floats(min_value=0.0, max_value=10.0, allow_nan=False, allow_infinity=False),
        success=st.booleans(),
        palign=palign_strategy,
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_aligned_word_creation_with_valid_data(
        self,
        word: str,
        start_s: float,
        duration: float,
        success: bool,
        palign: float,
    ):
        """
        Test that AlignedWord can be created with any valid data where end_s >= start_s.
        """
        end_s = start_s + duration
        
        aligned_word = AlignedWord(
            word=word,
            start_s=start_s,
            end_s=end_s,
            success=success,
            palign=palign,
        )
        
        assert aligned_word.word == word
        assert aligned_word.start_s == start_s
        assert aligned_word.end_s == end_s
        assert aligned_word.success == success
        assert aligned_word.palign == palign

    def test_aligned_word_rejects_negative_start_s(self):
        """Test that AlignedWord rejects negative start_s."""
        with pytest.raises(ValueError, match="start_s cannot be negative"):
            AlignedWord(word="test", start_s=-1.0, end_s=1.0, success=True, palign=0.5)

    def test_aligned_word_rejects_negative_end_s(self):
        """Test that AlignedWord rejects negative end_s."""
        with pytest.raises(ValueError, match="end_s cannot be negative"):
            AlignedWord(word="test", start_s=0.0, end_s=-1.0, success=True, palign=0.5)

    def test_aligned_word_rejects_end_before_start(self):
        """Test that AlignedWord rejects end_s < start_s."""
        with pytest.raises(ValueError, match="end_s cannot be less than start_s"):
            AlignedWord(word="test", start_s=5.0, end_s=3.0, success=True, palign=0.5)
