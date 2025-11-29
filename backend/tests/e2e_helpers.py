"""
Helper functions for E2E testing with Chrome DevTools MCP.

This module provides utility functions for common Chrome DevTools MCP operations
used in end-to-end testing of the LearningSong application.
"""

import json
import time
import socket
import requests
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, asdict


@dataclass
class ScreenshotMetadata:
    """Metadata for a captured screenshot."""
    
    filename: str
    filepath: str
    page: str
    scenario: str
    step: Optional[str]
    timestamp: str
    test_id: Optional[str] = None
    description: Optional[str] = None
    viewport_width: Optional[int] = None
    viewport_height: Optional[int] = None
    url: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert metadata to dictionary."""
        return asdict(self)
    
    def to_json(self) -> str:
        """Convert metadata to JSON string."""
        return json.dumps(self.to_dict(), indent=2)


class ChromeDevToolsHelper:
    """Helper class for Chrome DevTools MCP operations."""
    
    def __init__(self, report_dir: str = "./report/e2e-chrome-devtools-testing"):
        """
        Initialize the helper with report directory.
        
        Args:
            report_dir: Directory path for saving test artifacts
        """
        self.report_dir = Path(report_dir)
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        (self.report_dir / "page-a").mkdir(exist_ok=True)
        (self.report_dir / "page-b").mkdir(exist_ok=True)
        (self.report_dir / "page-c").mkdir(exist_ok=True)
        (self.report_dir / "responsive").mkdir(exist_ok=True)
        
        self.test_results: List[Dict[str, Any]] = []
        self.screenshot_metadata: List[ScreenshotMetadata] = []
        self.current_page_index: Optional[int] = None
        
        # Browser and server configuration
        self.chrome_debug_port = 9222
        self.frontend_port = 5173
        self.frontend_url = f"http://localhost:{self.frontend_port}"
    
    def verify_chrome_running(self) -> Tuple[bool, str]:
        """
        Verify that Chrome is running with remote debugging enabled.
        
        Returns:
            Tuple of (is_running: bool, message: str)
        """
        try:
            # Try to connect to Chrome DevTools Protocol endpoint
            response = requests.get(
                f"http://localhost:{self.chrome_debug_port}/json/version",
                timeout=2
            )
            
            if response.status_code == 200:
                version_info = response.json()
                browser = version_info.get("Browser", "Unknown")
                return True, f"Chrome is running with remote debugging: {browser}"
            else:
                return False, f"Chrome DevTools endpoint returned status {response.status_code}"
                
        except requests.exceptions.ConnectionError:
            return False, (
                f"Cannot connect to Chrome on port {self.chrome_debug_port}. "
                f"Please start Chrome with: chrome --remote-debugging-port={self.chrome_debug_port}"
            )
        except requests.exceptions.Timeout:
            return False, f"Connection to Chrome on port {self.chrome_debug_port} timed out"
        except Exception as e:
            return False, f"Error checking Chrome: {str(e)}"
    
    def verify_frontend_running(self) -> Tuple[bool, str]:
        """
        Verify that the frontend dev server is running on port 5173.
        
        Returns:
            Tuple of (is_running: bool, message: str)
        """
        try:
            # Try to connect to the frontend server
            response = requests.get(self.frontend_url, timeout=5)
            
            if response.status_code == 200:
                return True, f"Frontend dev server is running at {self.frontend_url}"
            else:
                return False, f"Frontend server returned status {response.status_code}"
                
        except requests.exceptions.ConnectionError:
            return False, (
                f"Cannot connect to frontend server at {self.frontend_url}. "
                f"Please start the dev server with: cd frontend && pnpm dev"
            )
        except requests.exceptions.Timeout:
            return False, f"Connection to frontend server at {self.frontend_url} timed out"
        except Exception as e:
            return False, f"Error checking frontend server: {str(e)}"
    
    def verify_prerequisites(self) -> Tuple[bool, List[str]]:
        """
        Verify that all prerequisites for E2E testing are met.
        
        Returns:
            Tuple of (success: bool, issues: List[str])
        """
        issues = []
        
        # Check if report directory exists
        if not self.report_dir.exists():
            issues.append(f"Report directory does not exist: {self.report_dir}")
        
        # Check Chrome
        chrome_running, chrome_msg = self.verify_chrome_running()
        if not chrome_running:
            issues.append(chrome_msg)
        
        # Check frontend server
        frontend_running, frontend_msg = self.verify_frontend_running()
        if not frontend_running:
            issues.append(frontend_msg)
        
        return len(issues) == 0, issues
    
    def get_page_url(self, page: str) -> str:
        """
        Get the full URL for a specific page.
        
        Args:
            page: Page identifier ('page-a', 'page-b', 'page-c', or 'home')
            
        Returns:
            Full URL string
        """
        page_paths = {
            "home": "/",
            "page-a": "/",  # Text Input Page is the home page
            "page-b": "/lyrics-editing",  # Lyrics Editing Page
            "page-c": "/song-playback"  # Song Playback Page
        }
        
        path = page_paths.get(page, "/")
        return f"{self.frontend_url}{path}"
    
    def navigate_to_page(
        self,
        page: str,
        timeout: int = 30,
        wait_for_load: bool = True
    ) -> Dict[str, Any]:
        """
        Navigate to a specific page with error handling.
        
        This function should be used with Chrome DevTools MCP tools.
        It returns instructions for navigation that can be executed via MCP.
        
        Args:
            page: Page identifier ('page-a', 'page-b', 'page-c', or 'home')
            timeout: Maximum time to wait for navigation in seconds
            wait_for_load: Whether to wait for page load completion
            
        Returns:
            Dictionary with navigation instructions and metadata
        """
        url = self.get_page_url(page)
        
        return {
            "action": "navigate",
            "url": url,
            "page": page,
            "timeout": timeout,
            "wait_for_load": wait_for_load,
            "instructions": (
                f"Use Chrome DevTools MCP to navigate to {url}. "
                f"Wait up to {timeout} seconds for the page to load."
            )
        }
    
    def wait_for_page_load(
        self,
        timeout: int = 30,
        check_interval: float = 0.5
    ) -> Dict[str, Any]:
        """
        Wait for page load completion.
        
        This function returns instructions for waiting for page load
        that can be executed via Chrome DevTools MCP.
        
        Args:
            timeout: Maximum time to wait in seconds
            check_interval: Time between checks in seconds
            
        Returns:
            Dictionary with wait instructions and metadata
        """
        return {
            "action": "wait_for_load",
            "timeout": timeout,
            "check_interval": check_interval,
            "instructions": (
                "Use Chrome DevTools MCP to wait for page load completion. "
                "Check that document.readyState === 'complete' and no pending network requests."
            ),
            "verification_script": """
                () => {
                    return document.readyState === 'complete';
                }
            """
        }
    
    def wait_for_element(
        self,
        selector: str,
        timeout: int = 10,
        visible: bool = True
    ) -> Dict[str, Any]:
        """
        Wait for an element to appear on the page.
        
        This function returns instructions for waiting for an element
        that can be executed via Chrome DevTools MCP.
        
        Args:
            selector: CSS selector for the element
            timeout: Maximum time to wait in seconds
            visible: Whether to wait for element to be visible (not just present in DOM)
            
        Returns:
            Dictionary with wait instructions and metadata
        """
        visibility_check = "el.offsetParent !== null" if visible else "true"
        
        return {
            "action": "wait_for_element",
            "selector": selector,
            "timeout": timeout,
            "visible": visible,
            "instructions": (
                f"Use Chrome DevTools MCP to wait for element '{selector}' to appear. "
                f"Timeout: {timeout} seconds. Visible: {visible}"
            ),
            "verification_script": f"""
                () => {{
                    const el = document.querySelector('{selector}');
                    return el !== null && {visibility_check};
                }}
            """
        }
    
    def connect_to_browser(self) -> Dict[str, Any]:
        """
        Connect to browser via Chrome DevTools MCP.
        
        This function returns instructions for connecting to the browser
        that can be executed via Chrome DevTools MCP tools.
        
        Returns:
            Dictionary with connection instructions and metadata
        """
        return {
            "action": "connect",
            "chrome_debug_port": self.chrome_debug_port,
            "instructions": (
                "Use Chrome DevTools MCP to connect to the browser. "
                f"The browser should be running with remote debugging on port {self.chrome_debug_port}. "
                "Use the mcp_chrome_devtools_list_pages tool to list available pages, "
                "then mcp_chrome_devtools_select_page to select the appropriate page."
            ),
            "steps": [
                "1. Call mcp_chrome_devtools_list_pages to see available browser pages",
                "2. Call mcp_chrome_devtools_select_page with the appropriate page index",
                "3. Verify connection by taking a snapshot or screenshot"
            ]
        }
    
    def retry_navigation(
        self,
        page: str,
        max_retries: int = 3,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        Navigate to a page with retry logic for handling failures.
        
        Args:
            page: Page identifier ('page-a', 'page-b', 'page-c', or 'home')
            max_retries: Maximum number of retry attempts
            timeout: Timeout for each navigation attempt in seconds
            
        Returns:
            Dictionary with retry navigation instructions
        """
        url = self.get_page_url(page)
        
        return {
            "action": "navigate_with_retry",
            "url": url,
            "page": page,
            "max_retries": max_retries,
            "timeout": timeout,
            "instructions": (
                f"Navigate to {url} with up to {max_retries} retry attempts. "
                f"Each attempt has a {timeout} second timeout. "
                "If navigation fails, wait 2 seconds before retrying."
            ),
            "retry_strategy": {
                "initial_delay": 2,
                "backoff_multiplier": 1.5,
                "max_delay": 10
            }
        }
    
    def verify_page_loaded(
        self,
        page: str,
        expected_elements: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Verify that a page has loaded correctly by checking for expected elements.
        
        Args:
            page: Page identifier ('page-a', 'page-b', 'page-c')
            expected_elements: Optional list of CSS selectors that should be present
            
        Returns:
            Dictionary with verification instructions
        """
        # Default expected elements for each page
        default_elements = {
            "page-a": [
                "textarea",  # Text input area
                "button"  # Submit button
            ],
            "page-b": [
                "textarea",  # Lyrics editor
                "select",  # Style selector
                "button"  # Generate button
            ],
            "page-c": [
                "audio",  # Audio player
                "button"  # Play/pause button
            ]
        }
        
        elements = expected_elements or default_elements.get(page, [])
        
        return {
            "action": "verify_page_loaded",
            "page": page,
            "expected_elements": elements,
            "instructions": (
                f"Verify that {page} has loaded correctly by checking for expected elements. "
                f"Expected elements: {', '.join(elements)}"
            ),
            "verification_script": f"""
                () => {{
                    const selectors = {json.dumps(elements)};
                    const results = selectors.map(sel => {{
                        const el = document.querySelector(sel);
                        return {{ selector: sel, found: el !== null }};
                    }});
                    const allFound = results.every(r => r.found);
                    return {{ success: allFound, results: results }};
                }}
            """
        }
    
    def generate_screenshot_filename(
        self, 
        page: str, 
        scenario: str, 
        step: Optional[str] = None
    ) -> str:
        """
        Generate a descriptive filename for screenshots.
        
        Args:
            page: Page identifier (page-a, page-b, page-c, responsive)
            scenario: Test scenario name
            step: Optional step identifier
            
        Returns:
            Filename string
        """
        # Include milliseconds to ensure unique filenames
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")[:20]  # YYYYMMDD-HHMMSS-mmm
        
        if step:
            return f"{scenario}-{step}-{timestamp}.png"
        return f"{scenario}-{timestamp}.png"
    
    def get_screenshot_path(self, page: str, filename: str) -> str:
        """
        Get the full path for a screenshot.
        
        Args:
            page: Page identifier (page-a, page-b, page-c, responsive)
            filename: Screenshot filename
            
        Returns:
            Full path string
        """
        return str(self.report_dir / page / filename)
    
    def capture_screenshot(
        self,
        page: str,
        scenario: str,
        step: Optional[str] = None,
        description: Optional[str] = None,
        test_id: Optional[str] = None,
        viewport_width: Optional[int] = None,
        viewport_height: Optional[int] = None,
        url: Optional[str] = None
    ) -> ScreenshotMetadata:
        """
        Capture a screenshot and record its metadata.
        
        This function generates the screenshot path and creates metadata
        for tracking. The actual screenshot capture should be done using
        Chrome DevTools MCP tools.
        
        Args:
            page: Page identifier (page-a, page-b, page-c, responsive)
            scenario: Test scenario name
            step: Optional step identifier
            description: Optional description of what the screenshot shows
            test_id: Optional test identifier
            viewport_width: Optional viewport width in pixels
            viewport_height: Optional viewport height in pixels
            url: Optional URL of the page when screenshot was taken
            
        Returns:
            ScreenshotMetadata object with all tracking information
        """
        # Generate filename and path
        filename = self.generate_screenshot_filename(page, scenario, step)
        filepath = self.get_screenshot_path(page, filename)
        
        # Create metadata
        metadata = ScreenshotMetadata(
            filename=filename,
            filepath=filepath,
            page=page,
            scenario=scenario,
            step=step,
            timestamp=datetime.now().isoformat(),
            test_id=test_id,
            description=description,
            viewport_width=viewport_width,
            viewport_height=viewport_height,
            url=url
        )
        
        # Store metadata
        self.screenshot_metadata.append(metadata)
        
        return metadata
    
    def get_screenshot_metadata(
        self,
        page: Optional[str] = None,
        scenario: Optional[str] = None,
        test_id: Optional[str] = None
    ) -> List[ScreenshotMetadata]:
        """
        Retrieve screenshot metadata with optional filtering.
        
        Args:
            page: Optional page filter (page-a, page-b, page-c, responsive)
            scenario: Optional scenario filter
            test_id: Optional test ID filter
            
        Returns:
            List of ScreenshotMetadata objects matching the filters
        """
        results = self.screenshot_metadata
        
        if page:
            results = [m for m in results if m.page == page]
        
        if scenario:
            results = [m for m in results if m.scenario == scenario]
        
        if test_id:
            results = [m for m in results if m.test_id == test_id]
        
        return results
    
    def save_screenshot_metadata(
        self,
        output_filename: Optional[str] = None
    ) -> str:
        """
        Save all screenshot metadata to a JSON file.
        
        Args:
            output_filename: Optional custom filename for the metadata file
            
        Returns:
            Path to the saved metadata file
        """
        if output_filename is None:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            output_filename = f"screenshot-metadata-{timestamp}.json"
        
        metadata_path = self.report_dir / output_filename
        
        # Convert all metadata to dictionaries
        metadata_list = [m.to_dict() for m in self.screenshot_metadata]
        
        # Write to file
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata_list, f, indent=2)
        
        return str(metadata_path)
    
    def generate_screenshot_index(
        self,
        output_filename: Optional[str] = None
    ) -> str:
        """
        Generate an HTML index page showing all captured screenshots.
        
        Args:
            output_filename: Optional custom filename for the index file
            
        Returns:
            Path to the generated index file
        """
        if output_filename is None:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            output_filename = f"screenshot-index-{timestamp}.html"
        
        index_path = self.report_dir / output_filename
        
        # Group screenshots by page
        screenshots_by_page = {}
        for metadata in self.screenshot_metadata:
            if metadata.page not in screenshots_by_page:
                screenshots_by_page[metadata.page] = []
            screenshots_by_page[metadata.page].append(metadata)
        
        # Generate HTML
        html_lines = [
            "<!DOCTYPE html>",
            "<html lang=\"en\">",
            "<head>",
            "    <meta charset=\"UTF-8\">",
            "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
            "    <title>E2E Test Screenshots</title>",
            "    <style>",
            "        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }",
            "        h1 { color: #333; }",
            "        h2 { color: #666; margin-top: 30px; }",
            "        .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }",
            "        .screenshot-card { background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }",
            "        .screenshot-card img { width: 100%; height: auto; border-radius: 4px; cursor: pointer; }",
            "        .screenshot-card img:hover { opacity: 0.8; }",
            "        .screenshot-info { margin-top: 10px; font-size: 14px; }",
            "        .screenshot-info .label { font-weight: bold; color: #666; }",
            "        .screenshot-info .value { color: #333; }",
            "        .timestamp { color: #999; font-size: 12px; }",
            "        .description { margin-top: 8px; font-style: italic; color: #555; }",
            "        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); }",
            "        .modal-content { margin: auto; display: block; max-width: 90%; max-height: 90%; }",
            "        .close { position: absolute; top: 15px; right: 35px; color: #f1f1f1; font-size: 40px; font-weight: bold; cursor: pointer; }",
            "    </style>",
            "</head>",
            "<body>",
            f"    <h1>E2E Test Screenshots - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</h1>",
            f"    <p>Total screenshots: {len(self.screenshot_metadata)}</p>",
            ""
        ]
        
        # Add screenshots grouped by page
        for page in sorted(screenshots_by_page.keys()):
            screenshots = screenshots_by_page[page]
            html_lines.append(f"    <h2>{page.upper()} ({len(screenshots)} screenshots)</h2>")
            html_lines.append("    <div class=\"screenshot-grid\">")
            
            for metadata in screenshots:
                # Make path relative to index file
                rel_path = Path(metadata.filepath).relative_to(self.report_dir)
                
                html_lines.append("        <div class=\"screenshot-card\">")
                html_lines.append(f"            <img src=\"{rel_path}\" alt=\"{metadata.scenario}\" onclick=\"openModal(this.src)\">")
                html_lines.append("            <div class=\"screenshot-info\">")
                html_lines.append(f"                <div><span class=\"label\">Scenario:</span> <span class=\"value\">{metadata.scenario}</span></div>")
                
                if metadata.step:
                    html_lines.append(f"                <div><span class=\"label\">Step:</span> <span class=\"value\">{metadata.step}</span></div>")
                
                if metadata.test_id:
                    html_lines.append(f"                <div><span class=\"label\">Test ID:</span> <span class=\"value\">{metadata.test_id}</span></div>")
                
                if metadata.viewport_width and metadata.viewport_height:
                    html_lines.append(f"                <div><span class=\"label\">Viewport:</span> <span class=\"value\">{metadata.viewport_width}x{metadata.viewport_height}</span></div>")
                
                if metadata.url:
                    html_lines.append(f"                <div><span class=\"label\">URL:</span> <span class=\"value\">{metadata.url}</span></div>")
                
                html_lines.append(f"                <div class=\"timestamp\">{metadata.timestamp}</div>")
                
                if metadata.description:
                    html_lines.append(f"                <div class=\"description\">{metadata.description}</div>")
                
                html_lines.append("            </div>")
                html_lines.append("        </div>")
            
            html_lines.append("    </div>")
        
        # Add modal for full-size image viewing
        html_lines.extend([
            "",
            "    <div id=\"imageModal\" class=\"modal\" onclick=\"closeModal()\">",
            "        <span class=\"close\" onclick=\"closeModal()\">&times;</span>",
            "        <img class=\"modal-content\" id=\"modalImage\">",
            "    </div>",
            "",
            "    <script>",
            "        function openModal(src) {",
            "            document.getElementById('imageModal').style.display = 'block';",
            "            document.getElementById('modalImage').src = src;",
            "        }",
            "        function closeModal() {",
            "            document.getElementById('imageModal').style.display = 'none';",
            "        }",
            "    </script>",
            "</body>",
            "</html>"
        ])
        
        # Write to file
        with open(index_path, "w", encoding="utf-8") as f:
            f.write("\n".join(html_lines))
        
        return str(index_path)
    
    def organize_screenshots_by_category(
        self,
        categories: Optional[Dict[str, List[str]]] = None
    ) -> Dict[str, List[ScreenshotMetadata]]:
        """
        Organize screenshots into custom categories.
        
        Args:
            categories: Optional dictionary mapping category names to lists of scenario names.
                       If None, uses default categories (by page).
            
        Returns:
            Dictionary mapping category names to lists of ScreenshotMetadata
        """
        if categories is None:
            # Default: organize by page
            categories = {
                "Page A - Text Input": ["page-a"],
                "Page B - Lyrics Editing": ["page-b"],
                "Page C - Song Playback": ["page-c"],
                "Responsive Design": ["responsive"]
            }
        
        organized = {}
        
        for category_name, scenario_patterns in categories.items():
            organized[category_name] = []
            
            for metadata in self.screenshot_metadata:
                # Check if metadata matches any pattern in this category
                for pattern in scenario_patterns:
                    if pattern in metadata.page or pattern in metadata.scenario:
                        organized[category_name].append(metadata)
                        break
        
        return organized
    
    def record_test_result(
        self,
        scenario_id: str,
        status: str,
        duration: float,
        screenshots: List[str],
        error: Optional[str] = None
    ) -> None:
        """
        Record a test result for reporting.
        
        Args:
            scenario_id: Unique identifier for the test scenario
            status: Test status (passed, failed, skipped)
            duration: Test duration in seconds
            screenshots: List of screenshot paths
            error: Optional error message if test failed
        """
        result = {
            "scenario_id": scenario_id,
            "status": status,
            "duration": duration,
            "timestamp": datetime.now().isoformat(),
            "screenshots": screenshots,
            "error": error
        }
        self.test_results.append(result)
    
    def generate_test_report(self, output_filename: Optional[str] = None) -> str:
        """
        Generate a comprehensive test report in Markdown format.
        
        Args:
            output_filename: Optional custom filename for the report
            
        Returns:
            Path to the generated report
        """
        if output_filename is None:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            output_filename = f"test-report-{timestamp}.md"
        
        report_path = self.report_dir / output_filename
        
        # Calculate summary statistics
        total_tests = len(self.test_results)
        passed = sum(1 for r in self.test_results if r["status"] == "passed")
        failed = sum(1 for r in self.test_results if r["status"] == "failed")
        skipped = sum(1 for r in self.test_results if r["status"] == "skipped")
        total_duration = sum(r["duration"] for r in self.test_results)
        
        # Generate report content
        report_lines = [
            f"# E2E Test Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "## Summary",
            "",
            f"- **Total Tests**: {total_tests}",
            f"- **Passed**: {passed} ✓",
            f"- **Failed**: {failed} ✗",
            f"- **Skipped**: {skipped} ⊘",
            f"- **Total Duration**: {total_duration:.2f}s",
            "",
            "## Test Results",
            ""
        ]
        
        # Add individual test results
        for result in self.test_results:
            status_icon = "✓" if result["status"] == "passed" else "✗" if result["status"] == "failed" else "⊘"
            report_lines.append(f"### {status_icon} {result['scenario_id']}")
            report_lines.append("")
            report_lines.append(f"- **Status**: {result['status']}")
            report_lines.append(f"- **Duration**: {result['duration']:.2f}s")
            report_lines.append(f"- **Timestamp**: {result['timestamp']}")
            
            if result.get("error"):
                report_lines.append(f"- **Error**: {result['error']}")
            
            if result.get("screenshots"):
                report_lines.append("")
                report_lines.append("**Screenshots**:")
                for screenshot in result["screenshots"]:
                    # Make path relative to report directory
                    rel_path = Path(screenshot).relative_to(self.report_dir)
                    report_lines.append(f"- ![Screenshot](./{rel_path})")
            
            report_lines.append("")
        
        # Write report to file
        with open(report_path, "w", encoding="utf-8") as f:
            f.write("\n".join(report_lines))
        
        return str(report_path)
    
    def create_mock_data(self) -> Dict[str, Any]:
        """
        Create mock data structures for API responses.
        
        Returns:
            Dictionary containing all mock data scenarios
        """
        return {
            "lyrics_success": {
                "lyrics": "[Verse 1]\nLearning is a journey we take every day\nBuilding knowledge in every way\n[Chorus]\nStep by step we grow and learn\nEvery lesson helps us in return",
                "content_hash": "abc123def456",
                "word_count": 150,
                "search_used": False
            },
            "lyrics_with_search": {
                "lyrics": "[Verse 1]\nEnriched with context from the web\nKnowledge woven like a thread\n[Chorus]\nSearching far and searching wide\nLearning with the world as guide",
                "content_hash": "xyz789uvw012",
                "word_count": 200,
                "search_used": True
            },
            "song_queued": {
                "task_id": "task_123",
                "status": "queued",
                "message": "Song generation queued"
            },
            "song_processing": {
                "task_id": "task_123",
                "status": "processing",
                "message": "Generating your song..."
            },
            "song_completed": {
                "task_id": "task_123",
                "status": "completed",
                "message": "Song generation completed",
                "song_url": "https://mock-cdn.com/song.mp3",
                "song_id": "song_456"
            },
            "websocket_updates": [
                {"task_id": "task_123", "status": "queued", "progress": 0},
                {"task_id": "task_123", "status": "processing", "progress": 25},
                {"task_id": "task_123", "status": "processing", "progress": 50},
                {"task_id": "task_123", "status": "processing", "progress": 75},
                {
                    "task_id": "task_123",
                    "status": "completed",
                    "progress": 100,
                    "song_url": "https://mock-cdn.com/song.mp3",
                    "song_id": "song_456"
                }
            ],
            "error_rate_limit": {
                "status": 429,
                "detail": "Rate limit exceeded. You can generate 3 songs per day.",
                "reset_time": "2025-11-29T00:00:00Z"
            },
            "error_server": {
                "status": 500,
                "detail": "Internal server error. Please try again later."
            },
            "error_validation": {
                "status": 400,
                "detail": "Lyrics must be between 50 and 3000 characters"
            },
            "error_timeout": {
                "status": 504,
                "detail": "Request timeout. Please try again."
            },
            "song_data": {
                "id": "song_456",
                "audio_url": "https://mock-cdn.com/song.mp3",
                "title": "Learning Journey",
                "style": "Pop",
                "duration": 180,
                "created_at": "2025-11-28T12:00:00Z",
                "lyrics": "[Verse 1]\nLearning is a journey we take every day"
            }
        }
    
    def format_network_log(self, network_data: List[Dict[str, Any]]) -> str:
        """
        Format network activity logs for reporting.
        
        Args:
            network_data: List of network request/response data
            
        Returns:
            Formatted string for report
        """
        lines = ["## Network Activity", ""]
        
        for req in network_data:
            lines.append(f"### {req.get('method', 'GET')} {req.get('url', 'unknown')}")
            lines.append(f"- **Status**: {req.get('status', 'N/A')}")
            lines.append(f"- **Duration**: {req.get('duration', 0)}ms")
            
            if req.get('requestBody'):
                lines.append(f"- **Request Body**: ```json\n{json.dumps(req['requestBody'], indent=2)}\n```")
            
            if req.get('responseBody'):
                lines.append(f"- **Response Body**: ```json\n{json.dumps(req['responseBody'], indent=2)}\n```")
            
            lines.append("")
        
        return "\n".join(lines)
    
    def format_console_log(self, console_data: List[Dict[str, Any]]) -> str:
        """
        Format console logs for reporting.
        
        Args:
            console_data: List of console messages
            
        Returns:
            Formatted string for report
        """
        lines = ["## Console Messages", ""]
        
        errors = [msg for msg in console_data if msg.get("level") == "error"]
        warnings = [msg for msg in console_data if msg.get("level") == "warn"]
        
        if errors:
            lines.append("### Errors")
            lines.append("")
            for error in errors:
                lines.append(f"- **{error.get('timestamp', 'N/A')}**: {error.get('message', '')}")
                if error.get('stackTrace'):
                    lines.append(f"  ```\n  {error['stackTrace']}\n  ```")
            lines.append("")
        
        if warnings:
            lines.append("### Warnings")
            lines.append("")
            for warning in warnings:
                lines.append(f"- **{warning.get('timestamp', 'N/A')}**: {warning.get('message', '')}")
            lines.append("")
        
        if not errors and not warnings:
            lines.append("No errors or warnings detected.")
            lines.append("")
        
        return "\n".join(lines)
    
    def wait_for_condition(
        self,
        condition_fn,
        timeout: int = 10,
        interval: float = 0.5
    ) -> bool:
        """
        Wait for a condition to be true with timeout.
        
        Args:
            condition_fn: Function that returns True when condition is met
            timeout: Maximum time to wait in seconds
            interval: Time between checks in seconds
            
        Returns:
            True if condition was met, False if timeout
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if condition_fn():
                return True
            time.sleep(interval)
        
        return False
    
    def get_viewport_sizes(self) -> Dict[str, Tuple[int, int]]:
        """
        Get standard viewport sizes for responsive testing.
        
        Returns:
            Dictionary mapping device type to (width, height) tuples
        """
        return {
            "mobile": (375, 667),
            "tablet": (768, 1024),
            "desktop": (1920, 1080)
        }
    
    def validate_touch_target_size(
        self,
        element_width: int,
        element_height: int,
        min_size: int = 44
    ) -> bool:
        """
        Validate that an interactive element meets minimum touch target size.
        
        Args:
            element_width: Width of the element in pixels
            element_height: Height of the element in pixels
            min_size: Minimum size requirement (default 44px for accessibility)
            
        Returns:
            True if element meets minimum size requirements
        """
        return element_width >= min_size and element_height >= min_size


# Convenience functions for common operations

def create_helper(report_dir: str = "./report/e2e-chrome-devtools-testing") -> ChromeDevToolsHelper:
    """
    Create and return a ChromeDevToolsHelper instance.
    
    Args:
        report_dir: Directory path for saving test artifacts
        
    Returns:
        ChromeDevToolsHelper instance
    """
    return ChromeDevToolsHelper(report_dir)


def get_mock_data() -> Dict[str, Any]:
    """
    Get mock data for API responses.
    
    Returns:
        Dictionary containing all mock data scenarios
    """
    helper = ChromeDevToolsHelper()
    return helper.create_mock_data()


def generate_screenshot_path(page: str, scenario: str, step: Optional[str] = None) -> str:
    """
    Generate a screenshot path for a test scenario.
    
    Args:
        page: Page identifier (page-a, page-b, page-c, responsive)
        scenario: Test scenario name
        step: Optional step identifier
        
    Returns:
        Full path string for the screenshot
    """
    helper = ChromeDevToolsHelper()
    filename = helper.generate_screenshot_filename(page, scenario, step)
    return helper.get_screenshot_path(page, filename)


def verify_chrome_running() -> Tuple[bool, str]:
    """
    Verify that Chrome is running with remote debugging enabled.
    
    Returns:
        Tuple of (is_running: bool, message: str)
    """
    helper = ChromeDevToolsHelper()
    return helper.verify_chrome_running()


def verify_frontend_running() -> Tuple[bool, str]:
    """
    Verify that the frontend dev server is running.
    
    Returns:
        Tuple of (is_running: bool, message: str)
    """
    helper = ChromeDevToolsHelper()
    return helper.verify_frontend_running()


def get_page_url(page: str) -> str:
    """
    Get the full URL for a specific page.
    
    Args:
        page: Page identifier ('page-a', 'page-b', 'page-c', or 'home')
        
    Returns:
        Full URL string
    """
    helper = ChromeDevToolsHelper()
    return helper.get_page_url(page)


def navigate_to_page(page: str, timeout: int = 30) -> Dict[str, Any]:
    """
    Get navigation instructions for a specific page.
    
    Args:
        page: Page identifier ('page-a', 'page-b', 'page-c', or 'home')
        timeout: Maximum time to wait for navigation in seconds
        
    Returns:
        Dictionary with navigation instructions
    """
    helper = ChromeDevToolsHelper()
    return helper.navigate_to_page(page, timeout)


def connect_to_browser() -> Dict[str, Any]:
    """
    Get instructions for connecting to browser via Chrome DevTools MCP.
    
    Returns:
        Dictionary with connection instructions
    """
    helper = ChromeDevToolsHelper()
    return helper.connect_to_browser()


def capture_screenshot(
    page: str,
    scenario: str,
    step: Optional[str] = None,
    description: Optional[str] = None,
    test_id: Optional[str] = None,
    viewport_width: Optional[int] = None,
    viewport_height: Optional[int] = None,
    url: Optional[str] = None,
    helper: Optional[ChromeDevToolsHelper] = None
) -> ScreenshotMetadata:
    """
    Capture a screenshot and record its metadata.
    
    Args:
        page: Page identifier (page-a, page-b, page-c, responsive)
        scenario: Test scenario name
        step: Optional step identifier
        description: Optional description of what the screenshot shows
        test_id: Optional test identifier
        viewport_width: Optional viewport width in pixels
        viewport_height: Optional viewport height in pixels
        url: Optional URL of the page when screenshot was taken
        helper: Optional ChromeDevToolsHelper instance (creates new one if None)
        
    Returns:
        ScreenshotMetadata object with all tracking information
    """
    if helper is None:
        helper = ChromeDevToolsHelper()
    
    return helper.capture_screenshot(
        page=page,
        scenario=scenario,
        step=step,
        description=description,
        test_id=test_id,
        viewport_width=viewport_width,
        viewport_height=viewport_height,
        url=url
    )


def save_screenshot_metadata(
    helper: Optional[ChromeDevToolsHelper] = None,
    output_filename: Optional[str] = None
) -> str:
    """
    Save all screenshot metadata to a JSON file.
    
    Args:
        helper: Optional ChromeDevToolsHelper instance (creates new one if None)
        output_filename: Optional custom filename for the metadata file
        
    Returns:
        Path to the saved metadata file
    """
    if helper is None:
        helper = ChromeDevToolsHelper()
    
    return helper.save_screenshot_metadata(output_filename)


def generate_screenshot_index(
    helper: Optional[ChromeDevToolsHelper] = None,
    output_filename: Optional[str] = None
) -> str:
    """
    Generate an HTML index page showing all captured screenshots.
    
    Args:
        helper: Optional ChromeDevToolsHelper instance (creates new one if None)
        output_filename: Optional custom filename for the index file
        
    Returns:
        Path to the generated index file
    """
    if helper is None:
        helper = ChromeDevToolsHelper()
    
    return helper.generate_screenshot_index(output_filename)
