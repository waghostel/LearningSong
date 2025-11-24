"""
Authentication module for Firebase token verification.

This module provides FastAPI dependencies for authenticating users
via Firebase ID tokens passed in the Authorization header.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth


# HTTP Bearer token security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    FastAPI dependency to verify Firebase ID token and extract user ID.
    
    This function extracts the Firebase ID token from the Authorization header,
    verifies it using Firebase Admin SDK, and returns the authenticated user's ID.
    
    Args:
        credentials: HTTP Bearer token credentials from the Authorization header
        
    Returns:
        str: The authenticated user's Firebase UID
        
    Raises:
        HTTPException: 401 if token is invalid, expired, or missing
        HTTPException: 403 if token verification fails for other reasons
        
    Example:
        @app.get("/protected")
        async def protected_route(user_id: str = Depends(get_current_user)):
            return {"user_id": user_id}
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Verify the Firebase ID token
        decoded_token = auth.verify_id_token(token)
        
        # Extract user ID from the decoded token
        user_id = decoded_token.get("uid")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_id
    
    except HTTPException:
        # Re-raise HTTPExceptions (like the missing UID check above)
        raise
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.CertificateFetchError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify token: certificate fetch failed",
        )
    except auth.InvalidIdTokenError:
        # Catch InvalidIdTokenError and its subclasses (like RevokedIdTokenError)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        # Catch any other unexpected errors
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Token verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[str]:
    """
    FastAPI dependency to optionally verify Firebase ID token.
    
    Similar to get_current_user but returns None if no token is provided
    instead of raising an exception. Useful for endpoints that support
    both authenticated and anonymous access.
    
    Args:
        credentials: Optional HTTP Bearer token credentials
        
    Returns:
        Optional[str]: The authenticated user's Firebase UID, or None if no token provided
        
    Raises:
        HTTPException: 401 if token is provided but invalid
    """
    if not credentials:
        return None
    
    # If credentials are provided, verify them
    return await get_current_user(credentials)
