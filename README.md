# LearningSong

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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

## API Setup

To test with real services, you'll need API keys for the following services:

### Required APIs
1. **Suno API** - Music generation service
   - Visit [Suno API Console](https://sunoapi.org)
   - Generate API key and add to `backend/.env` as `SUNO_API_KEY`

2. **Firebase** - Authentication and database
   - Create project at [Firebase Console](https://console.firebase.google.com)
   - Enable Anonymous Authentication
   - Create Firestore database
   - Download service account JSON to `backend/firebase-credentials.json`
   - Add web config to `frontend/.env`

3. **OpenAI API** - Lyrics generation
   - Get API key from [OpenAI Platform](https://platform.openai.com)
   - Add to `backend/.env` as `OPENAI_API_KEY`

### Optional APIs
4. **Google Search API** - Content enrichment (optional)
   - Create project at [Google Cloud Console](https://console.cloud.google.com)
   - Enable Custom Search API
   - Create search engine at [Programmable Search](https://programmablesearchengine.google.com)

### Quick Setup
```bash
# 1. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Edit with your API keys
# backend/.env - Add SUNO_API_KEY, OPENAI_API_KEY, Firebase config
# frontend/.env - Add Firebase web config

# 3. Test connection
poetry run python -c "from app.core.firebase import initialize_firebase; initialize_firebase()"
```

📚 **[Complete API Setup Guide](docs/api-setup-guide.md)** - Detailed step-by-step instructions with screenshots and troubleshooting

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

### PowerShell Development Scripts

We provide three PowerShell scripts for streamlined development:

#### `start-dev.ps1` - Separate Windows (Recommended)
```powershell
.\start-dev.ps1
```

**Features:**
- ✅ Automatically kills processes on occupied ports (8000, 5173, 5174)
- ✅ Checks and installs missing dependencies
- ✅ Creates `.env` files from examples if missing
- ✅ Starts backend and frontend in **separate terminal windows**
- ✅ Shows process IDs for manual control
- ✅ Best for: Viewing each server's output clearly

#### `start-dev-single.ps1` - Single Window
```powershell
.\start-dev-single.ps1
```

**Features:**
- ✅ Automatically kills processes on occupied ports (8000, 5173, 5174)
- ✅ Runs both servers in the **same terminal window**
- ✅ Prefixed output (`[Backend]`, `[Frontend]`)
- ✅ Easy cleanup with Ctrl+C
- ✅ Best for: Minimal window management

#### `stop-dev.ps1` - Emergency Stop
```powershell
.\stop-dev.ps1
```

**Features:**
- 🛑 Forcefully stops all development servers
- 🛑 Kills processes on ports 8000, 5173, 5174
- 🛑 Cleans up stuck Node.js and Python processes
- 🛑 Best for: Emergency cleanup or stuck processes

**Port Management:**
All starting scripts automatically detect and kill processes occupying required ports before starting new servers. No more "port already in use" errors!

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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### What does this mean?

The MIT License is a permissive open source license that allows you to:
- ✅ Use the software for any purpose (commercial or personal)
- ✅ Modify the source code
- ✅ Distribute copies
- ✅ Sublicense the software

The only requirement is that you include the original copyright notice and license in any copies or substantial portions of the software.
