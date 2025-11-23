# LearningSong

Create music based on learning material

## Project Structure

```
/
├── frontend/          # React + TypeScript + Vite
├── backend/           # Python + FastAPI
├── docs/              # Documentation
└── user-need/         # User requirements
```

## Prerequisites

- **Node.js** 18+ and **pnpm** (for frontend)
- **Python** 3.11+ and **Poetry** (for backend)
- **Firebase** project credentials
- **Suno API** key

## Setup Instructions

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration (see Environment Variables section below)

5. Start the development server:
   ```bash
   pnpm dev
   ```

6. Run linting:
   ```bash
   pnpm lint          # Fast linting with oxlint
   pnpm lint:eslint   # Comprehensive linting with ESLint
   ```

7. Run tests:
   ```bash
   pnpm test
   ```

8. Build for production:
   ```bash
   pnpm build
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   poetry install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration (see Environment Variables section below)

5. Start the development server:
   ```bash
   poetry run uvicorn app.main:app --reload
   ```

6. Access API documentation:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

7. Run tests:
   ```bash
   poetry run pytest
   ```

8. Run tests with coverage:
   ```bash
   poetry run pytest --cov=app --cov-report=html
   ```

## Environment Variables

### Frontend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000` |
| `VITE_WS_URL` | WebSocket server URL | `ws://localhost:8000` |

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `FIREBASE_PROJECT_ID` | Firebase project identifier | `your-project-id` |
| `FIREBASE_CREDENTIALS_PATH` | Path to Firebase credentials JSON | `./credentials.json` |
| `SUNO_API_KEY` | Suno API authentication key | `your-suno-key` |
| `GOOGLE_SEARCH_API_KEY` | Google Search API key (optional) | `your-google-key` |
| `REDIS_URL` | Redis connection URL (optional) | `redis://localhost:6379` |

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **UI Library**: TailwindCSS + shadcn/ui
- **State Management**: Zustand
- **API Client**: Axios + React Query
- **WebSocket**: Socket.IO Client
- **Linting**: Oxlint (default) + ESLint (optional)
- **Testing**: Jest + React Testing Library

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Package Manager**: Poetry
- **AI Pipeline**: LangChain + LangGraph
- **Database**: Firebase Admin SDK
- **WebSocket**: Socket.IO Server
- **Validation**: Pydantic
- **Testing**: pytest + pytest-asyncio

## Development Workflow

1. Start the backend server first (port 8000)
2. Start the frontend dev server (port 5173 by default)
3. Frontend will proxy API requests to backend during development
4. Use oxlint for fast feedback during development
5. Run ESLint before committing for comprehensive checks
6. Run tests before pushing changes

## Project Commands

### Frontend
```bash
pnpm dev           # Start dev server
pnpm build         # Build for production
pnpm preview       # Preview production build
pnpm lint          # Run oxlint (fast)
pnpm lint:eslint   # Run ESLint (comprehensive)
pnpm test          # Run Jest tests
```

### Backend
```bash
poetry run uvicorn app.main:app --reload    # Start dev server
poetry run pytest                            # Run tests
poetry run pytest --cov=app                  # Run tests with coverage
poetry add <package>                         # Add dependency
poetry add --group dev <package>             # Add dev dependency
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and tests
4. Submit a pull request

## License

[Add your license here]
