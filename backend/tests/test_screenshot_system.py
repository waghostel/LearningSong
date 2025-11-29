"""
Test the screenshot capture and organization system.

This module tests the screenshot metadata tracking, organization,
and reporting functionality implemented in e2e_helpers.py.
"""

import pytest
import json
from pathlib import Path
from datetime import datetime

from tests.e2e_helpers import (
    ChromeDevToolsHelper,
    ScreenshotMetadata,
    capture_screenshot,
    save_screenshot_metadata,
    generate_screenshot_index
)


class TestScreenshotMetadata:
    """Test ScreenshotMetadata dataclass functionality."""
    
    def test_screenshot_metadata_creation(self):
        """Test creating a ScreenshotMetadata object."""
        metadata = ScreenshotMetadata(
            filename="test-screenshot.png",
            filepath="/path/to/test-screenshot.png",
            page="page-a",
            scenario="test-scenario",
            step="step-1",
            timestamp="2025-11-29T12:00:00",
            test_id="test-001",
            description="Test screenshot",
            viewport_width=1920,
            viewport_height=1080,
            url="http://localhost:5173/"
        )
        
        assert metadata.filename == "test-screenshot.png"
        assert metadata.page == "page-a"
        assert metadata.scenario == "test-scenario"
        assert metadata.step == "step-1"
        assert metadata.test_id == "test-001"
        assert metadata.description == "Test screenshot"
        assert metadata.viewport_width == 1920
        assert metadata.viewport_height == 1080
        assert metadata.url == "http://localhost:5173/"
    
    def test_screenshot_metadata_to_dict(self):
        """Test converting ScreenshotMetadata to dictionary."""
        metadata = ScreenshotMetadata(
            filename="test.png",
            filepath="/path/to/test.png",
            page="page-a",
            scenario="test",
            step=None,
            timestamp="2025-11-29T12:00:00"
        )
        
        metadata_dict = metadata.to_dict()
        
        assert isinstance(metadata_dict, dict)
        assert metadata_dict["filename"] == "test.png"
        assert metadata_dict["page"] == "page-a"
        assert metadata_dict["scenario"] == "test"
        assert metadata_dict["step"] is None
    
    def test_screenshot_metadata_to_json(self):
        """Test converting ScreenshotMetadata to JSON string."""
        metadata = ScreenshotMetadata(
            filename="test.png",
            filepath="/path/to/test.png",
            page="page-a",
            scenario="test",
            step=None,
            timestamp="2025-11-29T12:00:00"
        )
        
        json_str = metadata.to_json()
        
        assert isinstance(json_str, str)
        
        # Parse JSON to verify it's valid
        parsed = json.loads(json_str)
        assert parsed["filename"] == "test.png"
        assert parsed["page"] == "page-a"


class TestScreenshotCapture:
    """Test screenshot capture functionality."""
    
    def test_capture_screenshot_basic(self):
        """Test basic screenshot capture with metadata."""
        helper = ChromeDevToolsHelper()
        
        metadata = helper.capture_screenshot(
            page="page-a",
            scenario="test-scenario",
            step="step-1"
        )
        
        assert isinstance(metadata, ScreenshotMetadata)
        assert metadata.page == "page-a"
        assert metadata.scenario == "test-scenario"
        assert metadata.step == "step-1"
        assert metadata.filename.endswith(".png")
        assert "test-scenario" in metadata.filename
        assert "step-1" in metadata.filename
        
        # Verify metadata was stored
        assert len(helper.screenshot_metadata) == 1
        assert helper.screenshot_metadata[0] == metadata
    
    def test_capture_screenshot_with_all_fields(self):
        """Test screenshot capture with all optional fields."""
        helper = ChromeDevToolsHelper()
        
        metadata = helper.capture_screenshot(
            page="page-b",
            scenario="lyrics-editing",
            step="character-count",
            description="Testing character count display",
            test_id="test-page-b-001",
            viewport_width=1920,
            viewport_height=1080,
            url="http://localhost:5173/lyrics-editing"
        )
        
        assert metadata.page == "page-b"
        assert metadata.scenario == "lyrics-editing"
        assert metadata.step == "character-count"
        assert metadata.description == "Testing character count display"
        assert metadata.test_id == "test-page-b-001"
        assert metadata.viewport_width == 1920
        assert metadata.viewport_height == 1080
        assert metadata.url == "http://localhost:5173/lyrics-editing"
    
    def test_capture_multiple_screenshots(self):
        """Test capturing multiple screenshots and tracking them."""
        helper = ChromeDevToolsHelper()
        
        # Capture multiple screenshots
        metadata1 = helper.capture_screenshot(
            page="page-a",
            scenario="text-input",
            step="initial-load"
        )
        
        metadata2 = helper.capture_screenshot(
            page="page-a",
            scenario="text-input",
            step="content-entered"
        )
        
        metadata3 = helper.capture_screenshot(
            page="page-b",
            scenario="lyrics-editing",
            step="lyrics-loaded"
        )
        
        # Verify all were stored
        assert len(helper.screenshot_metadata) == 3
        assert helper.screenshot_metadata[0] == metadata1
        assert helper.screenshot_metadata[1] == metadata2
        assert helper.screenshot_metadata[2] == metadata3
    
    def test_capture_screenshot_generates_unique_filenames(self):
        """Test that each screenshot gets a unique filename."""
        helper = ChromeDevToolsHelper()
        
        # Capture two screenshots with same parameters
        metadata1 = helper.capture_screenshot(
            page="page-a",
            scenario="test",
            step="step-1"
        )
        
        # Small delay to ensure different timestamp
        import time
        time.sleep(0.01)
        
        metadata2 = helper.capture_screenshot(
            page="page-a",
            scenario="test",
            step="step-1"
        )
        
        # Filenames should be different due to timestamp
        assert metadata1.filename != metadata2.filename
        assert metadata1.filepath != metadata2.filepath


class TestScreenshotMetadataRetrieval:
    """Test screenshot metadata retrieval and filtering."""
    
    def test_get_screenshot_metadata_no_filter(self):
        """Test retrieving all screenshot metadata without filters."""
        helper = ChromeDevToolsHelper()
        
        # Capture some screenshots
        helper.capture_screenshot(page="page-a", scenario="test1")
        helper.capture_screenshot(page="page-b", scenario="test2")
        helper.capture_screenshot(page="page-c", scenario="test3")
        
        # Get all metadata
        all_metadata = helper.get_screenshot_metadata()
        
        assert len(all_metadata) == 3
    
    def test_get_screenshot_metadata_filter_by_page(self):
        """Test filtering screenshot metadata by page."""
        helper = ChromeDevToolsHelper()
        
        # Capture screenshots for different pages
        helper.capture_screenshot(page="page-a", scenario="test1")
        helper.capture_screenshot(page="page-a", scenario="test2")
        helper.capture_screenshot(page="page-b", scenario="test3")
        helper.capture_screenshot(page="page-c", scenario="test4")
        
        # Filter by page-a
        page_a_metadata = helper.get_screenshot_metadata(page="page-a")
        
        assert len(page_a_metadata) == 2
        assert all(m.page == "page-a" for m in page_a_metadata)
    
    def test_get_screenshot_metadata_filter_by_scenario(self):
        """Test filtering screenshot metadata by scenario."""
        helper = ChromeDevToolsHelper()
        
        # Capture screenshots for different scenarios
        helper.capture_screenshot(page="page-a", scenario="text-input")
        helper.capture_screenshot(page="page-a", scenario="text-input")
        helper.capture_screenshot(page="page-b", scenario="lyrics-editing")
        
        # Filter by scenario
        text_input_metadata = helper.get_screenshot_metadata(scenario="text-input")
        
        assert len(text_input_metadata) == 2
        assert all(m.scenario == "text-input" for m in text_input_metadata)
    
    def test_get_screenshot_metadata_filter_by_test_id(self):
        """Test filtering screenshot metadata by test ID."""
        helper = ChromeDevToolsHelper()
        
        # Capture screenshots with test IDs
        helper.capture_screenshot(page="page-a", scenario="test1", test_id="test-001")
        helper.capture_screenshot(page="page-a", scenario="test2", test_id="test-001")
        helper.capture_screenshot(page="page-b", scenario="test3", test_id="test-002")
        
        # Filter by test ID
        test_001_metadata = helper.get_screenshot_metadata(test_id="test-001")
        
        assert len(test_001_metadata) == 2
        assert all(m.test_id == "test-001" for m in test_001_metadata)
    
    def test_get_screenshot_metadata_multiple_filters(self):
        """Test filtering screenshot metadata with multiple filters."""
        helper = ChromeDevToolsHelper()
        
        # Capture various screenshots
        helper.capture_screenshot(page="page-a", scenario="test1", test_id="test-001")
        helper.capture_screenshot(page="page-a", scenario="test2", test_id="test-001")
        helper.capture_screenshot(page="page-b", scenario="test1", test_id="test-001")
        helper.capture_screenshot(page="page-a", scenario="test1", test_id="test-002")
        
        # Filter by page and test_id
        filtered_metadata = helper.get_screenshot_metadata(
            page="page-a",
            test_id="test-001"
        )
        
        assert len(filtered_metadata) == 2
        assert all(m.page == "page-a" and m.test_id == "test-001" for m in filtered_metadata)


class TestScreenshotMetadataSaving:
    """Test saving screenshot metadata to file."""
    
    def test_save_screenshot_metadata_to_json(self, tmp_path):
        """Test saving screenshot metadata to JSON file."""
        # Use temporary directory for testing
        helper = ChromeDevToolsHelper(report_dir=str(tmp_path))
        
        # Capture some screenshots
        helper.capture_screenshot(
            page="page-a",
            scenario="test1",
            description="Test screenshot 1"
        )
        helper.capture_screenshot(
            page="page-b",
            scenario="test2",
            description="Test screenshot 2"
        )
        
        # Save metadata
        metadata_path = helper.save_screenshot_metadata("test-metadata.json")
        
        # Verify file was created
        assert Path(metadata_path).exists()
        
        # Load and verify content
        with open(metadata_path, "r") as f:
            saved_metadata = json.load(f)
        
        assert len(saved_metadata) == 2
        assert saved_metadata[0]["page"] == "page-a"
        assert saved_metadata[0]["scenario"] == "test1"
        assert saved_metadata[1]["page"] == "page-b"
        assert saved_metadata[1]["scenario"] == "test2"
    
    def test_save_screenshot_metadata_default_filename(self, tmp_path):
        """Test saving screenshot metadata with default filename."""
        helper = ChromeDevToolsHelper(report_dir=str(tmp_path))
        
        helper.capture_screenshot(page="page-a", scenario="test")
        
        # Save with default filename
        metadata_path = helper.save_screenshot_metadata()
        
        # Verify file was created with timestamp in name
        assert Path(metadata_path).exists()
        assert "screenshot-metadata-" in metadata_path
        assert metadata_path.endswith(".json")


class TestScreenshotIndexGeneration:
    """Test HTML screenshot index generation."""
    
    def test_generate_screenshot_index(self, tmp_path):
        """Test generating HTML index of screenshots."""
        helper = ChromeDevToolsHelper(report_dir=str(tmp_path))
        
        # Capture some screenshots
        helper.capture_screenshot(
            page="page-a",
            scenario="text-input",
            step="initial-load",
            description="Initial page load",
            viewport_width=1920,
            viewport_height=1080,
            url="http://localhost:5173/"
        )
        helper.capture_screenshot(
            page="page-b",
            scenario="lyrics-editing",
            step="lyrics-loaded",
            description="Lyrics loaded and displayed"
        )
        
        # Generate index
        index_path = helper.generate_screenshot_index("test-index.html")
        
        # Verify file was created
        assert Path(index_path).exists()
        
        # Read and verify content
        with open(index_path, "r") as f:
            html_content = f.read()
        
        # Check for key elements
        assert "<!DOCTYPE html>" in html_content
        assert "E2E Test Screenshots" in html_content
        assert "PAGE-A" in html_content.upper()
        assert "PAGE-B" in html_content.upper()
        assert "text-input" in html_content
        assert "lyrics-editing" in html_content
        assert "Initial page load" in html_content
        assert "Lyrics loaded and displayed" in html_content
    
    def test_generate_screenshot_index_default_filename(self, tmp_path):
        """Test generating screenshot index with default filename."""
        helper = ChromeDevToolsHelper(report_dir=str(tmp_path))
        
        helper.capture_screenshot(page="page-a", scenario="test")
        
        # Generate with default filename
        index_path = helper.generate_screenshot_index()
        
        # Verify file was created with timestamp in name
        assert Path(index_path).exists()
        assert "screenshot-index-" in index_path
        assert index_path.endswith(".html")


class TestScreenshotOrganization:
    """Test screenshot organization by category."""
    
    def test_organize_screenshots_default_categories(self):
        """Test organizing screenshots with default categories (by page)."""
        helper = ChromeDevToolsHelper()
        
        # Capture screenshots for different pages
        helper.capture_screenshot(page="page-a", scenario="test1")
        helper.capture_screenshot(page="page-a", scenario="test2")
        helper.capture_screenshot(page="page-b", scenario="test3")
        helper.capture_screenshot(page="page-c", scenario="test4")
        helper.capture_screenshot(page="responsive", scenario="test5")
        
        # Organize with default categories
        organized = helper.organize_screenshots_by_category()
        
        assert "Page A - Text Input" in organized
        assert "Page B - Lyrics Editing" in organized
        assert "Page C - Song Playback" in organized
        assert "Responsive Design" in organized
        
        assert len(organized["Page A - Text Input"]) == 2
        assert len(organized["Page B - Lyrics Editing"]) == 1
        assert len(organized["Page C - Song Playback"]) == 1
        assert len(organized["Responsive Design"]) == 1
    
    def test_organize_screenshots_custom_categories(self):
        """Test organizing screenshots with custom categories."""
        helper = ChromeDevToolsHelper()
        
        # Capture screenshots with various scenarios
        helper.capture_screenshot(page="page-a", scenario="input-validation")
        helper.capture_screenshot(page="page-b", scenario="validation-warning")
        helper.capture_screenshot(page="page-a", scenario="success-flow")
        helper.capture_screenshot(page="page-b", scenario="error-handling")
        
        # Define custom categories
        custom_categories = {
            "Validation Tests": ["validation"],
            "Error Handling": ["error-handling"],  # More specific pattern
            "Success Flows": ["success"]
        }
        
        # Organize with custom categories
        organized = helper.organize_screenshots_by_category(custom_categories)
        
        assert "Validation Tests" in organized
        assert "Error Handling" in organized
        assert "Success Flows" in organized
        
        assert len(organized["Validation Tests"]) == 2
        assert len(organized["Error Handling"]) == 1
        assert len(organized["Success Flows"]) == 1


class TestConvenienceFunctions:
    """Test convenience functions for screenshot capture."""
    
    def test_capture_screenshot_convenience_function(self):
        """Test the convenience function for capturing screenshots."""
        helper = ChromeDevToolsHelper()
        
        metadata = capture_screenshot(
            page="page-a",
            scenario="test",
            helper=helper
        )
        
        assert isinstance(metadata, ScreenshotMetadata)
        assert metadata.page == "page-a"
        assert metadata.scenario == "test"
    
    def test_save_screenshot_metadata_convenience_function(self, tmp_path):
        """Test the convenience function for saving metadata."""
        helper = ChromeDevToolsHelper(report_dir=str(tmp_path))
        helper.capture_screenshot(page="page-a", scenario="test")
        
        metadata_path = save_screenshot_metadata(
            helper=helper,
            output_filename="test.json"
        )
        
        assert Path(metadata_path).exists()
    
    def test_generate_screenshot_index_convenience_function(self, tmp_path):
        """Test the convenience function for generating index."""
        helper = ChromeDevToolsHelper(report_dir=str(tmp_path))
        helper.capture_screenshot(page="page-a", scenario="test")
        
        index_path = generate_screenshot_index(
            helper=helper,
            output_filename="test.html"
        )
        
        assert Path(index_path).exists()


# ============================================================================
# INTEGRATION TEST
# ============================================================================

class TestScreenshotSystemIntegration:
    """Integration test for the complete screenshot system."""
    
    def test_complete_screenshot_workflow(self, tmp_path):
        """Test the complete workflow of capturing, organizing, and reporting screenshots."""
        helper = ChromeDevToolsHelper(report_dir=str(tmp_path))
        
        # Simulate a test run with multiple screenshots
        print("\n" + "="*70)
        print("INTEGRATION TEST: Complete Screenshot Workflow")
        print("="*70)
        
        # Page A screenshots
        print("\n1. Capturing Page A screenshots...")
        helper.capture_screenshot(
            page="page-a",
            scenario="initial-load",
            description="Page A initial load with empty form",
            test_id="test-page-a-001",
            viewport_width=1920,
            viewport_height=1080,
            url="http://localhost:5173/"
        )
        
        helper.capture_screenshot(
            page="page-a",
            scenario="text-input",
            step="content-entered",
            description="Valid content entered in textarea",
            test_id="test-page-a-002",
            viewport_width=1920,
            viewport_height=1080,
            url="http://localhost:5173/"
        )
        
        helper.capture_screenshot(
            page="page-a",
            scenario="validation-error",
            description="Validation error for text exceeding 10,000 words",
            test_id="test-page-a-003",
            viewport_width=1920,
            viewport_height=1080,
            url="http://localhost:5173/"
        )
        
        # Page B screenshots
        print("2. Capturing Page B screenshots...")
        helper.capture_screenshot(
            page="page-b",
            scenario="lyrics-loaded",
            description="Generated lyrics displayed in editor",
            test_id="test-page-b-001",
            viewport_width=1920,
            viewport_height=1080,
            url="http://localhost:5173/lyrics-editing"
        )
        
        helper.capture_screenshot(
            page="page-b",
            scenario="style-selection",
            step="pop-selected",
            description="Pop music style selected",
            test_id="test-page-b-002",
            viewport_width=1920,
            viewport_height=1080,
            url="http://localhost:5173/lyrics-editing"
        )
        
        # Page C screenshots
        print("3. Capturing Page C screenshots...")
        helper.capture_screenshot(
            page="page-c",
            scenario="song-loaded",
            description="Song playback page with audio player",
            test_id="test-page-c-001",
            viewport_width=1920,
            viewport_height=1080,
            url="http://localhost:5173/song-playback"
        )
        
        # Responsive screenshots
        print("4. Capturing responsive design screenshots...")
        helper.capture_screenshot(
            page="responsive",
            scenario="mobile-view",
            description="Mobile viewport (375px)",
            test_id="test-responsive-001",
            viewport_width=375,
            viewport_height=667,
            url="http://localhost:5173/"
        )
        
        # Verify all screenshots were captured
        print(f"\n5. Verifying {len(helper.screenshot_metadata)} screenshots captured...")
        assert len(helper.screenshot_metadata) == 7
        
        # Test filtering
        print("6. Testing metadata filtering...")
        page_a_screenshots = helper.get_screenshot_metadata(page="page-a")
        assert len(page_a_screenshots) == 3
        
        page_b_screenshots = helper.get_screenshot_metadata(page="page-b")
        assert len(page_b_screenshots) == 2
        
        # Test organization
        print("7. Testing screenshot organization...")
        organized = helper.organize_screenshots_by_category()
        assert len(organized["Page A - Text Input"]) == 3
        assert len(organized["Page B - Lyrics Editing"]) == 2
        assert len(organized["Page C - Song Playback"]) == 1
        assert len(organized["Responsive Design"]) == 1
        
        # Save metadata
        print("8. Saving screenshot metadata...")
        metadata_path = helper.save_screenshot_metadata("integration-test-metadata.json")
        assert Path(metadata_path).exists()
        
        # Generate index
        print("9. Generating screenshot index...")
        index_path = helper.generate_screenshot_index("integration-test-index.html")
        assert Path(index_path).exists()
        
        # Verify index content
        with open(index_path, "r") as f:
            html_content = f.read()
        
        assert "PAGE-A" in html_content.upper()
        assert "PAGE-B" in html_content.upper()
        assert "PAGE-C" in html_content.upper()
        assert "RESPONSIVE" in html_content.upper()
        
        print("\n✓ Integration test completed successfully!")
        print(f"  - Metadata saved to: {metadata_path}")
        print(f"  - Index generated at: {index_path}")
        print("="*70)


if __name__ == "__main__":
    # Run integration test
    import tempfile
    with tempfile.TemporaryDirectory() as tmp_dir:
        test = TestScreenshotSystemIntegration()
        test.test_complete_screenshot_workflow(Path(tmp_dir))
