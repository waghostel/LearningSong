# API Setup Guide for Real Testing

This guide walks you through setting up API keys and credentials to test LearningSong with real services.

**Last Updated:** November 30, 2025  
**Focus:** Page A (Content Input) and Page B (Lyrics Editing)

## API Requirements Overview

### 🔴 Required APIs (Core Functionality)
- **Suno API** - Music generation from lyrics
- **Firebase** - User authentication and data storage  
- **OpenAI API** - Lyrics generation from educational content

### 🟡 Optional APIs (Enhanced Features)
- **Google Search API** - Content enrichment for short inputs
- **Redis** - Caching for performance and cost reduction

**Minimum Setup:** You can start with just the required APIs and add optional ones later.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Required APIs](#required-apis)
   - [Suno API Setup](#suno-api-setup)
   - [Firebase Setup](#firebase-setup)
   - [OpenAI API Setup](#openai-api-setup)
3. [Optional APIs](#optional-apis)
   - [Google Search API Setup](#google-search-api-setup)
   - [Redis Setup](#redis-setup)
4. [Environment Configuration](#environment-configuration)
5. [Testing the Setup](#testing-the-setup)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Python 3.11+ and Poetry
- Git
- Active accounts for: **Suno** (required), **Firebase** (required), **OpenAI** (required)
- Optional: Google Cloud account, Redis server

### 5-Minute Setup (Required APIs Only)
```bash
# 1. Clone and install
git clone <repo>
cd LearningSong

# 2. Backend setup
cd backend
cp .env.example .env
# Edit .env with REQUIRED keys only:
#   - SUNO_API_KEY
#   - FIREBASE_PROJECT_ID + FIREBASE_CREDENTIALS_PATH  
#   - OPENAI_API_KEY
poetry install
poetry run uvicorn app.main:app --reload

# 3. Frontend setup (new terminal)
cd frontend
cp .env.example .env
# Edit .env with Firebase web config
pnpm install
pnpm dev

# 4. Test at http://localhost:5173
```

### Optional Enhancement Setup
After basic functionality works, you can add:
- **Google Search API** - For content enrichment
- **Redis** - For caching and performance

---

# Required APIs

## Suno API Setup

### What is Suno API?
Suno API generates music from lyrics. It's the core service that creates the actual songs.

### Step 1: Get Suno API Key

1. Visit [Suno API Console](https://sunoapi.org)
2. Sign up or log in with your account
3. Navigate to **API Keys** section
4. Click **Generate New API Key**
5. Copy the key (you won't see it again)

### Step 2: Configure Backend

**File:** `backend/.env`

```bash
# Suno API Configuration
SUNO_API_KEY=your-suno-api-key-here
SUNO_API_URL=https://api.sunoapi.org
```

### Step 3: Verify Connection

```bash
cd backend
poetry run python -c "
import os
from app.services.suno_client import SunoClient

api_key = os.getenv('SUNO_API_KEY')
if not api_key:
    print('❌ SUNO_API_KEY not set')
else:
    print('✅ SUNO_API_KEY configured')
    print(f'   Key length: {len(api_key)} characters')
"
```

### Suno API Pricing & Limits

| Plan | Cost | Monthly Limit | Notes |
|------|------|---------------|-------|
| Free | $0 | 10 songs | Good for testing |
| Pro | $10 | 500 songs | Recommended for development |
| Enterprise | Custom | Unlimited | For production |

**Current Implementation:** Supports all plans. Rate limiting handled by backend.

---

## Firebase Setup

### What is Firebase?
Firebase provides authentication, database (Firestore), and storage for user data.

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Create a project**
3. Enter project name: `LearningSong` (or your choice)
4. Accept terms and create

### Step 2: Enable Anonymous Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Select **Anonymous** provider
4. Click **Enable** and **Save**

### Step 3: Create Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Select **Start in test mode** (for development)
4. Choose region (e.g., `us-central1`)
5. Click **Create**

### Step 4: Get Firebase Credentials

#### For Backend (Service Account)

1. Go to **Project Settings** (gear icon)
2. Click **Service Accounts** tab
3. Click **Generate New Private Key**
4. Save the JSON file as `backend/firebase-credentials.json`
5. **IMPORTANT:** Add to `.gitignore`:
   ```bash
   echo "firebase-credentials.json" >> backend/.gitignore
   ```

#### For Frontend (Web Config)

1. Go to **Project Settings** (gear icon)
2. Click **General** tab
3. Scroll to **Your apps** section
4. Click the web app (or create one with `</>`icon)
5. Copy the config object

### Step 5: Configure Backend

**File:** `backend/.env`

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
```

### Step 6: Configure Frontend

**File:** `frontend/.env`

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Step 7: Verify Connection

```bash
# Backend
cd backend
poetry run python -c "
from app.core.firebase import initialize_firebase
try:
    initialize_firebase()
    print('✅ Firebase initialized successfully')
except Exception as e:
    print(f'❌ Firebase error: {e}')
"

# Frontend
cd frontend
pnpm dev
# Check browser console for Firebase initialization messages
```

---

# Optional APIs

## Google Search API Setup

### What is Google Search API?
**Optional service** to enrich short content with relevant context before generating lyrics. The app works perfectly without this - it just won't do additional research for short inputs.

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Create Project**
3. Enter name: `LearningSong`
4. Click **Create**

### Step 2: Enable Custom Search API

1. Go to **APIs & Services** > **Library**
2. Search for **Custom Search API**
3. Click **Enable**

### Step 3: Create API Key

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy the key

### Step 4: Create Search Engine

1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com)
2. Click **Create** > **New search engine**
3. Name: `LearningSong`
4. Search the entire web: **Yes**
5. Click **Create**
6. Copy the **Search engine ID** (cx parameter)

### Step 5: Configure Backend

**File:** `backend/.env`

```bash
# Google Search API Configuration
GOOGLE_SEARCH_API_KEY=your-api-key-here
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id-here
```

### Step 6: Verify Connection

```bash
cd backend
poetry run python -c "
import os
from app.services.google_search import GoogleSearchClient

api_key = os.getenv('GOOGLE_SEARCH_API_KEY')
engine_id = os.getenv('GOOGLE_SEARCH_ENGINE_ID')

if api_key and engine_id:
    print('✅ Google Search API configured')
else:
    print('⚠️  Google Search API not configured (optional)')
"
```

### Google Search Pricing

| Queries/Day | Cost |
|-------------|------|
| 0-100 | Free |
| 101+ | $5 per 1000 queries |

**Current Implementation:** Optional feature. Works without it.

---

## Redis Setup

### What is Redis?
**Optional caching service** that improves performance and reduces API costs by caching responses. The app works without Redis - it just won't cache API responses.

### Step 1: Install Redis (Optional)

#### Windows (using Chocolatey)
```bash
choco install redis-64
redis-server
```

#### macOS (using Homebrew)
```bash
brew install redis
brew services start redis
```

#### Docker (Cross-platform)
```bash
docker run -d -p 6379:6379 redis:alpine
```

### Step 2: Configure Backend (Optional)

**File:** `backend/.env`

```bash
# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379
```

### Step 3: Verify Connection (Optional)

```bash
cd backend
poetry run python -c "
import os
import redis

redis_url = os.getenv('REDIS_URL')
if redis_url:
    try:
        r = redis.from_url(redis_url)
        r.ping()
        print('✅ Redis connected successfully')
    except Exception as e:
        print(f'❌ Redis error: {e}')
else:
    print('ℹ️  Redis not configured (optional)')
"
```

### Redis Benefits

| Feature | With Redis | Without Redis |
|---------|------------|---------------|
| API Response Caching | ✅ Cached | ❌ Every request hits API |
| Performance | ✅ Faster repeat requests | ⚠️ Slower repeat requests |
| Cost Efficiency | ✅ Reduced API calls | ❌ Higher API costs |

**Current Implementation:** Gracefully degrades without Redis.

---

## OpenAI API Setup

### What is OpenAI API?
Used by LangChain/LangGraph to generate lyrics from educational content.

### Step 1: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in
3. Go to **API keys** section
4. Click **Create new secret key**
5. Copy the key

### Step 2: Set Up Billing

1. Go to **Billing** > **Overview**
2. Add payment method
3. Set usage limits (recommended: $10/month for testing)

### Step 3: Configure Backend

**File:** `backend/.env`

```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-key-here
```

### Step 4: Verify Connection

```bash
cd backend
poetry run python -c "
import os
from langchain_openai import ChatOpenAI

api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    print('❌ OPENAI_API_KEY not set')
else:
    try:
        llm = ChatOpenAI(api_key=api_key, model='gpt-4o-mini')
        print('✅ OpenAI API configured')
        print(f'   Model: gpt-4o-mini')
    except Exception as e:
        print(f'❌ OpenAI error: {e}')
"
```

### OpenAI Pricing

| Model | Cost per 1M tokens |
|-------|-------------------|
| gpt-4o-mini | $0.15 (input) / $0.60 (output) |
| gpt-4 | $30 (input) / $60 (output) |

**Current Implementation:** Uses `gpt-4o-mini` for cost efficiency.

---

## Environment Configuration

### Backend Setup

**File:** `backend/.env`

```bash
# ===== REQUIRED CONFIGURATION =====

# Firebase Configuration (required)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

# Suno API Configuration (required)
SUNO_API_KEY=your-suno-api-key
SUNO_API_URL=https://api.sunoapi.org

# OpenAI API Configuration (required)
OPENAI_API_KEY=sk-your-openai-key

# ===== OPTIONAL CONFIGURATION =====

# Google Search API Configuration (optional)
# Used for content enrichment when input text is short
# The app works without this - it just won't do additional research
GOOGLE_SEARCH_API_KEY=your-google-search-api-key
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id

# Redis Configuration (optional)
# Used for caching to reduce API costs and improve performance
# The app works without Redis - it just won't cache responses
REDIS_URL=redis://localhost:6379

# Application Settings (optional)
# These have sensible defaults if not set
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=INFO
```

### Frontend Setup

**File:** `frontend/.env`

```bash
# API Configuration (required)
# These should match your backend server URLs
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Firebase Configuration (required)
# Required for user authentication and data storage
# Get these values from Firebase Console > Project Settings > General > Your apps
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Verify All Configurations

```bash
# Backend
cd backend
poetry run python -c "
import os
from dotenv import load_dotenv

load_dotenv()

# Required configurations
required_checks = {
    'FIREBASE_PROJECT_ID': os.getenv('FIREBASE_PROJECT_ID'),
    'FIREBASE_CREDENTIALS_PATH': os.getenv('FIREBASE_CREDENTIALS_PATH'),
    'SUNO_API_KEY': '✓' if os.getenv('SUNO_API_KEY') else '✗ REQUIRED',
    'OPENAI_API_KEY': '✓' if os.getenv('OPENAI_API_KEY') else '✗ REQUIRED',
}

# Optional configurations
optional_checks = {
    'GOOGLE_SEARCH_API_KEY': '✓' if os.getenv('GOOGLE_SEARCH_API_KEY') else '- (optional)',
    'REDIS_URL': '✓' if os.getenv('REDIS_URL') else '- (optional)',
}

print('🔴 Required Configuration Status:')
for key, value in required_checks.items():
    print(f'  {key}: {value}')

print('\n🟡 Optional Configuration Status:')
for key, value in optional_checks.items():
    print(f'  {key}: {value}')
"
```

---

## Testing the Setup

### Test 1: Backend Health Check

```bash
cd backend
poetry run uvicorn app.main:app --reload

# In another terminal
curl http://localhost:8000/health
# Expected: {"status": "healthy"}
```

### Test 2: Frontend Loads

```bash
cd frontend
pnpm dev

# Open http://localhost:5173 in browser
# Check browser console for errors
```

### Test 3: Page A - Content Input

1. Navigate to http://localhost:5173
2. Enter educational content (e.g., "Photosynthesis is...")
3. Click **Generate lyrics from content**
4. Expected: Redirects to Page B with generated lyrics

**What happens:**
- Frontend sends content to backend
- Backend uses OpenAI to generate lyrics
- Results cached in Firestore
- User redirected to Page B

### Test 4: Page B - Lyrics Editing

1. On Page B, review generated lyrics
2. Select a music style (e.g., "Pop")
3. Click **Generate song from lyrics**
4. Expected: Progress tracker shows generation status

**What happens:**
- Frontend sends lyrics + style to backend
- Backend calls Suno API to create song
- WebSocket sends real-time progress updates
- Song URL returned when complete

### Test 5: Real-Time Updates

1. Start song generation on Page B
2. Open browser DevTools (F12)
3. Go to **Network** tab
4. Filter by **WS** (WebSocket)
5. Expected: See WebSocket connection to `/socket.io/`
6. Watch for status update messages

### Test 6: Error Handling

#### Test Timeout (90 seconds)
```bash
# Backend has test endpoint for this
curl -X POST http://localhost:8000/api/songs/generate-timeout-test \
  -H "Content-Type: application/json" \
  -d '{"lyrics": "test", "style": "pop"}'

# Frontend should show timeout error after 90s
```

#### Test Rate Limit
1. Generate 3 songs quickly
2. Attempt 4th generation
3. Expected: "Daily limit reached (3/3 songs)" message

#### Test Invalid Lyrics
1. Leave lyrics empty
2. Click generate
3. Expected: "Lyrics cannot be empty" error

---

## Troubleshooting

### Firebase Connection Issues

**Error:** `Firebase initialization failed: Firebase credentials file not found`

**Solution:**
```bash
# 1. Verify file exists
ls -la backend/firebase-credentials.json

# 2. Check path in .env
cat backend/.env | grep FIREBASE_CREDENTIALS_PATH

# 3. Ensure absolute or correct relative path
# Relative paths are from backend/ directory
```

### Suno API Key Invalid

**Error:** `401 Unauthorized` from Suno API

**Solution:**
```bash
# 1. Verify key format
echo $SUNO_API_KEY | wc -c  # Should be ~40+ characters

# 2. Check for extra spaces
grep SUNO_API_KEY backend/.env

# 3. Regenerate key from Suno console
```

### OpenAI API Errors

**Error:** `Invalid API key provided`

**Solution:**
```bash
# 1. Verify key starts with 'sk-'
echo $OPENAI_API_KEY | head -c 3

# 2. Check billing is enabled
# Go to https://platform.openai.com/account/billing/overview

# 3. Verify key has access to gpt-4o-mini model
```

### WebSocket Connection Failed

**Error:** `WebSocket connection failed` in browser console

**Solution:**
```bash
# 1. Verify backend is running
curl http://localhost:8000/health

# 2. Check CORS configuration in backend/app/main.py
# Should include http://localhost:5173

# 3. Check firewall/proxy isn't blocking WebSocket
```

### Rate Limit Errors

**Error:** `429 Too Many Requests` from Suno API

**Solution:**
- Suno API has rate limits (varies by plan)
- Wait before retrying
- Consider upgrading Suno plan
- Check backend logs for retry attempts

### Timeout Issues

**Error:** `Song generation is taking longer than expected`

**Solution:**
- Suno API can take 30-120 seconds
- Check Suno API status page
- Verify internet connection
- Try with shorter lyrics
- Check backend logs for Suno API errors

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All API keys stored in secure environment variables
- [ ] Firebase credentials NOT in version control
- [ ] CORS origins updated to production domain
- [ ] Rate limiting configured appropriately
- [ ] Error logging and monitoring enabled
- [ ] Database backups configured
- [ ] API key rotation policy established
- [ ] Rate limit alerts configured
- [ ] Suno API plan upgraded for production load
- [ ] OpenAI API spending limits set

---

## Support & Resources

### Documentation
- [Suno API Docs](https://sunoapi.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Google Search API Docs](https://developers.google.com/custom-search)
- [OpenAI API Docs](https://platform.openai.com/docs)

### Debugging
- Backend logs: `backend/app/core/logging.py`
- Frontend console: Browser DevTools (F12)
- Network requests: DevTools Network tab
- WebSocket messages: DevTools Network > WS filter

### Common Issues
- Check `.env` files are not in git
- Verify all API keys are valid and active
- Ensure services are running on correct ports
- Check firewall/proxy settings
- Review backend logs for detailed errors

