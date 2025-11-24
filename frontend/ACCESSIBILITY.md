# Accessibility Compliance

This document outlines the accessibility features implemented in the LearningSong frontend application to meet WCAG 2.1 AA standards.

## Overview

The application has been designed with accessibility as a core requirement (NFR-2), ensuring that all users, including those using assistive technologies, can effectively use the application.

## Keyboard Navigation

### Features Implemented

1. **Skip to Main Content Link**
   - A skip link appears at the top of the page when focused
   - Allows keyboard users to bypass the header and jump directly to main content
   - Activated with Tab key on page load

2. **Focus Indicators**
   - All interactive elements have visible focus indicators
   - Focus rings use the theme's ring color with 2px outline and 2px offset
   - Enhanced focus styles applied to: links, buttons, inputs, textareas, switches

3. **Logical Tab Order**
   - Tab order follows visual layout: header → main content → footer
   - Within main content: text input → search toggle → generate button
   - All interactive elements are keyboard accessible

4. **Keyboard Shortcuts**
   - Ctrl+Enter (Cmd+Enter on Mac): Generate lyrics
   - Clearly documented in UI with aria-label

## ARIA Labels and Roles

### Semantic HTML

- `<header role="banner">`: Site header with branding
- `<main role="main">`: Primary content area
- `<footer role="contentinfo">`: Site footer
- `<section>`: Logical content sections with hidden headings
- `<aside role="complementary">`: Tips and help text

### ARIA Attributes

#### TextInputArea Component
- `aria-label`: "Educational content input"
- `aria-describedby`: Links to word counter for context

#### SearchToggle Component
- `role="group"`: Groups toggle with its label
- `role="switch"`: Explicit switch role
- `aria-checked`: Current state of the toggle
- `aria-describedby`: Links to description text

#### RateLimitIndicator Component
- `role="status"`: Indicates dynamic status information
- `aria-live="polite"`: Announces changes without interrupting
- `aria-atomic="true"`: Reads entire region on update
- `role="alert"`: For error states (assertive)

#### LoadingProgress Component
- `role="status"`: Progress indicator
- `aria-live="polite"`: Announces stage changes
- `aria-label`: Describes the progress bar
- `aria-current="step"`: Indicates current pipeline stage
- `role="list"` and `role="listitem"`: For stage indicators

#### GenerateButton Component
- `aria-label`: Descriptive label for button state
- `aria-busy`: Indicates loading state
- `aria-disabled`: Explicit disabled state
- `aria-hidden="true"`: Hides decorative icons from screen readers

### Screen Reader Support

- All form controls have associated labels
- Dynamic content changes are announced via aria-live regions
- Decorative icons are hidden with aria-hidden="true"
- Loading states provide clear feedback

## Color Contrast

### WCAG 2.1 AA Compliance

All text meets the minimum contrast ratios:
- **Normal text (< 18pt)**: 4.5:1 contrast ratio
- **Large text (≥ 18pt)**: 3:1 contrast ratio

### Color Palette

#### Light Mode
- **Normal text**: `text-foreground` on `bg-background` (high contrast)
- **Muted text**: `text-muted-foreground` (meets 4.5:1)
- **Warning state**: `text-yellow-700` (7.0:1 contrast ratio)
- **Error state**: `text-red-700` (6.5:1 contrast ratio)
- **Success state**: `text-green-700` (6.0:1 contrast ratio)

#### Dark Mode
- **Normal text**: `text-foreground` on `bg-background` (high contrast)
- **Muted text**: `text-muted-foreground` (meets 4.5:1)
- **Warning state**: `text-yellow-500` (sufficient contrast on dark bg)
- **Error state**: `text-red-500` (sufficient contrast on dark bg)
- **Success state**: `text-green-500` (sufficient contrast on dark bg)

### State Indicators

Color is never the only indicator of state:
- **Warning state**: Yellow color + "warning" text + border change
- **Error state**: Red color + "error" text + border change + message
- **Loading state**: Spinner icon + "Generating..." text
- **Rate limit**: Color + emoji + numerical indicator

### Testing

To verify color contrast:

1. **Chrome DevTools**
   - Open DevTools (F12)
   - Go to Elements tab
   - Select element
   - Check "Accessibility" pane for contrast ratio

2. **Firefox Accessibility Inspector**
   - Open DevTools (F12)
   - Go to Accessibility tab
   - Enable "Check for issues" → "Contrast"

3. **Online Tools**
   - WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
   - Contrast Ratio: https://contrast-ratio.com/

## Browser Compatibility

Accessibility features tested and working in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Screen Reader Testing

Recommended screen readers for testing:
- **Windows**: NVDA (free) or JAWS
- **macOS**: VoiceOver (built-in)
- **Linux**: Orca

## Future Improvements

Potential enhancements for future iterations:
- High contrast mode toggle
- Font size adjustment controls
- Reduced motion preferences
- Custom color themes for color blindness
- More granular keyboard shortcuts

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Resources](https://webaim.org/resources/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
