# Quick Reference Card

One-page reference for common tasks and commands.

---

## 🚀 Start the Application

### Frontend Only
```bash
cd frontend
pnpm dev
```
→ Open http://localhost:5173

### Full Stack
```bash
# Terminal 1: Backend
cd backend
poetry run uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
pnpm dev
```

---

## 🧪 Run Tests

### Frontend
```bash
cd frontend
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage
```

### Backend
```bash
cd backend
poetry run pytest                    # Run all tests
poetry run pytest --cov=app          # With coverage
```

---

## 🔍 Linting

### Frontend
```bash
cd frontend
pnpm lint              # Fast (oxlint)
pnpm lint:eslint       # Comprehensive (ESLint)
```

---

## 🏗️ Build

### Frontend
```bash
cd frontend
pnpm build             # Production build
pnpm preview           # Preview build
```

---

## 📦 Install Dependencies

### Frontend
```bash
cd frontend
pnpm install
```

### Backend
```bash
cd backend
poetry install
```

---

## 🐛 Common Issues

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:5173 | xargs kill -9
```

### Clear Cache
```bash
# Frontend
cd frontend
rm -rf node_modules/.vite
pnpm dev

# Backend
cd backend
poetry cache clear . --all
```

### Reinstall Everything
```bash
# Frontend
cd frontend
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Backend
cd backend
poetry install
```

---

## 📍 Important URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React app |
| Backend | http://localhost:8000 | FastAPI server |
| API Docs | http://localhost:8000/docs | Swagger UI |
| ReDoc | http://localhost:8000/redoc | Alternative API docs |

---

## 📂 Key Files

### Frontend
```
frontend/
├── src/pages/TextInputPage.tsx    # Main page
├── src/components/                # UI components
├── src/hooks/useLyrics.ts         # Lyrics generation hook
├── src/stores/textInputStore.ts   # State management
├── src/api/lyrics.ts              # API client
└── tests/                         # Test files
```

### Backend
```
backend/
├── app/main.py                    # FastAPI app
├── app/api/lyrics.py              # Lyrics endpoint
├── app/services/ai_pipeline.py    # AI pipeline
└── tests/                         # Test files
```

### Documentation
```
docs/
├── quick-start-guide.md           # Getting started
├── testing-text-input-page.md     # Testing guide
├── visual-testing-checklist.md    # QA checklist
└── troubleshooting.md             # Problem solving
```

---

## 🎯 Testing Checklist

Quick smoke test (2 minutes):
- [ ] Start frontend (`pnpm dev`)
- [ ] Open http://localhost:5173
- [ ] Type text in textarea
- [ ] Check word counter updates
- [ ] Toggle search switch
- [ ] Click Generate button
- [ ] Check console for errors (F12)
- [ ] Run tests (`pnpm test`)

---

## 🔧 Environment Variables

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_key
```

### Backend (.env)
```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CREDENTIALS_PATH=./credentials.json
SUNO_API_KEY=your_suno_key
```

---

## 📊 Test Status

**Frontend:** ✅ 78/78 tests passing
- TextInputPage integration tests
- Component unit tests
- API client tests
- Store tests

**Backend:** 🚧 In development

---

## 🎨 Component Overview

### Text Input Page Components
```
TextInputPage
├── TextInputArea          # Textarea with validation
├── CharacterCounter       # Word count display
├── SearchToggle           # Google Search toggle
├── RateLimitIndicator     # Shows X/3 remaining
└── GenerateButton         # Submit button
```

---

## 🔑 Keyboard Shortcuts

### Browser
- `F12` - Open DevTools
- `Ctrl+Shift+C` - Inspect element
- `Ctrl+Shift+M` - Toggle device toolbar
- `Ctrl+Shift+R` - Hard refresh

### VS Code
- `Ctrl+Shift+P` - Command palette
- `Ctrl+`` - Toggle terminal
- `F5` - Start debugging

---

## 📞 Quick Help

| Problem | Solution |
|---------|----------|
| Port in use | Kill process or use different port |
| Dependencies missing | Run `pnpm install` or `poetry install` |
| Tests failing | Check test report, run `pnpm test` |
| Styles not loading | Hard refresh (Ctrl+Shift+R) |
| TypeScript errors | Run `pnpm build` to see errors |
| API not working | Check backend is running |

---

## 📚 Documentation Links

- [Quick Start Guide](quick-start-guide.md) - Detailed setup
- [Testing Guide](testing-text-input-page.md) - Comprehensive testing
- [Visual Checklist](visual-testing-checklist.md) - QA testing
- [Troubleshooting](troubleshooting.md) - Problem solving
- [Docs Index](README.md) - All documentation

---

## 🎓 Learning Resources

### React + TypeScript
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Testing
- [Jest Docs](https://jestjs.io)
- [React Testing Library](https://testing-library.com/react)

### UI Components
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

### Backend
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [LangChain Docs](https://python.langchain.com)

---

## 💡 Pro Tips

1. **Use watch mode** for tests during development
2. **Check console** regularly for warnings
3. **Run linting** before committing
4. **Test responsive** design early
5. **Document bugs** immediately with screenshots

---

**Print this page for quick reference! 📄**
