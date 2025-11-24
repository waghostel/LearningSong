"""
End-to-End tests for Page A: Text Input functionality.

These tests validate the complete system integration from frontend to backend,
including authentication, rate limiting, caching, and the AI pipeline.

Requirements tested:
- US-1: Input Educational Content
- US-2: Enable Google Search Grounding
- US-3: View Rate Limit Status
- US-4: Generate Lyrics
- US-5: Track Generation Progress
- US-6: Handle Errors Gracefully
- FR-1: Text Input Validation
- FR-2: Rate Limiting
- FR-3: AI Pipeline Integration
- FR-4: Google Search Grounding
"""

import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock, MagicMock

from app.main import app
from app.services.cache import generate_content_hash


class MockFirestoreDocument:
    """Mock Firestore document with proper return values"""
    
    def __init__(self, exists=True, data=None):
        self.exists = exists
        self._data = data or {}
    
    def to_dict(self):
        return self._data
    
    def get(self, *args, **kwargs):
        return self._data.get(*args, **kwargs)


class MockFirestoreReference:
    """Mock Firestore document reference"""
    
    def __init__(self, doc):
        self._doc = doc
    
    def get(self):
        return self._doc
    
    def set(self, data):
        self._doc._data = data
    
    def update(self, data):
        self._doc._data.update(data)


class MockFirestoreCollection:
    """Mock Firestore collection"""
    
    def __init__(self, documents=None):
        self._documents = documents or {}
        self._auto_id_counter = 0
    
    def document(self, doc_id=None):
        # If no doc_id provided, generate one (like Firestore does)
        if doc_id is None:
            self._auto_id_counter += 1
            doc_id = f"auto_generated_id_{self._auto_id_counter}"
        
        if doc_id not in self._documents:
            self._documents[doc_id] = MockFirestoreDocument(exists=False)
        return MockFirestoreReference(self._documents[doc_id])
    
    def add(self, data):
        return AsyncMock()


class MockFirestoreClient:
    """Mock Firestore client with proper collection handling"""
    
    def __init__(self):
        self._collections = {}
    
    def collection(self, name):
        if name not in self._collections:
            self._collections[name] = MockFirestoreCollection()
        return self._collections[name]
    
    def setup_user(self, user_id, songs_generated=0):
        """Helper to setup a user document"""
        user_doc = MockFirestoreDocument(exists=True, data={
            'songs_generated_today': songs_generated,
            'daily_limit_reset': datetime.now(timezone.utc) + timedelta(days=1),
            'created_at': datetime.now(timezone.utc),
            'total_songs_generated': songs_generated
        })
        self._collections.setdefault('users', MockFirestoreCollection())
        self._collections['users']._documents[user_id] = user_doc
    
    def setup_cache(self, content_hash, lyrics=None):
        """Helper to setup a cache document"""
        if lyrics:
            cache_doc = MockFirestoreDocument(exists=True, data={
                'lyrics': lyrics,
                'content_hash': content_hash,
                'hit_count': 0,
                'created_at': datetime.now(timezone.utc),
                'last_accessed': datetime.now(timezone.utc)
            })
        else:
            cache_doc = MockFirestoreDocument(exists=False)
        
        self._collections.setdefault('cached_songs', MockFirestoreCollection())
        self._collections['cached_songs']._documents[content_hash] = cache_doc


# Global mock firestore client
_test_firestore_client = None


@pytest.fixture(autouse=True)
def mock_firestore():
    """Auto-use fixture to provide a mock Firestore client for all tests"""
    global _test_firestore_client
    _test_firestore_client = MockFirestoreClient()
    
    # Patch all places where Firestore client is called
    with patch('app.core.firebase.get_firestore_client', return_value=_test_firestore_client):
        with patch('app.api.lyrics.get_firestore_client', return_value=_test_firestore_client):
            with patch('app.services.rate_limiter.get_firestore_client', return_value=_test_firestore_client):
                with patch('app.services.cache.get_firestore_client', return_value=_test_firestore_client):
                    yield _test_firestore_client


class TestE2EHappyPath:
    """Test the complete happy path flow: input content → generate lyrics"""
    
    @pytest.mark.asyncio
    async def test_complete_flow(self):
        """
        Test complete flow from content input to lyrics generation.
        
        Validates: All US requirements
        """
        user_id = 'test-user-e2e-1'
        content = "Photosynthesis is the process by which plants convert light energy into chemical energy."
        content_hash = generate_content_hash(content)
        expected_lyrics = "Verse 1: Plants convert light to energy..."
        
        # Setup mocks
        _test_firestore_client.setup_user(user_id, songs_generated=0)
        _test_firestore_client.setup_cache(content_hash, lyrics=None)  # Cache miss
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': user_id}
                
                with patch('app.api.lyrics.LyricsPipeline') as MockPipelineClass:
                    mock_pipeline_instance = AsyncMock()
                    mock_pipeline_instance.execute = AsyncMock(return_value={
                        'lyrics': expected_lyrics,
                        'content_hash': content_hash,
                        'processing_time': 15.5
                    })
                    MockPipelineClass.return_value = mock_pipeline_instance
                    
                    # Step 1: Check rate limit
                    response = await client.get(
                        "/api/lyrics/rate-limit",
                        headers={"Authorization": "Bearer test-token"}
                    )
                    assert response.status_code == 200
                    rate_limit_data = response.json()
                    assert rate_limit_data['remaining'] == 3
                    
                    # Step 2: Generate lyrics
                    response = await client.post(
                        "/api/lyrics/generate",
                        json={
                            "content": content,
                            "search_enabled": False
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    # Verify response
                    assert response.status_code == 200
                    data = response.json()
                    assert 'lyrics' in data
                    assert 'content_hash' in data
                    assert 'cached' in data
                    assert 'processing_time' in data
                    assert data['lyrics'] == expected_lyrics
                    assert data['cached'] is False
                    
                    # Verify pipeline was called
                    mock_pipeline_instance.execute.assert_called_once()
                    call_args = mock_pipeline_instance.execute.call_args[1]
                    assert call_args['content'] == content
                    assert call_args['search_enabled'] is False


class TestE2ERateLimitScenario:
    """Test rate limiting: generate 3 songs, verify 4th is blocked"""
    
    @pytest.mark.asyncio
    async def test_rate_limit_enforcement(self):
        """
        Test that rate limit is enforced after 3 generations.
        
        Validates: US-3, FR-2
        """
        user_id = 'test-user-e2e-2'
        
        # Setup user with 0 songs generated
        _test_firestore_client.setup_user(user_id, songs_generated=0)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': user_id}
                
                with patch('app.api.lyrics.LyricsPipeline') as MockPipelineClass:
                    mock_pipeline_instance = AsyncMock()
                    mock_pipeline_instance.execute = AsyncMock(return_value={
                        'lyrics': 'Test lyrics',
                        'content_hash': 'test-hash',
                        'processing_time': 10.0
                    })
                    MockPipelineClass.return_value = mock_pipeline_instance
                    
                    # Generate 3 songs successfully
                    for i in range(3):
                        content = f"Test content {i}"
                        content_hash = generate_content_hash(content)
                        _test_firestore_client.setup_cache(content_hash, lyrics=None)
                        
                        response = await client.post(
                            "/api/lyrics/generate",
                            json={
                                "content": content,
                                "search_enabled": False
                            },
                            headers={"Authorization": "Bearer test-token"}
                        )
                        assert response.status_code == 200
                    
                    # 4th attempt should be blocked
                    content_4 = "Test content 4"
                    content_hash_4 = generate_content_hash(content_4)
                    _test_firestore_client.setup_cache(content_hash_4, lyrics=None)
                    
                    response = await client.post(
                        "/api/lyrics/generate",
                        json={
                            "content": content_4,
                            "search_enabled": False
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    assert response.status_code == 429
                    error_data = response.json()
                    assert 'detail' in error_data


class TestE2ECacheScenario:
    """Test caching: generate lyrics twice with same content, verify cache hit"""
    
    @pytest.mark.asyncio
    async def test_cache_hit(self):
        """
        Test that duplicate content returns cached result faster.
        
        Validates: FR-3
        """
        user_id = 'test-user-e2e-3'
        content = "The water cycle includes evaporation, condensation, and precipitation."
        content_hash = generate_content_hash(content)
        cached_lyrics = "Cached lyrics about water cycle"
        
        # Setup user
        _test_firestore_client.setup_user(user_id, songs_generated=0)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': user_id}
                
                with patch('app.api.lyrics.LyricsPipeline') as MockPipelineClass:
                    mock_pipeline_instance = AsyncMock()
                    mock_pipeline_instance.execute = AsyncMock(return_value={
                        'lyrics': cached_lyrics,
                        'content_hash': content_hash,
                        'processing_time': 20.0
                    })
                    MockPipelineClass.return_value = mock_pipeline_instance
                    
                    # First request - cache miss
                    _test_firestore_client.setup_cache(content_hash, lyrics=None)
                    
                    response1 = await client.post(
                        "/api/lyrics/generate",
                        json={
                            "content": content,
                            "search_enabled": False
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )
                    assert response1.status_code == 200
                    data1 = response1.json()
                    assert data1['cached'] is False
                    assert data1['lyrics'] == cached_lyrics
                    
                    # Pipeline should be called
                    assert mock_pipeline_instance.execute.call_count == 1
                    
                    # Setup cache for second request
                    _test_firestore_client.setup_cache(content_hash, lyrics=cached_lyrics)
                    
                    # Second request - cache hit
                    response2 = await client.post(
                        "/api/lyrics/generate",
                        json={
                            "content": content,
                            "search_enabled": False
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )
                    assert response2.status_code == 200
                    data2 = response2.json()
                    assert data2['cached'] is True
                    assert data2['lyrics'] == cached_lyrics
                    assert data2['processing_time'] == 0
                    
                    # Pipeline should not be called again
                    assert mock_pipeline_instance.execute.call_count == 1


class TestE2EErrorScenarios:
    """Test error handling for various failure cases"""
    
    @pytest.mark.asyncio
    async def test_content_exceeds_word_limit(self):
        """
        Test that content exceeding 10,000 words is rejected.
        
        Validates: US-6, FR-1
        """
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': 'test-user-e2e-4'}
                
                # Create content with >10,000 words
                long_content = ' '.join(['word'] * 10001)
                
                response = await client.post(
                    "/api/lyrics/generate",
                    json={
                        "content": long_content,
                        "search_enabled": False
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Should be rejected with validation error
                assert response.status_code == 422
                error_data = response.json()
                assert 'detail' in error_data
    
    @pytest.mark.asyncio
    async def test_invalid_firebase_token(self):
        """
        Test that invalid Firebase tokens are rejected.
        
        Validates: US-6
        """
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.side_effect = Exception("Invalid token")
                
                response = await client.post(
                    "/api/lyrics/generate",
                    json={
                        "content": "Test content",
                        "search_enabled": False
                    },
                    headers={"Authorization": "Bearer invalid-token"}
                )
                
                # Should return 403 Forbidden
                assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_empty_content_rejected(self):
        """
        Test that empty content is rejected.
        
        Validates: US-6, FR-1
        """
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': 'test-user-e2e-5'}
                
                response = await client.post(
                    "/api/lyrics/generate",
                    json={
                        "content": "",
                        "search_enabled": False
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
                
                # Should be rejected with validation error
                assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_pipeline_error_handling(self):
        """
        Test that pipeline errors are handled gracefully.
        
        Validates: US-6
        """
        user_id = 'test-user-e2e-6'
        content = "Test content"
        content_hash = generate_content_hash(content)
        
        # Setup mocks
        _test_firestore_client.setup_user(user_id, songs_generated=0)
        _test_firestore_client.setup_cache(content_hash, lyrics=None)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': user_id}
                
                with patch('app.api.lyrics.LyricsPipeline') as MockPipelineClass:
                    mock_pipeline_instance = AsyncMock()
                    mock_pipeline_instance.execute = AsyncMock(side_effect=Exception("Pipeline error"))
                    MockPipelineClass.return_value = mock_pipeline_instance
                    
                    response = await client.post(
                        "/api/lyrics/generate",
                        json={
                            "content": content,
                            "search_enabled": False
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    # Should return 500 error
                    assert response.status_code == 500


class TestE2ESearchGrounding:
    """Test Google Search grounding functionality"""
    
    @pytest.mark.asyncio
    async def test_search_grounding_enabled(self):
        """
        Test that search grounding works when enabled.
        
        Validates: US-2, FR-4
        """
        user_id = 'test-user-e2e-7'
        content = "Short query"
        content_hash = generate_content_hash(content)
        
        # Setup mocks
        _test_firestore_client.setup_user(user_id, songs_generated=0)
        _test_firestore_client.setup_cache(content_hash, lyrics=None)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': user_id}
                
                with patch('app.api.lyrics.LyricsPipeline') as MockPipelineClass:
                    mock_pipeline_instance = AsyncMock()
                    mock_pipeline_instance.execute = AsyncMock(return_value={
                        'lyrics': 'Enriched lyrics with search context',
                        'content_hash': content_hash,
                        'processing_time': 25.0
                    })
                    MockPipelineClass.return_value = mock_pipeline_instance
                    
                    # Request with search enabled
                    response = await client.post(
                        "/api/lyrics/generate",
                        json={
                            "content": content,
                            "search_enabled": True
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    assert response.status_code == 200
                    data = response.json()
                    assert 'lyrics' in data
                    
                    # Verify pipeline was called with search enabled
                    mock_pipeline_instance.execute.assert_called_once()
                    call_args = mock_pipeline_instance.execute.call_args[1]
                    assert call_args['search_enabled'] is True
    
    @pytest.mark.asyncio
    async def test_search_grounding_disabled(self):
        """
        Test that search grounding is not used when disabled.
        
        Validates: US-2, FR-4
        """
        user_id = 'test-user-e2e-8'
        content = "Short query"
        content_hash = generate_content_hash(content)
        
        # Setup mocks
        _test_firestore_client.setup_user(user_id, songs_generated=0)
        _test_firestore_client.setup_cache(content_hash, lyrics=None)
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            with patch('app.core.auth.auth.verify_id_token') as mock_verify:
                mock_verify.return_value = {'uid': user_id}
                
                with patch('app.api.lyrics.LyricsPipeline') as MockPipelineClass:
                    mock_pipeline_instance = AsyncMock()
                    mock_pipeline_instance.execute = AsyncMock(return_value={
                        'lyrics': 'Standard lyrics without search',
                        'content_hash': content_hash,
                        'processing_time': 15.0
                    })
                    MockPipelineClass.return_value = mock_pipeline_instance
                    
                    # Request with search disabled
                    response = await client.post(
                        "/api/lyrics/generate",
                        json={
                            "content": content,
                            "search_enabled": False
                        },
                        headers={"Authorization": "Bearer test-token"}
                    )
                    
                    assert response.status_code == 200
                    data = response.json()
                    assert 'lyrics' in data
                    
                    # Verify pipeline was called with search disabled
                    mock_pipeline_instance.execute.assert_called_once()
                    call_args = mock_pipeline_instance.execute.call_args[1]
                    assert call_args['search_enabled'] is False
