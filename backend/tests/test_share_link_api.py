"""Tests for share link API endpoints.

This module tests the share link functionality including:
- POST /api/songs/{song_id}/share - Share link creation
- GET /api/songs/shared/{share_token} - Shared song access
- Expired share link handling

Requirements: 5.1, 5.3, 5.4
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


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


class TestCreateShareLinkEndpoint:
    """Tests for POST /api/songs/{song_id}/share endpoint."""

    @pytest.mark.asyncio
    async def test_create_share_link_success(self, client):
        """Test successful share link creation."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        current_time = datetime.now(timezone.utc)
        expires_at = current_time + timedelta(hours=48)

        # Mock Firestore to return song owned by user
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as firestore_mock, \
             patch("app.api.songs.create_share_link", new_callable=AsyncMock) as share_mock:
            
            firestore_mock.return_value = {
                "user_id": TEST_USER_ID,
                "task_id": "song-123",
                "lyrics": SAMPLE_LYRICS,
                "style": "pop",
                "status": "completed",
                "song_url": "https://example.com/song.mp3",
                "created_at": current_time,
                "expires_at": expires_at,
            }
            
            share_mock.return_value = {
                "share_token": "test-share-token-abc123",
                "song_id": "song-123",
                "created_by": TEST_USER_ID,
                "created_at": current_time,
                "expires_at": expires_at,
            }
            
            response = await client.post(
                "/api/songs/song-123/share",
                headers={"Authorization": "Bearer test-token"}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 200
        data = response.json()
        assert "share_url" in data
        assert "share_token" in data
        assert "expires_at" in data
        assert data["share_token"] == "test-share-token-abc123"
        assert "test-share-token-abc123" in data["share_url"]

    @pytest.mark.asyncio
    async def test_create_share_link_song_not_found(self, client):
        """Test 404 response when song doesn't exist."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as firestore_mock:
            firestore_mock.return_value = None
            
            response = await client.post(
                "/api/songs/nonexistent-song/share",
                headers={"Authorization": "Bearer test-token"}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 404
        data = response.json()
        assert "not found" in str(data).lower()

    @pytest.mark.asyncio
    async def test_create_share_link_unauthorized(self, client):
        """Test 403 response when user doesn't own the song."""
        from app.core.auth import get_current_user
        app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
        
        current_time = datetime.now(timezone.utc)
        expires_at = current_time + timedelta(hours=24)
        
        with patch("app.api.songs.get_task_from_firestore", new_callable=AsyncMock) as firestore_mock:
            firestore_mock.return_value = {
                "user_id": ANOTHER_USER_ID,  # Different user
                "task_id": "other-user-song",
                "lyrics": SAMPLE_LYRICS,
                "style": "pop",
                "status": "completed",
                "song_url": "https://example.com/song.mp3",
                "created_at": current_time,
                "expires_at": expires_at,
            }
            
            response = await client.post(
                "/api/songs/other-user-song/share",
                headers={"Authorization": "Bearer test-token"}
            )
        
        app.dependency_overrides.clear()
        
        assert response.status_code == 403
        data = response.json()
        assert "Forbidden" in str(data) or "permission" in str(data).lower()

    @pytest.mark.asyncio
    async def test_create_share_link_requires_auth(self, client):
        """Test that share link creation requires authentication."""
        response = await client.post("/api/songs/song-123/share")
        assert response.status_code in [401, 403]


class TestGetSharedSongEndpoint:
    """Tests for GET /api/songs/shared/{share_token} endpoint."""

    @pytest.mark.asyncio
    async def test_get_shared_song_success(self, client):
        """Test successful shared song retrieval."""
        current_time = datetime.now(timezone.utc)
        expires_at = current_time + timedelta(hours=24)
        
        with patch("app.api.songs.get_song_by_share_token", new_callable=AsyncMock) as share_mock:
            share_mock.return_value = {
                "user_id": TEST_USER_ID,
                "task_id": "song-123",
                "lyrics": SAMPLE_LYRICS,
                "style": "pop",
                "status": "completed",
                "song_url": "https://example.com/song.mp3",
                "created_at": current_time,
                "expires_at": expires_at,
            }
            
            response = await client.get("/api/songs/shared/valid-share-token")
        
        assert response.status_code == 200
        data = response.json()
        assert data["song_id"] == "song-123"
        assert data["song_url"] == "https://example.com/song.mp3"
        assert data["lyrics"] == SAMPLE_LYRICS
        assert data["style"] == "pop"
        assert data["is_owner"] is False  # Shared songs are never owned

    @pytest.mark.asyncio
    async def test_get_shared_song_not_found(self, client):
        """Test 404 response when share token doesn't exist."""
        with patch("app.api.songs.get_song_by_share_token", new_callable=AsyncMock) as share_mock:
            share_mock.return_value = None
            
            response = await client.get("/api/songs/shared/invalid-token")
        
        assert response.status_code == 404
        data = response.json()
        assert "invalid" in str(data).lower() or "not found" in str(data).lower()

    @pytest.mark.asyncio
    async def test_get_shared_song_expired_link(self, client):
        """Test 410 response when share link has expired."""
        with patch("app.api.songs.get_song_by_share_token", new_callable=AsyncMock) as share_mock:
            share_mock.side_effect = ValueError("Share link has expired")
            
            response = await client.get("/api/songs/shared/expired-token")
        
        assert response.status_code == 410
        data = response.json()
        assert "expired" in str(data).lower()

    @pytest.mark.asyncio
    async def test_get_shared_song_expired_song(self, client):
        """Test 410 response when the song itself has expired."""
        current_time = datetime.now(timezone.utc)
        # Song expired 1 hour ago
        expires_at = current_time - timedelta(hours=1)
        created_at = current_time - timedelta(hours=49)
        
        with patch("app.api.songs.get_song_by_share_token", new_callable=AsyncMock) as share_mock:
            share_mock.return_value = {
                "user_id": TEST_USER_ID,
                "task_id": "expired-song",
                "lyrics": SAMPLE_LYRICS,
                "style": "pop",
                "status": "completed",
                "song_url": "https://example.com/song.mp3",
                "created_at": created_at,
                "expires_at": expires_at,
            }
            
            response = await client.get("/api/songs/shared/valid-token-expired-song")
        
        assert response.status_code == 410
        data = response.json()
        assert "expired" in str(data).lower()

    @pytest.mark.asyncio
    async def test_get_shared_song_not_ready(self, client):
        """Test 404 response when shared song is still generating."""
        current_time = datetime.now(timezone.utc)
        expires_at = current_time + timedelta(hours=24)
        
        with patch("app.api.songs.get_song_by_share_token", new_callable=AsyncMock) as share_mock:
            share_mock.return_value = {
                "user_id": TEST_USER_ID,
                "task_id": "generating-song",
                "lyrics": SAMPLE_LYRICS,
                "style": "pop",
                "status": "processing",
                "song_url": None,  # Not yet generated
                "created_at": current_time,
                "expires_at": expires_at,
            }
            
            response = await client.get("/api/songs/shared/valid-token-generating")
        
        assert response.status_code == 404
        data = response.json()
        assert "not ready" in str(data).lower() or "still being generated" in str(data).lower()

    @pytest.mark.asyncio
    async def test_get_shared_song_no_auth_required(self, client):
        """Test that shared song access does NOT require authentication."""
        current_time = datetime.now(timezone.utc)
        expires_at = current_time + timedelta(hours=24)
        
        with patch("app.api.songs.get_song_by_share_token", new_callable=AsyncMock) as share_mock:
            share_mock.return_value = {
                "user_id": TEST_USER_ID,
                "task_id": "song-123",
                "lyrics": SAMPLE_LYRICS,
                "style": "pop",
                "status": "completed",
                "song_url": "https://example.com/song.mp3",
                "created_at": current_time,
                "expires_at": expires_at,
            }
            
            # No Authorization header - should still work
            response = await client.get("/api/songs/shared/valid-share-token")
        
        assert response.status_code == 200
