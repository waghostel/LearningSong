# Visual Testing Checklist - Text Input Page

Use this checklist to systematically test the Text Input Page UI and UX.

## Setup

1. Start the development server:
   ```bash
   cd frontend
   pnpm dev
   ```

2. Open http://localhost:5173 in your browser

3. Open DevTools (F12) to check for console errors

---

## Component Testing Checklist

### 1. Page Layout ✅

- [ ] Page loads without errors
- [ ] No console errors or warnings
- [ ] Page title is visible
- [ ] All components are rendered
- [ ] Layout is centered and well-spaced
- [ ] Background color is appropriate
- [ ] Text is readable with good contrast

**What to Look For:**
- Clean, professional appearance
- Consistent spacing between elements
- No overlapping components
- Proper alignment

---

### 2. Text Input Area ✅

#### Basic Functionality
- [ ] Text area is visible and prominent
- [ ] Placeholder text is clear (if present)
- [ ] Can click to focus
- [ ] Can type text
- [ ] Can paste text (Ctrl+V)
- [ ] Can select text
- [ ] Can delete text
- [ ] Text wraps properly
- [ ] Scrollbar appears for long content

#### Visual States
- [ ] **Default state**: Neutral border color
- [ ] **Focus state**: Border highlights when focused
- [ ] **Hover state**: Subtle visual feedback on hover
- [ ] **Disabled state**: Grayed out when disabled (if applicable)

#### Accessibility
- [ ] Has visible label or aria-label
- [ ] Focus indicator is clear
- [ ] Can navigate with Tab key
- [ ] Screen reader announces it properly (optional)

**Test Content:**
```
Short text: "Photosynthesis"
Medium text: 100-word paragraph
Long text: 5,000-word article
Very long: 10,000+ words
```

---

### 3. Word Counter ✅

#### Display
- [ ] Counter is visible
- [ ] Shows current word count
- [ ] Updates in real-time as you type
- [ ] Format is clear (e.g., "1,234 / 10,000 words")

#### Color States
- [ ] **Green/Normal** (0-8,999 words): Default color
- [ ] **Yellow/Warning** (9,000-10,000 words): Warning color
- [ ] **Red/Error** (>10,000 words): Error color

#### Behavior
- [ ] Counts words correctly (not characters)
- [ ] Handles empty input (shows 0)
- [ ] Handles whitespace correctly
- [ ] Updates smoothly without lag
- [ ] No flickering or jumping

**Test Cases:**
```
Empty: "" → 0 words
Single word: "Hello" → 1 word
Multiple words: "Hello world" → 2 words
Extra spaces: "Hello    world" → 2 words (not 3+)
Line breaks: "Hello\n\nworld" → 2 words
```

---

### 4. Search Toggle ✅

#### Visual Elements
- [ ] Toggle switch is visible
- [ ] Label text is clear ("Enrich with Google Search" or similar)
- [ ] Icon is present (if applicable)
- [ ] Tooltip/info icon is visible
- [ ] Layout is clean and aligned

#### Functionality
- [ ] Can click to toggle ON
- [ ] Can click to toggle OFF
- [ ] Visual state changes (switch moves, color changes)
- [ ] Keyboard accessible (Space/Enter to toggle)
- [ ] Tooltip shows on hover (if present)

#### States
- [ ] **OFF state**: Default, switch is left/gray
- [ ] **ON state**: Switch is right/colored (blue/green)
- [ ] **Hover state**: Subtle highlight
- [ ] **Focus state**: Focus ring visible
- [ ] **Disabled state**: Grayed out (if applicable)

**Test:**
1. Click toggle → should turn ON
2. Click again → should turn OFF
3. Tab to toggle → press Space → should toggle
4. Hover over info icon → tooltip appears

---

### 5. Rate Limit Indicator ✅

#### Display
- [ ] Indicator is visible
- [ ] Shows format like "X/3 songs remaining"
- [ ] Icon is present (🎵 or similar)
- [ ] Text is readable
- [ ] Position is logical (top-right or near button)

#### Color Coding
- [ ] **Green**: 3 remaining (full quota)
- [ ] **Yellow**: 1-2 remaining (warning)
- [ ] **Red**: 0 remaining (limit reached)

#### Countdown Timer (when limit reached)
- [ ] Timer appears when 0/3
- [ ] Shows hours, minutes, seconds
- [ ] Updates every second
- [ ] Format is clear (e.g., "Resets in 5h 23m 45s")

**Test Cases:**
- Mock 3/3 remaining → should be green
- Mock 2/3 remaining → should be yellow
- Mock 1/3 remaining → should be yellow
- Mock 0/3 remaining → should be red + show timer

---

### 6. Generate Button ✅

#### Visual Design
- [ ] Button is prominent and easy to find
- [ ] Text is clear ("Generate Lyrics" or similar)
- [ ] Size is appropriate (not too small)
- [ ] Color stands out (primary color)
- [ ] Icon is present (if applicable)

#### States
- [ ] **Enabled**: Full color, clickable
- [ ] **Disabled**: Grayed out, cursor shows not-allowed
- [ ] **Hover**: Slightly darker or highlighted
- [ ] **Active/Pressed**: Pressed effect
- [ ] **Loading**: Shows spinner, text changes to "Generating..."
- [ ] **Focus**: Focus ring visible

#### Disabled Conditions
Button should be disabled when:
- [ ] Text area is empty
- [ ] Content exceeds 10,000 words
- [ ] Rate limit is 0/3
- [ ] Already generating (loading state)

**Test:**
1. Empty input → button disabled
2. Valid input → button enabled
3. Click button → shows loading state
4. Hover over button → visual feedback
5. Tab to button → focus ring visible

---

### 7. Loading State ✅

#### During Generation
- [ ] Button shows spinner/loading icon
- [ ] Button text changes (e.g., "Generating...")
- [ ] Button is disabled
- [ ] Cursor shows waiting state
- [ ] Progress indicator appears (if implemented)

#### Progress Stages (if implemented)
- [ ] Shows current stage (cleaning, summarizing, etc.)
- [ ] Progress bar updates
- [ ] Estimated time remaining shown
- [ ] Cancel button available

**Test:**
1. Click Generate with valid input
2. Observe loading state
3. Check if progress updates
4. Verify button is disabled during loading

---

### 8. Error Messages ✅

#### Display
- [ ] Error messages are visible
- [ ] Use toast/notification or inline display
- [ ] Text is user-friendly (not technical)
- [ ] Color indicates error (red/orange)
- [ ] Icon indicates error (⚠️ or ❌)

#### Error Types
- [ ] **Empty input**: "Please enter some content"
- [ ] **Too long**: "Content exceeds 10,000 words"
- [ ] **Rate limit**: "Daily limit reached. Resets in X hours"
- [ ] **Network error**: "Connection failed. Please try again"
- [ ] **Server error**: "Something went wrong. Please try again"

#### Behavior
- [ ] Error appears immediately
- [ ] Error is dismissible (X button or auto-dismiss)
- [ ] Error doesn't block the UI
- [ ] Multiple errors don't stack awkwardly
- [ ] Retry option available (if applicable)

**Test:**
1. Submit empty → see error
2. Submit >10,000 words → see error
3. Submit with no backend → see network error
4. Dismiss error → error disappears

---

### 9. Responsive Design 📱

#### Mobile (375px - 767px)
- [ ] Layout stacks vertically
- [ ] Text area is full width
- [ ] Button is full width or prominent
- [ ] All text is readable
- [ ] Touch targets are large enough (44x44px minimum)
- [ ] No horizontal scrolling
- [ ] Counter is visible
- [ ] Toggle is accessible

#### Tablet (768px - 1023px)
- [ ] Layout adapts appropriately
- [ ] Components are well-spaced
- [ ] Text area is comfortable size
- [ ] All features accessible

#### Desktop (1024px+)
- [ ] Layout is centered with max-width
- [ ] Generous spacing
- [ ] Components are well-proportioned
- [ ] No wasted space

**Test:**
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test each breakpoint
4. Rotate device (portrait/landscape)

---

### 10. Accessibility ♿

#### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Can activate all buttons with Enter/Space
- [ ] Can toggle switch with Space
- [ ] Can escape from modals/dialogs (if any)
- [ ] No keyboard traps

#### Screen Reader (Optional)
- [ ] All elements have proper labels
- [ ] Error messages are announced
- [ ] Loading states are announced
- [ ] Button states are announced
- [ ] Form fields have labels

#### Visual Accessibility
- [ ] Text contrast ratio ≥ 4.5:1 (normal text)
- [ ] Text contrast ratio ≥ 3:1 (large text)
- [ ] Focus indicators have ≥ 3:1 contrast
- [ ] Color is not the only indicator (use icons too)
- [ ] Text is resizable up to 200%

**Test:**
1. Tab through page → all elements reachable
2. Use only keyboard → complete all actions
3. Check contrast with DevTools
4. Zoom to 200% → still usable

---

### 11. Performance ⚡

#### Load Time
- [ ] Page loads in < 2 seconds
- [ ] No flash of unstyled content (FOUC)
- [ ] Images load quickly (if any)
- [ ] Fonts load without blocking

#### Runtime Performance
- [ ] Typing is smooth (no lag)
- [ ] Counter updates without lag
- [ ] Scrolling is smooth
- [ ] No memory leaks (check DevTools)
- [ ] No excessive re-renders

**Test:**
1. Open DevTools → Performance tab
2. Record while typing
3. Check for long tasks (>50ms)
4. Check memory usage

---

### 12. Browser Compatibility 🌐

Test in multiple browsers:

- [ ] **Chrome** (latest)
- [ ] **Firefox** (latest)
- [ ] **Safari** (latest) - Mac only
- [ ] **Edge** (latest)

**What to Check:**
- Layout looks the same
- All features work
- No console errors
- Styles render correctly

---

## Quick Visual Test (5 minutes)

Use this for rapid testing:

1. **Load Page** → No errors, looks good ✅
2. **Type Text** → Counter updates ✅
3. **Toggle Search** → Switch works ✅
4. **Check Rate Limit** → Displays correctly ✅
5. **Click Generate** → Button responds ✅
6. **Resize Window** → Responsive ✅
7. **Tab Navigation** → Keyboard works ✅
8. **Check Console** → No errors ✅

---

## Detailed Visual Test (15 minutes)

Follow all sections above systematically.

---

## Regression Testing

After making changes, re-test:

- [ ] All previous tests still pass
- [ ] New features work as expected
- [ ] No new console errors
- [ ] Performance hasn't degraded
- [ ] Accessibility still compliant

---

## Bug Reporting Template

If you find issues, document them:

```markdown
**Bug Title:** [Brief description]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happens]

**Screenshots:**
[Attach screenshots]

**Environment:**
- Browser: Chrome 120
- OS: Windows 11
- Screen Size: 1920x1080
- Date: 2024-11-24

**Console Errors:**
[Paste any console errors]
```

---

## Sign-Off Checklist

Before considering testing complete:

- [ ] All visual tests pass
- [ ] All automated tests pass (`pnpm test`)
- [ ] No console errors or warnings
- [ ] Responsive on all screen sizes
- [ ] Accessible with keyboard
- [ ] Works in all target browsers
- [ ] Performance is acceptable
- [ ] Documentation is updated

---

**Testing Complete! 🎉**

If all checks pass, the Text Input Page is ready for the next phase of development.
