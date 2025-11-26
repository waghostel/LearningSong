"""Tests for WebSocket functionality.

This module tests the Socket.IO WebSocket implementation including:
- Connection authentication
- Task subscription flow
- Broadcast functionality
- Polling logic
- Connection manager

Requirements: FR-4, Task 16.5
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio

from app.api.websocket import (
    ConnectionManager,
    manager,
    poll_and_broadcast,
    broadcast_status_update,
    _map_suno_status_to_generation_status,
)
from app.models.songs import GenerationStatus
from app.services.suno_client import SunoStatus, SunoAPIError


# Test constants
TEST_USER_ID = "test-user-123"
TEST_TASK_ID = "test-task-456"
TEST_SID = "test-session-789"
TEST_TOKEN = "valid-firebase-token"


class TestConnectionManager:
    """Tests for ConnectionManager class."""

    def test_add_connection(self):
        """Test adding a connection to the manager."""
        cm = ConnectionManager()
        
        cm.add_connection(TEST_TASK_ID, TEST_SID, TEST_USER_ID)
        
        assert TEST_SID in cm.task_connections[TEST_TASK_ID]
        assert cm.session_users[TEST_SID] == TEST_USER_ID
        assert cm.session_tasks[TEST_SID] == TEST_TASK_ID

    def test_add_multiple_connections_same_task(self):
        """Test adding multiple connections for the same task."""
        cm = ConnectionManager()
        sid1 = "session-1"
        sid2 = "session-2"
        
        cm.add_connection(TEST_TASK_ID, sid1, TEST_USER_ID)
        cm.add_connection(TEST_TASK_ID, sid2, TEST_USER_ID)
        
        assert len(cm.task_connections[TEST_TASK_ID]) == 2
        assert sid1 in cm.task_connections[TEST_TASK_ID]
        assert sid2 in cm.task_connections[TEST_TASK_ID]

    def test_remove_connection(self):
        """Test removing a connection from the manager."""
        cm = ConnectionManager()
        cm.add_connection(TEST_TASK_ID, TEST_SID, TEST_USER_ID)
        
        removed_task_id = cm.remove_connection(TEST_SID)
        
        assert removed_task_id == TEST_TASK_ID
        assert TEST_SID not in cm.session_users
        assert TEST_SID not in cm.session_tasks
        assert TEST_TASK_ID not in cm.task_connections

    def test_remove_connection_keeps_other_connections(self):
        """Test removing one connection doesn't affect others for same task."""
        cm = ConnectionManager()
        sid1 = "session-1"
        sid2 = "session-2"
        
        cm.add_connection(TEST_TASK_ID, sid1, TEST_USER_ID)
        cm.add_connection(TEST_TASK_ID, sid2, TEST_USER_ID)
        
        cm.remove_connection(sid1)
        
        assert sid2 in cm.task_connections[TEST_TASK_ID]
        assert cm.session_users[sid2] == TEST_USER_ID

    def test_get_connections_for_task(self):
        """Test getting all connections for a task."""
        cm = ConnectionManager()
        sid1 = "session-1"
        sid2 = "session-2"
        
        cm.add_connection(TEST_TASK_ID, sid1, TEST_USER_ID)
        cm.add_connection(TEST_TASK_ID, sid2, TEST_USER_ID)
        
        connections = cm.get_connections_for_task(TEST_TASK_ID)
        
        assert len(connections) == 2
        assert sid1 in connections
        assert sid2 in connections

    def test_get_connections_for_nonexistent_task(self):
        """Test getting connections for a task with no connections."""
        cm = ConnectionManager()
        
        connections = cm.get_connections_for_task("nonexistent-task")
        
        assert connections == set()

    def test_get_user_for_session(self):
        """Test getting user ID for a session."""
        cm = ConnectionManager()
        cm.add_connection(TEST_TASK_ID, TEST_SID, TEST_USER_ID)
        
        user_id = cm.get_user_for_session(TEST_SID)
        
        assert user_id == TEST_USER_ID

    def test_get_user_for_nonexistent_session(self):
        """Test getting user ID for nonexistent session."""
        cm = ConnectionManager()
        
        user_id = cm.get_user_for_session("nonexistent-session")
        
        assert user_id is None

    def test_has_active_connections(self):
        """Test checking for active connections."""
        cm = ConnectionManager()
        
        assert not cm.has_active_connections(TEST_TASK_ID)
        
        cm.add_connection(TEST_TASK_ID, TEST_SID, TEST_USER_ID)
        
        assert cm.has_active_connections(TEST_TASK_ID)

    def test_polling_task_management(self):
        """Test setting and getting polling tasks."""
        cm = ConnectionManager()
        mock_task = MagicMock(spec=asyncio.Task)
        mock_task.done.return_value = False
        
        cm.set_polling_task(TEST_TASK_ID, mock_task)
        
        assert cm.get_polling_task(TEST_TASK_ID) == mock_task

    def test_cancel_polling_on_last_disconnect(self):
        """Test that polling is cancelled when last connection disconnects."""
        cm = ConnectionManager()
        mock_task = MagicMock(spec=asyncio.Task)
        mock_task.done.return_value = False
        
        cm.add_connection(TEST_TASK_ID, TEST_SID, TEST_USER_ID)
        cm.set_polling_task(TEST_TASK_ID, mock_task)
        
        cm.remove_connection(TEST_SID)
        
        mock_task.cancel.assert_called_once()
        assert TEST_TASK_ID not in cm.polling_tasks


class TestStatusMapping:
    """Tests for Suno status to GenerationStatus mapping."""

    @pytest.mark.parametrize("suno_status,expected", [
        ("PENDING", GenerationStatus.QUEUED),
        ("TEXT_SUCCESS", GenerationStatus.PROCESSING),
        ("FIRST_SUCCESS", GenerationStatus.PROCESSING),
        ("GENERATING", GenerationStatus.PROCESSING),
        ("SUCCESS", GenerationStatus.COMPLETED),
        ("FAILED", GenerationStatus.FAILED),
        ("CREATE_TASK_FAILED", GenerationStatus.FAILED),
        ("GENERATE_AUDIO_FAILED", GenerationStatus.FAILED),
        ("CALLBACK_EXCEPTION", GenerationStatus.FAILED),
        ("SENSITIVE_WORD_ERROR", GenerationStatus.FAILED),
        ("UNKNOWN_STATUS", GenerationStatus.QUEUED),  # Default
    ])
    def test_status_mapping(self, suno_status, expected):
        """Test mapping of Suno statuses to GenerationStatus."""
        result = _map_suno_status_to_generation_status(suno_status)
        assert result == expected


class TestPollAndBroadcast:
    """Tests for poll_and_broadcast function."""

    @pytest.mark.asyncio
    async def test_poll_stops_on_completed_status(self):
        """Test that polling stops when task is completed."""
        with patch.dict("os.environ", {"SUNO_API_KEY": "test-key"}):
            with patch("app.api.websocket.SunoClient") as mock_client_class:
                mock_client = AsyncMock()
                mock_client_class.return_value.__aenter__.return_value = mock_client
                mock_client_class.return_value.__aexit__.return_value = None
                
                # Return completed status
                mock_client.get_task_status.return_value = SunoStatus(
                    status="SUCCESS",
                    progress=100,
                    song_url="https://example.com/song.mp3",
                    error=None
                )
                
                with patch("app.api.websocket.manager") as mock_manager:
                    mock_manager.has_active_connections.return_value = True
                    mock_manager.polling_tasks = {}
                    
                    with patch("app.api.websocket.broadcast_status_update", new_callable=AsyncMock) as mock_broadcast:
                        with patch("app.api.websocket.update_task_status", new_callable=AsyncMock):
                            await poll_and_broadcast(TEST_TASK_ID)
                            
                            # Should broadcast completed status
                            mock_broadcast.assert_called()
                            call_args = mock_broadcast.call_args[0]
                            assert call_args[0] == TEST_TASK_ID
                            assert call_args[1]["status"] == GenerationStatus.COMPLETED.value

    @pytest.mark.asyncio
    async def test_poll_stops_on_failed_status(self):
        """Test that polling stops when task fails."""
        with patch.dict("os.environ", {"SUNO_API_KEY": "test-key"}):
            with patch("app.api.websocket.SunoClient") as mock_client_class:
                mock_client = AsyncMock()
                mock_client_class.return_value.__aenter__.return_value = mock_client
                mock_client_class.return_value.__aexit__.return_value = None
                
                mock_client.get_task_status.return_value = SunoStatus(
                    status="FAILED",
                    progress=0,
                    song_url=None,
                    error="Generation failed"
                )
                
                with patch("app.api.websocket.manager") as mock_manager:
                    mock_manager.has_active_connections.return_value = True
                    mock_manager.polling_tasks = {}
                    
                    with patch("app.api.websocket.broadcast_status_update", new_callable=AsyncMock) as mock_broadcast:
                        with patch("app.api.websocket.update_task_status", new_callable=AsyncMock):
                            await poll_and_broadcast(TEST_TASK_ID)
                            
                            mock_broadcast.assert_called()
                            call_args = mock_broadcast.call_args[0]
                            assert call_args[1]["status"] == GenerationStatus.FAILED.value

    @pytest.mark.asyncio
    async def test_poll_stops_when_no_connections(self):
        """Test that polling stops when no clients are connected."""
        with patch.dict("os.environ", {"SUNO_API_KEY": "test-key"}):
            with patch("app.api.websocket.SunoClient") as mock_client_class:
                mock_client = AsyncMock()
                mock_client_class.return_value.__aenter__.return_value = mock_client
                mock_client_class.return_value.__aexit__.return_value = None
                
                mock_client.get_task_status.return_value = SunoStatus(
                    status="GENERATING",
                    progress=50,
                    song_url=None,
                    error=None
                )
                
                with patch("app.api.websocket.manager") as mock_manager:
                    # No active connections
                    mock_manager.has_active_connections.return_value = False
                    mock_manager.polling_tasks = {}
                    
                    with patch("app.api.websocket.broadcast_status_update", new_callable=AsyncMock) as mock_broadcast:
                        await poll_and_broadcast(TEST_TASK_ID)
                        
                        # Should not broadcast since no connections
                        mock_broadcast.assert_not_called()

    @pytest.mark.asyncio
    async def test_poll_handles_missing_api_key(self):
        """Test that polling handles missing API key gracefully."""
        with patch.dict("os.environ", {"SUNO_API_KEY": ""}, clear=False):
            with patch("app.api.websocket.broadcast_status_update", new_callable=AsyncMock) as mock_broadcast:
                await poll_and_broadcast(TEST_TASK_ID)
                
                # Should broadcast error
                mock_broadcast.assert_called_once()
                call_args = mock_broadcast.call_args[0]
                assert call_args[1]["status"] == GenerationStatus.FAILED.value
                assert "configuration error" in call_args[1]["error"]

    @pytest.mark.asyncio
    async def test_poll_continues_on_transient_errors(self):
        """Test that polling continues on transient API errors."""
        with patch.dict("os.environ", {"SUNO_API_KEY": "test-key"}):
            with patch("app.api.websocket.SunoClient") as mock_client_class:
                mock_client = AsyncMock()
                mock_client_class.return_value.__aenter__.return_value = mock_client
                mock_client_class.return_value.__aexit__.return_value = None
                
                # First call raises error, second returns completed
                mock_client.get_task_status.side_effect = [
                    SunoAPIError("Transient error", status_code=500),
                    SunoStatus(
                        status="SUCCESS",
                        progress=100,
                        song_url="https://example.com/song.mp3",
                        error=None
                    )
                ]
                
                with patch("app.api.websocket.manager") as mock_manager:
                    mock_manager.has_active_connections.return_value = True
                    mock_manager.polling_tasks = {}
                    
                    with patch("app.api.websocket.broadcast_status_update", new_callable=AsyncMock):
                        with patch("app.api.websocket.update_task_status", new_callable=AsyncMock):
                            with patch("asyncio.sleep", new_callable=AsyncMock):
                                await poll_and_broadcast(TEST_TASK_ID)
                                
                                # Should have called get_task_status twice
                                assert mock_client.get_task_status.call_count == 2


class TestWebSocketAuthentication:
    """Tests for WebSocket authentication."""

    @pytest.mark.asyncio
    async def test_verify_websocket_token_valid(self):
        """Test verification of valid Firebase token."""
        from app.core.auth import verify_websocket_token
        
        with patch("app.core.auth.auth.verify_id_token") as mock_verify:
            mock_verify.return_value = {"uid": TEST_USER_ID}
            
            result = await verify_websocket_token(TEST_TOKEN)
            
            assert result == TEST_USER_ID
            mock_verify.assert_called_once_with(TEST_TOKEN)

    @pytest.mark.asyncio
    async def test_verify_websocket_token_invalid(self):
        """Test verification of invalid Firebase token."""
        from app.core.auth import verify_websocket_token
        from firebase_admin import auth as firebase_auth
        
        with patch("app.core.auth.auth.verify_id_token") as mock_verify:
            mock_verify.side_effect = firebase_auth.InvalidIdTokenError("Invalid token")
            
            result = await verify_websocket_token("invalid-token")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_verify_websocket_token_expired(self):
        """Test verification of expired Firebase token."""
        from app.core.auth import verify_websocket_token
        from firebase_admin import auth as firebase_auth
        
        with patch("app.core.auth.auth.verify_id_token") as mock_verify:
            mock_verify.side_effect = firebase_auth.ExpiredIdTokenError("Token expired", "cause")
            
            result = await verify_websocket_token("expired-token")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_verify_websocket_token_empty(self):
        """Test verification with empty token."""
        from app.core.auth import verify_websocket_token
        
        result = await verify_websocket_token("")
        
        assert result is None

    @pytest.mark.asyncio
    async def test_verify_websocket_token_none(self):
        """Test verification with None token."""
        from app.core.auth import verify_websocket_token
        
        result = await verify_websocket_token(None)
        
        assert result is None


class TestBroadcastStatusUpdate:
    """Tests for broadcast_status_update function."""

    @pytest.mark.asyncio
    async def test_broadcast_emits_to_room(self):
        """Test that broadcast emits to the correct room."""
        with patch("app.api.websocket.sio") as mock_sio:
            mock_sio.emit = AsyncMock()
            
            status_update = {
                "task_id": TEST_TASK_ID,
                "status": "processing",
                "progress": 50,
            }
            
            await broadcast_status_update(TEST_TASK_ID, status_update)
            
            mock_sio.emit.assert_called_once_with(
                "song_status",
                status_update,
                room=f"task:{TEST_TASK_ID}"
            )


class TestSocketIOEvents:
    """Tests for Socket.IO event handlers."""

    @pytest.mark.asyncio
    async def test_subscribe_requires_task_id(self):
        """Test that subscribe requires task_id."""
        from app.api.websocket import subscribe, sio
        
        with patch.object(sio, "emit", new_callable=AsyncMock) as mock_emit:
            await subscribe(TEST_SID, {})
            
            mock_emit.assert_called_once()
            call_args = mock_emit.call_args
            assert call_args[0][0] == "error"
            assert "task_id is required" in call_args[0][1]["message"]

    @pytest.mark.asyncio
    async def test_subscribe_requires_authentication(self):
        """Test that subscribe requires valid authentication."""
        from app.api.websocket import subscribe, sio
        
        with patch("app.api.websocket.manager") as mock_manager:
            mock_manager.get_user_for_session.return_value = None
            
            with patch("app.api.websocket.verify_websocket_token", new_callable=AsyncMock) as mock_verify:
                mock_verify.return_value = None  # Invalid token
                
                with patch.object(sio, "emit", new_callable=AsyncMock) as mock_emit:
                    await subscribe(TEST_SID, {"task_id": TEST_TASK_ID, "token": "invalid"})
                    
                    mock_emit.assert_called()
                    # Find the error emit call
                    error_calls = [c for c in mock_emit.call_args_list if c[0][0] == "error"]
                    assert len(error_calls) > 0
                    assert "AUTH_REQUIRED" in str(error_calls[0])

    @pytest.mark.asyncio
    async def test_subscribe_verifies_task_ownership(self):
        """Test that subscribe verifies task ownership."""
        from app.api.websocket import subscribe, sio
        
        with patch("app.api.websocket.manager") as mock_manager:
            mock_manager.get_user_for_session.return_value = TEST_USER_ID
            
            with patch("app.api.websocket.verify_task_ownership", new_callable=AsyncMock) as mock_verify:
                mock_verify.return_value = False  # Not owner
                
                with patch.object(sio, "emit", new_callable=AsyncMock) as mock_emit:
                    await subscribe(TEST_SID, {"task_id": TEST_TASK_ID})
                    
                    mock_emit.assert_called()
                    error_calls = [c for c in mock_emit.call_args_list if c[0][0] == "error"]
                    assert len(error_calls) > 0
                    assert "FORBIDDEN" in str(error_calls[0])

    @pytest.mark.asyncio
    async def test_subscribe_success(self):
        """Test successful subscription flow."""
        from app.api.websocket import subscribe, sio
        
        with patch("app.api.websocket.manager") as mock_manager:
            mock_manager.get_user_for_session.return_value = TEST_USER_ID
            mock_manager.get_polling_task.return_value = None
            mock_manager.has_active_connections.return_value = True
            
            with patch("app.api.websocket.verify_task_ownership", new_callable=AsyncMock) as mock_verify:
                mock_verify.return_value = True
                
                with patch("app.api.websocket.get_task_from_firestore", new_callable=AsyncMock) as mock_get_task:
                    mock_get_task.return_value = {
                        "status": "processing",
                        "progress": 50,
                        "song_url": None,
                        "error": None,
                    }
                    
                    with patch.object(sio, "emit", new_callable=AsyncMock) as mock_emit:
                        with patch.object(sio, "enter_room", new_callable=AsyncMock):
                            with patch("asyncio.create_task") as mock_create_task:
                                await subscribe(TEST_SID, {"task_id": TEST_TASK_ID})
                                
                                # Should add connection
                                mock_manager.add_connection.assert_called_once_with(
                                    TEST_TASK_ID, TEST_SID, TEST_USER_ID
                                )
                                
                                # Should emit subscribed event
                                subscribed_calls = [c for c in mock_emit.call_args_list if c[0][0] == "subscribed"]
                                assert len(subscribed_calls) > 0

    @pytest.mark.asyncio
    async def test_disconnect_removes_connection(self):
        """Test that disconnect removes connection from manager."""
        from app.api.websocket import disconnect
        
        with patch("app.api.websocket.manager") as mock_manager:
            await disconnect(TEST_SID)
            
            mock_manager.remove_connection.assert_called_once_with(TEST_SID)
