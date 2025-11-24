"""Tests for rate limiter service."""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException

from app.services.rate_limiter import (
    check_rate_limit,
    get_rate_limit,
    increment_usage,
    _get_next_midnight_utc
)


@pytest.fixture
def mock_firestore_client():
    """Create a mock Firestore client."""
    return MagicMock()


@pytest.fixture
def mock_user_ref(mock_firestore_client):
    """Create a mock user document reference."""
    user_ref = MagicMock()
    mock_firestore_client.collection.return_value.document.return_value = user_ref
    return user_ref


@pytest.fixture
def current_time():
    """Get a fixed current time for testing."""
    return datetime(2024, 1, 15, 14, 30, 0, tzinfo=timezone.utc)


@pytest.fixture
def next_midnight(current_time):
    """Get the next midnight UTC from current_time."""
    return datetime(2024, 1, 16, 0, 0, 0, tzinfo=timezone.utc)


class TestCheckRateLimit:
    """Tests for check_rate_limit function."""
    
    @pytest.mark.asyncio
    @patch('app.services.rate_limiter.get_firestore_client')
    @patch('app.services.rate_limiter.datetime')
    async def test_new_user_creates_document(
        self, mock_datetime, mock_get_client, mock_firestore_client,
        mock_user_ref, current_time, next_midnight
    ):
        """Test that a new user document is created with initial values."""
        mock_get_client.return_value = mock_firestore_client
        mock_datetime.now.return_value = current_time
        
        # Mock non-existent user
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_user_ref.get.return_value = mock_doc
        
        # Mock _get_next_midnight_utc
        with patch('app.services.rate_limiter._get_next_midnight_utc', return_value=next_midnight):
            await check_rate_limit("new_user_123")
        
        # Verify user document was created
        mock_user_ref.set.assert_called_once()
        call_args = mock_user_ref.set.call_args[0][0]
        assert call_args['songs_generated_today'] == 0
        assert call_args['daily_limit_reset'] == next_midnight
        assert call_args['total_songs_generated'] == 0
    
    @pytest.mark.asyncio
    @patch('app.services.rate_limiter.get_firestore_client')
    async def test_user_within_limit_passes(
        self, mock_get_client, mock_firestore_client,
        mock_user_ref, current_time, next_midnight
    ):
        """Test that user with usage < 3 passes rate limit check."""
        mock_get_client.return_value = mock_firestore_client
        
        # Use a reset time in the future relative to now
        future_reset = datetime.now(timezone.utc) + timedelta(days=1)
        
        # Mock existing user with 2 songs generated
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'songs_generated_today': 2,
            'daily_limit_reset': future_reset,
            'total_songs_generated': 5
        }
        mock_user_ref.get.return_value = mock_doc
        
        # Should not raise exception
        await check_rate_limit("user_123")
    
    @pytest.mark.asyncio
    @patch('app.services.rate_limiter.get_firestore_client')
    async def test_user_at_limit_raises_429(
        self, mock_get_client, mock_firestore_client,
        mock_user_ref, current_time, next_midnight
    ):
        """Test that user with 3 songs generated raises 429 error."""
        mock_get_client.return_value = mock_firestore_client
        
        # Use a reset time in the future relative to now
        future_reset = datetime.now(timezone.utc) + timedelta(days=1)
        
        # Mock existing user with 3 songs generated
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'songs_generated_today': 3,
            'daily_limit_reset': future_reset,
            'total_songs_generated': 10
        }
        mock_user_ref.get.return_value = mock_doc
        
        # Should raise HTTPException with 429 status
        with pytest.raises(HTTPException) as exc_info:
            await check_rate_limit("user_123")
        
        assert exc_info.value.status_code == 429
        assert 'Rate limit exceeded' in exc_info.value.detail['error']
        assert 'retry_after' in exc_info.value.detail
    
    @pytest.mark.asyncio
    @patch('app.services.rate_limiter.get_firestore_client')
    async def test_daily_reset_resets_counter(
        self, mock_get_client, mock_firestore_client,
        mock_user_ref, next_midnight
    ):
        """Test that counter resets when reset time has passed."""
        mock_get_client.return_value = mock_firestore_client
        
        # Mock existing user with 3 songs but reset time has passed
        # Use a time in the past so the reset will trigger
        old_reset_time = datetime(2024, 1, 15, 0, 0, 0, tzinfo=timezone.utc)
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'songs_generated_today': 3,
            'daily_limit_reset': old_reset_time,
            'total_songs_generated': 10
        }
        mock_user_ref.get.return_value = mock_doc
        
        await check_rate_limit("user_123")
        
        # Verify counter was reset
        mock_user_ref.update.assert_called_once()
        call_args = mock_user_ref.update.call_args[0][0]
        assert call_args['songs_generated_today'] == 0
        assert 'daily_limit_reset' in call_args


class TestGetRateLimit:
    """Tests for get_rate_limit function."""
    
    @pytest.mark.asyncio
    @patch('app.services.rate_limiter.get_firestore_client')
    @patch('app.services.rate_limiter.datetime')
    async def test_new_user_returns_full_quota(
        self, mock_datetime, mock_get_client, mock_firestore_client,
        mock_user_ref, current_time, next_midnight
    ):
        """Test that new user gets full quota of 3 songs."""
        mock_get_client.return_value = mock_firestore_client
        mock_datetime.now.return_value = current_time
        
        # Mock non-existent user
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_user_ref.get.return_value = mock_doc
        
        with patch('app.services.rate_limiter._get_next_midnight_utc', return_value=next_midnight):
            result = await get_rate_limit("new_user_123")
        
        assert result['remaining'] == 3
        assert result['reset_time'] == next_midnight
    
    @pytest.mark.asyncio
    @patch('app.services.rate_limiter.get_firestore_client')
    async def test_existing_user_returns_correct_remaining(
        self, mock_get_client, mock_firestore_client,
        mock_user_ref, current_time, next_midnight
    ):
        """Test that existing user gets correct remaining count."""
        mock_get_client.return_value = mock_firestore_client
        
        # Use a reset time in the future relative to now
        future_reset = datetime.now(timezone.utc) + timedelta(days=1)
        
        # Mock existing user with 1 song generated
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'songs_generated_today': 1,
            'daily_limit_reset': future_reset,
            'total_songs_generated': 5
        }
        mock_user_ref.get.return_value = mock_doc
        
        result = await get_rate_limit("user_123")
        
        assert result['remaining'] == 2
        assert result['reset_time'] == future_reset
    
    @pytest.mark.asyncio
    @patch('app.services.rate_limiter.get_firestore_client')
    async def test_user_at_limit_returns_zero(
        self, mock_get_client, mock_firestore_client,
        mock_user_ref, current_time, next_midnight
    ):
        """Test that user at limit gets 0 remaining."""
        mock_get_client.return_value = mock_firestore_client
        
        # Use a reset time in the future relative to now
        future_reset = datetime.now(timezone.utc) + timedelta(days=1)
        
        # Mock existing user with 3 songs generated
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'songs_generated_today': 3,
            'daily_limit_reset': future_reset,
            'total_songs_generated': 10
        }
        mock_user_ref.get.return_value = mock_doc
        
        result = await get_rate_limit("user_123")
        
        assert result['remaining'] == 0
        assert result['reset_time'] == future_reset
    
    @pytest.mark.asyncio
    @patch('app.services.rate_limiter.get_firestore_client')
    async def test_after_reset_returns_full_quota(
        self, mock_get_client, mock_firestore_client,
        mock_user_ref
    ):
        """Test that after reset time, user gets full quota again."""
        mock_get_client.return_value = mock_firestore_client
        
        # Mock existing user with 3 songs but reset time has passed
        # Use a time in the past so the reset will trigger
        old_reset_time = datetime(2024, 1, 15, 0, 0, 0, tzinfo=timezone.utc)
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'songs_generated_today': 3,
            'daily_limit_reset': old_reset_time,
            'total_songs_generated': 10
        }
        mock_user_ref.get.return_value = mock_doc
        
        result = await get_rate_limit("user_123")
        
        assert result['remaining'] == 3
        assert 'reset_time' in result


class TestIncrementUsage:
    """Tests for increment_usage function."""
    
    @pytest.mark.asyncio
    @patch('app.services.rate_limiter.get_firestore_client')
    @patch('app.services.rate_limiter.datetime')
    async def test_increment_existing_user(
        self, mock_datetime, mock_get_client, mock_firestore_client,
        mock_user_ref, current_time
    ):
        """Test incrementing usage for existing user."""
        mock_get_client.return_value = mock_firestore_client
        mock_datetime.now.return_value = current_time
        
        # Mock existing user with 1 song generated
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            'songs_generated_today': 1,
            'total_songs_generated': 5
        }
        mock_user_ref.get.return_value = mock_doc
        
        await increment_usage("user_123")
        
        # Verify counters were incremented
        mock_user_ref.update.assert_called_once()
        call_args = mock_user_ref.update.call_args[0][0]
        assert call_args['songs_generated_today'] == 2
        assert call_args['total_songs_generated'] == 6
        assert 'last_generated_at' in call_args
    
    @pytest.mark.asyncio
    @patch('app.services.rate_limiter.get_firestore_client')
    @patch('app.services.rate_limiter.datetime')
    async def test_increment_new_user_creates_document(
        self, mock_datetime, mock_get_client, mock_firestore_client,
        mock_user_ref, current_time, next_midnight
    ):
        """Test that incrementing for new user creates document."""
        mock_get_client.return_value = mock_firestore_client
        mock_datetime.now.return_value = current_time
        
        # Mock non-existent user
        mock_doc = MagicMock()
        mock_doc.exists = False
        mock_user_ref.get.return_value = mock_doc
        
        with patch('app.services.rate_limiter._get_next_midnight_utc', return_value=next_midnight):
            await increment_usage("new_user_123")
        
        # Verify user document was created with count of 1
        mock_user_ref.set.assert_called_once()
        call_args = mock_user_ref.set.call_args[0][0]
        assert call_args['songs_generated_today'] == 1
        assert call_args['total_songs_generated'] == 1


class TestGetNextMidnightUtc:
    """Tests for _get_next_midnight_utc helper function."""
    
    def test_returns_next_midnight(self):
        """Test that function returns next midnight UTC."""
        current = datetime(2024, 1, 15, 14, 30, 0, tzinfo=timezone.utc)
        expected = datetime(2024, 1, 16, 0, 0, 0, tzinfo=timezone.utc)
        
        result = _get_next_midnight_utc(current)
        
        assert result == expected
    
    def test_handles_end_of_month(self):
        """Test that function handles end of month correctly."""
        current = datetime(2024, 1, 31, 23, 59, 59, tzinfo=timezone.utc)
        expected = datetime(2024, 2, 1, 0, 0, 0, tzinfo=timezone.utc)
        
        result = _get_next_midnight_utc(current)
        
        assert result == expected
    
    def test_handles_end_of_year(self):
        """Test that function handles end of year correctly."""
        current = datetime(2024, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
        expected = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        
        result = _get_next_midnight_utc(current)
        
        assert result == expected
    
    def test_handles_naive_datetime(self):
        """Test that function handles naive datetime by adding UTC timezone."""
        current = datetime(2024, 1, 15, 14, 30, 0)  # No timezone
        expected = datetime(2024, 1, 16, 0, 0, 0, tzinfo=timezone.utc)
        
        result = _get_next_midnight_utc(current)
        
        assert result == expected
