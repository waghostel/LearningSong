# 🚀 Quick Start Guide - LearningSong

Get LearningSong up and running in minutes!

## Prerequisites

Make sure you have these installed:
- ✅ Node.js 18+ (check with `node --version`)
- ✅ pnpm (check with `pnpm --version`)
- ✅ Python 3.11+ (for backend)
- ✅ Poetry ([installation guide](https://python-poetry.org/docs/#installation))

---

## ⚡ Fastest Start (One Command)

### Windows PowerShell

```powershell
.\start-dev.ps1
```

The script will:
1. ✅ Check prerequisites
2. ✅ Create `.env` files
3. ✅ Install dependencies
4. ✅ Start both servers

### Stop Development

```powershell
.\stop-dev.ps1
```

---

## 🎯 Manual Start (If Script Doesn't Work)

### Option 1: Frontend Only (Recommended for Testing)

```bash
cd frontend
pnpm install
pnpm dev
```

**Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### Option 2: Full Stack (Frontend + Backend)

**Terminal 1: Backend**
```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

**Terminal 2: Frontend**
```bash
cd frontend
pnpm install
pnpm dev
```

---

## 🌐 Access Your App

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## ✅ What's Implemented

### Page A: Content Input ✅
- Paste educational content (1-10,000 words)
- Toggle Google Search enrichment
- Generate lyrics button
- Rate limit tracking (3 songs/day)
- Word counter
- Error handling
- Responsive design
- Accessibility features

### Page B: Lyrics Editing ✅
- Edit AI-generated lyrics (50-3000 chars)
- Character counter with visual states
- Music style selector (8 styles)
- Generate song button
- Real-time progress tracker
- WebSocket updates
- Error recovery with retry
- Offline detection

### Page C: Song Playback ✅
- Audio player with controls
- Lyrics display with sync
- Song metadata (style, creation time, expiration)
- Share functionality
- Regenerate song option
- Error handling with user-friendly messages
- Offline detection
- Rate limit awareness

---

## 📋 Available Commands

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

## 🧪 Testing

### Quick Smoke Test (2 minutes)

```bash
# Start frontend
cd frontend
pnpm dev

# Open http://localhost:5173
# Type some text
# Click Generate button
# Verify UI responds
```

### Run Automated Tests (1 minute)

```bash
cd frontend
pnpm test
```

### Full Manual Testing (45 minutes)

Follow the detailed guide: [docs/COMPLETE-USER-FLOW-TESTING.md](docs/COMPLETE-USER-FLOW-TESTING.md)

---

## 🔧 Environment Setup

### Frontend (.env)

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Backend (.env)

Create `backend/.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
SUNO_API_KEY=your-suno-key
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_SEARCH_API_KEY=your-google-key
GOOGLE_SEARCH_ENGINE_ID=your-engine-id
ENVIRONMENT=development
LOG_LEVEL=INFO
```

---

## 🐛 Common Issues

### "Execution of scripts is disabled" (Windows)

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Already in Use

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

### Dependencies Not Installed

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

### Module Not Found

**Frontend:**
- Delete `node_modules` and `pnpm-lock.yaml`
- Run `pnpm install` again

**Backend:**
- Try `poetry install --no-cache`

### TypeScript Errors

```bash
cd frontend
pnpm build  # Check for type errors
```

### Tests Failing

```bash
cd frontend
pnpm test  # Run tests to see failures
```

---

## 📚 Documentation

- **Full Setup Guide:** [docs/API-SETUP-GUIDE.md](docs/API-SETUP-GUIDE.md)
- **Complete Testing:** [docs/COMPLETE-USER-FLOW-TESTING.md](docs/COMPLETE-USER-FLOW-TESTING.md)
- **Quick Reference:** [docs/QUICK-REFERENCE.md](docs/QUICK-REFERENCE.md)
- **Getting Started:** [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)
- **Feature Status:** [docs/INCOMPLETE-TASKS.md](docs/INCOMPLETE-TASKS.md)
- **Main README:** [README.md](README.md)

---

## 💡 Development Tips

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

## 🆘 Need Help?

### Setup Issues
- Follow [docs/API-SETUP-GUIDE.md](docs/API-SETUP-GUIDE.md) step by step
- Check [docs/QUICK-REFERENCE.md](docs/QUICK-REFERENCE.md) common errors
- Review backend logs for details

### Testing Issues
- Follow [docs/COMPLETE-USER-FLOW-TESTING.md](docs/COMPLETE-USER-FLOW-TESTING.md)
- Check browser console (F12)
- Review backend logs

### Feature Questions
- Check [docs/INCOMPLETE-TASKS.md](docs/INCOMPLETE-TASKS.md) for status
- Review [README.md](README.md) feature list
- Check related code files

---

## 📊 Project Status

| Component | Status | Notes |
|-----------|--------|-------|
| **Page A** | ✅ Complete | Feature-complete for MVP |
| **Page B** | ✅ Complete | Feature-complete for MVP |
| **Page C** | ✅ Complete | Feature-complete for MVP |
| **Backend** | ✅ Complete | All services implemented |
| **Frontend** | ✅ Complete | All components implemented |
| **Testing** | ✅ Complete | Comprehensive test guide |
| **Documentation** | ✅ Complete | Comprehensive guides |

---

## 🚀 Next Steps

1. **Start the servers** using one of the methods above
2. **Open http://localhost:5173** in your browser
3. **Test the complete flow** following [docs/COMPLETE-USER-FLOW-TESTING.md](docs/COMPLETE-USER-FLOW-TESTING.md)
4. **Review documentation** for detailed information
5. **Deploy when ready** following production checklist

---

**Happy Coding! 🎵**

**Last Updated:** November 29, 2025  
**Status:** ✅ All 3 Pages Complete
