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
clean_text(content)
summarize(content)
convert_to_lyrics(summary)
send_to_suno(lyrics)
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

- Text input box (paste educational material)
- "**Generate Lyrics**" button
- Loading state display

### Backend Process

1. Frontend sends input text to Python backend API
2. Backend uses Langraph to organize, summarize, and compress
3. Backend calls LLM to generate lyrics
4. Returns lyrics to frontend

---

## **Page B: Lyrics Editing Page**

**Purpose: Display AI-generated lyrics and allow users to freely modify them**

### Features

- Lyrics display area
- Editable text field
- "Generate Song" button
- Style selection (MVP can be fixed or provide 8 simple choices)

### Backend Process

1. Frontend sends lyrics to backend API
2. Backend dynamically calls Suno API to create song generation task
3. Returns song task ID
4. Frontend starts polling or waiting for song completion

---

## **Page C: Song Playback Page**

**Purpose: Play music returned by Suno**

### Features

- Music player (play, pause, download)
- Synchronized lyrics display (scrolls with playback)
- "Regenerate Song" button (optional)

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
- HTML5 Audio or Wavesurfer.js
- Oxlint (daily), ESLint (final testing)
- Jest

---

## **Backend (Python)**

- FastAPI (lightweight, fast, perfect for MVP)
  - Firestore (song records, lyrics records)
  - Firebase Storage (store songs)

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

If you need:

- API interface format (request/response)
- ERD + system architecture diagram
- UI wireframe sketches
- Actual code examples

I can help you with these in the next step.
