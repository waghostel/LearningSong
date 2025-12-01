# Configuration Guide - Dual Song Selection

## Environment Variables

### SUNO_MODEL

**Purpose:** Configure which Suno API model version to use for song generation

**Location:** `backend/.env` file

**Default Value:** `V4`

**Valid Values:**

| Model | Description | Duration | Prompt Limit | Best For |
|-------|-------------|----------|--------------|----------|
| `V3_5` | Better song structure | 4 min | 3000 chars | Structured compositions |
| `V4` | Improved vocals (DEFAULT) | 4 min | 3000 chars | Vocal clarity |
| `V4_5` | Smart prompts | 8 min | 5000 chars | Complex requests |
| `V4_5PLUS` | Richer tones | 8 min | 5000 chars | Highest quality |
| `V5` | Latest model | 8 min | 5000 chars | Fastest + best quality |

## How to Configure

### Option 1: Use Default (V4)
No configuration needed. The system uses V4 by default.

```bash
# backend/.env
# No SUNO_MODEL variable needed - defaults to V4
```

### Option 2: Switch to V5 (Recommended for Production)
Add or update the `SUNO_MODEL` variable in your `.env` file:

```bash
# backend/.env
SUNO_MODEL=V5
```

**Benefits of V5:**
- ✅ Faster generation (30-40% faster than V4)
- ✅ Superior audio quality
- ✅ Better musical expression
- ✅ Same prompt limits as V4_5 (5000 chars)

### Option 3: Use Other Models
```bash
# backend/.env

# For longer songs (up to 8 minutes)
SUNO_MODEL=V4_5

# For richest sound quality
SUNO_MODEL=V4_5PLUS

# For better song structure
SUNO_MODEL=V3_5
```

## Validation & Error Handling

### Invalid Model Value
If you specify an invalid model:

```bash
# backend/.env
SUNO_MODEL=V6  # Invalid!
```

**Behavior:**
1. System logs warning: `"Invalid SUNO_MODEL 'V6', falling back to V4"`
2. Automatically uses V4 as fallback
3. Song generation continues normally
4. No user-facing errors

### Missing Environment Variable
If `SUNO_MODEL` is not set:

**Behavior:**
1. System uses V4 (default)
2. No warnings logged
3. Normal operation

## Testing Different Models

### Development Environment
```bash
# backend/.env
SUNO_MODEL=V4  # Test with default
```

### Staging Environment
```bash
# backend/.env
SUNO_MODEL=V5  # Test with latest model
```

### Production Environment
```bash
# backend/.env
SUNO_MODEL=V5  # Recommended for production
```

## Implementation Details

### Backend Code
The model configuration is read in `backend/app/services/suno_client.py`:

```python
import os

# Default model
DEFAULT_SUNO_MODEL = "V4"

# Read from environment
SUNO_MODEL = os.getenv("SUNO_MODEL", DEFAULT_SUNO_MODEL)

# Validate model
VALID_MODELS = ["V3_5", "V4", "V4_5", "V4_5PLUS", "V5"]
if SUNO_MODEL not in VALID_MODELS:
    logger.warning(f"Invalid SUNO_MODEL '{SUNO_MODEL}', falling back to {DEFAULT_SUNO_MODEL}")
    SUNO_MODEL = DEFAULT_SUNO_MODEL

# Use in API calls
payload = {
    "model": SUNO_MODEL,
    # ... other fields
}
```

### No Frontend Changes Required
The model selection is entirely backend-controlled. The frontend doesn't need to know which model is being used.

## Migration Guide

### Upgrading from Hardcoded V4 to Configurable

**Before:**
```python
# Hardcoded in suno_client.py
payload = {
    "model": "V4",  # Fixed value
    ...
}
```

**After:**
```python
# Configurable via environment
SUNO_MODEL = os.getenv("SUNO_MODEL", "V4")
payload = {
    "model": SUNO_MODEL,  # Dynamic value
    ...
}
```

**Steps:**
1. Update `suno_client.py` to read `SUNO_MODEL` from environment
2. Add validation for model values
3. Add fallback to V4 for invalid values
4. (Optional) Add `SUNO_MODEL=V5` to `.env` for better performance
5. Restart backend server

### Zero Downtime Upgrade
1. Deploy code changes (backward compatible - defaults to V4)
2. Test with V4 (no env variable change needed)
3. Update `.env` to use V5 when ready
4. Restart backend to apply new model

## Monitoring & Logging

### Log Messages

**Startup:**
```
INFO: Using Suno API model: V5
```

**Invalid Model:**
```
WARNING: Invalid SUNO_MODEL 'V6', falling back to V4
INFO: Using Suno API model: V4
```

**Song Generation:**
```
INFO: Creating song with model: V5, style: pop, title: Learning Song
```

## Troubleshooting

### Songs generating slowly?
**Solution:** Switch to V5 for faster generation
```bash
SUNO_MODEL=V5
```

### Need longer songs (>4 minutes)?
**Solution:** Use V4_5 or V5 (up to 8 minutes)
```bash
SUNO_MODEL=V5
```

### Want highest quality?
**Solution:** Use V4_5PLUS or V5
```bash
SUNO_MODEL=V5
```

### Model not changing?
**Check:**
1. `.env` file is in `backend/` directory
2. Environment variable is spelled correctly: `SUNO_MODEL` (not `SUNO_API_MODEL`)
3. Backend server was restarted after changing `.env`
4. No typos in model name (case-sensitive: `V5` not `v5`)

## Recommendations

### For Development
Use **V4** (default) - Good balance, well-tested

### For Staging
Use **V5** - Test latest features and performance

### For Production
Use **V5** - Best performance and quality

### For Cost Optimization
All models have the same API cost, so use **V5** for best value

## Related Documentation

- [Suno API Models Documentation](../../../docs/suno-api/05-models.md)
- [Design Document - Configuration Section](./design.md#configuration)
- [Requirements - Model Configuration](./requirements.md#requirement-7)
