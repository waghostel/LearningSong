"""Pydantic models for song generation."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class MusicStyle(str, Enum):
    """Available music styles for song generation."""
    
    POP = "pop"
    RAP = "rap"
    FOLK = "folk"
    ELECTRONIC = "electronic"
    ROCK = "rock"
    JAZZ = "jazz"
    CHILDREN = "children"
    CLASSICAL = "classical"


class GenerateSongRequest(BaseModel):
    """Request model for song generation."""
    
    lyrics: str = Field(
        ...,
        description="Song lyrics to generate music for",
        min_length=50,
        max_length=3000
    )
    style: MusicStyle = Field(
        ...,
        description="Music style for the generated song"
    )
    content_hash: Optional[str] = Field(
        default=None,
        description="SHA-256 hash of the original content for caching"
    )
    
    @field_validator('lyrics')
    @classmethod
    def validate_lyrics(cls, v: str) -> str:
        """Validate lyrics are not empty or whitespace only."""
        if not v or not v.strip():
            raise ValueError('Lyrics cannot be empty')
        
        stripped = v.strip()
        if len(stripped) < 50:
            raise ValueError(
                f'Lyrics must be at least 50 characters (current: {len(stripped)} characters)'
            )
        if len(stripped) > 3000:
            raise ValueError(
                f'Lyrics exceed 3000 character limit (current: {len(stripped)} characters)'
            )
        
        return v


class GenerateSongResponse(BaseModel):
    """Response model for song generation initiation."""
    
    task_id: str = Field(
        ...,
        description="Unique identifier for the song generation task"
    )
    estimated_time: int = Field(
        ...,
        description="Estimated time to complete generation in seconds",
        ge=0
    )


class GenerationStatus(str, Enum):
    """Status of a song generation task."""
    
    IDLE = "idle"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class SongStatusUpdate(BaseModel):
    """Model for song generation status updates (WebSocket messages)."""
    
    task_id: str = Field(
        ...,
        description="Unique identifier for the song generation task"
    )
    status: GenerationStatus = Field(
        ...,
        description="Current status of the generation task"
    )
    progress: int = Field(
        default=0,
        description="Progress percentage (0-100)",
        ge=0,
        le=100
    )
    song_url: Optional[str] = Field(
        default=None,
        description="URL of the generated song (when completed)"
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message (when failed)"
    )


class AlignedWordDict(BaseModel):
    """Represents a word with timing information for lyrics synchronization.
    
    Requirements: 2.2, 2.3
    """
    
    word: str = Field(
        ...,
        description="The word or phrase text"
    )
    startS: float = Field(
        ...,
        description="Start time in seconds",
        ge=0.0
    )
    endS: float = Field(
        ...,
        description="End time in seconds",
        ge=0.0
    )
    success: bool = Field(
        default=True,
        description="Whether alignment was successful"
    )
    palign: float = Field(
        default=0.0,
        description="Alignment confidence score",
        ge=0.0,
        le=1.0
    )
    
    @field_validator('endS')
    @classmethod
    def validate_end_after_start(cls, v: float, info) -> float:
        """Validate that endS is not less than startS."""
        start_s = info.data.get('startS')
        if start_s is not None and v < start_s:
            raise ValueError('endS cannot be less than startS')
        return v


class SongDetails(BaseModel):
    """Complete song details for playback page.
    
    Requirements: 8.1, 8.4, 2.2, 2.3
    """
    
    song_id: str = Field(
        ...,
        description="Unique identifier for the song"
    )
    song_url: str = Field(
        ...,
        description="URL of the generated song audio file"
    )
    lyrics: str = Field(
        ...,
        description="Song lyrics text"
    )
    style: MusicStyle = Field(
        ...,
        description="Music style of the song"
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp when the song was created"
    )
    expires_at: datetime = Field(
        ...,
        description="Timestamp when the song will expire"
    )
    is_owner: bool = Field(
        ...,
        description="True if the requesting user owns the song"
    )
    # Timestamped lyrics fields (Requirements: 2.2, 2.3)
    aligned_words: Optional[list[dict]] = Field(
        default=None,
        description="Array of aligned words with timing information"
    )
    waveform_data: Optional[list[float]] = Field(
        default=None,
        description="Waveform data for visualization"
    )
    has_timestamps: bool = Field(
        default=False,
        description="Whether timestamped lyrics are available"
    )
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat()
        }
    }


class ShareLinkResponse(BaseModel):
    """Response for share link creation.
    
    Requirements: 5.1, 5.2
    """
    
    share_url: str = Field(
        ...,
        description="Full URL for sharing the song"
    )
    share_token: str = Field(
        ...,
        description="Unique token for the share link"
    )
    expires_at: datetime = Field(
        ...,
        description="Timestamp when the share link will expire"
    )
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat()
        }
    }
