# Implementation Plan

- [x] 1. Fix dual song selection UI display



  - [x] 1.1 Debug and fix variation extraction from Suno API

    - Investigate why `songVariations` array is empty in SongPlaybackPage
    - Verify `SunoClient.get_task_status()` extracts all variations from sunoData array
    - Ensure `update_task_status()` stores variations array in Firestore
    - Add logging to trace variation data flow
    - _Requirements: 1.1, 1.2_


  - [x] 1.2 Write property test for variation extraction

    - **Property 1: Variation extraction completeness**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 1.3 Verify variation retrieval in getSongDetails API


    - Ensure `get_song_details()` returns variations array from Firestore
    - Verify frontend `SongDetails` interface matches backend response
    - Test that `songVariations.length >= 2` condition is met
    - _Requirements: 1.3, 1.4_

  - [x] 1.4 Write property test for variation storage round-trip


    - **Property 2: Variation storage round-trip**
    - **Validates: Requirements 1.2, 1.3**

  - [x] 1.5 Write property test for SongSwitcher visibility


    - **Property 3: SongSwitcher visibility condition**
    - **Validates: Requirements 1.4**

-

- [x] 2. Implement timestamp lyrics offset adjustment



  - [x] 2.1 Create offset utility functions


    - Create `frontend/src/lib/offset-utils.ts`
    - Implement `applyOffset(alignedWords, offsetMs)` function 
    - Implement `clampOffset(value, min, max)` function
    - Implement `formatOffsetDisplay(offsetMs)` function
    - _Requirements: 2.1, 2.6_

  - [x] 2.2 Write property test for offset application


    - **Property 4: Offset application to timestamps**
    - **Validates: Requirements 2.1**


  - [x] 2.3 Write property test for offset range constraint
    - **Property 5: Offset range constraint**
    - **Validates: Requirements 2.6**

  - [x] 2.4 Create OffsetControl component


    - Create `frontend/src/components/OffsetControl.tsx`
    - Implement slider with range -2000 to +2000 ms
    - Add minus/plus buttons for 50ms increments
    - Add reset button to set offset to 0
    - Display current offset value in milliseconds
    - Add ARIA labels for accessibility
    - _Requirements: 2.2, 2.5, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 2.5 Write property test for offset increment/decrement


    - **Property 6: Offset increment/decrement**
    - **Validates: Requirements 3.3, 3.4**

  - [x] 2.6 Write unit tests for OffsetControl component


    - Test rendering with default props
    - Test slider value changes
    - Test +/- button clicks
    - Test reset button
    - Test keyboard accessibility

  - [x] 2.7 Write property test for offset control accessibility


    - **Property 16: Offset control accessibility**
    - **Validates: Requirements 11.1**
-

- [x] 3. Implement offset persistence




  - [x] 3.1 Create offset storage utilities


    - Create `frontend/src/lib/offset-storage.ts`
    - Implement `saveOffset(songId, offset)` function
    - Implement `loadOffset(songId)` function
    - Implement LRU eviction when entries exceed 50
    - Handle localStorage errors gracefully
    - _Requirements: 12.1, 12.2, 12.3, 12.4_


  - [x] 3.2 Write property test for offset persistence round-trip

    - **Property 7: Offset persistence round-trip**
    - **Validates: Requirements 2.3, 2.4, 12.1, 12.2**


  - [x] 3.3 Write property test for LRU eviction

    - **Property 8: Offset storage LRU eviction**
    - **Validates: Requirements 12.3**


  - [x] 3.4 Write unit tests for offset storage

    - Test save/load offset
    - Test LRU eviction
    - Test invalid data handling
    - Test storage full handling
-

- [x] 4. Integrate offset into LyricsDisplay



  - [x] 4.1 Update LyricsDisplay component


    - Add `offset` prop to LyricsDisplayProps interface
    - Modify `useLyricsSync` hook to apply offset to currentTime
    - Update word highlighting logic to use offset-adjusted time
    - _Requirements: 2.1, 2.2_


  - [x] 4.2 Update useLyricsSync hook

    - Add `offset` parameter to hook options
    - Apply offset when calling `findWordAtTime()`
    - Ensure offset changes trigger re-render
    - _Requirements: 2.1, 2.2_


  - [x] 4.3 Write property test for screen reader announcement

    - **Property 17: Screen reader offset announcement**
    - **Validates: Requirements 11.5**



- [x] 5. Integrate offset control into SongPlaybackPage


  - [x] 5.1 Add offset state to SongPlaybackPage


    - Add `offset` state variable
    - Load offset from localStorage on mount
    - Save offset to localStorage on change
    - Pass offset to LyricsDisplay component
    - _Requirements: 2.3, 2.4_

  - [x] 5.2 Add OffsetControl to SongPlaybackPage UI

    - Position OffsetControl near lyrics panel
    - Connect onChange handler to state
    - Show only when timestamped lyrics available
    - _Requirements: 3.1_

- [x] 6. Implement section marker detection and handling




  - [x] 6.1 Create section marker utility functions


    - Create `frontend/src/lib/section-marker-utils.ts`
    - Implement `isSectionMarker(word: string)` function to detect `**...**` pattern
    - Implement `classifyAlignedWords(alignedWords)` to separate markers from lyrics
    - Implement `findNextNonMarkerIndex(alignedWords, currentIndex)` function
    - _Requirements: 13.1, 13.2_

  - [x] 6.2 Write property test for section marker detection


    - **Property 18: Section marker detection**
    - **Validates: Requirements 13.1, 13.2**

  - [x] 6.3 Update useLyricsSync hook for marker-aware highlighting


    - Modify `findWordAtTime()` to skip section markers when determining current word
    - When current time falls on a marker, return the next non-marker word index
    - Add `skipMarkers` option to hook configuration
    - _Requirements: 13.4, 13.5_

  - [x] 6.4 Write property test for section marker highlighting skip


    - **Property 19: Section marker highlighting skip**
    - **Validates: Requirements 13.4, 13.5**

  - [x] 6.5 Update LyricsDisplay for section marker styling


    - Add distinct CSS classes for section markers (muted color, smaller font)
    - Render markers inline but without "current word" highlight effect
    - Add `showMarkers` prop to control visibility
    - _Requirements: 13.3, 13.6_

  - [x] 6.6 Create MarkerVisibilityToggle component


    - Create `frontend/src/components/MarkerVisibilityToggle.tsx`
    - Implement toggle switch to show/hide section markers
    - Save preference to localStorage
    - Load preference on mount
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 6.7 Write property test for marker visibility toggle


    - **Property 20: Section marker visibility toggle**
    - **Validates: Requirements 14.2, 14.3**


  - [x] 6.8 Write property test for marker visibility persistence

    - **Property 21: Section marker visibility persistence**
    - **Validates: Requirements 14.4, 14.5**

  - [x] 6.9 Integrate marker controls into SongPlaybackPage


    - Add MarkerVisibilityToggle near lyrics panel
    - Pass showMarkers state to LyricsDisplay
    - Show toggle only when section markers exist in alignedWords
    - _Requirements: 14.1_
-

- [x] 7. Checkpoint - Ensure offset and section marker features work




  - Ensure all tests pass, ask the user if questions arise.

- [-] 8. Implement VTT generation and line-level sync




  - [x] 8.1 Create line aggregation utilities

    - Create `frontend/src/lib/vtt-generator.ts`
    - Implement `aggregateWordsToLines(alignedWords, editedLyrics)` function
    - Match edited lyrics lines to aligned words by text content
    - Use first word's startS as line startTime, last word's endS as endTime
    - Handle word splits (e.g., "we're" → "we'" + "re")
    - Detect section markers (**...**) and mark them in LineCue
    - _Requirements: 7.2, 7.3, 7.4_


  - [x] 8.2 Write property test for line aggregation timestamp bounds


    - **Property 13: Line aggregation timestamp bounds**
    - **Validates: Requirements 7.2, 7.3**



  - [x] 8.3 Write property test for line aggregation completeness
    - **Property 24: Line aggregation completeness**
    - **Validates: Requirements 7.2, 7.4**



  - [x] 8.4 Create VTT file generator
    - Implement `formatVttTimestamp(seconds)` function (HH:MM:SS.mmm format)
    - Implement `generateVttContent(lineCues, offset)` function
    - Implement `downloadVttFile(content, filename)` function
    - Exclude section markers from VTT output


    - _Requirements: 7.5, 7.6_

  - [x] 8.5 Write property test for VTT timestamp format
    - **Property 14: VTT timestamp format**
    - **Validates: Requirements 7.5**


  - [x] 8.6 Create LineLyricsDisplay component

    - Create `frontend/src/components/LineLyricsDisplay.tsx`
    - Render lyrics line by line with LineCue data
    - Highlight current line based on currentTime + offset
    - Make each line clickable to seek audio
    - Auto-scroll to keep current line visible
    - Render section markers with distinct styling (muted, smaller)

    - _Requirements: 9.1, 9.2, 9.3, 8.1, 8.4_



  - [x] 8.7 Write property test for current line highlighting
    - **Property 23: Current line highlighting**
    - **Validates: Requirements 9.1, 9.4**

  - [x] 8.8 Implement line click navigation
    - Add onClick handler to each line in LineLyricsDisplay

    - Call onLineClick(startTime) when line is clicked
    - Update audio player currentTime via seek
    - Continue playback if audio was playing

    - _Requirements: 8.2, 8.3, 8.5_

  - [x] 8.9 Write property test for line click navigation
    - **Property 22: Line click navigation**
    - **Validates: Requirements 8.2**


  - [x] 8.10 Create SyncModeToggle component
    - Create `frontend/src/components/SyncModeToggle.tsx`

    - Toggle between 'word' and 'line' sync modes
    - Persist preference to localStorage
    - _Requirements: 9.5_

  - [x] 8.11 Write property test for sync mode persistence
    - **Property 25: Sync mode toggle persistence**
    - **Validates: Requirements 9.5**


  - [x] 8.12 Create VttDownloadButton component
    - Create `frontend/src/components/VttDownloadButton.tsx`


    - Show button when lineCues.length > 0
    - Hide button when no line-level timestamps
    - Generate filename from style and date
    - Apply user's offset to timestamps
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 8.13 Write property test for VTT download visibility
    - **Property 15: VTT download visibility**
    - **Validates: Requirements 10.1, 10.5**

  - [x] 8.14 Integrate VTT components into SongPlaybackPage
    - Add SyncModeToggle to controls area
    - Conditionally render LineLyricsDisplay or LyricsDisplay based on sync mode
    - Pass lineCues, currentTime, offset, and onLineClick props
    - Add VttDownloadButton to action buttons section
    - Connect line click to audio player seek
    - _Requirements: 7.1, 8.1, 9.1, 10.1_

- [x] 9. Implement song history backend API



  - [x] 9.1 Create SongHistorySummary model
    - Add `SongHistorySummary` Pydantic model to `backend/app/models/songs.py`
    - Include song_id, style, created_at, expires_at, lyrics_preview fields
    - Add has_variations and primary_variation_index fields
    - _Requirements: 6.2_


  - [x] 9.2 Create song history API endpoint
    - Add `GET /api/songs/history` endpoint to `backend/app/api/songs.py`
    - Query Firestore for user's non-expired songs
    - Order by created_at DESC
    - Limit to 20 results
    - Return list of SongHistorySummary

    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 9.3 Write property test for song history ordering

    - **Property 9: Song history ordering**
    - **Validates: Requirements 4.3**


  - [x] 9.4 Write property test for expiration filtering
    - **Property 10: Song history expiration filtering**
    - **Validates: Requirements 4.4, 6.1**


  - [x] 9.5 Write property test for response completeness
    - **Property 11: Song history response completeness**

    - **Validates: Requirements 6.2**

  - [x] 9.6 Write property test for history limit
    - **Property 12: Song history limit**
    - **Validates: Requirements 6.3**

  - [x] 9.7 Write unit tests for song history API
    - Test returns user's songs
    - Test ordering by created_at DESC
    - Test limit parameter
    - Test expired songs filtered
    - Test empty response for new user
    - Test 401 for unauthenticated request

- [x] 10. Implement song history frontend







  - [x] 10.1 Create song history API client function

    - Add `getSongHistory()` function to `frontend/src/api/songs.ts`
    - Return list of SongHistorySummary
    - Handle errors gracefully


    - _Requirements: 6.1_


  - [x] 10.2 Create SongHistoryItem component
    - Create `frontend/src/components/SongHistoryItem.tsx`
    - Display song style with icon
    - Show creation date and expiration countdown
    - Show lyrics preview (first 100 chars)


    - Make clickable to navigate to playback
    - Add keyboard accessibility
    - _Requirements: 4.2, 8.3, 8.4_


  - [x] 10.3 Create SongHistoryPage
    - Create `frontend/src/pages/SongHistoryPage.tsx`
    - Fetch song history on mount

    - Display loading state
    - Display empty state when no songs
    - Render list of SongHistoryItem components
    - Navigate to playback page on item click

    - _Requirements: 4.1, 4.5, 5.2, 5.3_

  - [x] 10.4 Write unit tests for SongHistoryPage

    - Test loading state
    - Test empty state
    - Test list rendering
    - Test navigation on click
    - Test error state

- [x] 11. Add song history navigation




  - [x] 11.1 Add route for song history page

    - Add `/history` route to App.tsx
    - Import and render SongHistoryPage
    - _Requirements: 5.1_


  - [x] 11.2 Add navigation link to PageNavigation
    - Add "My Songs" link to PageNavigation component
    - Link to `/history` route
    - _Requirements: 5.1_


  - [x] 11.3 Add back link from playback page
    - Add "My Songs" link to SongPlaybackPage header
    - Navigate to `/history`
    - _Requirements: 5.4_

- [x] 12. Checkpoint - Ensure all features work





  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Write integration tests





  - Test offset control integration with lyrics display
  - Test offset persistence across page reloads
  - Test VTT download with offset applied
  - Test song history navigation flow
  - Test song switcher with variations
  - Test section marker detection and highlighting skip
  - Test line aggregation from aligned words to LineCues
  - Test line click navigation seeks audio correctly
  - Test sync mode toggle switches between word and line display
  - Test current line highlighting during playback

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

