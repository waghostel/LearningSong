"""Pydantic models for song generation."""

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
