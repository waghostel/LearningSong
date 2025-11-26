"""Suno API Client for music generation.

This module provides an async client for interacting with the Suno API
to generate music from lyrics.
"""

import asyncio
import logging
from dataclasses import dataclass
from typing import Optional

import httpx

from app.models.songs import MusicStyle

logger = logging.getLogger(__name__)

# Suno API base URL
SUNO_API_BASE_URL = "https://api.sunoapi.org"

# Default timeout for API requests (seconds)
DEFAULT_TIMEOUT = 30.0

# Retry configuration
MAX_RETRIES = 3
INITIAL_BACKOFF = 1.0  # seconds
MAX_BACKOFF = 10.0  # seconds


@dataclass
class SunoTask:
    """Represents a Suno music generation task."""
    
    task_id: str
    estimated_time: int  # seconds
    
    def __post_init__(self):
        """Validate task data after initialization."""
        if not self.task_id:
            raise ValueError("task_id cannot be empty")
        if self.estimated_time < 0:
            raise ValueError("estimated_time cannot be negative")


@dataclass
class SunoStatus:
    """Represents the status of a Suno music generation task."""
    
    status: str  # PENDING, GENERATING, SUCCESS, FAILED, etc.
    progress: int  # 0-100
    song_url: Optional[str] = None
    error: Optional[str] = None
    
    def __post_init__(self):
        """Validate status data after initialization."""
        if self.progress < 0 or self.progress > 100:
            raise ValueError("progress must be between 0 and 100")


class SunoAPIError(Exception):
    """Base exception for Suno API errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class SunoRateLimitError(SunoAPIError):
    """Raised when Suno API rate limit is exceeded."""
    pass


class SunoAuthenticationError(SunoAPIError):
    """Raised when Suno API authentication fails."""
    pass


class SunoValidationError(SunoAPIError):
    """Raised when request validation fails."""
    pass


# Mapping from MusicStyle enum to Suno API style tags
STYLE_MAPPING = {
    MusicStyle.POP: "pop, upbeat, catchy",
    MusicStyle.RAP: "rap, hip-hop, rhythmic",
    MusicStyle.FOLK: "folk, acoustic, gentle",
    MusicStyle.ELECTRONIC: "electronic, edm, energetic",
    MusicStyle.ROCK: "rock, powerful, guitar",
    MusicStyle.JAZZ: "jazz, smooth, sophisticated",
    MusicStyle.CHILDREN: "children's song, simple, fun",
    MusicStyle.CLASSICAL: "classical, orchestral, elegant",
}


class SunoClient:
    """Async client for interacting with Suno API."""

    def __init__(
        self,
        api_key: str,
        base_url: str = SUNO_API_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
    ):
        """
        Initialize Suno API client.

        Args:
            api_key: Suno API authentication key
            base_url: Base URL for Suno API
            timeout: Request timeout in seconds
        """
        if not api_key:
            raise ValueError("api_key cannot be empty")
        
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=self.timeout,
            )
        return self._client

    async def create_song(
        self,
        lyrics: str,
        style: str,
        title: str = "Learning Song",
    ) -> SunoTask:
        """
        Create a new song generation task.

        Args:
            lyrics: Song lyrics (50-3000 characters)
            style: Music style (from MusicStyle enum value)
            title: Song title (max 80 characters)

        Returns:
            SunoTask with task_id and estimated_time

        Raises:
            SunoAPIError: If API call fails after retries
            SunoValidationError: If request validation fails
            SunoRateLimitError: If rate limit is exceeded
            SunoAuthenticationError: If authentication fails
        """
        # Validate inputs
        if not lyrics or not lyrics.strip():
            raise SunoValidationError("Lyrics cannot be empty")
        
        if len(lyrics) > 3000:
            raise SunoValidationError(
                f"Lyrics exceed 3000 character limit (current: {len(lyrics)})"
            )
        
        # Map style to Suno API format
        style_tag = STYLE_MAPPING.get(
            MusicStyle(style) if isinstance(style, str) else style,
            style  # Use raw style if not in mapping
        )
        
        # Truncate title if needed
        title = title[:80] if title else "Learning Song"
        
        payload = {
            "customMode": True,
            "instrumental": False,
            "model": "V4",  # Use V4 model for good quality
            "prompt": lyrics,
            "style": style_tag,
            "title": title,
            "callBackUrl": "",  # We'll poll for status instead
        }
        
        logger.info(f"Creating song with style: {style_tag}, title: {title}")
        
        # Retry with exponential backoff
        last_error: Optional[Exception] = None
        backoff = INITIAL_BACKOFF
        
        for attempt in range(MAX_RETRIES):
            try:
                response = await self.client.post(
                    "/api/v1/generate",
                    json=payload,
                )
                
                # Handle specific error codes
                if response.status_code == 401:
                    raise SunoAuthenticationError(
                        "Invalid API key",
                        status_code=401
                    )
                
                if response.status_code == 429:
                    raise SunoRateLimitError(
                        "Suno API rate limit exceeded",
                        status_code=429
                    )
                
                if response.status_code == 400:
                    error_data = response.json()
                    raise SunoValidationError(
                        error_data.get("msg", "Invalid request"),
                        status_code=400
                    )
                
                response.raise_for_status()
                
                data = response.json()
                
                # Check response code
                if data.get("code") != 200:
                    raise SunoAPIError(
                        data.get("msg", "Unknown error"),
                        status_code=data.get("code")
                    )
                
                task_id = data.get("data", {}).get("taskId")
                if not task_id:
                    raise SunoAPIError("No task ID in response")
                
                logger.info(f"Song generation task created: {task_id}")
                
                return SunoTask(
                    task_id=task_id,
                    estimated_time=60,  # Default estimate: 60 seconds
                )
                
            except (SunoAuthenticationError, SunoRateLimitError, SunoValidationError):
                # Don't retry these errors
                raise
            
            except httpx.TimeoutException as e:
                last_error = SunoAPIError(f"Request timeout: {e}")
                logger.warning(
                    f"Timeout on attempt {attempt + 1}/{MAX_RETRIES}: {e}"
                )
            
            except httpx.HTTPStatusError as e:
                last_error = SunoAPIError(
                    f"HTTP error: {e.response.status_code}",
                    status_code=e.response.status_code
                )
                logger.warning(
                    f"HTTP error on attempt {attempt + 1}/{MAX_RETRIES}: {e}"
                )
            
            except Exception as e:
                last_error = SunoAPIError(f"Unexpected error: {e}")
                logger.warning(
                    f"Error on attempt {attempt + 1}/{MAX_RETRIES}: {e}"
                )
            
            # Wait before retry (exponential backoff)
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, MAX_BACKOFF)
        
        # All retries exhausted
        logger.error(f"All {MAX_RETRIES} attempts failed for create_song")
        raise last_error or SunoAPIError("Failed to create song after retries")

    async def get_task_status(self, task_id: str) -> SunoStatus:
        """
        Get the status of a song generation task.

        Args:
            task_id: Task identifier from create_song

        Returns:
            SunoStatus with current status, progress, and song URL if complete

        Raises:
            SunoAPIError: If API call fails
            SunoAuthenticationError: If authentication fails
        """
        if not task_id:
            raise SunoValidationError("task_id cannot be empty")
        
        logger.debug(f"Getting status for task: {task_id}")
        
        try:
            response = await self.client.get(
                "/api/v1/generate/record-info",
                params={"taskId": task_id},
            )
            
            if response.status_code == 401:
                raise SunoAuthenticationError(
                    "Invalid API key",
                    status_code=401
                )
            
            if response.status_code == 404:
                raise SunoAPIError(
                    f"Task not found: {task_id}",
                    status_code=404
                )
            
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("code") != 200:
                raise SunoAPIError(
                    data.get("msg", "Unknown error"),
                    status_code=data.get("code")
                )
            
            task_data = data.get("data", {})
            status = task_data.get("status", "PENDING")
            
            # Map Suno status to progress percentage
            progress = self._status_to_progress(status)
            
            # Get song URL if completed
            song_url = None
            error = None
            
            if status == "SUCCESS":
                suno_data = task_data.get("response", {}).get("sunoData", [])
                if suno_data:
                    # Get the first track's audio URL
                    song_url = suno_data[0].get("audioUrl")
            
            elif status in ("FAILED", "CREATE_TASK_FAILED", 
                          "GENERATE_AUDIO_FAILED", "CALLBACK_EXCEPTION",
                          "SENSITIVE_WORD_ERROR"):
                error = self._get_error_message(status)
            
            logger.debug(
                f"Task {task_id} status: {status}, progress: {progress}%"
            )
            
            return SunoStatus(
                status=status,
                progress=progress,
                song_url=song_url,
                error=error,
            )
            
        except httpx.TimeoutException as e:
            raise SunoAPIError(f"Request timeout: {e}")
        
        except httpx.HTTPStatusError as e:
            raise SunoAPIError(
                f"HTTP error: {e.response.status_code}",
                status_code=e.response.status_code
            )

    def _status_to_progress(self, status: str) -> int:
        """Map Suno status to progress percentage."""
        status_progress = {
            "PENDING": 10,
            "TEXT_SUCCESS": 30,
            "FIRST_SUCCESS": 70,
            "GENERATING": 50,
            "SUCCESS": 100,
            "FAILED": 0,
            "CREATE_TASK_FAILED": 0,
            "GENERATE_AUDIO_FAILED": 0,
            "CALLBACK_EXCEPTION": 0,
            "SENSITIVE_WORD_ERROR": 0,
        }
        return status_progress.get(status, 0)

    def _get_error_message(self, status: str) -> str:
        """Get user-friendly error message for failed status."""
        error_messages = {
            "FAILED": "Song generation failed. Please try again.",
            "CREATE_TASK_FAILED": "Failed to create generation task. Please try again.",
            "GENERATE_AUDIO_FAILED": "Failed to generate audio. Please try again.",
            "CALLBACK_EXCEPTION": "An error occurred during processing. Please try again.",
            "SENSITIVE_WORD_ERROR": "Your lyrics contain content that cannot be processed. Please modify and try again.",
        }
        return error_messages.get(status, "An unknown error occurred.")

    async def close(self):
        """Close the HTTP client connection."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
            logger.debug("Suno client connection closed")

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
