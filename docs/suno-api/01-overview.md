# Suno API Documentation Overview

## Base URL
```
https://api.sunoapi.org
```

## Authentication
All API requests require Bearer token authentication:
```
Authorization: Bearer YOUR_API_KEY
```

Get your API key from: https://sunoapi.org/api-key

## Key Features
- Music Generation (V3_5, V4, V4_5, V4_5PLUS, V5 models)
- Lyrics Creation
- Audio Extension
- Vocal/Instrumental Separation
- WAV Format Conversion
- Music Video Generation

## Status Codes
- 200: Success
- 400: Invalid parameters
- 401: Unauthorized
- 404: Invalid request
- 429: Insufficient credits
- 500: Server error

## File Retention
Generated files are stored for **15 days** before automatic deletion.
