# Page B: Lyrics Editing Page - Implementation Tasks

## Overview
This task list covers the implementation of the lyrics editing page where users review AI-generated lyrics, make modifications, select a music style, and generate their learning song with real-time progress tracking via WebSocket.

---

## Frontend Tasks

- [x] 1. Setup Additional Dependencies









- [x] 1.1 Install Socket.IO client

  - Run: `cd frontend && pnpm add socket.io-client`
  - _Requirements: FR-4_


- [x] 1.2 Add Select component from shadcn/ui







  - Run: `cd frontend && pnpm dlx shadcn@latest add select`
  - _Requirements: US-3_



- [x] 1.3 Add Label component from shadcn/ui





  - Run: `cd frontend && pnpm dlx shadcn@latest add label`
  - _Requirements: US-3_

- [x] 1.4 Add Alert component from shadcn/ui


  - Run: `cd frontend && pnpm dlx shadcn@latest add alert`
  - _Requirements: US-7_

---

- [x] 2. Create Zustand Store for Lyrics Editing







- [x] 2.1 Create lyrics editing store

  - Create `frontend/src/stores/lyricsEditingStore.ts`
  - Define state: originalLyrics, editedLyrics, selectedStyle, contentHash
  - Define state: isGenerating, taskId, generationStatus, progress, songUrl, error
  - Define actions: setOriginalLyrics, setEditedLyrics, setSelectedStyle, setContentHash
  - Define actions: startGeneration, updateProgress, completeGeneration, failGeneration, reset
  - Add sessionStorage persistence for recovery
  - _Requirements: US-1, US-2, US-3, US-4, US-5_


---

- [x] 3. Create API Client for Songs






- [x] 3.1 Create songs API module

  - Create `frontend/src/api/songs.ts`
  - Define TypeScript interfaces (GenerateSongRequest, GenerateSongResponse, SongStatusUpdate)
  - Define MusicStyle enum with 8 styles
  - Implement `generateSong` function using existing apiClient
  - Implement `getSongStatus` function for fallback polling
  - _Requirements: FR-3_

---

- [x] 4. Create WebSocket Hook






- [x] 4.1 Create WebSocket custom hook




  - Create `frontend/src/hooks/useWebSocket.ts`
  - Implement connection logic with Socket.IO client
  - Add authentication with Firebase token
  - Implement subscribe/unsubscribe to task updates
  - Handle connection/disconnection events
  - Implement auto-reconnect with exponential backoff
  - Add connection status indicator
  - _Requirements: FR-4, NFR-5_

- [x] 4.2 Create song generation hook


  - Create `frontend/src/hooks/useSongGeneration.ts`
  - Combine TanStack Query mutation with WebSocket hook
  - Handle generation lifecycle: initiate → monitor → complete
  - Manage state updates via Zustand store
  - _Requirements: FR-3, FR-4_
---

---



- [x] 5. Create Browser Notifications Hook




- [x] 5.1 Create notifications hook


  - Create `frontend/src/hooks/useNotifications.ts`
  - Request notification permission on mount
  - Implement `sendNotification` function
  - Handle permission states (granted, denied, default)
  - Add notification click handler to focus tab
  - _Requirements: FR-5_




---

- [x] 6. Build Lyrics Editing Components





- [x] 6.1 Create LyricsEditor component


  - Create `frontend/src/components/LyricsEditor.tsx`
  - Use shadcn/ui Textarea with auto-resize
  - Implement character counter (current/3000)
  - Add visual states: normal (<2700), warning (2700-3000), error (>3000)
  - Connect to Zustand store for editedLyrics
  - Add accessibility attributes (aria-label, aria-describedby)
  - Support undo/redo (browser default Ctrl+Z/Y)
  - _Requirements: US-2, FR-1, NFR-2_

- [x] 6.2 Create StyleSelector component


  - Create `frontend/src/components/StyleSelector.tsx`
  - Use shadcn/ui Select component
  - Define 8 music styles with labels and descriptions
  - Display style description on selection
  - Connect to Zustand store for selectedStyle
  - Default to "pop" style
  - _Requirements: US-3, FR-2_

- [x] 6.3 Create GenerateSongButton component


  - Create `frontend/src/components/GenerateSongButton.tsx`
  - Use shadcn/ui Button with loading spinner
  - Disable when: empty lyrics, >3000 chars, rate limit reached, already generating
  - Show estimated time (30-60s) on hover
  - Trigger song generation on click
  - Add keyboard shortcut (Ctrl+Enter)
  - _Requirements: US-4_

- [x] 6.4 Create ProgressTracker component


  - Create `frontend/src/components/ProgressTracker.tsx`
  - Display current status: queued → processing → completed/failed
  - Show progress bar (0-100%) with shadcn/ui Progress
  - Display status messages for each stage
  - Add cancel button (optional)
  - Show WebSocket connection status indicator
  - _Requirements: US-5, FR-4_

- [x] 6.5 Create LyricsPreview component (optional)


  - Create `frontend/src/components/LyricsPreview.tsx`
  - Display original AI-generated lyrics (read-only)
  - Format with proper line breaks and structure
  - Add toggle to show/hide preview
  - _Requirements: US-1_

---


- [x] 7. Build Lyrics Editing Page




- [x] 7.1 Create LyricsEditingPage component


  - Create `frontend/src/pages/LyricsEditingPage.tsx`
  - Receive lyrics and contentHash from navigation state (React Router)
  - Initialize Zustand store with received data
  - Compose components: LyricsEditor, StyleSelector, GenerateSongButton, ProgressTracker
  - Use useAuth hook to ensure user is authenticated
  - Use useRateLimit hook to check remaining songs
  - Use useSongGeneration hook for generation logic
  - Use useNotifications hook for browser notifications
  - Handle navigation to Page C on completion
  - Add "Back to Edit Content" button with unsaved changes warning
  - Style with TailwindCSS for responsive layout
  - _Requirements: US-1, US-2, US-3, US-4, US-5, US-6, NFR-4_

- [x] 7.2 Update routing


  - Update `frontend/src/App.tsx` to add route for LyricsEditingPage at "/lyrics-edit"
  - Configure route to receive state from Page A
  - Add route guard to redirect if no lyrics data
  - _Requirements: US-1_

- [x] 7.3 Update TextInputPage navigation


  - Update `frontend/src/pages/TextInputPage.tsx`
  - Navigate to "/lyrics-edit" on successful lyrics generation
  - Pass lyrics and contentHash via navigation state
  - _Requirements: FR-7_

---

- [x] 8. Add Error Handling




- [x] 8.1 Handle Suno API errors


  - Add error handling for timeout (>90s)
  - Add error handling for API errors (500, 503)
  - Add error handling for rate limit (429)
  - Add error handling for invalid lyrics (400)
  - Display user-friendly error messages with retry options
  - _Requirements: US-7, NFR-5_


- [x] 8.2 Handle WebSocket errors

  - Add error handling for connection failures
  - Add error handling for disconnections
  - Show connection status indicator
  - Implement auto-reconnect logic
  - _Requirements: US-7, NFR-5_


- [x] 8.3 Handle network errors

  - Add offline detection
  - Show offline indicator
  - Queue actions for when online
  - Add manual retry button
  - _Requirements: US-7_

---


- [x] 9. Add Accessibility Features






- [x] 9.1 Implement keyboard navigation


  - Ensure all interactive elements are keyboard accessible
  - Add focus indicators with TailwindCSS
  - Test tab order
  - Add keyboard shortcuts (Ctrl+Enter to generate)
  - _Requirements: NFR-2_



- [x] 9.2 Add ARIA labels and roles
  - Add aria-label to all form controls
  - Add aria-live regions for progress updates
  - Add role attributes where needed
  - Add aria-describedby for character counter


  - _Requirements: NFR-2_

- [x] 9.3 Ensure color contrast
  - Verify all text meets WCAG 2.1 AA contrast ratios
  - Test with browser dev tools
  - Add high contrast mode support
  - _Requirements: NFR-2_

1ㄅ
---

- [x] 10. Write Frontend Tests



- [x] 10.1 Test LyricsEditor component





  - Test character counter updates
  - Test visual states (normal, warning, error)
  - Test accessibility attributes
  - Test undo/redo functionality
  - _Requirements: US-2_

- [x] 10.2 Test StyleSelector component





  - Test style selection
  - Test default value
  - Test description display
  - _Requirements: US-3_

- [x] 10.3 Test GenerateSongButton component





  - Test disabled states
  - Test keyboard shortcut
  - Test loading state
  - _Requirements: US-4_

- [x] 10.4 Test ProgressTracker component





  - Test status display
  - Test progress bar updates
  - Test connection indicator
  - _Requirements: US-5_

- [x] 10.5 Test WebSocket hook





  - Mock Socket.IO client
  - Test connection/disconnection
  - Test message handling
  - Test auto-reconnect
  - _Requirements: FR-4_

- [x] 10.6 Test Zustand store





  - Test all state actions
  - Test sessionStorage persistence
  - _Requirements: US-1, US-2, US-3, US-4, US-5_

- [x] 10.7 Integration test for LyricsEditingPage




  - Test complete user flow
  - Test error scenarios
  - Test WebSocket updates
  - Test navigation
  - _Requirements: All US_

---

## Backend Tasks

- [x] 11. Setup Socket.IO Server


- [x] 11.1 Install Socket.IO dependencies




  - Run: `cd backend && poetry add python-socketio python-socketio[asyncio]`
  - _Requirements: FR-4_


- [x] 11.2 Create WebSocket module



  - Create `backend/app/api/websocket.py`
  - Initialize Socket.IO server with FastAPI
  - Configure CORS for frontend domain
  - _Requirements: FR-4_


- [x] 11.3 Implement connection manager



  - Create ConnectionManager class to track active connections
  - Implement connect/disconnect methods
  - Implement broadcast method for task updates
  - Track connections by task_id
  - _Requirements: FR-4_

---

- [x] 12. Define Pydantic Models for Songs







- [x] 12.1 Create songs models

  - Create `backend/app/models/songs.py`
  - Define MusicStyle enum (pop, rap, folk, electronic, rock, jazz, children, classical)
  - Define GenerateSongRequest (lyrics: str, style: MusicStyle, content_hash: Optional[str])
  - Define GenerateSongResponse (task_id: str, estimated_time: int)
  - Define SongStatusUpdate (task_id, status, progress, song_url, error)
  - Add validators for lyrics length (50-3000 chars)
  - _Requirements: FR-1, FR-2, FR-3_

---


- [x] 13. Implement Suno API Client



- [x] 13.1 Create Suno client module


  - Create `backend/app/services/suno_client.py`
  - Setup httpx AsyncClient with base URL and API key
  - Define SunoTask and SunoStatus classes
  - _Requirements: FR-3_


- [x] 13.2 Implement create_song method
  - Implement `create_song(lyrics: str, style: str)` method
  - Call Suno API POST /generate endpoint
  - Parse response and return SunoTask
  - Add error handling for API failures
  - Add retry logic (3 attempts with exponential backoff)
  - _Requirements: FR-3, NFR-5_


- [x] 13.3 Implement get_task_status method
  - Implement `get_task_status(task_id: str)` method
  - Call Suno API GET /task/{task_id} endpoint
  - Parse response and return SunoStatus
  - Add error handling for API failures
  - _Requirements: FR-3_

- [x] 13.4 Write Suno client tests



  - Test create_song method
  - Test get_task_status method
  - Mock Suno API responses
  - Test error handling and retries
  - _Requirements: FR-3_

---

- [x] 14. Extend Cache Service for Songs

- [x] 14.1 Implement song cache functions





  - Update `backend/app/services/cache.py`
  - Implement `check_song_cache(content_hash: str, style: str)` function
  - Implement `store_song_cache(content_hash, style, task_id, song_url)` function
  - Cache key format: `{content_hash}_{style}`
  - Update hit_count and last_accessed on cache hits
  - _Requirements: FR-3_

- [x] 14.2 Write song cache tests





  - Test cache hit/miss scenarios
  - Test cache key generation
  - Mock Firestore
  - _Requirements: FR-3_

---

- [x] 15. Create Song Generation API Endpoints

- [x] 15.1 Create songs router





  - Create `backend/app/api/songs.py`
  - Define APIRouter with prefix "/api/songs"
  - Add tags for API docs
  - _Requirements: FR-3_






- [X] 15.2 Implement generate song endpoint
  - Implement `POST /api/songs/generate` handler
  - Add get_current_user dependency for auth
  - Call check_rate_limit
  - Check cache with check_song_cache
  - Call Suno API to create task if cache miss
  - Store task in Firestore (songs collection)
  - Increment usage counter
  - Return GenerateSongResponse
  - Add comprehensive error handling
  - Add logging



  - _Requirements: FR-3, FR-6_

- [x] 15.3 Implement get song status endpoint


  - Implement `GET /api/songs/{task_id}` handler
  - Add get_current_user dependency
  - Verify task belongs to authenticated user
  - Query Firestore for task data
  - Call Suno API to get current status
  - Update Firestore with latest status
  - Return SongStatusUpdate
  - _Requirements: FR-3_

- [x] 15.4 Register router in main.py







  - Import songs router in `backend/app/main.py`
  - Add router with app.include_router
  - _Requirements: FR-3_


- [x] 15.5 Write API endpoint tests







  - Test generate song endpoint (happy path, cache hit, rate limit)
  - Test get song status endpoint
  - Test task ownership verification
  - Mock all services
  - _Requirements: FR-3_

---

- [x] 16. Implement WebSocket Endpoints

- [x] 16.1 Create WebSocket authentication
  - Update `backend/app/core/auth.py`
  - Implement `verify_websocket_token(token: str)` function
  - Verify Firebase token and return user_id
  - Handle auth errors
  - _Requirements: FR-4_

- [x] 16.2 Implement WebSocket endpoint
  - Update `backend/app/api/websocket.py`
  - Implement `/ws/songs/status` WebSocket endpoint
  - Authenticate connection with token
  - Receive subscription message with task_id
  - Verify task belongs to authenticated user
  - Add connection to ConnectionManager
  - Handle disconnection
  - _Requirements: FR-4_

- [x] 16.3 Implement polling and broadcast logic
  - Implement `poll_and_broadcast(task_id: str)` function
  - Poll Suno API every 5 seconds for status updates
  - Broadcast updates to all connected clients for task_id
  - Stop polling when status is completed or failed
  - Update Firestore with final status
  - Handle polling errors gracefully
  - _Requirements: FR-4_

- [x] 16.4 Integrate Socket.IO with FastAPI
  - Update `backend/app/main.py`
  - Mount Socket.IO app with FastAPI
  - Configure CORS for WebSocket connections
  - _Requirements: FR-4_

- [x] 16.5 Write WebSocket tests
  - Test connection authentication
  - Test subscription flow
  - Test broadcast functionality
  - Test polling logic
  - Mock Suno API and Firestore
  - _Requirements: FR-4_

---

- [x] 17. Add Firestore Collections for Songs

- [x] 17.1 Create songs collection schema
  - Document structure:
    - user_id: string
    - task_id: string
    - content_hash: string
    - lyrics: string
    - style: string
    - status: string (queued, processing, completed, failed)
    - progress: number (0-100)
    - song_url: string (optional)
    - error: string (optional)
    - created_at: timestamp
    - updated_at: timestamp
    - expires_at: timestamp (created_at + 48 hours)
  - _Requirements: FR-3_

- [x] 17.2 Implement Firestore helper functions
  - Create `backend/app/services/song_storage.py`
  - Implement `store_song_task(user_id, task_id, request)` function
  - Implement `get_task_from_firestore(task_id)` function
  - Implement `update_task_status(task_id, status)` function
  - Add TTL cleanup for expired songs (48 hours)
  - _Requirements: FR-3_

- [x] 17.3 Write storage tests
  - Test CRUD operations
  - Mock Firestore
  - _Requirements: FR-3_

---

- [x] 18. Add Logging and Monitoring

- [x] 18.1 Add logging to song generation
  - Log all song generation requests
  - Log Suno API calls and responses
  - Log cache hits/misses
  - Log WebSocket connections/disconnections
  - Add performance metrics (generation time)
  - _Requirements: NFR-1_

- [x] 18.2 Add error logging
  - Log all errors with stack traces
  - Log retry attempts
  - Log rate limit violations
  - _Requirements: NFR-1_

---

## Integration Tasks

- [x] 19. Setup Environment Variables

- [x] 19.1 Update frontend .env file
  - Add VITE_WS_URL (ws://localhost:8000)
  - Document WebSocket URL configuration
  - _Requirements: FR-4_

- [x] 19.2 Update backend .env file
  - Add SUNO_API_URL
  - Add SUNO_API_KEY
  - Document Suno API configuration
  - _Requirements: FR-3_

---

- [x] 20. End-to-End Testing

- [x] 20.1 Test happy path
  - Start both frontend and backend
  - Test: Page A → generate lyrics → Page B → edit → select style → generate song
  - Verify WebSocket updates in real-time
  - Verify browser notification
  - Verify navigation to Page C
  - _Requirements: All US_

- [x] 20.2 Test lyrics editing
  - Test character counter updates
  - Test visual states (normal, warning, error)
  - Test undo/redo
  - _Requirements: US-2_

- [x] 20.3 Test style selection
  - Test all 8 styles
  - Verify different Suno API parameters
  - _Requirements: US-3_

- [x] 20.4 Test WebSocket functionality
  - Test connection/disconnection
  - Test auto-reconnect
  - Test status updates
  - Test multiple clients for same task
  - _Requirements: US-5, FR-4_

- [x] 20.5 Test rate limit scenario
  - Generate 3 songs
  - Verify 4th attempt is blocked
  - Verify countdown timer appears
  - _Requirements: US-4, FR-6_

- [x] 20.6 Test cache scenario
  - Generate song with same lyrics and style twice
  - Verify second request returns cached result
  - Verify instant response
  - _Requirements: FR-3_

- [x] 20.7 Test error scenarios
  - Test with lyrics >3000 characters
  - Test with empty lyrics
  - Test with Suno API timeout
  - Test with Suno API error
  - Test with WebSocket disconnection
  - Test with network disconnected
  - Verify error messages are user-friendly
  - _Requirements: US-7_

- [x] 20.8 Test browser notifications
  - Test notification permission request
  - Test notification on song completion
  - Test notification click handler
  - Test when tab is not active
  - _Requirements: FR-5_

- [x] 20.9 Test navigation
  - Test back button with unsaved changes
  - Test navigation on completion
  - Test direct URL access without data
  - _Requirements: US-6, FR-7_

---

## Task Summary

**Estimated Time:** ~60 hours

**Frontend:** ~25 hours (10 tasks)
**Backend:** ~30 hours (8 tasks)
**Integration:** ~5 hours (2 tasks)

## Priority Order

**Phase 1 - Foundation** (Setup & Models)
- Tasks: 1, 2, 3, 11, 12, 19

**Phase 2 - Core Backend** (Suno API & WebSocket)
- Tasks: 13, 14, 15, 16, 17, 18

**Phase 3 - Core Frontend** (UI Components & Page)
- Tasks: 4, 5, 6, 7

**Phase 4 - Polish** (Error Handling, Accessibility & Testing)
- Tasks: 8, 9, 10, 20

## Notes

- All tasks reference specific requirements (US-X for user stories, FR-X for functional requirements, NFR-X for non-functional requirements)
- WebSocket implementation is critical for real-time updates
- Browser notifications require user permission
- Suno API integration is the core external dependency
- Rate limiting reuses existing service from Page A
- Caching strategy extends existing cache service
- All timestamps use UTC timezone
- 48-hour data retention for anonymous users
