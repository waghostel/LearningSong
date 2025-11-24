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

### Quick Start (Recommended)

Use the provided scripts to start both servers at once:

**PowerShell (Recommended):**
```powershell
.\start-dev.ps1
```

**Command Prompt:**
```cmd
start-dev.bat
```

This will:
- Check prerequisites (pnpm, poetry)
- Create `.env` files if missing
- Install dependencies
- Start both frontend and backend servers

See [DEV-SCRIPTS.md](DEV-SCRIPTS.md) for more details.

### Manual Start

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

## Testing the Application

### Quick Start Testing

To quickly test the Text Input Page (Page A):

```bash
cd frontend
pnpm dev
```

Then open http://localhost:5173 in your browser.

**📚 Detailed Testing Guides:**
- **[Quick Start Guide](docs/quick-start-guide.md)** - Get up and running in 2 minutes
- **[Text Input Page Testing](docs/testing-text-input-page.md)** - Comprehensive testing scenarios
- **[Visual Testing Checklist](docs/visual-testing-checklist.md)** - Systematic UI/UX testing

### What's Implemented

✅ **Text Input Page (Page A)** - Fully implemented and tested
- Text input area with word counter (max 10,000 words)
- Google Search grounding toggle
- Rate limit indicator (3 songs/day)
- Generate lyrics button with validation
- Responsive design and accessibility features
- 78 automated tests (all passing)

🚧 **Lyrics Editing Page (Page B)** - Coming soon

🚧 **Song Generation Page (Page C)** - Coming soon

### Running Tests

**Frontend Tests:**
```bash
cd frontend
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

**Test Results:**
- Total Test Suites: 8 passed ✅
- Total Tests: 78 passed ✅
- Coverage Report: `frontend/coverage/lcov-report/index.html`

**Backend Tests:**
```bash
cd backend
poetry run pytest                           # Run all tests
poetry run pytest --cov=app                 # With coverage
poetry run pytest --cov=app --cov-report=html  # HTML report
```

## Documentation

📚 **[Documentation Index](docs/README.md)** - Complete documentation overview

**Quick Links:**
- **[Quick Start Guide](docs/quick-start-guide.md)** - Start the app and run basic tests (2 min)
- **[Testing Text Input Page](docs/testing-text-input-page.md)** - Detailed testing scenarios (15 min)
- **[Visual Testing Checklist](docs/visual-testing-checklist.md)** - UI/UX testing checklist (15 min)
- **[Troubleshooting Guide](docs/troubleshooting.md)** - Common issues and solutions
- **[Suno API Documentation](docs/suno-api/)** - Suno API integration details
- **[Product Requirements](user-need/)** - Product specifications

## Specifications

Feature specifications are located in `.kiro/specs/`:
- **[Text Input Page](/.kiro/specs/page-a-text-input/)** - Requirements, design, and tasks

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and tests
4. Submit a pull request

## License

[Add your license here]
