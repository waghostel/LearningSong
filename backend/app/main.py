"""
FastAPI application entry point for AI Learning Song Creator.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.core.firebase import initialize_firebase
from app.core.logging import configure_logging, RequestLoggingMiddleware
from app.api.lyrics import router as lyrics_router

# Load environment variables
load_dotenv()

# Configure structured logging
log_level = os.getenv("LOG_LEVEL", "INFO")
configure_logging(log_level=log_level)

app = FastAPI(
    title="AI Learning Song Creator API",
    description="Backend API for generating educational songs with AI",
    version="0.1.0"
)

# Initialize Firebase on startup
@app.on_event("startup")
async def startup_event():
    """Initialize services on application startup."""
    try:
        initialize_firebase()
    except Exception as e:
        # Log the error but don't crash the app in development
        print(f"Warning: Firebase initialization failed: {e}")
        print("The app will continue but Firebase-dependent features will not work.")

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "AI Learning Song Creator API"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# Register API routers
app.include_router(lyrics_router)
