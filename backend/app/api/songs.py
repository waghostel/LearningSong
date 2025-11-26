"""
API endpoints for song generation.

This module provides REST API endpoints for generating songs from lyrics
using the Suno API and tracking song generation status.
"""

import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.models.songs import (
    GenerateSongRequest,
    GenerateSongResponse,
    SongStatusUpdate,
    GenerationStatus,
)
from app.core.auth import get_current_user
from app.services.cache import check_song_cache
from app.services.rate_limiter import check_rate_limit, increment_usage
from app.services.suno_client import (
    SunoClient,
    SunoAPIError,
    SunoRateLimitError,
    SunoAuthenticationError,
    SunoValidationError,
)
from app.services.song_storage import (
    store_song_task,
    get_task_from_firestore,
    update_task_status,
)


# Configure logging
logger = logging.getLogger(__name__)

# Create router with prefix and tags for API documentation
router = APIRouter(
    prefix="/api/songs",
    tags=["songs"]
)


@router.get("/health")
async def songs_health():
    """Health check endpoint for songs service."""
    return {"status": "healthy", "service": "songs"}





@router.post("/generate", response_model=GenerateSongResponse)
async def generate_song(
    request: GenerateSongRequest,
    user_id: str = Depends(get_current_user)
) -> GenerateSongResponse:
    """
    Generate a song from lyrics using the Suno API.
    
    This endpoint:
    1. Validates the user's rate limit
    2. Checks the cache for existing songs with same content and style
    3. Calls Suno API to create a new song generation task if cache miss
    4. Stores the task in Firestore for tracking
    5. Increments the user's usage counter
    
    Args:
        request: Song generation request with lyrics and style
        user_id: Authenticated user ID from Firebase token
        
    Returns:
        GenerateSongResponse with task_id and estimated_time
        
    Raises:
        HTTPException: 429 if rate limit exceeded
        HTTPException: 400 if lyrics validation fails
        HTTPException: 500 if Suno API call fails
        HTTPException: 503 if Suno API is unavailable
        
    Requirements: FR-3, FR-6
    """
    logger.info(
        f"Song generation request from user: {user_id[:8]}...",
        extra={
            'extra_fields': {
                'user_id': user_id,
                'style': request.style.value,
                'lyrics_length': len(request.lyrics),
                'has_content_hash': request.content_hash is not None,
                'operation': 'generate_song'
            }
        }
    )
    
    # Step 1: Check rate limit
    try:
        await check_rate_limit(user_id)
    except HTTPException:
        logger.warning(
            f"Rate limit exceeded for user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'rate_limit_exceeded': True
                }
            }
        )
        raise
    
    # Step 2: Check cache if content_hash is provided
    if request.content_hash:
        try:
            cached_result = await check_song_cache(
                request.content_hash,
                request.style.value
            )
            
            if cached_result:
                logger.info(
                    f"Cache hit for song generation",
                    extra={
                        'extra_fields': {
                            'user_id': user_id,
                            'content_hash': request.content_hash,
                            'style': request.style.value,
                            'cache_hit': True,
                            'task_id': cached_result['task_id']
                        }
                    }
                )
                return GenerateSongResponse(
                    task_id=cached_result['task_id'],
                    estimated_time=0  # Instant from cache
                )
        except Exception as e:
            # Log cache error but continue with generation
            logger.warning(
                f"Cache check failed, continuing with generation: {e}",
                extra={
                    'extra_fields': {
                        'user_id': user_id,
                        'content_hash': request.content_hash,
                        'cache_error': str(e)
                    }
                }
            )
    
    # Step 3: Call Suno API to create song generation task
    suno_api_key = os.getenv("SUNO_API_KEY")
    if not suno_api_key:
        logger.error(
            "SUNO_API_KEY not configured",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'error': 'missing_api_key'
                }
            }
        )
        raise HTTPException(
            status_code=503,
            detail={
                'error': 'Service unavailable',
                'message': 'Song generation service is not configured. Please try again later.'
            }
        )
    
    suno_base_url = os.getenv("SUNO_API_URL", "https://api.sunoapi.org")
    
    try:
        async with SunoClient(api_key=suno_api_key, base_url=suno_base_url) as suno_client:
            task = await suno_client.create_song(
                lyrics=request.lyrics,
                style=request.style.value,
                title="Learning Song"
            )
            
            logger.info(
                f"Suno task created: {task.task_id}",
                extra={
                    'extra_fields': {
                        'user_id': user_id,
                        'task_id': task.task_id,
                        'estimated_time': task.estimated_time,
                        'style': request.style.value
                    }
                }
            )
    
    except SunoValidationError as e:
        logger.warning(
            f"Suno validation error: {e}",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'error_type': 'validation',
                    'error_message': str(e)
                }
            }
        )
        raise HTTPException(
            status_code=400,
            detail={
                'error': 'Invalid lyrics',
                'message': str(e)
            }
        )
    
    except SunoRateLimitError as e:
        logger.warning(
            f"Suno rate limit exceeded: {e}",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'error_type': 'rate_limit',
                    'error_message': str(e)
                }
            }
        )
        raise HTTPException(
            status_code=503,
            detail={
                'error': 'Service busy',
                'message': 'Song generation service is currently busy. Please try again in a few minutes.'
            }
        )
    
    except SunoAuthenticationError as e:
        logger.error(
            f"Suno authentication error: {e}",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'error_type': 'authentication',
                    'error_message': str(e)
                }
            }
        )
        raise HTTPException(
            status_code=503,
            detail={
                'error': 'Service unavailable',
                'message': 'Song generation service is temporarily unavailable. Please try again later.'
            }
        )
    
    except SunoAPIError as e:
        logger.error(
            f"Suno API error: {e}",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'error_type': 'api_error',
                    'error_message': str(e),
                    'status_code': e.status_code
                }
            }
        )
        raise HTTPException(
            status_code=500,
            detail={
                'error': 'Generation failed',
                'message': 'Failed to start song generation. Please try again.'
            }
        )
    
    except Exception as e:
        logger.error(
            f"Unexpected error during song generation: {e}",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'error_type': 'unexpected',
                    'error_message': str(e)
                }
            }
        )
        raise HTTPException(
            status_code=500,
            detail={
                'error': 'Internal error',
                'message': 'An unexpected error occurred. Please try again.'
            }
        )
    
    # Step 4: Store task in Firestore
    try:
        await store_song_task(user_id, task.task_id, request)
    except Exception as e:
        # Log error but don't fail the request - task was created successfully
        logger.error(
            f"Failed to store song task: {e}",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'task_id': task.task_id,
                    'error': str(e)
                }
            }
        )
    
    # Step 5: Increment usage counter
    try:
        await increment_usage(user_id)
        logger.info(
            f"Usage incremented for user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'task_id': task.task_id
                }
            }
        )
    except Exception as e:
        # Log error but don't fail the request - task was created successfully
        logger.error(
            f"Failed to increment usage: {e}",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'task_id': task.task_id,
                    'error': str(e)
                }
            }
        )
    
    return GenerateSongResponse(
        task_id=task.task_id,
        estimated_time=task.estimated_time
    )





def _map_suno_status_to_generation_status(suno_status: str) -> GenerationStatus:
    """
    Map Suno API status to GenerationStatus enum.
    
    Args:
        suno_status: Status string from Suno API
        
    Returns:
        Corresponding GenerationStatus enum value
    """
    status_mapping = {
        'PENDING': GenerationStatus.QUEUED,
        'TEXT_SUCCESS': GenerationStatus.PROCESSING,
        'FIRST_SUCCESS': GenerationStatus.PROCESSING,
        'GENERATING': GenerationStatus.PROCESSING,
        'SUCCESS': GenerationStatus.COMPLETED,
        'FAILED': GenerationStatus.FAILED,
        'CREATE_TASK_FAILED': GenerationStatus.FAILED,
        'GENERATE_AUDIO_FAILED': GenerationStatus.FAILED,
        'CALLBACK_EXCEPTION': GenerationStatus.FAILED,
        'SENSITIVE_WORD_ERROR': GenerationStatus.FAILED,
    }
    return status_mapping.get(suno_status, GenerationStatus.QUEUED)


@router.get("/{task_id}", response_model=SongStatusUpdate)
async def get_song_status(
    task_id: str,
    user_id: str = Depends(get_current_user)
) -> SongStatusUpdate:
    """
    Get the status of a song generation task.
    
    This endpoint:
    1. Verifies the task belongs to the authenticated user
    2. Queries Firestore for task data
    3. Calls Suno API to get current status
    4. Updates Firestore with latest status
    5. Returns the current status
    
    Args:
        task_id: The song generation task ID
        user_id: Authenticated user ID from Firebase token
        
    Returns:
        SongStatusUpdate with current status, progress, and song URL if complete
        
    Raises:
        HTTPException: 404 if task not found
        HTTPException: 403 if task doesn't belong to user
        HTTPException: 500 if Suno API call fails
        HTTPException: 503 if Suno API is unavailable
        
    Requirements: FR-3
    """
    logger.info(
        f"Song status request for task: {task_id}",
        extra={
            'extra_fields': {
                'user_id': user_id,
                'task_id': task_id,
                'operation': 'get_song_status'
            }
        }
    )
    
    # Step 1: Query Firestore for task data
    try:
        task_data = await get_task_from_firestore(task_id)
    except Exception as e:
        logger.error(
            f"Failed to query Firestore for task: {task_id}",
            extra={
                'extra_fields': {
                    'task_id': task_id,
                    'error': str(e),
                    'operation': 'get_song_status'
                }
            }
        )
        raise HTTPException(
            status_code=500,
            detail={
                'error': 'Internal error',
                'message': 'Failed to retrieve task data. Please try again.'
            }
        )
    
    # Step 2: Check if task exists
    if task_data is None:
        logger.warning(
            f"Task not found: {task_id}",
            extra={
                'extra_fields': {
                    'task_id': task_id,
                    'user_id': user_id,
                    'operation': 'get_song_status'
                }
            }
        )
        raise HTTPException(
            status_code=404,
            detail={
                'error': 'Task not found',
                'message': 'The requested song generation task was not found.'
            }
        )
    
    # Step 3: Verify task belongs to authenticated user
    if task_data.get('user_id') != user_id:
        logger.warning(
            f"Unauthorized access attempt to task: {task_id}",
            extra={
                'extra_fields': {
                    'task_id': task_id,
                    'requesting_user': user_id,
                    'task_owner': task_data.get('user_id'),
                    'operation': 'get_song_status'
                }
            }
        )
        raise HTTPException(
            status_code=403,
            detail={
                'error': 'Forbidden',
                'message': 'You do not have permission to access this task.'
            }
        )
    
    # Step 4: Check if task is already in a terminal state
    current_status = task_data.get('status')
    if current_status in [GenerationStatus.COMPLETED.value, GenerationStatus.FAILED.value]:
        # Return cached status without calling Suno API
        logger.info(
            f"Returning cached status for completed/failed task: {task_id}",
            extra={
                'extra_fields': {
                    'task_id': task_id,
                    'status': current_status,
                    'operation': 'get_song_status'
                }
            }
        )
        return SongStatusUpdate(
            task_id=task_id,
            status=GenerationStatus(current_status),
            progress=task_data.get('progress', 0),
            song_url=task_data.get('song_url'),
            error=task_data.get('error'),
        )
    
    # Step 5: Call Suno API to get current status
    suno_api_key = os.getenv("SUNO_API_KEY")
    if not suno_api_key:
        logger.error(
            "SUNO_API_KEY not configured",
            extra={
                'extra_fields': {
                    'task_id': task_id,
                    'error': 'missing_api_key'
                }
            }
        )
        raise HTTPException(
            status_code=503,
            detail={
                'error': 'Service unavailable',
                'message': 'Song generation service is not configured. Please try again later.'
            }
        )
    
    suno_base_url = os.getenv("SUNO_API_URL", "https://api.sunoapi.org")
    
    try:
        async with SunoClient(api_key=suno_api_key, base_url=suno_base_url) as suno_client:
            suno_status = await suno_client.get_task_status(task_id)
            
            logger.info(
                f"Suno status retrieved for task: {task_id}",
                extra={
                    'extra_fields': {
                        'task_id': task_id,
                        'suno_status': suno_status.status,
                        'progress': suno_status.progress,
                        'has_song_url': suno_status.song_url is not None,
                        'operation': 'get_song_status'
                    }
                }
            )
    
    except SunoAPIError as e:
        logger.error(
            f"Suno API error while getting status: {e}",
            extra={
                'extra_fields': {
                    'task_id': task_id,
                    'error_type': 'suno_api_error',
                    'error_message': str(e),
                    'status_code': e.status_code
                }
            }
        )
        # Return cached status if Suno API fails
        return SongStatusUpdate(
            task_id=task_id,
            status=GenerationStatus(current_status) if current_status else GenerationStatus.QUEUED,
            progress=task_data.get('progress', 0),
            song_url=task_data.get('song_url'),
            error=task_data.get('error'),
        )
    
    except Exception as e:
        logger.error(
            f"Unexpected error while getting Suno status: {e}",
            extra={
                'extra_fields': {
                    'task_id': task_id,
                    'error_type': 'unexpected',
                    'error_message': str(e)
                }
            }
        )
        # Return cached status if unexpected error
        return SongStatusUpdate(
            task_id=task_id,
            status=GenerationStatus(current_status) if current_status else GenerationStatus.QUEUED,
            progress=task_data.get('progress', 0),
            song_url=task_data.get('song_url'),
            error=task_data.get('error'),
        )
    
    # Step 6: Map Suno status to GenerationStatus
    generation_status = _map_suno_status_to_generation_status(suno_status.status)
    
    # Step 7: Update Firestore with latest status
    try:
        await update_task_status(
            task_id=task_id,
            status=generation_status.value,
            progress=suno_status.progress,
            song_url=suno_status.song_url,
            error=suno_status.error,
        )
    except Exception as e:
        # Log error but don't fail the request - we have the status
        logger.error(
            f"Failed to update task status in Firestore: {e}",
            extra={
                'extra_fields': {
                    'task_id': task_id,
                    'error': str(e),
                    'operation': 'update_task_status'
                }
            }
        )
    
    # Step 8: Return status update
    return SongStatusUpdate(
        task_id=task_id,
        status=generation_status,
        progress=suno_status.progress,
        song_url=suno_status.song_url,
        error=suno_status.error,
    )
