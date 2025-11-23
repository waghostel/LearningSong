# Technology Stack

## Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite (using rolldown-vite@7.2.5)
- **Package Manager**: pnpm
- **UI**: TailwindCSS 4 + shadcn/ui components
- **State Management**: Zustand
- **API Client**: Axios + TanStack React Query (v5)
- **WebSocket**: Socket.IO Client
- **Linting**: Oxlint (fast, daily) + ESLint (comprehensive, pre-commit)
- **Testing**: Jest + React Testing Library

### Path Aliases
- `@/` maps to `./src/`

## Backend

- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Package Manager**: Poetry
- **AI Pipeline**: LangChain + LangGraph (for text → lyrics workflow)
- **Database**: Firebase Admin SDK (Firestore)
- **Storage**: Firebase Storage
- **WebSocket**: Socket.IO Server
- **Validation**: Pydantic v2
- **Testing**: pytest + pytest-asyncio + pytest-cov
- **HTTP Client**: httpx + aiohttp

### Backend Structure
```
app/
├── api/          # API route handlers
├── core/         # Core configuration and utilities
├── models/       # Pydantic models
├── services/     # Business logic (AI pipeline, Suno client)
└── utils/        # Helper functions
```

## External Services

- **Suno API**: Music generation from lyrics
- **Google Search API**: Optional content enrichment
- **Firebase**: Authentication, Firestore, Storage, Hosting
- **Redis** (optional): Task queue and caching

## Common Commands

### Frontend
```bash
cd frontend
pnpm install              # Install dependencies
pnpm dev                  # Start dev server (port 5173)
pnpm build                # Build for production
pnpm preview              # Preview production build
pnpm lint                 # Fast linting with oxlint
pnpm lint:eslint          # Comprehensive linting
pnpm test                 # Run tests
pnpm test:watch           # Run tests in watch mode
pnpm test:coverage        # Run tests with coverage
```

### Backend
```bash
cd backend
poetry install                              # Install dependencies
poetry run uvicorn app.main:app --reload   # Start dev server (port 8000)
poetry run pytest                           # Run tests
poetry run pytest --cov=app                 # Run tests with coverage
poetry run pytest --cov=app --cov-report=html  # Generate HTML coverage report
poetry add <package>                        # Add dependency
poetry add --group dev <package>            # Add dev dependency
```

## Development Workflow

1. Start backend server first (port 8000)
2. Start frontend dev server (port 5173)
3. Frontend proxies API requests to backend during development
4. Use oxlint for fast feedback during development
5. Run ESLint before committing for comprehensive checks
6. Run tests before pushing changes

## API Documentation

When backend is running:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
