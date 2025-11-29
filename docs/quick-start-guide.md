# Quick Start Guide - LearningSong

This guide helps you quickly start and test the LearningSong application.

## Prerequisites

- **Node.js**: 18+ (check with `node --version`)
- **pnpm**: Latest version (check with `pnpm --version`)
- **Python**: 3.11+ (for backend, optional)
- **Poetry**: Latest version (for backend, optional)

---

## Frontend Only (Recommended for Testing)

### 1. Install Dependencies

```bash
cd frontend
pnpm install
```

### 2. Start Development Server

```bash
pnpm dev
```

**Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 3. Open in Browser

Navigate to: **http://localhost:5173**

You should see the **Text Input Page** (home page).

---

## Full Stack (Frontend + Backend)

### Terminal 1: Start Backend

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

**Backend runs at:** http://localhost:8000

**API Docs:** http://localhost:8000/docs

### Terminal 2: Start Frontend

```bash
cd frontend
pnpm dev
```

**Frontend runs at:** http://localhost:5173

---

## Available Commands

### Frontend Commands

```bash
cd frontend

# Development
pnpm dev              # Start dev server (port 5173)
pnpm build            # Build for production
pnpm preview          # Preview production build

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage report

# Linting
pnpm lint             # Fast linting with oxlint
pnpm lint:eslint      # Comprehensive linting with ESLint
```

### Backend Commands

```bash
cd backend

# Development
poetry run uvicorn app.main:app --reload    # Start dev server
poetry run uvicorn app.main:app --port 8001 # Use different port

# Testing
poetry run pytest                           # Run all tests
poetry run pytest --cov=app                 # Run with coverage
poetry run pytest --cov=app --cov-report=html  # HTML coverage report

# Dependencies
poetry add <package>                        # Add dependency
poetry add --group dev <package>            # Add dev dependency
poetry install                              # Install all dependencies
```

---

## What to Test

### Text Input Page (Page A) ✅ Implemented

**URL:** http://localhost:5173/

**Features to Test:**
1. **Text Input**: Type or paste educational content
2. **Word Counter**: Real-time word count (max 10,000 words)
3. **Search Toggle**: Enable/disable Google Search grounding
4. **Rate Limit**: View remaining songs (X/3)
5. **Generate Button**: Click to generate lyrics
6. **Validation**: Test empty input, too long input
7. **Responsive**: Test on different screen sizes
8. **Accessibility**: Test keyboard navigation

**See detailed testing guide:** `docs/testing-text-input-page.md`

### Lyrics Editing Page (Page B) ✅ Implemented

**URL:** http://localhost:5173/lyrics-edit

**Features to Test:**
1. **Lyrics Editor**: Edit AI-generated lyrics (50-3000 chars)
2. **Character Counter**: Real-time count with visual states
3. **Style Selector**: Choose from 8 music styles
4. **Generate Button**: Create song from lyrics
5. **Progress Tracker**: Real-time generation progress
6. **WebSocket Updates**: Live status updates
7. **Error Handling**: Retry on failure
8. **Offline Detection**: Shows offline indicator
9. **Responsive**: Test on different screen sizes
10. **Accessibility**: Test keyboard navigation

### Song Playback Page (Page C) ✅ Implemented

**URL:** http://localhost:5173/playback/:songId

**Features to Test:**
1. **Audio Player**: Play/pause/seek controls
2. **Lyrics Display**: View song lyrics
3. **Song Metadata**: Style, creation time, expiration
4. **Share Button**: Share song with others
5. **Regenerate**: Create new version of song
6. **Error Handling**: User-friendly error messages
7. **Offline Detection**: Shows offline indicator
8. **Rate Limit**: Respects daily limit
9. **Responsive**: Test on different screen sizes
10. **Accessibility**: Test keyboard navigation

---

## Project Structure

```
LearningSong/
├── frontend/              # React + TypeScript + Vite
│   ├── src/
│   │   ├── pages/        # Page components
│   │   │   └── TextInputPage.tsx  ✅ Implemented
│   │   ├── components/   # Reusable components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── stores/       # Zustand state management
│   │   ├── api/          # API client functions
│   │   └── lib/          # Utilities
│   ├── tests/            # Jest + React Testing Library
│   └── package.json
│
├── backend/              # Python + FastAPI
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── models/      # Pydantic models
│   │   └── main.py      # FastAPI app
│   ├── tests/           # pytest tests
│   └── pyproject.toml
│
├── docs/                # Documentation
│   ├── quick-start-guide.md        ✅ This file
│   └── testing-text-input-page.md  ✅ Detailed testing guide
│
└── .kiro/specs/         # Feature specifications
    └── page-a-text-input/  ✅ Text Input Page spec
```

---

## Common Issues

### Issue: Port Already in Use

**Frontend (5173):**
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use different port
pnpm dev -- --port 5174
```

**Backend (8000):**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use different port
poetry run uvicorn app.main:app --reload --port 8001
```

### Issue: Dependencies Not Installed

**Frontend:**
```bash
cd frontend
pnpm install
```

**Backend:**
```bash
cd backend
poetry install
```

### Issue: Module Not Found

**Frontend:**
- Check if `node_modules` exists
- Try deleting `node_modules` and `pnpm-lock.yaml`, then `pnpm install`

**Backend:**
- Check if virtual environment is activated
- Try `poetry install --no-cache`

### Issue: TypeScript Errors

```bash
cd frontend
pnpm build  # Check for type errors
```

### Issue: Tests Failing

```bash
cd frontend
pnpm test  # Run tests to see failures
```

Check test report: `report/frontend-test/frontend-test-report-20251124-043410.md`

---

## Environment Variables

### Frontend (.env)

Create `frontend/.env` file:

```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

**Note:** For local testing without backend, these are optional.

### Backend (.env)

Create `backend/.env` file:

```env
FIREBASE_CREDENTIALS_PATH=path/to/serviceAccountKey.json
GOOGLE_SEARCH_API_KEY=your_api_key
GOOGLE_SEARCH_ENGINE_ID=your_engine_id
OPENAI_API_KEY=your_openai_key
```

**Note:** Backend will work with mock data if these are not set.

---

## Testing Workflow

### 1. Quick Smoke Test (2 minutes)

```bash
# Start frontend
cd frontend
pnpm dev

# Open http://localhost:5173
# Type some text
# Click Generate button
# Verify UI responds (will show error without backend)
```

### 2. Run Automated Tests (1 minute)

```bash
cd frontend
pnpm test
```

**Expected:** All 78 tests pass ✅

### 3. Full Manual Testing (15 minutes)

Follow the detailed guide: `docs/testing-text-input-page.md`

---

## Next Steps

1. ✅ **Test Text Input Page**: Follow `docs/testing-text-input-page.md`
2. ✅ **Test Lyrics Editing Page**: Test all features on Page B
3. ✅ **Test Song Playback Page**: Test all features on Page C
4. ✅ **Full Integration Testing**: Test complete user flow
5. 🚧 **Production Deployment**: Set up monitoring and backups

---

## Useful Links

- **Frontend Dev Server**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Test Coverage Report**: `frontend/coverage/lcov-report/index.html`

---

## Getting Help

If you encounter issues:

1. **Check Console**: Open browser DevTools (F12) and check for errors
2. **Check Logs**: Look at terminal output for error messages
3. **Review Tests**: Run `pnpm test` to see if tests reveal the issue
4. **Check Specs**: Review `.kiro/specs/page-a-text-input/` for requirements
5. **Check Documentation**: See `docs/` folder for guides

---

## Development Tips

### Hot Reload
Both frontend and backend support hot reload:
- **Frontend**: Changes to `.tsx`, `.ts`, `.css` files reload automatically
- **Backend**: Changes to `.py` files reload automatically (with `--reload` flag)

### Browser DevTools
- **F12**: Open DevTools
- **Ctrl+Shift+C**: Inspect element
- **Ctrl+Shift+M**: Toggle device toolbar (responsive testing)
- **Ctrl+Shift+R**: Hard refresh (clear cache)

### VS Code Extensions (Recommended)
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Python
- Pylance

---

**Happy Testing! 🎵**

---

**Last Updated:** November 29, 2025  
**Status:** ✅ All 3 Pages Complete
