"""
Test report generation system for E2E Chrome DevTools testing.

This module provides functionality to generate comprehensive test reports
that aggregate test results, screenshots, network activity, and console logs.

Requirements covered:
- 10.5: Generate comprehensive test report with screenshots and network logs
"""

import json
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from enum import Enum


class TestStatus(Enum):
    """Test execution status."""
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"


@dataclass
class TestResult:
    """Result of a single test scenario."""
    
    scenario_id: str
    scenario_name: str
    status: str
    duration_seconds: float
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    page: Optional[str] = None
    description: Optional[str] = None
    screenshots: List[str] = field(default_factory=list)
    error_message: Optional[str] = None
    error_stack: Optional[str] = None
    assertions: List[Dict[str, Any]] = field(default_factory=list)
    requirements: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    def is_passed(self) -> bool:
        """Check if test passed."""
        return self.status == TestStatus.PASSED.value
    
    def is_failed(self) -> bool:
        """Check if test failed."""
        return self.status == TestStatus.FAILED.value


@dataclass
class NetworkActivitySummary:
    """Summary of network activity during testing."""
    
    total_requests: int = 0
    api_requests: int = 0
    failed_requests: int = 0
    cached_requests: int = 0
    websocket_connections: int = 0
    avg_response_time_ms: Optional[float] = None
    requests: List[Dict[str, Any]] = field(default_factory=list)
    failed_request_details: List[Dict[str, Any]] = field(default_factory=list)
    websocket_details: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class ConsoleLogSummary:
    """Summary of console activity during testing."""
    
    total_messages: int = 0
    error_count: int = 0
    warning_count: int = 0
    critical_error_count: int = 0
    should_fail_test: bool = False
    failure_reasons: List[str] = field(default_factory=list)
    errors: List[Dict[str, Any]] = field(default_factory=list)
    warnings: List[Dict[str, Any]] = field(default_factory=list)
    critical_errors: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class ScreenshotInfo:
    """Information about a captured screenshot."""
    
    filename: str
    filepath: str
    page: str
    scenario: str
    step: Optional[str] = None
    description: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    viewport_width: Optional[int] = None
    viewport_height: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    def get_relative_path(self, report_dir: Path) -> str:
        """Get path relative to report directory."""
        try:
            return str(Path(self.filepath).relative_to(report_dir))
        except ValueError:
            return self.filepath



class E2ETestReportGenerator:
    """
    Generate comprehensive E2E test reports.
    
    This class aggregates test results, screenshots, network activity,
    and console logs into a comprehensive markdown report.
    """
    
    def __init__(self, report_dir: str = "./report/e2e-chrome-devtools-testing"):
        """
        Initialize the report generator.
        
        Args:
            report_dir: Directory for saving test reports
        """
        self.report_dir = Path(report_dir)
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
        self.test_results: List[TestResult] = []
        self.screenshots: List[ScreenshotInfo] = []
        self.network_summary: Optional[NetworkActivitySummary] = None
        self.console_summary: Optional[ConsoleLogSummary] = None
        self.test_start_time: Optional[datetime] = None
        self.test_end_time: Optional[datetime] = None
        self.metadata: Dict[str, Any] = {}
    
    def start_test_run(self, metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Mark the start of a test run.
        
        Args:
            metadata: Optional metadata about the test run
        """
        self.test_start_time = datetime.now()
        self.metadata = metadata or {}
        self.test_results.clear()
        self.screenshots.clear()
        self.network_summary = None
        self.console_summary = None
    
    def end_test_run(self) -> None:
        """Mark the end of a test run."""
        self.test_end_time = datetime.now()
    
    def add_test_result(
        self,
        scenario_id: str,
        scenario_name: str,
        status: str,
        duration_seconds: float,
        page: Optional[str] = None,
        description: Optional[str] = None,
        screenshots: Optional[List[str]] = None,
        error_message: Optional[str] = None,
        error_stack: Optional[str] = None,
        assertions: Optional[List[Dict[str, Any]]] = None,
        requirements: Optional[List[str]] = None
    ) -> TestResult:
        """
        Add a test result.
        
        Args:
            scenario_id: Unique identifier for the test scenario
            scenario_name: Human-readable name of the test
            status: Test status (passed, failed, skipped, error)
            duration_seconds: Test duration in seconds
            page: Page being tested (page-a, page-b, page-c)
            description: Description of what was tested
            screenshots: List of screenshot paths
            error_message: Error message if test failed
            error_stack: Error stack trace if available
            assertions: List of assertion results
            requirements: List of requirement IDs covered
            
        Returns:
            The created TestResult
        """
        result = TestResult(
            scenario_id=scenario_id,
            scenario_name=scenario_name,
            status=status,
            duration_seconds=duration_seconds,
            page=page,
            description=description,
            screenshots=screenshots or [],
            error_message=error_message,
            error_stack=error_stack,
            assertions=assertions or [],
            requirements=requirements or []
        )
        self.test_results.append(result)
        return result
    
    def add_screenshot(
        self,
        filename: str,
        filepath: str,
        page: str,
        scenario: str,
        step: Optional[str] = None,
        description: Optional[str] = None,
        viewport_width: Optional[int] = None,
        viewport_height: Optional[int] = None
    ) -> ScreenshotInfo:
        """
        Add screenshot information.
        
        Args:
            filename: Screenshot filename
            filepath: Full path to screenshot
            page: Page identifier
            scenario: Test scenario name
            step: Optional step identifier
            description: Optional description
            viewport_width: Viewport width in pixels
            viewport_height: Viewport height in pixels
            
        Returns:
            The created ScreenshotInfo
        """
        screenshot = ScreenshotInfo(
            filename=filename,
            filepath=filepath,
            page=page,
            scenario=scenario,
            step=step,
            description=description,
            viewport_width=viewport_width,
            viewport_height=viewport_height
        )
        self.screenshots.append(screenshot)
        return screenshot
    
    def set_network_summary(
        self,
        total_requests: int = 0,
        api_requests: int = 0,
        failed_requests: int = 0,
        cached_requests: int = 0,
        websocket_connections: int = 0,
        avg_response_time_ms: Optional[float] = None,
        requests: Optional[List[Dict[str, Any]]] = None,
        failed_request_details: Optional[List[Dict[str, Any]]] = None,
        websocket_details: Optional[List[Dict[str, Any]]] = None
    ) -> NetworkActivitySummary:
        """
        Set network activity summary.
        
        Args:
            total_requests: Total number of network requests
            api_requests: Number of API requests
            failed_requests: Number of failed requests
            cached_requests: Number of cached requests
            websocket_connections: Number of WebSocket connections
            avg_response_time_ms: Average response time in milliseconds
            requests: List of request details
            failed_request_details: Details of failed requests
            websocket_details: WebSocket connection details
            
        Returns:
            The created NetworkActivitySummary
        """
        self.network_summary = NetworkActivitySummary(
            total_requests=total_requests,
            api_requests=api_requests,
            failed_requests=failed_requests,
            cached_requests=cached_requests,
            websocket_connections=websocket_connections,
            avg_response_time_ms=avg_response_time_ms,
            requests=requests or [],
            failed_request_details=failed_request_details or [],
            websocket_details=websocket_details or []
        )
        return self.network_summary
    
    def set_console_summary(
        self,
        total_messages: int = 0,
        error_count: int = 0,
        warning_count: int = 0,
        critical_error_count: int = 0,
        should_fail_test: bool = False,
        failure_reasons: Optional[List[str]] = None,
        errors: Optional[List[Dict[str, Any]]] = None,
        warnings: Optional[List[Dict[str, Any]]] = None,
        critical_errors: Optional[List[Dict[str, Any]]] = None
    ) -> ConsoleLogSummary:
        """
        Set console log summary.
        
        Args:
            total_messages: Total number of console messages
            error_count: Number of errors
            warning_count: Number of warnings
            critical_error_count: Number of critical errors
            should_fail_test: Whether console errors should fail the test
            failure_reasons: Reasons for test failure
            errors: List of error details
            warnings: List of warning details
            critical_errors: List of critical error details
            
        Returns:
            The created ConsoleLogSummary
        """
        self.console_summary = ConsoleLogSummary(
            total_messages=total_messages,
            error_count=error_count,
            warning_count=warning_count,
            critical_error_count=critical_error_count,
            should_fail_test=should_fail_test,
            failure_reasons=failure_reasons or [],
            errors=errors or [],
            warnings=warnings or [],
            critical_errors=critical_errors or []
        )
        return self.console_summary
    
    def get_test_summary(self) -> Dict[str, Any]:
        """
        Get summary statistics for all test results.
        
        Returns:
            Dictionary with summary statistics
        """
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r.status == TestStatus.PASSED.value)
        failed = sum(1 for r in self.test_results if r.status == TestStatus.FAILED.value)
        skipped = sum(1 for r in self.test_results if r.status == TestStatus.SKIPPED.value)
        errors = sum(1 for r in self.test_results if r.status == TestStatus.ERROR.value)
        
        total_duration = sum(r.duration_seconds for r in self.test_results)
        
        # Calculate pass rate
        pass_rate = (passed / total * 100) if total > 0 else 0
        
        # Get test run duration
        run_duration = None
        if self.test_start_time and self.test_end_time:
            run_duration = (self.test_end_time - self.test_start_time).total_seconds()
        
        return {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "errors": errors,
            "pass_rate": pass_rate,
            "total_duration_seconds": total_duration,
            "run_duration_seconds": run_duration,
            "screenshot_count": len(self.screenshots)
        }
    
    def get_results_by_page(self) -> Dict[str, List[TestResult]]:
        """
        Group test results by page.
        
        Returns:
            Dictionary mapping page names to test results
        """
        results_by_page: Dict[str, List[TestResult]] = {}
        
        for result in self.test_results:
            page = result.page or "other"
            if page not in results_by_page:
                results_by_page[page] = []
            results_by_page[page].append(result)
        
        return results_by_page
    
    def get_failed_tests(self) -> List[TestResult]:
        """
        Get all failed test results.
        
        Returns:
            List of failed TestResult objects
        """
        return [r for r in self.test_results if r.is_failed()]
    
    def get_screenshots_by_page(self) -> Dict[str, List[ScreenshotInfo]]:
        """
        Group screenshots by page.
        
        Returns:
            Dictionary mapping page names to screenshots
        """
        screenshots_by_page: Dict[str, List[ScreenshotInfo]] = {}
        
        for screenshot in self.screenshots:
            page = screenshot.page
            if page not in screenshots_by_page:
                screenshots_by_page[page] = []
            screenshots_by_page[page].append(screenshot)
        
        return screenshots_by_page


    def _format_status_icon(self, status: str) -> str:
        """Get status icon for display."""
        icons = {
            TestStatus.PASSED.value: "✅",
            TestStatus.FAILED.value: "❌",
            TestStatus.SKIPPED.value: "⏭️",
            TestStatus.ERROR.value: "⚠️"
        }
        return icons.get(status, "❓")
    
    def _format_duration(self, seconds: float) -> str:
        """Format duration for display."""
        if seconds < 1:
            return f"{seconds * 1000:.0f}ms"
        elif seconds < 60:
            return f"{seconds:.2f}s"
        else:
            minutes = int(seconds // 60)
            secs = seconds % 60
            return f"{minutes}m {secs:.0f}s"
    
    def _generate_header(self) -> List[str]:
        """Generate report header section."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        lines = [
            f"# E2E Test Report",
            "",
            f"**Generated**: {timestamp}",
            ""
        ]
        
        # Add test run time info
        if self.test_start_time:
            lines.append(f"**Test Run Started**: {self.test_start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        if self.test_end_time:
            lines.append(f"**Test Run Ended**: {self.test_end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Add metadata
        if self.metadata:
            lines.append("")
            lines.append("**Test Configuration**:")
            for key, value in self.metadata.items():
                lines.append(f"- {key}: {value}")
        
        lines.append("")
        lines.append("---")
        lines.append("")
        
        return lines
    
    def _generate_summary_section(self) -> List[str]:
        """Generate summary section."""
        summary = self.get_test_summary()
        
        lines = [
            "## Summary",
            "",
            "| Metric | Value |",
            "|--------|-------|",
            f"| Total Tests | {summary['total_tests']} |",
            f"| Passed | {summary['passed']} ✅ |",
            f"| Failed | {summary['failed']} ❌ |",
            f"| Skipped | {summary['skipped']} ⏭️ |",
            f"| Errors | {summary['errors']} ⚠️ |",
            f"| Pass Rate | {summary['pass_rate']:.1f}% |",
            f"| Total Duration | {self._format_duration(summary['total_duration_seconds'])} |",
            f"| Screenshots | {summary['screenshot_count']} |",
            ""
        ]
        
        if summary['run_duration_seconds']:
            lines.insert(-1, f"| Run Duration | {self._format_duration(summary['run_duration_seconds'])} |")
        
        # Add overall status
        if summary['failed'] == 0 and summary['errors'] == 0:
            lines.extend([
                "### Overall Status: ✅ PASSED",
                "",
                "All tests completed successfully.",
                ""
            ])
        else:
            lines.extend([
                "### Overall Status: ❌ FAILED",
                "",
                f"**{summary['failed']} test(s) failed, {summary['errors']} error(s) occurred.**",
                ""
            ])
        
        return lines
    
    def _generate_test_results_section(self) -> List[str]:
        """Generate test results section."""
        lines = [
            "## Test Results",
            ""
        ]
        
        # Group by page
        results_by_page = self.get_results_by_page()
        
        page_order = ["page-a", "page-b", "page-c", "responsive", "user-journey", "other"]
        page_names = {
            "page-a": "Page A - Text Input",
            "page-b": "Page B - Lyrics Editing",
            "page-c": "Page C - Song Playback",
            "responsive": "Responsive Design",
            "user-journey": "User Journey",
            "other": "Other Tests"
        }
        
        for page in page_order:
            if page not in results_by_page:
                continue
            
            results = results_by_page[page]
            page_name = page_names.get(page, page.title())
            
            # Calculate page summary
            page_passed = sum(1 for r in results if r.is_passed())
            page_total = len(results)
            
            lines.extend([
                f"### {page_name}",
                "",
                f"**{page_passed}/{page_total} tests passed**",
                ""
            ])
            
            for result in results:
                status_icon = self._format_status_icon(result.status)
                duration = self._format_duration(result.duration_seconds)
                
                lines.append(f"#### {status_icon} {result.scenario_name}")
                lines.append("")
                lines.append(f"- **Status**: {result.status.upper()}")
                lines.append(f"- **Duration**: {duration}")
                lines.append(f"- **Scenario ID**: `{result.scenario_id}`")
                
                if result.description:
                    lines.append(f"- **Description**: {result.description}")
                
                if result.requirements:
                    lines.append(f"- **Requirements**: {', '.join(result.requirements)}")
                
                # Add error details for failed tests
                if result.is_failed() and result.error_message:
                    lines.extend([
                        "",
                        "**Error Details**:",
                        "",
                        f"```",
                        result.error_message,
                        "```"
                    ])
                    
                    if result.error_stack:
                        lines.extend([
                            "",
                            "**Stack Trace**:",
                            "",
                            "```",
                            result.error_stack,
                            "```"
                        ])
                
                # Add assertion details
                if result.assertions:
                    lines.extend([
                        "",
                        "**Assertions**:",
                        ""
                    ])
                    for assertion in result.assertions:
                        status = "✅" if assertion.get("passed") else "❌"
                        lines.append(f"- {status} {assertion.get('description', 'Unknown assertion')}")
                
                # Add screenshot references
                if result.screenshots:
                    lines.extend([
                        "",
                        "**Screenshots**:",
                        ""
                    ])
                    for screenshot_path in result.screenshots:
                        rel_path = self._get_relative_screenshot_path(screenshot_path)
                        lines.append(f"- ![Screenshot]({rel_path})")
                
                lines.append("")
        
        return lines
    
    def _get_relative_screenshot_path(self, filepath: str) -> str:
        """Get screenshot path relative to report directory."""
        try:
            return str(Path(filepath).relative_to(self.report_dir))
        except ValueError:
            return filepath
    
    def _generate_failed_tests_section(self) -> List[str]:
        """Generate failed tests summary section."""
        failed_tests = self.get_failed_tests()
        
        if not failed_tests:
            return []
        
        lines = [
            "## Failed Tests Summary",
            "",
            "The following tests failed and require attention:",
            ""
        ]
        
        for i, result in enumerate(failed_tests, 1):
            lines.extend([
                f"### {i}. {result.scenario_name}",
                "",
                f"- **Scenario ID**: `{result.scenario_id}`",
                f"- **Page**: {result.page or 'N/A'}",
            ])
            
            if result.error_message:
                # Truncate long error messages
                error_msg = result.error_message
                if len(error_msg) > 200:
                    error_msg = error_msg[:200] + "..."
                lines.append(f"- **Error**: {error_msg}")
            
            lines.append("")
        
        return lines


    def _generate_network_section(self) -> List[str]:
        """Generate network activity section."""
        if not self.network_summary:
            return []
        
        ns = self.network_summary
        
        lines = [
            "## Network Activity",
            "",
            "### Summary",
            "",
            "| Metric | Value |",
            "|--------|-------|",
            f"| Total Requests | {ns.total_requests} |",
            f"| API Requests | {ns.api_requests} |",
            f"| Failed Requests | {ns.failed_requests} |",
            f"| Cached Requests | {ns.cached_requests} |",
            f"| WebSocket Connections | {ns.websocket_connections} |",
        ]
        
        if ns.avg_response_time_ms is not None:
            lines.append(f"| Avg Response Time | {ns.avg_response_time_ms:.2f}ms |")
        
        lines.append("")
        
        # Add API request details
        if ns.requests:
            lines.extend([
                "### API Requests",
                "",
                "| Method | URL | Status | Duration |",
                "|--------|-----|--------|----------|"
            ])
            
            # Show up to 20 requests
            for req in ns.requests[:20]:
                method = req.get("method", "GET")
                url = req.get("url", "unknown")
                # Truncate long URLs
                if len(url) > 50:
                    url = url[:47] + "..."
                status = req.get("status", "N/A")
                duration = req.get("duration_ms")
                duration_str = f"{duration:.0f}ms" if duration else "N/A"
                
                status_icon = "✅" if status and status < 400 else "❌" if status else "⏳"
                lines.append(f"| {method} | {url} | {status_icon} {status} | {duration_str} |")
            
            if len(ns.requests) > 20:
                lines.append(f"| ... | *{len(ns.requests) - 20} more requests* | | |")
            
            lines.append("")
        
        # Add failed request details
        if ns.failed_request_details:
            lines.extend([
                "### Failed Requests",
                ""
            ])
            
            for req in ns.failed_request_details:
                lines.extend([
                    f"#### ❌ {req.get('method', 'GET')} {req.get('url', 'unknown')}",
                    "",
                    f"- **Status**: {req.get('status', 'N/A')}",
                    f"- **Error**: {req.get('error', 'Unknown error')}",
                ])
                
                if req.get("response_body"):
                    lines.extend([
                        "",
                        "**Response**:",
                        "```json",
                        json.dumps(req["response_body"], indent=2)[:500],
                        "```"
                    ])
                
                lines.append("")
        
        # Add WebSocket details
        if ns.websocket_details:
            lines.extend([
                "### WebSocket Connections",
                ""
            ])
            
            for ws in ns.websocket_details:
                state_icon = "✅" if ws.get("state") == "open" else "❌"
                lines.extend([
                    f"#### {state_icon} {ws.get('url', 'unknown')}",
                    "",
                    f"- **State**: {ws.get('state', 'unknown')}",
                    f"- **Messages**: {ws.get('message_count', 0)}",
                ])
                
                if ws.get("error"):
                    lines.append(f"- **Error**: {ws['error']}")
                
                lines.append("")
        
        return lines
    
    def _generate_console_section(self) -> List[str]:
        """Generate console logs section."""
        if not self.console_summary:
            return []
        
        cs = self.console_summary
        
        lines = [
            "## Console Activity",
            "",
            "### Summary",
            "",
            "| Metric | Value |",
            "|--------|-------|",
            f"| Total Messages | {cs.total_messages} |",
            f"| Errors | {cs.error_count} |",
            f"| Warnings | {cs.warning_count} |",
            f"| Critical Errors | {cs.critical_error_count} |",
            ""
        ]
        
        # Add test failure status
        if cs.should_fail_test:
            lines.extend([
                "### ⚠️ Console Errors Detected",
                "",
                "The following console errors may indicate issues:",
                ""
            ])
            
            for reason in cs.failure_reasons:
                lines.append(f"- {reason}")
            
            lines.append("")
        
        # Add critical errors
        if cs.critical_errors:
            lines.extend([
                "### Critical Errors",
                "",
                "These errors indicate serious issues that should be addressed:",
                ""
            ])
            
            for i, error in enumerate(cs.critical_errors[:10], 1):
                lines.extend([
                    f"#### Critical Error {i}",
                    "",
                    f"**Message**: {error.get('message', 'Unknown error')}",
                    ""
                ])
                
                if error.get("url"):
                    lines.append(f"- **URL**: {error['url']}")
                
                if error.get("line_number"):
                    location = f"Line {error['line_number']}"
                    if error.get("column_number"):
                        location += f", Column {error['column_number']}"
                    lines.append(f"- **Location**: {location}")
                
                if error.get("stack_trace"):
                    lines.extend([
                        "",
                        "**Stack Trace**:",
                        "```",
                        error["stack_trace"][:1000],
                        "```"
                    ])
                
                lines.append("")
        
        # Add all errors
        if cs.errors and len(cs.errors) > len(cs.critical_errors):
            non_critical = [e for e in cs.errors if e not in cs.critical_errors]
            if non_critical:
                lines.extend([
                    "### Other Errors",
                    ""
                ])
                
                for error in non_critical[:10]:
                    lines.append(f"- **{error.get('timestamp', 'N/A')}**: {error.get('message', 'Unknown')[:100]}")
                
                if len(non_critical) > 10:
                    lines.append(f"- *... and {len(non_critical) - 10} more errors*")
                
                lines.append("")
        
        # Add warnings
        if cs.warnings:
            lines.extend([
                "### Warnings",
                ""
            ])
            
            for warning in cs.warnings[:10]:
                lines.append(f"- {warning.get('message', 'Unknown warning')[:100]}")
            
            if len(cs.warnings) > 10:
                lines.append(f"- *... and {len(cs.warnings) - 10} more warnings*")
            
            lines.append("")
        
        # No issues found
        if not cs.errors and not cs.warnings:
            lines.extend([
                "### ✅ No Issues Detected",
                "",
                "No console errors or warnings were detected during testing.",
                ""
            ])
        
        return lines
    
    def _generate_screenshots_section(self) -> List[str]:
        """Generate screenshots section."""
        if not self.screenshots:
            return []
        
        lines = [
            "## Visual Evidence",
            "",
            f"**Total Screenshots**: {len(self.screenshots)}",
            ""
        ]
        
        # Group by page
        screenshots_by_page = self.get_screenshots_by_page()
        
        page_order = ["page-a", "page-b", "page-c", "responsive"]
        page_names = {
            "page-a": "Page A - Text Input",
            "page-b": "Page B - Lyrics Editing",
            "page-c": "Page C - Song Playback",
            "responsive": "Responsive Design"
        }
        
        for page in page_order:
            if page not in screenshots_by_page:
                continue
            
            page_screenshots = screenshots_by_page[page]
            page_name = page_names.get(page, page.title())
            
            lines.extend([
                f"### {page_name}",
                "",
                f"*{len(page_screenshots)} screenshot(s)*",
                ""
            ])
            
            for screenshot in page_screenshots:
                rel_path = screenshot.get_relative_path(self.report_dir)
                
                lines.append(f"#### {screenshot.scenario}")
                if screenshot.step:
                    lines[-1] += f" - {screenshot.step}"
                lines.append("")
                
                if screenshot.description:
                    lines.append(f"*{screenshot.description}*")
                    lines.append("")
                
                if screenshot.viewport_width and screenshot.viewport_height:
                    lines.append(f"Viewport: {screenshot.viewport_width}x{screenshot.viewport_height}")
                    lines.append("")
                
                lines.append(f"![{screenshot.scenario}]({rel_path})")
                lines.append("")
        
        return lines


    def _generate_requirements_coverage_section(self) -> List[str]:
        """Generate requirements coverage section."""
        # Collect all requirements covered
        all_requirements: Dict[str, List[str]] = {}
        
        for result in self.test_results:
            for req in result.requirements:
                if req not in all_requirements:
                    all_requirements[req] = []
                all_requirements[req].append(result.scenario_id)
        
        if not all_requirements:
            return []
        
        lines = [
            "## Requirements Coverage",
            "",
            "| Requirement | Test Scenarios |",
            "|-------------|----------------|"
        ]
        
        for req in sorted(all_requirements.keys()):
            scenarios = ", ".join(all_requirements[req][:3])
            if len(all_requirements[req]) > 3:
                scenarios += f" (+{len(all_requirements[req]) - 3} more)"
            lines.append(f"| {req} | {scenarios} |")
        
        lines.append("")
        lines.append(f"**Total Requirements Covered**: {len(all_requirements)}")
        lines.append("")
        
        return lines
    
    def generate_report(
        self,
        output_filename: Optional[str] = None,
        include_screenshots: bool = True,
        include_network: bool = True,
        include_console: bool = True,
        include_requirements: bool = True
    ) -> str:
        """
        Generate comprehensive test report.
        
        Args:
            output_filename: Optional custom filename
            include_screenshots: Whether to include screenshots section
            include_network: Whether to include network activity section
            include_console: Whether to include console logs section
            include_requirements: Whether to include requirements coverage
            
        Returns:
            Path to the generated report
        """
        if output_filename is None:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            output_filename = f"test-report-{timestamp}.md"
        
        output_path = self.report_dir / output_filename
        
        # Build report content
        lines = []
        
        # Header
        lines.extend(self._generate_header())
        
        # Summary
        lines.extend(self._generate_summary_section())
        
        # Failed tests summary (if any)
        lines.extend(self._generate_failed_tests_section())
        
        # Test results
        lines.extend(self._generate_test_results_section())
        
        # Network activity
        if include_network:
            lines.extend(self._generate_network_section())
        
        # Console logs
        if include_console:
            lines.extend(self._generate_console_section())
        
        # Screenshots
        if include_screenshots:
            lines.extend(self._generate_screenshots_section())
        
        # Requirements coverage
        if include_requirements:
            lines.extend(self._generate_requirements_coverage_section())
        
        # Footer
        lines.extend([
            "---",
            "",
            f"*Report generated by E2E Test Report Generator*",
            f"*{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*"
        ])
        
        # Write report
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        
        return str(output_path)
    
    def generate_json_report(self, output_filename: Optional[str] = None) -> str:
        """
        Generate test report in JSON format.
        
        Args:
            output_filename: Optional custom filename
            
        Returns:
            Path to the generated JSON report
        """
        if output_filename is None:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            output_filename = f"test-report-{timestamp}.json"
        
        output_path = self.report_dir / output_filename
        
        report_data = {
            "generated_at": datetime.now().isoformat(),
            "test_start_time": self.test_start_time.isoformat() if self.test_start_time else None,
            "test_end_time": self.test_end_time.isoformat() if self.test_end_time else None,
            "metadata": self.metadata,
            "summary": self.get_test_summary(),
            "test_results": [r.to_dict() for r in self.test_results],
            "screenshots": [s.to_dict() for s in self.screenshots],
            "network_summary": self.network_summary.to_dict() if self.network_summary else None,
            "console_summary": self.console_summary.to_dict() if self.console_summary else None
        }
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2, default=str)
        
        return str(output_path)
    
    def save_all_reports(self, base_filename: Optional[str] = None) -> Dict[str, str]:
        """
        Generate and save both markdown and JSON reports.
        
        Args:
            base_filename: Optional base filename (without extension)
            
        Returns:
            Dictionary with paths to generated reports
        """
        if base_filename is None:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            base_filename = f"test-report-{timestamp}"
        
        md_path = self.generate_report(f"{base_filename}.md")
        json_path = self.generate_json_report(f"{base_filename}.json")
        
        return {
            "markdown": md_path,
            "json": json_path
        }


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def create_report_generator(
    report_dir: str = "./report/e2e-chrome-devtools-testing"
) -> E2ETestReportGenerator:
    """
    Create and return an E2ETestReportGenerator instance.
    
    Args:
        report_dir: Directory for saving test reports
        
    Returns:
        E2ETestReportGenerator instance
    """
    return E2ETestReportGenerator(report_dir)


def format_test_result_for_report(
    scenario_id: str,
    scenario_name: str,
    passed: bool,
    duration_seconds: float,
    page: Optional[str] = None,
    error_message: Optional[str] = None,
    screenshots: Optional[List[str]] = None,
    requirements: Optional[List[str]] = None
) -> TestResult:
    """
    Create a TestResult object for inclusion in report.
    
    Args:
        scenario_id: Unique identifier for the test scenario
        scenario_name: Human-readable name of the test
        passed: Whether the test passed
        duration_seconds: Test duration in seconds
        page: Page being tested
        error_message: Error message if test failed
        screenshots: List of screenshot paths
        requirements: List of requirement IDs covered
        
    Returns:
        TestResult object
    """
    return TestResult(
        scenario_id=scenario_id,
        scenario_name=scenario_name,
        status=TestStatus.PASSED.value if passed else TestStatus.FAILED.value,
        duration_seconds=duration_seconds,
        page=page,
        error_message=error_message,
        screenshots=screenshots or [],
        requirements=requirements or []
    )


def embed_screenshot_in_report(
    filepath: str,
    report_dir: str = "./report/e2e-chrome-devtools-testing"
) -> str:
    """
    Get markdown syntax to embed a screenshot in report.
    
    Args:
        filepath: Path to the screenshot
        report_dir: Report directory for relative path calculation
        
    Returns:
        Markdown image syntax
    """
    try:
        rel_path = str(Path(filepath).relative_to(Path(report_dir)))
    except ValueError:
        rel_path = filepath
    
    return f"![Screenshot]({rel_path})"


def format_network_logs_for_report(
    requests: List[Dict[str, Any]],
    max_requests: int = 20
) -> str:
    """
    Format network request logs for inclusion in report.
    
    Args:
        requests: List of network request dictionaries
        max_requests: Maximum number of requests to include
        
    Returns:
        Formatted markdown string
    """
    if not requests:
        return "No network requests recorded."
    
    lines = [
        "| Method | URL | Status | Duration |",
        "|--------|-----|--------|----------|"
    ]
    
    for req in requests[:max_requests]:
        method = req.get("method", "GET")
        url = req.get("url", "unknown")
        if len(url) > 50:
            url = url[:47] + "..."
        status = req.get("status", "N/A")
        duration = req.get("duration_ms")
        duration_str = f"{duration:.0f}ms" if duration else "N/A"
        
        lines.append(f"| {method} | {url} | {status} | {duration_str} |")
    
    if len(requests) > max_requests:
        lines.append(f"| ... | *{len(requests) - max_requests} more requests* | | |")
    
    return "\n".join(lines)


def format_console_logs_for_report(
    errors: List[Dict[str, Any]],
    warnings: List[Dict[str, Any]],
    include_stack_traces: bool = True
) -> str:
    """
    Format console logs for inclusion in report.
    
    Args:
        errors: List of error dictionaries
        warnings: List of warning dictionaries
        include_stack_traces: Whether to include stack traces
        
    Returns:
        Formatted markdown string
    """
    lines = []
    
    if errors:
        lines.append("### Errors")
        lines.append("")
        for error in errors[:10]:
            lines.append(f"- **{error.get('timestamp', 'N/A')}**: {error.get('message', 'Unknown')}")
            if include_stack_traces and error.get("stack_trace"):
                lines.append(f"  ```")
                lines.append(f"  {error['stack_trace'][:500]}")
                lines.append(f"  ```")
        if len(errors) > 10:
            lines.append(f"- *... and {len(errors) - 10} more errors*")
        lines.append("")
    
    if warnings:
        lines.append("### Warnings")
        lines.append("")
        for warning in warnings[:10]:
            lines.append(f"- {warning.get('message', 'Unknown warning')}")
        if len(warnings) > 10:
            lines.append(f"- *... and {len(warnings) - 10} more warnings*")
        lines.append("")
    
    if not errors and not warnings:
        lines.append("No console errors or warnings detected.")
    
    return "\n".join(lines)


# ============================================================================
# INTEGRATION WITH EXISTING MODULES
# ============================================================================

def create_report_from_monitors(
    network_monitor: Any = None,
    console_monitor: Any = None,
    helper: Any = None,
    report_dir: str = "./report/e2e-chrome-devtools-testing"
) -> E2ETestReportGenerator:
    """
    Create a report generator and populate it from existing monitor instances.
    
    Args:
        network_monitor: NetworkActivityMonitor instance
        console_monitor: ConsoleMonitor instance
        helper: ChromeDevToolsHelper instance
        report_dir: Directory for saving reports
        
    Returns:
        Populated E2ETestReportGenerator instance
    """
    generator = E2ETestReportGenerator(report_dir)
    
    # Import network summary if available
    if network_monitor:
        api_requests = network_monitor.get_api_requests() if hasattr(network_monitor, 'get_api_requests') else []
        failed_requests = network_monitor.get_failed_requests() if hasattr(network_monitor, 'get_failed_requests') else []
        timing = network_monitor.get_timing_summary() if hasattr(network_monitor, 'get_timing_summary') else {}
        
        generator.set_network_summary(
            total_requests=len(network_monitor.request_logs) if hasattr(network_monitor, 'request_logs') else 0,
            api_requests=len(api_requests),
            failed_requests=len(failed_requests),
            cached_requests=len(network_monitor.get_cached_requests()) if hasattr(network_monitor, 'get_cached_requests') else 0,
            websocket_connections=len(network_monitor.websocket_logs) if hasattr(network_monitor, 'websocket_logs') else 0,
            avg_response_time_ms=timing.get('total_time', {}).get('avg_ms') if isinstance(timing, dict) else None,
            requests=[r.to_dict() for r in api_requests] if api_requests else [],
            failed_request_details=[r.to_dict() for r in failed_requests] if failed_requests else [],
            websocket_details=[ws.to_dict() for ws in network_monitor.websocket_logs] if hasattr(network_monitor, 'websocket_logs') else []
        )
    
    # Import console summary if available
    if console_monitor:
        analysis = console_monitor.analyze() if hasattr(console_monitor, 'analyze') else None
        
        if analysis:
            generator.set_console_summary(
                total_messages=analysis.total_messages,
                error_count=analysis.error_count,
                warning_count=analysis.warning_count,
                critical_error_count=len(analysis.critical_errors),
                should_fail_test=analysis.should_fail_test,
                failure_reasons=analysis.failure_reasons,
                errors=[e.to_dict() for e in analysis.errors],
                warnings=[w.to_dict() for w in analysis.warnings],
                critical_errors=[e.to_dict() for e in analysis.critical_errors]
            )
    
    # Import screenshots if helper available
    if helper and hasattr(helper, 'screenshot_metadata'):
        for metadata in helper.screenshot_metadata:
            generator.add_screenshot(
                filename=metadata.filename,
                filepath=metadata.filepath,
                page=metadata.page,
                scenario=metadata.scenario,
                step=metadata.step,
                description=metadata.description,
                viewport_width=metadata.viewport_width,
                viewport_height=metadata.viewport_height
            )
    
    # Import test results if helper available
    if helper and hasattr(helper, 'test_results'):
        for result in helper.test_results:
            generator.add_test_result(
                scenario_id=result.get('scenario_id', 'unknown'),
                scenario_name=result.get('scenario_id', 'Unknown Test'),
                status=result.get('status', 'unknown'),
                duration_seconds=result.get('duration', 0),
                screenshots=result.get('screenshots', []),
                error_message=result.get('error')
            )
    
    return generator
