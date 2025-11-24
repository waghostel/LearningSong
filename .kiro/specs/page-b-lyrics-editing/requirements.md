# Page B: Lyrics Editing Page - Requirements

## Overview
The lyrics editing page where users review AI-generated lyrics, make modifications, select a music style, and generate their learning song. This is the second step in the LearningSong workflow.

## User Stories

### US-1: View Generated Lyrics
**As a** user  
**I want to** see the AI-generated lyrics in a clear, readable format  
**So that** I can review them before creating a song

**Acceptance Criteria:**
- Lyrics are displayed in a read-only preview area
- Lyrics maintain verse/chorus structure with clear formatting
- Preview area is scrollable for long lyrics
- Font size and spacing are optimized for readability

### US-2: Edit Lyrics
**As a** user  
**I want to** modify the generated lyrics  
**So that** I can personalize them or fix any issues

**Acceptance Criteria:**
- Editable text area pre-filled with generated lyrics
- Changes are reflected in real-time
- Character counter shows current length vs Suno limits
- Warning appears when approaching character limit
- Undo/redo functionality available (Ctrl+Z, Ctrl+Y)

### US-3: Select Music Style
**As a** user  
**I want to** choose from preset music styles  
**So that** the song matches my learning content and preferences

**Acceptance Criteria:**
- Dropdown/select menu with 8 preset styles:
  1. Pop (upbeat, catchy)
  2. Rap/Hip-Hop (rhythmic, fast-paced)
  3. Folk/Acoustic (gentle, storytelling)
  4. Electronic/EDM (energetic, modern)
  5. Rock (powerful, memorable)
  6. Jazz (smooth, sophisticated)
  7. Children's Song (simple, fun)
  8. Classical/Orchestral (elegant, dramatic)
- Each style has a brief description
- Default style is "Pop"
- Style selection is clearly visible

### US-4: Generate Song
**As a** user  
**I want to** click a button to generate a song from my lyrics  
**So that** I can create a playable learning song

**Acceptance Criteria:**
- "Generate Song" button is prominent and accessible
- Button is disabled when lyrics exceed Suno limits
- Button is disabled when rate limit is reached
- Shows loading state during generation
- Displays estimated generation time (30-60 seconds)

### US-5: Track Song Generation Progress
**As a** user  
**I want to** see real-time updates on song generation progress  
**So that** I know the system is working and how long to wait

**Acceptance Criteria:**
- WebSocket connection established on song generation
- Progress indicator shows status: queued → processing → completed
- Progress percentage displayed (0-100%)
- Browser notification sent when song is ready
- User can navigate away and return later

### US-6: Navigate Back to Edit Content
**As a** user  
**I want to** go back to the text input page  
**So that** I can change my original content if needed

**Acceptance Criteria:**
- "Back" or "Edit Content" button visible
- Warns user if they have unsaved lyrics changes
- Preserves original content when navigating back

### US-7: Handle Errors Gracefully
**As a** user  
**I want to** receive clear error messages when something goes wrong  
**So that** I know what to do next

**Acceptance Criteria:**
- Suno API timeout shows retry option
- Rate limit errors show reset time
- Invalid lyrics errors explain the issue
- Network errors show retry option
- All errors use non-technical language

## Functional Requirements

### FR-1: Lyrics Validation
- Minimum: 50 characters (to ensure meaningful content)
- Maximum: Suno API character limit (~3000 characters)
- Character encoding: UTF-8
- Preserve line breaks and basic formatting

### FR-2: Style Selection
- 8 preset styles with predefined Suno API parameters
- Each style has:
  - Display name
  - Description
  - Suno API style tag
- Style selection persists during session

### FR-3: Song Generation API Integration
- Call backend API endpoint: `POST /api/songs/generate`
- Send lyrics, style, and content_hash
- Receive task_id and estimated_time
- Establish WebSocket connection for status updates
- Handle long-running task (30-90 seconds)

### FR-4: WebSocket Real-time Updates
- Connect to WebSocket endpoint: `ws://api/songs/status`
- Subscribe to task updates using task_id
- Receive status updates: queued → processing → completed/failed
- Update UI in real-time
- Auto-reconnect on disconnection

### FR-5: Browser Notifications
- Request notification permission on page load
- Send notification when song generation completes
- Notification includes song title and action button
- Works even when tab is not active

### FR-6: Rate Limiting
- Check rate limit before allowing song generation
- Display remaining songs (X/3)
- Prevent generation when limit reached
- Show countdown to reset time

### FR-7: Navigation and State Management
- Receive lyrics data from Page A via navigation state
- Store lyrics and style in Zustand store
- Preserve state during WebSocket updates
- Navigate to Page C (playback) on completion

## Non-Functional Requirements

### NFR-1: Performance
- Page load time < 2 seconds
- Lyrics editing is responsive (no lag)
- WebSocket reconnection < 3 seconds
- Song generation timeout: 90 seconds

### NFR-2: Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Focus indicators on all interactive elements

### NFR-3: Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- WebSocket support required

### NFR-4: Mobile Responsiveness
- Fully functional on mobile devices
- Touch-friendly controls
- Responsive layout for all screen sizes
- Virtual keyboard doesn't obscure content

### NFR-5: Reliability
- WebSocket auto-reconnect with exponential backoff
- Handle network interruptions gracefully
- Persist task_id to allow recovery after page refresh
- Retry failed Suno API calls (3 attempts)

## Out of Scope (MVP)
- Lyrics auto-formatting (rhyme suggestions, structure)
- Multiple song versions from same lyrics
- Lyrics history/saved drafts
- Collaborative editing
- Custom style creation
- Audio preview before full generation
- Lyrics translation

## Data Flow

### Input
- Generated lyrics from Page A (via navigation state)
- Content hash from Page A (for caching)
- User ID from Firebase auth

### Output
- Song task ID (to track generation)
- Navigation to Page C with song data

### State Transitions
1. **Initial**: Display generated lyrics, allow editing
2. **Editing**: User modifies lyrics, selects style
3. **Generating**: WebSocket connected, showing progress
4. **Completed**: Navigate to playback page
5. **Failed**: Show error, allow retry

## API Dependencies

### Backend Endpoints
- `POST /api/songs/generate` - Initiate song generation
- `GET /api/user/rate-limit` - Check remaining songs
- `WS /ws/songs/status` - Real-time status updates

### External Services
- Suno API - Music generation
- Firebase - Authentication and storage
- Browser Notification API - User notifications

## Security Considerations

### Input Validation
- Sanitize lyrics to prevent XSS
- Validate lyrics length on both frontend and backend
- Validate style selection against allowed values

### Authentication
- Verify Firebase token on all API calls
- WebSocket connection requires authentication
- Rate limit per authenticated user

### Data Privacy
- Lyrics stored temporarily (48 hours)
- No PII collected or stored
- Anonymous user data only

## Error Scenarios

### Suno API Errors
1. **Timeout (>90s)**: Show notification option, continue monitoring
2. **API Error (500, 503)**: Retry 3 times, then show error
3. **Rate Limit (429)**: Show countdown timer
4. **Invalid Lyrics (400)**: Highlight issues, suggest fixes

### Network Errors
1. **WebSocket Disconnection**: Auto-reconnect, show indicator
2. **API Unreachable**: Show offline message, queue retry
3. **Timeout**: Show timeout message, offer manual retry

### User Errors
1. **Lyrics Too Long**: Disable button, show character count
2. **Empty Lyrics**: Disable button, show message
3. **Rate Limit Reached**: Disable button, show reset time

## Success Metrics

### User Experience
- Time from lyrics edit to song generation < 60 seconds
- Error rate < 5%
- WebSocket connection success rate > 95%
- User completes flow (Page A → B → C) > 70%

### Technical Performance
- API response time < 500ms
- WebSocket latency < 100ms
- Page load time < 2 seconds
- Cache hit rate > 20%
