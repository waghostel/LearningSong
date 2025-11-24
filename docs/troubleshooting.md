# Troubleshooting Guide

Common issues and solutions when running LearningSong.

---

## Frontend Issues

### Issue: Port 5173 Already in Use

**Error Message:**
```
Error: Port 5173 is already in use
```

**Solution 1: Kill the Process**

**Windows:**
```bash
# Find the process using port 5173
netstat -ano | findstr :5173

# Kill the process (replace <PID> with actual process ID)
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
# Find and kill the process
lsof -ti:5173 | xargs kill -9
```

**Solution 2: Use a Different Port**
```bash
pnpm dev -- --port 5174
```

---

### Issue: Dependencies Not Installed

**Error Message:**
```
Cannot find module '@/components/...'
Error: Cannot find package 'react'
```

**Solution:**
```bash
cd frontend
pnpm install
```

**If that doesn't work:**
```bash
# Delete node_modules and lock file
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install
```

---

### Issue: TypeScript Errors

**Error Message:**
```
Type error: Property 'xyz' does not exist on type...
```

**Solution 1: Check TypeScript Compilation**
```bash
cd frontend
pnpm build
```

**Solution 2: Restart TypeScript Server**
In VS Code:
1. Press `Ctrl+Shift+P`
2. Type "TypeScript: Restart TS Server"
3. Press Enter

**Solution 3: Check tsconfig.json**
Ensure path aliases are configured:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

### Issue: Styles Not Loading

**Symptoms:**
- Page looks unstyled
- No colors or spacing
- Plain HTML appearance

**Solution 1: Check Tailwind Import**
Verify `src/index.css` contains:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

And it's imported in `src/main.tsx`:
```typescript
import './index.css'
```

**Solution 2: Clear Cache**
```bash
# Hard refresh in browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

**Solution 3: Rebuild**
```bash
cd frontend
rm -rf node_modules/.vite
pnpm dev
```

---

### Issue: Tests Failing

**Error Message:**
```
FAIL tests/SomeComponent.test.tsx
```

**Solution 1: Run Tests to See Details**
```bash
cd frontend
pnpm test
```

**Solution 2: Check Test Report**
View the test report:
```
report/frontend-test/frontend-test-report-20251124-043410.md
```

**Solution 3: Update Snapshots (if applicable)**
```bash
pnpm test -- -u
```

**Solution 4: Clear Jest Cache**
```bash
pnpm test -- --clearCache
```

---

### Issue: Hot Reload Not Working

**Symptoms:**
- Changes don't appear in browser
- Need to manually refresh

**Solution 1: Check Vite Config**
Ensure `vite.config.ts` has:
```typescript
export default defineConfig({
  server: {
    watch: {
      usePolling: true  // For some systems
    }
  }
})
```

**Solution 2: Restart Dev Server**
```bash
# Stop server (Ctrl+C)
# Start again
pnpm dev
```

---

### Issue: API Calls Failing

**Error Message:**
```
Network Error
AxiosError: Request failed with status code 404
```

**Solution 1: Check Backend is Running**
```bash
# In another terminal
cd backend
poetry run uvicorn app.main:app --reload
```

Backend should be at: http://localhost:8000

**Solution 2: Check Proxy Configuration**
Verify `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
```

**Solution 3: Check CORS**
Backend should allow frontend origin:
```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Issue: Environment Variables Not Loading

**Symptoms:**
- `import.meta.env.VITE_API_URL` is undefined
- Firebase not connecting

**Solution 1: Check .env File**
Ensure `frontend/.env` exists and has correct format:
```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_key
```

**Solution 2: Restart Dev Server**
Environment variables are loaded at startup:
```bash
# Stop server (Ctrl+C)
# Start again
pnpm dev
```

**Solution 3: Check Variable Names**
All frontend env vars must start with `VITE_`:
```env
# ✅ Correct
VITE_API_URL=...

# ❌ Wrong (won't be loaded)
API_URL=...
```

---

## Backend Issues

### Issue: Port 8000 Already in Use

**Error Message:**
```
ERROR: [Errno 48] Address already in use
```

**Solution 1: Kill the Process**

**Windows:**
```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -ti:8000 | xargs kill -9
```

**Solution 2: Use Different Port**
```bash
poetry run uvicorn app.main:app --reload --port 8001
```

---

### Issue: Poetry Not Found

**Error Message:**
```
'poetry' is not recognized as an internal or external command
```

**Solution: Install Poetry**

**Windows (PowerShell):**
```powershell
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
```

**Mac/Linux:**
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

**Verify Installation:**
```bash
poetry --version
```

---

### Issue: Python Version Mismatch

**Error Message:**
```
The current project's Python requirement (>=3.11) is not compatible with...
```

**Solution 1: Check Python Version**
```bash
python --version
# or
python3 --version
```

**Solution 2: Install Python 3.11+**
- Download from https://www.python.org/downloads/
- Or use pyenv:
  ```bash
  pyenv install 3.11
  pyenv local 3.11
  ```

**Solution 3: Tell Poetry to Use Specific Python**
```bash
poetry env use python3.11
poetry install
```

---

### Issue: Module Not Found (Backend)

**Error Message:**
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution 1: Install Dependencies**
```bash
cd backend
poetry install
```

**Solution 2: Activate Virtual Environment**
```bash
poetry shell
```

**Solution 3: Check Poetry Environment**
```bash
poetry env info
poetry env list
```

---

### Issue: Firebase Credentials Error

**Error Message:**
```
Could not load Firebase credentials
FileNotFoundError: credentials.json not found
```

**Solution 1: Create Credentials File**
1. Go to Firebase Console
2. Project Settings → Service Accounts
3. Generate New Private Key
4. Save as `backend/credentials.json`

**Solution 2: Update .env**
```env
FIREBASE_CREDENTIALS_PATH=./credentials.json
```

**Solution 3: Use Environment Variable**
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

---

### Issue: Database Connection Failed

**Error Message:**
```
FirebaseError: Failed to connect to Firestore
```

**Solution 1: Check Internet Connection**
Firestore requires internet access.

**Solution 2: Check Credentials**
Ensure Firebase credentials are valid and not expired.

**Solution 3: Check Firestore Rules**
In Firebase Console, verify Firestore rules allow access.

---

## Build Issues

### Issue: Build Fails

**Error Message:**
```
Build failed with errors
```

**Solution 1: Check for TypeScript Errors**
```bash
cd frontend
pnpm build
```

Fix any type errors shown.

**Solution 2: Check for Linting Errors**
```bash
pnpm lint:eslint
```

**Solution 3: Clear Build Cache**
```bash
rm -rf dist
rm -rf node_modules/.vite
pnpm build
```

---

### Issue: Out of Memory

**Error Message:**
```
FATAL ERROR: Reached heap limit Allocation failed
```

**Solution: Increase Node Memory**
```bash
# Windows
set NODE_OPTIONS=--max-old-space-size=4096
pnpm build

# Mac/Linux
export NODE_OPTIONS=--max-old-space-size=4096
pnpm build
```

---

## Testing Issues

### Issue: Tests Timeout

**Error Message:**
```
Exceeded timeout of 5000 ms for a test
```

**Solution 1: Increase Timeout**
In test file:
```typescript
test('my test', async () => {
  // ...
}, 10000) // 10 second timeout
```

**Solution 2: Check for Infinite Loops**
Review test code for async operations that never resolve.

---

### Issue: Mock Not Working

**Error Message:**
```
Cannot read properties of undefined
```

**Solution: Check Mock Setup**
```typescript
// Ensure mocks are set up before imports
jest.mock('@/api/lyrics', () => ({
  generateLyrics: jest.fn()
}))

// Then import
import { generateLyrics } from '@/api/lyrics'
```

---

## Performance Issues

### Issue: Slow Page Load

**Symptoms:**
- Page takes >5 seconds to load
- White screen for long time

**Solution 1: Check Network Tab**
1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Look for slow requests

**Solution 2: Optimize Bundle**
```bash
# Analyze bundle size
cd frontend
pnpm build
npx vite-bundle-visualizer
```

**Solution 3: Enable Code Splitting**
Use dynamic imports:
```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'))
```

---

### Issue: Slow Typing

**Symptoms:**
- Lag when typing in text area
- Counter updates slowly

**Solution 1: Check for Re-renders**
Use React DevTools Profiler to identify unnecessary re-renders.

**Solution 2: Debounce Updates**
```typescript
const debouncedUpdate = useMemo(
  () => debounce((value) => {
    // Update logic
  }, 300),
  []
)
```

---

## Browser Issues

### Issue: Works in Chrome, Not in Firefox

**Solution: Check Browser Compatibility**
1. Check console for errors specific to Firefox
2. Verify CSS properties are supported
3. Check JavaScript features compatibility
4. Use polyfills if needed

---

### Issue: CORS Error

**Error Message:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution: Configure Backend CORS**
```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Getting More Help

If none of these solutions work:

1. **Check Console Errors**
   - Open DevTools (F12)
   - Look at Console tab
   - Copy full error message

2. **Check Network Tab**
   - See which requests are failing
   - Check response status codes

3. **Check Logs**
   - Frontend: Browser console
   - Backend: Terminal output

4. **Search for Error**
   - Google the exact error message
   - Check Stack Overflow
   - Check GitHub issues

5. **Ask for Help**
   - Provide full error message
   - Include steps to reproduce
   - Share relevant code snippets
   - Mention your environment (OS, Node version, etc.)

---

## Useful Commands

### Check Versions
```bash
node --version
pnpm --version
python --version
poetry --version
```

### Clear All Caches
```bash
# Frontend
cd frontend
rm -rf node_modules
rm -rf .vite
rm -rf dist
rm pnpm-lock.yaml
pnpm install

# Backend
cd backend
poetry cache clear . --all
rm -rf .pytest_cache
poetry install
```

### Reset Everything
```bash
# Stop all servers
# Then:
git clean -fdx  # ⚠️ This deletes all untracked files!
pnpm install
poetry install
```

---

## Prevention Tips

1. **Keep Dependencies Updated**
   ```bash
   pnpm update
   poetry update
   ```

2. **Run Tests Before Committing**
   ```bash
   pnpm test
   poetry run pytest
   ```

3. **Use Linting**
   ```bash
   pnpm lint
   ```

4. **Check for Type Errors**
   ```bash
   pnpm build
   ```

5. **Review Console Regularly**
   - Check for warnings
   - Fix deprecation notices
   - Monitor performance

---

**Still Having Issues?**

Create a detailed bug report with:
- Error message (full text)
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots (if applicable)
