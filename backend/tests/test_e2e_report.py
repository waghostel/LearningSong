"""
Tests for E2E test report generation system.

This module tests the E2ETestReportGenerator class and related functions.
"""

import json
import os
import tempfile
from pathlib import Path
from datetime import datetime

import pytest

from tests.e2e_test_report import (
    E2ETestReportGenerator,
    TestResult,
    TestStatus,
    NetworkActivitySummary,
    ConsoleLogSummary,
    ScreenshotInfo,
    create_report_generator,
    format_test_result_for_report,
    embed_screenshot_in_report,
    format_network_logs_for_report,
    format_console_logs_for_report,
)


class TestTestResult:
    """Tests for TestResult dataclass."""
    
    def test_create_test_result(self):
        """Test creating a TestResult."""
        result = TestResult(
            scenario_id="test-001",
            scenario_name="Test Scenario",
            status="passed",
            duration_seconds=1.5
        )
        
        assert result.scenario_id == "test-001"
        assert result.scenario_name == "Test Scenario"
        assert result.status == "passed"
        assert result.duration_seconds == 1.5
    
    def test_is_passed(self):
        """Test is_passed method."""
        passed_result = TestResult(
            scenario_id="test-001",
            scenario_name="Test",
            status=TestStatus.PASSED.value,
            duration_seconds=1.0
        )
        failed_result = TestResult(
            scenario_id="test-002",
            scenario_name="Test",
            status=TestStatus.FAILED.value,
            duration_seconds=1.0
        )
        
        assert passed_result.is_passed() is True
        assert failed_result.is_passed() is False
    
    def test_is_failed(self):
        """Test is_failed method."""
        passed_result = TestResult(
            scenario_id="test-001",
            scenario_name="Test",
            status=TestStatus.PASSED.value,
            duration_seconds=1.0
        )
        failed_result = TestResult(
            scenario_id="test-002",
            scenario_name="Test",
            status=TestStatus.FAILED.value,
            duration_seconds=1.0
        )
        
        assert passed_result.is_failed() is False
        assert failed_result.is_failed() is True
    
    def test_to_dict(self):
        """Test to_dict method."""
        result = TestResult(
            scenario_id="test-001",
            scenario_name="Test Scenario",
            status="passed",
            duration_seconds=1.5,
            page="page-a"
        )
        
        result_dict = result.to_dict()
        
        assert result_dict["scenario_id"] == "test-001"
        assert result_dict["scenario_name"] == "Test Scenario"
        assert result_dict["status"] == "passed"
        assert result_dict["page"] == "page-a"


class TestE2ETestReportGenerator:
    """Tests for E2ETestReportGenerator class."""
    
    @pytest.fixture
    def temp_report_dir(self):
        """Create a temporary directory for reports."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield tmpdir
    
    @pytest.fixture
    def generator(self, temp_report_dir):
        """Create a report generator with temp directory."""
        return E2ETestReportGenerator(temp_report_dir)
    
    def test_init_creates_directory(self, temp_report_dir):
        """Test that init creates the report directory."""
        report_dir = os.path.join(temp_report_dir, "new_dir")
        generator = E2ETestReportGenerator(report_dir)
        
        assert os.path.exists(report_dir)
    
    def test_start_and_end_test_run(self, generator):
        """Test start and end test run methods."""
        generator.start_test_run({"browser": "Chrome"})
        
        assert generator.test_start_time is not None
        assert generator.metadata == {"browser": "Chrome"}
        
        generator.end_test_run()
        
        assert generator.test_end_time is not None
        assert generator.test_end_time >= generator.test_start_time
    
    def test_add_test_result(self, generator):
        """Test adding test results."""
        result = generator.add_test_result(
            scenario_id="test-001",
            scenario_name="Test Page A Load",
            status="passed",
            duration_seconds=2.5,
            page="page-a",
            requirements=["1.1", "1.2"]
        )
        
        assert len(generator.test_results) == 1
        assert result.scenario_id == "test-001"
        assert result.page == "page-a"
        assert result.requirements == ["1.1", "1.2"]
    
    def test_add_screenshot(self, generator):
        """Test adding screenshots."""
        screenshot = generator.add_screenshot(
            filename="test-screenshot.png",
            filepath="/path/to/test-screenshot.png",
            page="page-a",
            scenario="initial-load",
            description="Initial page load"
        )
        
        assert len(generator.screenshots) == 1
        assert screenshot.filename == "test-screenshot.png"
        assert screenshot.page == "page-a"
    
    def test_set_network_summary(self, generator):
        """Test setting network summary."""
        summary = generator.set_network_summary(
            total_requests=50,
            api_requests=10,
            failed_requests=2,
            avg_response_time_ms=150.5
        )
        
        assert generator.network_summary is not None
        assert summary.total_requests == 50
        assert summary.api_requests == 10
        assert summary.failed_requests == 2
        assert summary.avg_response_time_ms == 150.5
    
    def test_set_console_summary(self, generator):
        """Test setting console summary."""
        summary = generator.set_console_summary(
            total_messages=100,
            error_count=5,
            warning_count=10,
            critical_error_count=1,
            should_fail_test=True,
            failure_reasons=["Critical error detected"]
        )
        
        assert generator.console_summary is not None
        assert summary.total_messages == 100
        assert summary.error_count == 5
        assert summary.should_fail_test is True
    
    def test_get_test_summary(self, generator):
        """Test getting test summary statistics."""
        generator.add_test_result("t1", "Test 1", "passed", 1.0)
        generator.add_test_result("t2", "Test 2", "passed", 2.0)
        generator.add_test_result("t3", "Test 3", "failed", 1.5)
        generator.add_test_result("t4", "Test 4", "skipped", 0.0)
        
        summary = generator.get_test_summary()
        
        assert summary["total_tests"] == 4
        assert summary["passed"] == 2
        assert summary["failed"] == 1
        assert summary["skipped"] == 1
        assert summary["pass_rate"] == 50.0
        assert summary["total_duration_seconds"] == 4.5
    
    def test_get_results_by_page(self, generator):
        """Test grouping results by page."""
        generator.add_test_result("t1", "Test 1", "passed", 1.0, page="page-a")
        generator.add_test_result("t2", "Test 2", "passed", 1.0, page="page-a")
        generator.add_test_result("t3", "Test 3", "passed", 1.0, page="page-b")
        
        results_by_page = generator.get_results_by_page()
        
        assert len(results_by_page["page-a"]) == 2
        assert len(results_by_page["page-b"]) == 1
    
    def test_get_failed_tests(self, generator):
        """Test getting failed tests."""
        generator.add_test_result("t1", "Test 1", "passed", 1.0)
        generator.add_test_result("t2", "Test 2", "failed", 1.0, error_message="Error")
        generator.add_test_result("t3", "Test 3", "failed", 1.0, error_message="Error 2")
        
        failed = generator.get_failed_tests()
        
        assert len(failed) == 2
        assert all(r.is_failed() for r in failed)
    
    def test_generate_report(self, generator, temp_report_dir):
        """Test generating markdown report."""
        generator.start_test_run({"browser": "Chrome"})
        
        generator.add_test_result(
            "test-001",
            "Test Page A Load",
            "passed",
            2.5,
            page="page-a",
            requirements=["1.1"]
        )
        generator.add_test_result(
            "test-002",
            "Test Page B Edit",
            "failed",
            3.0,
            page="page-b",
            error_message="Element not found"
        )
        
        generator.set_network_summary(
            total_requests=20,
            api_requests=5,
            failed_requests=1
        )
        
        generator.set_console_summary(
            total_messages=50,
            error_count=2,
            warning_count=5
        )
        
        generator.end_test_run()
        
        report_path = generator.generate_report()
        
        assert os.path.exists(report_path)
        
        with open(report_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        assert "# E2E Test Report" in content
        assert "Test Page A Load" in content
        assert "Test Page B Edit" in content
        assert "Element not found" in content
        assert "Network Activity" in content
        assert "Console Activity" in content
    
    def test_generate_json_report(self, generator, temp_report_dir):
        """Test generating JSON report."""
        generator.start_test_run()
        
        generator.add_test_result("t1", "Test 1", "passed", 1.0)
        generator.add_test_result("t2", "Test 2", "failed", 2.0)
        
        generator.end_test_run()
        
        report_path = generator.generate_json_report()
        
        assert os.path.exists(report_path)
        
        with open(report_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        assert "summary" in data
        assert "test_results" in data
        assert len(data["test_results"]) == 2
        assert data["summary"]["total_tests"] == 2
    
    def test_save_all_reports(self, generator, temp_report_dir):
        """Test saving both markdown and JSON reports."""
        generator.start_test_run()
        generator.add_test_result("t1", "Test 1", "passed", 1.0)
        generator.end_test_run()
        
        paths = generator.save_all_reports("test-report")
        
        assert os.path.exists(paths["markdown"])
        assert os.path.exists(paths["json"])
        assert paths["markdown"].endswith(".md")
        assert paths["json"].endswith(".json")


class TestConvenienceFunctions:
    """Tests for convenience functions."""
    
    def test_create_report_generator(self):
        """Test create_report_generator function."""
        with tempfile.TemporaryDirectory() as tmpdir:
            generator = create_report_generator(tmpdir)
            
            assert isinstance(generator, E2ETestReportGenerator)
            assert str(generator.report_dir) == tmpdir
    
    def test_format_test_result_for_report(self):
        """Test format_test_result_for_report function."""
        result = format_test_result_for_report(
            scenario_id="test-001",
            scenario_name="Test Scenario",
            passed=True,
            duration_seconds=1.5,
            page="page-a"
        )
        
        assert result.scenario_id == "test-001"
        assert result.status == TestStatus.PASSED.value
        assert result.is_passed() is True
    
    def test_format_test_result_for_report_failed(self):
        """Test format_test_result_for_report for failed test."""
        result = format_test_result_for_report(
            scenario_id="test-002",
            scenario_name="Failed Test",
            passed=False,
            duration_seconds=2.0,
            error_message="Test failed"
        )
        
        assert result.status == TestStatus.FAILED.value
        assert result.is_failed() is True
        assert result.error_message == "Test failed"
    
    def test_embed_screenshot_in_report(self):
        """Test embed_screenshot_in_report function."""
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "page-a", "screenshot.png")
            
            markdown = embed_screenshot_in_report(filepath, tmpdir)
            
            assert "![Screenshot]" in markdown
            assert "screenshot.png" in markdown
    
    def test_format_network_logs_for_report(self):
        """Test format_network_logs_for_report function."""
        requests = [
            {"method": "GET", "url": "/api/test", "status": 200, "duration_ms": 100},
            {"method": "POST", "url": "/api/submit", "status": 201, "duration_ms": 150}
        ]
        
        formatted = format_network_logs_for_report(requests)
        
        assert "| Method | URL | Status | Duration |" in formatted
        assert "GET" in formatted
        assert "POST" in formatted
        assert "/api/test" in formatted
    
    def test_format_network_logs_empty(self):
        """Test format_network_logs_for_report with empty list."""
        formatted = format_network_logs_for_report([])
        
        assert "No network requests recorded" in formatted
    
    def test_format_console_logs_for_report(self):
        """Test format_console_logs_for_report function."""
        errors = [
            {"timestamp": "2025-01-01T00:00:00", "message": "Error 1"},
            {"timestamp": "2025-01-01T00:00:01", "message": "Error 2"}
        ]
        warnings = [
            {"message": "Warning 1"}
        ]
        
        formatted = format_console_logs_for_report(errors, warnings)
        
        assert "### Errors" in formatted
        assert "Error 1" in formatted
        assert "### Warnings" in formatted
        assert "Warning 1" in formatted
    
    def test_format_console_logs_no_issues(self):
        """Test format_console_logs_for_report with no issues."""
        formatted = format_console_logs_for_report([], [])
        
        assert "No console errors or warnings detected" in formatted


class TestScreenshotInfo:
    """Tests for ScreenshotInfo dataclass."""
    
    def test_create_screenshot_info(self):
        """Test creating ScreenshotInfo."""
        info = ScreenshotInfo(
            filename="test.png",
            filepath="/path/to/test.png",
            page="page-a",
            scenario="initial-load"
        )
        
        assert info.filename == "test.png"
        assert info.page == "page-a"
    
    def test_get_relative_path(self):
        """Test get_relative_path method."""
        with tempfile.TemporaryDirectory() as tmpdir:
            report_dir = Path(tmpdir)
            filepath = str(report_dir / "page-a" / "test.png")
            
            info = ScreenshotInfo(
                filename="test.png",
                filepath=filepath,
                page="page-a",
                scenario="test"
            )
            
            rel_path = info.get_relative_path(report_dir)
            
            assert rel_path == os.path.join("page-a", "test.png")
