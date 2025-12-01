# Dual Song Selection - Complete Documentation Index

This document provides a comprehensive index of all documentation related to the dual song selection feature.

**Last Updated:** December 1, 2025  
**Feature:** Dual Song Selection  
**Status:** Fully Documented

## Quick Navigation

### For Different Audiences

**👤 End Users**
- Start with: [User Guide](./dual-song-user-guide.md)
- Learn how to use the feature
- Troubleshooting tips
- Accessibility features

**👨‍💻 Frontend Developers**
- Start with: [SongSwitcher Component](./song-switcher-component.md)
- Component props and usage
- Keyboard navigation
- Accessibility implementation

**🔧 Backend Developers**
- Start with: [API Documentation](./dual-song-selection-api.md)
- API endpoints and data models
- Database schema
- Error handling

**🚀 DevOps / Deployment**
- Start with: [Migration Guide](./dual-song-migration-guide.md)
- Deployment strategies
- Rollback procedures
- Monitoring setup

**⚙️ System Administrators**
- Start with: [Suno Model Configuration](./suno-model-configuration.md)
- Environment variable setup
- Model selection
- Troubleshooting

---

## Documentation Files

### 1. User Guide
**File:** `docs/dual-song-user-guide.md`  
**Audience:** End users  
**Length:** ~400 lines  
**Topics:**
- Feature overview
- How to use the switcher
- Keyboard navigation
- Mobile support
- Accessibility features
- Troubleshooting
- FAQ

**When to Read:**
- You're a user learning the feature
- You need help using the switcher
- You have accessibility needs

---

### 2. API Documentation
**File:** `docs/dual-song-selection-api.md`  
**Audience:** Backend developers, API consumers  
**Length:** ~800 lines  
**Topics:**
- API endpoints (modified and new)
- Request/response examples
- Data models (Python and TypeScript)
- Database schema
- Backward compatibility
- Error handling
- Rate limiting
- Examples and testing

**When to Read:**
- You're implementing backend features
- You need to integrate with the API
- You're building API clients
- You need to understand data models

**Key Sections:**
- Modified Endpoints: `GET /api/songs/{task_id}`, `GET /api/songs/{song_id}/details`
- New Endpoints: `PATCH /api/songs/{task_id}/primary-variation`, `POST /api/songs/{task_id}/timestamped-lyrics/{variation_index}`
- Data Models: `SongVariation`, `SongStatusUpdate`, `SongDetails`
- Database Schema: Firestore songs collection structure

---

### 3. SongSwitcher Component
**File:** `docs/song-switcher-component.md`  
**Audience:** Frontend developers  
**Length:** ~700 lines  
**Topics:**
- Component overview
- Props and interfaces
- Usage examples
- Visual design
- Accessibility features
- Styling (CSS and Tailwind)
- Implementation details
- Testing
- Integration with hooks
- Performance considerations
- Browser support
- Troubleshooting

**When to Read:**
- You're implementing the SongSwitcher component
- You need to customize the component
- You're writing tests
- You need accessibility guidance

**Key Sections:**
- Props: `variations`, `activeIndex`, `onSwitch`, `isLoading`, `disabled`
- Keyboard Navigation: Tab, Arrow keys, Enter, Space
- ARIA Attributes: `role="group"`, `aria-label`, `aria-pressed`
- Styling: CSS classes and Tailwind utilities
- Testing: Unit tests, accessibility tests

---

### 4. Suno Model Configuration
**File:** `docs/suno-model-configuration.md`  
**Audience:** System administrators, DevOps, backend developers  
**Length:** ~600 lines  
**Topics:**
- Available models (V3_5, V4, V4_5, V4_5PLUS, V5)
- Configuration setup
- Model validation
- Usage in song generation
- Model comparison
- Configuration examples
- Switching between models
- Monitoring
- Troubleshooting
- Best practices
- FAQ

**When to Read:**
- You need to configure the Suno model
- You want to switch between models
- You need to understand model differences
- You're troubleshooting model issues

**Key Sections:**
- Available Models: Comparison table
- Configuration: `SUNO_MODEL` environment variable
- Validation: Supported values and fallback behavior
- Examples: V5 for speed, V4_5PLUS for quality
- Troubleshooting: Invalid model, generation timeout

---

### 5. Migration Guide
**File:** `docs/dual-song-migration-guide.md`  
**Audience:** DevOps, deployment engineers, system administrators  
**Length:** ~900 lines  
**Topics:**
- Pre-migration checklist
- Database schema migration
- Backend deployment
- Frontend deployment
- Deployment strategies (blue-green, canary, feature flags)
- Rollback procedures
- Testing checklist
- User communication
- Monitoring
- Troubleshooting
- Performance optimization
- Post-deployment verification
- FAQ

**When to Read:**
- You're deploying the feature to production
- You need a deployment strategy
- You need to plan a rollback
- You're setting up monitoring

**Key Sections:**
- Automatic Migration: Old songs auto-migrated on access
- Deployment Strategies: Blue-green, canary, feature flags
- Rollback Plan: Safe, non-destructive rollback
- Testing Checklist: Backend, frontend, integration tests
- Monitoring: Key metrics to track

---

### 6. Design Document (Reference)
**File:** `.kiro/specs/dual-song-selection/design.md`  
**Audience:** Architects, technical leads, developers  
**Length:** ~1100 lines  
**Topics:**
- Feature overview
- Architecture and flow diagrams
- Component design
- Data models
- Correctness properties
- Configuration
- Error handling
- Testing strategy

**When to Read:**
- You need to understand the overall design
- You're reviewing the architecture
- You need to understand correctness properties
- You're planning implementation

---

### 7. Requirements Document (Reference)
**File:** `.kiro/specs/dual-song-selection/requirements.md`  
**Audience:** Product managers, QA, developers  
**Length:** ~400 lines  
**Topics:**
- Feature introduction
- Glossary of terms
- 10 requirements with acceptance criteria
- User stories

**When to Read:**
- You need to understand what the feature does
- You're writing tests
- You need to verify acceptance criteria
- You're doing QA

---

## Feature Overview

### What is Dual Song Selection?

The Suno API generates two song variations by default for each generation request. The dual song selection feature exposes both variations to users, allowing them to:

1. **Compare** two unique versions of their song
2. **Choose** their favorite version
3. **Save** their selection for future access
4. **Share** their preferred version

### Key Components

**Backend:**
- `SunoClient`: Extracts all variations from Suno API response
- `SongStorage`: Stores variations in Firestore
- API Endpoints: New endpoints for updating primary variation and fetching variation-specific lyrics

**Frontend:**
- `SongSwitcher`: UI component for switching between versions
- `useSongSwitcher`: Hook for managing variation switching logic
- Updated stores and pages to support variations

**Database:**
- New `variations` array field
- New `primary_variation_index` field
- Backward compatible with old single-variation songs

---

## API Endpoints Summary

### Modified Endpoints

| Endpoint | Method | Change |
|----------|--------|--------|
| `/api/songs/{task_id}` | GET | Now returns `variations` array |
| `/api/songs/{song_id}/details` | GET | Now returns `variations` and `primary_variation_index` |

### New Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/songs/{task_id}/primary-variation` | PATCH | Update primary variation selection |
| `/api/songs/{task_id}/timestamped-lyrics/{variation_index}` | POST | Fetch timestamped lyrics for specific variation |

---

## Data Models Summary

### SongVariation

```typescript
interface SongVariation {
  audioUrl: string        // URL to audio file
  audioId: string         // ID for timestamped lyrics
  variationIndex: number  // 0 or 1
}
```

### SongStatusUpdate

```typescript
interface SongStatusUpdate {
  task_id: string
  status: 'generating' | 'completed' | 'failed' | 'expired'
  progress: number
  variations: SongVariation[]
  error?: string
}
```

### SongDetails

```typescript
interface SongDetails {
  song_id: string
  task_id: string
  variations: SongVariation[]
  primary_variation_index: number
  lyrics: string
  style: string
  created_at: string
  expires_at: string
  is_owner: boolean
  aligned_words?: AlignedWord[]
  waveform_data?: number[]
  has_timestamps: boolean
}
```

---

## Configuration Summary

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `SUNO_MODEL` | `V4` | Suno API model version to use |

### Supported Models

| Model | Max Length | Best For |
|-------|-----------|----------|
| V3_5 | 4 min | Structured content |
| V4 | 4 min | General use (default) |
| V4_5 | 8 min | Complex prompts |
| V4_5PLUS | 8 min | Premium quality |
| V5 | 8 min | Fast generation |

---

## Deployment Strategies

### Blue-Green Deployment (Recommended)

1. Deploy new backend (blue)
2. Deploy new frontend (green)
3. Route traffic gradually
4. Easy rollback if needed

### Canary Deployment

1. Deploy to canary environment
2. Route 5% of traffic
3. Gradually increase to 100%
4. Monitor at each stage

### Feature Flag Deployment

1. Deploy with feature disabled
2. Enable for 10% of users
3. Gradually enable for more
4. Enable for all users

---

## Testing Strategy

### Unit Tests

- Backend: Test API endpoints, data models, storage
- Frontend: Test SongSwitcher component, useSongSwitcher hook

### Integration Tests

- Test complete flow: generate → switch → persist → reload
- Test WebSocket updates with variations
- Test API error scenarios

### E2E Tests

- Test user journey with Playwright
- Test keyboard navigation
- Test mobile touch interactions
- Test offline/online transitions

### Property-Based Tests

- 28 correctness properties defined
- Hypothesis (Python) and fast-check (TypeScript)
- Minimum 100 iterations per property

---

## Accessibility Features

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move focus |
| Arrow Keys | Switch versions |
| Enter/Space | Activate |

### Screen Reader Support

- ARIA labels for all buttons
- Role="group" for container
- aria-pressed for active state
- Status announcements

### Visual Accessibility

- High contrast (4.5:1 ratio)
- Focus indicators
- Large touch targets (44x44px)
- Works with high contrast mode

---

## Backward Compatibility

### Old Songs (Single Variation)

- Automatically migrated on first access
- Converted to single-item variations array
- Switcher hidden (only 1 variation)
- Works exactly as before

### Migration Process

1. Backend detects missing `variations` field
2. Creates variations array from `song_url` and `audio_id`
3. Sets `primary_variation_index: 0`
4. Returns migrated data to frontend
5. Gradual migration as users access old songs

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid variation_index | Index not 0 or 1 | Validate input |
| Variation not found | Only 1 variation exists | Check variations.length |
| Song expired | 48-hour TTL exceeded | Generate new song |
| Suno API unavailable | API down | Retry later |
| Permission denied | User doesn't own song | Check ownership |

---

## Monitoring & Metrics

### Key Metrics

- Generation success rate (target: > 95%)
- Average generation time
- API response times
- Error rates (target: < 1%)
- User engagement with switcher

### Monitoring Queries

```sql
-- Generation success rate
SELECT COUNT(*) as total, 
       SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as successful
FROM songs
WHERE created_at > NOW() - INTERVAL 1 HOUR

-- Variation preference
SELECT primary_variation_index, COUNT(*) as count
FROM songs
WHERE created_at > NOW() - INTERVAL 1 DAY
GROUP BY primary_variation_index
```

---

## Troubleshooting Quick Reference

### Switcher Not Showing

- Check `variations.length >= 2`
- Verify component is rendered
- Check CSS is loaded
- Clear browser cache

### Switching Doesn't Work

- Check network connection
- Verify API endpoints are working
- Check browser console for errors
- Try refreshing page

### Audio Doesn't Play

- Wait for audio to load
- Check browser audio permissions
- Try clicking play button
- Refresh page

### Lyrics Don't Update

- Wait for lyrics to load
- Check internet connection
- Refresh page
- Clear browser cache

---

## Related Documentation

### LearningSong Documentation

- [API Setup Guide](./api-setup-guide.md) - Configure external APIs
- [Accessibility Guide](./accessibility-guide.md) - General accessibility practices
- [Quick Start Guide](./quick-start-guide.md) - Getting started with LearningSong

### External Resources

- [Suno API Documentation](https://sunoapi.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)
- [FastAPI Documentation](https://fastapi.tiangolo.com)

---

## Document Maintenance

### Last Updated

- **Date:** December 1, 2025
- **Version:** 1.0
- **Status:** Complete

### Update History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-01 | 1.0 | Initial documentation |

### Contributing

To update documentation:

1. Edit the relevant `.md` file
2. Update the "Last Updated" date
3. Add entry to "Update History"
4. Submit pull request
5. Get review from team

---

## Quick Links

### Documentation Files

- [User Guide](./dual-song-user-guide.md)
- [API Documentation](./dual-song-selection-api.md)
- [SongSwitcher Component](./song-switcher-component.md)
- [Suno Model Configuration](./suno-model-configuration.md)
- [Migration Guide](./dual-song-migration-guide.md)

### Specification Files

- [Requirements](../.kiro/specs/dual-song-selection/requirements.md)
- [Design](../.kiro/specs/dual-song-selection/design.md)
- [Tasks](../.kiro/specs/dual-song-selection/tasks.md)

### Code Files

- Backend API: `backend/app/api/songs.py`
- Backend Services: `backend/app/services/suno_client.py`, `backend/app/services/song_storage.py`
- Frontend Component: `frontend/src/components/SongSwitcher.tsx`
- Frontend Hook: `frontend/src/hooks/useSongSwitcher.ts`
- Frontend API: `frontend/src/api/songs.ts`

### Test Files

- Backend Tests: `backend/tests/test_dual_song_*.py`
- Frontend Tests: `frontend/tests/SongSwitcher.test.tsx`
- E2E Tests: `backend/tests/test_e2e_dual_song_selection.py`

---

## Support

### Getting Help

1. **Check Documentation** - Start with relevant guide above
2. **Search FAQ** - Most questions answered in user guide
3. **Check Troubleshooting** - Common issues and solutions
4. **Contact Support** - If nothing else works

### Reporting Issues

- **Bug Reports:** Include error message, steps to reproduce, browser/OS
- **Feature Requests:** Describe desired behavior and use case
- **Documentation Issues:** Point out unclear sections or missing info

---

## Summary

This documentation provides comprehensive coverage of the dual song selection feature:

- **User Guide** for end users
- **API Documentation** for backend developers
- **Component Documentation** for frontend developers
- **Configuration Guide** for system administrators
- **Migration Guide** for deployment engineers

All documentation is cross-referenced and organized by audience. Start with the guide relevant to your role and refer to other sections as needed.

For questions or issues, refer to the troubleshooting sections or contact support.

