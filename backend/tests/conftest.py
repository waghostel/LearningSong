"""Pytest configuration and fixtures."""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
async def client():
    """
    Asynchronous test client for FastAPI app.

    Returns:
        AsyncClient instance for making async requests
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_lyrics():
    """
    Sample lyrics for testing.

    Returns:
        String containing sample song lyrics
    """
    return """Verse 1:
Learning is a journey, not a race
Every step we take, we find our place
With knowledge as our guide, we'll find the way
Growing stronger every single day"""


@pytest.fixture
def sample_topic():
    """
    Sample learning topic for testing.

    Returns:
        String containing a sample topic
    """
    return "Python programming basics"
