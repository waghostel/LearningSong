# Page A: Text Input Page - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  TextInputPage Component                               │ │
│  │  ├─ TextInputArea (textarea + counter)                 │ │
│  │  ├─ SearchToggle (Google Search grounding)             │ │
│  │  ├─ RateLimitIndicator (X/3 remaining)                 │ │
│  │  └─ GenerateButton (submit + loading state)            │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓ API Call                         │
└───────────────────────────┼─────────────────────────────────┘
                            ↓
┌───────────────────────────┼─────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  POST /api/lyrics/generate                             │ │
│  │  ├─ Validate input & rate limit                        │ │
│  │  ├─ Check cache (content_hash)                         │ │
│  │  └─ Execute AI Pipeline (LangGraph)                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  AI Pipeline (LangGraph State Machine)                 │ │
│  │  ├─ Node: check_search_needed                          │ │
│  │  ├─ Node: google_search_grounding (conditional)        │ │
│  │  ├─ Node: clean_text                                   │ │
│  │  ├─ Node: summarize                                    │ │
│  │  ├─ Node: validate_summary_length                      │ │
│  │  └─ Node: convert_to_lyrics                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Firestore                                              │ │
│  │  ├─ Store lyrics_history                               │ │
│  │  ├─ Update user rate_limit                             │ │
│  │  └─ Cache in cached_songs (if applicable)              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Design

### Component Structure

```typescript
// Page component
TextInputPage
├── useAuth() // Firebase anonymous auth
├── useRateLimit() // Fetch and track rate limit
├── useGenerateLyrics() // TanStack Query mutation
└── Components:
    ├── TextInputArea
    │   ├── textarea (autosize)
    │   └── CharacterCounter
    ├── SearchToggle
    ├── RateLimitIndicator
    ├── GenerateButton
    └── LoadingProgress (conditional)
```

### State Management (Zustand)

```typescript
// stores/textInputStore.ts
interface TextInputState {
  content: string;
  searchEnabled: boolean;
  isGenerating: boolean;
  currentStage: PipelineStage | null;
  
  setContent: (content: string) => void;
  toggleSearch: () => void;
  setGenerating: (isGenerating: boolean) => void;
  setCurrentStage: (stage: PipelineStage) => void;
  reset: () => void;
}

type PipelineStage = 
  | 'cleaning'
  | 'searching'
  | 'summarizing'
  | 'validating'
  | 'converting';
```

### API Client

```typescript
// api/lyrics.ts
interface GenerateLyricsRequest {
  content: string;
  search_enabled: boolean;
}

interface GenerateLyricsResponse {
  lyrics: string;
  content_hash: string;
  cached: boolean;
  processing_time: number;
}

export const generateLyrics = async (
  request: GenerateLyricsRequest
): Promise<GenerateLyricsResponse> => {
  const response = await axios.post('/api/lyrics/generate', request);
  return response.data;
};
```

### UI Components

#### TextInputArea
- shadcn/ui Textarea component
- Auto-resize based on content
- Word count: `content.trim().split(/\s+/).length`
- Visual states:
  - Normal: < 9,000 words
  - Warning: 9,000-10,000 words (yellow border)
  - Error: > 10,000 words (red border)

#### SearchToggle
- shadcn/ui Switch component
- Label: "Enrich with Google Search"
- Tooltip: "Use Google Search to add context to short content"
- Icon indicator when enabled

#### RateLimitIndicator
- Display format: "🎵 X/3 songs remaining today"
- Color coding:
  - Green: 3 remaining
  - Yellow: 1-2 remaining
  - Red: 0 remaining
- Countdown timer when limit reached

#### GenerateButton
- shadcn/ui Button component
- Disabled states:
  - Empty content
  - Content > 10,000 words
  - Rate limit reached
  - Already generating
- Loading state with spinner

#### LoadingProgress
- Progress bar with stages
- Current stage highlighted
- Estimated time remaining
- Cancel button

## Backend Design

### API Endpoint

```python
# app/api/lyrics.py
from fastapi import APIRouter, HTTPException, Depends
from app.models.lyrics import GenerateLyricsRequest, GenerateLyricsResponse
from app.services.ai_pipeline import LyricsPipeline
from app.services.rate_limiter import check_rate_limit
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/lyrics", tags=["lyrics"])

@router.post("/generate", response_model=GenerateLyricsResponse)
async def generate_lyrics(
    request: GenerateLyricsRequest,
    user_id: str = Depends(get_current_user)
):
    # Check rate limit
    await check_rate_limit(user_id)
    
    # Check cache
    cached = await check_lyrics_cache(request.content)
    if cached:
        return cached
    
    # Execute pipeline
    pipeline = LyricsPipeline()
    result = await pipeline.execute(
        content=request.content,
        search_enabled=request.search_enabled
    )
    
    # Store in Firestore
    await store_lyrics_history(user_id, request, result)
    
    return result
```

### Pydantic Models

```python
# app/models/lyrics.py
from pydantic import BaseModel, Field, validator

class GenerateLyricsRequest(BaseModel):
    content: str = Field(..., max_length=100000)  # ~10k words
    search_enabled: bool = False
    
    @validator('content')
    def validate_content(cls, v):
        if not v.strip():
            raise ValueError('Content cannot be empty')
        word_count = len(v.strip().split())
        if word_count > 10000:
            raise ValueError(f'Content exceeds 10,000 words ({word_count})')
        return v

class GenerateLyricsResponse(BaseModel):
    lyrics: str
    content_hash: str
    cached: bool = False
    processing_time: float
```

### AI Pipeline (LangGraph)

```python
# app/services/ai_pipeline.py
from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional

class PipelineState(TypedDict):
    user_input: str
    search_enabled: bool
    enriched_content: str
    cleaned_text: str
    summary: str
    summary_valid: bool
    lyrics: str
    error: Optional[str]
    content_hash: str

class LyricsPipeline:
    def __init__(self):
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(PipelineState)
        
        # Add nodes
        workflow.add_node("check_search", self._check_search_needed)
        workflow.add_node("google_search", self._google_search_grounding)
        workflow.add_node("clean", self._clean_text)
        workflow.add_node("summarize", self._summarize)
        workflow.add_node("validate", self._validate_summary_length)
        workflow.add_node("convert", self._convert_to_lyrics)
        workflow.add_node("error", self._handle_error)
        
        # Add edges
        workflow.set_entry_point("check_search")
        workflow.add_conditional_edges(
            "check_search",
            lambda x: "google_search" if x["search_enabled"] else "clean"
        )
        workflow.add_edge("google_search", "clean")
        workflow.add_edge("clean", "summarize")
        workflow.add_edge("summarize", "validate")
        workflow.add_conditional_edges(
            "validate",
            lambda x: "convert" if x["summary_valid"] else "error"
        )
        workflow.add_edge("convert", END)
        workflow.add_edge("error", END)
        
        return workflow.compile()
    
    async def execute(self, content: str, search_enabled: bool) -> dict:
        initial_state = {
            "user_input": content,
            "search_enabled": search_enabled,
            "enriched_content": "",
            "cleaned_text": "",
            "summary": "",
            "summary_valid": False,
            "lyrics": "",
            "error": None,
            "content_hash": ""
        }
        
        result = await self.graph.ainvoke(initial_state)
        
        if result["error"]:
            raise Exception(result["error"])
        
        return {
            "lyrics": result["lyrics"],
            "content_hash": result["content_hash"],
            "cached": False,
            "processing_time": 0  # Track actual time
        }
    
    # Node implementations
    async def _check_search_needed(self, state: PipelineState) -> PipelineState:
        # Logic to determine if search is needed
        return state
    
    async def _google_search_grounding(self, state: PipelineState) -> PipelineState:
        # Call Google Search API to enrich content
        return state
    
    async def _clean_text(self, state: PipelineState) -> PipelineState:
        # Remove HTML, special chars, normalize whitespace
        return state
    
    async def _summarize(self, state: PipelineState) -> PipelineState:
        # Extract 3-5 key learning points (max 500 words)
        return state
    
    async def _validate_summary_length(self, state: PipelineState) -> PipelineState:
        # Check if summary fits Suno limits
        return state
    
    async def _convert_to_lyrics(self, state: PipelineState) -> PipelineState:
        # Apply song structure, rhyme, rhythm
        return state
    
    async def _handle_error(self, state: PipelineState) -> PipelineState:
        # Log and format error
        return state
```

### Rate Limiting

```python
# app/services/rate_limiter.py
from datetime import datetime, timedelta
from fastapi import HTTPException
from app.core.firebase import firestore_client

async def check_rate_limit(user_id: str):
    user_ref = firestore_client.collection('users').document(user_id)
    user_doc = await user_ref.get()
    
    if not user_doc.exists:
        # Create new user
        await user_ref.set({
            'created_at': datetime.utcnow(),
            'songs_generated_today': 0,
            'daily_limit_reset': datetime.utcnow() + timedelta(days=1)
        })
        return
    
    user_data = user_doc.to_dict()
    
    # Check if reset needed
    if datetime.utcnow() > user_data['daily_limit_reset']:
        await user_ref.update({
            'songs_generated_today': 0,
            'daily_limit_reset': datetime.utcnow() + timedelta(days=1)
        })
        return
    
    # Check limit
    if user_data['songs_generated_today'] >= 3:
        reset_time = user_data['daily_limit_reset']
        raise HTTPException(
            status_code=429,
            detail={
                'error': 'Rate limit exceeded',
                'retry_after': (reset_time - datetime.utcnow()).total_seconds()
            }
        )
```

### Caching Strategy

```python
# app/services/cache.py
import hashlib
from datetime import datetime, timedelta
from app.core.firebase import firestore_client

def generate_content_hash(content: str) -> str:
    """Generate SHA-256 hash of cleaned content"""
    cleaned = content.strip().lower()
    return hashlib.sha256(cleaned.encode()).hexdigest()

async def check_lyrics_cache(content: str) -> Optional[dict]:
    """Check if lyrics exist in cache"""
    content_hash = generate_content_hash(content)
    
    cache_ref = firestore_client.collection('cached_songs').document(content_hash)
    cache_doc = await cache_ref.get()
    
    if not cache_doc.exists:
        return None
    
    cache_data = cache_doc.to_dict()
    
    # Update cache stats
    await cache_ref.update({
        'hit_count': cache_data['hit_count'] + 1,
        'last_accessed': datetime.utcnow()
    })
    
    return {
        'lyrics': cache_data['lyrics'],
        'content_hash': content_hash,
        'cached': True,
        'processing_time': 0
    }
```

## Data Flow

### Happy Path
1. User enters content and clicks "Generate Lyrics"
2. Frontend validates input (length, rate limit)
3. Frontend calls `POST /api/lyrics/generate`
4. Backend checks rate limit (Firestore)
5. Backend checks cache (content_hash lookup)
6. If cache miss: Execute AI pipeline
   - Clean text
   - (Optional) Google Search grounding
   - Summarize content
   - Validate summary length
   - Convert to lyrics
7. Backend stores result in Firestore
8. Backend returns lyrics to frontend
9. Frontend navigates to Page B (Lyrics Editing)

### Error Paths
- **Rate limit exceeded**: Show countdown timer, disable button
- **Content too long**: Show error message, highlight counter
- **Network error**: Show retry button
- **Pipeline error**: Show user-friendly message, log to Firestore

## Security Considerations

### Input Validation
- Sanitize all user input to prevent XSS
- Validate content length on both frontend and backend
- Rate limit API calls per user

### Authentication
- Use Firebase anonymous authentication
- Generate unique user ID on first visit
- Store user ID in secure httpOnly cookie

### API Security
- CORS configuration for frontend domain only
- Rate limiting at API gateway level
- Input validation with Pydantic

## Performance Optimization

### Frontend
- Debounce character counter updates (300ms)
- Lazy load heavy components
- Use React.memo for static components
- Optimize bundle size with code splitting

### Backend
- Cache frequently requested content
- Use async/await for all I/O operations
- Connection pooling for Firestore
- Implement request timeout (30s)

### Caching
- Content hash-based caching
- 30-day TTL for cached lyrics
- Max 1000 cached entries
- LRU eviction policy

## Monitoring & Logging

### Frontend Metrics
- Page load time
- API response time
- Error rate by type
- User engagement (button clicks, input length)

### Backend Metrics
- API endpoint latency
- Pipeline stage duration
- Cache hit rate
- Rate limit violations
- Error rate by stage

### Logging
- All API requests (user_id, timestamp, endpoint)
- Pipeline execution (stages, duration, errors)
- Cache hits/misses
- Rate limit checks
