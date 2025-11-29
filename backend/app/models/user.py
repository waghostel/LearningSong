"""Pydantic models for user-related data."""

from datetime import datetime
from pydantic import BaseModel, Field


class RateLimitResponse(BaseModel):
    """Response model for rate limit information."""
    
    remaining: int = Field(
        ...,
        description="Number of songs remaining for today",
        ge=0,
        le=3
    )
    reset_time: datetime = Field(
        ...,
        description="UTC timestamp when the rate limit resets (midnight UTC)"
    )
    total_limit: int = Field(
        default=3,
        description="Total number of songs allowed per day",
        ge=1
    )
