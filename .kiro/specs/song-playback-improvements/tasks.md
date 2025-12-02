# Implementation Plan

- [ ] 1. Fix dual song selection UI display
  - [ ] 1.1 Debug and fix variation extraction from Suno API
    - Investigate why `songVariations` array is empty in SongPlaybackPage
    - Verify `SunoClient.get_task_status()` extracts all variations from sunoData array
    - Ensure `update_task_status()` stores variations array in Firestore
    - Add logging to trace variation data flow
    - _Requirements: 1.1, 1.2_

  - [ ] 1.2 Write property test for variation extraction
    - **Property 1: Variation extraction completeness**
    - **Validates: Requirements 1.1, 1.2**

  - [ ] 1.3 Verify variation retrieval in getSongDetails API
    - Ensure `get_song_details()` returns variations array from Firestore
    - Verify frontend `SongDetails` interface matches backend response
    - Test that `songVariations.length >= 2` condition is met
    - _Requirements: 1.3, 1.4_

  - [ ] 1.4 Write property test for variation storage round-trip
    - **Property 2: Variation storage round-trip**
    - **Validates: Requirements 1.2, 1.3**

  - [ ] 1.5 Write property test for SongSwitcher visibility
    - **Property 3: SongSwitcher visibility condition**
    - **Validates: Requirements 1.4**

- [ ] 2. Implement timestamp lyrics offset adjustment
  - [ ] 2.1 Create offset utility functions
    - Create `frontend/src/lib/offset-utils.ts`
    - Implement `applyOffset(alignedWords, offsetMs)` function
    - Implement `clampOffset(value, min, max)` function
    - Implement `formatOffsetDisplay(offsetMs)` function
    - _Requirements: 2.1, 2.6_

  - [ ] 2.2 Write property test for offset application
    - **Property 4: Offset application to timestamps**
    - **Validates: Requirements 2.1**

  - [ ] 2.3 Write property test for offset range constraint
    - **Property 5: Offset range constraint**
    - **Validates: Requirements 2.6**

  - [ ] 2.4 Create OffsetControl component
    - Create `frontend/src/components/OffsetControl.tsx`
    - Implement slider with range -2000 to +2000 ms
    - Add minus/plus buttons for 50ms increments
    - Add reset button to set offset to 0
    - Display current offset value in milliseconds
    - Add ARIA labels for accessibility
    - _Requirements: 2.2, 2.5, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 2.5 Write property test for offset increment/decrement
    - **Property 6: Offset increment/decrement**
    - **Validates: Requirements 3.3, 3.4**

  - [ ] 2.6 Write unit tests for OffsetControl component
    - Test rendering with default props
    - Test slider value changes
    - Test +/- button clicks
    - Test reset button
    - Test keyboard accessibility

  - [ ] 2.7 Write property test for offset control accessibility
    - **Property 16: Offset control accessibility**
    - **Validates: Requirements 8.1**

- [ ] 3. Implement offset persistence
  - [ ] 3.1 Create offset storage utilities
    - Create `frontend/src/lib/offset-storage.ts`
    - Implement `saveOffset(songId, offset)` function
    - Implement `loadOffset(songId)` function
    - Implement LRU eviction when entries exceed 50
    - Handle localStorage errors gracefully
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 3.2 Write property test for offset persistence round-trip
    - **Property 7: Offset persistence round-trip**
    - **Validates: Requirements 2.3, 2.4, 9.1, 9.2**

  - [ ] 3.3 Write property test for LRU eviction
    - **Property 8: Offset storage LRU eviction**
    - **Validates: Requirements 9.3**

  - [ ] 3.4 Write unit tests for offset storage
    - Test save/load offset
    - Test LRU eviction
    - Test invalid data handling
    - Test storage full handling

- [ ] 4. Integrate offset into LyricsDisplay
  - [ ] 4.1 Update LyricsDisplay component
    - Add `offset` prop to LyricsDisplayProps interface
    - Modify `useLyricsSync` hook to apply offset to currentTime
    - Update word highlighting logic to use offset-adjusted time
    - _Requirements: 2.1, 2.2_

  - [ ] 4.2 Update useLyricsSync hook
    - Add `offset` parameter to hook options
    - Apply offset when calling `findWordAtTime()`
    - Ensure offset changes trigger re-render
    - _Requirements: 2.1, 2.2_

  - [ ] 4.3 Write property test for screen reader announcement
    - **Property 17: Screen reader offset announcement**
    - **Validates: Requirements 8.5**

- [ ] 5. Integrate offset control into SongPlaybackPage
  - [ ] 5.1 Add offset state to SongPlaybackPage
    - Add `offset` state variable
    - Load offset from localStorage on mount
    - Save offset to localStorage on change
    - Pass offset to LyricsDisplay component
    - _Requirements: 2.3, 2.4_

  - [ ] 5.2 Add OffsetControl to SongPlaybackPage UI
    - Position OffsetControl near lyrics panel
    - Connect onChange handler to state
    - Show only when timestamped lyrics available
    - _Requirements: 3.1_

- [ ] 6. Checkpoint - Ensure offset features work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement LRC file export
  - [ ] 7.1 Create LRC generator utilities
    - Create `frontend/src/lib/lrc-generator.ts`
    - Implement `formatLrcTimestamp(seconds)` function
    - Implement `generateLrcContent(alignedWords, metadata, offset)` function
    - Implement `downloadLrcFile(content, filename)` function
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [ ] 7.2 Write property test for LRC timestamp format
    - **Property 13: LRC timestamp format**
    - **Validates: Requirements 7.3**

  - [ ] 7.3 Write property test for LRC content completeness
    - **Property 14: LRC content completeness**
    - **Validates: Requirements 7.4**

  - [ ] 7.4 Create LrcDownloadButton component
    - Create `frontend/src/components/LrcDownloadButton.tsx`
    - Show button when alignedWords.length > 0
    - Hide button when no timestamped lyrics
    - Generate filename from style and date
    - Apply user's offset to timestamps
    - _Requirements: 7.1, 7.5, 7.6_

  - [ ] 7.5 Write property test for LRC download visibility
    - **Property 15: LRC download visibility**
    - **Validates: Requirements 7.1, 7.6**

  - [ ] 7.6 Write unit tests for LrcDownloadButton
    - Test rendering when alignedWords exist
    - Test hidden when alignedWords empty
    - Test LRC content generation
    - Test filename format

  - [ ] 7.7 Integrate LrcDownloadButton into SongPlaybackPage
    - Add LrcDownloadButton to action buttons section
    - Pass alignedWords, style, createdAt, and offset props
    - _Requirements: 7.1_

- [ ] 8. Implement song history backend API
  - [ ] 8.1 Create SongHistorySummary model
    - Add `SongHistorySummary` Pydantic model to `backend/app/models/songs.py`
    - Include song_id, style, created_at, expires_at, lyrics_preview fields
    - Add has_variations and primary_variation_index fields
    - _Requirements: 6.2_

  - [ ] 8.2 Create song history API endpoint
    - Add `GET /api/songs/history` endpoint to `backend/app/api/songs.py`
    - Query Firestore for user's non-expired songs
    - Order by created_at DESC
    - Limit to 20 results
    - Return list of SongHistorySummary
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 8.3 Write property test for song history ordering
    - **Property 9: Song history ordering**
    - **Validates: Requirements 4.3**

  - [ ] 8.4 Write property test for expiration filtering
    - **Property 10: Song history expiration filtering**
    - **Validates: Requirements 4.4, 6.1**

  - [ ] 8.5 Write property test for response completeness
    - **Property 11: Song history response completeness**
    - **Validates: Requirements 6.2**

  - [ ] 8.6 Write property test for history limit
    - **Property 12: Song history limit**
    - **Validates: Requirements 6.3**

  - [ ] 8.7 Write unit tests for song history API
    - Test returns user's songs
    - Test ordering by created_at DESC
    - Test limit parameter
    - Test expired songs filtered
    - Test empty response for new user
    - Test 401 for unauthenticated request

- [ ] 9. Implement song history frontend
  - [ ] 9.1 Create song history API client function
    - Add `getSongHistory()` function to `frontend/src/api/songs.ts`
    - Return list of SongHistorySummary
    - Handle errors gracefully
    - _Requirements: 6.1_

  - [ ] 9.2 Create SongHistoryItem component
    - Create `frontend/src/components/SongHistoryItem.tsx`
    - Display song style with icon
    - Show creation date and expiration countdown
    - Show lyrics preview (first 100 chars)
    - Make clickable to navigate to playback
    - Add keyboard accessibility
    - _Requirements: 4.2, 8.3, 8.4_

  - [ ] 9.3 Create SongHistoryPage
    - Create `frontend/src/pages/SongHistoryPage.tsx`
    - Fetch song history on mount
    - Display loading state
    - Display empty state when no songs
    - Render list of SongHistoryItem components
    - Navigate to playback page on item click
    - _Requirements: 4.1, 4.5, 5.2, 5.3_

  - [ ] 9.4 Write unit tests for SongHistoryPage
    - Test loading state
    - Test empty state
    - Test list rendering
    - Test navigation on click
    - Test error state

- [ ] 10. Add song history navigation
  - [ ] 10.1 Add route for song history page
    - Add `/history` route to App.tsx
    - Import and render SongHistoryPage
    - _Requirements: 5.1_

  - [ ] 10.2 Add navigation link to PageNavigation
    - Add "My Songs" link to PageNavigation component
    - Link to `/history` route
    - _Requirements: 5.1_

  - [ ] 10.3 Add back link from playback page
    - Add "My Songs" link to SongPlaybackPage header
    - Navigate to `/history`
    - _Requirements: 5.4_

- [ ] 11. Checkpoint - Ensure all features work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Write integration tests
  - Test offset control integration with lyrics display
  - Test offset persistence across page reloads
  - Test LRC download with offset applied
  - Test song history navigation flow
  - Test song switcher with variations

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

