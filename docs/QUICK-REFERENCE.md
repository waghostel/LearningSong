# Quick Reference Guide

**For:** Page A (Content Input) & Page B (Lyrics Editing)  
**Updated:** November 27, 2025

---

## 🚀 Quick Start (5 minutes)

```bash
# 1. Backend
cd backend
cp .env.example .env
# Edit .env with your API keys
poetry install
poetry run uvicorn app.main:app --reload

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env
# Edit .env with Firebase config
pnpm install
pnpm dev

# 3. Open http://localhost:5173
```

---

## 📋 Required API Keys

| Service | Key | Where to Get | Required? |
|---------|-----|--------------|-----------|
| **Suno** | `SUNO_API_KEY` | [sunoapi.org](https://sunoapi.org) | ✅ Yes |
| **Firebase** | Service account JSON | [Firebase Console](https://console.firebase.google.com) | ✅ Yes |
| **OpenAI** | `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) | ✅ Yes |
| **Google Search** | `GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_ENGINE_ID` | [Google Cloud](https://console.cloud.google.com) | ⚠️ Optional |

---

## 🔧 Environment Files

### Backend: `backend/.env`
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
SUNO_API_KEY=your-suno-key
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_SEARCH_API_KEY=your-google-key
GOOGLE_SEARCH_ENGINE_ID=your-engine-id
ENVIRONMENT=development
LOG_LEVEL=INFO
```

### Frontend: `frontend/.env`
```bash
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 🧪 Testing Checklist

### Page A: Content Input
- [ ] Enter text (1-10,000 words)
- [ ] Toggle Google Search
- [ ] Click "Generate lyrics"
- [ ] Verify redirect to Page B
- [ ] Check for errors in console

### Page B: Lyrics Editing
- [ ] Review generated lyrics
- [ ] Select music style
- [ ] Click "Generate song"
- [ ] Watch progress tracker
- [ ] Verify song URL returned

### Error Scenarios
- [ ] Empty lyrics → error message
- [ ] Lyrics > 3000 chars → error message
- [ ] Generate 4th song → rate limit message
- [ ] Disconnect network → offline indicator
- [ ] Wait 90+ seconds → timeout message

---

## 🔍 Debugging Commands

### Backend Health
```bash
curl http://localhost:8000/health
# Expected: {"status": "healthy"}
```

### Check API Keys
```bash
cd backend
poetry run python -c "
import os
from dotenv import load_dotenv
load_dotenv()
print('SUNO_API_KEY:', '✓' if os.getenv('SUNO_API_KEY') else '✗')
print('OPENAI_API_KEY:', '✓' if os.getenv('OPENAI_API_KEY') else '✗')
print('FIREBASE_PROJECT_ID:', os.getenv('FIREBASE_PROJECT_ID'))
"
```

### View Backend Logs
```bash
# Logs are JSON formatted
tail -f backend/app.log | jq '.'
```

### Check Frontend Console
```
Browser DevTools → Console tab
Look for errors or warnings
```

### Monitor WebSocket
```
Browser DevTools → Network tab
Filter by "WS"
Watch for status updates
```

---

## 📊 API Endpoints

### Lyrics Generation
```
POST /api/lyrics/generate
Body: {
  "content": "Educational content...",
  "search_enabled": true
}
Response: {
  "lyrics": "Generated lyrics...",
  "content_hash": "hash",
  "cached": false,
  "processing_time": 2.5
}
```

### Song Generation
```
POST /api/songs/generate
Body: {
  "lyrics": "Song lyrics...",
  "style": "pop",
  "content_hash": "hash"
}
Response: {
  "task_id": "task-123",
  "estimated_time": 60
}
```

### Song Status
```
GET /api/songs/{task_id}
Response: {
  "task_id": "task-123",
  "status": "processing",
  "progress": 45,
  "song_url": null,
  "error": null
}
```

### Rate Limit
```
GET /api/lyrics/rate-limit
Response: {
  "remaining": 2,
  "reset_time": "2025-11-28T00:00:00Z"
}
```

---

## 🎵 Music Styles

| Style | Description |
|-------|-------------|
| **Pop** | Upbeat and catchy melodies |
| **Rap** | Rhythmic and hip-hop style |
| **Folk** | Acoustic and gentle |
| **Electronic** | EDM and energetic |
| **Rock** | Powerful with guitar |
| **Jazz** | Smooth and sophisticated |
| **Children** | Simple and fun |
| **Classical** | Orchestral and elegant |

---

## ⏱️ Timeouts & Limits

| Item | Value | Notes |
|------|-------|-------|
| API Timeout | 90 seconds | Frontend aborts after this |
| Song Generation | 30-120 seconds | Typical time |
| Rate Limit | 3 songs/day | Per user |
| Lyrics Length | 50-3000 chars | Character limit |
| Content Length | 1-10,000 words | Word limit |
| Data Retention | 48 hours | Anonymous users |

---

## 🚨 Common Errors & Fixes

### "Firebase initialization failed"
```bash
# Check credentials file exists
ls -la backend/firebase-credentials.json

# Verify path in .env
grep FIREBASE_CREDENTIALS_PATH backend/.env
```

### "Invalid API key"
```bash
# Verify key format
echo $SUNO_API_KEY | head -c 10

# Regenerate from console
# Suno: https://sunoapi.org
# OpenAI: https://platform.openai.com
```

### "WebSocket connection failed"
```bash
# Check backend running
curl http://localhost:8000/health

# Check CORS in backend/app/main.py
# Should include http://localhost:5173
```

### "Rate limit exceeded"
```bash
# Wait until next day (UTC)
# Or check remaining songs
curl http://localhost:8000/api/lyrics/rate-limit
```

### "Song generation timeout"
```bash
# Normal - Suno API can be slow
# User can retry
# Check Suno API status
```

---

## 📁 Key Files

### Backend
- `backend/app/main.py` - Entry point
- `backend/app/api/lyrics.py` - Lyrics endpoints
- `backend/app/api/songs.py` - Song endpoints
- `backend/app/services/suno_client.py` - Suno API client
- `backend/app/services/ai_pipeline.py` - Lyrics generation
- `backend/.env` - Configuration

### Frontend
- `frontend/src/pages/TextInputPage.tsx` - Page A
- `frontend/src/pages/LyricsEditPage.tsx` - Page B
- `frontend/src/api/songs.ts` - API functions
- `frontend/src/hooks/useSongGeneration.ts` - Generation hook
- `frontend/src/hooks/useWebSocket.ts` - WebSocket hook
- `frontend/.env` - Configuration

---

## 🔐 Security Notes

### Do NOT commit:
- `.env` files
- `firebase-credentials.json`
- API keys
- Secrets

### Add to `.gitignore`:
```bash
.env
.env.local
firebase-credentials.json
*.key
*.pem
```

### For Production:
- Use environment variables
- Rotate API keys regularly
- Enable API key restrictions
- Set spending limits
- Monitor usage

---

## 📞 Support

### Documentation
- Full setup: `docs/API-SETUP-GUIDE.md`
- Incomplete tasks: `docs/INCOMPLETE-TASKS.md`
- Debugging report: `.kiro/specs/page-b-debugging/debugging-summary.md`

### Logs
- Backend: JSON formatted in console
- Frontend: Browser DevTools Console
- Network: Browser DevTools Network tab

### Resources
- [Suno API Docs](https://sunoapi.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [OpenAI Docs](https://platform.openai.com/docs)
- [Google Search Docs](https://developers.google.com/custom-search)

---

## ✅ Pre-Launch Checklist

- [ ] All API keys configured
- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Page A loads and accepts input
- [ ] Page B loads with generated lyrics
- [ ] Song generation works
- [ ] Progress tracker updates
- [ ] Error messages display correctly
- [ ] Rate limit works
- [ ] Timeout handling works
- [ ] WebSocket connects
- [ ] Offline detection works
- [ ] No console errors
- [ ] Responsive on mobile/tablet

---

## 🎯 Next Steps

1. **Setup APIs** - Follow API-SETUP-GUIDE.md
2. **Configure Environment** - Set .env files
3. **Start Servers** - Backend + Frontend
4. **Test Manually** - Use checklist above
5. **Review Logs** - Check for errors
6. **Deploy** - When ready

---

**Last Updated:** November 27, 2025  
**Status:** ✅ Production Ready (with API keys)

