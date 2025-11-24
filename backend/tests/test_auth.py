"""Tests for authentication module."""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from firebase_admin import auth as firebase_auth

from app.core.auth import get_current_user, get_optional_user


@pytest.fixture
def mock_credentials():
    """
    Create mock HTTP authorization credentials.
    
    Returns:
        Mock HTTPAuthorizationCredentials with a test token
    """
    credentials = Mock(spec=HTTPAuthorizationCredentials)
    credentials.credentials = "valid_test_token_123"
    return credentials


@pytest.fixture
def mock_decoded_token():
    """
    Create mock decoded Firebase token.
    
    Returns:
        Dictionary representing a decoded Firebase ID token
    """
    return {
        "uid": "test_user_123",
        "email": "test@example.com",
        "iss": "https://securetoken.google.com/test-project",
        "aud": "test-project",
        "auth_time": 1234567890,
        "sub": "test_user_123",
    }


class TestGetCurrentUser:
    """Tests for get_current_user dependency."""
    
    @pytest.mark.asyncio
    @patch("app.core.auth.auth.verify_id_token")
    async def test_valid_token_returns_user_id(
        self, mock_verify, mock_credentials, mock_decoded_token
    ):
        """
        Test that a valid token returns the user ID.
        
        Args:
            mock_verify: Mocked Firebase verify_id_token function
            mock_credentials: Mock credentials fixture
            mock_decoded_token: Mock decoded token fixture
        """
        mock_verify.return_value = mock_decoded_token
        
        user_id = await get_current_user(mock_credentials)
        
        assert user_id == "test_user_123"
        mock_verify.assert_called_once_with("valid_test_token_123")
    
    @pytest.mark.asyncio
    async def test_missing_credentials_raises_401(self):
        """Test that missing credentials raises 401 Unauthorized."""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(None)
        
        assert exc_info.value.status_code == 401
        assert "Authorization header is missing" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_empty_token_raises_401(self):
        """Test that empty token raises 401 Unauthorized."""
        credentials = Mock(spec=HTTPAuthorizationCredentials)
        credentials.credentials = ""
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials)
        
        assert exc_info.value.status_code == 401
        assert "Bearer token is missing" in exc_info.value.detail
    
    @pytest.mark.asyncio
    @patch("app.core.auth.auth.verify_id_token")
    async def test_invalid_token_raises_401(self, mock_verify, mock_credentials):
        """
        Test that invalid token raises 401 Unauthorized.
        
        Args:
            mock_verify: Mocked Firebase verify_id_token function
            mock_credentials: Mock credentials fixture
        """
        mock_verify.side_effect = firebase_auth.InvalidIdTokenError("Invalid token")
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(mock_credentials)
        
        assert exc_info.value.status_code == 401
        assert "Invalid authentication token" in exc_info.value.detail
    
    @pytest.mark.asyncio
    @patch("app.core.auth.auth.verify_id_token")
    async def test_expired_token_raises_401(self, mock_verify, mock_credentials):
        """
        Test that expired token raises 401 Unauthorized.
        
        Args:
            mock_verify: Mocked Firebase verify_id_token function
            mock_credentials: Mock credentials fixture
        """
        # ExpiredIdTokenError requires a message and cause parameter
        mock_verify.side_effect = firebase_auth.ExpiredIdTokenError(
            "Token expired", cause=Exception("Token expired")
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(mock_credentials)
        
        assert exc_info.value.status_code == 401
        assert "Authentication token has expired" in exc_info.value.detail
    
    @pytest.mark.asyncio
    @patch("app.core.auth.auth.verify_id_token")
    async def test_revoked_token_raises_401(self, mock_verify, mock_credentials):
        """
        Test that revoked token raises 401 Unauthorized.
        
        Args:
            mock_verify: Mocked Firebase verify_id_token function
            mock_credentials: Mock credentials fixture
        """
        # RevokedIdTokenError is a subclass of InvalidIdTokenError
        # It will be caught by the InvalidIdTokenError handler
        mock_verify.side_effect = firebase_auth.RevokedIdTokenError("Token revoked")
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(mock_credentials)
        
        assert exc_info.value.status_code == 401
        # RevokedIdTokenError is caught by InvalidIdTokenError handler
        assert "Invalid authentication token" in exc_info.value.detail
    
    @pytest.mark.asyncio
    @patch("app.core.auth.auth.verify_id_token")
    async def test_certificate_fetch_error_raises_503(
        self, mock_verify, mock_credentials
    ):
        """
        Test that certificate fetch error raises 503 Service Unavailable.
        
        Args:
            mock_verify: Mocked Firebase verify_id_token function
            mock_credentials: Mock credentials fixture
        """
        # CertificateFetchError requires a message and cause parameter
        mock_verify.side_effect = firebase_auth.CertificateFetchError(
            "Cannot fetch certificates", cause=Exception("Network error")
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(mock_credentials)
        
        assert exc_info.value.status_code == 503
        assert "certificate fetch failed" in exc_info.value.detail
    
    @pytest.mark.asyncio
    @patch("app.core.auth.auth.verify_id_token")
    async def test_missing_uid_in_token_raises_401(
        self, mock_verify, mock_credentials
    ):
        """
        Test that token without UID raises 401 Unauthorized.
        
        Args:
            mock_verify: Mocked Firebase verify_id_token function
            mock_credentials: Mock credentials fixture
        """
        # Token without 'uid' field
        mock_verify.return_value = {"email": "test@example.com"}
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(mock_credentials)
        
        # Should raise 401 because we explicitly check for missing UID
        assert exc_info.value.status_code == 401
        assert "User ID not found in token" in exc_info.value.detail
    
    @pytest.mark.asyncio
    @patch("app.core.auth.auth.verify_id_token")
    async def test_unexpected_error_raises_403(self, mock_verify, mock_credentials):
        """
        Test that unexpected errors raise 403 Forbidden.
        
        Args:
            mock_verify: Mocked Firebase verify_id_token function
            mock_credentials: Mock credentials fixture
        """
        mock_verify.side_effect = Exception("Unexpected error")
        
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(mock_credentials)
        
        assert exc_info.value.status_code == 403
        assert "Token verification failed" in exc_info.value.detail


class TestGetOptionalUser:
    """Tests for get_optional_user dependency."""
    
    @pytest.mark.asyncio
    async def test_no_credentials_returns_none(self):
        """Test that missing credentials returns None instead of raising."""
        user_id = await get_optional_user(None)
        assert user_id is None
    
    @pytest.mark.asyncio
    @patch("app.core.auth.auth.verify_id_token")
    async def test_valid_credentials_returns_user_id(
        self, mock_verify, mock_credentials, mock_decoded_token
    ):
        """
        Test that valid credentials return user ID.
        
        Args:
            mock_verify: Mocked Firebase verify_id_token function
            mock_credentials: Mock credentials fixture
            mock_decoded_token: Mock decoded token fixture
        """
        mock_verify.return_value = mock_decoded_token
        
        user_id = await get_optional_user(mock_credentials)
        
        assert user_id == "test_user_123"
    
    @pytest.mark.asyncio
    @patch("app.core.auth.auth.verify_id_token")
    async def test_invalid_credentials_raises_401(self, mock_verify, mock_credentials):
        """
        Test that invalid credentials still raise 401.
        
        Args:
            mock_verify: Mocked Firebase verify_id_token function
            mock_credentials: Mock credentials fixture
        """
        mock_verify.side_effect = firebase_auth.InvalidIdTokenError("Invalid token")
        
        with pytest.raises(HTTPException) as exc_info:
            await get_optional_user(mock_credentials)
        
        assert exc_info.value.status_code == 401
