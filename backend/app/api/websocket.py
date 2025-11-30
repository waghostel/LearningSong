"""
WebSocket module for real-time song generation status updates.

This module provides Socket.IO server integration with FastAPI for
broadcasting song generation progress to connected clients.

Requirements: FR-4, Task 16
"""
import asyncio
import os
import logging
from typing import Optional
import socketio

from app.core.auth import verify_websocket_token
from app.services.suno_client import SunoClient, SunoAPIError
from app.services.song_storage import (
    get_task_from_firestore,
    update_task_status,
    verify_task_ownership,
)
from app.models.songs import GenerationStatus


# Configure logging
logger = logging.getLogger(__name__)

# Create Socket.IO server with async mode
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
    ],
    logger=True,
    engineio_logger=True if os.getenv("DEBUG_SOCKETIO") else False,
)

# Create ASGI app that wraps Socket.IO server
# Note: socketio_path should be empty since we mount at /socket.io in main.py
socket_app = socketio.ASGIApp(sio, socketio_path="")

# Polling interval in seconds
POLL_INTERVAL = 5

# Maximum polling duration (5 minutes - Suno generation can take 2-4 minutes)
MAX_POLL_DURATION = 300


class ConnectionManager:
    """
    Manages WebSocket connections for song generation status updates.
    
    Tracks active connections by task_id to enable broadcasting
    status updates to all clients monitoring a specific task.
    """
    
    def __init__(self):
        # Maps task_id -> set of session IDs (sid)
        self.task_connections: dict[str, set[str]] = {}
        # Maps session ID -> user_id for authentication tracking
        self.session_users: dict[str, str] = {}
        # Maps session ID -> task_id for cleanup
        self.session_tasks: dict[str, str] = {}
        # Maps task_id -> polling task for cancellation
        self.polling_tasks: dict[str, asyncio.Task] = {}
    
    def add_connection(self, task_id: str, sid: str, user_id: str) -> None:
        """Add a connection to track for a specific task."""
        if task_id not in self.task_connections:
            self.task_connections[task_id] = set()
        self.task_connections[task_id].add(sid)
        self.session_users[sid] = user_id
        self.session_tasks[sid] = task_id
        logger.info(f"Connection added: sid={sid}, task_id={task_id}, user_id={user_id[:8]}...")
    
    def remove_connection(self, sid: str) -> Optional[str]:
        """Remove a connection when client disconnects. Returns task_id if removed."""
        task_id = self.session_tasks.pop(sid, None)
        self.session_users.pop(sid, None)
        
        if task_id and task_id in self.task_connections:
            self.task_connections[task_id].discard(sid)
            if not self.task_connections[task_id]:
                del self.task_connections[task_id]
                # Cancel polling if no more connections for this task
                self._cancel_polling(task_id)
        
        logger.info(f"Connection removed: sid={sid}, task_id={task_id}")
        return task_id
    
    def get_connections_for_task(self, task_id: str) -> set[str]:
        """Get all session IDs subscribed to a task."""
        return self.task_connections.get(task_id, set())
    
    def get_user_for_session(self, sid: str) -> Optional[str]:
        """Get the user_id for a session."""
        return self.session_users.get(sid)
    
    def get_task_for_session(self, sid: str) -> Optional[str]:
        """Get the task_id for a session."""
        return self.session_tasks.get(sid)
    
    def has_active_connections(self, task_id: str) -> bool:
        """Check if there are active connections for a task."""
        return bool(self.task_connections.get(task_id))
    
    def set_polling_task(self, task_id: str, task: asyncio.Task) -> None:
        """Store a polling task for a task_id."""
        self.polling_tasks[task_id] = task
    
    def get_polling_task(self, task_id: str) -> Optional[asyncio.Task]:
        """Get the polling task for a task_id."""
        return self.polling_tasks.get(task_id)
    
    def _cancel_polling(self, task_id: str) -> None:
        """Cancel polling for a task if running."""
        polling_task = self.polling_tasks.pop(task_id, None)
        if polling_task and not polling_task.done():
            polling_task.cancel()
            logger.info(f"Polling cancelled for task: {task_id}")


# Global connection manager instance
manager = ConnectionManager()


def _map_suno_status_to_generation_status(suno_status: str) -> GenerationStatus:
    """Map Suno API status to GenerationStatus enum."""
    status_mapping = {
        "PENDING": GenerationStatus.QUEUED,
        "TEXT_SUCCESS": GenerationStatus.PROCESSING,
        "FIRST_SUCCESS": GenerationStatus.PROCESSING,
        "GENERATING": GenerationStatus.PROCESSING,
        "SUCCESS": GenerationStatus.COMPLETED,
        "FAILED": GenerationStatus.FAILED,
        "CREATE_TASK_FAILED": GenerationStatus.FAILED,
        "GENERATE_AUDIO_FAILED": GenerationStatus.FAILED,
        "CALLBACK_EXCEPTION": GenerationStatus.FAILED,
        "SENSITIVE_WORD_ERROR": GenerationStatus.FAILED,
    }
    return status_mapping.get(suno_status, GenerationStatus.QUEUED)


async def poll_and_broadcast(task_id: str) -> None:
    """
    Poll Suno API for status updates and broadcast to connected clients.
    
    This function polls the Suno API every POLL_INTERVAL seconds and broadcasts
    status updates to all clients subscribed to the task. Polling stops when:
    - Task reaches a terminal state (completed or failed)
    - No more clients are connected
    - Maximum polling duration is exceeded
    
    Args:
        task_id: The Suno task ID to poll
        
    Requirements: FR-4, Task 16.3
    """
    print(f"🎵 [POLL] Starting polling for task: {task_id}")
    print(f"🎵 [POLL] Max duration: {MAX_POLL_DURATION}s, Poll interval: {POLL_INTERVAL}s")
    logger.info(f"Starting polling for task: {task_id}")
    
    suno_api_key = os.getenv("SUNO_API_KEY")
    if not suno_api_key:
        print("❌ [POLL] SUNO_API_KEY not configured!")
        logger.error("SUNO_API_KEY not configured, cannot poll")
        await broadcast_status_update(task_id, {
            "task_id": task_id,
            "status": GenerationStatus.FAILED.value,
            "progress": 0,
            "error": "Service configuration error",
        })
        return
    
    suno_base_url = os.getenv("SUNO_API_URL", "https://api.sunoapi.org")
    print(f"🎵 [POLL] Using Suno API URL: {suno_base_url}")
    start_time = asyncio.get_event_loop().time()
    poll_count = 0
    
    try:
        async with SunoClient(api_key=suno_api_key, base_url=suno_base_url) as suno_client:
            while True:
                poll_count += 1
                # Check if we've exceeded max polling duration
                elapsed = asyncio.get_event_loop().time() - start_time
                remaining = MAX_POLL_DURATION - elapsed
                
                print(f"🔄 [POLL #{poll_count}] Task: {task_id[:16]}... | Elapsed: {elapsed:.1f}s | Remaining: {remaining:.1f}s")
                
                if elapsed > MAX_POLL_DURATION:
                    print(f"⏰ [POLL] TIMEOUT after {elapsed:.1f}s for task: {task_id}")
                    logger.warning(f"Polling timeout for task: {task_id}")
                    await broadcast_status_update(task_id, {
                        "task_id": task_id,
                        "status": GenerationStatus.FAILED.value,
                        "progress": 0,
                        "error": "Generation timed out. Please try again.",
                    })
                    await update_task_status(
                        task_id=task_id,
                        status=GenerationStatus.FAILED.value,
                        progress=0,
                        error="Generation timed out",
                    )
                    break
                
                # Check if there are still connected clients
                if not manager.has_active_connections(task_id):
                    print(f"👋 [POLL] No active connections for task: {task_id}, stopping")
                    logger.info(f"No active connections for task: {task_id}, stopping polling")
                    break
                
                try:
                    # Poll Suno API for status
                    print(f"📡 [POLL] Calling Suno API get_task_status...")
                    suno_status = await suno_client.get_task_status(task_id)
                    generation_status = _map_suno_status_to_generation_status(suno_status.status)
                    
                    print(f"📊 [POLL] Suno response: status={suno_status.status}, progress={suno_status.progress}%, song_url={'YES' if suno_status.song_url else 'NO'}, error={suno_status.error}")
                    
                    # Prepare status update
                    status_update = {
                        "task_id": task_id,
                        "status": generation_status.value,
                        "progress": suno_status.progress,
                        "song_url": suno_status.song_url,
                        "error": suno_status.error,
                    }
                    
                    # Broadcast to all connected clients
                    await broadcast_status_update(task_id, status_update)
                    
                    # Update Firestore
                    await update_task_status(
                        task_id=task_id,
                        status=generation_status.value,
                        progress=suno_status.progress,
                        song_url=suno_status.song_url,
                        error=suno_status.error,
                    )
                    
                    logger.info(
                        f"Polled task {task_id}: status={generation_status.value}, progress={suno_status.progress}"
                    )
                    
                    # Check if task is complete
                    if generation_status in [GenerationStatus.COMPLETED, GenerationStatus.FAILED]:
                        if generation_status == GenerationStatus.COMPLETED:
                            print(f"✅ [POLL] Task COMPLETED! Song URL: {suno_status.song_url}")
                        else:
                            print(f"❌ [POLL] Task FAILED! Error: {suno_status.error}")
                        logger.info(f"Task {task_id} reached terminal state: {generation_status.value}")
                        break
                    
                except SunoAPIError as e:
                    print(f"⚠️ [POLL] Suno API error: {e}")
                    logger.error(f"Suno API error while polling task {task_id}: {e}")
                    # Continue polling on transient errors
                
                except Exception as e:
                    print(f"⚠️ [POLL] Unexpected error: {type(e).__name__}: {e}")
                    logger.error(f"Unexpected error while polling task {task_id}: {e}")
                    # Continue polling on transient errors
                
                # Wait before next poll
                print(f"💤 [POLL] Sleeping {POLL_INTERVAL}s before next poll...")
                await asyncio.sleep(POLL_INTERVAL)
    
    except asyncio.CancelledError:
        logger.info(f"Polling cancelled for task: {task_id}")
        raise
    
    except Exception as e:
        logger.error(f"Fatal error in polling for task {task_id}: {e}")
        await broadcast_status_update(task_id, {
            "task_id": task_id,
            "status": GenerationStatus.FAILED.value,
            "progress": 0,
            "error": "An error occurred while tracking generation progress.",
        })
    
    finally:
        # Clean up polling task reference
        manager.polling_tasks.pop(task_id, None)
        logger.info(f"Polling ended for task: {task_id}")


async def broadcast_status_update(task_id: str, status_update: dict) -> None:
    """
    Broadcast a status update to all clients subscribed to a task.
    
    Args:
        task_id: The task ID to broadcast to
        status_update: Dictionary containing status information
    """
    room = f"task:{task_id}"
    await sio.emit("song_status", status_update, room=room)
    logger.debug(f"Broadcast status update: task_id={task_id}, status={status_update.get('status')}")


async def send_status_to_client(sid: str, status_update: dict) -> None:
    """Send a status update to a specific client."""
    await sio.emit("song_status", status_update, to=sid)


# Socket.IO event handlers
@sio.event
async def connect(sid: str, environ: dict, auth: Optional[dict] = None):
    """
    Handle new client connections.
    
    Authentication can be provided via the 'auth' parameter during connection.
    Full authentication is verified when client subscribes to a task.
    
    Requirements: FR-4, Task 16.2
    """
    logger.info(f"Client connecting: sid={sid}")
    
    # If auth token provided during connection, verify it
    if auth and auth.get("token"):
        user_id = await verify_websocket_token(auth["token"])
        if user_id:
            manager.session_users[sid] = user_id
            logger.info(f"Client authenticated on connect: sid={sid}, user_id={user_id[:8]}...")
    
    return True


@sio.event
async def disconnect(sid: str):
    """Handle client disconnections."""
    logger.info(f"Client disconnected: sid={sid}")
    manager.remove_connection(sid)


@sio.event
async def subscribe(sid: str, data: dict):
    """
    Handle task subscription requests.
    
    Expected data format:
    {
        "task_id": "string",
        "token": "firebase_auth_token"
    }
    
    Requirements: FR-4, Task 16.2
    """
    task_id = data.get("task_id")
    token = data.get("token")
    
    if not task_id:
        await sio.emit("error", {"message": "task_id is required"}, to=sid)
        return
    
    logger.info(f"Subscribe request: sid={sid}, task_id={task_id}")
    
    # Verify authentication
    user_id = manager.get_user_for_session(sid)
    
    if not user_id and token:
        user_id = await verify_websocket_token(token)
    
    if not user_id:
        logger.warning(f"Subscription rejected - invalid token: sid={sid}")
        await sio.emit("error", {
            "message": "Authentication required",
            "code": "AUTH_REQUIRED"
        }, to=sid)
        return
    
    # Verify task ownership
    owns_task = await verify_task_ownership(task_id, user_id)
    if not owns_task:
        logger.warning(f"Subscription rejected - not task owner: sid={sid}, task_id={task_id}")
        await sio.emit("error", {
            "message": "You do not have permission to access this task",
            "code": "FORBIDDEN"
        }, to=sid)
        return
    
    # Add connection to manager
    manager.add_connection(task_id, sid, user_id)
    
    # Join a room for this task
    await sio.enter_room(sid, f"task:{task_id}")
    
    # Acknowledge subscription
    await sio.emit("subscribed", {
        "task_id": task_id,
        "message": "Successfully subscribed to task updates"
    }, to=sid)
    
    # Get current task status and send to client
    task_data = await get_task_from_firestore(task_id)
    if task_data:
        current_status = {
            "task_id": task_id,
            "status": task_data.get("status", GenerationStatus.QUEUED.value),
            "progress": task_data.get("progress", 0),
            "song_url": task_data.get("song_url"),
            "error": task_data.get("error"),
        }
        await send_status_to_client(sid, current_status)
        
        # Start polling if task is not in terminal state and no polling is active
        status = task_data.get("status")
        if status not in [GenerationStatus.COMPLETED.value, GenerationStatus.FAILED.value]:
            existing_polling = manager.get_polling_task(task_id)
            if not existing_polling or existing_polling.done():
                polling_task = asyncio.create_task(poll_and_broadcast(task_id))
                manager.set_polling_task(task_id, polling_task)
                logger.info(f"Started polling for task: {task_id}")


@sio.event
async def unsubscribe(sid: str, data: dict):
    """
    Handle task unsubscription requests.
    
    Expected data format:
    {
        "task_id": "string"
    }
    """
    task_id = data.get("task_id")
    
    if task_id:
        await sio.leave_room(sid, f"task:{task_id}")
        logger.info(f"Unsubscribe: sid={sid}, task_id={task_id}")


# Utility functions for external use
def get_socket_app():
    """Get the Socket.IO ASGI app for mounting to FastAPI."""
    return socket_app


def get_sio():
    """Get the Socket.IO server instance."""
    return sio


def get_manager():
    """Get the connection manager instance."""
    return manager


async def notify_task_update(task_id: str, status_update: dict) -> None:
    """
    Notify connected clients of a task update.
    
    This function can be called from other parts of the application
    (e.g., after creating a task) to notify clients.
    
    Args:
        task_id: The task ID
        status_update: Status update dictionary
    """
    if manager.has_active_connections(task_id):
        await broadcast_status_update(task_id, status_update)
