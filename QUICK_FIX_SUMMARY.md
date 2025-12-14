# Quick Fix Summary: Song Variations Bug

## TL;DR

**3 simple fixes needed in `backend/app/api/websocket.py`:**

### Fix #1: Line ~227 - Add variations to WebSocket broadcast
```python
status_update = {
    "task_id": task_id,
    "status": generation_status.value,
    "progress": suno_status.progress,
    "song_url": suno_status.song_url,
    "variations": [
        {"audio_url": v.audio_url, "audio_id": v.audio_id, "variation_index": v.variation_index}
        for v in suno_status.variations
    ],
    "error": suno_status.error,
}
```

### Fix #2: Line ~237 - Add variations to Firestore update
```python
await update_task_status(
    task_id=task_id,
    status=generation_status.value,
    progress=suno_status.progress,
    song_url=suno_status.song_url,
    error=suno_status.error,
    variations=[
        {"audio_url": v.audio_url, "audio_id": v.audio_id, "variation_index": v.variation_index}
        for v in suno_status.variations
    ],
)
```

### Fix #3: Line ~450 - Add variations to subscribe response
```python
current_status = {
    "task_id": task_id,
    "status": task_data.get("status", GenerationStatus.QUEUED.value),
    "progress": task_data.get("progress", 0),
    "song_url": task_data.get("song_url"),
    "variations": [
        {"audio_url": v.get("audio_url"), "audio_id": v.get("audio_id"), "variation_index": v.get("variation_index")}
        for v in task_data.get("variations", [])
    ],
    "error": task_data.get("error"),
}
```

---

## Why These Fixes Work

1. **Fix #1** sends variations to frontend in real-time → Song Switcher appears
2. **Fix #2** saves variations to database → Survives page refresh
3. **Fix #3** restores variations on reconnect → Works after tab close/reopen

---

## Testing

```bash
# 1. Generate a song
# 2. Check DevTools → Network → WebSocket messages
# 3. Look for "variations" field in song_status event
# 4. Refresh page - variations should still be there
# 5. Song Switcher should show "Version 1" and "Version 2" buttons
```

---

## Files to Modify

- `backend/app/api/websocket.py` (3 locations)

---

## Estimated Time

- Implementation: 10 minutes
- Testing: 20 minutes
- **Total: ~30 minutes**

---

## Risk Level

🟢 **LOW** - Isolated backend changes, no schema changes, backward compatible

