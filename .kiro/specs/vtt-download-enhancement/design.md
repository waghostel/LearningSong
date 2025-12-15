# Design Document

## Overview

This design document outlines the implementation of line-by-line lyrics synchronization and VTT (WebVTT) subtitle file download functionality for the Song Playback page. The system will transform word-level timing data from the Suno API into line-level timestamps, enabling smoother lyric highlighting and subtitle file generation.

The current implementation highlights individual words during playback, but users prefer line-by-line highlighting for better readability and natural flow. Additionally, the VTT download feature will allow users to export synchronized lyrics for use with video players and accessibility tools.

## Architecture

The solution consists of several key components working together:

1. **Word-to-Line Aggregation Engine**: Processes word-level timing data to create line-level timestamps
2. **Line-Level Lyrics Display Component**: Renders lyrics with line-by-line highlighting
3. **VTT Generation Service**: Creates properly formatted WebVTT subtitle files
4. **Download Manager**: Handles file generation and browser download triggers
5. **Synchronization Controller**: Manages timing, offsets, and highlighting states

### Data Flow

```
Suno API (word-level timing) 
    ↓
Word-to-Line Aggregation Engine
    ↓
LineCue Objects (line-level timing)
    ↓
┌─────────────────────────┬─────────────────────────┐
│   Line Display Component │   VTT Generation Service │
│   (Real-time highlighting) │   (File download)        │
└─────────────────────────┴─────────────────────────┘
```

## Components and Interfaces

### LineCue Interface

```typescript
interface LineCue {
  lineIndex: number      // 0-based index for ordering
  text: string          // Complete line text (normalized)
  startTime: number     // Start time in seconds
  endTime: number       // End time in seconds
  isMarker: boolean     // True for section markers like [Verse 1]
}
```

### Word-to-Line Aggregation Engine

**Purpose**: Converts word-level timing data into line-level timestamps by matching aligned words to lyric lines.

**Key Functions**:
- `aggregateWordsToLines(alignedWords: AlignedWord[], editedLyrics: string): LineCue[]`
- `findMatchingWords(lineText: string, alignedWords: AlignedWord[], startIndex: number)`
- `extractWordsFromLine(lineText: string): string[]`

**Algorithm**:
1. Split edited lyrics into individual lines
2. For each line, extract words and normalize text
3. Match line words to aligned words from Suno API
4. Handle word splits (e.g., "we're" → "we'" + "re")
5. Calculate line start time (first word's startS) and end time (last word's endS)
6. Detect and flag section markers

### Line-Level Display Component

**Purpose**: Renders lyrics with line-by-line highlighting synchronized to audio playback.

**Props**:
```typescript
interface LineLyricsDisplayProps {
  lineCues: LineCue[]
  currentTime: number
  onLineClick: (startTime: number) => void
  showMarkers: boolean
  offset: number
}
```

**Behavior**:
- Highlights active line based on currentTime + offset
- Allows clicking lines to seek to that timestamp
- Conditionally shows/hides section markers
- Provides smooth visual transitions between lines

### VTT Generation Service

**Purpose**: Creates properly formatted WebVTT subtitle files from line cues.

**Key Functions**:
- `generateVttContent(lineCues: LineCue[], offset: number): string`
- `formatVttTimestamp(seconds: number): string`
- `generateVttFilename(style: string, createdAt: Date): string`
- `downloadVttFile(content: string, filename: string): void`

**VTT Format**:
```
WEBVTT

00:12.500 --> 00:15.800
Metal ions dance, a vision unfolds,

00:15.800 --> 00:19.200
Molecular wonders, stories untold,
```

### Download Manager

**Purpose**: Handles VTT file generation and browser download functionality.

**Features**:
- Creates blob objects with proper MIME type (`text/vtt;charset=utf-8`)
- Generates descriptive filenames (e.g., `song-pop-2024-12-15.vtt`)
- Triggers browser download using temporary anchor elements
- Cleans up object URLs to prevent memory leaks

## Data Models

### AlignedWord (from Suno API)

```typescript
interface AlignedWord {
  word: string      // Individual word text
  startS: number    // Start time in seconds
  endS: number      // End time in seconds
}
```

### SyncMode (User Preference)

```typescript
type SyncMode = 'word' | 'line'
```

Stored in localStorage to remember user preference between sessions.

### OffsetState (Timing Adjustment)

```typescript
interface OffsetState {
  value: number     // Offset in milliseconds
  songId: string    // Associated song ID for persistence
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Word-to-line aggregation produces valid timestamps
*For any* valid word-level timing data and lyrics text, aggregating words to lines should produce LineCue objects where each line's start time is less than or equal to its end time
**Validates: Requirements 1.1, 3.3, 3.4**

Property 2: Word matching preserves all line content
*For any* lyric line and corresponding aligned words, the word matching algorithm should find words that, when combined, represent the complete line content
**Validates: Requirements 1.2, 3.2**

Property 3: Line highlighting activation timing
*For any* line cue and current playback time, when the current time is greater than or equal to the line's start time and less than the line's end time, the line should be highlighted
**Validates: Requirements 1.3, 1.4, 1.5**

Property 4: VTT button visibility based on data availability
*For any* set of line cues, the VTT download button should be visible if and only if the line cues array is non-empty
**Validates: Requirements 2.1, 6.1**

Property 5: VTT generation produces valid WebVTT format
*For any* valid line cues, generating VTT content should produce a string that starts with "WEBVTT" and contains properly formatted timestamp lines
**Validates: Requirements 2.2, 5.1**

Property 6: Section markers excluded from VTT output
*For any* line cues containing section markers, the generated VTT content should not include any lines marked with isMarker=true
**Validates: Requirements 2.3**

Property 7: Offset application to all timestamps
*For any* line cues and offset value, applying the offset should adjust all start and end times by exactly the offset amount (converted to seconds)
**Validates: Requirements 2.4**

Property 8: VTT filename format consistency
*For any* song style and creation date, the generated filename should follow the exact format "song-{normalized-style}-{YYYY-MM-DD}.vtt"
**Validates: Requirements 2.5, 5.2**

Property 9: Word split handling in matching
*For any* line containing words that are split in the aligned words data, the matching algorithm should correctly combine split words to match the original line content
**Validates: Requirements 3.1**

Property 10: Graceful handling of unmatchable lines
*For any* lyrics containing lines that cannot be matched to aligned words, the aggregation process should skip those lines and continue processing remaining lines without errors
**Validates: Requirements 3.5**

Property 11: Keyboard accessibility for VTT button
*For any* VTT download button instance, the button should be focusable via keyboard navigation and respond to both Enter and Space key presses
**Validates: Requirements 4.1**

Property 12: ARIA labeling completeness
*For any* VTT download button instance, the button element should have appropriate ARIA attributes including aria-label or accessible text content
**Validates: Requirements 4.2**

Property 13: Special character normalization in filenames
*For any* song style containing spaces or special characters, the filename generation should replace all non-alphanumeric characters with hyphens
**Validates: Requirements 5.3**

Property 14: Millisecond padding consistency
*For any* timestamp value, the formatted milliseconds component should always be exactly three digits, padding with leading zeros as necessary
**Validates: Requirements 5.4**

Property 15: Non-negative timestamp enforcement
*For any* line cues and offset value, applying the offset should never result in negative start or end times in the final output
**Validates: Requirements 5.5**

Property 16: Unicode character preservation
*For any* lyrics containing Unicode or special characters, both the line highlighting display and VTT file generation should preserve all characters exactly as they appear in the original text
**Validates: Requirements 6.2**

Property 17: Error handling without system crashes
*For any* malformed or incomplete aligned words data, the aggregation process should handle errors gracefully and return a valid result (possibly empty) without throwing unhandled exceptions
**Validates: Requirements 6.3**

Property 18: Expired song state management
*For any* song with an expiration status of true, the VTT download button should be disabled while lyrics display remains functional in read-only mode
**Validates: Requirements 6.4**

## Error Handling

### Word-to-Line Aggregation Errors

**Missing or Malformed Data**:
- Empty aligned words array: Return empty LineCue array
- Null/undefined lyrics: Return empty LineCue array
- Corrupted word timing data: Skip invalid words, continue processing

**Word Matching Failures**:
- Unmatched line words: Skip the line, log warning, continue processing
- Partial matches: Use available matches, calculate timestamps from matched words
- Text normalization issues: Apply fallback normalization, attempt fuzzy matching

### VTT Generation Errors

**Invalid Input Data**:
- Empty line cues: Generate minimal VTT with header only
- Invalid timestamps: Skip problematic lines, include valid ones
- Text encoding issues: Use UTF-8 encoding, preserve special characters

**Download Failures**:
- Browser compatibility: Provide fallback text area with VTT content
- File system errors: Show error message, allow retry
- Large file sizes: Warn user, proceed with download

### UI Error States

**Component Errors**:
- Rendering failures: Show error boundary with retry option
- State synchronization issues: Reset to safe default state
- Performance problems: Implement debouncing and throttling

**Accessibility Errors**:
- Missing ARIA labels: Provide default accessible text
- Focus management issues: Ensure keyboard navigation remains functional
- Screen reader compatibility: Maintain semantic HTML structure

## Testing Strategy

### Unit Testing

Unit tests will verify specific functionality of individual components and utilities:

- **Word-to-Line Aggregation**: Test matching algorithms with various text patterns
- **VTT Generation**: Verify WebVTT format compliance and timestamp formatting
- **Filename Generation**: Test normalization and format consistency
- **Error Handling**: Verify graceful degradation with invalid inputs

### Property-Based Testing

Property-based tests will verify universal properties across many inputs using **Hypothesis** (Python) for backend utilities and **fast-check** (JavaScript) for frontend components. Each property-based test will run a minimum of 100 iterations to ensure comprehensive coverage.

**Key Properties to Test**:
- Timestamp ordering and validity in aggregated line cues
- VTT format compliance across different input variations
- Character preservation through the entire pipeline
- Error handling consistency across edge cases
- UI state consistency with different data conditions

**Generator Strategies**:
- **Lyrics Generator**: Create realistic lyric structures with various line lengths, section markers, and Unicode characters
- **Timing Data Generator**: Generate valid word-level timing with realistic durations and overlaps
- **Edge Case Generator**: Create boundary conditions like empty data, extreme offsets, and malformed inputs

### Integration Testing

Integration tests will verify the complete workflow from Suno API data to final user interactions:

- **End-to-End Highlighting**: Verify line highlighting works correctly during audio playback
- **VTT Download Flow**: Test complete download process from button click to file generation
- **Accessibility Integration**: Verify keyboard navigation and screen reader compatibility
- **Performance Testing**: Ensure smooth operation with large lyric files and complex timing data

The testing approach emphasizes both concrete examples (unit tests) and universal properties (property-based tests) to provide comprehensive coverage while catching edge cases that might be missed by example-based testing alone.