# Screenshot Capture and Organization System Guide

## Overview

The screenshot capture and organization system provides comprehensive functionality for capturing, tracking, organizing, and reporting screenshots during E2E testing with Chrome DevTools MCP.

## Features

### 1. Screenshot Metadata Tracking

Every screenshot captured includes detailed metadata:
- **Filename**: Descriptive name with timestamp
- **Filepath**: Full path to the screenshot file
- **Page**: Page identifier (page-a, page-b, page-c, responsive)
- **Scenario**: Test scenario name
- **Step**: Optional step identifier
- **Timestamp**: ISO format timestamp
- **Test ID**: Optional test identifier
- **Description**: Optional human-readable description
- **Viewport**: Optional viewport dimensions (width x height)
- **URL**: Optional page URL when screenshot was taken

### 2. Automatic Organization

Screenshots are automatically organized into directories by page:
```
report/e2e-chrome-devtools-testing/
├── page-a/           # Text Input Page screenshots
├── page-b/           # Lyrics Editing Page screenshots
├── page-c/           # Song Playback Page screenshots
└── responsive/       # Responsive design screenshots
```

### 3. Metadata Export

Screenshot metadata can be exported to JSON for:
- Test result analysis
- CI/CD integration
- Automated reporting
- Historical tracking

### 4. HTML Index Generation

Automatically generate an interactive HTML index showing all screenshots with:
- Thumbnail previews
- Full-size image viewing (click to expand)
- Metadata display
- Organized by page
- Searchable and filterable

### 5. Custom Organization

Organize screenshots into custom categories based on:
- Test scenarios
- Test types (validation, error handling, success flows)
- Feature areas
- Any custom criteria

## Usage

### Basic Screenshot Capture

```python
from tests.e2e_helpers import ChromeDevToolsHelper

# Create helper instance
helper = ChromeDevToolsHelper()

# Capture a screenshot
metadata = helper.capture_screenshot(
    page="page-a",
    scenario="text-input",
    step="initial-load"
)

# The metadata object contains all tracking information
print(f"Screenshot saved to: {metadata.filepath}")
print(f"Timestamp: {metadata.timestamp}")
```

### Capture with Full Metadata

```python
metadata = helper.capture_screenshot(
    page="page-b",
    scenario="lyrics-editing",
    step="character-count",
    description="Testing real-time character count updates",
    test_id="test-page-b-002",
    viewport_width=1920,
    viewport_height=1080,
    url="http://localhost:5173/lyrics-editing"
)
```

### Retrieve Screenshot Metadata

```python
# Get all screenshots
all_screenshots = helper.get_screenshot_metadata()

# Filter by page
page_a_screenshots = helper.get_screenshot_metadata(page="page-a")

# Filter by scenario
validation_screenshots = helper.get_screenshot_metadata(scenario="validation-error")

# Filter by test ID
test_screenshots = helper.get_screenshot_metadata(test_id="test-001")

# Multiple filters
filtered = helper.get_screenshot_metadata(
    page="page-a",
    test_id="test-001"
)
```

### Save Metadata to JSON

```python
# Save with default filename (includes timestamp)
metadata_path = helper.save_screenshot_metadata()

# Save with custom filename
metadata_path = helper.save_screenshot_metadata("my-test-metadata.json")

print(f"Metadata saved to: {metadata_path}")
```

### Generate HTML Index

```python
# Generate with default filename
index_path = helper.generate_screenshot_index()

# Generate with custom filename
index_path = helper.generate_screenshot_index("my-test-index.html")

print(f"Screenshot index: {index_path}")
# Open in browser to view all screenshots
```

### Organize by Custom Categories

```python
# Define custom categories
custom_categories = {
    "Validation Tests": ["validation"],
    "Error Handling": ["error"],
    "Success Flows": ["success"],
    "UI Components": ["button", "form", "input"]
}

# Organize screenshots
organized = helper.organize_screenshots_by_category(custom_categories)

# Access screenshots by category
for category_name, screenshots in organized.items():
    print(f"{category_name}: {len(screenshots)} screenshots")
    for screenshot in screenshots:
        print(f"  - {screenshot.filename}")
```

## Integration with E2E Tests

### Example Test with Screenshot Capture

```python
def test_page_a_text_input(self):
    """Test text input functionality with screenshot capture."""
    helper = ChromeDevToolsHelper()
    
    # Capture initial state
    helper.capture_screenshot(
        page="page-a",
        scenario="text-input",
        step="01-initial-load",
        description="Page A initial load with empty form",
        test_id="test-page-a-001",
        viewport_width=1920,
        viewport_height=1080,
        url="http://localhost:5173/"
    )
    
    # ... perform test actions ...
    
    # Capture after entering content
    helper.capture_screenshot(
        page="page-a",
        scenario="text-input",
        step="02-content-entered",
        description="Valid content entered in textarea",
        test_id="test-page-a-001",
        viewport_width=1920,
        viewport_height=1080,
        url="http://localhost:5173/"
    )
    
    # ... more test actions ...
    
    # Generate report at end of test
    helper.save_screenshot_metadata(f"test-page-a-001-metadata.json")
    helper.generate_screenshot_index(f"test-page-a-001-index.html")
```

### Complete Test Suite Example

```python
class TestPageAComplete:
    """Complete test suite with screenshot tracking."""
    
    def setup_method(self):
        """Setup before each test."""
        self.helper = ChromeDevToolsHelper()
    
    def teardown_method(self):
        """Cleanup after each test."""
        # Save metadata after each test
        test_name = self._testMethodName
        self.helper.save_screenshot_metadata(f"{test_name}-metadata.json")
    
    def test_scenario_1(self):
        """Test scenario 1."""
        self.helper.capture_screenshot(
            page="page-a",
            scenario="scenario-1",
            test_id=self._testMethodName
        )
        # ... test code ...
    
    def test_scenario_2(self):
        """Test scenario 2."""
        self.helper.capture_screenshot(
            page="page-a",
            scenario="scenario-2",
            test_id=self._testMethodName
        )
        # ... test code ...
    
    @classmethod
    def teardown_class(cls):
        """Generate final report after all tests."""
        helper = ChromeDevToolsHelper()
        helper.generate_screenshot_index("complete-test-suite-index.html")
```

## Chrome DevTools MCP Integration

### Capturing Screenshots with MCP

After setting up metadata, use Chrome DevTools MCP to actually capture the screenshot:

```python
# 1. Capture metadata (generates path and tracks info)
metadata = helper.capture_screenshot(
    page="page-a",
    scenario="test",
    step="step-1"
)

# 2. Use Chrome DevTools MCP to capture the actual screenshot
# Call: mcp_chrome_devtools_take_screenshot(filePath=metadata.filepath)

print(f"Capture screenshot to: {metadata.filepath}")
```

### Complete Workflow

```python
# 1. Setup
helper = ChromeDevToolsHelper()

# 2. Navigate to page
# Use: mcp_chrome_devtools_navigate_page(url='http://localhost:5173/')

# 3. Capture screenshot with metadata
metadata = helper.capture_screenshot(
    page="page-a",
    scenario="initial-load",
    description="Page loaded successfully"
)

# 4. Actually capture the screenshot using MCP
# Use: mcp_chrome_devtools_take_screenshot(filePath=metadata.filepath)

# 5. Continue with more screenshots...

# 6. Generate reports
helper.save_screenshot_metadata()
helper.generate_screenshot_index()
```

## Convenience Functions

For simpler usage, convenience functions are available:

```python
from tests.e2e_helpers import (
    capture_screenshot,
    save_screenshot_metadata,
    generate_screenshot_index
)

# Capture screenshot (creates helper automatically)
metadata = capture_screenshot(
    page="page-a",
    scenario="test"
)

# Or pass existing helper
helper = ChromeDevToolsHelper()
metadata = capture_screenshot(
    page="page-a",
    scenario="test",
    helper=helper
)

# Save metadata
save_screenshot_metadata(helper=helper)

# Generate index
generate_screenshot_index(helper=helper)
```

## Best Practices

### 1. Descriptive Naming

Use clear, descriptive names for scenarios and steps:

```python
# Good
helper.capture_screenshot(
    page="page-a",
    scenario="text-input-validation",
    step="error-message-displayed"
)

# Avoid
helper.capture_screenshot(
    page="page-a",
    scenario="test1",
    step="step3"
)
```

### 2. Include Descriptions

Add descriptions to make screenshots self-documenting:

```python
helper.capture_screenshot(
    page="page-b",
    scenario="lyrics-editing",
    step="character-count-warning",
    description="Warning state displayed when lyrics approach 3,000 character limit"
)
```

### 3. Track Test IDs

Use test IDs to group related screenshots:

```python
test_id = "test-user-journey-001"

helper.capture_screenshot(page="page-a", scenario="step1", test_id=test_id)
helper.capture_screenshot(page="page-b", scenario="step2", test_id=test_id)
helper.capture_screenshot(page="page-c", scenario="step3", test_id=test_id)

# Later, retrieve all screenshots for this test
test_screenshots = helper.get_screenshot_metadata(test_id=test_id)
```

### 4. Include Viewport Information

Track viewport dimensions for responsive testing:

```python
# Mobile
helper.capture_screenshot(
    page="responsive",
    scenario="mobile-layout",
    viewport_width=375,
    viewport_height=667
)

# Tablet
helper.capture_screenshot(
    page="responsive",
    scenario="tablet-layout",
    viewport_width=768,
    viewport_height=1024
)

# Desktop
helper.capture_screenshot(
    page="responsive",
    scenario="desktop-layout",
    viewport_width=1920,
    viewport_height=1080
)
```

### 5. Generate Reports Regularly

Generate HTML indexes and metadata exports after test runs:

```python
# At end of test suite
helper.save_screenshot_metadata(f"test-run-{timestamp}-metadata.json")
helper.generate_screenshot_index(f"test-run-{timestamp}-index.html")
```

## File Structure

### Metadata JSON Format

```json
[
  {
    "filename": "text-input-initial-load-20251129-120000-123.png",
    "filepath": "report/e2e-chrome-devtools-testing/page-a/text-input-initial-load-20251129-120000-123.png",
    "page": "page-a",
    "scenario": "text-input",
    "step": "initial-load",
    "timestamp": "2025-11-29T12:00:00.123456",
    "test_id": "test-page-a-001",
    "description": "Page A initial load with empty form",
    "viewport_width": 1920,
    "viewport_height": 1080,
    "url": "http://localhost:5173/"
  }
]
```

### HTML Index Features

The generated HTML index includes:
- Responsive grid layout
- Thumbnail previews
- Click to view full-size
- Metadata display for each screenshot
- Organized by page
- Timestamps
- Descriptions
- Viewport information
- Test IDs

## Troubleshooting

### Screenshots Not Appearing in Index

Ensure you're using the same `ChromeDevToolsHelper` instance throughout your test:

```python
# Good - reuse helper
helper = ChromeDevToolsHelper()
helper.capture_screenshot(page="page-a", scenario="test1")
helper.capture_screenshot(page="page-a", scenario="test2")
helper.generate_screenshot_index()  # Shows both screenshots

# Bad - creates new helper each time
ChromeDevToolsHelper().capture_screenshot(page="page-a", scenario="test1")
ChromeDevToolsHelper().capture_screenshot(page="page-a", scenario="test2")
ChromeDevToolsHelper().generate_screenshot_index()  # Shows nothing
```

### Metadata Not Saved

Make sure to call `save_screenshot_metadata()` after capturing screenshots:

```python
helper = ChromeDevToolsHelper()
helper.capture_screenshot(page="page-a", scenario="test")
# ... more screenshots ...
helper.save_screenshot_metadata()  # Don't forget this!
```

### Custom Categories Not Working

Ensure your category patterns match the scenario or page names:

```python
# If scenario is "validation-error"
custom_categories = {
    "Validation": ["validation"]  # This will match
}

# If scenario is "error-handling"
custom_categories = {
    "Errors": ["error"]  # This will match
}
```

## API Reference

### ScreenshotMetadata

Dataclass containing screenshot metadata.

**Fields:**
- `filename: str` - Screenshot filename
- `filepath: str` - Full path to screenshot
- `page: str` - Page identifier
- `scenario: str` - Test scenario name
- `step: Optional[str]` - Step identifier
- `timestamp: str` - ISO format timestamp
- `test_id: Optional[str]` - Test identifier
- `description: Optional[str]` - Description
- `viewport_width: Optional[int]` - Viewport width
- `viewport_height: Optional[int]` - Viewport height
- `url: Optional[str]` - Page URL

**Methods:**
- `to_dict() -> Dict[str, Any]` - Convert to dictionary
- `to_json() -> str` - Convert to JSON string

### ChromeDevToolsHelper

Main helper class for E2E testing.

**Methods:**

#### `capture_screenshot(...) -> ScreenshotMetadata`

Capture a screenshot and record metadata.

**Parameters:**
- `page: str` - Page identifier (required)
- `scenario: str` - Test scenario name (required)
- `step: Optional[str]` - Step identifier
- `description: Optional[str]` - Description
- `test_id: Optional[str]` - Test identifier
- `viewport_width: Optional[int]` - Viewport width
- `viewport_height: Optional[int]` - Viewport height
- `url: Optional[str]` - Page URL

**Returns:** `ScreenshotMetadata` object

#### `get_screenshot_metadata(...) -> List[ScreenshotMetadata]`

Retrieve screenshot metadata with optional filtering.

**Parameters:**
- `page: Optional[str]` - Filter by page
- `scenario: Optional[str]` - Filter by scenario
- `test_id: Optional[str]` - Filter by test ID

**Returns:** List of `ScreenshotMetadata` objects

#### `save_screenshot_metadata(output_filename: Optional[str] = None) -> str`

Save metadata to JSON file.

**Parameters:**
- `output_filename: Optional[str]` - Custom filename (default: auto-generated with timestamp)

**Returns:** Path to saved file

#### `generate_screenshot_index(output_filename: Optional[str] = None) -> str`

Generate HTML index of screenshots.

**Parameters:**
- `output_filename: Optional[str]` - Custom filename (default: auto-generated with timestamp)

**Returns:** Path to generated HTML file

#### `organize_screenshots_by_category(categories: Optional[Dict[str, List[str]]] = None) -> Dict[str, List[ScreenshotMetadata]]`

Organize screenshots into custom categories.

**Parameters:**
- `categories: Optional[Dict[str, List[str]]]` - Category definitions (default: organize by page)

**Returns:** Dictionary mapping category names to screenshot lists

## Examples

See `test_screenshot_system.py` for comprehensive examples of all functionality.

## Requirements Validation

This implementation satisfies all requirements from Task 13:

✅ **Create function to capture screenshots with descriptive filenames**
- `capture_screenshot()` method generates descriptive filenames with timestamps

✅ **Implement screenshot organization by page and scenario**
- Automatic directory structure: page-a/, page-b/, page-c/, responsive/
- Filenames include scenario and step information

✅ **Create directory structure for different test categories**
- Directories created automatically in `__init__`
- Custom organization via `organize_screenshots_by_category()`

✅ **Implement screenshot metadata tracking (timestamp, scenario, page)**
- `ScreenshotMetadata` dataclass tracks all required information
- Metadata stored in list for retrieval and filtering
- Export to JSON for persistence
- HTML index generation for visualization

## Related Files

- `backend/tests/e2e_helpers.py` - Main implementation
- `backend/tests/test_screenshot_system.py` - Comprehensive tests
- `backend/tests/test_e2e_page_a.py` - Example usage in Page A tests
- `backend/tests/test_e2e_page_b.py` - Example usage in Page B tests
- `backend/tests/test_e2e_page_c.py` - Example usage in Page C tests
- `backend/tests/test_e2e_user_journey.py` - Example usage in user journey tests
