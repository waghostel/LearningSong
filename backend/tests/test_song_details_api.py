"""Tests for song details API endpoint.

This module tests the GET /api/songs/{song_id}/details endpoint including:
- Successful retrieval
- 404 for non-existent song
- 410 for expired song
- 403 for unauthorized access

Requirements: 8.1, 8.2, 8.3
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.models.songs import MusicStyle


# Test user IDs
TEST_USER_ID = "test-user-123"
ANOTHER_USER_ID = "another-user-456"

# Sample lyrics for testing
SAMPLE_LYRICS = """Verse 1:
Learning is a journey, not a race
Every step we take, we find our place
With knowledge as our guide, we'll find the way
Growing stronger every single day

Chorus:
We learn, we grow, we shine so bright
Together we can reach new heights"""


@pytest.fixture
async def client():
    """Async test client for FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestGetSongDetailsEndpoint:
    """Tests for GET /api/songs/{song_id}/details endpoint."""

    @pytest.mark.asyncio
    async def test_get_song_details_success(self, client):
        """Test successful song details retrieval."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        current_time = datetime.now(timezone.utc)
        expires_at = current_time + timedelta(hours=24)
        
        # Mock Firestore to return complete song data
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as firestore_mock:
            firestore_mock.return_value = {
                "user_id": TEST_USER_ID,
                "task_id": "song-123",
                "lyrics": SAMPLE_LYRICS,
                "style": "pop",
                "status": "completed",
                "progress": 100,
                "song_url": "https://example.com/song.mp3",
                "created_at": current_time,
                "expires_at": expires_at,
            }
            
            response = await client.get(
                "/api/songs/song-123/details",
                headers={"Authorization": "Bearer test-token"}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        data = response.json()
        assert data["song_id"] == "song-123"
        assert data["song_url"] == "https://example.com/song.mp3"
        assert data["lyrics"] == SAMPLE_LYRICS
        assert data["style"] == "pop"
        assert data["is_owner"] is True
        assert "created_at" in data
        assert "expires_at" in data

    @pytest.mark.asyncio
    async def test_get_song_details_not_found(self, client):
        """Test 404 response when song doesn't exist."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        # Mock Firestore to return None (song not found)
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as firestore_mock:
            firestore_mock.return_value = None
            
            response = await client.get(
                "/api/songs/nonexistent-song/details",
                headers={"Authorization": "Bearer test-token"}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 404
        data = response.json()
        assert "Song not found" in str(data)

    @pytest.mark.asyncio
    async def test_get_song_details_expired(self, client):
        """Test 410 response when song has expired."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        current_time = datetime.now(timezone.utc)
        # Set expiration to 1 hour ago
        expires_at = current_time - timedelta(hours=1)
        created_at = current_time - timedelta(hours=49)
        
        # Mock Firestore to return expired song
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as firestore_mock:
            firestore_mock.return_value = {
                "user_id": TEST_USER_ID,
                "task_id": "expired-song",
                "lyrics": SAMPLE_LYRICS,
                "style": "pop",
                "status": "completed",
                "progress": 100,
                "song_url": "https://example.com/song.mp3",
                "created_at": created_at,
                "expires_at": expires_at,
            }
            
            response = await client.get(
                "/api/songs/expired-song/details",
                headers={"Authorization": "Bearer test-token"}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 410
        data = response.json()
        assert "expired" in str(data).lower()

    @pytest.mark.asyncio
    async def test_get_song_details_unauthorized(self, client):
        """Test 403 response when user doesn't own the song."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        current_time = datetime.now(timezone.utc)
        expires_at = current_time + timedelta(hours=24)
        
        # Mock Firestore to return song owned by different user
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as firestore_mock:
            firestore_mock.return_value = {
                "user_id": ANOTHER_USER_ID,  # Different user
                "task_id": "other-user-song",
                "lyrics": SAMPLE_LYRICS,
                "style": "pop",
                "status": "completed",
                "progress": 100,
                "song_url": "https://example.com/song.mp3",
                "created_at": current_time,
                "expires_at": expires_at,
            }
            
            response = await client.get(
                "/api/songs/other-user-song/details",
                headers={"Authorization": "Bearer test-token"}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 403
        data = response.json()
        assert "Forbidden" in str(data)

    @pytest.mark.asyncio
    async def test_get_song_details_not_ready(self, client):
        """Test 404 response when song is still generating."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        current_time = datetime.now(timezone.utc)
        expires_at = current_time + timedelta(hours=24)
        
        # Mock Firestore to return song without song_url (still generating)
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as firestore_mock:
            firestore_mock.return_value = {
                "user_id": TEST_USER_ID,
                "task_id": "generating-song",
                "lyrics": SAMPLE_LYRICS,
                "style": "pop",
                "status": "processing",
                "progress": 50,
                "song_url": None,  # Not yet generated
                "created_at": current_time,
                "expires_at": expires_at,
            }
            
            response = await client.get(
                "/api/songs/generating-song/details",
                headers={"Authorization": "Bearer test-token"}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 404
        data = response.json()
        assert "not ready" in str(data).lower() or "still being generated" in str(data).lower()

    @pytest.mark.asyncio
    async def test_get_song_details_requires_auth(self, client):
        """Test that song details endpoint requires authentication."""
        # No Authorization header
        response = await client.get("/api/songs/song-123/details")
        
        # Should fail with 401 or 403
        assert response.status_code in [401, 403]
