# Song Generation Variation Guide

## Overview

This guide explains how LearningSong generates varied and unique songs from educational content, and how the regeneration feature creates different versions of lyrics.

## Core Concept

The AI pipeline converts educational content into memorable song lyrics through a multi-stage process. Each stage can be tuned to increase or decrease creative variation.

```
Educational Content
        ↓
   [Search Grounding] (optional)
        ↓
   [Text Cleaning]
        ↓
   [Summarization] → Extract 3-5 key learning points
        ↓
   [Validation] → Check length constraints
        ↓
   [Lyrics Conversion] → Transform summary into song
        ↓
   Song Lyrics
```

---

## Temperature: The Creativity Control

**Temperature** is the primary control for variation in AI-generated content. It ranges from 0.0 to 1.0:

- **0.0** = Deterministic (always same output for same input)
- **0.7** = Balanced (default for initial generation)
- **0.9** = Creative (used for regeneration)
- **1.0** = Maximum randomness (may be incoherent)

### How Temperature Works

Temperature affects how the LLM selects words:

```
Low Temperature (0.7):
- Picks most likely words
- Predictable, consistent output
- Good for initial generation

High Temperature (0.9):
- Considers more word options
- More creative, varied output
- Good for regeneration
```

---

## Generation Modes

### Initial Generation (Temperature: 0.7)

When a user first generates lyrics from content:

```python
pipeline = LyricsPipeline(temperature=0.7)  # Balanced creativity
result = await pipeline.execute(
    content=request.content,
    search_enabled=request.search_enabled
)
```

**Characteristics:**
- Stable, predictable output
- Focuses on educational accuracy
- Good baseline for song generation
- Caching enabled to save costs

**Example Flow:**
```
Input: "Metal-organic frameworks are..."
↓
Summary: "MOFs are crystalline materials with metal ions..."
↓
Lyrics: "In a world where metals shine..." (verse-chorus structure)
```

### Regeneration (Temperature: 0.9)

When a user regenerates lyrics for the same content:

```python
pipeline = LyricsPipeline(temperature=0.9)  # Higher creativity
result = await pipeline.execute(
    content=request.content,
    search_enabled=request.search_enabled
)
```

**Characteristics:**
- Higher temperature increases variation
- No caching (always generates fresh)
- Different structure, tone, and style
- Independent rate limit (10 regenerations/day)

**Expected Differences:**
- Different song structure (AABA instead of verse-chorus-verse)
- Different rhyme schemes (ABCB instead of AABB)
- Different emotional tone (playful vs dramatic)
- Different metaphors and imagery
- Different narrative perspective

---

## Prompt Engineering for Variation

### The Lyrics Conversion Prompt

The prompt guides the LLM to create unique songs:

```python
CONVERT_TO_LYRICS_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a creative songwriter specializing in educational songs.
    
    CRITICAL: Create a UNIQUE and DISTINCTIVE song.
    
    REQUIRED Creative Variation (NOT optional):
    - Choose an UNEXPECTED song structure
    - Use DISTINCTIVE rhyme schemes
    - Pick a SPECIFIC emotional tone
    - Use UNIQUE metaphors and imagery
    - Vary line lengths dramatically
    - Consider unconventional perspectives
    
    Educational accuracy is non-negotiable, but creative 
    expression should be MAXIMIZED."""),
    ("user", "{summary}")
])
```

**Key Elements:**
- **CRITICAL** and **REQUIRED** emphasize mandatory variation
- Specific alternatives provided (AABA, through-composed, etc.)
- Emotional tones specified (playful, dramatic, mysterious, etc.)
- Unconventional perspectives encouraged (first person, dialogue, etc.)

---

## Variation Strategies

### Phase 1: Quick Wins (30-40% improvement) ✅ IMPLEMENTED

**Current Implementation:**

1. **Enhanced Prompt**
   - Explicit variation instructions (not suggestions)
   - Specific structure alternatives
   - Required emotional tones
   - Unconventional perspectives

2. **Higher Temperature**
   - Regeneration uses 0.9 (vs 0.7 for initial)
   - Increases randomness in word selection
   - More creative, varied outputs

3. **Emphasis on Uniqueness**
   - "Make this UNIQUE and DISTINCTIVE"
   - "Avoid generic patterns and clichés"
   - "Creative expression should be MAXIMIZED"

**Expected Results:**
- Different song structures per regeneration
- Varied rhyme schemes
- Different emotional tones
- Unique metaphors and imagery

---

### Phase 2: Context-Aware (60-70% improvement) PLANNED

**Variation Counter:**
Track which regeneration attempt this is (1st, 2nd, 3rd, etc.):

```python
# Pass to prompt:
"This is regeneration attempt #{variation_counter}.
For attempt 1: Use folk ballad structure
For attempt 2: Use rap/hip-hop style
For attempt 3: Use children's song style"
```

**Previous Lyrics Context:**
Include previous versions as patterns to avoid:

```python
("system", """Previous version to AVOID repeating:
{previous_lyrics}

Create something completely different...""")
```

**Different Summarization:**
Vary which key points are extracted per regeneration.

---

### Phase 3: Advanced (80-90% improvement) FUTURE

**Multiple Prompt Templates:**
Randomly select from different creative approaches:
- Folk ballad with storytelling
- Upbeat pop anthem with repetition
- Rap with internal rhymes and wordplay
- Jazz-inspired with improvisation feel
- Children's song with simple, playful language

**Style-Specific Paths:**
Different generation pipelines for different music styles:
- Pop: Catchy, repetitive, hook-focused
- Rap: Rhythmic, wordplay-focused, internal rhymes
- Folk: Narrative, storytelling, acoustic feel
- Electronic: Futuristic, technical, experimental

**User-Selectable Directions:**
Let users choose creative direction:
- Tone: Playful, Dramatic, Mysterious, Upbeat, Contemplative
- Structure: Verse-Chorus, AABA, Through-Composed, Call-and-Response
- Perspective: First Person, Storytelling, Dialogue, Character Voice

---

## Technical Implementation

### File Structure

```
backend/app/
├── prompts.py              # Prompt templates
├── services/
│   └── ai_pipeline.py      # LyricsPipeline class
└── api/
    └── lyrics.py           # /generate and /regenerate endpoints
```

### Key Classes

**LyricsPipeline:**
```python
class LyricsPipeline:
    def __init__(self, temperature: float = 0.7):
        """Initialize with configurable temperature."""
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=temperature)
        self.graph = self._build_graph()
    
    async def execute(self, content: str, search_enabled: bool) -> dict:
        """Execute the full pipeline."""
```

### Endpoints

**Generate (Initial):**
```
POST /api/lyrics/generate
- Temperature: 0.7 (balanced)
- Caching: Enabled
- Rate Limit: 3/day
```

**Regenerate:**
```
POST /api/lyrics/regenerate
- Temperature: 0.9 (creative)
- Caching: Disabled
- Rate Limit: 10/day (independent)
```

---

## Testing Variation

### Manual Testing

1. **Generate initial lyrics:**
   ```bash
   curl -X POST http://localhost:8000/api/lyrics/generate \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"content": "Metal-organic frameworks...", "search_enabled": false}'
   ```

2. **Regenerate multiple times:**
   ```bash
   curl -X POST http://localhost:8000/api/lyrics/regenerate \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"content": "Metal-organic frameworks...", "search_enabled": false}'
   ```

3. **Compare outputs for:**
   - Song structure (verse-chorus vs AABA vs through-composed)
   - Rhyme schemes (AABB vs ABCB vs ABAB)
   - Emotional tone (playful vs dramatic vs mysterious)
   - Metaphors and imagery (different comparisons and descriptions)
   - Narrative perspective (first person vs storytelling vs dialogue)

### Automated Testing

Check `backend/tests/test_ai_pipeline.py` for:
- Pipeline execution tests
- Temperature parameter tests
- Variation output tests

---

## Limitations

Even with maximum variation, some similarity is inevitable:

1. **Same Educational Content**
   - Core facts must be conveyed
   - Limited ways to express scientific concepts
   - Accuracy constraints limit creativity

2. **Song Structure Constraints**
   - Suno API requires 200-500 words
   - Must be singable and rhythmic
   - Section labels required

3. **Rhyme and Meter**
   - Educational content limits rhyme options
   - Meter must be consistent for music

4. **Audience Expectations**
   - Educational songs have recognizable patterns
   - Users expect clear learning points
   - Memorability requires some repetition

---

## Best Practices

### For Users

1. **Use regeneration strategically**
   - First generation: Get baseline lyrics
   - Regenerate 2-3 times: Find best variation
   - Edit manually: Fine-tune specific sections

2. **Provide clear content**
   - Specific, focused educational material
   - Clear learning objectives
   - Concrete examples and details

3. **Experiment with search grounding**
   - Enable for short or vague content
   - Disable for detailed, specific content
   - Observe impact on variation

### For Developers

1. **Temperature Tuning**
   - 0.7: Initial generation (stable)
   - 0.9: Regeneration (creative)
   - Adjust based on user feedback

2. **Prompt Refinement**
   - Test prompt changes with multiple inputs
   - Measure variation quantitatively
   - Gather user feedback on quality

3. **Monitoring**
   - Track regeneration usage patterns
   - Monitor temperature impact on quality
   - Collect user satisfaction metrics

---

## Future Enhancements

1. **Variation Metrics**
   - Measure similarity between regenerations
   - Track user satisfaction with variation
   - Optimize temperature dynamically

2. **User Preferences**
   - Save preferred song styles
   - Remember successful variations
   - Personalize generation parameters

3. **A/B Testing**
   - Test different prompt versions
   - Compare temperature settings
   - Measure user engagement

4. **Advanced Techniques**
   - Few-shot learning with examples
   - Constraint-based generation
   - Multi-model ensemble approaches

---

## References

- [AI Pipeline Documentation](./docs/readme.md)
- [Lyrics Regeneration Analysis](../report/regeneration-similarity-analysis.md)
- [Phase 1 Implementation](../report/phase-1-implementation.md)
- [LangChain Documentation](https://python.langchain.com/)
- [OpenAI Temperature Guide](https://platform.openai.com/docs/guides/gpt/temperature)
