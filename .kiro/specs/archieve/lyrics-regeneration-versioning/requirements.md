# Requirements Document

## Introduction

This feature enables users to regenerate lyrics from the same educational content multiple times and switch between different generated versions. Users can explore creative variations of their learning material and select the version that best suits their needs before generating the final song.

## Glossary

- **Lyrics Editor**: The page where users review and modify AI-generated lyrics before song creation
- **Regeneration**: The process of using the AI pipeline to create new lyrics from the same original content
- **Lyrics Version**: A distinct set of lyrics generated from the same source content
- **Version History**: The collection of all lyrics versions generated from a single content input
- **Active Version**: The currently displayed lyrics version in the editor
- **Original Content**: The educational text input provided by the user on the Text Input page

## Requirements

### Requirement 1

**User Story:** As a user, I want to regenerate lyrics from my original content, so that I can explore different creative interpretations of my learning material.

#### Acceptance Criteria

1. WHEN a user clicks the regenerate button on the Lyrics Editor THEN the System SHALL invoke the AI pipeline with the original content and create a new lyrics version
2. WHEN regeneration is in progress THEN the System SHALL display a loading indicator and disable the lyrics textarea
3. WHEN regeneration completes successfully THEN the System SHALL add the new version to the version history and display it as the active version
4. WHEN regeneration fails THEN the System SHALL display an error message and maintain the current active version
5. WHEN a user has unsaved manual edits and clicks regenerate THEN the System SHALL prompt for confirmation before proceeding

### Requirement 2

**User Story:** As a user, I want to view and switch between different lyrics versions I've generated, so that I can compare variations and choose the best one for my song.

#### Acceptance Criteria

1. WHEN multiple lyrics versions exist for the same content THEN the System SHALL display a version selector UI component
2. WHEN a user selects a different version from the selector THEN the System SHALL load and display that version in the lyrics textarea
3. WHEN switching between versions THEN the System SHALL preserve all versions in the version history
4. WHEN a user switches to a previous version THEN the System SHALL update the active version indicator
5. WHERE the user has only one lyrics version THEN the System SHALL hide the version selector UI

### Requirement 3

**User Story:** As a user, I want to see which lyrics version I'm currently viewing, so that I can keep track of my exploration process.

#### Acceptance Criteria

1. WHEN viewing the Lyrics Editor with multiple versions THEN the System SHALL display the version number and timestamp for the active version
2. WHEN a new version is generated THEN the System SHALL assign it a sequential version number
3. WHEN displaying version information THEN the System SHALL show the creation timestamp in a human-readable format
4. WHEN the version selector is open THEN the System SHALL highlight the currently active version

### Requirement 4

**User Story:** As a user, I want my lyrics versions to persist during my session, so that I don't lose my generated variations when navigating between pages.

#### Acceptance Criteria

1. WHEN a user navigates away from the Lyrics Editor THEN the System SHALL store all lyrics versions in the session state
2. WHEN a user returns to the Lyrics Editor for the same content THEN the System SHALL restore all previously generated versions
3. WHEN a user generates a song from a selected version THEN the System SHALL use that specific version for song creation
4. WHEN the session expires or user starts with new content THEN the System SHALL clear the previous version history

### Requirement 5

**User Story:** As a user, I want to manually edit any lyrics version, so that I can refine the AI-generated content before creating my song.

#### Acceptance Criteria

1. WHEN a user modifies the lyrics textarea THEN the System SHALL mark the active version as edited
2. WHEN a version is marked as edited THEN the System SHALL display an indicator showing manual modifications exist
3. WHEN a user switches away from an edited version THEN the System SHALL save the modifications to that version
4. WHEN a user switches back to an edited version THEN the System SHALL display the modified content
5. WHEN generating a song THEN the System SHALL use the current state of the active version including any manual edits

### Requirement 6

**User Story:** As a user, I want to delete unwanted lyrics versions, so that I can focus on the variations I prefer.

#### Acceptance Criteria

1. WHEN a user clicks delete on a version in the selector THEN the System SHALL remove that version from the version history
2. WHEN deleting a non-active version THEN the System SHALL maintain the current active version
3. WHEN deleting the active version THEN the System SHALL switch to the most recent remaining version
4. WHEN only one version remains THEN the System SHALL disable the delete action for that version
5. IF a user attempts to delete the last version THEN the System SHALL prevent the deletion and display an informative message

### Requirement 7

**User Story:** As a developer, I want the regeneration feature to respect rate limits, so that system resources are protected and costs are controlled.

#### Acceptance Criteria

1. WHEN a user regenerates lyrics THEN the System SHALL check the daily regeneration limit before processing
2. WHEN the regeneration limit is reached THEN the System SHALL display an error message and disable the regenerate button
3. WHEN tracking regenerations THEN the System SHALL count each regeneration separately from song generation limits
4. WHEN a new day begins THEN the System SHALL reset the regeneration counter for that user
5. WHERE the user is anonymous THEN the System SHALL enforce a limit of 10 regenerations per day

### Requirement 8

**User Story:** As a user, I want the version selector UI to be intuitive and accessible, so that I can easily navigate between my lyrics variations.

#### Acceptance Criteria

1. WHEN the version selector is displayed THEN the System SHALL show version numbers in chronological order
2. WHEN hovering over a version in the selector THEN the System SHALL display a preview or timestamp tooltip
3. WHEN using keyboard navigation THEN the System SHALL allow arrow keys to navigate between versions
4. WHEN the version selector is focused THEN the System SHALL provide clear visual feedback
5. WHEN screen readers are used THEN the System SHALL announce version changes and current version information
