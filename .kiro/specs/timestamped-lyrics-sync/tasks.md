# Implementation Plan

- [ ] 1. Extend backend Suno client with timestamped lyrics endpoint
  - [ ] 1.1 Add AlignedWord and TimestampedLyrics dataclasses to suno_client.py
    - Define AlignedWord with word, start_s, end_s, success, palign fields
    - Define TimestampedLyrics with aligned_words, waveform_data, hoot_cer, is_streamed fields
    - _Requirements: 2.3_
  - [ ] 1.2 Implement get_timestamped_lyrics method in SunoClient
    - POST to /api/v1/generate/get-timestamped-lyrics with taskId and audioId
    - Parse response into TimestampedLyrics dataclass
    - Handle errors gracefully without blocking
    - _Requirements: 2.1, 2.4_
  - [ ] 1.3 Write property test for timestamped lyrics fetch
    - **Property 1: Timestamped lyrics fetch on song completion**
    - **Validates: Requirements 1.1, 2.1**

- [ ] 2. Update song models and storage
  - [ ] 2.1 Extend SongMetadata Pydantic model with timestamp fields
    - Add aligned_words: list[dict] | None field
    - Add waveform_data: list[float] | None field
    - Add has_timestamps: bool field
    - _Requirements: 2.2, 2.3_
  - [ ] 2.2 Update song storage service to persist timestamped lyrics
    - Modify store_song to include aligned_words and waveform_data
    - Update Firestore document schema
    - _Requirements: 2.2_
  - [ ] 2.3 Write property test for storage integrity
    - **Property 3: Timestamped lyrics storage integrity**
    - **Validates: Requirements 2.2, 2.3**

- [ ] 3. Integrate timestamp fetch into song generation flow
  - [ ] 3.1 Update WebSocket handler to fetch timestamps after song completion
    - Call get_timestamped_lyrics when status is SUCCESS
    - Extract audio_id from sunoData response
    - Store timestamps with song metadata
    - _Requirements: 1.1, 2.1_
  - [ ] 3.2 Update songs API to return timestamped lyrics
    - Modify GET /api/songs/{song_id} response to include aligned_words
    - Ensure shared song endpoint also returns timestamps
    - _Requirements: 1.2_

- [ ] 4. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Create frontend types and utilities
  - [ ] 5.1 Add TypeScript types for timestamped lyrics
    - Create AlignedWord interface in types/lyrics.ts
    - Create TimestampedLyrics interface
    - Update SongResponse type to include aligned_words
    - _Requirements: 1.2_
  - [ ] 5.2 Implement binary search utility for word lookup
    - Create findWordAtTime function with O(log n) complexity
    - Handle edge cases: empty array, time before first word, time after last word
    - _Requirements: 4.1, 4.2_
  - [ ] 5.3 Write property test for binary search
    - **Property 4: Binary search correctness**
    - **Validates: Requirements 4.1, 4.2**

- [ ] 6. Create useLyricsSync hook
  - [ ] 6.1 Implement useLyricsSync hook
    - Accept alignedWords array and currentTime
    - Use binary search to find current word
    - Return currentWordIndex, currentWord, and progress
    - Memoize calculations for performance
    - _Requirements: 1.2, 4.2_
  - [ ] 6.2 Write property test for word highlighting
    - **Property 2: Correct word highlighting by time**
    - **Validates: Requirements 1.2**
  - [ ] 6.3 Write property test for word state classification
    - **Property 5: Word state classification**
    - **Validates: Requirements 5.1, 5.2**

- [ ] 7. Update LyricsDisplay component
  - [ ] 7.1 Add word-level rendering mode to LyricsDisplay
    - Accept optional alignedWords prop
    - Render individual words with timing data when available
    - Apply highlight styles based on word state (current, completed, upcoming)
    - _Requirements: 5.1, 5.2_
  - [ ] 7.2 Implement fallback to section-based display
    - Detect when alignedWords is empty/undefined
    - Use existing linear interpolation method as fallback
    - _Requirements: 1.4_
  - [ ] 7.3 Update auto-scroll behavior for word-level sync
    - Scroll to current word instead of section
    - Maintain manual scroll pause behavior
    - _Requirements: 3.1, 3.2_

- [ ] 8. Update song playback store and page
  - [ ] 8.1 Extend songPlaybackStore with timestamp fields
    - Add alignedWords, hasTimestamps, waveformData to state
    - Update loadSong action to populate timestamp fields
    - _Requirements: 1.2_
  - [ ] 8.2 Update SongPlaybackPage to pass timestamps to LyricsDisplay
    - Pass alignedWords from store to LyricsDisplay component
    - _Requirements: 1.2_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Add unit tests for frontend components
  - [ ] 10.1 Write unit tests for useLyricsSync hook
    - Test with various aligned words arrays
    - Test edge cases (empty array, single word, boundaries)
    - _Requirements: 1.2, 4.2_
  - [ ] 10.2 Write unit tests for LyricsDisplay with timestamps
    - Test word-level rendering
    - Test fallback behavior
    - Test highlight state application
    - _Requirements: 5.1, 5.2, 1.4_

- [ ] 11. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

