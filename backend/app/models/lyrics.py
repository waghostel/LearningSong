"""Pydantic models for lyrics generation."""

from pydantic import BaseModel, Field, field_validator


class GenerateLyricsRequest(BaseModel):
    """Request model for lyrics generation."""
    
    content: str = Field(
        ...,
        description="Educational content to convert into lyrics",
        max_length=100000  # ~10k words with average word length
    )
    search_enabled: bool = Field(
        default=False,
        description="Whether to enrich content with Google Search"
    )
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        """Validate content is not empty and within word limit."""
        if not v or not v.strip():
            raise ValueError('Content cannot be empty')
        
        word_count = len(v.strip().split())
        if word_count > 10000:
            raise ValueError(
                f'Content exceeds 10,000 word limit (current: {word_count} words). '
                f'Please reduce the content length.'
            )
        
        return v


class GenerateLyricsResponse(BaseModel):
    """Response model for lyrics generation."""
    
    lyrics: str = Field(
        ...,
        description="Generated song lyrics"
    )
    content_hash: str = Field(
        ...,
        description="SHA-256 hash of the input content for caching"
    )
    cached: bool = Field(
        default=False,
        description="Whether the lyrics were retrieved from cache"
    )
    processing_time: float = Field(
        ...,
        description="Time taken to generate lyrics in seconds",
        ge=0
    )
