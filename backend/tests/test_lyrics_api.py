"""
Tests for lyrics API endpoints.

Requirements: FR-3, FR-2
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from app.main import app
from app.core.auth import get_current_user


@pytest.fixture
def mock_user_id():
    """Mock user ID."""
    return "test_user_123"


@pytest.fixture
def sample_content():
    """Sample educational content for testing."""
    return """
    Python is a high-level programming language known for its simplicity and readability.
    It supports multiple programming paradigms including procedural, object-oriented, and functional programming.
    Python is widely used in web development, data science, artificial intelligence, and automation.
    """


@pytest.fixture
def sample_lyrics():
    """Sample generated lyrics."""
    return """[Verse 1]
Python is the language, simple and clear
High-level syntax that we all hold dear
From web to AI, it's everywhere
A programming language beyond compare

[Chorus]
Code in Python, watch it flow
Object-oriented, let it grow
Functional style or procedural way
Python's here to save the day"""


@pytest.fixture(autouse=True)
def cleanup_overrides():
    """Clean up dependency overrides after each test."""
    yield
    app.dependency_overrides.clear()


class TestGenerateLyricsEndpoint:
    """Tests for POST /api/lyrics/generate endpoint."""
    
    @pytest.mark.asyncio
    async def test_generate_lyrics_happy_path(
        self,
        client: AsyncClient,
        mock_user_id: str,
        sample_content: str,
        sample_lyrics: str
    ):
        """Test successful lyrics generation (cache miss)."""
        # Override authentication dependency
        app.dependency_overrides[get_current_user] = lambda: mock_user_id
        
        # Mock services
        with patch('app.api.lyrics.check_rate_limit', new_callable=AsyncMock):
            with patch('app.api.lyrics.check_lyrics_cache', new_callable=AsyncMock, return_value=None):
                mock_pipeline_result = {
                    'lyrics': sample_lyrics,
                    'content_hash': 'abc123hash',
                    'cached': False,
                    'processing_time': 15.5
                }
                with patch('app.api.lyrics.LyricsPipeline') as mock_pipeline_class:
                    mock_pipeline = MagicMock()
                    mock_pipeline.execute = AsyncMock(return_value=mock_pipeline_result)
                    mock_pipeline_class.return_value = mock_pipeline
                    
                    with patch('app.api.lyrics.store_lyrics_cache', new_callable=AsyncMock):
                        with patch('app.api.lyrics.get_firestore_client') as mock_firestore:
                            mock_collection = MagicMock()
                            mock_doc = MagicMock()
                            mock_firestore.return_value.collection.return_value = mock_collection
                            mock_collection.document.return_value = mock_doc
                            
                            with patch('app.api.lyrics.increment_usage', new_callable=AsyncMock):
                                response = await client.post(
                                    "/api/lyrics/generate",
                                    json={
                                        "content": sample_content,
                                        "search_enabled": False
                                    }
                                )
        
        assert response.status_code == 200
        data = response.json()
        assert data['lyrics'] == sample_lyrics
        assert data['content_hash'] == 'abc123hash'
        assert data['cached'] is False
        assert data['processing_time'] == 15.5
    
    @pytest.mark.asyncio
    async def test_generate_lyrics_cache_hit(
        self,
        client: AsyncClient,
        mock_user_id: str,
        sample_content: str,
        sample_lyrics: str
    ):
        """Test lyrics generation with cache hit."""
        app.dependency_overrides[get_current_user] = lambda: mock_user_id
        
        cached_result = {
            'lyrics': sample_lyrics,
            'content_hash': 'abc123hash',
            'cached': True,
            'processing_time': 0.0,
            'hit_count': 5
        }
        
        with patch('app.api.lyrics.check_rate_limit', new_callable=AsyncMock):
            with patch('app.api.lyrics.check_lyrics_cache', new_callable=AsyncMock, return_value=cached_result):
                response = await client.post(
                    "/api/lyrics/generate",
                    json={
                        "content": sample_content,
                        "search_enabled": False
                    }
                )
        
        assert response.status_code == 200
        data = response.json()
        assert data['lyrics'] == sample_lyrics
        assert data['cached'] is True
        assert data['processing_time'] == 0.0
    
    @pytest.mark.asyncio
    async def test_generate_lyrics_rate_limit_exceeded(
        self,
        client: AsyncClient,
        mock_user_id: str,
        sample_content: str
    ):
        """Test lyrics generation when rate limit is exceeded."""
        from fastapi import HTTPException
        
        app.dependency_overrides[get_current_user] = lambda: mock_user_id
        
        async def mock_check_rate_limit(user_id):
            raise HTTPException(
                status_code=429,
                detail={
                    'error': 'Rate limit exceeded',
                    'message': 'You have reached your daily limit of 3 songs',
                    'retry_after': 3600
                }
            )
        
        with patch('app.api.lyrics.check_rate_limit', side_effect=mock_check_rate_limit):
            response = await client.post(
                "/api/lyrics/generate",
                json={
                    "content": sample_content,
                    "search_enabled": False
                }
            )
        
        assert response.status_code == 429
    
    @pytest.mark.asyncio
    async def test_generate_lyrics_empty_content(
        self,
        client: AsyncClient,
        mock_user_id: str
    ):
        """Test lyrics generation with empty content."""
        app.dependency_overrides[get_current_user] = lambda: mock_user_id
        
        response = await client.post(
            "/api/lyrics/generate",
            json={
                "content": "",
                "search_enabled": False
            }
        )
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_generate_lyrics_content_too_long(
        self,
        client: AsyncClient,
        mock_user_id: str
    ):
        """Test lyrics generation with content exceeding word limit."""
        app.dependency_overrides[get_current_user] = lambda: mock_user_id
        
        long_content = " ".join(["word"] * 10001)
        
        response = await client.post(
            "/api/lyrics/generate",
            json={
                "content": long_content,
                "search_enabled": False
            }
        )
        
        assert response.status_code == 422


class TestGetRateLimitEndpoint:
    """Tests for GET /api/lyrics/rate-limit endpoint."""
    
    @pytest.mark.asyncio
    async def test_get_rate_limit_success(
        self,
        client: AsyncClient,
        mock_user_id: str
    ):
        """Test successful rate limit retrieval."""
        app.dependency_overrides[get_current_user] = lambda: mock_user_id
        
        reset_time = datetime.now(timezone.utc) + timedelta(days=1)
        mock_rate_limit = {
            'remaining': 2,
            'reset_time': reset_time
        }
        
        with patch('app.api.lyrics.get_rate_limit', new_callable=AsyncMock, return_value=mock_rate_limit):
            response = await client.get("/api/lyrics/rate-limit")
        
        assert response.status_code == 200
        data = response.json()
        assert data['remaining'] == 2
        assert 'reset_time' in data
    
    @pytest.mark.asyncio
    async def test_get_rate_limit_no_remaining(
        self,
        client: AsyncClient,
        mock_user_id: str
    ):
        """Test rate limit retrieval when limit is exhausted."""
        app.dependency_overrides[get_current_user] = lambda: mock_user_id
        
        reset_time = datetime.now(timezone.utc) + timedelta(hours=5)
        mock_rate_limit = {
            'remaining': 0,
            'reset_time': reset_time
        }
        
        with patch('app.api.lyrics.get_rate_limit', new_callable=AsyncMock, return_value=mock_rate_limit):
            response = await client.get("/api/lyrics/rate-limit")
        
        assert response.status_code == 200
        data = response.json()
        assert data['remaining'] == 0


class TestAuthenticationRequired:
    """Tests for authentication requirements on endpoints."""
    
    @pytest.mark.asyncio
    async def test_generate_lyrics_no_auth(
        self,
        client: AsyncClient,
        sample_content: str
    ):
        """Test that generate endpoint requires authentication."""
        response = await client.post(
            "/api/lyrics/generate",
            json={
                "content": sample_content,
                "search_enabled": False
            }
        )
        
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_get_rate_limit_no_auth(
        self,
        client: AsyncClient
    ):
        """Test that rate limit endpoint requires authentication."""
        response = await client.get("/api/lyrics/rate-limit")
        
        assert response.status_code == 403
