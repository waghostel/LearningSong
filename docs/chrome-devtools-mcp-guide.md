# Chrome DevTools MCP Quick Start Guide

## Initial Setup

### 1. Start Chrome with Remote Debugging
```powershell
# Close all Chrome instances first
taskkill /f /im chrome.exe

# Start Chrome with debugging enabled
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList "--remote-debugging-port=9222", "--disable-web-security", "--user-data-dir=C:\temp\chrome-debug"
```

### 2. Verify Connection
```javascript
// Test basic connection
mcp_chrome_devtools_list_pages()
```

## Essential Workflow

### Page Management
```javascript
// Create new page
mcp_chrome_devtools_new_page({ url: "https://example.com" })

// List all pages
mcp_chrome_devtools_list_pages()

// Select specific page
mcp_chrome_devtools_select_page({ pageIdx: 0, bringToFront: true })

// Navigate current page
mcp_chrome_devtools_navigate_page({ type: "url", url: "https://newsite.com" })
```

### Page Analysis
```javascript
// Get page structure (preferred for automation)
mcp_chrome_devtools_take_snapshot()

// Visual screenshot
mcp_chrome_devtools_take_screenshot()

// Execute JavaScript
mcp_chrome_devtools_evaluate_script({
  function: "() => { return document.title; }"
})
```

### Form Automation
```javascript
// Single field
mcp_chrome_devtools_fill({ uid: "element_uid", value: "text" })

// Multiple fields at once (more efficient)
mcp_chrome_devtools_fill_form({
  elements: [
    { uid: "name_field", value: "John Doe" },
    { uid: "email_field", value: "john@example.com" }
  ]
})

// Click elements (buttons, checkboxes, radio buttons)
mcp_chrome_devtools_click({ uid: "submit_button" })
```

### Monitoring & Debugging
```javascript
// Network requests
mcp_chrome_devtools_list_network_requests()
mcp_chrome_devtools_get_network_request({ reqid: 123 })

// Console messages
mcp_chrome_devtools_list_console_messages()
mcp_chrome_devtools_get_console_message({ msgid: 456 })
```

## Best Practices

### 1. Always Take Snapshots First
- Use `take_snapshot()` to get element UIDs before interactions
- Snapshots show the current page state and available elements
- UIDs change after page updates, so retake snapshots as needed

### 2. Efficient Element Selection
```javascript
// ✅ Good: Use specific UIDs from snapshots
mcp_chrome_devtools_click({ uid: "3_15" })

// ❌ Avoid: Guessing element selectors
```

### 3. Batch Operations
```javascript
// ✅ Efficient: Fill multiple fields at once
mcp_chrome_devtools_fill_form({
  elements: [
    { uid: "field1", value: "value1" },
    { uid: "field2", value: "value2" },
    { uid: "field3", value: "value3" }
  ]
})

// ❌ Inefficient: Multiple separate calls
mcp_chrome_devtools_fill({ uid: "field1", value: "value1" })
mcp_chrome_devtools_fill({ uid: "field2", value: "value2" })
mcp_chrome_devtools_fill({ uid: "field3", value: "value3" })
```

### 4. Error Handling
```javascript
// Check for "No page selected" error
// Solution: Create or select a page first

// Check for "Could not connect to Chrome" error  
// Solution: Restart Chrome with debugging flags

// Check for invalid UID errors
// Solution: Take fresh snapshot to get current UIDs
```

## Common Use Cases

### Web Scraping
1. Navigate to target page
2. Take snapshot to analyze structure
3. Use `evaluate_script()` to extract data
4. Monitor network requests for API calls

### Form Testing
1. Navigate to form page
2. Take snapshot to identify form fields
3. Use `fill_form()` for efficient data entry
4. Click submit and monitor network response
5. Verify success page or error messages

### Performance Testing
1. Start performance trace: `performance_start_trace()`
2. Navigate or interact with page
3. Stop trace: `performance_stop_trace()`
4. Analyze insights: `performance_analyze_insight()`

### API Testing via Browser
1. Navigate to web app
2. Monitor network requests during interactions
3. Inspect request/response details
4. Verify API behavior in real browser context

## Troubleshooting

### Chrome Won't Start
```powershell
# Kill all Chrome processes
Get-Process chrome | Stop-Process -Force

# Check if port 9222 is in use
netstat -an | findstr 9222

# Try alternative port
Start-Process chrome -ArgumentList "--remote-debugging-port=9223"
```

### Connection Issues
- Ensure Chrome is running with `--remote-debugging-port=9222`
- Check Windows Firewall isn't blocking localhost:9222
- Try restarting Chrome with debug flags
- Verify no other applications are using port 9222

### Element Not Found
- Take fresh snapshot after page changes
- Elements get new UIDs after DOM updates
- Use `evaluate_script()` for complex element selection
- Check if element is in viewport or hidden

## Advanced Tips

### Custom JavaScript Execution
```javascript
// Complex data extraction
mcp_chrome_devtools_evaluate_script({
  function: `() => {
    return Array.from(document.querySelectorAll('.product')).map(el => ({
      name: el.querySelector('.name')?.textContent,
      price: el.querySelector('.price')?.textContent,
      url: el.querySelector('a')?.href
    }));
  }`
})
```

### Network Request Filtering
```javascript
// Filter by resource type
mcp_chrome_devtools_list_network_requests({
  resourceTypes: ["xhr", "fetch"],
  pageSize: 50
})
```

### Console Message Filtering
```javascript
// Only errors and warnings
mcp_chrome_devtools_list_console_messages({
  types: ["error", "warn"]
})
```

This MCP is perfect for automated testing, web scraping, form automation, and debugging web applications in a real browser environment.