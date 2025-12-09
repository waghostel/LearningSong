# Implementation Plan

- [x] 1. Extend backend rate limiting for regenerations

  - Add separate rate limit counter for lyrics regeneration (10/day for anonymous users)
  - Create `check_regeneration_limit()` and `increment_regeneration_usage()` functions in `rate_limiter.py`
  - Ensure regeneration counter is independent from song generation counter
  - _Requirements: 7.1, 7.3, 7.5_

- [x] 1.1 Write property test for separate rate limit counters

  - **Property 22: Separate regeneration counter**
  - **Validates: Requirements 7.3**

- [x] 2. Create backend regenerate endpoint

  - Add `RegenerateLyricsRequest` model to `backend/app/models/lyrics.py`
  - Implement `POST /api/lyrics/regenerate` endpoint in `backend/app/api/lyrics.py`
  - Invoke existing `LyricsPipeline` to generate new lyrics
  - Check regeneration rate limit before processing
  - Return `GenerateLyricsResponse` without incrementing song generation quota
  - _Requirements: 1.1, 7.1_

- [x] 2.1 Write property test for rate limit check ordering

  - **Property 21: Rate limit check before regeneration**
  - **Validates: Requirements 7.1**

- [x] 2.2 Write property test for pipeline invocation

  - **Property 1: Regeneration creates new version**
  - **Validates: Requirements 1.1**

- [x] 2.3 Write unit tests for regenerate endpoint

  - Test successful regeneration with valid content
  - Test rate limit exceeded scenario (429 error)
  - Test invalid content validation (400 error)
  - Test AI pipeline failure handling (500 error)
  - _Requirements: 1.1, 1.4, 7.2_

- [x] 3. Extend frontend store with version management

  - Add `LyricsVersion` interface to `lyricsEditingStore.ts`
  - Add version management state: `originalContent`, `versions`, `activeVersionId`, `isRegenerating`
  - Implement `addVersion()` action to create new version with UUID and timestamp
  - Implement `setActiveVersion()` action to switch between versions
  - Implement `deleteVersion()` action to remove versions
  - Implement `updateVersionEdits()` action to save manual edits
  - Add regeneration actions: `startRegeneration()`, `completeRegeneration()`, `failRegeneration()`
  - Ensure version history persists in sessionStorage
  - _Requirements: 1.1, 1.3, 2.2, 5.1, 5.3, 6.1_

- [x] 3.1 Write property test for version addition

  - **Property 3: Successful regeneration updates active version**
  - **Validates: Requirements 1.3**

- [x] 3.2 Write property test for version switching preserves history

  - **Property 5: Version switching preserves history**
  - **Validates: Requirements 2.3**

- [x] 3.3 Write property test for sequential version numbering

  - **Property 8: Sequential version numbering**
  - **Validates: Requirements 3.2**

- [x] 3.4 Write property test for session persistence round-trip

  - **Property 11: Session persistence round-trip**
  - **Validates: Requirements 4.1, 4.2**

- [x] 3.5 Write property test for content change clears history

  - **Property 13: Content change clears history**
  - **Validates: Requirements 4.4**

- [x] 3.6 Write unit tests for store actions

  - Test version addition with unique IDs
  - Test active version switching
  - Test version deletion
  - Test edit tracking and preservation
  - Test state reset on content hash change
  - _Requirements: 1.3, 2.2, 4.4, 5.1, 6.1_

- [x] 4. Create frontend API integration for regeneration

  - Add `RegenerateLyricsRequest` interface to `frontend/src/api/lyrics.ts`
  - Implement `regenerateLyrics()` API function
  - Create `useRegenerateLyrics` hook in `frontend/src/hooks/useRegenerateLyrics.ts`
  - Use TanStack Query mutation for regeneration requests
  - Handle success: add new version to store
  - Handle errors: display toast notification and update error state
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 4.1 Write unit tests for regeneration hook

  - Test successful regeneration flow
  - Test error handling
  - Test loading states
  - Test store integration
  - _Requirements: 1.3, 1.4_

- [x] 5. Create RegenerateButton component

  - Create `frontend/src/components/RegenerateButton.tsx`
  - Add refresh icon and "Regenerate Lyrics" label
  - Show loading spinner when `isRegenerating` is true
  - Disable button when regenerating or rate limit reached
  - Show confirmation dialog if user has unsaved edits
  - Position next to "Generate Song" button in footer
  - _Requirements: 1.2, 1.5, 7.2_

- [x] 5.1 Write property test for UI disabled during regeneration

  - **Property 2: UI disabled during regeneration**
  - **Validates: Requirements 1.2**

- [x] 5.2 Write unit tests for RegenerateButton

  - Test button click triggers regeneration
  - Test loading state disables button
  - Test confirmation dialog with unsaved edits
  - Test rate limit disabled state
  - _Requirements: 1.2, 1.5, 7.2_

- [x] 6. Create VersionSelector component

  - Create `frontend/src/components/VersionSelector.tsx`
  - Display horizontal pill-style selector with version numbers
  - Highlight active version with primary color
  - Show timestamp tooltip on hover
  - Add delete icon (X) for each version (disabled if only one version)
  - Show edit indicator (pencil icon) for manually modified versions
  - Position above lyrics textarea
  - Hide component when only one version exists
  - _Requirements: 2.1, 2.5, 3.1, 3.4, 5.2, 6.4_

- [x] 6.1 Write property test for version selection updates display

  - **Property 6: Version selection updates display**
  - **Validates: Requirements 2.2**

- [x] 6.2 Write property test for active version indicator

  - **Property 10: Active version highlighting**
  - **Validates: Requirements 3.4**

- [x] 6.3 Write property test for version display metadata

  - **Property 9: Version display includes metadata**
  - **Validates: Requirements 3.1, 3.3**

- [x] 6.4 Write unit tests for VersionSelector

  - Test rendering with multiple versions
  - Test version selection
  - Test version deletion
  - Test active version highlighting
  - Test conditional rendering (hide when one version)
  - Test edit indicator display
  - _Requirements: 2.1, 2.2, 2.5, 3.1, 5.2, 6.1_

- [x] 7. Implement version switching logic

  - Update `LyricsEditingPage.tsx` to handle version switching
  - Save current edits to active version before switching
  - Load selected version's lyrics (editedLyrics if present, otherwise original)
  - Update activeVersionId in store
  - Update lyrics textarea with selected version content
  - _Requirements: 2.2, 2.4, 5.3, 5.4_

- [x] 7.1 Write property test for active version synchronization

  - **Property 7: Active version indicator synchronization**
  - **Validates: Requirements 2.4**

- [x] 7.2 Write property test for edit preservation during switch

  - **Property 16: Edit preservation during switch**
  - **Validates: Requirements 5.3**

- [x] 7.3 Write property test for edited content restoration

  - **Property 17: Edited content restoration**
  - **Validates: Requirements 5.4**

- [x] 7.4 Write unit tests for version switching

  - Test switching between versions
  - Test edit preservation
  - Test loading edited vs original lyrics
  - _Requirements: 2.2, 5.3, 5.4_

- [x] 8. Implement edit tracking

  - Track when user modifies lyrics in textarea
  - Set `isEdited` flag when editedLyrics differs from original
  - Display edit indicator in VersionSelector for edited versions
  - Save edits to version's `editedLyrics` field
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8.1 Write property test for edit tracking

  - **Property 14: Edit tracking**
  - **Validates: Requirements 5.1**

- [x] 8.2 Write property test for edit indicator display

  - **Property 15: Edit indicator display**
  - **Validates: Requirements 5.2**

- [x] 8.3 Write unit tests for edit tracking

  - Test isEdited flag updates
  - Test edit indicator rendering
  - Test editedLyrics field population
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 9. Implement version deletion

  - Add delete handler in `LyricsEditingPage.tsx`
  - Remove version from versions array
  - If deleting active version, switch to most recent remaining version
  - If deleting non-active version, maintain current activeVersionId
  - Disable delete button when only one version remains
  - Show confirmation dialog before deletion
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9.1 Write property test for version deletion

  - **Property 18: Version deletion removes from history**
  - **Validates: Requirements 6.1**

- [x] 9.2 Write property test for non-active deletion

  - **Property 19: Non-active deletion preserves active**
  - **Validates: Requirements 6.2**

- [x] 9.3 Write property test for active deletion

  - **Property 20: Active deletion switches to recent**
  - **Validates: Requirements 6.3**

- [x] 9.4 Write unit tests for version deletion

  - Test deleting non-active version
  - Test deleting active version
  - Test delete disabled with one version
  - Test confirmation dialog
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 10. Integrate version management with song generation

  - Update song generation to use active version's lyrics
  - Use `editedLyrics` if present, otherwise use original `lyrics`
  - Pass correct lyrics to `GenerateSongRequest`
  - Ensure song generation works with any selected version
  - _Requirements: 4.3, 5.5_

- [x] 10.1 Write property test for song generation uses active version

  - **Property 12: Song generation uses active version**
  - **Validates: Requirements 4.3, 5.5**

- [x] 10.2 Write unit tests for song generation integration

  - Test song generation with original lyrics
  - Test song generation with edited lyrics
  - Test song generation with different active versions
  - _Requirements: 4.3, 5.5_

- [ ] 11. Add keyboard navigation and accessibility

  - Implement arrow key navigation in VersionSelector

  - Add proper ARIA labels and roles to version selector
  - Add aria-live region for version change announcements
  - Ensure focus management after version deletion
  - Add keyboard shortcut for regeneration (Ctrl+R)
  - Test with screen readers
  - _Requirements: 8.3, 8.4, 8.5_

- [ ] 11.1 Write property test for keyboard navigation

  - **Property 24: Keyboard navigation support**
  - **Validates: Requirements 8.3**

- [ ] 11.2 Write property test for screen reader announcements

  - **Property 25: Screen reader announcements**
  - **Validates: Requirements 8.5**

- [ ] 11.3 Write unit tests for accessibility features

  - Test arrow key navigation
  - Test ARIA attributes
  - Test focus management
  - Test keyboard shortcuts
  - _Requirements: 8.3, 8.4, 8.5_

- [x] 12. Add error handling and user feedback

  - Display toast notifications for regeneration errors
  - Show specific error message for rate limit exceeded
  - Display loading state during regeneration
  - Show retry button on failure
  - Handle network timeouts gracefully
  - Log errors to console for debugging
  - _Requirements: 1.4, 7.2_

- [x] 12.1 Write property test for failed regeneration preserves state

  - **Property 4: Failed regeneration preserves state**
  - **Validates: Requirements 1.4**

- [x] 12.2 Write unit tests for error handling

  - Test rate limit error display
  - Test network error handling
  - Test retry functionality
  - Test error toast notifications
  - _Requirements: 1.4, 7.2_

- [x] 13. Add version ordering and display

  - Sort versions chronologically by `createdAt` timestamp
  - Display version numbers sequentially (Version 1, Version 2, etc.)
  - Format timestamps in human-readable format (e.g., "2 minutes ago")
  - Show timestamp tooltip on hover
  - _Requirements: 3.1, 3.2, 3.3, 8.1_

- [x] 13.1 Write property test for chronological ordering

  - **Property 23: Chronological version ordering**
  - **Validates: Requirements 8.1**

- [x] 13.2 Write unit tests for version display

  - Test version numbering
  - Test timestamp formatting
  - Test chronological sorting
  - Test tooltip display
  - _Requirements: 3.1, 3.2, 3.3, 8.1_

- [x] 14. Implement version limit and cleanup

  - Limit maximum versions to 10 per content
  - Auto-delete oldest version when adding 11th version
  - Display warning when approaching version limit
  - Handle sessionStorage quota exceeded gracefully
  - _Requirements: 4.1_

- [x] 14.1 Write unit tests for version limit

  - Test max 10 versions enforced
  - Test oldest version auto-deletion
  - Test version limit warning
  - _Requirements: 4.1_

- [ ] 15. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Integration testing and polish

  - Test complete flow: generate → regenerate → switch → edit → generate song
  - Test session persistence across navigation
  - Test rate limiting integration
  - Verify accessibility with keyboard and screen reader
  - Test error scenarios end-to-end
  - Polish UI animations and transitions
  - _Requirements: All_

- [ ] 16.1 Write integration tests
  - Test end-to-end version management flow
  - Test session persistence
  - Test rate limit integration
  - Test accessibility features
  - _Requirements: All_
