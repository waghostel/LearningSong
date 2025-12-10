# Project Setup Design

## Architecture Overview

This setup creates a monorepo structure with separate frontend and backend directories, each with their own tooling and dependencies.

## Frontend Design

### Technology Stack
- **Build Tool**: Vite (fast, modern, optimized for React)
- **Package Manager**: pnpm (fast, disk-efficient)
- **Linting**: Oxlint (default) + ESLint (optional)
- **Testing**: Jest + React Testing Library
- **UI**: TailwindCSS + shadcn/ui
- **State**: Zustand (lightweight)
- **API**: react-query + Axios
- **WebSocket**: Socket.IO client

### Linting Strategy
Oxlint is the default for speed during development:
```bash
pnpm lint        # Uses oxlint (fast)
pnpm lint:eslint # Uses ESLint (comprehensive)
```

### Directory Structure
```
frontend/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components (Home, Lyrics, Player)
│   ├── stores/         # Zustand stores
│   ├── api/            # API client functions
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities
│   └── main.tsx        # Entry point
├── tests/
│   └── setup.ts        # Jest setup
├── public/             # Static assets
└── config files
```

## Backend Design

### Technology Stack
- **Framework**: FastAPI (async, fast, auto-docs)
- **Package Manager**: Poetry (dependency management)
- **Testing**: pytest + pytest-asyncio
- **WebSocket**: Socket.IO server
- **AI Pipeline**: LangChain + LangGraph
- **Database**: Firebase Admin SDK
- **Validation**: Pydantic

### Directory Structure
```
backend/
├── app/
│   ├── main.py           # FastAPI app entry
│   ├── api/              # API routes
│   │   ├── lyrics.py
│   │   └── songs.py
│   ├── services/         # Business logic
│   │   ├── ai_pipeline.py
│   │   └── suno_client.py
│   ├── models/           # Pydantic models
│   ├── core/             # Config, dependencies
│   └── utils/            # Helper functions
├── tests/
│   ├── conftest.py       # pytest fixtures
│   └── test_api.py
└── pyproject.toml
```

## Correctness Properties

### P1: Frontend Dependencies Installed
**Verification**: All required npm packages are listed in `package.json` and installed successfully
**Test**: Run `pnpm install` without errors

### P2: Backend Dependencies Installed
**Verification**: All required Python packages are listed in `pyproject.toml` and installed successfully
**Test**: Run `poetry install` without errors

### P3: Oxlint Works as Default
**Verification**: Running `pnpm lint` executes oxlint successfully
**Test**: Create a file with linting issues and verify oxlint catches them

### P4: ESLint Available as Alternative
**Verification**: Running `pnpm lint:eslint` executes ESLint successfully
**Test**: Same file should be linted by ESLint when using the alternative command

### P5: Jest Tests Run
**Verification**: Jest is configured and can run tests
**Test**: Run `pnpm test` and verify sample test passes

### P6: Pytest Tests Run
**Verification**: pytest is configured and can run tests
**Test**: Run `poetry run pytest` and verify sample test passes

### P7: TypeScript Compilation Works
**Verification**: TypeScript compiles without errors
**Test**: Run `pnpm build` successfully

### P8: FastAPI Server Starts
**Verification**: FastAPI server can start and serve API docs
**Test**: Run `poetry run uvicorn app.main:app` and access `/docs`

## Configuration Details

### Vite Configuration
- React plugin enabled
- Path aliases configured (`@/` → `src/`)
- Proxy for backend API during development

### TailwindCSS Configuration
- shadcn/ui compatible setup
- Custom theme colors
- Content paths configured

### Jest Configuration
- TypeScript support via ts-jest
- React Testing Library setup
- Module path mapping matching Vite

### pytest Configuration
- Async test support
- Coverage reporting
- Test discovery patterns

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### Backend (.env)
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=./credentials.json
SUNO_API_KEY=your-suno-key
GOOGLE_SEARCH_API_KEY=your-google-key
REDIS_URL=redis://localhost:6379
```

## Dependencies List

### Frontend Core
- react, react-dom
- typescript
- vite
- @vitejs/plugin-react

### Frontend UI
- tailwindcss
- @radix-ui/react-* (shadcn/ui components)
- lucide-react (icons)

### Frontend State & API
- zustand
- @tanstack/react-query
- axios
- socket.io-client

### Frontend Testing & Linting
- jest
- @testing-library/react
- @testing-library/jest-dom
- oxlint
- eslint
- @typescript-eslint/parser
- @typescript-eslint/eslint-plugin

### Backend Core
- fastapi
- uvicorn[standard]
- python-dotenv
- pydantic
- pydantic-settings

### Backend AI & Services
- langchain
- langgraph
- openai (or anthropic)
- firebase-admin
- python-socketio
- aiohttp

### Backend Testing
- pytest
- pytest-asyncio
- httpx (for testing FastAPI)
- pytest-cov

## Trade-offs

### Oxlint vs ESLint
- **Oxlint**: 50-100x faster, minimal config, catches common issues
- **ESLint**: More comprehensive, plugin ecosystem, customizable
- **Decision**: Use oxlint for speed during development, ESLint for CI/final checks

### pnpm vs npm/yarn
- **pnpm**: Faster, saves disk space, strict dependency resolution
- **npm/yarn**: More widely used, simpler
- **Decision**: pnpm for performance benefits in monorepo

### Poetry vs pip
- **Poetry**: Better dependency resolution, lock files, virtual env management
- **pip**: Simpler, more universal
- **Decision**: Poetry for reproducible builds and easier dependency management
