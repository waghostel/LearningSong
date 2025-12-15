# Requirements Document

## Introduction

This specification defines the requirements for implementing line-by-line lyrics synchronization and VTT (WebVTT) subtitle file download functionality in the Song Playback page. The system will aggregate word-level timing data from the Suno API into line-level timestamps, enable line-by-line highlighting during playback, and allow users to download synchronized lyrics as subtitle files.

## Glossary

- **VTT File**: WebVTT (Web Video Text Tracks) format file containing timed text tracks for video/audio content
- **LineCue**: A data structure representing a line of lyrics with start time, end time, and text content
- **Song Playback Page**: The main page where users listen to generated songs and view synchronized lyrics
- **Aligned Words**: Word-level timing data provided by the Suno API for lyrics synchronization
- **Line-by-Line Highlighting**: Visual highlighting of complete lyric lines during playback instead of individual words
- **Word-to-Line Aggregation**: Process of combining word-level timestamps into line-level timestamps
- **Offset**: Time adjustment in milliseconds applied to all timestamps to fine-tune synchronization
- **Section Markers**: Special text markers in lyrics that indicate song sections (e.g., [Verse 1], [Chorus])
- **Suno API**: External service that provides word-level timing data for generated songs

## Requirements

### Requirement 1

**User Story:** As a user listening to my generated song, I want the lyrics to highlight line-by-line during playback, so that I can follow along more naturally with complete thoughts and phrases.

#### Acceptance Criteria

1. WHEN the Song Playback page receives word-level timing data from Suno API THEN the system SHALL aggregate words into line-level timestamps
2. WHEN aggregating words to lines THEN the system SHALL match words to their corresponding lyric lines based on text content
3. WHEN a line starts playing THEN the system SHALL highlight the entire line instead of individual words
4. WHEN the current playback time matches a line's start time THEN the system SHALL activate highlighting for that line
5. WHEN the current playback time exceeds a line's end time THEN the system SHALL deactivate highlighting for that line

### Requirement 2

**User Story:** As a user, I want to download the synchronized lyrics as a VTT subtitle file, so that I can use them with video players, accessibility tools, or other media applications.

#### Acceptance Criteria

1. WHEN line-level timestamps are available THEN the system SHALL display a VTT download button
2. WHEN a user clicks the VTT download button THEN the system SHALL generate a properly formatted WebVTT file with line-level timestamps
3. WHEN generating the VTT file THEN the system SHALL exclude section markers from the subtitle content
4. WHEN the user has applied a timing offset THEN the system SHALL apply the offset to all timestamps in the VTT file
5. WHEN the VTT file is generated THEN the system SHALL trigger an automatic download with a descriptive filename

### Requirement 3

**User Story:** As a user, I want the system to accurately match word-level timing data to lyric lines, so that the line-by-line highlighting and VTT timestamps are synchronized correctly.

#### Acceptance Criteria

1. WHEN matching words to lines THEN the system SHALL handle word splits where single words are broken into multiple aligned words
2. WHEN a lyric line contains multiple words THEN the system SHALL find all corresponding aligned words for that line
3. WHEN calculating line timestamps THEN the system SHALL use the first word's start time as the line start time
4. WHEN calculating line timestamps THEN the system SHALL use the last word's end time as the line end time
5. WHEN words cannot be matched to a line THEN the system SHALL skip that line and continue processing remaining lines

### Requirement 4

**User Story:** As a user with accessibility needs, I want the line-by-line highlighting and VTT download features to be keyboard accessible and properly labeled, so that I can use them with screen readers and keyboard navigation.

#### Acceptance Criteria

1. WHEN navigating with keyboard THEN the VTT download button SHALL be focusable and operable with Enter or Space keys
2. WHEN using screen readers THEN the button SHALL have appropriate ARIA labels describing its function
3. WHEN line highlighting is active THEN the system SHALL provide appropriate ARIA live region updates for screen readers
4. WHEN the download fails THEN the system SHALL provide accessible error feedback to the user
5. WHEN lyrics are displayed THEN the system SHALL maintain proper heading structure and semantic markup

### Requirement 5

**User Story:** As a user, I want the VTT file to contain properly formatted timestamps and descriptive filenames, so that the subtitles work correctly with media players and are easy to organize.

#### Acceptance Criteria

1. WHEN formatting timestamps THEN the system SHALL use the WebVTT standard format (MM:SS.mmm or HH:MM:SS.mmm)
2. WHEN generating a VTT filename THEN the system SHALL include the song style and creation date in format "song-{style}-{date}.vtt"
3. WHEN the song style contains spaces or special characters THEN the system SHALL normalize them to hyphens
4. WHEN formatting milliseconds THEN the system SHALL pad to three digits
5. WHEN applying offsets THEN the system SHALL ensure no negative timestamps are generated

### Requirement 6

**User Story:** As a user, I want the system to handle various edge cases and provide appropriate feedback, so that the line-by-line highlighting and VTT download features work reliably across different content types.

#### Acceptance Criteria

1. WHEN no line-level timestamps are available THEN the system SHALL hide the VTT download button and fall back to word-level highlighting
2. WHEN lyrics contain special characters or Unicode THEN the system SHALL preserve them correctly in both highlighting and VTT files
3. WHEN aligned words data is incomplete or corrupted THEN the system SHALL handle errors gracefully without crashing
4. WHEN the song has expired THEN the system SHALL disable the VTT download button but maintain read-only access to lyrics
5. WHEN generating VTT content fails THEN the system SHALL log the error and provide user feedback