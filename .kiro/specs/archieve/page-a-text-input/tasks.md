# Page A: Text Input Page - Implementation Tasks

## Overview
This task list has been refreshed based on the current codebase state. The project has basic scaffolding in place (API client, basic FastAPI setup, shadcn/ui components), but no Page A-specific functionality has been implemented yet.

---

## Frontend Tasks

- [x] 1.Setup shadcn/ui Components







- [x] 1.1 Add Textarea component from shadcn/ui

  - Run: `pnpm dlx shadcn@latest add textarea`
  - _Requirements: US-1_


- [x] 1.2 Add Switch component from shadcn/ui

  - Run: `pnpm dlx shadcn@latest add switch`
  - _Requirements: US-2_

- [x] 1.3 Add Toast component from shadcn/ui


  - Run: `pnpm dlx shadcn@latest add toast`
  - _Requirements: US-6_

- [x] 1.4 Add Progress component from shadcn/ui


  - Run: `pnpm dlx shadcn@latest add progress`
  - _Requirements: US-5_

---

- [x]  2. Setup Firebase Authentication



- [x] 2.1 Install Firebase SDK


  - Run: `pnpm add firebase`
  - _Requirements: FR-5_

- [x] 2.2 Create Firebase configuration


  - Create `frontend/src/lib/firebase.ts`
  - Initialize Firebase app with config from environment variables
  - Setup anonymous authentication
  - _Requirements: FR-5_

- [x] 2.3 Create useAuth hook


  - Create `frontend/src/hooks/useAuth.ts`
  - Implement anonymous sign-in on mount
  - Store user ID in localStorage
  - Handle auth state changes
  - Return user ID and loading state
  - _Requirements: FR-5_

---

-

- [x]  3. Setup State Management




- [x] 3.1 Create text input Zustand store

  - Create `frontend/src/stores/textInputStore.ts`
  - Define state: content, searchEnabled, isGenerating, currentStage
  - Define actions: setContent, toggleSearch, setGenerating, setCurrentStage, reset
  - Add localStorage persistence for content
  - _Requirements: US-1, US-2, US-5_

---


- [x] 4. Setup API Client for Lyrics


- [x] 4.1 Create lyrics API module


  - Create `frontend/src/api/lyrics.ts`
  - Define TypeScript interfaces (GenerateLyricsRequest, GenerateLyricsResponse)
  - Implement `generateLyrics` function using existing apiClient
  - Implement `getRateLimit` function
  - _Requirements: FR-3, FR-2_

- [x] 4.2 Setup TanStack Query provider


  - Update `frontend/src/main.tsx` to wrap app with QueryClientProvider
  - Configure default query options (retry, staleTime)
  - _Requirements: FR-3_

- [x] 4.3 Create React Query hooks


  - Create `frontend/src/hooks/useLyrics.ts`
  - Implement `useGenerateLyrics` mutation hook
  - Implement `useRateLimit` query hook
  - Handle loading/error/success states
  - _Requirements: FR-3, FR-2_

---

- [x]  5. Build Text Input Components





- [x] 5.1 Create TextInputArea component

  - Create `frontend/src/components/TextInputArea.tsx`
  - Use shadcn/ui Textarea with auto-resize
  - Implement word counter (split by whitespace, max 10,000)
  - Add visual states: normal (<9000), warning (9000-10000), error (>10000)
  - Add accessibility attributes (aria-label, aria-describedby)
  - _Requirements: US-1, FR-1, NFR-2_


- [x] 5.2 Create SearchToggle component

  - Create `frontend/src/components/SearchToggle.tsx`
  - Use shadcn/ui Switch component
  - Add label "Enrich with Google Search"
  - Add tooltip explaining the feature
  - Connect to Zustand store
  - _Requirements: US-2, FR-4_


- [x] 5.3 Create RateLimitIndicator component

  - Create `frontend/src/components/RateLimitIndicator.tsx`
  - Display "🎵 X/3 songs remaining today"
  - Use useRateLimit hook to fetch data
  - Add color coding: green (3), yellow (1-2), red (0)
  - Show countdown timer when limit reached
  - Handle loading and error states
  - _Requirements: US-3, FR-2_


- [x] 5.4 Create GenerateButton component

  - Create `frontend/src/components/GenerateButton.tsx`
  - Use shadcn/ui Button with loading spinner
  - Disable when: empty content, >10000 words, rate limit reached, already generating
  - Add keyboard shortcut (Ctrl+Enter)
  - Trigger useGenerateLyrics mutation on click
  - _Requirements: US-4_


- [x] 5.5 Create LoadingProgress component

  - Create `frontend/src/components/LoadingProgress.tsx`
  - Display current pipeline stage (cleaning, searching, summarizing, converting)
  - Show progress bar with shadcn/ui Progress
  - Add estimated time remaining
  - Add cancel button (optional)
  - _Requirements: US-5_

---



- [x]  6. Build Text Input Page


- [x] 6.1 Create TextInputPage component


  - Create `frontend/src/pages/TextInputPage.tsx`
  - Compose all components: TextInputArea, SearchToggle, RateLimitIndicator, GenerateButton, LoadingProgress
  - Use useAuth hook to ensure user is authenticated
  - Handle navigation to lyrics editing page on success
  - Add page title and description
  - Style with TailwindCSS for responsive layout
  - _Requirements: US-1, US-2, US-3, US-4, US-5, NFR-4_

- [x] 6.2 Setup routing


  - Install React Router: `pnpm add react-router-dom`
  - Update `frontend/src/App.tsx` to setup routes
  - Add route for TextInputPage at "/"
  - Add placeholder route for lyrics editing page
  - _Requirements: US-1_

---

-

- [x]  7. Add Error Handling




- [x] 7.1 Create error boundary

  - Create `frontend/src/components/ErrorBoundary.tsx`
  - Catch and display React errors gracefully
  - _Requirements: US-6, NFR-2_


- [x] 7.2 Setup toast notifications

  - Create `frontend/src/components/Toaster.tsx` using shadcn/ui
  - Add to App.tsx
  - Show toasts for: network errors, rate limit errors, validation errors
  - Add retry mechanisms for network errors
  - _Requirements: US-6_

---

- [x]  8. Add Accessibility Features



- [ ]  8. Add Accessibility Features

- [x] 8.1 Implement keyboard navigation



  - Ensure all interactive elements are keyboard accessible
  - Add focus indicators with TailwindCSS
  - Test tab order
  - _Requirements: NFR-2_

- [x] 8.2 Add ARIA labels and roles


  - Add aria-label to all form controls
  - Add aria-live regions for dynamic content (rate limit, loading progress)
  - Add role attributes where needed
  - _Requirements: NFR-2_

- [x] 8.3 Ensure color contrast


  - Verify all text meets WCAG 2.1 AA contrast ratios
  - Test with browser dev tools
  - _Requirements: NFR-2_

---

- [x]  9. Write Frontend Tests*


- [x] 9.1 Test TextInputArea component

  - Test word counter updates
  - Test visual states (normal, warning, error)
  - Test accessibility attributes
  - _Requirements: US-1_

- [x] 9.2 Test SearchToggle component



  - Test toggle functionality
  - Test state persistence
  - _Requirements: US-2_

- [x] 9.3 Test RateLimitIndicator component



  - Test display with different rate limit values
  - Test color coding
  - Test countdown timer
  - _Requirements: US-3_

- [x] 9.4 Test GenerateButton component



  - Test disabled states
  - Test keyboard shortcut
  - _Requirements: US-4_

- [x] 9.5 Test Zustand store



  - Test all state actions
  - Test localStorage persistence
  - _Requirements: US-1, US-2_

- [x] 9.6 Test API client



  - Mock axios calls
  - Test error handling
  - _Requirements: FR-3_


- [x] 9.7 Integration test for TextInputPage



  - Test complete user flow
  - Test error scenarios
  - _Requirements: All US_

---

## Backend Tasks

- [x] 10. Setup Firebase Admin SDK



- [x] 10.1 Create Firebase configuration


  - Create `backend/app/core/firebase.py`
  - Initialize Firebase Admin SDK with service account credentials
  - Create Firestore client instance
  - Export firestore_client for use in other modules
  - _Requirements: FR-2, FR-3_

- [x] 10.2 Add environment variables


  - Add FIREBASE_CREDENTIALS_PATH to .env.example
  - Document Firebase setup in comments
  - _Requirements: FR-2, FR-3_

---


- [x] 11. Setup Authentication






- [x] 11.1 Create auth module


  - Create `backend/app/core/auth.py`
  - Implement `get_current_user` FastAPI dependency
  - Verify Firebase ID token from Authorization header
  - Extract and return user ID
  - Handle auth errors with HTTPException
  - _Requirements: FR-5_

- [x] 11.2 Write auth tests



  - Test token verification
  - Test error handling
  - Mock Firebase Admin SDK
  - _Requirements: FR-5_

---

- [x] 12. Define Pydantic Models






- [x] 12.1 Create lyrics models

  - Create `backend/app/models/lyrics.py`
  - Define GenerateLyricsRequest (content: str, search_enabled: bool)
  - Define GenerateLyricsResponse (lyrics: str, content_hash: str, cached: bool, processing_time: float)
  - Add validator for content length (max 10,000 words)
  - Add custom error messages
  - _Requirements: FR-1, FR-3_


- [x] 12.2 Create user models

  - Create `backend/app/models/user.py`
  - Define RateLimitResponse (remaining: int, reset_time: datetime)
  - _Requirements: FR-2_

---



- [x] 13. Implement Rate Limiter Service




- [x] 13.1 Create rate limiter module


  - Create `backend/app/services/rate_limiter.py`
  - Implement `check_rate_limit(user_id: str)` function
  - Query Firestore users collection for user data
  - Create new user document if doesn't exist
  - Check if daily reset needed (midnight UTC)
  - Raise HTTPException 429 if limit exceeded
  - _Requirements: FR-2_

- [x] 13.2 Implement get rate limit function

  - Implement `get_rate_limit(user_id: str)` function
  - Return remaining songs and reset time
  - _Requirements: FR-2_


- [x] 13.3 Implement increment usage function

  - Implement `increment_usage(user_id: str)` function
  - Increment songs_generated_today counter
  - _Requirements: FR-2_


- [x] 13.4 Write rate limiter tests


  - Test rate limit check logic
  - Test daily reset logic
  - Mock Firestore
  - _Requirements: FR-2_

---

- [x]  14. Implement Cache Service





- [x] 14.1 Create cache module


  - Create `backend/app/services/cache.py`
  - Implement `generate_content_hash(content: str)` using SHA-256
  - Implement `check_lyrics_cache(content_hash: str)` to query Firestore
  - Implement `store_lyrics_cache(content_hash: str, lyrics: str)` to store in Firestore
  - Update hit_count and last_accessed on cache hits
  - _Requirements: FR-3_

- [x] 14.2 Write cache tests



  - Test hash generation
  - Test cache hit/miss scenarios
  - Mock Firestore
  - _Requirements: FR-3_

---


- [ ] 15. Implement Google Search Service
- [x] 15.1 Create Google Search module


  - Create `backend/app/services/google_search.py`
  - Setup Google Custom Search API client
  - Implement `search_and_enrich(query: str)` function
  - Parse and format top 3-5 search results
  - Add error handling for API failures
  - _Requirements: FR-4_
- [x] 15.2 Write Google Search tests

  - Test search query function
  - Test result parsing
  - Mock Google API
  - _Requirements: FR-4_

---


- [x] 16. Build AI Pipeline with LangGraph




- [x] 16.1 Refactor ai_pipeline.py for lyrics generation


  - Update `backend/app/services/ai_pipeline.py`
  - Define PipelineState TypedDict with all required fields
  - Create LyricsPipeline class
  - _Requirements: FR-3_

- [x] 16.2 Implement pipeline nodes


  - Implement `_check_search_needed` node
  - Implement `_google_search_grounding` node (calls Google Search service)
  - Implement `_clean_text` node (remove HTML, normalize whitespace)
  - Implement `_summarize` node (extract 3-5 key points, max 500 words)
  - Implement `_validate_summary_length` node (check Suno limits)
  - Implement `_convert_to_lyrics` node (apply song structure, rhyme, rhythm)
  - Implement `_handle_error` node
  - _Requirements: FR-3, FR-4_



- [x] 16.3 Build state graph
  - Create StateGraph with all nodes
  - Add conditional edges based on search_enabled and summary_valid


  - Set entry point and compile graph
  - _Requirements: FR-3_

- [x] 16.4 Implement execute method
  - Create `execute(content: str, search_enabled: bool)` method


  - Initialize state and invoke graph
  - Handle errors and return result
  - Add logging for each stage
  - _Requirements: FR-3_

- [x] 16.5 Write AI pipeline tests






  - Test each node individually
  - Test graph execution flow
  - Test error handling
  - Mock LLM calls


  - _Requirements: FR-3_

---

- [x] 17. Create API Endpoints

- [x] 17.1 Create lyrics router
  - Create `backend/app/api/lyrics.py`
  - Define APIRouter with prefix "/api/lyrics"
  - Add tags for API docs
  - _Requirements: FR-3_



- [x] 17.2 Implement generate lyrics endpoint
  - Implement `POST /api/lyrics/generate` handler
  - Add get_current_user dependency for auth
  - Call check_rate_limit


  - Check cache with check_lyrics_cache
  - Execute AI pipeline if cache miss
  - Store result in Firestore (lyrics_history and cached_songs)


  - Increment usage counter
  - Return GenerateLyricsResponse
  - Add comprehensive error handling
  - Add logging
  - _Requirements: FR-3, FR-2_

- [x] 17.3 Implement get rate limit endpoint
  - Implement `GET /api/user/rate-limit` handler
  - Add get_current_user dependency
  - Call get_rate_limit service
  - Return RateLimitResponse
  - _Requirements: FR-2_

- [x] 17.4 Register router in main.py
  - Import lyrics router in `backend/app/main.py`
  - Add router with app.include_router
  - _Requirements: FR-3_

- [x] 17.5 Write API endpoint tests

  - Test generate lyrics endpoint (happy path, cache hit, rate limit)
  - Test get rate limit endpoint
  - Mock all services
  - _Requirements: FR-3, FR-2_

---

- [x] 18. Add Logging and Monitoring





- [x] 18.1 Configure structured logging


  - Create `backend/app/core/logging.py`
  - Configure Python logging with JSON formatter
  - Add request/response logging middleware
  - _Requirements: NFR-1_

- [x] 18.2 Add logging to services


  - Add logging to pipeline stages
  - Log cache hits/misses
  - Log rate limit checks
  - Add performance metrics (execution time)
  - _Requirements: NFR-1_

---

## Integration Tasks

- [ ] 19. Setup Environment Variables
- [ ] 19.1 Create frontend .env file
  - Create `frontend/.env` from .env.example
  - Add VITE_API_URL (http://localhost:8000)
  - Add VITE_FIREBASE_* config variables
  - Document all variables
  - _Requirements: FR-3, FR-5_

- [ ] 19.2 Create backend .env file
  - Create `backend/.env` from .env.example
  - Add FIREBASE_CREDENTIALS_PATH
  - Add GOOGLE_SEARCH_API_KEY
  - Add OPENAI_API_KEY (or other LLM provider)
  - Document all variables
  - _Requirements: FR-3, FR-4, FR-5_

---
-

- [x] 20. End-to-End Testing*




- [x] 20.1 Test happy path



  - Start both frontend and backend
  - Test: input content → generate → receive lyrics
  - Verify data flow through all layers
  - _Requirements: All US_

- [x] 20.2 Test rate limit scenario


  - Generate 3 songs
  - Verify 4th attempt is blocked
  - Verify countdown timer appears
  - _Requirements: US-3, FR-2_


- [x] 20.3 Test cache scenario

  - Generate lyrics for same content twice
  - Verify second request returns cached result
  - Verify faster response time
  - _Requirements: FR-3_

- [x] 20.4 Test error scenarios


  - Test with content >10,000 words
  - Test with network disconnected
  - Test with invalid Firebase token
  - Verify error messages are user-friendly
  - _Requirements: US-6_


- [x] 20.5 Test search grounding

  - Test with search enabled vs disabled
  - Verify different results
  - Verify longer processing time with search
  - _Requirements: US-2, FR-4_

---

## Task Summary

**Estimated Time:** ~50 hours

**Frontend:** ~20 hours (9 tasks)
**Backend:** ~25 hours (9 tasks)
**Integration:** ~5 hours (2 tasks)

## Priority Order

**Phase 1 - Foundation** (Setup & Auth)
- Tasks: 1, 2, 3, 10, 11, 12, 19

**Phase 2 - Core Backend** (Services & API)
- Tasks: 13, 14, 15, 16, 17, 18

**Phase 3 - Core Frontend** (UI Components & Page)
- Tasks: 4, 5, 6, 7

**Phase 4 - Polish** (Accessibility & Testing)
- Tasks: 8, 9, 20

## Notes

- Tasks marked with * are optional testing tasks
- All tasks reference specific requirements (US-X for user stories, FR-X for functional requirements, NFR-X for non-functional requirements)
- The existing API client (`frontend/src/api/client.ts`) can be reused for lyrics API calls
- The existing shadcn/ui components (button, card, input) are already available
- Firebase Admin SDK is already in pyproject.toml dependencies
- LangChain and LangGraph are already in pyproject.toml dependencies