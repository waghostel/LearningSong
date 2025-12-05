# Remaining 3 Test Failures Analysis

## Overview
After fixing the SongHistory tests, 3 test failures remain out of 762 total tests (99.6% pass rate).

---

## Failure 1: LineLevelSync.integration.test.tsx

### Test Name
**"auto-scrolls to keep current line visible"** (Line 155-170)

### Error
```
expect(jest.fn()).toHaveBeenCalled()
Expected number of calls: >= 1
```

### Code
```typescript
it('auto-scrolls to keep current line visible', async () => {
  useSongPlaybackStore.setState({
    ...mockSongWithLines,
    currentTime: 1.5,
  })
  
  saveSyncMode('line')
  
  renderWithProviders()

  await waitFor(() => {
    expect(screen.getByText(/First line of lyrics/)).toBeInTheDocument()
  })
  
  // Verify scrollIntoView was called (it's mocked at the top of the file)
  expect(Element.prototype.scrollIntoView).toHaveBeenCalled()  // ← FAILS HERE
})
```

### Root Cause
The `Element.prototype.scrollIntoView` mock (set up at line 20) is not being called when the component renders with line-level sync mode active.

### Likely Issues
1. The component isn't calling `scrollIntoView()` on the current line element
2. The line element isn't being rendered with the correct class/role to trigger scroll
3. The sync mode isn't properly activating the auto-scroll behavior
4. The component logic for auto-scrolling to the current line may be missing or broken

### Suggested Fix
- Check if `LyricsDisplay` or related component calls `scrollIntoView()` when in line-level sync mode
- Verify the current line element is being identified correctly
- Add a `useEffect` hook to call `scrollIntoView()` when the current line changes
- Debug: Add `console.log()` to see if the scroll function is being called

---

## Failure 2: SongPlaybackPage.offset.test.tsx

### Test Name
**"updates offset when slider changes"** (Line 184-201)

### Error
```
expect(received).not.toContain(expected) // indexOf
Expected substring: not "0ms"
```

### Code
```typescript
it('updates offset when slider changes', async () => {
  const user = userEvent.setup()
  useSongPlaybackStore.setState(mockSongData)
  
  renderWithProviders('/playback/song-123')

  await waitFor(() => {
    expect(screen.getByTestId('offset-slider')).toBeInTheDocument()
  })

  const slider = screen.getByTestId('offset-slider') as HTMLInputElement
  // For range input, use change event instead of clear/type
  await user.pointer({ keys: '[MouseLeft>]', target: slider })
  await user.pointer({ coords: { x: 100 }, keys: '[/MouseLeft]' })

  await waitFor(() => {
    const offsetValue = screen.getByTestId('offset-value')
    // Value should have changed from 0
    expect(offsetValue.textContent).not.toContain('0ms')  // ← FAILS HERE
  })
})
```

### Root Cause
The slider interaction (mouse pointer movement) isn't properly updating the offset value. The offset remains at "0ms" after the slider is moved.

### Likely Issues
1. The `user.pointer()` API isn't properly simulating slider drag
2. The slider's `onChange` handler isn't being triggered
3. The offset state isn't being updated in the store
4. The component isn't re-rendering with the new offset value

### Suggested Fix
- Use `user.tripleClick()` or `user.clear()` + `user.type()` instead of pointer API
- Or use `fireEvent.change()` to directly trigger the change event
- Verify the OffsetControl component has a proper onChange handler
- Check that the offset value is being stored and displayed correctly
- Example fix:
  ```typescript
  await user.clear(slider)
  await user.type(slider, '500')  // Set to 500ms
  ```

---

## Failure 3: SongSwitcher.integration.test.tsx

### Test Name
**"switches audio URL when variation is selected"** (Line 131-149)

### Error
```
expect(element).toHaveAttribute("aria-current", "true")
element.getAttribute("aria-current") === "true"
Expected the element to have attribute:
```

### Code
```typescript
it('switches audio URL when variation is selected', async () => {
  const user = userEvent.setup()
  
  useSongPlaybackStore.setState(mockSongWithVariations)
  
  renderWithProviders()

  await waitFor(() => {
    expect(screen.getByLabelText(/Version 2/)).toBeInTheDocument()
  })

  // Click Version 2
  const version2Button = screen.getByLabelText(/Version 2/)
  await user.click(version2Button)

  // Verify button is now active
  await waitFor(() => {
    expect(version2Button).toHaveAttribute('aria-current', 'true')  // ← FAILS HERE
  })
})
```

### Root Cause
After clicking the "Version 2" button, the `aria-current="true"` attribute is not being set on the button to indicate it's the active variation.

### Likely Issues
1. The click handler isn't updating the `primaryVariationIndex` in the store
2. The component isn't re-rendering after the variation is selected
3. The `aria-current` attribute logic isn't checking the correct state
4. The button click event isn't being properly captured/handled

### Suggested Fix
- Verify the SongSwitcher component has an `onClick` handler that updates the store
- Check that `primaryVariationIndex` is being updated when a variation is clicked
- Ensure the component conditionally sets `aria-current="true"` based on `primaryVariationIndex`
- Add debugging to see if the click is being registered and state is updating
- Example fix in component:
  ```typescript
  <button
    aria-current={primaryVariationIndex === index ? 'true' : 'false'}
    onClick={() => setPrimaryVariationIndex(index)}
  >
    Version {index + 1}
  </button>
  ```

---

## Summary Table

| Test File | Test Name | Error Type | Issue |
|-----------|-----------|-----------|-------|
| LineLevelSync.integration.test.tsx | auto-scrolls to keep current line visible | Mock not called | Scroll behavior not triggered |
| SongPlaybackPage.offset.test.tsx | updates offset when slider changes | Wrong value | Offset stays at 0ms |
| SongSwitcher.integration.test.tsx | switches audio URL when variation is selected | Missing attribute | aria-current not set |

---

## Common Patterns

All 3 failures share a common pattern:
- **State not updating**: Component state isn't changing when expected
- **Event not firing**: User interactions (scroll, slider, click) aren't being properly simulated
- **Attribute/value not changing**: Expected DOM changes aren't happening

## Recommended Investigation Order

1. **Start with SongPlaybackPage.offset.test.tsx** - Simplest issue (value not changing)
2. **Then SongSwitcher.integration.test.tsx** - Attribute not being set
3. **Finally LineLevelSync.integration.test.tsx** - Mock not being called (most complex)

## Next Steps

To fix these, you would need to:
1. Review each test file to understand what it's testing
2. Check the component implementation to see if the feature works in production
3. Verify the test setup and mocks are correct
4. Add debugging/logging to see what's actually happening
5. Adjust the test to properly simulate the user interaction
