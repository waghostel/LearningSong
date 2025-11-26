# Requirements Document

## Introduction

This specification defines the debugging workflow for Page B (Lyrics Editing Page) using Chrome DevTools MCP (Model Context Protocol). The goal is to systematically verify the functionality of the lyrics editing page, including UI components, state management, WebSocket connections, and API interactions.

## Glossary

- **Page B**: The Lyrics Editing Page where users review AI-generated lyrics, edit them, select a music style, and generate songs
- **Chrome DevTools MCP**: Model Context Protocol server that provides programmatic access to Chrome DevTools for debugging
- **Zustand Store**: Client-side state management for lyrics editing state
- **WebSocket**: Real-time communication channel for song generation progress updates
- **Socket.IO**: WebSocket library used for client-server real-time communication

## Requirements

### Requirement 1: Page Load Verification

**User Story:** As a developer, I want to verify that Page B loads correctly with all components initialized, so that I can ensure the page is functional.

#### Acceptance Criteria

1. WHEN the developer navigates to the lyrics editing page THEN the Chrome DevTools MCP SHALL capture the page state and report any console errors
2. WHEN the page loads THEN the Chrome DevTools MCP SHALL verify that the Zustand store is initialized with correct default values
3. WHEN the page loads without navigation state THEN the Chrome DevTools MCP SHALL verify the redirect behavior to Page A

### Requirement 2: Component State Debugging

**User Story:** As a developer, I want to inspect and debug individual UI components, so that I can identify issues with component behavior.

#### Acceptance Criteria

1. WHEN debugging the LyricsEditor component THEN the Chrome DevTools MCP SHALL evaluate the character counter state and visual feedback states
2. WHEN debugging the StyleSelector component THEN the Chrome DevTools MCP SHALL verify the dropdown options and selected value
3. WHEN debugging the GenerateSongButton component THEN the Chrome DevTools MCP SHALL verify disabled states and loading indicators
4. WHEN debugging the ProgressTracker component THEN the Chrome DevTools MCP SHALL verify progress bar updates and status messages

### Requirement 3: WebSocket Connection Debugging

**User Story:** As a developer, I want to debug WebSocket connections, so that I can ensure real-time updates work correctly.

#### Acceptance Criteria

1. WHEN the WebSocket connects THEN the Chrome DevTools MCP SHALL capture the connection event and authentication status
2. WHEN the WebSocket receives messages THEN the Chrome DevTools MCP SHALL log the message payload and update events
3. WHEN the WebSocket disconnects THEN the Chrome DevTools MCP SHALL verify the auto-reconnect behavior
4. IF the WebSocket connection fails THEN the Chrome DevTools MCP SHALL capture the error details and retry attempts

### Requirement 4: API Request Debugging

**User Story:** As a developer, I want to monitor API requests and responses, so that I can debug backend integration issues.

#### Acceptance Criteria

1. WHEN the song generation API is called THEN the Chrome DevTools MCP SHALL capture the request payload and response
2. WHEN the song status API is polled THEN the Chrome DevTools MCP SHALL log the polling interval and response data
3. IF an API request fails THEN the Chrome DevTools MCP SHALL capture the error response and status code

### Requirement 5: Error Scenario Debugging

**User Story:** As a developer, I want to simulate and debug error scenarios, so that I can verify error handling works correctly.

#### Acceptance Criteria

1. WHEN simulating a network error THEN the Chrome DevTools MCP SHALL verify the offline indicator appears
2. WHEN simulating a rate limit error THEN the Chrome DevTools MCP SHALL verify the rate limit message displays
3. WHEN simulating invalid lyrics THEN the Chrome DevTools MCP SHALL verify the validation error message appears
4. WHEN simulating a Suno API timeout THEN the Chrome DevTools MCP SHALL verify the timeout error handling

