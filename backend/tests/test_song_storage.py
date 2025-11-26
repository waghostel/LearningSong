"""Tests for song storage service.

This module tests the Firestore operations for song tasks including:
- Storing song tasks
- Retrieving tasks
- Updating task status
- Task ownership verification
- TTL cleanup

Requirements: FR-3, Task 17.3
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone, timedelta

from app.services.song_storage import (
    store_song_task,
    get_task_from_firestore,
    update_task_status,
    get_user_tasks,
    verify_task_ownership,
    cleanup_expired_tasks,
    extend_task_ttl,
    SONGS_COLLECTION,
    ANONYMOUS_TTL_HOURS,
)
from app.models.songs import GenerateSongRequest, MusicStyle, GenerationStatus


# Test constants
TEST_USER_ID = "test-user-123"
TEST_TASK_ID = "test-task-456"
TEST_CONTENT_HASH = "abc123hash"
TEST_LYRICS = """Verse 1:
Learning is a journey, not a race
Every step we take, we find our place"""


@pytest.fixture
def mock_firestore():
    """Mock Firestore client."""
    with patch("app.services.song_storage.get_firestore_client") as mock:
        mock_client = MagicMock()
        mock_collection = MagicMock()
        mock_doc = MagicMock()
        
        mock_client.collection.return_value = mock_collection
        mock_collection.document.return_value = mock_doc
        
        mock.return_value = mock_client
        yield {
            "client": mock_client,
            "collection": mock_collection,
            "doc": mock_doc,
        }


@pytest.fixture
def sample_request():
    """Create a sample song generation request."""
    return GenerateSongRequest(
        lyrics=TEST_LYRICS,
        style=MusicStyle.POP,
        content_hash=TEST_CONTENT_HASH,
    )


class TestStoreSongTask:
    """Tests for store_song_task function."""

    @pytest.mark.asyncio
    async def test_store_song_task_creates_document(self, mock_firestore, sample_request):
        """Test that store_song_task creates a Firestore document."""
        result = await store_song_task(TEST_USER_ID, TEST_TASK_ID, sample_request)
        
        # Verify collection and document were accessed
        mock_firestore["client"].collection.assert_called_with(SONGS_COLLECTION)
        mock_firestore["collection"].document.assert_called_with(TEST_TASK_ID)
        mock_firestore["doc"].set.assert_called_once()

    @pytest.mark.asyncio
    async def test_store_song_task_document_structure(self, mock_firestore, sample_request):
        """Test that stored document has correct structure."""
        result = await store_song_task(TEST_USER_ID, TEST_TASK_ID, sample_request)
        
        # Get the document data that was set
        set_call = mock_firestore["doc"].set.call_args[0][0]
        
        assert set_call["user_id"] == TEST_USER_ID
        assert set_call["task_id"] == TEST_TASK_ID
        assert set_call["content_hash"] == TEST_CONTENT_HASH
        assert set_call["lyrics"] == TEST_LYRICS
        assert set_call["style"] == MusicStyle.POP.value
        assert set_call["status"] == GenerationStatus.QUEUED.value
        assert set_call["progress"] == 0
        assert set_call["song_url"] is None
        assert set_call["error"] is None
        assert "created_at" in set_call
        assert "updated_at" in set_call
        assert "expires_at" in set_call

    @pytest.mark.asyncio
    async def test_store_song_task_sets_ttl(self, mock_firestore, sample_request):
        """Test that stored document has correct TTL."""
        before_store = datetime.now(timezone.utc)
        
        result = await store_song_task(TEST_USER_ID, TEST_TASK_ID, sample_request)
        
        set_call = mock_firestore["doc"].set.call_args[0][0]
        expires_at = set_call["expires_at"]
        
        # expires_at should be approximately 48 hours from now
        expected_expiry = before_store + timedelta(hours=ANONYMOUS_TTL_HOURS)
        assert abs((expires_at - expected_expiry).total_seconds()) < 5  # Within 5 seconds

    @pytest.mark.asyncio
    async def test_store_song_task_returns_document(self, mock_firestore, sample_request):
        """Test that store_song_task returns the stored document."""
        result = await store_song_task(TEST_USER_ID, TEST_TASK_ID, sample_request)
        
        assert result["user_id"] == TEST_USER_ID
        assert result["task_id"] == TEST_TASK_ID
        assert result["style"] == MusicStyle.POP.value


class TestGetTaskFromFirestore:
    """Tests for get_task_from_firestore function."""

    @pytest.mark.asyncio
    async def test_get_task_returns_document(self, mock_firestore):
        """Test retrieving an existing task."""
        mock_doc_snapshot = MagicMock()
        mock_doc_snapshot.exists = True
        mock_doc_snapshot.to_dict.return_value = {
            "user_id": TEST_USER_ID,
            "task_id": TEST_TASK_ID,
            "status": "processing",
        }
        mock_firestore["doc"].get.return_value = mock_doc_snapshot
        
        result = await get_task_from_firestore(TEST_TASK_ID)
        
        assert result is not None
        assert result["user_id"] == TEST_USER_ID
        assert result["task_id"] == TEST_TASK_ID

    @pytest.mark.asyncio
    async def test_get_task_returns_none_for_nonexistent(self, mock_firestore):
        """Test retrieving a nonexistent task returns None."""
        mock_doc_snapshot = MagicMock()
        mock_doc_snapshot.exists = False
        mock_firestore["doc"].get.return_value = mock_doc_snapshot
        
        result = await get_task_from_firestore("nonexistent-task")
        
        assert result is None


class TestUpdateTaskStatus:
    """Tests for update_task_status function."""

    @pytest.mark.asyncio
    async def test_update_task_status_basic(self, mock_firestore):
        """Test basic status update."""
        result = await update_task_status(
            task_id=TEST_TASK_ID,
            status=GenerationStatus.PROCESSING.value,
            progress=50,
        )
        
        assert result is True
        mock_firestore["doc"].update.assert_called_once()
        
        update_data = mock_firestore["doc"].update.call_args[0][0]
        assert update_data["status"] == GenerationStatus.PROCESSING.value
        assert update_data["progress"] == 50
        assert "updated_at" in update_data

    @pytest.mark.asyncio
    async def test_update_task_status_with_song_url(self, mock_firestore):
        """Test status update with song URL."""
        song_url = "https://example.com/song.mp3"
        
        result = await update_task_status(
            task_id=TEST_TASK_ID,
            status=GenerationStatus.COMPLETED.value,
            progress=100,
            song_url=song_url,
        )
        
        update_data = mock_firestore["doc"].update.call_args[0][0]
        assert update_data["song_url"] == song_url

    @pytest.mark.asyncio
    async def test_update_task_status_with_error(self, mock_firestore):
        """Test status update with error message."""
        error_msg = "Generation failed"
        
        result = await update_task_status(
            task_id=TEST_TASK_ID,
            status=GenerationStatus.FAILED.value,
            progress=0,
            error=error_msg,
        )
        
        update_data = mock_firestore["doc"].update.call_args[0][0]
        assert update_data["error"] == error_msg

    @pytest.mark.asyncio
    async def test_update_task_status_handles_error(self, mock_firestore):
        """Test that update handles Firestore errors gracefully."""
        mock_firestore["doc"].update.side_effect = Exception("Firestore error")
        
        result = await update_task_status(
            task_id=TEST_TASK_ID,
            status=GenerationStatus.PROCESSING.value,
            progress=50,
        )
        
        assert result is False


class TestVerifyTaskOwnership:
    """Tests for verify_task_ownership function."""

    @pytest.mark.asyncio
    async def test_verify_ownership_returns_true_for_owner(self, mock_firestore):
        """Test ownership verification for task owner."""
        mock_doc_snapshot = MagicMock()
        mock_doc_snapshot.exists = True
        mock_doc_snapshot.to_dict.return_value = {"user_id": TEST_USER_ID}
        mock_firestore["doc"].get.return_value = mock_doc_snapshot
        
        result = await verify_task_ownership(TEST_TASK_ID, TEST_USER_ID)
        
        assert result is True

    @pytest.mark.asyncio
    async def test_verify_ownership_returns_false_for_non_owner(self, mock_firestore):
        """Test ownership verification for non-owner."""
        mock_doc_snapshot = MagicMock()
        mock_doc_snapshot.exists = True
        mock_doc_snapshot.to_dict.return_value = {"user_id": "different-user"}
        mock_firestore["doc"].get.return_value = mock_doc_snapshot
        
        result = await verify_task_ownership(TEST_TASK_ID, TEST_USER_ID)
        
        assert result is False

    @pytest.mark.asyncio
    async def test_verify_ownership_returns_false_for_nonexistent_task(self, mock_firestore):
        """Test ownership verification for nonexistent task."""
        mock_doc_snapshot = MagicMock()
        mock_doc_snapshot.exists = False
        mock_firestore["doc"].get.return_value = mock_doc_snapshot
        
        result = await verify_task_ownership("nonexistent-task", TEST_USER_ID)
        
        assert result is False


class TestGetUserTasks:
    """Tests for get_user_tasks function."""

    @pytest.mark.asyncio
    async def test_get_user_tasks_returns_tasks(self, mock_firestore):
        """Test retrieving user's tasks."""
        mock_query = MagicMock()
        mock_firestore["collection"].where.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.limit.return_value = mock_query
        
        # Mock stream to return documents
        mock_doc1 = MagicMock()
        mock_doc1.to_dict.return_value = {"task_id": "task-1", "status": "completed"}
        mock_doc2 = MagicMock()
        mock_doc2.to_dict.return_value = {"task_id": "task-2", "status": "processing"}
        mock_query.stream.return_value = [mock_doc1, mock_doc2]
        
        result = await get_user_tasks(TEST_USER_ID)
        
        assert len(result) == 2
        assert result[0]["task_id"] == "task-1"
        assert result[1]["task_id"] == "task-2"

    @pytest.mark.asyncio
    async def test_get_user_tasks_respects_limit(self, mock_firestore):
        """Test that get_user_tasks respects the limit parameter."""
        mock_query = MagicMock()
        mock_firestore["collection"].where.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.stream.return_value = []
        
        await get_user_tasks(TEST_USER_ID, limit=5)
        
        mock_query.limit.assert_called_with(5)


class TestCleanupExpiredTasks:
    """Tests for cleanup_expired_tasks function."""

    @pytest.mark.asyncio
    async def test_cleanup_deletes_expired_tasks(self, mock_firestore):
        """Test that cleanup deletes expired tasks."""
        mock_query = MagicMock()
        mock_firestore["collection"].where.return_value = mock_query
        mock_query.limit.return_value = mock_query
        
        # Mock expired documents
        mock_doc1 = MagicMock()
        mock_doc1.reference = MagicMock()
        mock_doc2 = MagicMock()
        mock_doc2.reference = MagicMock()
        mock_query.stream.return_value = [mock_doc1, mock_doc2]
        
        # Mock batch
        mock_batch = MagicMock()
        mock_firestore["client"].batch.return_value = mock_batch
        
        result = await cleanup_expired_tasks()
        
        assert result == 2
        assert mock_batch.delete.call_count == 2
        mock_batch.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_cleanup_no_expired_tasks(self, mock_firestore):
        """Test cleanup when no tasks are expired."""
        mock_query = MagicMock()
        mock_firestore["collection"].where.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.stream.return_value = []
        
        result = await cleanup_expired_tasks()
        
        assert result == 0


class TestExtendTaskTTL:
    """Tests for extend_task_ttl function."""

    @pytest.mark.asyncio
    async def test_extend_ttl_updates_expires_at(self, mock_firestore):
        """Test that extend_task_ttl updates the expires_at field."""
        before_extend = datetime.now(timezone.utc)
        
        result = await extend_task_ttl(TEST_TASK_ID, hours=24)
        
        assert result is True
        mock_firestore["doc"].update.assert_called_once()
        
        update_data = mock_firestore["doc"].update.call_args[0][0]
        assert "expires_at" in update_data
        assert "updated_at" in update_data
        
        # New expiry should be approximately 24 hours from now
        expected_expiry = before_extend + timedelta(hours=24)
        actual_expiry = update_data["expires_at"]
        assert abs((actual_expiry - expected_expiry).total_seconds()) < 5

    @pytest.mark.asyncio
    async def test_extend_ttl_handles_error(self, mock_firestore):
        """Test that extend_task_ttl handles errors gracefully."""
        mock_firestore["doc"].update.side_effect = Exception("Firestore error")
        
        result = await extend_task_ttl(TEST_TASK_ID)
        
        assert result is False

    @pytest.mark.asyncio
    async def test_extend_ttl_uses_default_hours(self, mock_firestore):
        """Test that extend_task_ttl uses default TTL hours."""
        before_extend = datetime.now(timezone.utc)
        
        result = await extend_task_ttl(TEST_TASK_ID)
        
        update_data = mock_firestore["doc"].update.call_args[0][0]
        expected_expiry = before_extend + timedelta(hours=ANONYMOUS_TTL_HOURS)
        actual_expiry = update_data["expires_at"]
        assert abs((actual_expiry - expected_expiry).total_seconds()) < 5
