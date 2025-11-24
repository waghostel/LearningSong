# Page B: Lyrics Editing Page - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  LyricsEditingPage Component                           │ │
│  │  ├─ LyricsPreview (read-only display)                  │ │
│  │  ├─ LyricsEditor (editable textarea + counter)         │ │
│  │  ├─ StyleSelector (dropdown with 8 styles)             │ │
│  │  ├─ GenerateSongButton (submit + loading)              │ │
│  │  └─ ProgressTracker (WebSocket status)                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓ API Call                         │
└───────────────────────────┼─────────────────────────────────┘
                            ↓
┌───────────────────────────┼─────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  POST /api/songs/generate                              │ │
│  │  ├─ Validate lyrics & rate limit                       │ │
│  │  ├─ Check cache (content_hash + style)                 │ │
│  │  └─ Call Suno API to create task                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  WebSocket: /ws/songs/status                           │ │
│  │  ├─ Client subscribes with task_id                     │ │
│  │  ├─ Backend polls Suno API for status                  │ │
│  │  ├─ Push updates to client (queued/processing/done)    │ │
│  │  └─ Send final song URL when complete                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Suno API Integration                                   │ │
│  │  ├─ POST /generate (lyrics + style)                    │ │
│  │  ├─ GET /task/{task_id} (poll status)                  │ │
│  │  └─ Returns: song_url, status, progress                │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Firestore                                              │ │
│  │  ├─ Store song generation tasks                        │ │
│  │  ├─ Update user rate_limit                             │ │
│  │  └─ Cache songs (content_hash + style)                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Design

### Component Structure

```typescript
// Page component
LyricsEditingPage
├── useAuth() // Firebase auth
├── useRateLimit() // Check remaining songs
├── useGenerateSong() // TanStack Query mutation
├── useWebSocket() // Real-time status updates
├── useNotifications() // Browser notifications
└── Components:
    ├── LyricsPreview (optional, shows original)
    ├── LyricsEditor
    │   ├── Textarea (editable)
    │   └── CharacterCounter
    ├── StyleSelector
    │   └── Select (8 options)
    ├── GenerateSongButton
    ├── ProgressTracker (conditional)
    └── NavigationButtons (back, cancel)
```

### State Management (Zustand)

```typescript
// stores/lyricsEditingStore.ts
interface LyricsEditingState {
  originalLyrics: string;
  editedLyrics: string;
  selectedStyle: MusicStyle;
  contentHash: string;
  
  isGenerating: boolean;
  taskId: string | null;
  generationStatus: GenerationStatus;
  progress: number;
  songUrl: string | null;
  error: string | null;
  
  setOriginalLyrics: (lyrics: string) => void;
  setEditedLyrics: (lyrics: string) => void;
  setSelectedStyle: (style: MusicStyle) => void;
  setContentHash: (hash: string) => void;
  
  startGeneration: (taskId: string) => void;
  updateProgress: (status: GenerationStatus, progress: number) => void;
  completeGeneration: (songUrl: string) => void;
  failGeneration: (error: string) => void;
  reset: () => void;
}

type MusicStyle = 
  | 'pop'
  | 'rap'
  | 'folk'
  | 'electronic'
  | 'rock'
  | 'jazz'
  | 'children'
  | 'classical';

type GenerationStatus = 
  | 'idle'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';
```

### API Client

```typescript
// api/songs.ts
interface GenerateSongRequest {
  lyrics: string;
  style: MusicStyle;
  content_hash?: string;
}

interface GenerateSongResponse {
  task_id: string;
  estimated_time: number; // seconds
}

interface SongStatusUpdate {
  task_id: string;
  status: GenerationStatus;
  progress: number; // 0-100
  song_url?: string;
  error?: string;
}

export const generateSong = async (
  request: GenerateSongRequest
): Promise<GenerateSongResponse> => {
  const response = await axios.post('/api/songs/generate', request);
  return response.data;
};

export const getSongStatus = async (
  taskId: string
): Promise<SongStatusUpdate> => {
  const response = await axios.get(`/api/songs/${taskId}`);
  return response.data;
};
```

### WebSocket Client

```typescript
// hooks/useWebSocket.ts
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  taskId: string;
  onStatusUpdate: (update: SongStatusUpdate) => void;
  onComplete: (songUrl: string) => void;
  onError: (error: string) => void;
}

export const useWebSocket = ({
  taskId,
  onStatusUpdate,
  onComplete,
  onError
}: UseWebSocketOptions) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!taskId) return;

    // Connect to WebSocket
    const newSocket = io(import.meta.env.VITE_WS_URL, {
      auth: {
        token: getFirebaseToken()
      }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Subscribe to task updates
      newSocket.emit('subscribe', { task_id: taskId });
    });

    newSocket.on('song_status', (update: SongStatusUpdate) => {
      onStatusUpdate(update);
      
      if (update.status === 'completed' && update.song_url) {
        onComplete(update.song_url);
      } else if (update.status === 'failed' && update.error) {
        onError(update.error);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [taskId]);

  return { socket, isConnected };
};
```

### Browser Notifications

```typescript
// hooks/useNotifications.ts
export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return false;
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      new Notification(title, {
        icon: '/logo.png',
        badge: '/badge.png',
        ...options
      });
    }
  };

  return { permission, requestPermission, sendNotification };
};
```

### UI Components

#### LyricsEditor
- shadcn/ui Textarea component
- Auto-resize based on content
- Character count: `editedLyrics.length`
- Visual states:
  - Normal: < 2700 characters
  - Warning: 2700-3000 characters (yellow border)
  - Error: > 3000 characters (red border)
- Undo/redo support (browser default)

#### StyleSelector
- shadcn/ui Select component
- 8 options with descriptions:
  ```typescript
  const MUSIC_STYLES = [
    { value: 'pop', label: 'Pop', description: 'Upbeat and catchy' },
    { value: 'rap', label: 'Rap/Hip-Hop', description: 'Rhythmic and fast-paced' },
    { value: 'folk', label: 'Folk/Acoustic', description: 'Gentle storytelling' },
    { value: 'electronic', label: 'Electronic/EDM', description: 'Energetic and modern' },
    { value: 'rock', label: 'Rock', description: 'Powerful and memorable' },
    { value: 'jazz', label: 'Jazz', description: 'Smooth and sophisticated' },
    { value: 'children', label: "Children's Song", description: 'Simple and fun' },
    { value: 'classical', label: 'Classical/Orchestral', description: 'Elegant and dramatic' }
  ];
  ```

#### GenerateSongButton
- shadcn/ui Button component
- Disabled states:
  - Empty lyrics
  - Lyrics > 3000 characters
  - Rate limit reached
  - Already generating
- Loading state with spinner
- Shows estimated time (30-60s)

#### ProgressTracker
- Progress bar with status text
- Status indicators:
  - Queued: "Your song is in the queue..."
  - Processing: "Generating your song... X%"
  - Completed: "Song ready! Redirecting..."
  - Failed: "Generation failed. Please try again."
- Animated progress bar
- Cancel button (optional)

## Backend Design

### API Endpoints

```python
# app/api/songs.py
from fastapi import APIRouter, HTTPException, Depends
from app.models.songs import GenerateSongRequest, GenerateSongResponse
from app.services.suno_client import SunoClient
from app.services.rate_limiter import check_rate_limit, increment_usage
from app.core.auth import get_current_user

router = APIRouter(prefix="/api/songs", tags=["songs"])

@router.post("/generate", response_model=GenerateSongResponse)
async def generate_song(
    request: GenerateSongRequest,
    user_id: str = Depends(get_current_user)
):
    # Check rate limit
    await check_rate_limit(user_id)
    
    # Check cache (content_hash + style)
    cached = await check_song_cache(request.content_hash, request.style)
    if cached:
        return cached
    
    # Call Suno API
    suno_client = SunoClient()
    task = await suno_client.create_song(
        lyrics=request.lyrics,
        style=request.style
    )
    
    # Store task in Firestore
    await store_song_task(user_id, task.task_id, request)
    
    # Increment usage
    await increment_usage(user_id)
    
    return GenerateSongResponse(
        task_id=task.task_id,
        estimated_time=task.estimated_time
    )

@router.get("/{task_id}")
async def get_song_status(
    task_id: str,
    user_id: str = Depends(get_current_user)
):
    # Verify task belongs to user
    task = await get_task_from_firestore(task_id)
    if task['user_id'] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # Get status from Suno
    suno_client = SunoClient()
    status = await suno_client.get_task_status(task_id)
    
    # Update Firestore
    await update_task_status(task_id, status)
    
    return status
```

### WebSocket Server

```python
# app/api/websocket.py
from fastapi import WebSocket, WebSocketDisconnect, Depends
from app.core.auth import verify_websocket_token
from app.services.suno_client import SunoClient
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
    
    async def connect(self, task_id: str, websocket: WebSocket):
        await websocket.accept()
        if task_id not in self.active_connections:
            self.active_connections[task_id] = []
        self.active_connections[task_id].append(websocket)
    
    def disconnect(self, task_id: str, websocket: WebSocket):
        self.active_connections[task_id].remove(websocket)
        if not self.active_connections[task_id]:
            del self.active_connections[task_id]
    
    async def broadcast(self, task_id: str, message: dict):
        if task_id in self.active_connections:
            for connection in self.active_connections[task_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/songs/status")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    # Verify authentication
    user_id = await verify_websocket_token(token)
    if not user_id:
        await websocket.close(code=1008)
        return
    
    await websocket.accept()
    
    try:
        # Receive subscription message
        data = await websocket.receive_json()
        task_id = data.get('task_id')
        
        if not task_id:
            await websocket.close(code=1003)
            return
        
        # Verify task belongs to user
        task = await get_task_from_firestore(task_id)
        if task['user_id'] != user_id:
            await websocket.close(code=1008)
            return
        
        # Add to connection manager
        await manager.connect(task_id, websocket)
        
        # Start polling Suno API
        await poll_and_broadcast(task_id)
        
    except WebSocketDisconnect:
        manager.disconnect(task_id, websocket)

async def poll_and_broadcast(task_id: str):
    """Poll Suno API and broadcast updates to all connected clients"""
    suno_client = SunoClient()
    
    while True:
        try:
            # Get status from Suno
            status = await suno_client.get_task_status(task_id)
            
            # Broadcast to all connected clients
            await manager.broadcast(task_id, {
                'task_id': task_id,
                'status': status.status,
                'progress': status.progress,
                'song_url': status.song_url,
                'error': status.error
            })
            
            # Stop polling if completed or failed
            if status.status in ['completed', 'failed']:
                # Update Firestore
                await update_task_status(task_id, status)
                break
            
            # Wait before next poll (5 seconds)
            await asyncio.sleep(5)
            
        except Exception as e:
            logger.error(f"Error polling task {task_id}: {e}")
            await manager.broadcast(task_id, {
                'task_id': task_id,
                'status': 'failed',
                'error': str(e)
            })
            break
```

### Pydantic Models

```python
# app/models/songs.py
from pydantic import BaseModel, Field, validator
from typing import Optional
from enum import Enum

class MusicStyle(str, Enum):
    POP = "pop"
    RAP = "rap"
    FOLK = "folk"
    ELECTRONIC = "electronic"
    ROCK = "rock"
    JAZZ = "jazz"
    CHILDREN = "children"
    CLASSICAL = "classical"

class GenerateSongRequest(BaseModel):
    lyrics: str = Field(..., min_length=50, max_length=3000)
    style: MusicStyle
    content_hash: Optional[str] = None
    
    @validator('lyrics')
    def validate_lyrics(cls, v):
        if not v.strip():
            raise ValueError('Lyrics cannot be empty')
        return v

class GenerateSongResponse(BaseModel):
    task_id: str
    estimated_time: int  # seconds

class SongStatusUpdate(BaseModel):
    task_id: str
    status: str  # queued, processing, completed, failed
    progress: int = Field(ge=0, le=100)
    song_url: Optional[str] = None
    error: Optional[str] = None
```

### Suno API Client

```python
# app/services/suno_client.py
import httpx
from typing import Optional
from app.core.config import settings

class SunoTask:
    def __init__(self, task_id: str, estimated_time: int):
        self.task_id = task_id
        self.estimated_time = estimated_time

class SunoStatus:
    def __init__(self, status: str, progress: int, song_url: Optional[str] = None, error: Optional[str] = None):
        self.status = status
        self.progress = progress
        self.song_url = song_url
        self.error = error

class SunoClient:
    def __init__(self):
        self.base_url = settings.SUNO_API_URL
        self.api_key = settings.SUNO_API_KEY
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={'Authorization': f'Bearer {self.api_key}'},
            timeout=30.0
        )
    
    async def create_song(self, lyrics: str, style: str) -> SunoTask:
        """Create a new song generation task"""
        response = await self.client.post('/generate', json={
            'lyrics': lyrics,
            'style': style,
            'title': 'Learning Song'
        })
        response.raise_for_status()
        
        data = response.json()
        return SunoTask(
            task_id=data['task_id'],
            estimated_time=data.get('estimated_time', 60)
        )
    
    async def get_task_status(self, task_id: str) -> SunoStatus:
        """Get the status of a song generation task"""
        response = await self.client.get(f'/task/{task_id}')
        response.raise_for_status()
        
        data = response.json()
        return SunoStatus(
            status=data['status'],
            progress=data.get('progress', 0),
            song_url=data.get('song_url'),
            error=data.get('error')
        )
    
    async def close(self):
        await self.client.aclose()
```

### Caching Strategy

```python
# app/services/cache.py (extended)
async def check_song_cache(content_hash: str, style: str) -> Optional[dict]:
    """Check if song exists in cache for given content and style"""
    cache_key = f"{content_hash}_{style}"
    
    cache_ref = firestore_client.collection('cached_songs').document(cache_key)
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
        'task_id': cache_data['task_id'],
        'estimated_time': 0  # Instant from cache
    }

async def store_song_cache(content_hash: str, style: str, task_id: str, song_url: str):
    """Store completed song in cache"""
    cache_key = f"{content_hash}_{style}"
    
    cache_ref = firestore_client.collection('cached_songs').document(cache_key)
    await cache_ref.set({
        'content_hash': content_hash,
        'style': style,
        'task_id': task_id,
        'song_url': song_url,
        'created_at': datetime.utcnow(),
        'last_accessed': datetime.utcnow(),
        'hit_count': 0
    })
```

## Data Flow

### Happy Path
1. User arrives from Page A with generated lyrics
2. Frontend displays lyrics in editable textarea
3. User modifies lyrics (optional) and selects style
4. User clicks "Generate Song"
5. Frontend validates lyrics and rate limit
6. Frontend calls `POST /api/songs/generate`
7. Backend checks rate limit and cache
8. Backend calls Suno API to create task
9. Backend returns task_id to frontend
10. Frontend establishes WebSocket connection
11. Backend polls Suno API every 5 seconds
12. Backend broadcasts status updates via WebSocket
13. Frontend updates progress bar in real-time
14. When complete, frontend sends browser notification
15. Frontend navigates to Page C with song URL

### Error Paths
- **Rate limit exceeded**: Show countdown, disable button
- **Lyrics too long**: Show error, disable button
- **Suno API timeout**: Continue monitoring, send notification
- **Suno API error**: Retry 3 times, then show error
- **WebSocket disconnection**: Auto-reconnect, show indicator
- **Network error**: Show retry button

## Security Considerations

### Input Validation
- Sanitize lyrics to prevent XSS
- Validate lyrics length (50-3000 chars)
- Validate style against enum values
- Rate limit API calls per user

### Authentication
- Verify Firebase token on all API calls
- Verify WebSocket token on connection
- Ensure task_id belongs to authenticated user

### WebSocket Security
- Authenticate on connection
- Verify task ownership before subscribing
- Close connection on auth failure
- Implement connection timeout (5 minutes)

## Performance Optimization

### Frontend
- Debounce lyrics editing (300ms)
- Use React.memo for static components
- Lazy load heavy components
- Optimize WebSocket reconnection logic

### Backend
- Cache song results by content_hash + style
- Use connection pooling for Suno API
- Implement request timeout (90s)
- Batch Firestore updates

### WebSocket
- Limit polling frequency (5s intervals)
- Close connections after completion
- Implement connection limits per user
- Use efficient JSON serialization

## Monitoring & Logging

### Frontend Metrics
- Song generation success rate
- Average generation time
- WebSocket connection stability
- Error rate by type

### Backend Metrics
- Suno API latency
- WebSocket connection count
- Cache hit rate (by content_hash + style)
- Task completion rate

### Logging
- All song generation requests
- WebSocket connections/disconnections
- Suno API calls and responses
- Cache hits/misses
- Error details with stack traces
