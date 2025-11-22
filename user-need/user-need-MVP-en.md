# 🎵 AI Learning Song Creator — MVP Product Specification

---

# 1. User Needs

The core user groups for this product include students, teachers, and self-learners. The main goal is to help them convert knowledge content into memorable and engaging songs.

## Primary User Needs

1. **Transform learning content into memorable songs**: Users paste educational material (text), and the system automatically converts it into singable, memorable lyrics and generates a song.
2. **Obtain playable learning songs quickly**: Simple process that doesn't require musical knowledge.
3. **Edit lyrics**: Users can manually adjust lyrics after generation.
4. **Play and download songs**: Direct listening, sharing, and saving capabilities.
5. Customize song style (MVP version provides several preset options)

## Not Required for MVP

- User registration/login (using Firebase with anonymous login)
- Upload PDF, DOCX (future version)
- Multi-language songs (future version)
- Content moderation/filtering (future version)

## MVP Constraints & Limits

- **Anonymous user data retention**: 48 hours
- **Rate limiting**: 3 songs per day per anonymous user
- **Max input text length**: 10,000 words
- **Min input text length**: No minimum (use Google Search grounding for short queries)

---

# 2. Page Planning & Functionality (UI & UX Flow)

MVP requires only three pages.

---

# 3. Technology Stack

## Frontend

- **React + TypeScript**: Main frontend framework
- **Zustand**: Frontend state management (lighter and simpler than Redux)
- **react-query**: Unified API request management, caching, loading/error states
- **Vite**: Frontend build tool, no need for SWC
- **TailwindCSS + shadcn/ui**: UI Framework

## Backend

- **Python + FastAPI**: Main backend framework
  - FastAPI + Pydantic
    - Auto-generate API docs (/docs)
    - Clear schema validation
    - Suitable for REST API structure

## Firebase (Backend Cloud Service for MVP)

- **Firestore**: Store content, summaries, lyrics, generation records
- **Firebase Storage**: Store audio files (if not relying on Suno URLs)
- **Firebase Hosting**: Deploy React frontend
- **Firebase Functions (future version)**: Can serve as part of backend logic

## Multi-step Processing (AI Pipeline)

Use **LangGraph / LangChain** to build a visualized workflow:

```
[User Input] 
    ↓
[Check if Google Search needed] (toggle button)
    ↓ (if enabled)
[Google Search Grounding] → Enrich content
    ↓
[Clean Text] → Remove formatting, special characters
    ↓
[Summarize] → Extract key learning points
    ↓
[Validate Summary Length] → Check if within Suno limits
    ↓ (if too long: truncate/split, if too short: expand)
[Convert to Lyrics] → Apply rhyme, rhythm, structure
    ↓
[Preview Lyrics] → User reviews and edits
    ↓
[Send to Suno] → Generate song
```

### Pipeline Details

1. **Google Search Grounding** (optional, user toggle):
   - Triggered when input is short or question-like
   - Enriches content with relevant information
   - Uses Google Search API to find educational context

2. **Clean Text**: Remove HTML tags, special formatting, excessive whitespace

3. **Summarize**: Extract 3-5 key learning points (max 500 words)

4. **Validate Summary Length**: 
   - Check if summary fits Suno's character limits
   - If too long: intelligently truncate or suggest splitting
   - If too short: expand with context

5. **Convert to Lyrics**: 
   - Apply song structure (verse, chorus, bridge)
   - Add rhyme scheme
   - Ensure singability

### LangGraph State Machine

```python
class PipelineState(TypedDict):
    user_input: str
    search_enabled: bool
    enriched_content: str
    cleaned_text: str
    summary: str
    summary_valid: bool
    lyrics: str
    error: Optional[str]

# Nodes
- check_search_needed
- google_search_grounding
- clean_text
- summarize
- validate_summary_length
- convert_to_lyrics
- handle_error

# Edges (conditional routing)
- If search_enabled → google_search_grounding
- If summary too long → truncate and retry
- If summary too short → expand and retry
- If validation passes → convert_to_lyrics
```

## Music Generation

- **Suno API** (main functionality):
  - Generate lyrics (optional)
  - Generate songs from lyrics
  - Return audio file URL, task status, etc.

---

---

## **Page A: Home / Text Input Page**

**Purpose: Input educational content → Submit → System generates lyrics**

### Features

- Text input box (paste educational material, max 10,000 words)
- Character counter display
- **Google Search toggle button** (enable/disable search grounding)
- "**Generate Lyrics**" button
- Loading state display with progress indicator
- Rate limit indicator (X/3 songs remaining today)

### Backend Process

1. Frontend sends input text to Python backend API
2. Backend uses Langraph to organize, summarize, and compress
3. Backend calls LLM to generate lyrics
4. Returns lyrics to frontend

---

## **Page B: Lyrics Editing Page**

**Purpose: Display AI-generated lyrics and allow users to freely modify them**

### Features

- **Lyrics preview area** (read-only display of AI-generated lyrics)
- **Editable text field** (users can modify lyrics before generation)
- Character count indicator (with Suno limit warning)
- **Style selection dropdown** with 8 preset genres:
  1. Pop (upbeat, catchy)
  2. Rap/Hip-Hop (rhythmic, fast-paced)
  3. Folk/Acoustic (gentle, storytelling)
  4. Electronic/EDM (energetic, modern)
  5. Rock (powerful, memorable)
  6. Jazz (smooth, sophisticated)
  7. Children's Song (simple, fun)
  8. Classical/Orchestral (elegant, dramatic)
- "**Generate Song**" button
- Estimated generation time display (30-60 seconds)

### Backend Process

1. Frontend sends lyrics + style to backend API
2. Backend validates lyrics length and format
3. Backend calls Suno API to create song generation task
4. Returns song task ID to frontend
5. **WebSocket connection established** for real-time status updates
6. Backend monitors Suno task and pushes updates via WebSocket
7. When complete, sends browser notification to user

---

## **Page C: Song Playback Page**

**Purpose: Play music returned by Suno**

### Features

- Music player (play, pause, download)
- Synchronized lyrics display (scrolls with playback)
- "Regenerate Song" button (counts toward daily limit)
- Share button (copy link - valid for 48 hours)
- Song metadata display (style, generation date, expiry time)

### Backend Process

1. Frontend requests backend to retrieve Suno music URL
2. Player loads URL

---

# 3. Technology Architecture (Tech Stack)

Designed according to your requirements: React TypeScript frontend + Python backend + Firebase infrastructure.

---

## **Frontend (React + TypeScript)**

- React + Vite
- TailwindCSS / shadcn UI
- Axios (call backend API)
- **Socket.IO Client** (WebSocket for real-time updates)
- **Browser Notification API** (notify when song is ready)
- HTML5 Audio or Wavesurfer.js
- Oxlint (daily), ESLint (final testing)
- Jest

---

## **Backend (Python)**

- **FastAPI** (lightweight, fast, perfect for MVP)
- **Socket.IO** (WebSocket server for real-time communication)
- **Firebase Admin SDK**:
  - Firestore (song records, lyrics records, user rate limits)
  - Firebase Storage (store songs)
- **Google Search API** (for search grounding feature)
- **Celery + Redis** (optional: for background task queue and retry logic)

---

## **AI Technology (Content → Song Lyrics)**

- **Clean Text** → Remove formatting, tags
- **Summarize** → Extract key points
- **Lyricify** → Rewrite with rhyme and rhythm

---

## **Music Generation Technology (Suno API)**

### Required APIs

1. **Generate Music API** (main API)

   - Input: lyrics (text), style (can be preset), title
   - Returns: task ID

2. **Get Music Task Status API**

   - Query music generation progress using task ID

3. **Get Generated Audio URL** (after task completion)

   - Returns mp3 audio file URL

---

## **DevOps / Hosting**

- Firebase Hosting (frontend)
- Firebase Functions (backend)

---

## **Error Handling Strategy**

### Suno API Failures

1. **Timeout (>90 seconds)**:
   - User-friendly message: "Song generation is taking longer than expected. We'll notify you when it's ready!"
   - Backend continues monitoring task
   - Send browser notification when complete

2. **API Error (500, 503)**:
   - Automatic retry: 3 attempts with exponential backoff (5s, 15s, 45s)
   - If all retries fail: "We're having trouble generating your song. Please try again in a few minutes."
   - Log error to Firestore for monitoring

3. **Rate Limit Hit (429)**:
   - User message: "You've reached your daily limit of 3 songs. Come back tomorrow!"
   - Display countdown timer to reset

4. **Invalid Lyrics (400)**:
   - User message: "These lyrics don't meet the requirements. Please try editing them."
   - Highlight problematic sections if possible

### Network Errors

- WebSocket disconnection: Auto-reconnect with exponential backoff
- Frontend offline: Show offline indicator, queue actions for when online
- Firebase errors: Generic message + log for debugging

### User-Friendly Error Messages

All errors shown to users should be:
- Clear and actionable
- Non-technical language
- Include next steps or suggestions
- Avoid exposing internal system details

---

## **Caching Strategy**

### Goal
Reduce Suno API costs and improve response time by caching similar content.

### Implementation

1. **Content Hash Generation**:
   - When user submits text, generate SHA-256 hash of cleaned + summarized content
   - Check Firestore for existing songs with same content hash

2. **Cache Storage (Firestore)**:
   ```
   Collection: cached_songs
   Document ID: content_hash
   Fields:
   - content_hash: string
   - original_text_sample: string (first 200 chars for reference)
   - lyrics: string
   - song_url: string
   - style: string
   - created_at: timestamp
   - hit_count: number (how many times reused)
   - last_accessed: timestamp
   ```

3. **Cache Hit Flow**:
   - If exact match found AND style matches:
     - Return cached song immediately
     - Increment hit_count
     - Update last_accessed
     - Show user: "We found a similar song we made earlier!"

4. **Cache Miss Flow**:
   - Generate new song via Suno
   - Store in cache after successful generation

5. **Cache Invalidation**:
   - TTL: 30 days (songs older than 30 days are deleted)
   - Storage limit: Keep max 1000 cached songs
   - When limit reached: Delete least recently accessed songs

6. **Cache Bypass**:
   - If user edits lyrics manually: bypass cache (treat as unique)
   - "Regenerate Song" button: bypass cache, generate fresh

### Benefits
- Estimated 20-40% cost reduction for MVP testing
- Instant results for duplicate content
- Better user experience for common educational topics

---

# 4. Future Development Features (Non-MVP Feature List)

These are features that can be added in the future but are not currently being developed.

## A. More File Sources

- Upload PDF, DOCX, automatic text extraction
- URL-based material fetching

## B. Style Expansion

- User-defined song length, rhythm, language

## C. Advanced Lyrics Editing

- Automatic rhyme suggestions
- Automatic phrase simplification
- Automatic chorus/bridge addition

## D. Course Song Management

- My songs list
- Teachers sharing songs with students

## E. Complete Member System

- Google/Email login
- Personal profile, history records

## F. AI Explanation Mode

- Use Nano banana Pro to generate explanation slides about song content
- Generate a singing video combined with music

---

# ✔️ Document Status

This is a **complete MVP specification**:

- Contains only essential workflows
- Frontend: React + TS
- Backend: Python
- Uses Firebase for deployment and storage
- Uses LangGraph to process text → lyrics
- Uses Suno API to generate songs

---

# 5. API Specifications

## Backend API Endpoints

### 1. Generate Lyrics
```
POST /api/lyrics/generate
Content-Type: application/json

Request:
{
  "content": "string (max 10000 words)",
  "search_enabled": boolean
}

Response (200):
{
  "lyrics": "string",
  "content_hash": "string",
  "cached": boolean,
  "processing_time": number
}

Response (400):
{
  "error": "Content too long" | "Invalid input"
}

Response (429):
{
  "error": "Rate limit exceeded",
  "retry_after": number (seconds until reset)
}
```

### 2. Generate Song
```
POST /api/songs/generate
Content-Type: application/json

Request:
{
  "lyrics": "string",
  "style": "pop" | "rap" | "folk" | "electronic" | "rock" | "jazz" | "children" | "classical",
  "content_hash": "string (optional, for caching)"
}

Response (200):
{
  "task_id": "string",
  "estimated_time": number (seconds)
}

Response (400):
{
  "error": "Lyrics too long" | "Invalid style"
}

Response (429):
{
  "error": "Rate limit exceeded",
  "songs_remaining": number
}
```

### 3. Get Song Status (via WebSocket)
```
WebSocket: ws://api.example.com/ws/song-status

Client → Server:
{
  "action": "subscribe",
  "task_id": "string"
}

Server → Client (updates):
{
  "task_id": "string",
  "status": "queued" | "processing" | "completed" | "failed",
  "progress": number (0-100),
  "song_url": "string (when completed)",
  "error": "string (if failed)"
}
```

### 4. Get User Rate Limit
```
GET /api/user/rate-limit

Response (200):
{
  "songs_remaining": number,
  "reset_at": timestamp,
  "total_limit": 3
}
```

### 5. Get Song Details
```
GET /api/songs/{song_id}

Response (200):
{
  "song_id": "string",
  "song_url": "string",
  "lyrics": "string",
  "style": "string",
  "created_at": timestamp,
  "expires_at": timestamp (created_at + 48 hours)
}

Response (404):
{
  "error": "Song not found or expired"
}
```

---

# 6. Database Schema (Firestore)

## Collection: users
```
Document ID: anonymous_user_id
{
  created_at: timestamp,
  last_active: timestamp,
  songs_generated_today: number,
  daily_limit_reset: timestamp
}
```

## Collection: songs
```
Document ID: auto-generated
{
  user_id: string,
  content_hash: string,
  lyrics: string,
  style: string,
  song_url: string,
  suno_task_id: string,
  created_at: timestamp,
  expires_at: timestamp,
  status: "processing" | "completed" | "failed"
}
```

## Collection: cached_songs
```
Document ID: content_hash
{
  content_hash: string,
  original_text_sample: string,
  lyrics: string,
  song_url: string,
  style: string,
  created_at: timestamp,
  last_accessed: timestamp,
  hit_count: number
}
```

## Collection: lyrics_history
```
Document ID: auto-generated
{
  user_id: string,
  original_content: string,
  search_enabled: boolean,
  generated_lyrics: string,
  created_at: timestamp,
  expires_at: timestamp
}
```

---

If you need:

- ERD + system architecture diagram
- UI wireframe sketches
- Actual code examples
- Deployment configuration

I can help you with these in the next step.
