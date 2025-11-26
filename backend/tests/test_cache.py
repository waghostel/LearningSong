"""Tests for cache service."""

import pytest
import hashlib
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from app.services.cache import (
    generate_content_hash,
    check_lyrics_cache,
    store_lyrics_cache
)


@pytest.fixture
def mock_firestore_client():
    """Create a mock Firestore client."""
    return MagicMock()


@pytest.fixture
def mock_cache_ref(mock_firestore_client):
    """Create a mock cache document reference."""
    cache_ref = MagicMock()
    mock_firestore_client.collection.return_value.document.return_value = cache_ref
    return cache_ref


class TestGenerateContentHash:
    """Tests for generate_content_hash function."""
    
    def test_generates_sha256_hash(self):
        """Test that function generates a valid SHA-256 hash."""
        content = "This is test content"
        result = generate_content_hash(content)
        
        # SHA-256 hash should be 64 characters (hex)
        assert len(result) == 64
        assert all(c in '0123456789abcdef' for c in result)
    
    def test_normalizes_content_before_hashing(self):
        """Test that content is normalized (stripped and lowercased)."""
        content1 = "  Test Content  "
        content2 = "test content"
        
        hash1 = generate_content_hash(content1)
        hash2 = generate_content_hash(content2)
        
        # Should produce same hash after normalization
        assert hash1 == hash2
    
    def test_different_content_produces_different_hash(self):
        """Test that different content produces different hashes."""
        content1 = "First content"
        content2 = "Second content"
        
        hash1 = generate_content_hash(content1)
        hash2 = generate_content_hash(content2)
        
        assert hash1 != hash2
    
    def test_case_insensitive_hashing(self):
        """Test that hashing is case-insensitive."""
        content1 = "Test Content"
        content2 = "TEST CONTENT"
        content3 = "test content"
        
        hash1 = generate_content_hash(content1)
        hash2 = generate_content_hash(content2)
        hash3 = generate_content_hash(content3)
        
        assert hash1 == hash2 == hash3
    
    def test_handles_unicode_content(self):
        """Test that function handles unicode characters."""
        content = "Hello 世界 🌍"
        result = generate_content_hash(content)
        
        # Should produce valid hash
        assert len(result) == 64
    
    def test_consistent_hashing(self):
        """Test that same content always produces same hash."""
        content = "Consistent content"
        
        hash1 = generate_content_hash(content)
        hash2 = generate_content_hash(content)
        hash3 = generate_content_hash(content)
        
        assert hash1 == hash2 == hash3


class TestCheckLyricsCache:
    """Tests for check_lyrics_cache function."""
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    async def test_cache_miss_returns_none(
        self, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that cache miss returns None."""
        mock_get_client.return_value = mock_firestore_client
        
        # Mock non-existent cache entry
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_cache_ref.get.return_value = mock_doc
        
        result = await check_lyrics_cache("test_hash_123")
        
        assert result is None
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    @patch('app.services.cache.datetime')
    async def test_cache_hit_returns_lyrics_data(
        self, mock_datetime, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that cache hit returns lyrics data."""
        mock_get_client.return_value = mock_firestore_client
        current_time = datetime(2024, 1, 15, 14, 30, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = current_time
        
        # Mock existing cache entry
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'lyrics': 'Verse 1: Test lyrics here',
            'content_hash': 'test_hash_123',
            'hit_count': 5,
            'created_at': datetime(2024, 1, 10, 0, 0, 0, tzinfo=timezone.utc),
            'last_accessed': datetime(2024, 1, 14, 0, 0, 0, tzinfo=timezone.utc)
        }
        mock_cache_ref.get.return_value = mock_doc
        
        result = await check_lyrics_cache("test_hash_123")
        
        assert result is not None
        assert result['lyrics'] == 'Verse 1: Test lyrics here'
        assert result['content_hash'] == 'test_hash_123'
        assert result['cached'] is True
        assert result['processing_time'] == 0.0
        assert result['hit_count'] == 6  # Incremented from 5
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    @patch('app.services.cache.datetime')
    async def test_cache_hit_updates_statistics(
        self, mock_datetime, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that cache hit updates hit_count and last_accessed."""
        mock_get_client.return_value = mock_firestore_client
        current_time = datetime(2024, 1, 15, 14, 30, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = current_time
        
        # Mock existing cache entry
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'lyrics': 'Test lyrics',
            'hit_count': 3,
        }
        mock_cache_ref.get.return_value = mock_doc
        
        await check_lyrics_cache("test_hash_123")
        
        # Verify update was called with incremented hit_count and new timestamp
        mock_cache_ref.update.assert_called_once()
        call_args = mock_cache_ref.update.call_args[0][0]
        assert call_args['hit_count'] == 4
        assert call_args['last_accessed'] == current_time
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    async def test_cache_hit_handles_missing_hit_count(
        self, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that cache hit handles missing hit_count gracefully."""
        mock_get_client.return_value = mock_firestore_client
        
        # Mock existing cache entry without hit_count
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'lyrics': 'Test lyrics',
            # No hit_count field
        }
        mock_cache_ref.get.return_value = mock_doc
        
        result = await check_lyrics_cache("test_hash_123")
        
        # Should default to 0 and increment to 1
        assert result['hit_count'] == 1


class TestStoreLyricsCache:
    """Tests for store_lyrics_cache function."""
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    @patch('app.services.cache.datetime')
    async def test_stores_lyrics_in_cache(
        self, mock_datetime, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that lyrics are stored in cache with correct structure."""
        mock_get_client.return_value = mock_firestore_client
        current_time = datetime(2024, 1, 15, 14, 30, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = current_time
        
        content_hash = "test_hash_123"
        lyrics = "Verse 1: Test lyrics\nChorus: Test chorus"
        
        await store_lyrics_cache(content_hash, lyrics)
        
        # Verify cache entry was created
        mock_cache_ref.set.assert_called_once()
        call_args = mock_cache_ref.set.call_args[0][0]
        
        assert call_args['content_hash'] == content_hash
        assert call_args['lyrics'] == lyrics
        assert call_args['created_at'] == current_time
        assert call_args['last_accessed'] == current_time
        assert call_args['hit_count'] == 0
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    async def test_stores_content_preview_when_provided(
        self, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that content preview is stored when original content provided."""
        mock_get_client.return_value = mock_firestore_client
        
        content_hash = "test_hash_123"
        lyrics = "Test lyrics"
        original_content = "A" * 300  # Long content
        
        await store_lyrics_cache(content_hash, lyrics, original_content)
        
        # Verify content preview is stored (first 200 chars)
        call_args = mock_cache_ref.set.call_args[0][0]
        assert 'content_preview' in call_args
        assert call_args['content_preview'] == "A" * 200
        assert len(call_args['content_preview']) == 200
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    async def test_stores_without_content_preview_when_not_provided(
        self, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that cache entry works without content preview."""
        mock_get_client.return_value = mock_firestore_client
        
        content_hash = "test_hash_123"
        lyrics = "Test lyrics"
        
        await store_lyrics_cache(content_hash, lyrics)
        
        # Verify no content_preview field
        call_args = mock_cache_ref.set.call_args[0][0]
        assert 'content_preview' not in call_args
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    async def test_uses_correct_firestore_collection(
        self, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that correct Firestore collection is used."""
        mock_get_client.return_value = mock_firestore_client
        
        content_hash = "test_hash_123"
        lyrics = "Test lyrics"
        
        await store_lyrics_cache(content_hash, lyrics)
        
        # Verify correct collection and document ID
        mock_firestore_client.collection.assert_called_with('cached_songs')
        mock_firestore_client.collection.return_value.document.assert_called_with(content_hash)


class TestCheckSongCache:
    """Tests for check_song_cache function."""
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    async def test_cache_miss_returns_none(
        self, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that cache miss returns None."""
        from app.services.cache import check_song_cache
        
        mock_get_client.return_value = mock_firestore_client
        
        # Mock non-existent cache entry
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_cache_ref.get.return_value = mock_doc
        
        result = await check_song_cache("test_hash_123", "pop")
        
        assert result is None
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    async def test_cache_key_format(
        self, mock_get_client, mock_firestore_client
    ):
        """Test that cache key is generated as content_hash_style."""
        from app.services.cache import check_song_cache
        
        mock_get_client.return_value = mock_firestore_client
        
        # Mock non-existent cache entry
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_firestore_client.collection.return_value.document.return_value.get.return_value = mock_doc
        
        await check_song_cache("abc123", "rock")
        
        # Verify correct cache key format
        mock_firestore_client.collection.assert_called_with('cached_songs')
        mock_firestore_client.collection.return_value.document.assert_called_with("abc123_rock")
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    @patch('app.services.cache.datetime')
    async def test_cache_hit_returns_song_data(
        self, mock_datetime, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that cache hit returns song data."""
        from app.services.cache import check_song_cache
        
        mock_get_client.return_value = mock_firestore_client
        current_time = datetime(2024, 1, 15, 14, 30, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = current_time
        
        # Mock existing cache entry
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'content_hash': 'test_hash_123',
            'style': 'pop',
            'task_id': 'suno_task_456',
            'song_url': 'https://suno.ai/songs/abc123.mp3',
            'hit_count': 5,
            'created_at': datetime(2024, 1, 10, 0, 0, 0, tzinfo=timezone.utc),
            'last_accessed': datetime(2024, 1, 14, 0, 0, 0, tzinfo=timezone.utc)
        }
        mock_cache_ref.get.return_value = mock_doc
        
        result = await check_song_cache("test_hash_123", "pop")
        
        assert result is not None
        assert result['task_id'] == 'suno_task_456'
        assert result['song_url'] == 'https://suno.ai/songs/abc123.mp3'
        assert result['estimated_time'] == 0
        assert result['cached'] is True
        assert result['hit_count'] == 6  # Incremented from 5
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    @patch('app.services.cache.datetime')
    async def test_cache_hit_updates_statistics(
        self, mock_datetime, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that cache hit updates hit_count and last_accessed."""
        from app.services.cache import check_song_cache
        
        mock_get_client.return_value = mock_firestore_client
        current_time = datetime(2024, 1, 15, 14, 30, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = current_time
        
        # Mock existing cache entry
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'task_id': 'suno_task_456',
            'song_url': 'https://suno.ai/songs/abc123.mp3',
            'hit_count': 3,
        }
        mock_cache_ref.get.return_value = mock_doc
        
        await check_song_cache("test_hash_123", "pop")
        
        # Verify update was called with incremented hit_count and new timestamp
        mock_cache_ref.update.assert_called_once()
        call_args = mock_cache_ref.update.call_args[0][0]
        assert call_args['hit_count'] == 4
        assert call_args['last_accessed'] == current_time
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    async def test_returns_none_for_invalid_cache_entry(
        self, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that returns None if cache entry is missing task_id or song_url."""
        from app.services.cache import check_song_cache
        
        mock_get_client.return_value = mock_firestore_client
        
        # Mock cache entry without task_id and song_url (lyrics cache entry)
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'lyrics': 'Some lyrics',
            'content_hash': 'test_hash_123',
            'hit_count': 5,
        }
        mock_cache_ref.get.return_value = mock_doc
        
        result = await check_song_cache("test_hash_123", "pop")
        
        assert result is None
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    async def test_cache_hit_handles_missing_hit_count(
        self, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that cache hit handles missing hit_count gracefully."""
        from app.services.cache import check_song_cache
        
        mock_get_client.return_value = mock_firestore_client
        
        # Mock existing cache entry without hit_count
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'task_id': 'suno_task_456',
            'song_url': 'https://suno.ai/songs/abc123.mp3',
            # No hit_count field
        }
        mock_cache_ref.get.return_value = mock_doc
        
        result = await check_song_cache("test_hash_123", "pop")
        
        # Should default to 0 and increment to 1
        assert result['hit_count'] == 1


class TestStoreSongCache:
    """Tests for store_song_cache function."""
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    @patch('app.services.cache.datetime')
    async def test_stores_song_in_cache(
        self, mock_datetime, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that song is stored in cache with correct structure."""
        from app.services.cache import store_song_cache
        
        mock_get_client.return_value = mock_firestore_client
        current_time = datetime(2024, 1, 15, 14, 30, 0, tzinfo=timezone.utc)
        mock_datetime.now.return_value = current_time
        
        content_hash = "test_hash_123"
        style = "pop"
        task_id = "suno_task_456"
        song_url = "https://suno.ai/songs/abc123.mp3"
        
        await store_song_cache(content_hash, style, task_id, song_url)
        
        # Verify cache entry was created
        mock_cache_ref.set.assert_called_once()
        call_args = mock_cache_ref.set.call_args[0][0]
        
        assert call_args['content_hash'] == content_hash
        assert call_args['style'] == style
        assert call_args['task_id'] == task_id
        assert call_args['song_url'] == song_url
        assert call_args['created_at'] == current_time
        assert call_args['last_accessed'] == current_time
        assert call_args['hit_count'] == 0
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    async def test_uses_correct_cache_key_format(
        self, mock_get_client, mock_firestore_client
    ):
        """Test that cache key is generated as content_hash_style."""
        from app.services.cache import store_song_cache
        
        mock_get_client.return_value = mock_firestore_client
        
        content_hash = "abc123"
        style = "rock"
        task_id = "suno_task_456"
        song_url = "https://suno.ai/songs/abc123.mp3"
        
        await store_song_cache(content_hash, style, task_id, song_url)
        
        # Verify correct cache key format
        mock_firestore_client.collection.assert_called_with('cached_songs')
        mock_firestore_client.collection.return_value.document.assert_called_with("abc123_rock")
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    async def test_stores_different_styles_separately(
        self, mock_get_client, mock_firestore_client
    ):
        """Test that different styles for same content use different cache keys."""
        from app.services.cache import store_song_cache
        
        mock_get_client.return_value = mock_firestore_client
        
        content_hash = "same_hash"
        task_id = "suno_task_456"
        song_url = "https://suno.ai/songs/abc123.mp3"
        
        # Store with pop style
        await store_song_cache(content_hash, "pop", task_id, song_url)
        
        # Verify pop cache key
        mock_firestore_client.collection.return_value.document.assert_called_with("same_hash_pop")
        
        # Store with rock style
        await store_song_cache(content_hash, "rock", task_id, song_url)
        
        # Verify rock cache key
        mock_firestore_client.collection.return_value.document.assert_called_with("same_hash_rock")
    
    @pytest.mark.asyncio
    @patch('app.services.cache.get_firestore_client')
    async def test_uses_correct_firestore_collection(
        self, mock_get_client, mock_firestore_client, mock_cache_ref
    ):
        """Test that correct Firestore collection is used."""
        from app.services.cache import store_song_cache
        
        mock_get_client.return_value = mock_firestore_client
        
        await store_song_cache("test_hash", "jazz", "task_123", "https://example.com/song.mp3")
        
        # Verify correct collection
        mock_firestore_client.collection.assert_called_with('cached_songs')
