"""
Cache service for storing and retrieving generated lyrics.

This module implements content-based caching using SHA-256 hashing
to reduce redundant API calls and improve response times. Cached
lyrics are stored in Firestore with hit tracking and access timestamps.
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from app.core.firebase import get_firestore_client

# Configure logger
logger = logging.getLogger(__name__)


def generate_content_hash(content: str) -> str:
    """
    Generate a SHA-256 hash of the content for cache lookup.
    
    The content is normalized (stripped and lowercased) before hashing
    to ensure consistent cache hits for similar content.
    
    Args:
        content: The input text content to hash
        
    Returns:
        Hexadecimal string representation of the SHA-256 hash
        
    Requirements: FR-3
    """
    # Normalize content: strip whitespace and convert to lowercase
    cleaned = content.strip().lower()
    
    # Generate SHA-256 hash
    hash_object = hashlib.sha256(cleaned.encode('utf-8'))
    content_hash = hash_object.hexdigest()
    
    logger.debug(
        f"Generated content hash: {content_hash[:16]}...",
        extra={
            'extra_fields': {
                'content_hash': content_hash,
                'content_length': len(content)
            }
        }
    )
    
    return content_hash


async def check_lyrics_cache(content_hash: str) -> Optional[Dict[str, Any]]:
    """
    Check if lyrics exist in the cache for the given content hash.
    
    If a cache hit occurs, updates the hit_count and last_accessed
    timestamp in Firestore to track cache usage.
    
    Args:
        content_hash: SHA-256 hash of the content
        
    Returns:
        Dictionary containing cached lyrics data if found, None otherwise.
        Dictionary structure:
            - lyrics: The cached lyrics text
            - content_hash: The hash used for lookup
            - cached: Always True for cache hits
            - processing_time: 0 for cached results
            - hit_count: Number of times this cache entry has been accessed
            
    Requirements: FR-3
    """
    logger.info(
        f"Checking cache for content hash: {content_hash[:16]}...",
        extra={
            'extra_fields': {
                'content_hash': content_hash,
                'operation': 'cache_check'
            }
        }
    )
    
    firestore_client = get_firestore_client()
    cache_ref = firestore_client.collection('cached_songs').document(content_hash)
    cache_doc = cache_ref.get()
    
    if not cache_doc.exists:
        logger.info(
            "Cache miss",
            extra={
                'extra_fields': {
                    'content_hash': content_hash,
                    'cache_hit': False
                }
            }
        )
        return None
    
    cache_data = cache_doc.to_dict()
    current_time = datetime.now(timezone.utc)
    
    # Update cache statistics
    new_hit_count = cache_data.get('hit_count', 0) + 1
    cache_ref.update({
        'hit_count': new_hit_count,
        'last_accessed': current_time
    })
    
    logger.info(
        f"Cache hit (hit count: {new_hit_count})",
        extra={
            'extra_fields': {
                'content_hash': content_hash,
                'cache_hit': True,
                'hit_count': new_hit_count,
                'lyrics_length': len(cache_data['lyrics'])
            }
        }
    )
    
    return {
        'lyrics': cache_data['lyrics'],
        'content_hash': content_hash,
        'cached': True,
        'processing_time': 0.0,
        'hit_count': new_hit_count
    }


async def store_lyrics_cache(
    content_hash: str,
    lyrics: str,
    original_content: Optional[str] = None
) -> None:
    """
    Store generated lyrics in the cache.
    
    Creates a new cache entry in Firestore with the lyrics and metadata.
    Includes tracking fields for cache analytics.
    
    Args:
        content_hash: SHA-256 hash of the content
        lyrics: The generated lyrics to cache
        original_content: Optional original content for reference
        
    Requirements: FR-3
    """
    logger.info(
        f"Storing lyrics in cache: {content_hash[:16]}...",
        extra={
            'extra_fields': {
                'content_hash': content_hash,
                'lyrics_length': len(lyrics),
                'operation': 'cache_store'
            }
        }
    )
    
    firestore_client = get_firestore_client()
    cache_ref = firestore_client.collection('cached_songs').document(content_hash)
    
    current_time = datetime.now(timezone.utc)
    
    cache_entry = {
        'content_hash': content_hash,
        'lyrics': lyrics,
        'created_at': current_time,
        'last_accessed': current_time,
        'hit_count': 0,
    }
    
    # Optionally store a preview of the original content for debugging
    if original_content:
        # Store first 200 characters as preview
        cache_entry['content_preview'] = original_content[:200]
    
    cache_ref.set(cache_entry)
    
    logger.info(
        "Lyrics cached successfully",
        extra={
            'extra_fields': {
                'content_hash': content_hash,
                'cache_stored': True
            }
        }
    )


async def check_song_cache(content_hash: str, style: str) -> Optional[Dict[str, Any]]:
    """
    Check if a song exists in the cache for the given content hash and style.
    
    If a cache hit occurs, updates the hit_count and last_accessed
    timestamp in Firestore to track cache usage.
    
    Args:
        content_hash: SHA-256 hash of the content
        style: Music style (e.g., 'pop', 'rock', 'jazz')
        
    Returns:
        Dictionary containing cached song data if found, None otherwise.
        Dictionary structure:
            - task_id: The Suno task ID for the cached song
            - song_url: URL to the generated song
            - estimated_time: 0 for cached results (instant)
            - cached: Always True for cache hits
            - hit_count: Number of times this cache entry has been accessed
            
    Requirements: FR-3
    """
    cache_key = f"{content_hash}_{style}"
    
    logger.info(
        f"Checking song cache for key: {cache_key[:24]}...",
        extra={
            'extra_fields': {
                'content_hash': content_hash,
                'style': style,
                'cache_key': cache_key,
                'operation': 'song_cache_check'
            }
        }
    )
    
    firestore_client = get_firestore_client()
    cache_ref = firestore_client.collection('cached_songs').document(cache_key)
    cache_doc = cache_ref.get()
    
    if not cache_doc.exists:
        logger.info(
            "Song cache miss",
            extra={
                'extra_fields': {
                    'cache_key': cache_key,
                    'cache_hit': False
                }
            }
        )
        return None
    
    cache_data = cache_doc.to_dict()
    
    # Verify this is a song cache entry (has task_id and song_url)
    if 'task_id' not in cache_data or 'song_url' not in cache_data:
        logger.warning(
            "Cache entry exists but is not a song cache entry",
            extra={
                'extra_fields': {
                    'cache_key': cache_key,
                    'has_task_id': 'task_id' in cache_data,
                    'has_song_url': 'song_url' in cache_data
                }
            }
        )
        return None
    
    current_time = datetime.now(timezone.utc)
    
    # Update cache statistics
    new_hit_count = cache_data.get('hit_count', 0) + 1
    cache_ref.update({
        'hit_count': new_hit_count,
        'last_accessed': current_time
    })
    
    logger.info(
        f"Song cache hit (hit count: {new_hit_count})",
        extra={
            'extra_fields': {
                'cache_key': cache_key,
                'cache_hit': True,
                'hit_count': new_hit_count,
                'task_id': cache_data['task_id']
            }
        }
    )
    
    return {
        'task_id': cache_data['task_id'],
        'song_url': cache_data['song_url'],
        'estimated_time': 0,
        'cached': True,
        'hit_count': new_hit_count
    }


async def store_song_cache(
    content_hash: str,
    style: str,
    task_id: str,
    song_url: str
) -> None:
    """
    Store a completed song in the cache.
    
    Creates a new cache entry in Firestore with the song data and metadata.
    The cache key is a combination of content_hash and style to allow
    different styles for the same content.
    
    Args:
        content_hash: SHA-256 hash of the content
        style: Music style (e.g., 'pop', 'rock', 'jazz')
        task_id: The Suno task ID for the song
        song_url: URL to the generated song
        
    Requirements: FR-3
    """
    cache_key = f"{content_hash}_{style}"
    
    logger.info(
        f"Storing song in cache: {cache_key[:24]}...",
        extra={
            'extra_fields': {
                'content_hash': content_hash,
                'style': style,
                'cache_key': cache_key,
                'task_id': task_id,
                'operation': 'song_cache_store'
            }
        }
    )
    
    firestore_client = get_firestore_client()
    cache_ref = firestore_client.collection('cached_songs').document(cache_key)
    
    current_time = datetime.now(timezone.utc)
    
    cache_entry = {
        'content_hash': content_hash,
        'style': style,
        'task_id': task_id,
        'song_url': song_url,
        'created_at': current_time,
        'last_accessed': current_time,
        'hit_count': 0,
    }
    
    cache_ref.set(cache_entry)
    
    logger.info(
        "Song cached successfully",
        extra={
            'extra_fields': {
                'cache_key': cache_key,
                'task_id': task_id,
                'cache_stored': True
            }
        }
    )
