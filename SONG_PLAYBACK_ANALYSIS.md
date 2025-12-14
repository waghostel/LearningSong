# Song Playback Page Architecture Analysis

## Overview

There is **only ONE Song Playback page** in the system: `SongPlaybackPage.tsx`. However, it's a sophisticated, feature-rich component that supports multiple display modes and advanced functionality. This document explains how it works.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SongPlaybackPage.tsx                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ State Management (Zustand)                               │  │
│  │ - useSongPlaybackStore: Song data, playback state        │  │
│  │ - useSongSwitcher: Variation switching logic             │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ UI Components                                            │  │
│  │ ┌─────────────────────────────────────────────────────┐  │  │
│  │ │ AudioPlayer                                         │  │  │
│  │ │ - Play/pause controls                              │  │  │
│  │ │ - Seek bar with progress                           │  │  │
│  │ │ - Download button                                  │  │  │
│  │ │ - Time display (MM:SS / MM:SS)                     │  │  │
│  │ └─────────────────────────────────────────────────────┘  │  │
│  │ ┌─────────────────────────────────────────────────────┐  │  │
│  │ │ SongSwitcher (if variations.length >= 2)           │  │  │
│  │ │ - Toggle between Version 1 and Version 2           │  │  │
│  │ │ - Keyboard accessible (arrow keys)                 │  │  │
│  │ │ - Loading indicator during switch                  │  │  │
│  │ └─────────────────────────────────────────────────────┘  │  │
│  │ ┌─────────────────────────────────────────────────────┐  │  │
│  │ │ Lyrics Display (Dual Mode)                          │  │  │
│  │ │ ┌──────────────────────────────────────────────┐    │  │  │
│  │ │ │ Word-Level Sync (default)                   │    │  │  │
│  │ │ │ - LyricsDisplay component                   │    │  │  │
│  │ │ │ - Highlights current word during playback   │    │  │  │
│  │ │ │ - Auto-scrolls to keep current word visible │    │  │  │
│  │ │ │ - Shows section markers (optional)          │    │  │  │
│  │ │ └──────────────────────────────────────────────┘    │  │  │
│  │ │ ┌──────────────────────────────────────────────┐    │  │  │
│  │ │ │ Line-Level Sync (when toggled)              │    │  │  │
│  │ │ │ - LineLyricsDisplay component               │    │  │  │
│  │ │ │ - Highlights current line during playback   │    │  │  │
│  │ │ │ - Clickable lines for seeking               │    │  │  │
│  │ │ │ - Auto-scrolls to keep current line visible │    │  │  │
│  │ │ └──────────────────────────────────────────────┘    │  │  │
│  │ └─────────────────────────────────────────────────────┘  │  │
│  │ ┌─────────────────────────────────────────────────────┐  │  │
│  │ │ Controls & Toggles                                  │  │  │
│  │ │ - OffsetControl: Adjust lyrics timing               │  │  │
│  │ │ - MarkerVisibilityToggle: Show/hide section markers │  │  │
│  │ │ - SyncModeToggle: Switch word/line sync             │  │  │
│  │ │ - VttDownloadButton: Export as VTT captions         │  │  │
│  │ │ - ShareButton: Generate share link                  │  │  │
│  │ │ - RegenerateButton: Create new version              │  │  │
│  │ └─────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components & Their Roles

### 1. **SongPlaybackPage (Main Container)**

**File:** `frontend/src/pages/SongPlaybackPage.tsx`

**Responsibilities:**
- Orchestrates all child components
- Manages URL parameters (`songId`, `shareToken`)
- Handles authentication and authorization
- Coordinates state between multiple stores
- Manages UI layout and navigation

**Key State:**
```typescript
// From useSongPlaybackStore
- songId, songUrl, lyrics, style
- createdAt, expiresAt, isOwner
- songVariations[], primaryVariationIndex
- alignedWords[], currentTime, duration
- error, isLoading

// Local state
- offset: number (lyrics timing adjustment)
- showMarkers: boolean (section marker visibility)
- syncMode: 'word' | 'line' (lyrics sync granularity)
- showRegenerateConfirm: boolean
- audioError: Error | null
```

**Key Effects:**
1. **Load song on mount** - Fetches song data via `loadSong()` or `loadSharedSong()`
2. **Load offset from localStorage** - Restores user's previous timing adjustment
3. **Generate line cues** - Aggregates word-level timestamps into line-level cues

---

### 2. **AudioPlayer Component**

**File:** `frontend/src/components/AudioPlayer.tsx`

**Responsibilities:**
- Renders HTML5 audio element
- Provides play/pause controls
- Displays seek bar with progress
- Shows current time and duration
- Handles audio errors gracefully
- Logs playback analytics events

**Key Features:**
- **Play/Pause Toggle:** Calls `audioRef.current.play()` or `.pause()`
- **Seek Bar:** Updates `audioRef.current.currentTime` on user input
- **Time Display:** Shows `MM:SS / MM:SS` format
- **Download Button:** Fetches audio blob and triggers browser download
- **Error Handling:** Catches playback errors and displays user-friendly messages
- **Analytics:** Logs play, pause, and end events via `logPlaybackStart()`, `logPlaybackPause()`, `logPlaybackEnd()`

**Props:**
```typescript
songUrl: string              // Audio file URL
songStyle?: string           // Music style (for analytics)
songId?: string              // Song ID (for analytics)
variationIndex?: number      // Current variation index
onTimeUpdate?: (time, duration) => void
onEnded?: () => void
onError?: (error) => void
disabled?: boolean           // Disable when song expired
```

---

### 3. **SongSwitcher Component**

**File:** `frontend/src/components/SongSwitcher.tsx`

**Responsibilities:**
- Displays toggle buttons for song variations
- Handles variation switching logic
- Shows loading state during switch
- Provides keyboard navigation (arrow keys)
- Accessible with ARIA labels and focus indicators

**Key Features:**
- **Conditional Rendering:** Only shows if `variations.length >= 2`
- **Toggle Group:** Uses shadcn/ui `ToggleGroup` for segmented control
- **Keyboard Navigation:**
  - Arrow Left/Up: Previous variation
  - Arrow Right/Down: Next variation
  - Home: First variation
  - End: Last variation
- **Accessibility:**
  - ARIA labels: `aria-label="Version X (currently playing)"`
  - Current state: `aria-current="true"`
  - Touch targets: Min 44x44px for mobile
  - Focus indicators: 2px ring with offset

**Props:**
```typescript
variations: SongVariation[]
activeIndex: number
onSwitch: (index: number) => void
isLoading?: boolean
disabled?: boolean
```

---

### 4. **Lyrics Display (Dual Mode)**

#### **4a. LyricsDisplay (Word-Level Sync)**

**File:** `frontend/src/components/LyricsDisplay.tsx`

**Responsibilities:**
- Renders lyrics with word-level highlighting
- Synchronizes highlighting with audio playback
- Auto-scrolls to keep current word visible
- Supports section markers with distinct styling
- Handles manual scroll detection (disables auto-scroll for 5 seconds)

**Key Features:**
- **Word-Level Highlighting:** Uses `useLyricsSync()` hook to find current word index
- **Offset Support:** Adjusts timing by `offset / 1000` seconds
- **Section Markers:** Hides markers if `showMarkers === false`
- **Auto-Scroll:** Smooth scroll to center current word in viewport
- **Manual Scroll Detection:** Disables auto-scroll when user scrolls manually
- **Fallback Mode:** If no timestamps available, renders section-based display

**Props:**
```typescript
lyrics: string
currentTime: number
duration: number
alignedWords?: AlignedWord[]  // Word-level timestamps
offset?: number               // Timing adjustment in ms
showMarkers?: boolean         // Show section markers
onManualScroll?: () => void
```

**Data Structure (AlignedWord):**
```typescript
interface AlignedWord {
  word: string
  start_time: number  // Seconds
  end_time: number    // Seconds
}
```

#### **4b. LineLyricsDisplay (Line-Level Sync)**

**File:** `frontend/src/components/LineLyricsDisplay.tsx`

**Responsibilities:**
- Renders lyrics with line-level highlighting
- Allows clicking on lines to seek
- Auto-scrolls to keep current line visible
- Supports section markers with distinct styling
- Keyboard accessible (Enter/Space to seek)

**Key Features:**
- **Line-Level Highlighting:** Finds current line based on `startTime <= currentTime < endTime`
- **Clickable Lines:** `onClick` triggers `onLineClick(startTime)` to seek
- **Keyboard Navigation:** Enter/Space on focused line triggers seek
- **Auto-Scroll:** Smooth scroll to center current line in viewport
- **Offset Support:** Adjusts timing by `offset / 1000` seconds
- **Section Markers:** Hides markers if `showMarkers === false`

**Props:**
```typescript
lineCues: LineCue[]
currentTime: number
onLineClick: (startTime: number) => void
showMarkers?: boolean
offset?: number
```

**Data Structure (LineCue):**
```typescript
interface LineCue {
  lineIndex: number
  startTime: number   // Seconds
  endTime: number     // Seconds
  text: string
  isMarker: boolean
}
```

---

### 5. **useSongSwitcher Hook**

**File:** `frontend/src/hooks/useSongSwitcher.ts`

**Responsibilities:**
- Manages variation switching state and logic
- Fetches timestamped lyrics for new variation
- Updates primary variation on backend
- Handles errors and request cancellation
- Logs analytics events

**Key Flow:**
```
1. User clicks variation button
   ↓
2. switchVariation(index) called
   ↓
3. Cancel any pending requests (AbortController)
   ↓
4. Set loading state
   ↓
5. Fetch timestamped lyrics for new variation
   ├─ Success: Update store with new lyrics
   └─ Failure: Clear lyrics, continue anyway
   ↓
6. Update primary variation on backend
   ├─ Success: Persist user's choice
   └─ Failure: Log warning, continue anyway
   ↓
7. Update local state (activeIndex)
   ↓
8. Call onSwitch callback
   ↓
9. Log analytics event
```

**Error Recovery:**
- If switch fails, reverts to previous variation
- Clears partially loaded timestamped lyrics
- Calls `onError` callback with user-friendly message

**Request Cancellation:**
- Uses `AbortController` to cancel in-flight requests
- Prevents race conditions when user rapidly switches variations

---

### 6. **useSongPlaybackStore (Zustand Store)**

**File:** `frontend/src/stores/songPlaybackStore.ts`

**Responsibilities:**
- Centralized state management for song playback
- Persists song data to sessionStorage
- Provides actions for loading and updating song state

**State Structure:**
```typescript
interface SongPlaybackState {
  // Song data
  songId: string | null
  songUrl: string | null
  lyrics: string
  style: MusicStyle | null
  createdAt: Date | null
  expiresAt: Date | null
  isOwner: boolean

  // Dual song variations
  songVariations: SongVariation[]
  primaryVariationIndex: number

  // Timestamped lyrics
  alignedWords: AlignedWord[]
  hasTimestamps: boolean
  waveformData: number[]

  // Playback state
  isPlaying: boolean
  currentTime: number
  duration: number
  isLoading: boolean
  error: string | null

  // Share state
  shareUrl: string | null
  isSharing: boolean
}
```

**Key Actions:**
- `loadSong(songId)` - Fetch song details from API
- `loadSharedSong(shareToken)` - Fetch shared song (no auth required)
- `setCurrentTime(time)` - Update playback position
- `setDuration(duration)` - Update total duration
- `setSongVariations(variations)` - Update available variations
- `setPrimaryVariationIndex(index)` - Update active variation
- `setTimestampedLyrics(alignedWords, waveformData)` - Update word-level timestamps
- `createShareLink()` - Generate shareable URL
- `reset()` - Clear all state

**Persistence:**
- Uses `sessionStorage` (not `localStorage`)
- Only persists song data, not playback state
- Clears on browser tab close

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ User navigates to /playback/:songId                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SongPlaybackPage mounts                                         │
│ - Calls loadSong(songId) or loadSharedSong(shareToken)         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ API: GET /api/songs/{songId}                                   │
│ Returns: SongDetails {                                          │
│   song_id, song_url, lyrics, style,                            │
│   variations[], primary_variation_index,                        │
│   aligned_words[], has_timestamps, waveform_data               │
│ }                                                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ useSongPlaybackStore updates state                              │
│ - songId, songUrl, lyrics, style                               │
│ - songVariations[], primaryVariationIndex                       │
│ - alignedWords[], hasTimestamps, waveformData                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ SongPlaybackPage renders UI                                     │
│ - AudioPlayer with currentVariationUrl                          │
│ - SongSwitcher (if variations.length >= 2)                     │
│ - LyricsDisplay or LineLyricsDisplay (based on syncMode)       │
│ - Controls: OffsetControl, MarkerVisibilityToggle, etc.        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ User interacts with UI                                          │
│                                                                 │
│ Scenario 1: Play/Pause                                          │
│ - AudioPlayer.togglePlayPause() → audioRef.play()/pause()      │
│ - onTimeUpdate callback updates currentTime in store            │
│                                                                 │
│ Scenario 2: Switch Variation                                    │
│ - SongSwitcher.onSwitch(index) → useSongSwitcher.switchVariation()
│ - Fetch timestamped lyrics for new variation                   │
│ - Update primaryVariationIndex in store                         │
│ - AudioPlayer re-renders with new songUrl                      │
│                                                                 │
│ Scenario 3: Adjust Offset                                       │
│ - OffsetControl.onChange(newOffset)                            │
│ - Save to localStorage via saveOffset()                         │
│ - LyricsDisplay re-renders with adjusted timing                │
│                                                                 │
│ Scenario 4: Toggle Sync Mode                                    │
│ - SyncModeToggle.onChange(newMode)                             │
│ - Save to localStorage via saveSyncMode()                       │
│ - SongPlaybackPage conditionally renders LyricsDisplay or      │
│   LineLyricsDisplay based on syncMode                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features Explained

### **1. Dual Song Variations**

**What:** Users can listen to up to 2 different versions of the same song.

**How:**
- Backend generates multiple variations during song creation
- `SongDetails.variations[]` contains `SongVariation` objects with `audio_url` and `variation_index`
- `SongSwitcher` displays toggle buttons for each variation
- Clicking a button calls `useSongSwitcher.switchVariation(index)`
- Hook fetches timestamped lyrics for new variation and updates backend
- `AudioPlayer` automatically plays new variation via `currentVariationUrl`

**Why:** Gives users choice in music style/quality without regenerating from scratch.

---

### **2. Word-Level vs Line-Level Sync**

**Word-Level (Default):**
- Highlights individual words as they're sung
- Requires `alignedWords[]` with precise start/end times
- More granular, better for karaoke-style experience
- Component: `LyricsDisplay`

**Line-Level (Optional):**
- Highlights entire lines as they're sung
- Requires `lineCues[]` aggregated from word-level timestamps
- Better for reading comprehension
- Clickable lines for seeking
- Component: `LineLyricsDisplay`

**Toggle:** `SyncModeToggle` switches between modes, persists to localStorage.

---

### **3. Offset Control**

**What:** Allows users to adjust lyrics timing if they're out of sync with audio.

**How:**
- `OffsetControl` slider ranges from -5000ms to +5000ms
- User adjusts slider, value saved to localStorage via `saveOffset(songId, offset)`
- `LyricsDisplay` and `LineLyricsDisplay` apply offset: `adjustedTime = currentTime + (offset / 1000)`
- Lyrics re-highlight with adjusted timing

**Why:** Accounts for audio encoding delays, user device latency, or personal preference.

---

### **4. Section Markers**

**What:** Special markers in lyrics that denote song sections (Verse, Chorus, Bridge, etc.).

**How:**
- Markers are identified by `isSectionMarker(word)` function
- `MarkerVisibilityToggle` controls visibility
- When hidden, markers are filtered out from display
- Styled differently: smaller, italic, muted color

**Why:** Helps users understand song structure without cluttering the display.

---

### **5. VTT Export**

**What:** Download lyrics as WebVTT captions file for use in video editors or players.

**How:**
- `VttDownloadButton` generates VTT content from `lineCues[]`
- Includes timestamps, lyrics text, and metadata
- Applies offset to all timestamps
- Triggers browser download with filename: `{style}_{createdAt}.vtt`

**Why:** Enables users to use generated lyrics in external tools.

---

### **6. Share Link**

**What:** Generate a shareable URL so others can listen without authentication.

**How:**
- `ShareButton` calls `createShareLink()` action
- Backend generates unique `shareToken` and stores mapping
- Returns `share_url` with token
- Shared URL uses `loadSharedSong(shareToken)` instead of `loadSong(songId)`
- Shared songs are read-only (no regenerate, no variation switching)

**Why:** Allows users to share their songs with friends without requiring login.

---

### **7. Regenerate Song**

**What:** Create a new version of the song with different lyrics or style.

**How:**
- `RegenerateButton` shows confirmation dialog
- Dialog checks rate limit: if exceeded, shows reset time
- If allowed, navigates to `/lyrics-edit` with current lyrics pre-filled
- User can edit lyrics and regenerate
- New song is created, user redirected to new playback page

**Why:** Allows iterative refinement of generated songs.

---

## Accessibility Features

1. **Keyboard Navigation:**
   - Skip links at top of page
   - Tab through all interactive elements
   - Arrow keys in SongSwitcher
   - Enter/Space on clickable lyrics lines

2. **Screen Reader Support:**
   - ARIA labels on all buttons and controls
   - `aria-live="polite"` for status updates
   - `aria-current="true"` for active state
   - `role="region"` for major sections
   - `aria-label` for icon-only buttons

3. **Focus Indicators:**
   - 2px ring with offset on focused elements
   - Visible focus states on all interactive elements
   - Focus trap in regenerate confirmation dialog

4. **Touch Targets:**
   - Minimum 44x44px for mobile buttons
   - Adequate spacing between interactive elements

5. **Color Contrast:**
   - All text meets WCAG AA standards
   - Error messages use color + icon

---

## Performance Optimizations

1. **Memoization:**
   - `useMemo` for `lineCues` generation
   - `useMemo` for `currentLineIndex` calculation
   - `useCallback` for event handlers

2. **Request Cancellation:**
   - `AbortController` in `useSongSwitcher` prevents race conditions
   - Cancels in-flight requests when user rapidly switches variations

3. **Lazy Loading:**
   - Timestamped lyrics fetched only when switching variations
   - Falls back to plain lyrics if fetch fails

4. **State Persistence:**
   - `sessionStorage` for song data (fast, cleared on tab close)
   - `localStorage` for user preferences (offset, sync mode, markers)

5. **Conditional Rendering:**
   - Components only render if data available
   - `SongSwitcher` hidden if `variations.length < 2`
   - `OffsetControl` hidden if no timestamped lyrics

---

## Error Handling

1. **Song Load Errors:**
   - Displays error message with "Go Home" and "Try Again" buttons
   - Maps API errors to user-friendly messages

2. **Audio Playback Errors:**
   - Catches audio element errors
   - Displays error alert below player
   - Disables play button

3. **Variation Switch Errors:**
   - Reverts to previous variation on failure
   - Displays error message with "Dismiss" button
   - Clears partially loaded timestamped lyrics

4. **Lyrics Fetch Errors:**
   - Falls back to plain lyrics if timestamped lyrics fetch fails
   - Logs warning but doesn't block playback

5. **Expired Songs:**
   - Checks `expiresAt` timestamp
   - Disables all interactive controls if expired
   - Shows read-only view

---

## Summary

The Song Playback page is a **single, unified component** that provides:

✅ **Audio playback** with play/pause, seek, and download  
✅ **Dual song variations** with seamless switching  
✅ **Dual lyrics sync modes** (word-level and line-level)  
✅ **Timing adjustment** via offset control  
✅ **Section markers** with visibility toggle  
✅ **VTT export** for external use  
✅ **Share links** for non-authenticated access  
✅ **Regeneration** for iterative refinement  
✅ **Full accessibility** with keyboard navigation and screen reader support  
✅ **Robust error handling** with graceful fallbacks  

All features are coordinated through a central Zustand store and orchestrated by the main page component.


---

## Frequently Asked Questions (Q&A)

### Q1: Why can I see the Dual song variation selection box after the song being converted?

**A:** The Song Switcher appears because the backend generated **multiple variations** of your song during the creation process.

**How it works:**

1. **During Song Generation:**
   - Suno API can generate multiple variations of the same song
   - Backend stores all variations in the `SongDetails.variations[]` array
   - Each variation has its own `audio_url` and `variation_index`

2. **Conditional Rendering:**
   - The `SongSwitcher` component only renders if `variations.length >= 2`
   - Code in `SongPlaybackPage.tsx`:
     ```typescript
     {songVariations.length >= 2 && (
       <div className="mt-4">
         <SongSwitcher
           variations={songVariations}
           activeIndex={activeIndex}
           onSwitch={switchVariation}
           isLoading={isSwitching}
           disabled={isExpired}
         />
       </div>
     )}
     ```

3. **Why Multiple Variations?**
   - Suno API generates variations to give users choice
   - Different variations may have slightly different arrangements, tempos, or vocal styles
   - Users can listen to both and choose their favorite
   - Reduces need to regenerate from scratch if user wants a different version

4. **What You Can Do:**
   - Click "Version 1" or "Version 2" to switch between variations
   - The audio player will load the new variation's audio URL
   - Timestamped lyrics will be fetched for the new variation
   - Your playback position is preserved (you stay at the same time in the song)
   - Your choice is saved to the backend as the "primary variation"

**If you only see one version:**
- The backend only generated one variation
- The Song Switcher will be hidden (not displayed)
- This is normal and depends on Suno API's generation settings

---

### Q2: How can I switch to the word lyrics display mode if I want?

**A:** Use the **Sync Mode Toggle** to switch between word-level and line-level lyrics display.

**How to Switch:**

1. **Locate the Toggle:**
   - Look for the "Lyrics Synchronization Mode" section
   - It appears as a toggle/button control above the lyrics display
   - Only visible if line-level cues are available (i.e., timestamped lyrics exist)

2. **Toggle Options:**
   - **Word Mode (Default):** Highlights individual words as they're sung
   - **Line Mode:** Highlights entire lines as they're sung

3. **Code Location:**
   - Component: `SyncModeToggle` in `frontend/src/components/SyncModeToggle.tsx`
   - Rendered in `SongPlaybackPage.tsx`:
     ```typescript
     {lineCues.length > 0 && (
       <section aria-labelledby="sync-mode-section-title">
         <h2 id="sync-mode-section-title" className="sr-only">
           Lyrics synchronization mode
         </h2>
         <SyncModeToggle
           mode={syncMode}
           onChange={handleSyncModeChange}
           disabled={isExpired}
         />
       </section>
     )}
     ```

4. **What Happens When You Switch:**

   **To Word Mode:**
   - `LyricsDisplay` component renders
   - Shows individual words with precise highlighting
   - Words highlight as they're sung in real-time
   - Auto-scrolls to keep current word visible
   - More granular, karaoke-style experience
   - Code:
     ```typescript
     {syncMode === 'line' && lineCues.length > 0 ? (
       <LineLyricsDisplay ... />
     ) : (
       <LyricsDisplay ... />  // Word mode (default)
     )}
     ```

   **To Line Mode:**
   - `LineLyricsDisplay` component renders
   - Shows entire lines with highlighting
   - Lines highlight as they're sung
   - Lines are clickable for seeking to that position
   - Better for reading comprehension
   - Auto-scrolls to keep current line visible

5. **Persistence:**
   - Your choice is saved to `localStorage` via `saveSyncMode(newMode)`
   - When you return to the page, your preference is restored
   - Each user has their own preference (stored locally)

6. **When It's Not Available:**
   - The toggle only appears if `lineCues.length > 0`
   - Line cues are generated from word-level timestamps via `aggregateWordsToLines()`
   - If no timestamped lyrics exist, only word mode is available
   - This happens when:
     - Song was generated without word-level timing data
     - Timestamped lyrics fetch failed (falls back to plain lyrics)

**Visual Indicators:**
- Active mode is highlighted/selected in the toggle
- Status text shows: "Currently in Word Mode" or "Currently in Line Mode"
- Lyrics display updates immediately when you toggle

**Keyboard Accessibility:**
- Tab to the toggle
- Use arrow keys or Space/Enter to switch modes
- Focus indicator shows which option is selected

---

## Additional Context

### Why Both Modes Exist

**Word Mode:**
- ✅ Most precise synchronization
- ✅ Karaoke-style experience
- ✅ Great for language learning (see each word as it's sung)
- ❌ Can be overwhelming with too many words on screen

**Line Mode:**
- ✅ Better readability
- ✅ Clickable seeking (jump to any line)
- ✅ Less visual clutter
- ✅ Better for understanding song structure
- ❌ Less precise timing (entire line highlights at once)

### Data Requirements

For both modes to work, the system needs:
- **Word Mode:** `alignedWords[]` array with `start_time` and `end_time` for each word
- **Line Mode:** `lineCues[]` array generated by aggregating word-level timestamps into line-level cues

If either is missing, the system falls back to section-based display (linear interpolation based on song duration).



---

## Investigation: Missing Song Variations Display

### Issue Summary

You mentioned that 2 songs are being generated (which is correct - Suno API generates 2 variations by default), but the **Song Switcher component is not showing** even though `variations.length >= 2`.

### Root Cause Analysis

After investigating the codebase, I found **3 bugs** preventing variations from being displayed:

---

### Bug #1: Variations Not Sent via WebSocket (CRITICAL)

**Location:** `backend/app/api/websocket.py`, lines 227-233

**Problem:**
The `status_update` dictionary being broadcast to the frontend is **missing the `variations` field**:

```python
# Current code (WRONG):
status_update = {
    "task_id": task_id,
    "status": generation_status.value,
    "progress": suno_status.progress,
    "song_url": suno_status.song_url,
    "error": suno_status.error,
    # ❌ MISSING: "variations": suno_status.variations
}
```

**What should happen:**
The `suno_status` object returned from `suno_client.get_task_status(task_id)` **already contains** the `variations` list extracted from the Suno API response (see `backend/app/services/suno_client.py`, lines 431-483).

However, this data is **never included** in the WebSocket message sent to the frontend.

**Impact:**
- Frontend receives `songVariations: []` (empty array)
- `SongSwitcher` component checks `if (variations.length >= 2)` and returns `null`
- User never sees the variation switcher

---

### Bug #2: Variations Not Stored in Firestore (SECONDARY)

**Location:** `backend/app/api/websocket.py`, lines 237-244

**Problem:**
When updating Firestore, the `variations` are also not being passed:

```python
# Current code (WRONG):
await update_task_status(
    task_id=task_id,
    status=generation_status.value,
    progress=suno_status.progress,
    song_url=suno_status.song_url,
    error=suno_status.error,
    # ❌ MISSING: variations=suno_status.variations
)
```

**Impact:**
- Even if frontend receives variations via WebSocket, they won't persist
- When user refreshes the page, variations are lost
- `GET /api/songs/{song_id}/details` returns empty `variations[]`

---

### Bug #3: Variations Not Sent in Subscribe Response (TERTIARY)

**Location:** `backend/app/api/websocket.py`, lines 450-456

**Problem:**
When a client subscribes to a task, the current status is sent but without variations:

```python
# Current code (WRONG):
current_status = {
    "task_id": task_id,
    "status": task_data.get("status", GenerationStatus.QUEUED.value),
    "progress": task_data.get("progress", 0),
    "song_url": task_data.get("song_url"),
    "error": task_data.get("error"),
    # ❌ MISSING: "variations": task_data.get("variations", [])
}
```

**Impact:**
- If user navigates away and back to the page, variations are not restored
- Only new polling updates would have variations (if Bug #1 is fixed)

---

## Data Flow Diagram (Current vs Expected)

### Current (Broken) Flow:

```
Suno API Response
    ↓
SunoClient.get_task_status()
    ├─ Extracts variations ✅
    └─ Returns TaskStatus with variations ✅
    ↓
WebSocket poll_and_broadcast()
    ├─ Receives suno_status.variations ✅
    ├─ Creates status_update dict ❌ (MISSING variations)
    └─ Broadcasts to frontend ❌
    ↓
Frontend receives
    ├─ task_id ✅
    ├─ status ✅
    ├─ progress ✅
    ├─ song_url ✅
    ├─ error ✅
    └─ variations ❌ (MISSING!)
    ↓
SongPlaybackPage
    └─ songVariations = [] (empty)
    ↓
SongSwitcher
    └─ if (variations.length >= 2) → FALSE
    └─ Returns null (hidden)
```

### Expected (Fixed) Flow:

```
Suno API Response
    ↓
SunoClient.get_task_status()
    ├─ Extracts variations ✅
    └─ Returns TaskStatus with variations ✅
    ↓
WebSocket poll_and_broadcast()
    ├─ Receives suno_status.variations ✅
    ├─ Creates status_update dict ✅ (INCLUDES variations)
    └─ Broadcasts to frontend ✅
    ↓
Frontend receives
    ├─ task_id ✅
    ├─ status ✅
    ├─ progress ✅
    ├─ song_url ✅
    ├─ error ✅
    └─ variations ✅ (PRESENT!)
    ↓
SongPlaybackPage
    └─ songVariations = [variation1, variation2]
    ↓
SongSwitcher
    └─ if (variations.length >= 2) → TRUE
    └─ Renders toggle buttons ✅
```

---

## Verification

To verify this is the issue, check the browser's Network tab:

1. **Open DevTools** → Network tab
2. **Generate a song** and wait for completion
3. **Look for WebSocket messages** (filter by "WS")
4. **Find the `song_status` message** when status becomes "completed"
5. **Inspect the message payload** - you should see:
   - ❌ Current: `{"task_id": "...", "status": "completed", "progress": 100, "song_url": "...", "error": null}`
   - ✅ Expected: `{"task_id": "...", "status": "completed", "progress": 100, "song_url": "...", "variations": [{...}, {...}], "error": null}`

---

## Fix Required

Three changes needed in `backend/app/api/websocket.py`:

### Fix #1: Include variations in WebSocket broadcast (Line 227-233)

```python
# Add variations to status_update
status_update = {
    "task_id": task_id,
    "status": generation_status.value,
    "progress": suno_status.progress,
    "song_url": suno_status.song_url,
    "variations": [
        {
            "audio_url": v.audio_url,
            "audio_id": v.audio_id,
            "variation_index": v.variation_index,
        }
        for v in suno_status.variations
    ],
    "error": suno_status.error,
}
```

### Fix #2: Include variations in Firestore update (Line 237-244)

```python
# Add variations parameter
await update_task_status(
    task_id=task_id,
    status=generation_status.value,
    progress=suno_status.progress,
    song_url=suno_status.song_url,
    error=suno_status.error,
    variations=[
        {
            "audio_url": v.audio_url,
            "audio_id": v.audio_id,
            "variation_index": v.variation_index,
        }
        for v in suno_status.variations
    ],
)
```

### Fix #3: Include variations in subscribe response (Line 450-456)

```python
# Add variations to current_status
current_status = {
    "task_id": task_id,
    "status": task_data.get("status", GenerationStatus.QUEUED.value),
    "progress": task_data.get("progress", 0),
    "song_url": task_data.get("song_url"),
    "variations": [
        {
            "audio_url": v.get("audio_url"),
            "audio_id": v.get("audio_id"),
            "variation_index": v.get("variation_index"),
        }
        for v in task_data.get("variations", [])
    ],
    "error": task_data.get("error"),
}
```

---

## Summary

The Song Switcher is not showing because:

1. ✅ Suno API **correctly generates 2 variations**
2. ✅ Backend **correctly extracts variations** from Suno response
3. ❌ Backend **fails to send variations** to frontend via WebSocket
4. ❌ Backend **fails to persist variations** to Firestore
5. ❌ Frontend receives empty `variations[]` array
6. ❌ `SongSwitcher` component hides because `variations.length < 2`

This is a **backend data transmission bug**, not a frontend issue.

