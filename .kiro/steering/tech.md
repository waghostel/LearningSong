# Technology Stack

## Frontend
- React 19 + TypeScript, Vite, pnpm
- TailwindCSS 4 + shadcn/ui, Zustand, Axios + TanStack Query v5
- Socket.IO Client, Jest + RTL
- Linting: Oxlint (fast) + ESLint (thorough)
- Path alias: `@/` → `./src/`

## Backend
- FastAPI (Python 3.11+), Poetry
- LangChain + LangGraph, Firebase (Auth, Firestore, Storage)
- Pydantic v2, pytest + pytest-asyncio + pytest-cov

## External Services
- Suno API (music generation)
- Google Search API (optional grounding)
- Firebase, Redis (optional caching)

## Quick Commands

```bash
# Frontend (cd frontend)
pnpm dev          # Dev server :5173
pnpm lint         # Oxlint
pnpm test         # Jest

# Backend (cd backend)
poetry run uvicorn app.main:app --reload  # Dev server :8000
poetry run pytest                          # Tests
poetry run pytest --cov=app               # Coverage
```

## Dev Workflow
1. Backend first (:8000), then frontend (:5173)
2. Frontend proxies `/api` to backend
3. API docs: http://localhost:8000/docs
