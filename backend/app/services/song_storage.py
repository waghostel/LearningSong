"""
Song storage service for Firestore operations.

This module provides helper functions for storing, retrieving, and managing
song generation tasks in Firestore with 48-hour TTL for anonymous users.

Requirements: FR-3, Task 17
"""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.firebase import get_firestore_client
from app.models.songs import GenerateSongRequest, GenerationStatus


# Configure logging
logger = logging.getLogger(__name__)

# Collection name for songs
SONGS_COLLECTION = "songs"

# Collection name for share links
SHARE_LINKS_COLLECTION = "share_links"

# TTL for anonymous user data (48 hours)
ANONYMOUS_TTL_HOURS = 48

# TTL for share links (48 hours)
SHARE_LINK_TTL_HOURS = 48


async def store_song_task(
    user_id: str,
    task_id: str,
    request: GenerateSongRequest,
    variations: Optional[list[dict]] = None,
) -> dict:
    """
    Store a song generation task in Firestore.
    
    Creates a document in the 'songs' collection to track the task status
    and allow recovery after page refresh.
    
    Args:
        user_id: Firebase user ID
        task_id: Suno task ID
        request: Original song generation request
        variations: Optional list of song variations (Requirements: 1.2, 7.3)
        
    Returns:
        dict: The stored task document data
        
    Requirements: FR-3, 1.2, 7.3
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
        "song_url": None,  # Deprecated: kept for backward compatibility
        "error": None,
        "created_at": current_time,
        "updated_at": current_time,
        "expires_at": expires_at,
        "variations": variations or [],  # New field for dual songs
        "primary_variation_index": 0,  # Default to first variation (Requirements: 1.3)
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
                "variations_count": len(variations) if variations else 0,
                "operation": "store_song_task",
            }
        },
    )
    
    return task_doc


async def get_task_from_firestore(task_id: str) -> Optional[dict]:
    """
    Retrieve a song generation task from Firestore.
    
    Implements backward compatibility: if variations field is missing,
    migrates old song_url to variations[0] on read.
    
    Args:
        task_id: The Suno task ID
        
    Returns:
        Task document data if found, None otherwise
        
    Requirements: FR-3, 1.4
    """
    firestore_client = get_firestore_client()
    
    task_ref = firestore_client.collection(SONGS_COLLECTION).document(task_id)
    task_doc = task_ref.get()
    
    if not task_doc.exists:
        logger.debug(f"Task not found in Firestore: {task_id}")
        return None
    
    task_data = task_doc.to_dict()
    
    # Backward compatibility: migrate old schema to new schema (Requirements: 1.4)
    if "variations" not in task_data or not task_data["variations"]:
        song_url = task_data.get("song_url")
        audio_id = task_data.get("audio_id")
        
        if song_url and audio_id:
            # Migrate to new schema
            task_data["variations"] = [
                {
                    "audio_url": song_url,
                    "audio_id": audio_id,
                    "variation_index": 0,
                }
            ]
            task_data["primary_variation_index"] = 0
            
            logger.info(
                f"Migrated old song schema to variations: {task_id}",
                extra={
                    "extra_fields": {
                        "task_id": task_id,
                        "operation": "get_task_from_firestore",
                    }
                },
            )
        else:
            # No song data yet
            task_data["variations"] = []
            task_data["primary_variation_index"] = 0
    
    # Ensure primary_variation_index exists
    if "primary_variation_index" not in task_data:
        task_data["primary_variation_index"] = 0
    
    return task_data


async def update_task_status(
    task_id: str,
    status: str,
    progress: int,
    song_url: Optional[str] = None,
    error: Optional[str] = None,
    aligned_words: Optional[list[dict]] = None,
    waveform_data: Optional[list[float]] = None,
    variations: Optional[list[dict]] = None,
) -> bool:
    """
    Update a song generation task status in Firestore.
    
    Args:
        task_id: The Suno task ID
        status: New status value
        progress: Progress percentage (0-100)
        song_url: URL of generated song (if completed) - deprecated
        error: Error message (if failed)
        aligned_words: Array of aligned words with timing information (Requirements: 2.2)
        waveform_data: Waveform data for visualization (Requirements: 2.2)
        variations: Array of song variations (Requirements: 1.2, 7.3)
        
    Returns:
        bool: True if update successful, False otherwise
        
    Requirements: FR-3, 2.2, 1.2, 7.3
    """
    firestore_client = get_firestore_client()
    
    update_data = {
        "status": status,
        "progress": progress,
        "updated_at": datetime.now(timezone.utc),
    }
    
    # Handle variations (Requirements: 1.2, 7.3)
    if variations is not None:
        update_data["variations"] = variations
        logger.info(
            f"Storing {len(variations)} variations for task: {task_id}",
            extra={
                "extra_fields": {
                    "task_id": task_id,
                    "variations_count": len(variations),
                    "variation_indices": [v.get("variation_index") for v in variations],
                    "operation": "update_task_status",
                }
            },
        )
        # Set song_url to first variation for backward compatibility
        if variations and len(variations) > 0:
            update_data["song_url"] = variations[0].get("audio_url")
    elif song_url is not None:
        # Backward compatibility: if only song_url provided
        update_data["song_url"] = song_url
    
    if error is not None:
        update_data["error"] = error
    
    # Add timestamped lyrics data if provided (Requirements: 2.2)
    if aligned_words is not None:
        update_data["aligned_words"] = aligned_words
        update_data["has_timestamps"] = len(aligned_words) > 0
    
    if waveform_data is not None:
        update_data["waveform_data"] = waveform_data
    
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
                    "has_timestamps": aligned_words is not None and len(aligned_words) > 0,
                    "variations_count": len(variations) if variations else 0,
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


async def store_timestamped_lyrics(
    task_id: str,
    aligned_words: list[dict],
    waveform_data: Optional[list[float]] = None,
) -> bool:
    """
    Store timestamped lyrics data for a song.
    
    This function updates an existing song document with timestamped lyrics
    data fetched from the Suno API.
    
    Args:
        task_id: The Suno task ID
        aligned_words: Array of aligned words with timing information
            Each word should have: word, startS, endS, success, palign
        waveform_data: Optional waveform data for visualization
        
    Returns:
        bool: True if storage successful, False otherwise
        
    Requirements: 2.2, 2.3
    """
    firestore_client = get_firestore_client()
    
    update_data = {
        "aligned_words": aligned_words,
        "has_timestamps": len(aligned_words) > 0,
        "updated_at": datetime.now(timezone.utc),
    }
    
    if waveform_data is not None:
        update_data["waveform_data"] = waveform_data
    
    try:
        task_ref = firestore_client.collection(SONGS_COLLECTION).document(task_id)
        task_ref.update(update_data)
        
        logger.info(
            f"Timestamped lyrics stored: {task_id}",
            extra={
                "extra_fields": {
                    "task_id": task_id,
                    "aligned_words_count": len(aligned_words),
                    "has_waveform": waveform_data is not None,
                    "operation": "store_timestamped_lyrics",
                }
            },
        )
        return True
    except Exception as e:
        logger.error(
            f"Failed to store timestamped lyrics: {task_id}",
            extra={
                "extra_fields": {
                    "task_id": task_id,
                    "error": str(e),
                    "operation": "store_timestamped_lyrics",
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


async def update_primary_variation(
    task_id: str,
    variation_index: int,
) -> bool:
    """
    Update the user's primary song variation selection.
    
    Args:
        task_id: The Suno task ID
        variation_index: Index of the variation to set as primary (0 or 1)
        
    Returns:
        bool: True if update successful, False otherwise
        
    Requirements: 4.1, 7.5
    """
    if variation_index not in (0, 1):
        logger.error(
            f"Invalid variation_index: {variation_index}",
            extra={
                "extra_fields": {
                    "task_id": task_id,
                    "variation_index": variation_index,
                    "operation": "update_primary_variation",
                }
            },
        )
        return False
    
    firestore_client = get_firestore_client()
    
    try:
        task_ref = firestore_client.collection(SONGS_COLLECTION).document(task_id)
        task_ref.update({
            "primary_variation_index": variation_index,
            "updated_at": datetime.now(timezone.utc),
        })
        
        logger.info(
            f"Primary variation updated: {task_id}",
            extra={
                "extra_fields": {
                    "task_id": task_id,
                    "variation_index": variation_index,
                    "operation": "update_primary_variation",
                }
            },
        )
        return True
    except Exception as e:
        logger.error(
            f"Failed to update primary variation: {task_id}",
            extra={
                "extra_fields": {
                    "task_id": task_id,
                    "variation_index": variation_index,
                    "error": str(e),
                    "operation": "update_primary_variation",
                }
            },
        )
        return False


# ============================================================================
# Share Link Functions
# Requirements: 5.1, 5.3, 5.4
# ============================================================================


async def create_share_link(song_id: str, user_id: str) -> dict:
    """
    Create a shareable link for a song.
    
    Generates a unique token and stores the share link in Firestore
    with a 48-hour expiration.
    
    Args:
        song_id: The song/task ID to share
        user_id: Firebase user ID who is creating the share
        
    Returns:
        dict: Share link data including share_token, song_id, expires_at
        
    Requirements: 5.1
    """
    firestore_client = get_firestore_client()
    
    # Generate a unique share token (URL-safe)
    share_token = secrets.token_urlsafe(32)
    
    current_time = datetime.now(timezone.utc)
    expires_at = current_time + timedelta(hours=SHARE_LINK_TTL_HOURS)
    
    share_doc = {
        "share_token": share_token,
        "song_id": song_id,
        "created_by": user_id,
        "created_at": current_time,
        "expires_at": expires_at,
    }
    
    # Store share link document using share_token as document ID
    share_ref = firestore_client.collection(SHARE_LINKS_COLLECTION).document(share_token)
    share_ref.set(share_doc)
    
    logger.info(
        f"Share link created for song: {song_id}",
        extra={
            "extra_fields": {
                "song_id": song_id,
                "user_id": user_id,
                "share_token": share_token[:8] + "...",
                "expires_at": expires_at.isoformat(),
                "operation": "create_share_link",
            }
        },
    )
    
    return share_doc


async def get_song_by_share_token(share_token: str) -> Optional[dict]:
    """
    Retrieve song data via share token.
    
    Looks up the share link, validates it hasn't expired, and returns
    the associated song data.
    
    Args:
        share_token: The unique share token
        
    Returns:
        dict: Song data if found and valid, None if share link not found
        
    Raises:
        ValueError: If share link has expired
        
    Requirements: 5.3, 5.4
    """
    firestore_client = get_firestore_client()
    
    # Look up share link
    share_ref = firestore_client.collection(SHARE_LINKS_COLLECTION).document(share_token)
    share_doc = share_ref.get()
    
    if not share_doc.exists:
        logger.debug(f"Share link not found: {share_token[:8]}...")
        return None
    
    share_data = share_doc.to_dict()
    
    # Check if share link has expired
    expires_at = share_data.get("expires_at")
    if expires_at:
        # Handle both datetime objects and Firestore timestamps
        if hasattr(expires_at, "timestamp"):
            expires_at_dt = datetime.fromtimestamp(expires_at.timestamp(), tz=timezone.utc)
        elif isinstance(expires_at, datetime):
            expires_at_dt = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at_dt = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
        
        if datetime.now(timezone.utc) > expires_at_dt:
            logger.info(
                f"Share link expired: {share_token[:8]}...",
                extra={
                    "extra_fields": {
                        "share_token": share_token[:8] + "...",
                        "expires_at": expires_at_dt.isoformat(),
                        "operation": "get_song_by_share_token",
                    }
                },
            )
            raise ValueError("Share link has expired")
    
    # Get the associated song
    song_id = share_data.get("song_id")
    song_data = await get_task_from_firestore(song_id)
    
    if song_data is None:
        logger.warning(
            f"Song not found for share link: {share_token[:8]}...",
            extra={
                "extra_fields": {
                    "share_token": share_token[:8] + "...",
                    "song_id": song_id,
                    "operation": "get_song_by_share_token",
                }
            },
        )
        return None
    
    logger.info(
        f"Song retrieved via share link: {song_id}",
        extra={
            "extra_fields": {
                "share_token": share_token[:8] + "...",
                "song_id": song_id,
                "operation": "get_song_by_share_token",
            }
        },
    )
    
    return song_data


async def validate_share_link(share_token: str) -> bool:
    """
    Validate that a share link exists and has not expired.
    
    Args:
        share_token: The unique share token to validate
        
    Returns:
        bool: True if share link is valid, False otherwise
        
    Requirements: 5.4
    """
    firestore_client = get_firestore_client()
    
    # Look up share link
    share_ref = firestore_client.collection(SHARE_LINKS_COLLECTION).document(share_token)
    share_doc = share_ref.get()
    
    if not share_doc.exists:
        logger.debug(f"Share link not found for validation: {share_token[:8]}...")
        return False
    
    share_data = share_doc.to_dict()
    
    # Check expiration
    expires_at = share_data.get("expires_at")
    if expires_at:
        # Handle both datetime objects and Firestore timestamps
        if hasattr(expires_at, "timestamp"):
            expires_at_dt = datetime.fromtimestamp(expires_at.timestamp(), tz=timezone.utc)
        elif isinstance(expires_at, datetime):
            expires_at_dt = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at_dt = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
        
        if datetime.now(timezone.utc) > expires_at_dt:
            logger.debug(f"Share link expired during validation: {share_token[:8]}...")
            return False
    
    return True
