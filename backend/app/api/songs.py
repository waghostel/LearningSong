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
    SongDetails,
    ShareLinkResponse,
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
    create_share_link,
    get_song_by_share_token,
    verify_task_ownership,
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


@router.get("/{song_id}/details", response_model=SongDetails)
async def get_song_details(
    song_id: str,
    user_id: str = Depends(get_current_user)
) -> SongDetails:
    """
    Get complete song details for playback page.
    
    This endpoint:
    1. Queries Firestore for the song by song_id
    2. Verifies user ownership or returns 403
    3. Checks expiration and returns 410 if expired
    4. Returns SongDetails with all required fields
    
    Args:
        song_id: The song/task ID
        user_id: Authenticated user ID from Firebase token
        
    Returns:
        SongDetails with song_url, lyrics, style, created_at, expires_at, is_owner
        
    Raises:
        HTTPException: 404 if song not found
        HTTPException: 403 if user doesn't own the song
        HTTPException: 410 if song has expired
        
    Requirements: 8.1, 8.2, 8.3
    """
    from datetime import datetime, timezone
    
    logger.info(
        f"Song details request for song: {song_id}",
        extra={
            'extra_fields': {
                'user_id': user_id,
                'song_id': song_id,
                'operation': 'get_song_details'
            }
        }
    )
    
    # Step 1: Query Firestore for song data
    try:
        song_data = await get_task_from_firestore(song_id)
    except Exception as e:
        logger.error(
            f"Failed to query Firestore for song: {song_id}",
            extra={
                'extra_fields': {
                    'song_id': song_id,
                    'error': str(e),
                    'operation': 'get_song_details'
                }
            }
        )
        raise HTTPException(
            status_code=500,
            detail={
                'error': 'Internal error',
                'message': 'Failed to retrieve song data. Please try again.'
            }
        )
    
    # Step 2: Check if song exists
    if song_data is None:
        logger.warning(
            f"Song not found: {song_id}",
            extra={
                'extra_fields': {
                    'song_id': song_id,
                    'user_id': user_id,
                    'operation': 'get_song_details'
                }
            }
        )
        raise HTTPException(
            status_code=404,
            detail={
                'error': 'Song not found',
                'message': 'The requested song could not be found.'
            }
        )
    
    # Step 3: Verify user ownership
    is_owner = song_data.get('user_id') == user_id
    if not is_owner:
        logger.warning(
            f"Unauthorized access attempt to song: {song_id}",
            extra={
                'extra_fields': {
                    'song_id': song_id,
                    'requesting_user': user_id,
                    'song_owner': song_data.get('user_id'),
                    'operation': 'get_song_details'
                }
            }
        )
        raise HTTPException(
            status_code=403,
            detail={
                'error': 'Forbidden',
                'message': 'You do not have permission to access this song.'
            }
        )
    
    # Step 4: Check if song has expired
    expires_at = song_data.get('expires_at')
    if expires_at:
        # Handle both datetime objects and Firestore timestamps
        if hasattr(expires_at, 'timestamp'):
            # Firestore timestamp
            expires_at_dt = datetime.fromtimestamp(expires_at.timestamp(), tz=timezone.utc)
        elif isinstance(expires_at, datetime):
            expires_at_dt = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at_dt = datetime.fromisoformat(str(expires_at).replace('Z', '+00:00'))
        
        if datetime.now(timezone.utc) > expires_at_dt:
            logger.info(
                f"Song has expired: {song_id}",
                extra={
                    'extra_fields': {
                        'song_id': song_id,
                        'expires_at': expires_at_dt.isoformat(),
                        'operation': 'get_song_details'
                    }
                }
            )
            raise HTTPException(
                status_code=410,
                detail={
                    'error': 'Song expired',
                    'message': 'This song has expired and is no longer available.'
                }
            )
    
    # Step 5: Check if song generation is complete
    song_url = song_data.get('song_url')
    if not song_url:
        logger.warning(
            f"Song not yet generated: {song_id}",
            extra={
                'extra_fields': {
                    'song_id': song_id,
                    'status': song_data.get('status'),
                    'operation': 'get_song_details'
                }
            }
        )
        raise HTTPException(
            status_code=404,
            detail={
                'error': 'Song not ready',
                'message': 'The song is still being generated. Please wait.'
            }
        )
    
    # Step 6: Parse datetime fields
    created_at = song_data.get('created_at')
    if hasattr(created_at, 'timestamp'):
        created_at_dt = datetime.fromtimestamp(created_at.timestamp(), tz=timezone.utc)
    elif isinstance(created_at, datetime):
        created_at_dt = created_at if created_at.tzinfo else created_at.replace(tzinfo=timezone.utc)
    else:
        created_at_dt = datetime.fromisoformat(str(created_at).replace('Z', '+00:00'))
    
    # Step 7: Return SongDetails
    from app.models.songs import MusicStyle
    
    return SongDetails(
        song_id=song_id,
        song_url=song_url,
        lyrics=song_data.get('lyrics', ''),
        style=MusicStyle(song_data.get('style', 'pop')),
        created_at=created_at_dt,
        expires_at=expires_at_dt,
        is_owner=is_owner,
    )


@router.post("/{song_id}/share", response_model=ShareLinkResponse)
async def create_song_share_link(
    song_id: str,
    user_id: str = Depends(get_current_user)
) -> ShareLinkResponse:
    """
    Generate a shareable link for a song.
    
    This endpoint:
    1. Verifies user owns the song
    2. Generates a unique share token
    3. Stores share link with 48-hour expiration
    4. Returns ShareLinkResponse with full URL
    
    Args:
        song_id: The song/task ID to share
        user_id: Authenticated user ID from Firebase token
        
    Returns:
        ShareLinkResponse with share_url, share_token, and expires_at
        
    Raises:
        HTTPException: 404 if song not found
        HTTPException: 403 if user doesn't own the song
        
    Requirements: 5.1, 5.2
    """
    logger.info(
        f"Share link request for song: {song_id}",
        extra={
            'extra_fields': {
                'user_id': user_id,
                'song_id': song_id,
                'operation': 'create_share_link'
            }
        }
    )
    
    # Step 1: Verify song exists
    try:
        song_data = await get_task_from_firestore(song_id)
    except Exception as e:
        logger.error(
            f"Failed to query Firestore for song: {song_id}",
            extra={
                'extra_fields': {
                    'song_id': song_id,
                    'error': str(e),
                    'operation': 'create_share_link'
                }
            }
        )
        raise HTTPException(
            status_code=500,
            detail={
                'error': 'Internal error',
                'message': 'Failed to retrieve song data. Please try again.'
            }
        )
    
    if song_data is None:
        logger.warning(
            f"Song not found for share: {song_id}",
            extra={
                'extra_fields': {
                    'song_id': song_id,
                    'user_id': user_id,
                    'operation': 'create_share_link'
                }
            }
        )
        raise HTTPException(
            status_code=404,
            detail={
                'error': 'Song not found',
                'message': 'The requested song could not be found.'
            }
        )
    
    # Step 2: Verify user ownership
    if song_data.get('user_id') != user_id:
        logger.warning(
            f"Unauthorized share attempt for song: {song_id}",
            extra={
                'extra_fields': {
                    'song_id': song_id,
                    'requesting_user': user_id,
                    'song_owner': song_data.get('user_id'),
                    'operation': 'create_share_link'
                }
            }
        )
        raise HTTPException(
            status_code=403,
            detail={
                'error': 'Forbidden',
                'message': 'You do not have permission to share this song.'
            }
        )
    
    # Step 3: Create share link
    try:
        share_data = await create_share_link(song_id, user_id)
    except Exception as e:
        logger.error(
            f"Failed to create share link for song: {song_id}",
            extra={
                'extra_fields': {
                    'song_id': song_id,
                    'error': str(e),
                    'operation': 'create_share_link'
                }
            }
        )
        raise HTTPException(
            status_code=500,
            detail={
                'error': 'Internal error',
                'message': 'Failed to create share link. Please try again.'
            }
        )
    
    # Step 4: Build full share URL
    # Use environment variable for base URL, default to localhost for development
    base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    share_url = f"{base_url}/shared/{share_data['share_token']}"
    
    logger.info(
        f"Share link created successfully for song: {song_id}",
        extra={
            'extra_fields': {
                'song_id': song_id,
                'user_id': user_id,
                'share_token': share_data['share_token'][:8] + '...',
                'operation': 'create_share_link'
            }
        }
    )
    
    return ShareLinkResponse(
        share_url=share_url,
        share_token=share_data['share_token'],
        expires_at=share_data['expires_at'],
    )


@router.get("/shared/{share_token}", response_model=SongDetails)
async def get_shared_song(share_token: str) -> SongDetails:
    """
    Get song details via share token (no auth required).
    
    This endpoint:
    1. Looks up share token in Firestore
    2. Checks if share link has expired
    3. Returns SongDetails for the shared song
    
    Args:
        share_token: The unique share token
        
    Returns:
        SongDetails for the shared song
        
    Raises:
        HTTPException: 404 if share token not found
        HTTPException: 410 if share link has expired
        
    Requirements: 5.3, 5.4
    """
    from datetime import datetime, timezone
    
    logger.info(
        f"Shared song request with token: {share_token[:8]}...",
        extra={
            'extra_fields': {
                'share_token': share_token[:8] + '...',
                'operation': 'get_shared_song'
            }
        }
    )
    
    # Step 1: Get song via share token
    try:
        song_data = await get_song_by_share_token(share_token)
    except ValueError as e:
        # Share link has expired
        logger.info(
            f"Expired share link accessed: {share_token[:8]}...",
            extra={
                'extra_fields': {
                    'share_token': share_token[:8] + '...',
                    'error': str(e),
                    'operation': 'get_shared_song'
                }
            }
        )
        raise HTTPException(
            status_code=410,
            detail={
                'error': 'Link expired',
                'message': 'This share link has expired. Ask the owner to create a new one.'
            }
        )
    except Exception as e:
        logger.error(
            f"Failed to retrieve shared song: {share_token[:8]}...",
            extra={
                'extra_fields': {
                    'share_token': share_token[:8] + '...',
                    'error': str(e),
                    'operation': 'get_shared_song'
                }
            }
        )
        raise HTTPException(
            status_code=500,
            detail={
                'error': 'Internal error',
                'message': 'Failed to retrieve song data. Please try again.'
            }
        )
    
    # Step 2: Check if song was found
    if song_data is None:
        logger.warning(
            f"Share token not found: {share_token[:8]}...",
            extra={
                'extra_fields': {
                    'share_token': share_token[:8] + '...',
                    'operation': 'get_shared_song'
                }
            }
        )
        raise HTTPException(
            status_code=404,
            detail={
                'error': 'Not found',
                'message': 'This share link is invalid or the song no longer exists.'
            }
        )
    
    # Step 3: Check if song has a URL (generation complete)
    song_url = song_data.get('song_url')
    if not song_url:
        logger.warning(
            f"Shared song not yet generated: {share_token[:8]}...",
            extra={
                'extra_fields': {
                    'share_token': share_token[:8] + '...',
                    'status': song_data.get('status'),
                    'operation': 'get_shared_song'
                }
            }
        )
        raise HTTPException(
            status_code=404,
            detail={
                'error': 'Song not ready',
                'message': 'The song is still being generated. Please wait.'
            }
        )
    
    # Step 4: Check if song has expired
    expires_at = song_data.get('expires_at')
    if expires_at:
        if hasattr(expires_at, 'timestamp'):
            expires_at_dt = datetime.fromtimestamp(expires_at.timestamp(), tz=timezone.utc)
        elif isinstance(expires_at, datetime):
            expires_at_dt = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at_dt = datetime.fromisoformat(str(expires_at).replace('Z', '+00:00'))
        
        if datetime.now(timezone.utc) > expires_at_dt:
            logger.info(
                f"Shared song has expired: {share_token[:8]}...",
                extra={
                    'extra_fields': {
                        'share_token': share_token[:8] + '...',
                        'expires_at': expires_at_dt.isoformat(),
                        'operation': 'get_shared_song'
                    }
                }
            )
            raise HTTPException(
                status_code=410,
                detail={
                    'error': 'Song expired',
                    'message': 'This song has expired and is no longer available.'
                }
            )
    
    # Step 5: Parse datetime fields
    created_at = song_data.get('created_at')
    if hasattr(created_at, 'timestamp'):
        created_at_dt = datetime.fromtimestamp(created_at.timestamp(), tz=timezone.utc)
    elif isinstance(created_at, datetime):
        created_at_dt = created_at if created_at.tzinfo else created_at.replace(tzinfo=timezone.utc)
    else:
        created_at_dt = datetime.fromisoformat(str(created_at).replace('Z', '+00:00'))
    
    # Step 6: Return SongDetails (is_owner is False for shared songs)
    from app.models.songs import MusicStyle
    
    song_id = song_data.get('task_id', share_token)
    
    logger.info(
        f"Shared song retrieved successfully: {share_token[:8]}...",
        extra={
            'extra_fields': {
                'share_token': share_token[:8] + '...',
                'song_id': song_id,
                'operation': 'get_shared_song'
            }
        }
    )
    
    return SongDetails(
        song_id=song_id,
        song_url=song_url,
        lyrics=song_data.get('lyrics', ''),
        style=MusicStyle(song_data.get('style', 'pop')),
        created_at=created_at_dt,
        expires_at=expires_at_dt,
        is_owner=False,  # Shared songs are never owned by the viewer
    )


@router.post("/generate-timeout-test", response_model=GenerateSongResponse)
async def generate_song_timeout_test(
    request: GenerateSongRequest
) -> GenerateSongResponse:
    """
    TEST ENDPOINT: Simulate Suno API timeout for debugging.
    
    This endpoint simulates a 90+ second timeout scenario to test
    frontend timeout handling. Only for development/testing.
    NO AUTH REQUIRED for testing purposes.
    
    Args:
        request: Song generation request with lyrics and style
        
    Returns:
        Never returns - times out after 90 seconds
        
    Raises:
        HTTPException: 504 Gateway Timeout after 90 seconds
    """
    import asyncio
    
    logger.warning(
        f"TIMEOUT TEST: Simulating 95s delay (should timeout at 90s)",
        extra={
            'extra_fields': {
                'test_endpoint': True,
                'operation': 'timeout_test',
                'lyrics_length': len(request.lyrics),
                'style': request.style.value
            }
        }
    )
    
    # Wait for 95 seconds to simulate timeout
    # The frontend has 90s timeout, so this should trigger it
    await asyncio.sleep(95)
    
    # This should never be reached due to frontend timeout
    raise HTTPException(
        status_code=504,
        detail={
            'error': 'Gateway Timeout',
            'message': 'Song generation service timed out after 90 seconds. Please try again.'
        }
    )





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
