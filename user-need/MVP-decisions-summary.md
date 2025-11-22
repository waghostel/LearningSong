# MVP Key Decisions & Recommendations Summary

## ✅ Confirmed Decisions

### User Limits & Constraints
- **Data retention**: 48 hours for anonymous users
- **Rate limiting**: 3 songs per day per user
- **Max input**: 10,000 words
- **No minimum input**: Use Google Search grounding for short queries

### Features
- **Google Search toggle**: User can enable/disable search grounding
- **Lyrics preview**: Users review AI-generated lyrics before song generation
- **WebSocket communication**: Real-time updates instead of polling
- **Browser notifications**: Alert users when song generation completes
- **8 music styles**: Pop, Rap, Folk, Electronic, Rock, Jazz, Children's, Classical

### Technical Decisions
- **No content moderation** (for MVP)
- **User-friendly error messages** (non-technical)
- **Automatic retry logic**: 3 attempts with exponential backoff for API failures

## 🎯 Recommended Implementations

### 1. Caching Strategy
**Goal**: Reduce costs by 20-40% and improve response time

**How it works**:
- Generate SHA-256 hash of cleaned content
- Check Firestore for existing songs with same hash + style
- If found: return immediately (increment hit_count)
- If not found: generate new song and cache it
- Cache TTL: 30 days, max 1000 songs

**Benefits**:
- Instant results for duplicate content
- Significant cost savings during testing
- Better UX for common educational topics

### 2. Error Handling Strategy

| Error Type | User Message | Backend Action |
|------------|-------------|----------------|
| Timeout (>90s) | "Taking longer than expected. We'll notify you!" | Continue monitoring + send notification |
| API Error (500) | "Having trouble. Try again in a few minutes." | Retry 3x with backoff, log error |
| Rate Limit (429) | "Daily limit reached. Come back tomorrow!" | Show countdown timer |
| Invalid Lyrics | "Lyrics don't meet requirements. Please edit." | Highlight issues if possible |

### 3. Updated LangGraph Pipeline

```
[User Input + Search Toggle]
    ↓
[Google Search?] → (if enabled) Enrich content
    ↓
[Clean Text] → Remove formatting
    ↓
[Summarize] → Extract key points (max 500 words)
    ↓
[Validate Length] → Check Suno limits
    ↓ (pass/truncate/expand)
[Convert to Lyrics] → Apply structure + rhyme
    ↓
[Preview to User] → User reviews/edits
    ↓
[Check Cache] → Existing song?
    ↓ (if not cached)
[Generate via Suno] → WebSocket updates
    ↓
[Store + Notify] → Browser notification
```

## 📊 Cost Optimization Tips

1. **Cache aggressively**: Common educational topics will be requested multiple times
2. **Validate early**: Check input length and format before calling expensive APIs
3. **Rate limit strictly**: 3 songs/day prevents abuse during MVP testing
4. **Monitor usage**: Track which styles and topics are most popular
5. **Expire data**: 48-hour retention keeps storage costs low

## 🚀 Next Steps

1. Set up Firebase project (Firestore + Storage + Hosting)
2. Get Suno API credentials and test limits
3. Set up Google Search API for grounding feature
4. Implement WebSocket server with Socket.IO
5. Build LangGraph pipeline with validation steps
6. Create frontend with 3 pages + WebSocket client
7. Implement caching layer in Firestore
8. Add rate limiting middleware
9. Test error handling scenarios
10. Deploy to Firebase

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Suno API costs too high | Aggressive caching + strict rate limits |
| Song generation too slow | WebSocket + notifications keep users engaged |
| Cache storage grows too large | 30-day TTL + 1000 song limit |
| Users abuse rate limits | Track by device fingerprint + IP |
| Google Search API costs | Make it optional toggle, cache search results |

## 📝 Open Questions for Future

1. Should we add a "report inappropriate content" button?
2. Do we need analytics to track which styles are most popular?
3. Should we allow users to save songs beyond 48 hours with account creation?
4. Do we want to add social sharing (Twitter, Facebook)?
5. Should we implement a feedback system for song quality?
