# Requirements Document

## Introduction

Page C is the Song Playback Page for the LearningSong application. This page serves as the final destination in the user flow where users can play, download, and share the AI-generated songs created from their educational content. The page displays the generated song with synchronized lyrics, provides playback controls, and allows users to regenerate or share their songs.

## Glossary

- **Song_Playback_System**: The frontend and backend components responsible for retrieving, playing, and managing generated songs
- **Audio_Player**: The HTML5-based audio playback component with play, pause, seek, and download controls
- **Lyrics_Display**: The component that shows lyrics synchronized with audio playback
- **Song_Metadata**: Information about the song including style, generation date, and expiration time
- **Share_Link**: A temporary URL (valid for 48 hours) that allows sharing the generated song
- **Suno_API**: External music generation service that provides audio URLs
- **Rate_Limit**: Restriction of 3 songs per day per anonymous user

## Requirements

### Requirement 1

**User Story:** As a user, I want to play my generated song, so that I can listen to the educational content transformed into music.

#### Acceptance Criteria

1. WHEN the Song_Playback_System loads a song page THEN the Song_Playback_System SHALL display the Audio_Player with play, pause, and seek controls
2. WHEN a user clicks the play button THEN the Audio_Player SHALL begin audio playback from the current position
3. WHEN a user clicks the pause button THEN the Audio_Player SHALL pause audio playback and retain the current position
4. WHEN a user drags the seek bar THEN the Audio_Player SHALL update the playback position to the selected time
5. WHEN audio playback is active THEN the Audio_Player SHALL display the current playback time and total duration

### Requirement 2

**User Story:** As a user, I want to see the lyrics while the song plays, so that I can follow along and learn the content.

#### Acceptance Criteria

1. WHEN the Song_Playback_System loads a song THEN the Lyrics_Display SHALL show the complete lyrics text
2. WHEN audio playback progresses THEN the Lyrics_Display SHALL scroll to highlight the current section being played
3. WHEN a user manually scrolls the Lyrics_Display THEN the Lyrics_Display SHALL temporarily disable auto-scroll for 5 seconds

### Requirement 3

**User Story:** As a user, I want to download my generated song, so that I can save it for offline listening.

#### Acceptance Criteria

1. WHEN a user clicks the download button THEN the Song_Playback_System SHALL initiate a download of the audio file
2. WHEN the download completes THEN the Song_Playback_System SHALL save the file with a descriptive filename including the song style

### Requirement 4

**User Story:** As a user, I want to regenerate my song, so that I can get a different musical interpretation of my content.

#### Acceptance Criteria

1. WHEN a user clicks the regenerate button THEN the Song_Playback_System SHALL display a confirmation dialog warning about rate limit usage
2. WHEN a user confirms regeneration AND songs_remaining is greater than zero THEN the Song_Playback_System SHALL navigate to Page B with the current lyrics pre-filled
3. WHEN a user confirms regeneration AND songs_remaining equals zero THEN the Song_Playback_System SHALL display a rate limit exceeded message with reset time
4. IF the regeneration request fails THEN the Song_Playback_System SHALL display an error message and retain the current song

### Requirement 5

**User Story:** As a user, I want to share my generated song with others, so that they can also enjoy the learning content.

#### Acceptance Criteria

1. WHEN a user clicks the share button THEN the Song_Playback_System SHALL generate a shareable link valid for 48 hours
2. WHEN the share link is generated THEN the Song_Playback_System SHALL copy the link to clipboard and display a success notification
3. WHEN a user accesses a shared link THEN the Song_Playback_System SHALL load the song playback page with full functionality
4. WHEN a user accesses an expired share link THEN the Song_Playback_System SHALL display an expiration message with a suggestion to create a new song

### Requirement 6

**User Story:** As a user, I want to see song metadata, so that I know the song details and when it will expire.

#### Acceptance Criteria

1. WHEN the Song_Playback_System loads a song THEN the Song_Playback_System SHALL display the song style, generation date, and expiration time
2. WHEN the song expiration time is within 6 hours THEN the Song_Playback_System SHALL display a warning indicator about upcoming expiration
3. WHEN the song has expired THEN the Song_Playback_System SHALL display an expiration notice and disable playback controls

### Requirement 7

**User Story:** As a user, I want to see my remaining song generation quota, so that I can plan my usage.

#### Acceptance Criteria

1. WHEN the Song_Playback_System loads THEN the Song_Playback_System SHALL display the current rate limit status (X/3 songs remaining)
2. WHEN the rate limit resets THEN the Song_Playback_System SHALL update the displayed count automatically

### Requirement 8

**User Story:** As a developer, I want the backend to provide song data reliably, so that the frontend can display songs correctly.

#### Acceptance Criteria

1. WHEN the backend receives a GET request for /api/songs/{song_id} THEN the backend SHALL return song details including song_url, lyrics, style, created_at, and expires_at
2. WHEN the requested song_id does not exist THEN the backend SHALL return a 404 status with an appropriate error message
3. WHEN the requested song has expired THEN the backend SHALL return a 410 status indicating the resource is no longer available
4. WHEN serializing song data THEN the backend SHALL encode the response as JSON with all required fields

### Requirement 9

**User Story:** As a developer, I want proper error handling, so that users receive helpful feedback when issues occur.

#### Acceptance Criteria

1. IF the audio URL fails to load THEN the Song_Playback_System SHALL display an error message suggesting the user try again
2. IF the network connection is lost during playback THEN the Song_Playback_System SHALL pause playback and display an offline indicator
3. IF the backend returns an error THEN the Song_Playback_System SHALL display a user-friendly error message without exposing technical details
