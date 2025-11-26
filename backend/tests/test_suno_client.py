"""Tests for Suno API client."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from app.services.suno_client import (
    SunoClient,
    SunoTask,
    SunoStatus,
    SunoAPIError,
    SunoRateLimitError,
    SunoAuthenticationError,
    SunoValidationError,
    STYLE_MAPPING,
)
from app.models.songs import MusicStyle


class TestSunoTask:
    def test_creates_valid_task(self):
        task = SunoTask(task_id="abc123", estimated_time=60)
        assert task.task_id == "abc123"
        assert task.estimated_time == 60
    
    def test_raises_error_for_empty_task_id(self):
        with pytest.raises(ValueError, match="task_id cannot be empty"):
            SunoTask(task_id="", estimated_time=60)
    
    def test_raises_error_for_negative_estimated_time(self):
        with pytest.raises(ValueError, match="estimated_time cannot be negative"):
            SunoTask(task_id="abc123", estimated_time=-1)


class TestSunoStatus:
    def test_creates_valid_status(self):
        status = SunoStatus(status="SUCCESS", progress=100, song_url="https://example.com/song.mp3")
        assert status.status == "SUCCESS"
        assert status.progress == 100
        assert status.song_url == "https://example.com/song.mp3"
    
    def test_creates_status_with_error(self):
        status = SunoStatus(status="FAILED", progress=0, error="Generation failed")
        assert status.status == "FAILED"
        assert status.progress == 0
        assert status.error == "Generation failed"
    
    def test_raises_error_for_invalid_progress(self):
        with pytest.raises(ValueError, match="progress must be between 0 and 100"):
            SunoStatus(status="PENDING", progress=150)


class TestSunoClientInit:
    def test_creates_client_with_api_key(self):
        client = SunoClient(api_key="test-api-key")
        assert client.api_key == "test-api-key"
        assert client.base_url == "https://api.sunoapi.org"
    
    def test_raises_error_for_empty_api_key(self):
        with pytest.raises(ValueError, match="api_key cannot be empty"):
            SunoClient(api_key="")


class TestSunoClientCreateSong:
    def get_sample_lyrics(self):
        return "Verse 1: Learning is a journey, not a race. Every step we take, we find our place."
    
    @pytest.mark.asyncio
    async def test_create_song_success(self):
        sample_lyrics = self.get_sample_lyrics()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"code": 200, "msg": "success", "data": {"taskId": "task-123"}}
        mock_response.raise_for_status = MagicMock()
        
        mock_http_client = AsyncMock()
        mock_http_client.post = AsyncMock(return_value=mock_response)
        mock_http_client.is_closed = False
        
        client = SunoClient(api_key="test-api-key")
        client._client = mock_http_client
        
        result = await client.create_song(lyrics=sample_lyrics, style="pop", title="Test Song")
        
        assert isinstance(result, SunoTask)
        assert result.task_id == "task-123"
    
    @pytest.mark.asyncio
    async def test_create_song_raises_validation_error_for_empty_lyrics(self):
        client = SunoClient(api_key="test-api-key")
        with pytest.raises(SunoValidationError, match="Lyrics cannot be empty"):
            await client.create_song(lyrics="", style="pop")
    
    @pytest.mark.asyncio
    async def test_create_song_raises_auth_error_on_401(self):
        sample_lyrics = self.get_sample_lyrics()
        mock_response = MagicMock()
        mock_response.status_code = 401
        
        mock_http_client = AsyncMock()
        mock_http_client.post = AsyncMock(return_value=mock_response)
        mock_http_client.is_closed = False
        
        client = SunoClient(api_key="test-api-key")
        client._client = mock_http_client
        
        with pytest.raises(SunoAuthenticationError, match="Invalid API key"):
            await client.create_song(lyrics=sample_lyrics, style="pop")


class TestSunoClientGetTaskStatus:
    @pytest.mark.asyncio
    async def test_get_task_status_pending(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"code": 200, "msg": "success", "data": {"taskId": "task-123", "status": "PENDING"}}
        mock_response.raise_for_status = MagicMock()
        
        mock_http_client = AsyncMock()
        mock_http_client.get = AsyncMock(return_value=mock_response)
        mock_http_client.is_closed = False
        
        client = SunoClient(api_key="test-api-key")
        client._client = mock_http_client
        
        result = await client.get_task_status("task-123")
        
        assert isinstance(result, SunoStatus)
        assert result.status == "PENDING"
    
    @pytest.mark.asyncio
    async def test_get_task_status_raises_validation_error_for_empty_task_id(self):
        client = SunoClient(api_key="test-api-key")
        with pytest.raises(SunoValidationError, match="task_id cannot be empty"):
            await client.get_task_status("")


class TestStyleMapping:
    def test_all_music_styles_have_mapping(self):
        for style in MusicStyle:
            assert style in STYLE_MAPPING
            assert STYLE_MAPPING[style]
