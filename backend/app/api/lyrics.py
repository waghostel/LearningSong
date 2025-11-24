"""
API endpoints for lyrics generation.

This module provides REST API endpoints for generating song lyrics
from educational content and checking user rate limits.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException

from app.models.lyrics import GenerateLyricsRequest, GenerateLyricsResponse
from app.models.user import RateLimitResponse
from app.core.auth import get_current_user
from app.services.rate_limiter import check_rate_limit, get_rate_limit, increment_usage
from app.services.cache import generate_content_hash, check_lyrics_cache, store_lyrics_cache
from app.services.ai_pipeline import LyricsPipeline
from app.core.firebase import get_firestore_client


# Configure logging
logger = logging.getLogger(__name__)

# Create router with prefix and tags for API documentation
router = APIRouter(
    prefix="/api/lyrics",
    tags=["lyrics"]
)


@router.get("/health")
async def lyrics_health():
    """Health check endpoint for lyrics service."""
    return {"status": "healthy", "service": "lyrics"}



@router.post("/generate", response_model=GenerateLyricsResponse)
async def generate_lyrics(
    request: GenerateLyricsRequest,
    user_id: str = Depends(get_current_user)
) -> GenerateLyricsResponse:
    """
    Generate song lyrics from educational content.
    
    This endpoint processes educational content through an AI pipeline to
    generate memorable song lyrics. It includes rate limiting, caching,
    and optional Google Search grounding.
    
    Args:
        request: Request containing content and search_enabled flag
        user_id: Authenticated user ID from Firebase token
        
    Returns:
        GenerateLyricsResponse with lyrics, content_hash, cached flag, and processing_time
        
    Raises:
        HTTPException: 429 if rate limit exceeded
        HTTPException: 400 if content validation fails
        HTTPException: 500 if pipeline execution fails
        
    Requirements: FR-3, FR-2
    """
    logger.info(
        f"Generate lyrics request from user {user_id[:8]}...",
        extra={
            'extra_fields': {
                'user_id': user_id,
                'content_length': len(request.content),
                'search_enabled': request.search_enabled,
                'endpoint': 'generate_lyrics'
            }
        }
    )
    
    try:
        # Step 1: Check rate limit
        await check_rate_limit(user_id)
        
        # Step 2: Generate content hash
        content_hash = generate_content_hash(request.content)
        
        # Step 3: Check cache
        cached_result = await check_lyrics_cache(content_hash)
        
        if cached_result:
            logger.info(
                f"Cache hit! Returning cached lyrics",
                extra={
                    'extra_fields': {
                        'user_id': user_id,
                        'content_hash': content_hash[:16],
                        'cache_hit': True,
                        'hit_count': cached_result.get('hit_count', 0)
                    }
                }
            )
            # Don't increment usage for cached results to save user's quota
            return GenerateLyricsResponse(**cached_result)
        
        # Step 4: Execute AI pipeline
        pipeline = LyricsPipeline()
        result = await pipeline.execute(
            content=request.content,
            search_enabled=request.search_enabled
        )
        
        logger.info(
            f"Pipeline completed in {result['processing_time']:.2f}s",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'content_hash': result['content_hash'][:16],
                    'processing_time': round(result['processing_time'], 3),
                    'lyrics_length': len(result['lyrics'])
                }
            }
        )
        
        # Step 5: Store in cache
        await store_lyrics_cache(
            content_hash=result['content_hash'],
            lyrics=result['lyrics'],
            original_content=request.content
        )
        
        # Step 6: Store in lyrics history
        firestore_client = get_firestore_client()
        from datetime import datetime, timezone
        
        history_ref = firestore_client.collection('lyrics_history').document()
        history_ref.set({
            'user_id': user_id,
            'content_hash': result['content_hash'],
            'lyrics': result['lyrics'],
            'search_enabled': request.search_enabled,
            'processing_time': result['processing_time'],
            'created_at': datetime.now(timezone.utc),
            'content_preview': request.content[:200]  # Store preview for reference
        })
        
        # Step 7: Increment usage counter
        await increment_usage(user_id)
        
        logger.info(
            f"Successfully generated lyrics",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'content_hash': result['content_hash'][:16],
                    'success': True,
                    'cached': False
                }
            }
        )
        
        return GenerateLyricsResponse(**result)
        
    except HTTPException:
        # Re-raise HTTP exceptions (like rate limit errors)
        raise
    except ValueError as e:
        # Handle validation errors
        logger.error(
            f"Validation error: {str(e)}",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'error_type': 'validation',
                    'error': str(e)
                }
            }
        )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Handle unexpected errors
        logger.error(
            f"Unexpected error generating lyrics: {str(e)}",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'error_type': 'unexpected',
                    'error': str(e)
                }
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate lyrics: {str(e)}"
        )



@router.get("/rate-limit", response_model=RateLimitResponse)
async def get_user_rate_limit(
    user_id: str = Depends(get_current_user)
) -> RateLimitResponse:
    """
    Get the current rate limit status for the authenticated user.
    
    Returns the number of songs remaining for today and when the
    rate limit will reset (midnight UTC).
    
    Args:
        user_id: Authenticated user ID from Firebase token
        
    Returns:
        RateLimitResponse with remaining count and reset_time
        
    Requirements: FR-2
    """
    try:
        rate_limit_info = await get_rate_limit(user_id)
        
        logger.info(
            f"Rate limit check",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'remaining': rate_limit_info['remaining'],
                    'endpoint': 'get_rate_limit'
                }
            }
        )
        
        return RateLimitResponse(
            remaining=rate_limit_info['remaining'],
            reset_time=rate_limit_info['reset_time']
        )
        
    except Exception as e:
        logger.error(
            f"Error getting rate limit: {str(e)}",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'error': str(e)
                }
            },
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get rate limit information: {str(e)}"
        )
