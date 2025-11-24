"""
Firebase Admin SDK configuration and initialization.

This module initializes the Firebase Admin SDK and provides
a Firestore client instance for use throughout the application.
"""
import os
from typing import Optional
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore import Client


# Global Firestore client instance
_firestore_client: Optional[Client] = None


def initialize_firebase() -> None:
    """
    Initialize Firebase Admin SDK with service account credentials.
    
    This function should be called once during application startup.
    It reads the credentials path from the FIREBASE_CREDENTIALS_PATH
    environment variable and initializes the Firebase app.
    
    Raises:
        ValueError: If FIREBASE_CREDENTIALS_PATH is not set
        FileNotFoundError: If credentials file doesn't exist
    """
    global _firestore_client
    
    # Check if already initialized
    if _firestore_client is not None:
        return
    
    credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    
    if not credentials_path:
        raise ValueError(
            "FIREBASE_CREDENTIALS_PATH environment variable is not set. "
            "Please set it to the path of your Firebase service account JSON file."
        )
    
    if not os.path.exists(credentials_path):
        raise FileNotFoundError(
            f"Firebase credentials file not found at: {credentials_path}"
        )
    
    # Initialize Firebase Admin SDK
    cred = credentials.Certificate(credentials_path)
    firebase_admin.initialize_app(cred)
    
    # Create Firestore client
    _firestore_client = firestore.client()


def get_firestore_client() -> Client:
    """
    Get the Firestore client instance.
    
    Returns:
        Client: Firestore client instance
        
    Raises:
        RuntimeError: If Firebase has not been initialized
    """
    if _firestore_client is None:
        raise RuntimeError(
            "Firebase has not been initialized. "
            "Call initialize_firebase() first."
        )
    return _firestore_client


# Convenience export for direct import
firestore_client = get_firestore_client
