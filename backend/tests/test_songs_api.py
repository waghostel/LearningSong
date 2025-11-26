"""Tests for songs API endpoints.

This module tests the song generation and status endpoints including:
- Generate song endpoint (happy path, cache hit, rate limit)
- Get song status endpoint
- Task ownership verification
- Error handling

Requirements: FR-3
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from fastapi import HTTPException

from app.main import app
from app.models.songs import MusicStyle, GenerationStatus
from app.services.suno_client import (
    SunoTask,
    SunoStatus,
    SunoAPIError,
    SunoRateLimitError,
    SunoValidationError,
)


# Test user ID
TEST_USER_ID = "test-user-123"
ANOTHER_USER_ID = "another-user-456"

# Sample lyrics for testing (must be at least 50 characters)
SAMPLE_LYRICS = """Verse 1:
Learning is a journey, not a race
Every step we take, we find our place
With knowledge as our guide, we'll find the way
Growing stronger every single day

Chorus:
We learn, we grow, we shine so bright
Together we can reach new heights"""


@pytest.fixture
def mock_auth():
    """Mock Firebase authentication to return test user ID."""
    with patch("app.api.songs.get_current_user") as mock:
        mock.return_value = TEST_USER_ID
        yield mock


@pytest.fixture
def mock_rate_limit():
    """Mock rate limiter to allow requests."""
    with patch("app.api.songs.check_rate_limit", new_callable=AsyncMock) as mock:
        mock.return_value = None
        yield mock


@pytest.fixture
def mock_increment_usage():
    """Mock increment usage function."""
    with patch("app.api.songs.increment_usage", new_callable=AsyncMock) as mock:
        mock.return_value = None
        yield mock


@pytest.fixture
def mock_song_cache():
    """Mock song cache functions."""
    with patch("app.api.songs.check_song_cache", new_callable=AsyncMock) as check_mock:
        check_mock.return_value = None
        yield check_mock


@pytest.fixture
def mock_firestore():
    """Mock Firestore operations via song_storage module."""
    with patch("app.api.songs.store_song_task", new_callable=AsyncMock) as store_mock:
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as get_mock:
            with patch("app.api.songs.update_task_status", new_callable=AsyncMock) as update_mock:
                store_mock.return_value = {"task_id": "test-task"}
                get_mock.return_value = None
                update_mock.return_value = True
                yield {
                    "store": store_mock,
                    "get": get_mock,
                    "update": update_mock,
                }


@pytest.fixture
def mock_suno_client():
    """Mock Suno API client."""
    with patch("app.api.songs.SunoClient") as mock_class:
        mock_instance = AsyncMock()
        mock_class.return_value.__aenter__.return_value = mock_instance
        mock_class.return_value.__aexit__.return_value = None
        
        # Default successful response
        mock_instance.create_song.return_value = SunoTask(
            task_id="suno-task-123",
            estimated_time=60
        )
        mock_instance.get_task_status.return_value = SunoStatus(
            status="GENERATING",
            progress=50,
            song_url=None,
            error=None
        )
        
        yield mock_instance


@pytest.fixture
async def client():
    """Async test client for FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac




# ============================================================================
# Generate Song Endpoint Tests
# ============================================================================

class TestGenerateSongEndpoint:
    """Tests for POST /api/songs/generate endpoint."""

    @pytest.mark.asyncio
    async def test_generate_song_happy_path(
        self,
        client,
        mock_auth,
        mock_rate_limit,
        mock_increment_usage,
        mock_song_cache,
        mock_firestore,
        mock_suno_client,
    ):
        """Test successful song generation request."""
        # Override auth dependency
        app.dependency_overrides[__import__("app.core.auth", fromlist=["get_current_user"]).get_current_user] = lambda: TEST_USER_ID
        
        with patch.dict("os.environ", {"SUNO_API_KEY": "test-api-key"}):
            response = await client.post(
                "/api/songs/generate",
                json={
                    "lyrics": SAMPLE_LYRICS,
                    "style": "pop",
                    "content_hash": "abc123"
                },
                headers={"Authorization": "Bearer test-token"}
            )
        
        # Clean up
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        data = response.json()
        assert "task_id" in data
        assert "estimated_time" in data
        assert data["task_id"] == "suno-task-123"
        assert data["estimated_time"] == 60

    @pytest.mark.asyncio
    async def test_generate_song_cache_hit(
        self,
        client,
        mock_auth,
        mock_rate_limit,
        mock_firestore,
    ):
        """Test song generation returns cached result when available."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        # Mock cache to return a hit
        with patch("app.api.songs.check_song_cache", new_callable=AsyncMock) as cache_mock:
            cache_mock.return_value = {
                "task_id": "cached-task-456",
                "song_url": "https://example.com/song.mp3",
                "estimated_time": 0,
                "cached": True
            }
            
            with patch.dict("os.environ", {"SUNO_API_KEY": "test-api-key"}):
                response = await client.post(
                    "/api/songs/generate",
                    json={
                        "lyrics": SAMPLE_LYRICS,
                        "style": "pop",
                        "content_hash": "abc123"
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "cached-task-456"
        assert data["estimated_time"] == 0  # Instant from cache

    @pytest.mark.asyncio
    async def test_generate_song_rate_limit_exceeded(
        self,
        client,
        mock_auth,
        mock_firestore,
    ):
        """Test song generation fails when rate limit is exceeded."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        # Mock rate limit to raise exception
        with patch("app.api.songs.check_rate_limit", new_callable=AsyncMock) as rate_mock:
            rate_mock.side_effect = HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "message": "You have reached your daily limit of 3 songs",
                    "retry_after": 3600
                }
            )
            
            response = await client.post(
                "/api/songs/generate",
                json={
                    "lyrics": SAMPLE_LYRICS,
                    "style": "pop"
                },
                headers={"Authorization": "Bearer test-token"}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 429
        data = response.json()
        assert "Rate limit exceeded" in str(data)

    @pytest.mark.asyncio
    async def test_generate_song_lyrics_too_short(self, client, mock_auth):
        """Test song generation fails with lyrics too short."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        response = await client.post(
            "/api/songs/generate",
            json={
                "lyrics": "Too short",  # Less than 50 characters
                "style": "pop"
            },
            headers={"Authorization": "Bearer test-token"}
        )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_generate_song_invalid_style(self, client, mock_auth):
        """Test song generation fails with invalid style."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        response = await client.post(
            "/api/songs/generate",
            json={
                "lyrics": SAMPLE_LYRICS,
                "style": "invalid_style"
            },
            headers={"Authorization": "Bearer test-token"}
        )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_generate_song_suno_api_error(
        self,
        client,
        mock_auth,
        mock_rate_limit,
        mock_song_cache,
        mock_firestore,
    ):
        """Test song generation handles Suno API errors."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        with patch("app.api.songs.SunoClient") as mock_class:
            mock_instance = AsyncMock()
            mock_class.return_value.__aenter__.return_value = mock_instance
            mock_class.return_value.__aexit__.return_value = None
            mock_instance.create_song.side_effect = SunoAPIError(
                "API error", status_code=500
            )
            
            with patch.dict("os.environ", {"SUNO_API_KEY": "test-api-key"}):
                response = await client.post(
                    "/api/songs/generate",
                    json={
                        "lyrics": SAMPLE_LYRICS,
                        "style": "pop"
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 500
        data = response.json()
        assert "Generation failed" in str(data)

    @pytest.mark.asyncio
    async def test_generate_song_suno_validation_error(
        self,
        client,
        mock_auth,
        mock_rate_limit,
        mock_song_cache,
        mock_firestore,
    ):
        """Test song generation handles Suno validation errors."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        with patch("app.api.songs.SunoClient") as mock_class:
            mock_instance = AsyncMock()
            mock_class.return_value.__aenter__.return_value = mock_instance
            mock_class.return_value.__aexit__.return_value = None
            mock_instance.create_song.side_effect = SunoValidationError(
                "Invalid lyrics content"
            )
            
            with patch.dict("os.environ", {"SUNO_API_KEY": "test-api-key"}):
                response = await client.post(
                    "/api/songs/generate",
                    json={
                        "lyrics": SAMPLE_LYRICS,
                        "style": "pop"
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 400
        data = response.json()
        assert "Invalid lyrics" in str(data)

    @pytest.mark.asyncio
    async def test_generate_song_missing_api_key(
        self,
        client,
        mock_auth,
        mock_rate_limit,
        mock_song_cache,
        mock_firestore,
    ):
        """Test song generation fails when API key is not configured."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        # Ensure SUNO_API_KEY is not set
        with patch.dict("os.environ", {"SUNO_API_KEY": ""}, clear=False):
            response = await client.post(
                "/api/songs/generate",
                json={
                    "lyrics": SAMPLE_LYRICS,
                    "style": "pop"
                },
                headers={"Authorization": "Bearer test-token"}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 503
        data = response.json()
        assert "Service unavailable" in str(data)



# ============================================================================
# Get Song Status Endpoint Tests
# ============================================================================

class TestGetSongStatusEndpoint:
    """Tests for GET /api/songs/{task_id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_song_status_happy_path(
        self,
        client,
        mock_auth,
    ):
        """Test successful song status retrieval."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        # Mock Firestore to return task data
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as firestore_mock:
            firestore_mock.return_value = {
                "user_id": TEST_USER_ID,
                "task_id": "task-123",
                "status": "processing",
                "progress": 50,
                "song_url": None,
                "error": None
            }
            
            # Mock Suno client
            with patch("app.api.songs.SunoClient") as mock_class:
                mock_instance = AsyncMock()
                mock_class.return_value.__aenter__.return_value = mock_instance
                mock_class.return_value.__aexit__.return_value = None
                mock_instance.get_task_status.return_value = SunoStatus(
                    status="GENERATING",
                    progress=60,
                    song_url=None,
                    error=None
                )
                
                with patch("app.api.songs.update_task_status", new_callable=AsyncMock):
                    with patch.dict("os.environ", {"SUNO_API_KEY": "test-api-key"}):
                        response = await client.get(
                            "/api/songs/task-123",
                            headers={"Authorization": "Bearer test-token"}
                        )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == "task-123"
        assert data["status"] == "processing"
        assert data["progress"] == 60

    @pytest.mark.asyncio
    async def test_get_song_status_completed(
        self,
        client,
        mock_auth,
    ):
        """Test status retrieval for completed task returns cached status."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        # Mock Firestore to return completed task
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as firestore_mock:
            firestore_mock.return_value = {
                "user_id": TEST_USER_ID,
                "task_id": "task-123",
                "status": "completed",
                "progress": 100,
                "song_url": "https://example.com/song.mp3",
                "error": None
            }
            
            response = await client.get(
                "/api/songs/task-123",
                headers={"Authorization": "Bearer test-token"}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["progress"] == 100
        assert data["song_url"] == "https://example.com/song.mp3"

    @pytest.mark.asyncio
    async def test_get_song_status_task_not_found(
        self,
        client,
        mock_auth,
    ):
        """Test status retrieval fails when task doesn't exist."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        # Mock Firestore to return None (task not found)
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as firestore_mock:
            firestore_mock.return_value = None
            
            response = await client.get(
                "/api/songs/nonexistent-task",
                headers={"Authorization": "Bearer test-token"}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 404
        data = response.json()
        assert "Task not found" in str(data)

    @pytest.mark.asyncio
    async def test_get_song_status_unauthorized_access(
        self,
        client,
        mock_auth,
    ):
        """Test status retrieval fails when task belongs to another user."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        # Mock Firestore to return task owned by different user
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as firestore_mock:
            firestore_mock.return_value = {
                "user_id": ANOTHER_USER_ID,  # Different user
                "task_id": "task-123",
                "status": "processing",
                "progress": 50
            }
            
            response = await client.get(
                "/api/songs/task-123",
                headers={"Authorization": "Bearer test-token"}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 403
        data = response.json()
        assert "Forbidden" in str(data)

    @pytest.mark.asyncio
    async def test_get_song_status_suno_api_error_returns_cached(
        self,
        client,
        mock_auth,
    ):
        """Test status retrieval returns cached status when Suno API fails."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        # Mock Firestore to return task data
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as firestore_mock:
            firestore_mock.return_value = {
                "user_id": TEST_USER_ID,
                "task_id": "task-123",
                "status": "processing",
                "progress": 50,
                "song_url": None,
                "error": None
            }
            
            # Mock Suno client to raise error
            with patch("app.api.songs.SunoClient") as mock_class:
                mock_instance = AsyncMock()
                mock_class.return_value.__aenter__.return_value = mock_instance
                mock_class.return_value.__aexit__.return_value = None
                mock_instance.get_task_status.side_effect = SunoAPIError(
                    "API error", status_code=500
                )
                
                with patch.dict("os.environ", {"SUNO_API_KEY": "test-api-key"}):
                    response = await client.get(
                        "/api/songs/task-123",
                        headers={"Authorization": "Bearer test-token"}
                    )
        
        app.dependency_overrides.clear()
        
        # Should return cached status instead of failing
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "processing"
        assert data["progress"] == 50


# ============================================================================
# Health Check Endpoint Test
# ============================================================================

class TestSongsHealthEndpoint:
    """Tests for GET /api/songs/health endpoint."""

    @pytest.mark.asyncio
    async def test_songs_health_check(self, client):
        """Test songs service health check endpoint."""
        response = await client.get("/api/songs/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "songs"


# ============================================================================
# Authentication Tests
# ============================================================================

class TestSongsAuthentication:
    """Tests for authentication on songs endpoints."""

    @pytest.mark.asyncio
    async def test_generate_song_requires_auth(self, client):
        """Test song generation requires authentication."""
        # No Authorization header
        response = await client.post(
            "/api/songs/generate",
            json={
                "lyrics": SAMPLE_LYRICS,
                "style": "pop"
            }
        )
        
        # Should fail with 403 (Forbidden) or 401 (Unauthorized)
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_get_status_requires_auth(self, client):
        """Test status retrieval requires authentication."""
        # No Authorization header
        response = await client.get("/api/songs/task-123")
        
        # Should fail with 403 (Forbidden) or 401 (Unauthorized)
        assert response.status_code in [401, 403]
