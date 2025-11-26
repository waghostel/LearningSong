"""
Song storage service for Firestore operations.

This module provides helper functions for storing, retrieving, and managing
song generation tasks in Firestore with 48-hour TTL for anonymous users.

Requirements: FR-3, Task 17
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.firebase import get_firestore_client
from app.models.songs import GenerateSongRequest, GenerationStatus


# Configure logging
logger = logging.getLogger(__name__)

# Collection name for songs
SONGS_COLLECTION = "songs"

# TTL for anonymous user data (48 hours)
ANONYMOUS_TTL_HOURS = 48


async def store_song_task(
    user_id: str,
    task_id: str,
    request: GenerateSongRequest,
) -> dict:
    """
    Store a song generation task in Firestore.
    
    Creates a document in the 'songs' collection to track the task status
    and allow recovery after page refresh.
    
    Args:
        user_id: Firebase user ID
        task_id: Suno task ID
        request: Original song generation request
        
    Returns:
        dict: The stored task document data
        
    Requirements: FR-3
    """
    firestore_client = get_firestore_client()
    
    current_time = datetime.now(timezone.utc)
    expires_at = current_time + timedelta(hours=ANONYMOUS_TTL_HOURS)
    
    task_doc = {
        "user_id": user_id,
        "task_id": task_id,
        "content_hash": request.content_hash,
        "lyrics": request.lyrics,
        "style": request.style.value,
        "status": GenerationStatus.QUEUED.value,
        "progress": 0,
        "song_url": None,
        "error": None,
        "created_at": current_time,
        "updated_at": current_time,
        "expires_at": expires_at,
    }
    
    songs_ref = firestore_client.collection(SONGS_COLLECTION).document(task_id)
    songs_ref.set(task_doc)
    
    logger.info(
        f"Song task stored: {task_id}",
        extra={
            "extra_fields": {
                "user_id": user_id,
                "task_id": task_id,
                "style": request.style.value,
                "lyrics_length": len(request.lyrics),
                "expires_at": expires_at.isoformat(),
                "operation": "store_song_task",
            }
        },
    )
    
    return task_doc


async def get_task_from_firestore(task_id: str) -> Optional[dict]:
    """
    Retrieve a song generation task from Firestore.
    
    Args:
        task_id: The Suno task ID
        
    Returns:
        Task document data if found, None otherwise
        
    Requirements: FR-3
    """
    firestore_client = get_firestore_client()
    
    task_ref = firestore_client.collection(SONGS_COLLECTION).document(task_id)
    task_doc = task_ref.get()
    
    if not task_doc.exists:
        logger.debug(f"Task not found in Firestore: {task_id}")
        return None
    
    return task_doc.to_dict()


async def update_task_status(
    task_id: str,
    status: str,
    progress: int,
    song_url: Optional[str] = None,
    error: Optional[str] = None,
) -> bool:
    """
    Update a song generation task status in Firestore.
    
    Args:
        task_id: The Suno task ID
        status: New status value
        progress: Progress percentage (0-100)
        song_url: URL of generated song (if completed)
        error: Error message (if failed)
        
    Returns:
        bool: True if update successful, False otherwise
        
    Requirements: FR-3
    """
    firestore_client = get_firestore_client()
    
    update_data = {
        "status": status,
        "progress": progress,
        "updated_at": datetime.now(timezone.utc),
    }
    
    if song_url is not None:
        update_data["song_url"] = song_url
    
    if error is not None:
        update_data["error"] = error
    
    try:
        task_ref = firestore_client.collection(SONGS_COLLECTION).document(task_id)
        task_ref.update(update_data)
        
        logger.info(
            f"Task status updated: {task_id}",
            extra={
                "extra_fields": {
                    "task_id": task_id,
                    "status": status,
                    "progress": progress,
                    "has_song_url": song_url is not None,
                    "has_error": error is not None,
                    "operation": "update_task_status",
                }
            },
        )
        return True
    except Exception as e:
        logger.error(
            f"Failed to update task status: {task_id}",
            extra={
                "extra_fields": {
                    "task_id": task_id,
                    "error": str(e),
                    "operation": "update_task_status",
                }
            },
        )
        return False


async def get_user_tasks(user_id: str, limit: int = 10) -> list[dict]:
    """
    Get all song tasks for a user.
    
    Args:
        user_id: Firebase user ID
        limit: Maximum number of tasks to return
        
    Returns:
        List of task documents ordered by creation time (newest first)
        
    Requirements: FR-3
    """
    firestore_client = get_firestore_client()
    
    tasks_ref = (
        firestore_client.collection(SONGS_COLLECTION)
        .where("user_id", "==", user_id)
        .order_by("created_at", direction="DESCENDING")
        .limit(limit)
    )
    
    tasks = []
    for doc in tasks_ref.stream():
        tasks.append(doc.to_dict())
    
    return tasks


async def verify_task_ownership(task_id: str, user_id: str) -> bool:
    """
    Verify that a task belongs to a specific user.
    
    Args:
        task_id: The Suno task ID
        user_id: Firebase user ID to verify ownership
        
    Returns:
        bool: True if task belongs to user, False otherwise
        
    Requirements: FR-3
    """
    task_data = await get_task_from_firestore(task_id)
    
    if task_data is None:
        return False
    
    return task_data.get("user_id") == user_id


async def cleanup_expired_tasks() -> int:
    """
    Delete expired song tasks from Firestore.
    
    This function removes all tasks where expires_at is in the past.
    Should be called periodically (e.g., via a scheduled Cloud Function).
    
    Returns:
        int: Number of tasks deleted
        
    Requirements: Task 17.2 (TTL cleanup)
    """
    firestore_client = get_firestore_client()
    
    current_time = datetime.now(timezone.utc)
    
    # Query for expired tasks
    expired_ref = (
        firestore_client.collection(SONGS_COLLECTION)
        .where("expires_at", "<", current_time)
        .limit(500)  # Process in batches
    )
    
    deleted_count = 0
    batch = firestore_client.batch()
    
    for doc in expired_ref.stream():
        batch.delete(doc.reference)
        deleted_count += 1
    
    if deleted_count > 0:
        batch.commit()
        logger.info(
            f"Cleaned up {deleted_count} expired song tasks",
            extra={
                "extra_fields": {
                    "deleted_count": deleted_count,
                    "operation": "cleanup_expired_tasks",
                }
            },
        )
    
    return deleted_count


async def extend_task_ttl(task_id: str, hours: int = ANONYMOUS_TTL_HOURS) -> bool:
    """
    Extend the TTL of a task.
    
    Useful when a user interacts with their song to prevent premature deletion.
    
    Args:
        task_id: The Suno task ID
        hours: Number of hours to extend from now
        
    Returns:
        bool: True if extension successful, False otherwise
    """
    firestore_client = get_firestore_client()
    
    new_expires_at = datetime.now(timezone.utc) + timedelta(hours=hours)
    
    try:
        task_ref = firestore_client.collection(SONGS_COLLECTION).document(task_id)
        task_ref.update({
            "expires_at": new_expires_at,
            "updated_at": datetime.now(timezone.utc),
        })
        
        logger.info(
            f"Task TTL extended: {task_id}",
            extra={
                "extra_fields": {
                    "task_id": task_id,
                    "new_expires_at": new_expires_at.isoformat(),
                    "operation": "extend_task_ttl",
                }
            },
        )
        return True
    except Exception as e:
        logger.error(
            f"Failed to extend task TTL: {task_id}",
            extra={
                "extra_fields": {
                    "task_id": task_id,
                    "error": str(e),
                    "operation": "extend_task_ttl",
                }
            },
        )
        return False
