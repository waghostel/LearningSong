"""Tests for API endpoints."""

import pytest


async def test_health_check(client):
    """
    Test the health check endpoint returns 200 OK.

    Args:
        client: Async HTTP client fixture
    """
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"


async def test_root_endpoint(client):
    """
    Test the root endpoint returns welcome message.

    Args:
        client: Async HTTP client fixture
    """
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
