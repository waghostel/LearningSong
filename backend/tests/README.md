# Backend Tests

This directory contains all backend tests for the LearningSong application.

## Test Structure

```
tests/
├── conftest.py                 # Pytest configuration and fixtures
├── test_api.py                 # General API tests
├── test_auth.py                # Authentication tests
├── test_cache.py               # Cache service tests
├── test_rate_limiter.py        # Rate limiting tests
├── test_google_search.py       # Google Search service tests
├── test_ai_pipeline.py         # AI pipeline tests
├── test_lyrics_api.py          # Lyrics API endpoint tests
├── test_e2e.py                 # End-to-end integration tests
├── E2E_TEST_GUIDE.md           # Manual E2E testing guide
├── E2E_TEST_SUMMARY.md         # E2E testing summary
└── README.md                   # This file
```

## Running Tests

### All Tests
```bash
poetry run pytest
```

### Specific Test File
```bash
poetry run pytest tests/test_lyrics_api.py
```

### With Coverage
```bash
poetry run pytest --cov=app --cov-report=html
```

### E2E Tests Only
```bash
poetry run pytest tests/test_e2e.py -v
```

### Verbose Output
```bash
poetry run pytest -v
```

### Stop on First Failure
```bash
poetry run pytest -x
```

## Test Categories

### Unit Tests
Test individual functions and classes in isolation:
- `test_cache.py` - Cache service functions
- `test_rate_limiter.py` - Rate limiting logic
- `test_google_search.py` - Search service
- `test_auth.py` - Authentication utilities

### Integration Tests
Test multiple components working together:
- `test_lyrics_api.py` - API endpoints with mocked services
- `test_ai_pipeline.py` - Pipeline with mocked LLM calls

### End-to-End Tests
Test complete user flows:
- `test_e2e.py` - Full system integration tests
- `E2E_TEST_GUIDE.md` - Manual testing procedures

## Test Fixtures

Common fixtures are defined in `conftest.py`:

- `client` - Async HTTP client for API testing
- `sample_lyrics` - Sample lyrics text
- `sample_topic` - Sample learning topic

## Mocking Strategy

Tests use `unittest.mock` for external dependencies:

- **Firebase/Firestore**: Mocked to avoid real database calls
- **AI/LLM Services**: Mocked to avoid API costs and ensure deterministic tests
- **Google Search**: Mocked to avoid external API calls
- **Authentication**: Mocked Firebase auth verification

## Coverage Goals

- **Overall**: > 80%
- **Critical Paths**: > 90%
  - Rate limiting
  - Cache logic
  - API endpoints
  - Authentication

## Writing New Tests

### Test Naming Convention
```python
def test_<function_name>_<scenario>():
    """Test that <function> <expected behavior> when <condition>."""
    # Arrange
    # Act
    # Assert
```

### Example Test
```python
@pytest.mark.asyncio
async def test_generate_lyrics_success(client):
    """Test that lyrics generation succeeds with valid input."""
    # Arrange
    request_data = {
        "content": "Test content",
        "search_enabled": False
    }
    
    # Act
    response = await client.post("/api/lyrics/generate", json=request_data)
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "lyrics" in data
```

### Async Tests
Use `@pytest.mark.asyncio` decorator for async tests:
```python
@pytest.mark.asyncio
async def test_async_function():
    result = await some_async_function()
    assert result is not None
```

### Mocking Example
```python
from unittest.mock import patch, MagicMock

def test_with_mock():
    with patch('app.services.cache.get_firestore_client') as mock_client:
        mock_client.return_value = MagicMock()
        # Test code here
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Scheduled nightly builds

CI configuration:
- Runs all tests
- Generates coverage report
- Fails if coverage drops below threshold

## Troubleshooting

### Tests Fail with Firebase Errors
- Ensure Firebase is properly mocked
- Check that `get_firestore_client` is patched correctly

### Async Tests Hang
- Verify `@pytest.mark.asyncio` decorator is present
- Check for missing `await` keywords

### Import Errors
- Ensure you're running from the backend directory
- Verify virtual environment is activated
- Run `poetry install` to install dependencies

### Coverage Not Generated
- Install coverage: `poetry add --group dev pytest-cov`
- Use `--cov=app` flag when running pytest

## Best Practices

1. **Test Independence**: Each test should be independent and not rely on other tests
2. **Clear Assertions**: Use descriptive assertion messages
3. **Mock External Services**: Never call real external APIs in tests
4. **Test Edge Cases**: Include tests for error conditions and edge cases
5. **Keep Tests Fast**: Mock slow operations, avoid unnecessary delays
6. **Descriptive Names**: Test names should clearly describe what they test
7. **Arrange-Act-Assert**: Follow the AAA pattern for test structure

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Python unittest.mock](https://docs.python.org/3/library/unittest.mock.html)
- [Pytest-asyncio](https://pytest-asyncio.readthedocs.io/)

## E2E Testing with Chrome DevTools MCP

### 📖 Documentation Index

**See [E2E_DOCUMENTATION_INDEX.md](E2E_DOCUMENTATION_INDEX.md) for complete documentation navigation**

### Quick Start

1. **Prerequisites:** See `E2E_PREREQUISITES_CHECKLIST.md`
2. **Setup:** Follow `E2E_CHROME_SETUP.md`
3. **Execution:** Refer to `E2E_TEST_EXECUTION_GUIDE.md`
4. **Troubleshooting:** Check `E2E_TROUBLESHOOTING_QUICK_REFERENCE.md`

### E2E Documentation

- **`E2E_TEST_EXECUTION_GUIDE.md`** - Complete test execution guide
- **`E2E_PREREQUISITES_CHECKLIST.md`** - Prerequisites verification checklist
- **`E2E_CHROME_SETUP.md`** - Chrome and MCP setup instructions
- **`E2E_TROUBLESHOOTING_QUICK_REFERENCE.md`** - Quick troubleshooting guide
- **`MOCK_DATA_CUSTOMIZATION_GUIDE.md`** - Mock data configuration guide

### Page-Specific Guides

- **`PAGE_A_TEST_GUIDE.md`** - Text Input page testing
- **`PAGE_B_TEST_GUIDE.md`** - Lyrics Editing page testing
- **`WEBSOCKET_TEST_GUIDE.md`** - WebSocket connectivity testing
- **`ERROR_HANDLING_TEST_GUIDE.md`** - Error scenario testing
- **`USER_JOURNEY_TEST_GUIDE.md`** - Complete user journey testing

### Technical Guides

- **`NETWORK_MOCK_GUIDE.md`** - Network interception details
- **`WEBSOCKET_MOCK_GUIDE.md`** - WebSocket mocking details
- **`SCREENSHOT_SYSTEM_GUIDE.md`** - Screenshot capture system
- **`TEST_REPORT_GUIDE.md`** - Report generation details
- **`BROWSER_CONNECTION_GUIDE.md`** - Browser connection utilities
- **`CONSOLE_MONITOR_GUIDE.md`** - Console monitoring system
- **`NETWORK_MONITOR_GUIDE.md`** - Network activity monitoring

## Questions?

For questions about tests, contact the development team or refer to:
- `E2E_TEST_EXECUTION_GUIDE.md` for complete E2E testing guide
- `E2E_TEST_GUIDE.md` for manual testing procedures
- `E2E_TEST_SUMMARY.md` for E2E testing overview
- Project documentation in `/docs`
