# Technology Stack

## Frontend
- React 19 + TypeScript, Vite, pnpm
- TailwindCSS 4 + shadcn/ui, Zustand, Axios + TanStack Query v5
- Socket.IO Client, Oxlint + ESLint, Jest + React Testing Library
- Path alias: `@/` → `./src/`

## Backend
- FastAPI (Python 3.11+), Poetry
- LangChain + LangGraph, Firebase (Firestore, Storage, Auth), Socket.IO Server
- Pydantic v2, pytest + pytest-asyncio + pytest-cov, httpx + aiohttp

## External Services
- Suno API (music generation), Google Search API (optional grounding)
- Firebase (auth, database, storage), Redis (optional caching)

## Quick Commands

**Frontend** (cd frontend)
- `pnpm dev` - Start dev server (port 5173)
- `pnpm lint` - Fast linting (oxlint)
- `pnpm test` - Run tests

**Backend** (cd backend)
- `poetry run uvicorn app.main:app --reload` - Start dev server (port 8000)
- `poetry run pytest` - Run tests
- `poetry run pytest --cov=app` - Tests with coverage

## Development Workflow
1. Start backend first (port 8000)
2. Start frontend (port 5173)
3. Frontend proxies API to backend
4. Use oxlint for fast feedback, ESLint before commits
5. API docs: http://localhost:8000/docs
