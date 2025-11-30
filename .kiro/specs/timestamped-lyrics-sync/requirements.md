# Requirements Document

## Introduction

This feature implements precise lyrics synchronization during song playback by integrating the Suno API's timestamped lyrics endpoint. Currently, the application uses a simple linear interpolation to estimate which lyrics section should be highlighted based on playback time, resulting in noticeable latency where the singer is already singing the next lines while the previous section is still highlighted. By fetching word-level timestamps from the Suno API, the application will provide accurate karaoke-style lyrics highlighting that matches the actual vocal timing.

## Glossary

- **Timestamped Lyrics**: Lyrics data that includes precise start and end times (in seconds) for each word or phrase
- **Aligned Words**: The array of word objects returned by Suno API containing timing information
- **LyricsDisplay**: The frontend component responsible for rendering and highlighting lyrics during playback
- **SunoClient**: The backend service that communicates with the Suno API
- **Audio ID**: A unique identifier for a specific audio track within a Suno generation task
- **Task ID**: The identifier for a music generation task in the Suno API
- **Current Time**: The current playback position of the audio in seconds

## Requirements

### Requirement 1

**User Story:** As a user, I want the lyrics to highlight in sync with the actual singing, so that I can follow along accurately during playback.

#### Acceptance Criteria

1. WHEN a song finishes generating THEN the System SHALL fetch timestamped lyrics data from the Suno API
2. WHEN timestamped lyrics are available THEN the System SHALL highlight the current word or phrase based on the audio playback time
3. WHEN the audio playback time changes THEN the System SHALL update the highlighted lyrics within 100 milliseconds
4. WHEN timestamped lyrics are unavailable THEN the System SHALL fall back to the existing linear interpolation method

### Requirement 2

**User Story:** As a developer, I want the backend to fetch and store timestamped lyrics, so that the data is available for playback without additional API calls.

#### Acceptance Criteria

1. WHEN a song generation task completes successfully THEN the System SHALL call the Suno timestamped lyrics endpoint
2. WHEN the timestamped lyrics API returns data THEN the System SHALL store the aligned words array with the song metadata
3. WHEN storing timestamped lyrics THEN the System SHALL include startS, endS, and word fields for each entry
4. WHEN the timestamped lyrics API fails THEN the System SHALL log the error and continue without blocking song delivery

### Requirement 3

**User Story:** As a user, I want smooth auto-scrolling to the current lyrics position, so that I don't have to manually scroll during playback.

#### Acceptance Criteria

1. WHEN the highlighted lyrics section changes THEN the System SHALL smoothly scroll the lyrics container to keep the current section visible
2. WHEN a user manually scrolls the lyrics THEN the System SHALL pause auto-scrolling for 5 seconds
3. WHEN auto-scrolling resumes THEN the System SHALL animate to the current position without jarring jumps

### Requirement 4

**User Story:** As a developer, I want the frontend to efficiently process timestamp data, so that playback performance remains smooth.

#### Acceptance Criteria

1. WHEN receiving timestamped lyrics THEN the System SHALL parse and index the data for O(log n) lookup by time
2. WHEN the audio time updates THEN the System SHALL use binary search to find the current word
3. WHEN rendering highlighted lyrics THEN the System SHALL batch DOM updates to prevent layout thrashing

### Requirement 5

**User Story:** As a user, I want to see visual feedback for the current word being sung, so that I can follow the exact position in the lyrics.

#### Acceptance Criteria

1. WHEN a word is currently being sung THEN the System SHALL apply a distinct highlight style to that word
2. WHEN a word has been sung THEN the System SHALL apply a "completed" style different from upcoming words
3. WHEN displaying lyrics THEN the System SHALL maintain readable contrast ratios for all highlight states

