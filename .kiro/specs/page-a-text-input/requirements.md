# Page A: Text Input Page - Requirements

## Overview
The home page where users input educational content and generate lyrics through an AI pipeline. This is the entry point of the LearningSong application.

## User Stories

### US-1: Input Educational Content
**As a** user  
**I want to** paste or type educational content into a text area  
**So that** I can convert it into song lyrics

**Acceptance Criteria:**
- Text input area supports up to 10,000 words
- Real-time character counter displays current word count
- Visual warning when approaching or exceeding limit
- Input area is responsive and accessible

### US-2: Enable Google Search Grounding
**As a** user  
**I want to** toggle Google Search grounding on/off  
**So that** I can enrich short content with additional context

**Acceptance Criteria:**
- Toggle button is clearly labeled and visible
- Default state is OFF
- Toggle state persists during the session
- Tooltip explains what search grounding does

### US-3: View Rate Limit Status
**As a** user  
**I want to** see how many songs I can generate today  
**So that** I know my remaining quota

**Acceptance Criteria:**
- Display shows "X/3 songs remaining today"
- Updates in real-time after each generation
- Shows countdown timer to reset when limit reached
- Clear visual indicator when approaching limit

### US-4: Generate Lyrics
**As a** user  
**I want to** click a button to generate lyrics from my content  
**So that** I can proceed to create a song

**Acceptance Criteria:**
- "Generate Lyrics" button is prominent and accessible
- Button is disabled when input is empty or exceeds limit
- Button is disabled when rate limit is reached
- Shows loading state during generation

### US-5: Track Generation Progress
**As a** user  
**I want to** see the progress of lyrics generation  
**So that** I understand what's happening and how long it will take

**Acceptance Criteria:**
- Loading indicator appears immediately on submit
- Progress shows current pipeline stage (cleaning, summarizing, converting)
- Estimated time remaining is displayed
- User can cancel the operation

### US-6: Handle Errors Gracefully
**As a** user  
**I want to** receive clear error messages when something goes wrong  
**So that** I know what to do next

**Acceptance Criteria:**
- Network errors show retry option
- Rate limit errors show reset time
- Invalid content errors explain the issue
- All errors use non-technical language

## Functional Requirements

### FR-1: Text Input Validation
- Minimum: No minimum (allow short queries with search grounding)
- Maximum: 10,000 words
- Character encoding: UTF-8
- Sanitize input to prevent XSS

### FR-2: Rate Limiting
- 3 songs per anonymous user per day
- Rate limit resets at midnight UTC
- Track by Firebase anonymous user ID
- Persist across page refreshes

### FR-3: AI Pipeline Integration
- Call backend API endpoint: `POST /api/lyrics/generate`
- Send content and search_enabled flag
- Receive lyrics and content_hash
- Handle pipeline stages: clean → summarize → validate → convert

### FR-4: Google Search Grounding
- Optional feature controlled by toggle
- Only triggered when enabled by user
- Enriches content before processing
- Adds ~5-10 seconds to processing time

### FR-5: Session Management
- Use Firebase anonymous authentication
- Persist user ID in localStorage
- Track rate limit per user ID
- Auto-create anonymous user on first visit

## Non-Functional Requirements

### NFR-1: Performance
- Page load time < 2 seconds
- API response time < 30 seconds for lyrics generation
- UI remains responsive during processing

### NFR-2: Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support

### NFR-3: Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### NFR-4: Mobile Responsiveness
- Fully functional on mobile devices
- Touch-friendly controls
- Responsive layout for all screen sizes

## Out of Scope (MVP)
- User registration/login (only anonymous)
- File upload (PDF, DOCX)
- Multi-language support
- Content history/saved drafts
- Collaborative editing
