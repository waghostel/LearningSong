# Suno Model Configuration Guide

This document explains how to configure and use different Suno API model versions in LearningSong.

**Last Updated:** December 1, 2025  
**Feature:** Dual Song Selection with Model Selection  
**Status:** Implemented

## Overview

The Suno API provides multiple model versions with different capabilities. LearningSong allows you to configure which model version to use for song generation via the `SUNO_MODEL` environment variable.

### Available Models

| Model | Release | Max Length | Characteristics | Best For |
|-------|---------|-----------|-----------------|----------|
| **V3_5** | Earlier | 4 minutes | Better song structure | Structured content |
| **V4** | Standard | 4 minutes | Improved vocals | General use (DEFAULT) |
| **V4_5** | Enhanced | 8 minutes | Smart prompts | Longer content |
| **V4_5PLUS** | Premium | 8 minutes | Richer tones | High-quality output |
| **V5** | Latest | 8 minutes | Fastest generation | Quick turnaround |

---

## Configuration

### Backend Setup

#### Step 1: Set Environment Variable

**File:** `backend/.env`

```bash
# Use default V4 model (no need to set)
# SUNO_MODEL=V4

# Or specify a different model
SUNO_MODEL=V5
```

#### Step 2: Supported Values

The system validates the model value against this list:

```python
SUPPORTED_MODELS = ["V3_5", "V4", "V4_5", "V4_5PLUS", "V5"]
```

#### Step 3: Default Behavior

If `SUNO_MODEL` is not set:

```python
DEFAULT_SUNO_MODEL = "V4"
SUNO_MODEL = os.getenv("SUNO_MODEL", DEFAULT_SUNO_MODEL)
```

The system defaults to **V4** model.

---

## Model Validation

### Validation Logic

```python
import os
from typing import Optional

SUPPORTED_MODELS = ["V3_5", "V4", "V4_5", "V4_5PLUS", "V5"]
DEFAULT_SUNO_MODEL = "V4"

def get_suno_model() -> str:
    """Get validated Suno model from environment."""
    model = os.getenv("SUNO_MODEL", DEFAULT_SUNO_MODEL)
    
    if model not in SUPPORTED_MODELS:
        logger.warning(
            f"Invalid SUNO_MODEL '{model}'. "
            f"Supported: {SUPPORTED_MODELS}. "
            f"Falling back to {DEFAULT_SUNO_MODEL}"
        )
        return DEFAULT_SUNO_MODEL
    
    return model

SUNO_MODEL = get_suno_model()
```

### Error Handling

**Scenario:** Invalid model specified

```bash
# .env file
SUNO_MODEL=V6  # Invalid - doesn't exist
```

**Backend Behavior:**
1. Logs warning: `Invalid SUNO_MODEL 'V6'. Supported: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V5']. Falling back to V4`
2. Uses V4 model for generation
3. Continues without error

**Log Output:**
```
WARNING: Invalid SUNO_MODEL 'V6'. Supported: ['V3_5', 'V4', 'V4_5', 'V4_5PLUS', 'V5']. Falling back to V4
```

---

## Usage in Song Generation

### API Request

When generating a song, the configured model is automatically used:

```python
# backend/app/services/suno_client.py

async def create_song(
    lyrics: str,
    style: str,
    title: str,
    callback_url: str
) -> str:
    """Create a song using the configured Suno model."""
    
    payload = {
        "customMode": True,
        "instrumental": False,
        "model": SUNO_MODEL,  # Uses configured model
        "prompt": lyrics,
        "style": style_tag,
        "title": title,
        "callBackUrl": callback_url,
    }
    
    response = await self.client.post(
        f"{self.api_url}/api/v1/generate",
        json=payload
    )
    
    return response.json()["data"]["task_id"]
```

### Frontend Transparency

The frontend doesn't need to know which model is being used. The backend handles model selection automatically:

```typescript
// frontend/src/api/songs.ts

export async function generateSong(lyrics: string, style: string) {
  // Backend automatically uses configured SUNO_MODEL
  const response = await client.post('/api/songs/generate', {
    lyrics,
    style
  })
  return response.data
}
```

---

## Model Comparison

### V3_5 vs V4 vs V4_5 vs V4_5PLUS vs V5

#### Generation Speed

```
V5 (Fastest)
V4_5PLUS
V4_5
V4
V3_5 (Slowest)
```

#### Audio Quality

```
V4_5PLUS (Best)
V5
V4_5
V4
V3_5 (Good)
```

#### Maximum Length

```
V4_5: 8 minutes
V4_5PLUS: 8 minutes
V5: 8 minutes
V4: 4 minutes
V3_5: 4 minutes
```

#### Prompt Understanding

```
V4_5 (Best - Smart prompts)
V5 (Excellent)
V4_5PLUS (Excellent)
V4 (Good)
V3_5 (Good)
```

---

## Configuration Examples

### Example 1: Default Configuration (V4)

**Use Case:** General purpose, balanced quality and speed

**Configuration:**
```bash
# backend/.env
# SUNO_MODEL not set - uses default V4
```

**Behavior:**
- Model: V4
- Max length: 4 minutes
- Generation time: ~30-60 seconds
- Quality: Good

---

### Example 2: Fast Generation (V5)

**Use Case:** Quick turnaround, acceptable quality

**Configuration:**
```bash
# backend/.env
SUNO_MODEL=V5
```

**Behavior:**
- Model: V5
- Max length: 8 minutes
- Generation time: ~20-40 seconds (fastest)
- Quality: Excellent

**When to Use:**
- High-traffic scenarios
- User wants quick results
- Content is short (< 4 minutes)

---

### Example 3: High Quality (V4_5PLUS)

**Use Case:** Premium output, longer content

**Configuration:**
```bash
# backend/.env
SUNO_MODEL=V4_5PLUS
```

**Behavior:**
- Model: V4_5PLUS
- Max length: 8 minutes
- Generation time: ~40-80 seconds
- Quality: Best

**When to Use:**
- Premium tier users
- Important content
- Longer educational material (> 4 minutes)

---

### Example 4: Smart Prompts (V4_5)

**Use Case:** Better understanding of complex prompts

**Configuration:**
```bash
# backend/.env
SUNO_MODEL=V4_5
```

**Behavior:**
- Model: V4_5
- Max length: 8 minutes
- Generation time: ~35-70 seconds
- Quality: Excellent
- Prompt understanding: Best

**When to Use:**
- Complex educational content
- Detailed lyrics
- Longer content (> 4 minutes)

---

### Example 5: Structured Content (V3_5)

**Use Case:** Well-structured, shorter content

**Configuration:**
```bash
# backend/.env
SUNO_MODEL=V3_5
```

**Behavior:**
- Model: V3_5
- Max length: 4 minutes
- Generation time: ~40-80 seconds
- Quality: Good
- Best for: Structured content

**When to Use:**
- Older deployments
- Structured educational material
- Backward compatibility

---

## Switching Between Models

### Scenario: Upgrade from V4 to V5

**Step 1: Update Environment Variable**

```bash
# backend/.env
# Before
SUNO_MODEL=V4

# After
SUNO_MODEL=V5
```

**Step 2: Restart Backend**

```bash
# Stop current process
# Ctrl+C

# Restart with new model
poetry run uvicorn app.main:app --reload
```

**Step 3: Verify Configuration**

```bash
# Check logs for confirmation
# Should see: "Using Suno model: V5"

# Or test with API
curl http://localhost:8000/health
```

**Step 4: Test Song Generation**

1. Generate a test song
2. Verify it completes successfully
3. Check generation time (should be faster with V5)

### Scenario: Rollback from V5 to V4

**Step 1: Update Environment Variable**

```bash
# backend/.env
SUNO_MODEL=V4
```

**Step 2: Restart Backend**

```bash
poetry run uvicorn app.main:app --reload
```

**Step 3: Verify**

```bash
# Test song generation
# Should work with V4 model
```

---

## Monitoring Model Usage

### Logging

The backend logs which model is being used:

```python
# backend/app/core/logging.py

logger.info(f"Using Suno model: {SUNO_MODEL}")
```

**Log Output:**
```
INFO: Using Suno model: V5
```

### Checking Current Model

**Method 1: Check Environment Variable**

```bash
cd backend
grep SUNO_MODEL .env
```

**Method 2: Check Backend Logs**

```bash
# Look for model initialization message
poetry run uvicorn app.main:app --reload 2>&1 | grep "Using Suno model"
```

**Method 3: Test API**

```bash
# Generate a song and check generation time
# V5 should be faster than V4
```

---

## Performance Considerations

### Generation Time by Model

```
V5:        20-40 seconds (fastest)
V4_5PLUS:  40-80 seconds
V4_5:      35-70 seconds
V4:        30-60 seconds
V3_5:      40-80 seconds (slowest)
```

### Cost Implications

**Suno API Pricing** (varies by plan):
- All models typically have same pricing
- Cost is per song, not per model
- Dual generation (2 songs) = 2 credits

### Recommendation

For most use cases, use **V5** (default would be V4):
- Fastest generation
- Excellent quality
- Supports 8-minute content
- Best value

---

## Troubleshooting

### Issue: Model Not Changing

**Symptom:** Changed `SUNO_MODEL` but generation still uses old model

**Solution:**
1. Verify `.env` file was saved
2. Restart backend process
3. Check logs for model initialization

```bash
# Verify .env
cat backend/.env | grep SUNO_MODEL

# Restart backend
# Ctrl+C to stop
poetry run uvicorn app.main:app --reload

# Check logs
# Should see: "Using Suno model: {new_model}"
```

---

### Issue: Invalid Model Error

**Symptom:** Backend logs warning about invalid model

**Solution:**
1. Check model name spelling
2. Verify it's in supported list: `["V3_5", "V4", "V4_5", "V4_5PLUS", "V5"]`
3. Correct the value in `.env`

```bash
# Check current value
grep SUNO_MODEL backend/.env

# Correct if needed
# Valid: V3_5, V4, V4_5, V4_5PLUS, V5
```

---

### Issue: Generation Timeout

**Symptom:** Songs take too long to generate

**Solution:**
1. Check if using slower model (V3_5)
2. Try switching to V5 for faster generation
3. Check Suno API status

```bash
# Switch to V5 for faster generation
SUNO_MODEL=V5
```

---

### Issue: Quality Issues

**Symptom:** Generated songs have poor quality

**Solution:**
1. Try upgrading to V4_5PLUS for better quality
2. Check lyrics quality (garbage in = garbage out)
3. Verify Suno API is working correctly

```bash
# Switch to V4_5PLUS for best quality
SUNO_MODEL=V4_5PLUS
```

---

## Migration Guide

### For Existing Deployments

If you're upgrading from a version without model selection:

**Step 1: Update Backend Code**

Ensure you have the latest code with model support:

```bash
git pull origin main
```

**Step 2: Add Environment Variable**

```bash
# backend/.env
SUNO_MODEL=V4  # Or your preferred model
```

**Step 3: Restart Backend**

```bash
poetry run uvicorn app.main:app --reload
```

**Step 4: Verify**

```bash
# Check logs
# Should see: "Using Suno model: V4"

# Test song generation
# Should work as before
```

### Backward Compatibility

- If `SUNO_MODEL` is not set, defaults to V4
- Existing songs continue to work
- No database migration needed
- No frontend changes required

---

## Best Practices

### 1. Use V5 for Production

```bash
# backend/.env
SUNO_MODEL=V5
```

**Reasons:**
- Fastest generation
- Excellent quality
- Supports 8-minute content
- Best user experience

### 2. Use V4_5PLUS for Premium Tier

```bash
# backend/.env
SUNO_MODEL=V4_5PLUS
```

**Reasons:**
- Best quality
- Smart prompt understanding
- Supports 8-minute content
- Premium user experience

### 3. Monitor Generation Times

Track average generation times by model:

```python
# Log generation time
start_time = time.time()
task_id = await suno_client.create_song(lyrics, style, title, callback_url)
generation_time = time.time() - start_time

logger.info(f"Song generation took {generation_time:.1f}s with model {SUNO_MODEL}")
```

### 4. Test Before Deploying

Always test model changes in development:

```bash
# Test in development
cd backend
SUNO_MODEL=V5 poetry run uvicorn app.main:app --reload

# Generate test song
# Verify quality and speed
```

---

## Support & Resources

- **Suno API Documentation:** https://sunoapi.org/docs
- **Model Comparison:** https://sunoapi.org/models
- **Backend Code:** `backend/app/services/suno_client.py`
- **Configuration:** `backend/.env`
- **Logs:** Backend console output

---

## FAQ

### Q: Which model should I use?

**A:** Use **V5** for best balance of speed and quality. Use **V4_5PLUS** if you need the absolute best quality.

### Q: Can I change models without restarting?

**A:** No, you need to restart the backend for the change to take effect.

### Q: Do different models cost different amounts?

**A:** No, all models typically have the same pricing on Suno API.

### Q: Can I use different models for different users?

**A:** Currently, the model is global. To support per-user models, you'd need to modify the backend to accept model as a request parameter.

### Q: What happens if I specify an invalid model?

**A:** The backend logs a warning and falls back to V4 (default).

### Q: Can I switch models mid-deployment?

**A:** Yes, just update `.env` and restart the backend. Existing songs are unaffected.

### Q: Which model generates the fastest?

**A:** V5 is the fastest, typically 20-40 seconds.

### Q: Which model has the best quality?

**A:** V4_5PLUS has the best quality, with richer tones and better prompt understanding.

