# Suno API Documentation

This folder contains essential Suno API documentation for the Learning Song Creator project.

## Files
1. `01-overview.md` - API basics, authentication, status codes
2. `02-generate-music.md` - Music generation endpoint details
3. `03-generate-lyrics.md` - Lyrics generation endpoint details
4. `04-get-task-status.md` - Task status checking
5. `05-models.md` - Available AI models and their capabilities

## Quick Reference

### Base URL
```
https://api.sunoapi.org
```

### Authentication
```
Authorization: Bearer YOUR_API_KEY
```

### Main Endpoints
- `POST /api/v1/generate` - Generate music
- `POST /api/v1/lyrics` - Generate lyrics
- `GET /api/v1/generate/record-info` - Check task status
- `GET /api/v1/get-credits` - Check remaining credits

### For Complete Documentation
Visit: https://docs.sunoapi.org/

## Integration Notes for Learning Song Project

### Workflow
1. User inputs educational content
2. Backend processes and summarizes content
3. Call `/api/v1/lyrics` to generate song lyrics
4. User reviews/edits lyrics
5. Call `/api/v1/generate` with lyrics to create song
6. Poll `/api/v1/generate/record-info` or use WebSocket for status
7. Return audio URL to frontend for playback

### Recommended Settings for MVP
- Model: V4_5 (good balance of quality and speed)
- customMode: true
- instrumental: false (we want vocals)
- Use callbacks or WebSocket for real-time updates
