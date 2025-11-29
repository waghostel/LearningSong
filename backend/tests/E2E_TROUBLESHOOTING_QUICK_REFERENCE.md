# E2E Testing Troubleshooting Quick Reference

## Quick Diagnostics

### Is Chrome running with remote debugging?

```bash
curl http://localhost:9222/json
```

✅ **Success:** JSON response with browser tabs  
❌ **Failure:** Connection refused

**Fix:** Start Chrome with remote debugging:
```bash
chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

---

### Is the frontend dev server running?

```bash
curl http://localhost:5173
```

✅ **Success:** HTML response  
❌ **Failure:** Connection refused

**Fix:** Start the frontend:
```bash
cd frontend && pnpm dev
```

---

### Is Chrome DevTools MCP configured?

Check `.kiro/settings/mcp.json` for:
```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest", "--browserUrl=http://127.0.0.1:9222"],
      "disabled": false
    }
  }
}
```

✅ **Success:** Configuration exists and `disabled: false`  
❌ **Failure:** Missing or `disabled: true`

**Fix:** Add/update configuration and restart Kiro

---

## Common Error Messages

### "Cannot connect to browser"

**Cause:** Chrome not running with remote debugging

**Fix:**
```bash
# Windows
taskkill /F /IM chrome.exe
chrome.exe --remote-debugging-port=9222 --user-data-dir=C:\temp\chrome-debug

# macOS/Linux
killall chrome
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
```

---

### "Cannot navigate to http://localhost:5173"

**Cause:** Frontend dev server not running

**Fix:**
```bash
cd frontend
pnpm install  # First time only
pnpm dev
```

---

### "Element not found"

**Cause:** Page not fully loaded or selector changed

**Fix:**
1. Add wait before interaction:
   ```python
   await wait_for_element("#element-id", timeout=10)
   ```

2. Verify selector in browser DevTools

3. Increase timeout for slow elements

---

### "Network interception not working"

**Cause:** Mock setup not initialized or patterns don't match

**Fix:**
1. Verify mock initialization:
   ```python
   from e2e_network_mock import setup_network_mocks
   await setup_network_mocks()
   ```

2. Check mock patterns in `e2e_network_mock.py`

3. Use JavaScript injection as fallback

---

### "Screenshots not saving"

**Cause:** Directory doesn't exist or permission denied

**Fix:**
```bash
# Create directories
mkdir -p report/e2e-chrome-devtools-testing/page-a
mkdir -p report/e2e-chrome-devtools-testing/page-b
mkdir -p report/e2e-chrome-devtools-testing/page-c

# Fix permissions (macOS/Linux)
chmod -R 755 report
```

---

### "Port 9222 already in use"

**Cause:** Another Chrome instance using the port

**Fix:**
```bash
# Windows
taskkill /F /IM chrome.exe

# macOS/Linux
killall chrome

# Then restart with remote debugging
```

---

## Test Execution Checklist

Before running tests, verify:

- [ ] Chrome running with remote debugging on port 9222
- [ ] Frontend dev server running on port 5173
- [ ] Chrome DevTools MCP enabled in Kiro
- [ ] Report directory exists
- [ ] No port conflicts (9222, 5173)

## Quick Commands

```bash
# Check Chrome remote debugging
curl http://localhost:9222/json

# Check frontend
curl http://localhost:5173

# Check port usage (Windows)
netstat -ano | findstr :9222
netstat -ano | findstr :5173

# Check port usage (macOS/Linux)
lsof -i :9222
lsof -i :5173

# Run all E2E tests
cd backend && poetry run pytest tests/test_e2e*.py -v

# Run specific test
poetry run pytest tests/test_e2e_page_a.py::test_page_a_initial_load -v
```

## Debug Mode

Enable verbose logging for troubleshooting:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

Capture page state at failure:

```python
try:
    await run_test()
except Exception as e:
    await take_screenshot("error-state.png")
    html = await get_page_html()
    console_logs = await get_console_logs()
    print(f"Error: {e}")
    print(f"Console logs: {console_logs}")
    raise
```

## Getting Help

1. Check full troubleshooting guide: `E2E_TEST_EXECUTION_GUIDE.md`
2. Review specific test guides: `PAGE_A_TEST_GUIDE.md`, etc.
3. Check console logs and network activity
4. Consult development team

---

**Quick Tip:** Most issues are resolved by ensuring Chrome and frontend are running correctly!
