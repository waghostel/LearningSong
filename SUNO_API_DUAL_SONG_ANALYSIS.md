# Suno API Dual Song Generation Analysis

## Summary of Findings

Based on analysis of your project's Suno API integration and documentation, here are the answers to your questions:

---

## 1. Can I get both songs generated simultaneously?

**YES** ✅

The Suno API **generates 2 songs by default** in a single request. When you call the `/api/v1/generate` endpoint, the API returns a single `taskId`, but when that task completes, the response contains a `sunoData` array with **2 tracks**.

### Current Implementation Evidence

In `backend/app/services/suno_client.py` (lines 404-412):

```python
if status == "SUCCESS":
    suno_data = task_data.get("response", {}).get("sunoData", [])
    if suno_data:
        # Get the first track's audio URL and ID
        first_track = suno_data[0]
        song_url = first_track.get("audioUrl")
        audio_id = first_track.get("id")
```

The code currently **only retrieves the first track** (`suno_data[0]`), ignoring the second song.

### Response Structure

```
GET /api/v1/generate/record-info?taskId={taskId}
↓
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "...",
    "status": "SUCCESS",
    "response": {
      "sunoData": [
        {
          "id": "audio_id_1",
          "audioUrl": "https://...",
          "title": "...",
          ...
        },
        {
          "id": "audio_id_2",
          "audioUrl": "https://...",
          "title": "...",
          ...
        }
      ]
    }
  }
}
```

---

## 2. Can it be forced to generate only one song?

**NOT DIRECTLY** ⚠️

The Suno API documentation does **not provide a parameter** to request single song generation. The dual-song generation appears to be a **fixed behavior** of the API.

### Workarounds

You have two options:

#### Option A: Accept Both Songs (Recommended)
- Retrieve both tracks from `sunoData` array
- Store/return both to the user
- Let users choose which one they prefer
- **Benefit**: Better UX, users get options

#### Option B: Discard the Second Song
- Continue current approach: only use `suno_data[0]`
- Ignore `suno_data[1]`
- **Benefit**: Simpler implementation, no changes needed
- **Cost**: Wasted API resources (you're paying for 2 songs but using 1)

#### Option C: Batch Multiple Requests
- Make multiple API calls to generate different variations
- Each call produces 2 songs
- Select the best ones
- **Benefit**: More variety
- **Cost**: Higher API usage, slower

---

## 3. What version of the API are we currently using?

**V4** (with V4_5 and V5 available)

### Current Configuration

In `backend/app/services/suno_client.py` (line 149):

```python
"model": "V4",  # Use V4 model for good quality
```

### Available Models (from `docs/suno-api/05-models.md`)

| Model | Duration | Prompt Limit | Speed | Quality | Best For |
|-------|----------|--------------|-------|---------|----------|
| **V3_5** | 4 min | 3000 chars | Medium | Good | Structured songs |
| **V4** | 4 min | 3000 chars | Medium | Excellent | Vocal clarity (CURRENT) |
| **V4_5** | 8 min | 5000 chars | Fast | Excellent | Complex requests |
| **V4_5PLUS** | 8 min | 5000 chars | Fast | Best | Richest tones |
| **V5** | 8 min | 5000 chars | Fastest | Best | Latest/fastest |

### Recommendation

**Now Configurable!** The dual song selection spec includes support for switching between models via the `SUNO_MODEL` environment variable.

**Default:** V4 (no configuration needed)

**To upgrade to V5:**
```bash
# In backend/.env
SUNO_MODEL=V5
```

**Benefits of V5:**
- ✅ Faster generation (important for UX)
- ✅ Superior quality
- ✅ Same prompt limits as V4_5
- ✅ Latest model with best features

See `.kiro/specs/dual-song-selection/CONFIGURATION.md` for complete configuration guide.

---

## Implementation Recommendations

### Short Term (MVP)
1. **Keep V4 model** - it's working well
2. **Keep single song approach** - simpler for now
3. **Document the dual-song behavior** for future reference

### Medium Term (Post-MVP)
1. **Upgrade to V5 model** - better speed and quality
2. **Implement dual-song selection UI**:
   - Generate 2 songs in one request
   - Show both to user
   - Let them pick their favorite
   - Store both in database (optional)
3. **Update `SunoClient.get_task_status()`** to return both songs:

```python
# Instead of:
song_url = first_track.get("audioUrl")

# Return both:
songs = [
    {
        "url": track.get("audioUrl"),
        "id": track.get("id"),
        "title": track.get("title")
    }
    for track in suno_data
]
```

### Long Term (Advanced)
1. **Implement song comparison logic**
2. **Add user preferences** (favorite styles, tempos)
3. **Cache both songs** for A/B testing
4. **Analytics** on which song users prefer

---

## API Endpoint Reference

### Generate Music
```
POST /api/v1/generate
```
- Returns: Single `taskId`
- Generates: 2 songs (fixed)
- Time: 30-40s for stream, 2-3min for download

### Check Status
```
GET /api/v1/generate/record-info?taskId={taskId}
```
- Returns: `sunoData` array with 2 tracks when `status == "SUCCESS"`

### Get Timestamped Lyrics
```
POST /api/v1/generate/get-timestamped-lyrics
```
- Requires: `taskId` and `audioId` (from one of the tracks)
- Returns: Word-level timing data for sync

---

## Files to Update (If Implementing Dual Songs)

1. **`backend/app/services/suno_client.py`**
   - Modify `get_task_status()` to return both songs
   - Add new return type or extend `SunoStatus`

2. **`backend/app/api/songs.py`**
   - Update song generation endpoint to handle 2 songs
   - Store both in database

3. **`frontend/src/hooks/useSongGeneration.ts`**
   - Display both song options to user
   - Handle user selection

4. **Database schema**
   - Add field to track which song was selected
   - Store both URLs (optional)

---

## Questions to Consider

1. **Should we store both songs?**
   - Pro: Users can change their mind later
   - Con: Double storage cost

2. **Should we show both to users?**
   - Pro: Better UX, users get choice
   - Con: More complex UI

3. **Should we upgrade to V5?**
   - Pro: Faster, better quality
   - Con: Need to test compatibility

4. **Should we implement A/B testing?**
   - Pro: Learn user preferences
   - Con: More complexity

---

## Next Steps

1. **Decide on dual-song strategy** (accept both, discard second, or batch)
2. **Plan UI changes** if accepting both songs
3. **Test V5 model** in staging environment
4. **Update documentation** with new behavior
5. **Create spec/tasks** for implementation

