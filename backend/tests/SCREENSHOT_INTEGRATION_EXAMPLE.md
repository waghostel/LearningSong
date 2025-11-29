# Screenshot System Integration Example

## Upgrading Existing Tests to Use New Screenshot System

The new screenshot capture system is backward compatible with existing tests. Here's how to upgrade existing tests to take advantage of the new metadata tracking and reporting features.

## Before (Existing Pattern)

```python
def test_page_a_initial_load(self):
    """Test Page A initial load."""
    helper = create_helper()
    screenshots = []
    
    # Generate screenshot path
    screenshot_path = helper.get_screenshot_path(
        "page-a",
        helper.generate_screenshot_filename("page-a", "initial-load")
    )
    screenshots.append(screenshot_path)
    
    print(f"📸 Screenshot: {screenshot_path}")
    print("Use mcp_chrome_devtools_take_screenshot")
    
    # Record test result
    helper.record_test_result(
        scenario_id="page-a-initial-load",
        status="manual",
        duration=0,
        screenshots=screenshots
    )
```

## After (Using New System)

```python
def test_page_a_initial_load(self):
    """Test Page A initial load."""
    helper = create_helper()
    screenshots = []
    
    # Capture screenshot with metadata
    metadata = helper.capture_screenshot(
        page="page-a",
        scenario="initial-load",
        description="Page A initial load with empty form",
        test_id="test-page-a-001",
        viewport_width=1920,
        viewport_height=1080,
        url="http://localhost:5173/"
    )
    screenshots.append(metadata.filepath)
    
    print(f"📸 Screenshot: {metadata.filepath}")
    print(f"   Timestamp: {metadata.timestamp}")
    print(f"   Description: {metadata.description}")
    print("Use mcp_chrome_devtools_take_screenshot")
    
    # Record test result
    helper.record_test_result(
        scenario_id="page-a-initial-load",
        status="manual",
        duration=0,
        screenshots=screenshots
    )
    
    # At end of test, generate reports
    helper.save_screenshot_metadata("page-a-initial-load-metadata.json")
    helper.generate_screenshot_index("page-a-initial-load-index.html")
```

## Benefits of Upgrading

1. **Automatic Metadata Tracking** - All screenshot information is tracked automatically
2. **Easy Filtering** - Find screenshots by page, scenario, or test ID
3. **HTML Reports** - Generate interactive HTML index of all screenshots
4. **JSON Export** - Export metadata for programmatic access
5. **Better Organization** - Custom categories and organization
6. **Self-Documenting** - Descriptions make screenshots understandable

## Minimal Upgrade (Just Add Metadata)

If you want to keep existing code mostly the same, just add metadata tracking:

```python
def test_page_a_initial_load(self):
    """Test Page A initial load."""
    helper = create_helper()
    screenshots = []
    
    # Use new capture_screenshot instead of manual path generation
    metadata = helper.capture_screenshot(
        page="page-a",
        scenario="initial-load"
    )
    screenshots.append(metadata.filepath)
    
    # Rest of test remains the same
    print(f"📸 Screenshot: {metadata.filepath}")
    print("Use mcp_chrome_devtools_take_screenshot")
    
    helper.record_test_result(
        scenario_id="page-a-initial-load",
        status="manual",
        duration=0,
        screenshots=screenshots
    )
```

## Full Integration Example

Here's a complete example showing how to integrate the new system into a test class:

```python
class TestPageAWithScreenshotSystem:
    """Test Page A with full screenshot system integration."""
    
    def setup_method(self):
        """Setup before each test."""
        self.helper = create_helper()
        self.test_id = f"test-{self._testMethodName}"
    
    def teardown_method(self):
        """Cleanup after each test."""
        # Save metadata after each test
        self.helper.save_screenshot_metadata(f"{self.test_id}-metadata.json")
    
    def test_initial_load(self):
        """Test initial page load."""
        # Capture screenshot with full metadata
        metadata = self.helper.capture_screenshot(
            page="page-a",
            scenario="initial-load",
            description="Page A loads with empty form",
            test_id=self.test_id,
            viewport_width=1920,
            viewport_height=1080,
            url="http://localhost:5173/"
        )
        
        print(f"\n📸 Capture screenshot to: {metadata.filepath}")
        print("   Use: mcp_chrome_devtools_take_screenshot")
        
        # ... rest of test ...
    
    def test_text_input(self):
        """Test text input functionality."""
        # Capture multiple screenshots with steps
        metadata1 = self.helper.capture_screenshot(
            page="page-a",
            scenario="text-input",
            step="01-empty",
            description="Empty textarea before input",
            test_id=self.test_id
        )
        
        print(f"\n📸 Step 1: {metadata1.filepath}")
        
        # ... perform actions ...
        
        metadata2 = self.helper.capture_screenshot(
            page="page-a",
            scenario="text-input",
            step="02-filled",
            description="Textarea with valid content",
            test_id=self.test_id
        )
        
        print(f"📸 Step 2: {metadata2.filepath}")
        
        # ... rest of test ...
    
    @classmethod
    def teardown_class(cls):
        """Generate final report after all tests."""
        helper = create_helper()
        
        # Generate HTML index for all tests in this class
        index_path = helper.generate_screenshot_index("test-page-a-index.html")
        print(f"\n✅ Screenshot index generated: {index_path}")
        
        # Organize screenshots by category
        custom_categories = {
            "Initial Load": ["initial-load"],
            "Text Input": ["text-input"],
            "Validation": ["validation"],
            "Error Handling": ["error"]
        }
        
        organized = helper.organize_screenshots_by_category(custom_categories)
        
        print("\n📊 Screenshot Summary:")
        for category, screenshots in organized.items():
            print(f"   {category}: {len(screenshots)} screenshots")
```

## Gradual Migration Strategy

You don't need to upgrade all tests at once. Here's a gradual migration strategy:

### Phase 1: Add Metadata Tracking (No Code Changes)
- New system is already integrated in `e2e_helpers.py`
- Existing tests continue to work as-is
- No changes needed

### Phase 2: Start Using capture_screenshot() in New Tests
- Use `capture_screenshot()` for all new tests
- Keep existing tests unchanged
- Build up metadata over time

### Phase 3: Upgrade High-Value Tests
- Upgrade tests that are run frequently
- Upgrade tests that need better documentation
- Upgrade tests that benefit from filtering

### Phase 4: Generate Reports
- Add report generation to test suites
- Use HTML index for visual verification
- Use JSON export for CI/CD integration

### Phase 5: Full Migration (Optional)
- Upgrade remaining tests if desired
- Standardize on new system across all tests

## Backward Compatibility

The new system is 100% backward compatible:

✅ **Existing methods still work:**
- `generate_screenshot_filename()` - Still works
- `get_screenshot_path()` - Still works
- `record_test_result()` - Still works

✅ **No breaking changes:**
- All existing tests continue to work
- No modifications required
- Can upgrade incrementally

✅ **New features are additive:**
- `capture_screenshot()` - New method
- `get_screenshot_metadata()` - New method
- `save_screenshot_metadata()` - New method
- `generate_screenshot_index()` - New method
- `organize_screenshots_by_category()` - New method

## Quick Reference

### Old Way
```python
screenshot_path = helper.get_screenshot_path(
    "page-a",
    helper.generate_screenshot_filename("page-a", "test")
)
```

### New Way
```python
metadata = helper.capture_screenshot(
    page="page-a",
    scenario="test"
)
screenshot_path = metadata.filepath
```

### With Full Metadata
```python
metadata = helper.capture_screenshot(
    page="page-a",
    scenario="test",
    step="step-1",
    description="Test screenshot",
    test_id="test-001",
    viewport_width=1920,
    viewport_height=1080,
    url="http://localhost:5173/"
)
```

## Conclusion

The new screenshot system enhances existing tests without requiring changes. You can:
- Continue using existing code (backward compatible)
- Gradually adopt new features (incremental migration)
- Generate reports at any time (works with old and new code)
- Mix old and new approaches (flexible integration)

Start using `capture_screenshot()` in new tests, and upgrade existing tests as needed. The system will track all screenshots and enable powerful reporting and organization features.
