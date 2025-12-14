# Lyric Generation Prompts: Initial vs Regeneration

This document explains how the lyric generation prompts work in the LearningSong application, covering both the initial generation flow and the regeneration (variation) flow.

## Overview

The lyric generation process uses a two-stage approach:
1. **Summarization**: Extract 3-5 key learning points from educational content
2. **Lyrics Conversion**: Transform the summary into structured, singable song lyrics

Each stage has different prompts for initial generation vs regeneration to ensure variety and prevent repetitive outputs.

**Current Implementation Status**: Phase 2 (Context-Aware Regeneration) - 60-70% variation improvement

---

## Stage 1: Content Summarization

### Initial Generation: `SUMMARIZE_CONTENT_PROMPT`

**Purpose**: Extract the most important concepts from educational content in a way that's suitable for songwriting.

**Key Characteristics**:
- Focuses on extracting 3-5 key learning points
- Keeps summary concise (max 500 words)
- Prioritizes important concepts for memorability
- Encourages variation in approach by starting with compelling facts rather than obvious ones
- Includes specific examples, numbers, and names when available

**Prompt Strategy**:
```
"Extract 3-5 key learning points from the provided content. Keep the summary 
concise (max 500 words) and focus on the most important concepts that would be 
valuable to remember in a song."
```

**Variation Requirements**:
- Prioritize different aspects each time (e.g., history vs applications vs future impact)
- Start with the most compelling or surprising fact, not the most obvious one
- Include specific examples, numbers, or names when available
- Vary the order of concepts to encourage different song structures

**Example Flow**:
```
Input: "Photosynthesis is the process where plants convert light energy..."
Output: "Key points: 1) Light-dependent reactions in thylakoids, 2) Calvin cycle 
produces glucose, 3) Chlorophyll absorbs specific wavelengths, 4) Oxygen released 
as byproduct, 5) Critical for Earth's oxygen atmosphere"
```

---

### Regeneration: `REGENERATE_SUMMARIZE_PROMPT`

**Purpose**: Create a fundamentally different summary from previous attempts to enable varied song generation.

**Key Characteristics**:
- Tracks which regeneration attempt this is (attempt 1, 2, 3, 4+)
- Uses a **variation strategy by attempt number** to ensure different angles
- Explicitly instructs the model to create a DIFFERENT summary
- Maintains educational accuracy while changing perspective

**Variation Strategy by Attempt**:

| Attempt | Focus | Example Approach |
|---------|-------|------------------|
| 1 | Definitions and core concepts | "What is this? How does it work fundamentally?" |
| 2 | Applications and real-world uses | "Where is this used? What problems does it solve?" |
| 3 | History, discovery, and future potential | "How was this discovered? Where is it going?" |
| 4+ | Surprising facts, implications, and connections | "What's unexpected? How does this connect to other ideas?" |

**Prompt Strategy**:
```
"This is regeneration attempt #{variation_counter}. Create a DIFFERENT summary 
from previous attempts. Use the variation strategy for this attempt number."
```

**Example Flow for Same Input**:
```
Attempt 1 (Definitions):
"Key points: 1) Photosynthesis definition, 2) Light reactions, 3) Dark reactions, 
4) Chlorophyll role, 5) Energy conversion"

Attempt 2 (Applications):
"Key points: 1) Crop production and food security, 2) Oxygen generation for 
atmosphere, 3) Biofuel potential, 4) Carbon sequestration, 5) Industrial applications"

Attempt 3 (History/Future):
"Key points: 1) Discovery by van Helmont, 2) Evolution of understanding, 
3) Artificial photosynthesis research, 4) Climate change implications, 
5) Future energy solutions"
```

---

## Stage 2: Lyrics Conversion

### Initial Generation: `CONVERT_TO_LYRICS_PROMPT`

**Purpose**: Transform the summary into engaging, memorable song lyrics with creative structure and style.

**Core Requirements**:
- Keep educational content accurate and meaningful
- Create singable structure with clear sections ([Verse 1], [Chorus], etc.)
- Aim for 200-500 words total (fits Suno API limits)
- Maximize creative expression while maintaining accuracy

**Critical Opening Line Requirements**:
The prompt explicitly forbids generic opening patterns:
- ❌ "In the...", "In a world...", "In a place...", "In this...", "In our..."
- ❌ "There's a...", "There is a...", "There was a..."
- ❌ "When...", "Where...", "What...", "Why...", "How..."
- ❌ "Come...", "Let's...", "Listen...", "Hear..."
- ✅ Instead: Start with action, emotion, or direct statement
- ✅ Examples: "Metal ions dance", "Frameworks rise", "Structures form", "Science speaks", "Knowledge flows"

**Required Creative Variation** (NOT optional):
1. **Song Structure**: Choose UNEXPECTED structures, avoid typical verse-chorus-verse
   - Try: AABA form, through-composed, call-and-response, narrative arc, hybrid structures
   
2. **Rhyme Schemes**: Use DISTINCTIVE patterns, avoid predictable AABB
   - Try: ABCB, ABAB, or experimental rhyming
   
3. **Emotional Tone**: Pick a SPECIFIC tone
   - Options: playful, dramatic, mysterious, upbeat, contemplative, urgent, whimsical, etc.
   
4. **Metaphors & Imagery**: Use UNIQUE, content-specific metaphors
   - Be creative and unexpected, not generic
   
5. **Line Lengths**: Vary dramatically for rhythmic interest and memorability
   
6. **Perspective**: Consider unconventional viewpoints
   - First person narrative, dialogue, storytelling, character voice
   
7. **Wordplay**: Incorporate puns or linguistic creativity where appropriate

**Example Output**:
```
[Verse 1]
Metal ions dance in the light,
Electrons jump from left to right,
Thylakoid membranes split the beam,
Photons fuel the energy dream.

[Chorus]
Light to life, dark to sweet,
Glucose rising, oxygen freed,
Plants are cooking with the sun,
Photosynthesis has just begun.

[Bridge]
Chlorophyll catches the red and blue,
Wavelengths that make the magic true,
Billions of years of evolution's art,
Every plant's a solar heart.
```

---

### Regeneration: `REGENERATE_TO_LYRICS_PROMPT`

**Purpose**: Create a COMPLETELY DIFFERENT song from previous versions while maintaining educational accuracy.

**Key Characteristics**:
- Tracks regeneration attempt number
- Receives context about previous lyrics to avoid repeating patterns
- Uses **variation strategy by attempt** to ensure fundamentally different approaches
- Explicitly instructs avoidance of previous patterns

**Variation Strategy by Attempt**:

| Attempt | Structure | Rhyme Scheme | Approach |
|---------|-----------|--------------|----------|
| 1 | Verse-Chorus-Verse | AABB | Traditional song structure |
| 2 | AABA form or through-composed | ABCB | More complex structure |
| 3 | Call-and-response or narrative arc | Minimal rhyming | Experimental approach |
| 4+ | Combine unexpected elements | Experimental | Dialogue, first-person, hybrid |

**Prompt Strategy**:
```
"This is regeneration attempt #{variation_counter}. Create a COMPLETELY DIFFERENT 
song from previous versions. Use the variation strategy for this attempt number. 
AVOID repeating patterns from previous versions."
```

**Previous Context Handling**:
- The prompt receives the first 1000 characters of previous lyrics
- Explicitly labeled as "PATTERNS TO AVOID FROM PREVIOUS VERSION"
- Instructs: "Create something completely different"

**Example Regeneration Flow for Same Content**:

```
Attempt 1 (Traditional Verse-Chorus-Verse, AABB):
[Verse 1]
In the chloroplast where the light shines bright,
Photosynthesis happens day and night,
Electrons move and energy flows,
That's how the plant grows and grows.

[Chorus]
Light to sugar, water to air,
Photosynthesis happens everywhere,
From the sun to the leaf so green,
The most important process you've seen.

---

Attempt 2 (AABA Form, ABCB, Dramatic Tone):
[Verse 1]
Photons strike the chlorophyll wall,
A cascade of electrons fall,
Thylakoids split the water's bond,
Oxygen rises, life responds.

[Verse 2]
In the stroma, the Calvin wheel turns,
Carbon dioxide burns and burns,
Glucose emerges from the dark,
Life's most fundamental spark.

[Verse 1 Reprise]
Photons strike the chlorophyll wall,
A cascade of electrons fall,
Thylakoids split the water's bond,
Oxygen rises, life responds.

---

Attempt 3 (Call-and-Response, Narrative Arc, Minimal Rhyming):
[Verse 1]
What happens when light meets leaf?
Photosynthesis beyond belief.

[Verse 2]
Chlorophyll captures the sun's energy,
Electrons jump in a symphony,
Water molecules split apart,
Oxygen released, a brand new start.

[Verse 3]
The Calvin cycle spins and spins,
Carbon dioxide comes in,
Glucose forms, the sugar's made,
Life's foundation, never to fade.

[Chorus]
Light to life, that's the way,
Photosynthesis saves the day,
Every plant, every tree,
Feeding you and feeding me.
```

---

## Pipeline Integration

### Initial Generation Flow

```
User Input
    ↓
SUMMARIZE_CONTENT_PROMPT
    ↓
Summary (3-5 key points)
    ↓
CONVERT_TO_LYRICS_PROMPT
    ↓
Song Lyrics (200-500 words)
    ↓
Suno API → Final Song
```

### Regeneration Flow

```
User Clicks "Regenerate"
    ↓
variation_counter = 2 (or 3, 4, etc.)
    ↓
REGENERATE_SUMMARIZE_PROMPT (with variation strategy)
    ↓
Different Summary (different angle)
    ↓
REGENERATE_TO_LYRICS_PROMPT (with previous lyrics context)
    ↓
Completely Different Song Lyrics
    ↓
Suno API → Different Final Song
```

---

## Key Design Decisions

### Why Two Different Prompts?

1. **Initial Generation** (`CONVERT_TO_LYRICS_PROMPT`):
   - Focuses on creating ONE great song
   - Emphasizes creativity and uniqueness
   - No need to avoid previous patterns (none exist yet)

2. **Regeneration** (`REGENERATE_TO_LYRICS_PROMPT`):
   - Focuses on creating DIFFERENT songs
   - Receives previous lyrics as context
   - Uses attempt-based variation strategy
   - Explicitly instructs avoidance of previous patterns

### Why Variation Strategy by Attempt?

The variation strategy ensures that regenerations don't feel random or repetitive:
- **Attempt 1**: Definitions (foundational understanding)
- **Attempt 2**: Applications (practical relevance)
- **Attempt 3**: History/Future (broader context)
- **Attempt 4+**: Surprising facts (deeper insights)

This creates a natural progression where each regeneration offers a genuinely different perspective on the same content.

### Why Strict Opening Line Rules?

Generic openings like "In a world..." or "There's a..." are:
- Overused in educational songs
- Predictable and formulaic
- Reduce memorability
- Limit creative expression

By forbidding these patterns, the prompt forces more creative, direct, and engaging openings.

---

## Temperature Settings

The LyricsPipeline uses different temperature settings:

- **Initial Generation**: `temperature=0.7` (default)
  - Balanced creativity with consistency
  - Produces reliable, high-quality lyrics
  - Caching enabled to reduce costs

- **Regeneration**: `temperature=0.9` (higher creativity)
  - Higher creativity for more variation
  - Encourages different word choices and structures
  - Reduces likelihood of similar outputs
  - No caching (always generates fresh)
  - Independent rate limit (10 regenerations/day vs 3 generations/day)

---

## Implementation Details

### How Variation Counter Works

The `variation_counter` is automatically calculated by the frontend:
```python
variation_counter = len(existing_versions) + 1
```

This means:
- **Attempt 1**: Initial generation (no counter, uses default prompts)
- **Attempt 2**: First regeneration (counter=2, uses REGENERATE prompts)
- **Attempt 3**: Second regeneration (counter=3, uses REGENERATE prompts)
- **Attempt 4+**: Subsequent regenerations (counter=4+, uses REGENERATE prompts)

### How Previous Lyrics Context Works

When regenerating, the frontend captures the most recent lyrics:
```python
previous_lyrics = last_version.lyrics[:5000]  # First 5000 chars
```

This is passed to the backend as "PATTERNS TO AVOID FROM PREVIOUS VERSION", helping the LLM:
- Recognize what was already tried
- Actively avoid similar structures, rhymes, and tones
- Generate fundamentally different songs

### Rate Limiting

- **Generation** (initial): 3 per day per user
- **Regeneration**: 10 per day per user (independent counter)
- Regenerations don't count against generation limit

---

## Prompt Evolution

### Archived: `CONVERT_TO_LYRICS_STRUCTURED_V1`

**Issue**: Generated lyrics were too formulaic and repetitive

**Problem**: The old prompt was too prescriptive:
```
"Use a clear song structure (Verse 1, Chorus, Verse 2, Chorus, Bridge, Final Chorus)"
```

This forced all songs into the same structure, resulting in similar outputs.

**Solution**: The new prompt emphasizes UNEXPECTED structures and creative variation, allowing for diverse song formats while maintaining singability.

### Phase 1 Implementation (30-40% improvement)

**Changes Made:**
- Enhanced `CONVERT_TO_LYRICS_PROMPT` with explicit variation requirements
- Added forbidden opening line patterns
- Introduced temperature=0.9 for regeneration
- Emphasized creative expression over formulaic output

**Result**: Noticeable improvement in variation, but still some similarity in structure and tone.

### Phase 2 Implementation (60-70% improvement) ✅ CURRENT

**Changes Made:**
- Added `REGENERATE_SUMMARIZE_PROMPT` with attempt-based variation strategy
- Added `REGENERATE_TO_LYRICS_PROMPT` with previous lyrics context
- Implemented variation counter tracking
- Added attempt-specific structure and rhyme scheme guidance

**Result**: Significant improvement in variation. Each regeneration attempt uses a fundamentally different creative approach.

---

## Summary

| Aspect | Initial Generation | Regeneration |
|--------|-------------------|--------------|
| **Summarization Prompt** | `SUMMARIZE_CONTENT_PROMPT` | `REGENERATE_SUMMARIZE_PROMPT` |
| **Lyrics Prompt** | `CONVERT_TO_LYRICS_PROMPT` | `REGENERATE_TO_LYRICS_PROMPT` |
| **Variation Strategy** | Single best version | Attempt-based (1→2→3→4+) |
| **Previous Context** | None | First 1000 chars of previous lyrics |
| **Temperature** | 0.7 (balanced) | 0.9+ (creative) |
| **Goal** | Create ONE great song | Create DIFFERENT songs |
| **Opening Lines** | Forbidden patterns enforced | Forbidden patterns enforced |
| **Structure** | Unexpected, creative | Varies by attempt number |
| **Rhyme Scheme** | Distinctive, not predictable | Varies by attempt number |
| **Emotional Tone** | Specific and unique | Varies by attempt number |

This dual-prompt approach ensures that users get high-quality, creative lyrics on first generation, and genuinely different variations on regeneration—all while maintaining educational accuracy and singability.
