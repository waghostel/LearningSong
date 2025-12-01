# Implementation Plan

- [ ] 1. Update backend data models and Suno client
  - Create `SongVariation` Pydantic model with audio_url, audio_id, and variation_index fields
  - Modify `SunoClient.get_task_status()` to extract all variations from sunoData array instead of just first item
  - Update `SunoStatus` dataclass to include `variations: list[SongVariation]` field
  - Add validation to ensure variation_index is 0 or 1
  - _Requirements: 1.1, 7.1_

- [ ] 1.1 Write property test for dual song extraction
  - **Property 1: Dual song extraction completeness**
  - **Validates: Requirements 1.1, 7.1**

- [ ] 1.2 Update song storage service for variations
  - Modify `store_song_task()` to accept and store variations array
  - Update Firestore schema to include `variations` array and `primary_variation_index` fields
  - Add `update_primary_variation()` function to update user's selection
  - Implement backward compatibility: migrate old `song_url` to `variations[0]` on read
  - _Requirements: 1.2, 1.3, 1.4, 7.3_

- [ ] 1.3 Write property test for variation storage
  - **Property 2: Variation storage completeness**
  - **Validates: Requirements 1.2, 7.3**

- [ ] 1.4 Write property test for default primary variation
  - **Property 3: Default primary variation**
  - **Validates: Requirements 1.3**

- [ ] 1.5 Write property test for variation order preservation
  - **Property 4: Variation order preservation**
  - **Validates: Requirements 1.4**

- [ ] 1.6 Write property test for variation data preservation
  - **Property 13: Variation data preservation**
  - **Validates: Requirements 4.3**

- [ ] 2. Update backend API endpoints
  - Modify `GET /api/songs/{task_id}` to return variations array in `SongStatusUpdate`
  - Modify `GET /api/songs/{song_id}/details` to return variations and primary_variation_index
  - Update `update_task_status()` calls to store all variations from Suno response
  - _Requirements: 7.2, 7.4_

- [ ] 2.1 Create new API endpoint for updating primary variation
  - Implement `PATCH /api/songs/{task_id}/primary-variation` endpoint
  - Accept `UpdatePrimaryVariationRequest` with variation_index (0 or 1)
  - Verify user ownership before updating
  - Return success response with updated primary_variation_index
  - _Requirements: 4.1, 7.5_

- [ ] 2.2 Create new API endpoint for fetching variation-specific timestamped lyrics
  - Implement `POST /api/songs/{task_id}/timestamped-lyrics/{variation_index}` endpoint
  - Retrieve correct audio_id for the specified variation from database
  - Call Suno API with correct audio_id
  - Return aligned_words and waveform_data
  - _Requirements: 6.1_

- [ ] 2.3 Write property test for API response format
  - **Property 20: API response format completeness**
  - **Validates: Requirements 7.2, 7.4**

- [ ] 3. Update frontend data models and API client
  - Create `SongVariation` TypeScript interface
  - Update `SongStatusUpdate` interface to include variations array
  - Update `SongDetails` interface to include variations and primary_variation_index
  - Add API client functions: `updatePrimaryVariation()` and `fetchVariationTimestampedLyrics()`
  - _Requirements: 7.2, 7.4_

- [ ] 4. Update Zustand store for dual songs
  - Add `songVariations: SongVariation[]` state field
  - Add `primaryVariationIndex: number` state field
  - Add `setSongVariations()` action
  - Add `setPrimaryVariationIndex()` action
  - Update `completeGeneration()` to handle variations array
  - _Requirements: 4.1, 4.2_

- [ ] 5. Create SongSwitcher component
  - Create `frontend/src/components/SongSwitcher.tsx`
  - Implement segmented control UI with "Version 1" and "Version 2" buttons
  - Show active state styling for currently selected variation
  - Display loading indicator during switch operations
  - Hide component when variations.length < 2
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.5_

- [ ] 5.1 Write property test for switcher visibility
  - **Property 5: Switcher visibility with multiple variations**
  - **Validates: Requirements 2.1**

- [ ] 5.2 Write property test for switcher hidden state
  - **Property 6: Switcher hidden with single variation**
  - **Validates: Requirements 2.2**

- [ ] 5.3 Write property test for active variation indication
  - **Property 7: Active variation indication**
  - **Validates: Requirements 2.4**

- [ ] 5.4 Write unit tests for SongSwitcher component
  - Test rendering with 2 variations
  - Test click handlers
  - Test loading state display
  - Test disabled state

- [ ] 6. Implement accessibility features for SongSwitcher
  - Add keyboard navigation support (Tab, Arrow keys, Enter, Space)
  - Add ARIA labels for screen readers (aria-label, aria-pressed, role="group")
  - Add visible focus indicators with CSS
  - Ensure touch targets are ≥ 44x44px for mobile
  - Test with axe-core for WCAG compliance
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 6.1 Write property test for keyboard navigation
  - **Property 23: Keyboard navigation support**
  - **Validates: Requirements 9.2**

- [ ] 6.2 Write property test for focus indication
  - **Property 24: Focus indication**
  - **Validates: Requirements 9.3**

- [ ] 6.3 Write property test for screen reader accessibility
  - **Property 25: Screen reader accessibility**
  - **Validates: Requirements 9.4**

- [ ] 7. Create useSongSwitcher hook
  - Create `frontend/src/hooks/useSongSwitcher.ts`
  - Manage activeIndex state
  - Implement `switchVariation()` function that:
    - Stops current audio playback
    - Updates audio player source to new variation
    - Fetches timestamped lyrics for new variation
    - Updates primary variation on backend
    - Handles errors and reverts on failure
  - Implement request cancellation for rapid switches using AbortController
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 6.5_

- [ ] 7.1 Write property test for variation switch
  - **Property 8: Variation switch triggers state update**
  - **Validates: Requirements 3.1, 3.3, 3.4**

- [ ] 7.2 Write property test for playback position preservation
  - **Property 9: Playback position preservation**
  - **Validates: Requirements 3.2**

- [ ] 7.3 Write property test for loading state
  - **Property 10: Loading state during switch**
  - **Validates: Requirements 3.5**

- [ ] 7.4 Write property test for switch failure recovery
  - **Property 11: Switch failure recovery**
  - **Validates: Requirements 3.6**

- [ ] 7.5 Write property test for request cancellation
  - **Property 19: Request cancellation on switch**
  - **Validates: Requirements 6.5**

- [ ] 8. Integrate SongSwitcher into playback UI
  - Update `LyricsEditingPage.tsx` to pass variations to playback navigation
  - Create or update `PlaybackPage.tsx` to display SongSwitcher
  - Position switcher near audio player controls
  - Connect switcher to useSongSwitcher hook
  - Handle variation switches and update audio player
  - _Requirements: 2.5, 3.1_

- [ ] 9. Implement audio player integration
  - Update audio player to stop playback before switching variations
  - Preserve playback position during switch if possible
  - Auto-play new variation if previous was playing
  - Remain paused if previous was paused
  - Display loading state during variation load
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9.1 Write property test for playback control
  - **Property 14: Playback control during switch**
  - **Validates: Requirements 5.1**

- [ ] 9.2 Write property test for playback state preservation
  - **Property 15: Playback state preservation**
  - **Validates: Requirements 5.4, 5.5**

- [ ] 10. Implement timestamped lyrics integration
  - Update lyrics sync to fetch timestamped lyrics for active variation
  - Use correct audio_id when fetching lyrics after switch
  - Display loading state in lyrics panel during fetch
  - Fall back to plain lyrics if fetch fails
  - Cancel pending requests when switching variations
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 10.1 Write property test for timestamped lyrics fetch
  - **Property 16: Timestamped lyrics fetch with correct audio ID**
  - **Validates: Requirements 6.1**

- [ ] 10.2 Write property test for lyrics sync
  - **Property 17: Lyrics sync after switch**
  - **Validates: Requirements 6.3**

- [ ] 10.3 Write property test for lyrics fallback
  - **Property 18: Lyrics fallback on fetch failure**
  - **Validates: Requirements 6.4**

- [ ] 11. Implement persistence and error handling
  - Ensure primary variation selection persists in database
  - Load user's selected variation when returning to song
  - Handle database update failures gracefully (show error but allow playback)
  - Implement offline detection and queue updates when offline
  - Display appropriate error messages for variation-specific failures
  - _Requirements: 4.1, 4.2, 4.4, 4.5, 8.3, 8.5_

- [ ] 11.1 Write property test for primary variation persistence
  - **Property 12: Primary variation persistence**
  - **Validates: Requirements 4.1, 4.2**

- [ ] 11.2 Write property test for variation error isolation
  - **Property 21: Variation-specific error isolation**
  - **Validates: Requirements 8.3**

- [ ] 11.3 Write property test for offline update queueing
  - **Property 22: Offline update queueing**
  - **Validates: Requirements 8.5**

- [ ] 12. Implement analytics tracking
  - Log variation switch events with variation_index and timestamp
  - Track which variation is played in playback events
  - Include user context in analytics events
  - Ensure share links use primary variation
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 12.1 Write property test for selection event logging
  - **Property 26: Selection event logging**
  - **Validates: Requirements 10.1, 10.3**

- [ ] 12.2 Write property test for play event tracking
  - **Property 27: Play event tracking**
  - **Validates: Requirements 10.2**

- [ ] 12.3 Write property test for share link primary variation
  - **Property 28: Share link uses primary variation**
  - **Validates: Requirements 10.4**

- [ ] 13. Handle edge cases and backward compatibility
  - Handle Suno API returning only 1 song (hide switcher)
  - Handle malformed variation data (skip invalid, log error)
  - Implement migration for old songs (convert song_url to variations[0])
  - Handle expired songs gracefully
  - Handle shared songs (don't update owner's primary selection)
  - _Requirements: 1.5, 8.1, 8.2, 8.4_

- [ ] 13.1 Write unit tests for edge cases
  - Test single variation handling
  - Test malformed data handling
  - Test backward compatibility migration
  - Test expired song handling
  - Test shared song behavior

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Write integration tests
  - Test complete flow: generate → switch → persist → reload
  - Test WebSocket updates with variations
  - Test API error scenarios
  - Test concurrent switch requests

- [ ] 16. Write E2E tests
  - Test user journey with Playwright
  - Test keyboard navigation flow
  - Test mobile touch interactions
  - Test offline/online transitions

- [ ] 17. Update documentation
  - Update API documentation with new endpoints
  - Document SongSwitcher component props and usage
  - Document database schema changes
  - Add migration guide for existing deployments
  - Update user-facing help text

- [ ] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
