"""
Rate limiting service for managing user song generation and lyrics regeneration quotas.

This module implements a daily rate limit system that allows each user
to generate up to 3 songs per day and regenerate lyrics up to 10 times per day.
Both limits reset at midnight UTC. Regeneration and song generation counters
are tracked independently.
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from fastapi import HTTPException

from app.core.firebase import get_firestore_client

# Configure logger
logger = logging.getLogger(__name__)

# Development mode settings
DEV_USER_ID = 'dev-user-local'
IS_DEVELOPMENT = os.getenv('ENVIRONMENT', 'development').lower() == 'development'

# Rate limit constants
DAILY_SONG_LIMIT = 3
DAILY_REGENERATION_LIMIT = 10

# Log on module load to verify code is loaded
logger.info(f"🔧 Rate limiter loaded: IS_DEVELOPMENT={IS_DEVELOPMENT}, DEV_USER_ID={DEV_USER_ID}")


async def check_rate_limit(user_id: str) -> None:
    """
    Check if user has exceeded their daily rate limit.
    
    This function queries Firestore for the user's current usage and
    determines if they can generate another song. If the user doesn't
    exist, a new user document is created. If the daily reset time has
    passed, the counter is reset.
    
    Args:
        user_id: Firebase user ID (anonymous or authenticated)
        
    Raises:
        HTTPException: 429 Too Many Requests if rate limit exceeded
        
    Requirements: FR-2
    """
    # Development mode: bypass rate limiting for dev user
    if IS_DEVELOPMENT and user_id == DEV_USER_ID:
        logger.info(
            f"Rate limit bypassed for dev user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'operation': 'rate_limit_check',
                    'dev_mode': True
                }
            }
        )
        return
    
    logger.info(
        f"Checking rate limit for user: {user_id[:8]}...",
        extra={
            'extra_fields': {
                'user_id': user_id,
                'operation': 'rate_limit_check'
            }
        }
    )
    
    firestore_client = get_firestore_client()
    user_ref = firestore_client.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    current_time = datetime.now(timezone.utc)
    
    if not user_doc.exists:
        # Create new user document with initial values
        next_reset = _get_next_midnight_utc(current_time)
        user_ref.set({
            'created_at': current_time,
            'songs_generated_today': 0,
            'daily_limit_reset': next_reset,
            'total_songs_generated': 0
        })
        logger.info(
            f"New user created: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'new_user': True,
                    'remaining': 3
                }
            }
        )
        return
    
    user_data = user_doc.to_dict()
    reset_time = user_data['daily_limit_reset']
    
    # Convert Firestore timestamp to datetime if needed
    if hasattr(reset_time, 'timestamp'):
        reset_time = datetime.fromtimestamp(reset_time.timestamp(), tz=timezone.utc)
    elif not reset_time.tzinfo:
        reset_time = reset_time.replace(tzinfo=timezone.utc)
    
    # Check if daily reset is needed
    if current_time >= reset_time:
        next_reset = _get_next_midnight_utc(current_time)
        user_ref.update({
            'songs_generated_today': 0,
            'daily_limit_reset': next_reset
        })
        logger.info(
            f"Rate limit reset for user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'rate_limit_reset': True,
                    'next_reset': next_reset.isoformat()
                }
            }
        )
        return
    
    # Check if limit exceeded
    songs_today = user_data.get('songs_generated_today', 0)
    remaining = DAILY_SONG_LIMIT - songs_today
    
    logger.info(
        f"Rate limit check passed: {remaining} songs remaining",
        extra={
            'extra_fields': {
                'user_id': user_id,
                'songs_today': songs_today,
                'remaining': remaining,
                'rate_limit_ok': songs_today < DAILY_SONG_LIMIT
            }
        }
    )
    
    if songs_today >= DAILY_SONG_LIMIT:
        seconds_until_reset = (reset_time - current_time).total_seconds()
        logger.warning(
            f"Rate limit exceeded for user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'songs_today': songs_today,
                    'rate_limit_exceeded': True,
                    'retry_after': int(seconds_until_reset)
                }
            }
        )
        raise HTTPException(
            status_code=429,
            detail={
                'error': 'Rate limit exceeded',
                'message': f'You have reached your daily limit of {DAILY_SONG_LIMIT} songs',
                'retry_after': int(seconds_until_reset),
                'reset_time': reset_time.isoformat()
            }
        )


async def get_rate_limit(user_id: str) -> Dict[str, Any]:
    """
    Get the current rate limit status for a user.
    
    Returns the number of songs remaining and when the limit resets.
    If the user doesn't exist, creates a new user document.
    
    Args:
        user_id: Firebase user ID (anonymous or authenticated)
        
    Returns:
        Dictionary containing:
            - remaining: Number of songs remaining (0-3)
            - reset_time: UTC datetime when limit resets
            
    Requirements: FR-2
    """
    # Development mode: return unlimited for dev user
    print(f"🔍 DEBUG: get_rate_limit called with user_id={user_id}, IS_DEVELOPMENT={IS_DEVELOPMENT}, DEV_USER_ID={DEV_USER_ID}")
    if IS_DEVELOPMENT and user_id == DEV_USER_ID:
        print(f"✅ Returning unlimited rate limit for dev user")
        return {
            'remaining': 999,  # Effectively unlimited
            'reset_time': datetime.now(timezone.utc) + timedelta(days=365)
        }
    
    firestore_client = get_firestore_client()
    user_ref = firestore_client.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    current_time = datetime.now(timezone.utc)
    
    if not user_doc.exists:
        # Create new user document
        next_reset = _get_next_midnight_utc(current_time)
        user_ref.set({
            'created_at': current_time,
            'songs_generated_today': 0,
            'daily_limit_reset': next_reset,
            'total_songs_generated': 0
        })
        return {
            'remaining': DAILY_SONG_LIMIT,
            'reset_time': next_reset
        }
    
    user_data = user_doc.to_dict()
    reset_time = user_data['daily_limit_reset']
    
    # Convert Firestore timestamp to datetime if needed
    if hasattr(reset_time, 'timestamp'):
        reset_time = datetime.fromtimestamp(reset_time.timestamp(), tz=timezone.utc)
    elif not reset_time.tzinfo:
        reset_time = reset_time.replace(tzinfo=timezone.utc)
    
    # Check if daily reset is needed
    if current_time >= reset_time:
        next_reset = _get_next_midnight_utc(current_time)
        user_ref.update({
            'songs_generated_today': 0,
            'daily_limit_reset': next_reset
        })
        return {
            'remaining': DAILY_SONG_LIMIT,
            'reset_time': next_reset
        }
    
    songs_today = user_data.get('songs_generated_today', 0)
    remaining = max(0, DAILY_SONG_LIMIT - songs_today)
    
    return {
        'remaining': remaining,
        'reset_time': reset_time
    }


async def increment_usage(user_id: str) -> None:
    """
    Increment the user's song generation counter.
    
    This should be called after successfully generating a song.
    Also increments the total_songs_generated counter for analytics.
    
    Args:
        user_id: Firebase user ID (anonymous or authenticated)
        
    Requirements: FR-2
    """
    # Development mode: skip incrementing for dev user
    if IS_DEVELOPMENT and user_id == DEV_USER_ID:
        logger.info(
            f"Usage increment skipped for dev user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'dev_mode': True
                }
            }
        )
        return
    
    firestore_client = get_firestore_client()
    user_ref = firestore_client.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        # This shouldn't happen if check_rate_limit was called first,
        # but handle it gracefully
        current_time = datetime.now(timezone.utc)
        next_reset = _get_next_midnight_utc(current_time)
        user_ref.set({
            'created_at': current_time,
            'songs_generated_today': 1,
            'daily_limit_reset': next_reset,
            'total_songs_generated': 1
        })
        logger.info(
            f"Usage incremented for new user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'songs_today': 1,
                    'total_songs': 1
                }
            }
        )
    else:
        # Increment both daily and total counters
        user_data = user_doc.to_dict()
        new_daily = user_data.get('songs_generated_today', 0) + 1
        new_total = user_data.get('total_songs_generated', 0) + 1
        
        user_ref.update({
            'songs_generated_today': new_daily,
            'total_songs_generated': new_total,
            'last_generated_at': datetime.now(timezone.utc)
        })
        
        logger.info(
            f"Usage incremented for user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'songs_today': new_daily,
                    'total_songs': new_total,
                    'remaining': DAILY_SONG_LIMIT - new_daily
                }
            }
        )


def _get_next_midnight_utc(current_time: datetime) -> datetime:
    """
    Calculate the next midnight UTC from the given time.
    
    Args:
        current_time: Current datetime (should be timezone-aware)
        
    Returns:
        Datetime representing the next midnight UTC
    """
    # Ensure we're working with UTC
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)
    
    # Get the next day at midnight
    next_day = current_time.date() + timedelta(days=1)
    next_midnight = datetime.combine(next_day, datetime.min.time())
    next_midnight = next_midnight.replace(tzinfo=timezone.utc)
    
    return next_midnight


async def check_regeneration_limit(user_id: str) -> None:
    """
    Check if user has exceeded their daily lyrics regeneration limit.
    
    This function queries Firestore for the user's current regeneration usage
    and determines if they can regenerate lyrics again. The regeneration counter
    is independent from the song generation counter.
    
    Args:
        user_id: Firebase user ID (anonymous or authenticated)
        
    Raises:
        HTTPException: 429 Too Many Requests if regeneration limit exceeded
        
    Requirements: 7.1, 7.3, 7.5
    """
    # Development mode: bypass rate limiting for dev user
    if IS_DEVELOPMENT and user_id == DEV_USER_ID:
        logger.info(
            f"Regeneration limit bypassed for dev user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'operation': 'regeneration_limit_check',
                    'dev_mode': True
                }
            }
        )
        return
    
    logger.info(
        f"Checking regeneration limit for user: {user_id[:8]}...",
        extra={
            'extra_fields': {
                'user_id': user_id,
                'operation': 'regeneration_limit_check'
            }
        }
    )
    
    firestore_client = get_firestore_client()
    user_ref = firestore_client.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    current_time = datetime.now(timezone.utc)
    
    if not user_doc.exists:
        # Create new user document with initial values
        next_reset = _get_next_midnight_utc(current_time)
        user_ref.set({
            'created_at': current_time,
            'songs_generated_today': 0,
            'regenerations_today': 0,
            'daily_limit_reset': next_reset,
            'total_songs_generated': 0,
            'total_regenerations': 0
        })
        logger.info(
            f"New user created: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'new_user': True,
                    'regenerations_remaining': DAILY_REGENERATION_LIMIT
                }
            }
        )
        return
    
    user_data = user_doc.to_dict()
    reset_time = user_data['daily_limit_reset']
    
    # Convert Firestore timestamp to datetime if needed
    if hasattr(reset_time, 'timestamp'):
        reset_time = datetime.fromtimestamp(reset_time.timestamp(), tz=timezone.utc)
    elif not reset_time.tzinfo:
        reset_time = reset_time.replace(tzinfo=timezone.utc)
    
    # Check if daily reset is needed
    if current_time >= reset_time:
        next_reset = _get_next_midnight_utc(current_time)
        user_ref.update({
            'songs_generated_today': 0,
            'regenerations_today': 0,
            'daily_limit_reset': next_reset
        })
        logger.info(
            f"Rate limits reset for user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'rate_limit_reset': True,
                    'next_reset': next_reset.isoformat()
                }
            }
        )
        return
    
    # Check if regeneration limit exceeded
    regenerations_today = user_data.get('regenerations_today', 0)
    remaining = DAILY_REGENERATION_LIMIT - regenerations_today
    
    logger.info(
        f"Regeneration limit check: {remaining} regenerations remaining",
        extra={
            'extra_fields': {
                'user_id': user_id,
                'regenerations_today': regenerations_today,
                'remaining': remaining,
                'regeneration_limit_ok': regenerations_today < DAILY_REGENERATION_LIMIT
            }
        }
    )
    
    if regenerations_today >= DAILY_REGENERATION_LIMIT:
        seconds_until_reset = (reset_time - current_time).total_seconds()
        logger.warning(
            f"Regeneration limit exceeded for user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'regenerations_today': regenerations_today,
                    'regeneration_limit_exceeded': True,
                    'retry_after': int(seconds_until_reset)
                }
            }
        )
        raise HTTPException(
            status_code=429,
            detail={
                'error': 'Regeneration limit exceeded',
                'message': f'You have reached your daily limit of {DAILY_REGENERATION_LIMIT} lyrics regenerations',
                'retry_after': int(seconds_until_reset),
                'reset_time': reset_time.isoformat()
            }
        )


async def increment_regeneration_usage(user_id: str) -> None:
    """
    Increment the user's lyrics regeneration counter.
    
    This should be called after successfully regenerating lyrics.
    Also increments the total_regenerations counter for analytics.
    This counter is independent from the song generation counter.
    
    Args:
        user_id: Firebase user ID (anonymous or authenticated)
        
    Requirements: 7.3
    """
    # Development mode: skip incrementing for dev user
    if IS_DEVELOPMENT and user_id == DEV_USER_ID:
        logger.info(
            f"Regeneration usage increment skipped for dev user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'dev_mode': True
                }
            }
        )
        return
    
    firestore_client = get_firestore_client()
    user_ref = firestore_client.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        # This shouldn't happen if check_regeneration_limit was called first,
        # but handle it gracefully
        current_time = datetime.now(timezone.utc)
        next_reset = _get_next_midnight_utc(current_time)
        user_ref.set({
            'created_at': current_time,
            'songs_generated_today': 0,
            'regenerations_today': 1,
            'daily_limit_reset': next_reset,
            'total_songs_generated': 0,
            'total_regenerations': 1
        })
        logger.info(
            f"Regeneration usage incremented for new user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'regenerations_today': 1,
                    'total_regenerations': 1
                }
            }
        )
    else:
        # Increment both daily and total regeneration counters
        user_data = user_doc.to_dict()
        new_daily = user_data.get('regenerations_today', 0) + 1
        new_total = user_data.get('total_regenerations', 0) + 1
        
        user_ref.update({
            'regenerations_today': new_daily,
            'total_regenerations': new_total,
            'last_regenerated_at': datetime.now(timezone.utc)
        })
        
        logger.info(
            f"Regeneration usage incremented for user: {user_id[:8]}...",
            extra={
                'extra_fields': {
                    'user_id': user_id,
                    'regenerations_today': new_daily,
                    'total_regenerations': new_total,
                    'remaining': DAILY_REGENERATION_LIMIT - new_daily
                }
            }
        )


async def get_regeneration_limit(user_id: str) -> Dict[str, Any]:
    """
    Get the current regeneration limit status for a user.
    
    Returns the number of regenerations remaining and when the limit resets.
    If the user doesn't exist, creates a new user document.
    
    Args:
        user_id: Firebase user ID (anonymous or authenticated)
        
    Returns:
        Dictionary containing:
            - remaining: Number of regenerations remaining (0-10)
            - reset_time: UTC datetime when limit resets
            
    Requirements: 7.1, 7.3
    """
    # Development mode: return unlimited for dev user
    if IS_DEVELOPMENT and user_id == DEV_USER_ID:
        return {
            'remaining': 999,  # Effectively unlimited
            'reset_time': datetime.now(timezone.utc) + timedelta(days=365)
        }
    
    firestore_client = get_firestore_client()
    user_ref = firestore_client.collection('users').document(user_id)
    user_doc = user_ref.get()
    
    current_time = datetime.now(timezone.utc)
    
    if not user_doc.exists:
        # Create new user document
        next_reset = _get_next_midnight_utc(current_time)
        user_ref.set({
            'created_at': current_time,
            'songs_generated_today': 0,
            'regenerations_today': 0,
            'daily_limit_reset': next_reset,
            'total_songs_generated': 0,
            'total_regenerations': 0
        })
        return {
            'remaining': DAILY_REGENERATION_LIMIT,
            'reset_time': next_reset
        }
    
    user_data = user_doc.to_dict()
    reset_time = user_data['daily_limit_reset']
    
    # Convert Firestore timestamp to datetime if needed
    if hasattr(reset_time, 'timestamp'):
        reset_time = datetime.fromtimestamp(reset_time.timestamp(), tz=timezone.utc)
    elif not reset_time.tzinfo:
        reset_time = reset_time.replace(tzinfo=timezone.utc)
    
    # Check if daily reset is needed
    if current_time >= reset_time:
        next_reset = _get_next_midnight_utc(current_time)
        user_ref.update({
            'songs_generated_today': 0,
            'regenerations_today': 0,
            'daily_limit_reset': next_reset
        })
        return {
            'remaining': DAILY_REGENERATION_LIMIT,
            'reset_time': next_reset
        }
    
    regenerations_today = user_data.get('regenerations_today', 0)
    remaining = max(0, DAILY_REGENERATION_LIMIT - regenerations_today)
    
    return {
        'remaining': remaining,
        'reset_time': reset_time
    }

