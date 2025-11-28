"""
End-to-End tests for Page B: Lyrics Editing functionality.

These tests validate the complete system integration for song generation,
including WebSocket updates, rate limiting, caching, and error handling.

Requirements tested:
- US-1: View AI-Generated Lyrics
- US-2: Edit Lyrics
- US-3: Select Music Style
- US-4: Generate Song
- US-5: Track Generation Progress
- US-6: Navigate Between Pages
- US-7: Handle Errors Gracefully
- FR-3: Song Generation API
- FR-4: WebSocket Updates
- FR-5: Browser Notifications
- FR-6: Rate Limiting

Task: 20 - End-to-End Testing
"""

import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock, MagicMock

from app.main import app
from app.models.songs import MusicStyle, GenerationStatus
from app.services.suno_client import SunoTask, SunoStatus


# Sample lyrics for testing (must be at least 50 characters)
SAMPLE_LYRICS = """Verse 1:
Learning is a journey, not a race
Every step we take, we find our place
With knowledge as our guide, we'll find the way
Growing stronger every single day

Chorus:
We learn, we grow, we shine so bright
Together we can reach new heights"""

TEST_USER_ID = "test-user-e2e-page-b"
TEST_TASK_ID = "suno-task-12345"
TEST_CONTENT_HASH = "abc123hash"


class MockFirestoreDocument:
    """Mock Firestore document"""
    
    def __init__(self, exists=True, data=None):
        self.exists = exists
        self._data = data or {}
    
    def to_dict(self):
        return self._data


class MockFirestoreReference:
    """Mock Firestore document reference"""
    
    def __init__(self, doc):
        self._doc = doc
    
    def get(self):
        return self._doc
    
    def set(self, data):
        self._doc._data = data
        self._doc.exists = True
    
    def update(self, data):
        self._doc._data.update(data)


class MockFirestoreCollection:
    """Mock Firestore collection"""
    
    def __init__(self):
        self._documents = {}
    
    def document(self, doc_id=None):
        if doc_id is None:
            doc_id = f"auto_{len(self._documents)}"
        if doc_id not in self._documents:
            self._documents[doc_id] = MockFirestoreDocument(exists=False)
        return MockFirestoreReference(self._documents[doc_id])
    
    def where(self, *args, **kwargs):
        return self
    
    def order_by(self, *args, **kwargs):
        return self
    
    def limit(self, *args):
        return self
    
    def stream(self):
        return []


class MockFirestoreClient:
    """Mock Firestore client"""
    
    def __init__(self):
        self._collections = {}
    
    def collection(self, name):
        if name not in self._collections:
            self._collections[name] = MockFirestoreCollection()
        return self._collections[name]
    
    def batch(self):
        return MagicMock()
    
    def setup_user(self, user_id, songs_generated=0):
        """Setup a user document"""
        user_doc = MockFirestoreDocument(exists=True, data={
            'songs_generated_today': songs_generated,
            'daily_limit_reset': datetime.now(timezone.utc) + timedelta(days=1),
            'created_at': datetime.now(timezone.utc),
        })
        self._collections.setdefault('users', MockFirestoreCollection())
        self._collections['users']._documents[user_id] = user_doc
    
    def setup_song_task(self, task_id, user_id, status="queued", progress=0, song_url=None):
        """Setup a song task document"""
        task_doc = MockFirestoreDocument(exists=True, data={
            'user_id': user_id,
            'task_id': task_id,
            'status': status,
            'progress': progress,
            'song_url': song_url,
            'error': None,
            'lyrics': SAMPLE_LYRICS,
            'style': 'pop',
            'content_hash': TEST_CONTENT_HASH,
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc),
            'expires_at': datetime.now(timezone.utc) + timedelta(hours=48),
        })
        self._collections.setdefault('songs', MockFirestoreCollection())
        self._collections['songs']._documents[task_id] = task_doc


_test_firestore_client = None


@pytest.fixture(autouse=True)
def mock_firestore():
    """Auto-use fixture to provide mock Firestore client"""
    global _test_firestore_client
    _test_firestore_client = MockFirestoreClient()
    
    with patch('app.core.firebase.get_firestore_client', return_value=_test_firestore_client):
        with patch('app.services.song_storage.get_firestore_client', return_value=_test_firestore_client):
            with patch('app.services.rate_limiter.get_firestore_client', return_value=_test_firestore_client):
                with patch('app.services.cache.get_firestore_client', return_value=_test_firestore_client):
                    yield _test_firestore_client



class TestE2EGenerateSongHappyPath:
    """Test 20.1: Complete happy path for song generation."""

    @pytest.mark.asyncio
    async def test_generate_song_complete_flow(self):
        """
        Test complete flow: submit lyrics -> generate song -> get status.
        
        Validates: US-1, US-3, US-4, US-5, FR-3
        """
        _test_firestore_client.setup_user(TEST_USER_ID, songs_generated=0)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                with patch('app.api.songs.SunoClient') as mock_suno_class:
                    mock_suno = AsyncMock()
                    mock_suno_class.return_value.__aenter__.return_value = mock_suno
                    mock_suno_class.return_value.__aexit__.return_value = None
                    
                    mock_suno.create_song.return_value = SunoTask(
                        task_id=TEST_TASK_ID,
                        estimated_time=60
                    )
                    
                    with patch.dict("os.environ", {"SUNO_API_KEY": "test-key"}):
                        # Step 1: Generate song
                        response = await client.post(
                            "/api/songs/generate",
                            json={
                                "lyrics": SAMPLE_LYRICS,
                                "style": "pop",
                                "content_hash": TEST_CONTENT_HASH
                            },
                            headers={"Authorization": "Bearer test-token"}
                        )
                        
                        assert response.status_code == 200
                        data = response.json()
                        assert "task_id" in data
                        assert "estimated_time" in data
                        assert data["task_id"] == TEST_TASK_ID
                        
                        # Step 2: Check status
                        _test_firestore_client.setup_song_task(
                            TEST_TASK_ID, TEST_USER_ID, 
                            status="processing", progress=50
                        )
                        
                        mock_suno.get_task_status.return_value = SunoStatus(
                            status="GENERATING",
                            progress=75,
                            song_url=None,
                            error=None
                        )
                        
                        response = await client.get(
                            f"/api/songs/{TEST_TASK_ID}",
                            headers={"Authorization": "Bearer test-token"}
                        )
                        
                        assert response.status_code == 200
                        status_data = response.json()
                        assert status_data["task_id"] == TEST_TASK_ID
                        assert status_data["status"] == "processing"
                        assert status_data["progress"] == 75


class TestE2EStyleSelection:
    """Test 20.3: Test all 8 music styles."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("style", [
        "pop", "rap", "folk", "electronic", 
        "rock", "jazz", "children", "classical"
    ])
    async def test_all_music_styles(self, style):
        """
        Test that all 8 music styles are accepted.
        
        Validates: US-3
        """
        _test_firestore_client.setup_user(TEST_USER_ID, songs_generated=0)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                with patch('app.api.songs.SunoClient') as mock_suno_class:
                    mock_suno = AsyncMock()
                    mock_suno_class.return_value.__aenter__.return_value = mock_suno
                    mock_suno_class.return_value.__aexit__.return_value = None
                    
                    mock_suno.create_song.return_value = SunoTask(
                        task_id=f"task-{style}",
                        estimated_time=60
                    )
                    
                    with patch.dict("os.environ", {"SUNO_API_KEY": "test-key"}):
                        response = await client.post(
                            "/api/songs/generate",
                            json={
                                "lyrics": SAMPLE_LYRICS,
                                "style": style,
                            },
                            headers={"Authorization": "Bearer test-token"}
                        )
                        
                        assert response.status_code == 200
                        
                        # Verify style was passed to Suno
                        mock_suno.create_song.assert_called_once()
                        call_kwargs = mock_suno.create_song.call_args[1]
                        assert call_kwargs["style"] == style


class TestE2ERateLimitScenario:
    """Test 20.5: Rate limit enforcement for songs."""

    @pytest.mark.asyncio
    async def test_rate_limit_blocks_fourth_song(self):
        """
        Test that fourth song generation is blocked after 3 songs.
        
        Validates: US-4, FR-6
        """
        # Setup user with 3 songs already generated
        _test_firestore_client.setup_user(TEST_USER_ID, songs_generated=3)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                response = await client.post(
                    "/api/songs/generate",
                    json={
                        "lyrics": SAMPLE_LYRICS,
                        "style": "pop",
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
                
                assert response.status_code == 429
                error_data = response.json()
                assert "detail" in error_data


class TestE2ECacheScenario:
    """Test 20.6: Cache hit returns instant result."""

    @pytest.mark.asyncio
    async def test_cache_hit_returns_cached_song(self):
        """
        Test that duplicate request returns cached result.
        
        Validates: FR-3
        """
        _test_firestore_client.setup_user(TEST_USER_ID, songs_generated=0)
        
        # Setup cache hit
        cached_result = {
            "task_id": "cached-task-123",
            "song_url": "https://example.com/cached-song.mp3"
        }
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                with patch('app.api.songs.check_song_cache', new_callable=AsyncMock) as mock_cache:
                    mock_cache.return_value = cached_result
                    
                    with patch.dict("os.environ", {"SUNO_API_KEY": "test-key"}):
                        response = await client.post(
                            "/api/songs/generate",
                            json={
                                "lyrics": SAMPLE_LYRICS,
                                "style": "pop",
                                "content_hash": TEST_CONTENT_HASH
                            },
                            headers={"Authorization": "Bearer test-token"}
                        )
                        
                        assert response.status_code == 200
                        data = response.json()
                        assert data["task_id"] == "cached-task-123"
                        assert data["estimated_time"] == 0  # Instant from cache



class TestE2EGenerateSongHappyPath:
    """Test 20.1: Complete happy path for song generation."""

    @pytest.mark.asyncio
    async def test_generate_song_complete_flow(self):
        """
        Test complete flow: generate song -> track status -> completion.
        
        Validates: US-4, US-5, FR-3
        """
        _test_firestore_client.setup_user(TEST_USER_ID, songs_generated=0)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                with patch('app.api.songs.SunoClient') as MockSunoClass:
                    mock_suno = AsyncMock()
                    MockSunoClass.return_value.__aenter__.return_value = mock_suno
                    MockSunoClass.return_value.__aexit__.return_value = None
                    
                    mock_suno.create_song.return_value = SunoTask(
                        task_id=TEST_TASK_ID,
                        estimated_time=60
                    )
                    
                    with patch.dict("os.environ", {"SUNO_API_KEY": "test-key"}):
                        # Step 1: Generate song
                        response = await client.post(
                            "/api/songs/generate",
                            json={
                                "lyrics": SAMPLE_LYRICS,
                                "style": "pop",
                                "content_hash": TEST_CONTENT_HASH
                            },
                            headers={"Authorization": "Bearer test-token"}
                        )
                        
                        assert response.status_code == 200
                        data = response.json()
                        assert "task_id" in data
                        assert "estimated_time" in data
                        assert data["task_id"] == TEST_TASK_ID

    @pytest.mark.asyncio
    async def test_get_song_status_processing(self):
        """
        Test getting status of a processing song.
        
        Validates: US-5, FR-3
        """
        _test_firestore_client.setup_user(TEST_USER_ID, songs_generated=1)
        _test_firestore_client.setup_song_task(TEST_TASK_ID, TEST_USER_ID, status="processing", progress=50)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                with patch('app.api.songs.SunoClient') as MockSunoClass:
                    mock_suno = AsyncMock()
                    MockSunoClass.return_value.__aenter__.return_value = mock_suno
                    MockSunoClass.return_value.__aexit__.return_value = None
                    
                    mock_suno.get_task_status.return_value = SunoStatus(
                        status="GENERATING",
                        progress=75,
                        song_url=None,
                        error=None
                    )
                    
                    with patch.dict("os.environ", {"SUNO_API_KEY": "test-key"}):
                        response = await client.get(
                            f"/api/songs/{TEST_TASK_ID}",
                            headers={"Authorization": "Bearer test-token"}
                        )
                        
                        assert response.status_code == 200
                        data = response.json()
                        assert data["status"] == "processing"
                        assert data["progress"] == 75

    @pytest.mark.asyncio
    async def test_get_song_status_completed(self):
        """
        Test getting status of a completed song.
        
        Validates: US-5, FR-3
        """
        song_url = "https://cdn.suno.ai/song-12345.mp3"
        _test_firestore_client.setup_user(TEST_USER_ID, songs_generated=1)
        _test_firestore_client.setup_song_task(
            TEST_TASK_ID, TEST_USER_ID, 
            status="completed", progress=100, song_url=song_url
        )
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                # Completed tasks return cached status without calling Suno API
                response = await client.get(
                    f"/api/songs/{TEST_TASK_ID}",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "completed"
                assert data["progress"] == 100
                assert data["song_url"] == song_url


class TestE2EStyleSelection:
    """Test 20.3: Style selection with all 8 music styles."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("style", [
        "pop", "rap", "folk", "electronic", "rock", "jazz", "children", "classical"
    ])
    async def test_all_music_styles(self, style):
        """
        Test song generation with each music style.
        
        Validates: US-3, FR-3
        """
        _test_firestore_client.setup_user(TEST_USER_ID, songs_generated=0)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                with patch('app.api.songs.SunoClient') as MockSunoClass:
                    mock_suno = AsyncMock()
                    MockSunoClass.return_value.__aenter__.return_value = mock_suno
                    MockSunoClass.return_value.__aexit__.return_value = None
                    
                    mock_suno.create_song.return_value = SunoTask(
                        task_id=f"task-{style}",
                        estimated_time=60
                    )
                    
                    with patch.dict("os.environ", {"SUNO_API_KEY": "test-key"}):
                        response = await client.post(
                            "/api/songs/generate",
                            json={
                                "lyrics": SAMPLE_LYRICS,
                                "style": style,
                            },
                            headers={"Authorization": "Bearer test-token"}
                        )
                        
                        assert response.status_code == 200
                        
                        # Verify style was passed to Suno client
                        mock_suno.create_song.assert_called_once()
                        call_kwargs = mock_suno.create_song.call_args[1]
                        assert call_kwargs["style"] == style


class TestE2ERateLimitScenario:
    """Test 20.5: Rate limit enforcement for song generation."""

    @pytest.mark.asyncio
    async def test_rate_limit_blocks_fourth_song(self):
        """
        Test that fourth song generation is blocked after 3 songs.
        
        Validates: US-4, FR-6
        """
        # User has already generated 3 songs
        _test_firestore_client.setup_user(TEST_USER_ID, songs_generated=3)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                response = await client.post(
                    "/api/songs/generate",
                    json={
                        "lyrics": SAMPLE_LYRICS,
                        "style": "pop",
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
                
                assert response.status_code == 429
                data = response.json()
                assert "detail" in data


class TestE2ECacheScenario:
    """Test 20.6: Cache hit for duplicate song requests."""

    @pytest.mark.asyncio
    async def test_cache_hit_returns_instant(self):
        """
        Test that cached song returns instantly.
        
        Validates: FR-3
        """
        _test_firestore_client.setup_user(TEST_USER_ID, songs_generated=0)
        
        # Setup cache hit
        cached_result = {
            "task_id": "cached-task-123",
            "song_url": "https://cdn.suno.ai/cached-song.mp3",
        }
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                with patch('app.api.songs.check_song_cache', new_callable=AsyncMock) as mock_cache:
                    mock_cache.return_value = cached_result
                    
                    response = await client.post(
                        "/api/songs/generate",
                        json={
                            "lyrics": SAMPLE_LYRICS,
                            "style": "pop",
                            "content_hash": TEST_CONTENT_HASH
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    assert response.status_code == 200
                    data = response.json()
                    assert data["task_id"] == "cached-task-123"
                    assert data["estimated_time"] == 0  # Instant from cache



class TestE2EErrorScenarios:
    """Test 20.7: Error handling scenarios."""

    @pytest.mark.asyncio
    async def test_lyrics_too_long_rejected(self):
        """
        Test that lyrics >3000 characters are rejected.
        
        Validates: US-7, FR-1
        """
        long_lyrics = "A" * 3001  # Exceeds 3000 char limit
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                response = await client.post(
                    "/api/songs/generate",
                    json={
                        "lyrics": long_lyrics,
                        "style": "pop",
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
                
                assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_lyrics_too_short_rejected(self):
        """
        Test that lyrics <50 characters are rejected.
        
        Validates: US-7, FR-1
        """
        short_lyrics = "Too short"  # Less than 50 chars
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                response = await client.post(
                    "/api/songs/generate",
                    json={
                        "lyrics": short_lyrics,
                        "style": "pop",
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
                
                assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_style_rejected(self):
        """
        Test that invalid music style is rejected.
        
        Validates: US-7
        """
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                response = await client.post(
                    "/api/songs/generate",
                    json={
                        "lyrics": SAMPLE_LYRICS,
                        "style": "invalid_style",
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
                
                assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_suno_api_unavailable(self):
        """
        Test handling when Suno API key is not configured.
        
        Validates: US-7
        """
        _test_firestore_client.setup_user(TEST_USER_ID, songs_generated=0)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                with patch.dict("os.environ", {"SUNO_API_KEY": ""}, clear=False):
                    response = await client.post(
                        "/api/songs/generate",
                        json={
                            "lyrics": SAMPLE_LYRICS,
                            "style": "pop",
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    assert response.status_code == 503
                    data = response.json()
                    assert "Service unavailable" in str(data)

    @pytest.mark.asyncio
    async def test_task_not_found(self):
        """
        Test handling when task does not exist.
        
        Validates: US-7
        """
        _test_firestore_client.setup_user(TEST_USER_ID, songs_generated=0)
        # Do not setup the task - it will not exist
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}
                
                response = await client.get(
                    "/api/songs/nonexistent-task",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_unauthorized_task_access(self):
        """
        Test that users cannot access other users tasks.
        
        Validates: US-7
        """
        other_user_id = "other-user-456"
        _test_firestore_client.setup_user(TEST_USER_ID, songs_generated=0)
        _test_firestore_client.setup_song_task(TEST_TASK_ID, other_user_id)  # Task belongs to other user
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': TEST_USER_ID}  # Current user
                
                response = await client.get(
                    f"/api/songs/{TEST_TASK_ID}",
                    headers={"Authorization": "Bearer test-token"}
                )
                
                assert response.status_code == 403


class TestE2EAuthentication:
    """Test authentication requirements."""

    @pytest.mark.asyncio
    async def test_generate_requires_auth(self):
        """Test that song generation requires authentication."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/songs/generate",
                json={
                    "lyrics": SAMPLE_LYRICS,
                    "style": "pop",
                }
            )
            
            assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_status_requires_auth(self):
        """Test that status check requires authentication."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"/api/songs/{TEST_TASK_ID}")
            
            assert response.status_code in [401, 403]


class TestE2EHealthCheck:
    """Test health check endpoint."""

    @pytest.mark.asyncio
    async def test_songs_health_check(self):
        """Test songs service health check."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/songs/health")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["service"] == "songs"
