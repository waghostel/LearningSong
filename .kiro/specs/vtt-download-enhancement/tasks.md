# Implementation Plan

- [ ] 1. Enhance word-to-line aggregation utilities
  - Improve the existing `aggregateWordsToLines` function to handle edge cases better
  - Add robust word matching algorithm for handling word splits and text variations
  - Implement text normalization utilities for consistent matching
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 1.1 Write property test for word-to-line aggregation
  - **Property 1: Word-to-line aggregation produces valid timestamps**
  - **Validates: Requirements 1.1, 3.3, 3.4**

- [ ] 1.2 Write property test for word matching completeness
  - **Property 2: Word matching preserves all line content**
  - **Validates: Requirements 1.2, 3.2**

- [ ] 1.3 Write property test for word split handling
  - **Property 9: Word split handling in matching**
  - **Validates: Requirements 3.1**

- [ ] 1.4 Write property test for unmatchable line handling
  - **Property 10: Graceful handling of unmatchable lines**
  - **Validates: Requirements 3.5**

- [ ] 2. Implement line-by-line lyrics display component
  - Create `LineLyricsDisplay` component for line-level highlighting
  - Implement timing logic for line activation and deactivation
  - Add click-to-seek functionality for individual lines
  - Handle section marker visibility based on user preferences
  - _Requirements: 1.3, 1.4, 1.5_

- [ ] 2.1 Write property test for line highlighting timing
  - **Property 3: Line highlighting activation timing**
  - **Validates: Requirements 1.3, 1.4, 1.5**

- [ ] 2.2 Write unit tests for LineLyricsDisplay component
  - Test line rendering with various line cue configurations
  - Test click handlers and seek functionality
  - Test marker visibility toggling
  - _Requirements: 1.3, 1.4, 1.5_

- [ ] 3. Enhance VTT generation and download functionality
  - Improve existing VTT generation utilities for better error handling
  - Enhance filename generation with proper normalization
  - Add offset application with boundary checking
  - Implement download error handling and user feedback
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3.1 Write property test for VTT format compliance
  - **Property 5: VTT generation produces valid WebVTT format**
  - **Validates: Requirements 2.2, 5.1**

- [ ] 3.2 Write property test for section marker exclusion
  - **Property 6: Section markers excluded from VTT output**
  - **Validates: Requirements 2.3**

- [ ] 3.3 Write property test for offset application
  - **Property 7: Offset application to all timestamps**
  - **Validates: Requirements 2.4**

- [ ] 3.4 Write property test for filename format
  - **Property 8: VTT filename format consistency**
  - **Validates: Requirements 2.5, 5.2**

- [ ] 3.5 Write property test for special character normalization
  - **Property 13: Special character normalization in filenames**
  - **Validates: Requirements 5.3**

- [ ] 4. Update Song Playback page integration
  - Integrate LineLyricsDisplay component into Song Playback page
  - Add sync mode toggle for switching between word and line highlighting
  - Update VTT download button visibility logic
  - Implement proper state management for line-level synchronization
  - _Requirements: 1.1, 2.1, 6.1_

- [ ] 4.1 Write property test for VTT button visibility
  - **Property 4: VTT button visibility based on data availability**
  - **Validates: Requirements 2.1, 6.1**

- [ ] 4.2 Write integration tests for Song Playback page
  - Test switching between word and line sync modes
  - Test VTT download button integration
  - Test line highlighting during audio playback
  - _Requirements: 1.1, 2.1, 6.1_

- [ ] 5. Implement accessibility enhancements
  - Add proper ARIA labels and descriptions to VTT download button
  - Implement keyboard navigation support for line-level interactions
  - Add ARIA live regions for dynamic line highlighting updates
  - Ensure semantic HTML structure for lyrics display
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 5.1 Write property test for keyboard accessibility
  - **Property 11: Keyboard accessibility for VTT button**
  - **Validates: Requirements 4.1**

- [ ] 5.2 Write property test for ARIA labeling
  - **Property 12: ARIA labeling completeness**
  - **Validates: Requirements 4.2**

- [ ] 5.3 Write accessibility integration tests
  - Test screen reader compatibility with jest-axe
  - Test keyboard navigation flows
  - Test ARIA live region updates
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 6. Add robust error handling and edge case management
  - Implement graceful degradation when line-level data is unavailable
  - Add error boundaries for VTT generation failures
  - Handle Unicode and special character preservation
  - Implement proper state management for expired songs
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6.1 Write property test for timestamp boundary handling
  - **Property 15: Non-negative timestamp enforcement**
  - **Validates: Requirements 5.5**

- [ ] 6.2 Write property test for Unicode preservation
  - **Property 16: Unicode character preservation**
  - **Validates: Requirements 6.2**

- [ ] 6.3 Write property test for error handling
  - **Property 17: Error handling without system crashes**
  - **Validates: Requirements 6.3**

- [ ] 6.4 Write property test for expired song state
  - **Property 18: Expired song state management**
  - **Validates: Requirements 6.4**

- [ ] 6.5 Write unit tests for error scenarios
  - Test malformed data handling
  - Test network failure scenarios
  - Test browser compatibility fallbacks
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 7. Add timestamp formatting improvements
  - Enhance timestamp formatting for WebVTT compliance
  - Implement proper millisecond padding
  - Add validation for timestamp format consistency
  - _Requirements: 5.1, 5.4, 5.5_

- [ ] 7.1 Write property test for millisecond padding
  - **Property 14: Millisecond padding consistency**
  - **Validates: Requirements 5.4**

- [ ] 7.2 Write unit tests for timestamp formatting
  - Test various time values and formats
  - Test edge cases like zero times and large values
  - Test WebVTT format compliance
  - _Requirements: 5.1, 5.4, 5.5_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Performance optimization and final integration
  - Optimize word-to-line aggregation for large lyric files
  - Implement debouncing for real-time highlighting updates
  - Add performance monitoring for VTT generation
  - Conduct final integration testing across all components
  - _Requirements: All requirements_

- [ ] 9.1 Write performance tests
  - Test aggregation performance with large datasets
  - Test highlighting performance during rapid time updates
  - Test VTT generation performance with complex lyrics
  - _Requirements: All requirements_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.