# Project Structure

## Repository Layout

```
/
├── frontend/          # React + TypeScript + Vite frontend
├── backend/           # Python + FastAPI backend
├── docs/              # Documentation (including Suno API docs)
├── user-need/         # Product requirements and specifications
├── report/            # Generated reports (lint, test, analysis)
├── scripts/           # Development and utility scripts
└── README.md          # Main project documentation
```

## Frontend Structure

```
frontend/
├── src/
│   ├── api/           # API client
│   │   ├── client.ts  # Axios instance + interceptors
│   │   └── lyrics.ts  # Lyrics API calls
│   ├── assets/        # Static assets
│   ├── components/    # React components
│   │   ├── ui/        # shadcn/ui (button, card, input, toggle, etc.)
│   │   ├── ErrorBoundary.tsx
│   │   ├── GenerateButton.tsx
│   │   ├── LoadingProgress.tsx
│   │   ├── RateLimitIndicator.tsx
│   │   ├── SearchToggle.tsx
│   │   └── TextInputArea.tsx
│   ├── hooks/         # Custom hooks
│   │   ├── useAuth.ts    # Firebase auth hook
│   │   └── useLyrics.ts  # Lyrics generation hook
│   ├── lib/           # Utilities
│   │   ├── firebase.ts   # Firebase config
│   │   ├── toast-utils.ts # Toast notifications
│   │   └── utils.ts      # cn() and helpers
│   ├── pages/         # Page components
│   │   └── TextInputPage.tsx
│   ├── stores/        # Zustand stores
│   │   └── textInputStore.ts
│   ├── App.tsx        # Main app
│   ├── main.tsx       # Entry point
│   └── index.css      # Global styles
├── tests/             # Jest tests
└── public/            # Public files
```

## Backend Structure

```
backend/
├── app/
│   ├── api/           # API route handlers
│   │   └── lyrics.py  # Lyrics generation endpoints
│   ├── core/          # Core configuration
│   │   ├── auth.py    # Firebase authentication
│   │   ├── firebase.py # Firebase initialization
│   │   └── logging.py # Logging configuration
│   ├── models/        # Pydantic models
│   │   ├── lyrics.py  # Lyrics request/response models
│   │   └── user.py    # User models
│   ├── services/      # Business logic
│   │   ├── ai_pipeline.py    # LangGraph text → lyrics
│   │   ├── suno_client.py    # Suno API integration
│   │   ├── google_search.py  # Google Search grounding
│   │   ├── cache.py          # Content caching
│   │   └── rate_limiter.py   # Rate limiting
│   ├── utils/         # Helper utilities
│   └── main.py        # FastAPI entry point
├── tests/             # pytest tests
├── pyproject.toml     # Poetry configuration
└── poetry.lock        # Locked dependencies
```

## Key Config Files

**Frontend**: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `jest.config.js`, `eslint.config.js`, `oxlint.json`

**Backend**: `pyproject.toml`, `.env.example`

## Key Conventions

**Frontend**: Functional components + hooks, Zustand for shared state, TanStack Query for server state, UI components in `components/ui/`, pages in `pages/`, use `@/` alias

**Backend**: FastAPI async/await, Pydantic models for validation, business logic in `services/`, thin route handlers, dependency injection, async I/O

**Testing**: Frontend (Jest + RTL in `tests/`), Backend (pytest in `tests/`), mock external APIs

**Reports**: All generated reports go in `./report/` folder, output results in chat (no markdown summaries)
