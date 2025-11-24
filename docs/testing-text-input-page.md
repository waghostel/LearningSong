# Testing the Text Input Page

This guide will help you test the Text Input Page (Page A) that was built according to the spec in `.kiro/specs/page-a-text-input`.

## Quick Start

### 1. Start the Development Server

```bash
cd frontend
pnpm dev
```

The application will start at: **http://localhost:5173**

### 2. Open in Browser

Navigate to `http://localhost:5173` - you should see the Text Input Page as the home page.

---

## What Was Built

The Text Input Page includes the following components:

### ✅ Core Components
- **TextInputArea**: Large textarea for educational content (max 10,000 words)
- **Character Counter**: Real-time word count with visual warnings
- **Search Toggle**: Enable/disable Google Search grounding
- **Rate Limit Indicator**: Shows remaining songs (X/3)
- **Generate Button**: Submits content to generate lyrics

### ✅ Features Implemented
- Input validation (empty, max 10,000 words)
- Real-time word counting
- Visual feedback (warnings, errors)
- Rate limit tracking
- Loading states
- Error handling with user-friendly messages
- Responsive design
- Accessibility (WCAG 2.1 AA compliant)

---

## Testing Scenarios

### Scenario 1: Basic Text Input ✏️

**Steps:**
1. Open http://localhost:5173
2. Type or paste educational content into the text area
3. Observe the word counter updating in real-time

**Expected Results:**
- Word count updates as you type
- Text area is responsive and easy to use
- No lag or performance issues

---

### Scenario 2: Word Count Validation ⚠️

**Test Case A: Normal Input (< 9,000 words)**
1. Paste content with ~5,000 words
2. Check the counter display

**Expected:** Counter shows normal state (no warning colors)

**Test Case B: Warning State (9,000-10,000 words)**
1. Paste content with ~9,500 words
2. Check the counter and text area border

**Expected:** 
- Counter shows warning (yellow/amber color)
- Text area may have yellow border
- Button remains enabled

**Test Case C: Error State (> 10,000 words)**
1. Paste content with > 10,000 words
2. Check the counter and button state

**Expected:**
- Counter shows error (red color)
- Text area has red border
- Generate button is disabled
- Error message appears

---

### Scenario 3: Search Toggle 🔍

**Steps:**
1. Locate the "Enrich with Google Search" toggle
2. Click to enable it
3. Hover over the info icon (if present) to see tooltip
4. Click again to disable it

**Expected Results:**
- Toggle switches between ON/OFF states
- Visual indicator shows current state
- Tooltip explains what search grounding does
- State persists while on the page

---

### Scenario 4: Rate Limit Display 🎵

**Steps:**
1. Look for the rate limit indicator (usually top-right or near the button)
2. Check the display format

**Expected Results:**
- Shows "X/3 songs remaining today" or similar
- Color coding:
  - **Green**: 3 remaining
  - **Yellow**: 1-2 remaining  
  - **Red**: 0 remaining
- If limit reached, shows countdown timer

**Note:** Since this is a frontend-only test without backend, the rate limit may show a default value or mock data.

---

### Scenario 5: Generate Button States 🎯

**Test Case A: Disabled States**

Test that the button is disabled when:
1. Text area is empty
2. Content exceeds 10,000 words
3. Rate limit is reached (0/3)
4. Generation is in progress

**Test Case B: Enabled State**
1. Enter valid content (1-10,000 words)
2. Ensure rate limit is not reached
3. Click the "Generate Lyrics" button

**Expected:**
- Button shows loading state (spinner)
- Button text changes to "Generating..." or similar
- Button is disabled during generation

**Note:** Without a backend running, you'll see a network error. This is expected!

---

### Scenario 6: Error Handling 🚨

**Test Case A: Empty Content**
1. Leave text area empty
2. Try to click Generate button

**Expected:** Button is disabled, cannot submit

**Test Case B: Network Error (No Backend)**
1. Enter valid content
2. Click Generate button
3. Wait for response

**Expected:**
- Error toast/message appears
- Message is user-friendly (not technical)
- Retry option may be available
- Button returns to normal state

---

### Scenario 7: Responsive Design 📱

**Steps:**
1. Open browser DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test different screen sizes:
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1920px)

**Expected Results:**
- Layout adapts to screen size
- All components remain accessible
- Text is readable
- Buttons are touch-friendly on mobile
- No horizontal scrolling

---

### Scenario 8: Accessibility Testing ♿

**Keyboard Navigation:**
1. Use Tab key to navigate through components
2. Use Enter/Space to activate buttons and toggles
3. Use Shift+Tab to navigate backwards

**Expected:**
- All interactive elements are reachable
- Focus indicators are visible
- Logical tab order
- Can complete all actions with keyboard only

**Screen Reader Testing (Optional):**
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate through the page
3. Verify all elements are announced properly

---

## Sample Test Content

### Short Content (for Search Grounding)
```
Photosynthesis in plants
```

### Medium Content (~100 words)
```
Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar. During photosynthesis, plants take in carbon dioxide (CO2) and water (H2O) from the air and soil. Within the plant cell, the water is oxidized, meaning it loses electrons, while the carbon dioxide is reduced, meaning it gains electrons. This transforms the water into oxygen and the carbon dioxide into glucose. The plant then releases the oxygen back into the air, and stores energy within the glucose molecules.
```

### Large Content (~500 words)
Use any educational article or textbook excerpt. You can find sample content at:
- Wikipedia articles
- Khan Academy lessons
- Educational blog posts

### Maximum Content (10,000 words)
Generate using: https://www.lipsum.com/ or paste multiple articles together.

---

## Common Issues & Solutions

### Issue 1: Port Already in Use
**Error:** `Port 5173 is already in use`

**Solution:**
```bash
# Kill the process using port 5173
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use a different port:
pnpm dev -- --port 5174
```

### Issue 2: Dependencies Not Installed
**Error:** Module not found errors

**Solution:**
```bash
cd frontend
pnpm install
```

### Issue 3: TypeScript Errors
**Error:** Type errors in console

**Solution:**
```bash
# Check TypeScript compilation
pnpm build
```

### Issue 4: Styles Not Loading
**Error:** Page looks unstyled

**Solution:**
- Check if Tailwind CSS is configured
- Verify `index.css` is imported in `main.tsx`
- Clear browser cache (Ctrl+Shift+R)

---

## Testing with Backend (Optional)

If you want to test the full flow with the backend:

### 1. Start Backend Server

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

Backend will run at: **http://localhost:8000**

### 2. Configure Frontend Proxy

The frontend should already be configured to proxy API requests to `http://localhost:8000`. Check `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
```

### 3. Test Full Flow

1. Start both backend and frontend
2. Enter content in text area
3. Click "Generate Lyrics"
4. Should see actual lyrics generated (if backend is fully implemented)

---

## Automated Tests

The page has comprehensive test coverage. Run tests with:

```bash
cd frontend
pnpm test
```

### Test Files
- `tests/TextInputPage.integration.test.tsx` - Full page integration tests
- `tests/TextInputArea.test.tsx` - Text area component tests
- `tests/SearchToggle.test.tsx` - Search toggle tests
- `tests/RateLimitIndicator.test.tsx` - Rate limit display tests
- `tests/GenerateButton.test.tsx` - Button state tests
- `tests/lyrics-api.test.ts` - API client tests

### Test Coverage
Run with coverage report:
```bash
pnpm test:coverage
```

View HTML report at: `frontend/coverage/lcov-report/index.html`

---

## Visual Testing Checklist

Use this checklist when manually testing:

- [ ] Page loads without errors
- [ ] Text area is visible and functional
- [ ] Word counter displays and updates
- [ ] Search toggle works
- [ ] Rate limit indicator is visible
- [ ] Generate button is styled correctly
- [ ] Loading states work
- [ ] Error messages are clear
- [ ] Layout is responsive on mobile
- [ ] All text is readable
- [ ] Colors have sufficient contrast
- [ ] Focus indicators are visible
- [ ] No console errors
- [ ] No accessibility warnings

---

## Next Steps

After testing the Text Input Page:

1. **Review Test Results**: Check if all scenarios pass
2. **Report Issues**: Document any bugs or unexpected behavior
3. **Backend Integration**: Test with actual backend when available
4. **Page B Development**: Move to lyrics editing page (next spec)

---

## Additional Resources

- **Spec Document**: `.kiro/specs/page-a-text-input/`
- **Component Source**: `frontend/src/pages/TextInputPage.tsx`
- **API Documentation**: `http://localhost:8000/docs` (when backend is running)
- **Design System**: shadcn/ui components in `frontend/src/components/ui/`

---

## Questions or Issues?

If you encounter any problems:
1. Check the browser console for errors (F12)
2. Review the test files for expected behavior
3. Verify all dependencies are installed
4. Ensure you're using the correct Node.js version (18+)
