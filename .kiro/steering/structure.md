# Project Structure

## Layout
```
/
├── frontend/     # React + TypeScript + Vite
├── backend/      # Python + FastAPI
├── docs/         # Documentation + Suno API docs
├── user-need/    # Product requirements
├── report/       # Generated reports
└── scripts/      # Dev utilities
```

## Frontend (`frontend/src/`)
```
api/          # client.ts, lyrics.ts, songs.ts
components/   # UI components
  ui/         # shadcn/ui primitives
hooks/        # useAuth, useLyrics, useWebSocket, useSongGeneration, etc.
lib/          # firebase.ts, utils.ts, toast-utils.ts
pages/        # TextInputPage, LyricsEditingPage
stores/       # textInputStore, lyricsEditingStore (Zustand)
```

## Backend (`backend/app/`)
```
api/          # lyrics.py, songs.py, websocket.py
core/         # auth.py, firebase.py, logging.py
models/       # lyrics.py, songs.py, user.py
services/     # ai_pipeline, suno_client, google_search, cache, rate_limiter, song_storage
```

## Conventions
- **Frontend**: Functional components, Zustand state, TanStack Query, `@/` alias
- **Backend**: Async FastAPI, Pydantic validation, services for business logic
- **Testing**: Jest+RTL (frontend), pytest (backend), mock external APIs
- **Reports**: Output to `./report/`, no markdown summaries in chat
