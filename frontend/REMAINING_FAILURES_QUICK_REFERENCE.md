# Remaining 3 Test Failures - Quick Reference

## Status
- **Total Tests**: 762
- **Passing**: 759 (99.6%)
- **Failing**: 3 (0.4%)

---

## Failure #1: LineLevelSync.integration.test.tsx
**Test**: "auto-scrolls to keep current line visible"

| Aspect | Details |
|--------|---------|
| **Error** | `expect(jest.fn()).toHaveBeenCalled()` - scrollIntoView not called |
| **File** | `frontend/tests/LineLevelSync.integration.test.tsx:155-170` |
| **Issue** | Component doesn't call `scrollIntoView()` when in line-level sync mode |
| **Fix** | Add `useEffect` to call `scrollIntoView()` on current line element |

**Quick Fix**:
```typescript
// In LyricsDisplay or similar component
useEffect(() => {
  const currentLineElement = document.querySelector('[data-current-line="true"]')
  if (currentLineElement && syncMode === 'line') {
    currentLineElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}, [currentTime, syncMode])
```

---

## Failure #2: SongPlaybackPage.offset.test.tsx
**Test**: "updates offset when slider changes"

| Aspect | Details |
|--------|---------|
| **Error** | Offset value remains "0ms" after slider interaction |
| **File** | `frontend/tests/SongPlaybackPage.offset.test.tsx:184-201` |
| **Issue** | Slider change event not properly updating offset state |
| **Fix** | Use proper event simulation instead of pointer API |

**Quick Fix**:
```typescript
// In test - replace pointer API with direct event
const slider = screen.getByTestId('offset-slider') as HTMLInputElement
await user.clear(slider)
await user.type(slider, '500')  // Set to 500ms

// Or use fireEvent
fireEvent.change(slider, { target: { value: '500' } })
```

---

## Failure #3: SongSwitcher.integration.test.tsx
**Test**: "switches audio URL when variation is selected"

| Aspect | Details |
|--------|---------|
| **Error** | `aria-current="true"` not set after clicking variation button |
| **File** | `frontend/tests/SongSwitcher.integration.test.tsx:131-149` |
| **Issue** | Click handler not updating `primaryVariationIndex` in store |
| **Fix** | Ensure button click updates store and component sets aria-current |

**Quick Fix**:
```typescript
// In SongSwitcher component
<button
  aria-current={primaryVariationIndex === index ? 'true' : 'false'}
  onClick={() => {
    useSongPlaybackStore.setState({ primaryVariationIndex: index })
  }}
>
  Version {index + 1}
</button>
```

---

## Common Pattern

All 3 failures follow the same pattern:
1. **User interaction** (scroll, slider change, button click)
2. **State not updating** in component or store
3. **DOM not reflecting** the new state (attribute, value, or behavior)

## Investigation Checklist

For each failure:
- [ ] Verify the component has the event handler
- [ ] Check if the handler is updating the store/state
- [ ] Confirm the component re-renders after state change
- [ ] Verify the DOM reflects the new state
- [ ] Check if test is properly simulating the user interaction

## Next Steps

1. **Start with Failure #2** (simplest - just slider value)
2. **Then Failure #3** (button click and aria attribute)
3. **Finally Failure #1** (scroll behavior - most complex)

Each fix should take 5-15 minutes once you understand the component logic.
