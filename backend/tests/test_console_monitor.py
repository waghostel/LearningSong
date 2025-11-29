"""
Tests for the console monitoring and error detection system.

This module tests the e2e_console_monitor.py functionality to ensure
proper console message handling, error detection, and reporting.
"""

import pytest
import json
from pathlib import Path
from datetime import datetime

from tests.e2e_console_monitor import (
    ConsoleMonitor,
    ConsoleMessage,
    ConsoleLevel,
    ErrorSeverity,
    ErrorPattern,
    ConsoleAnalysisResult,
    create_console_monitor,
    parse_mcp_console_message,
    filter_errors,
    filter_warnings,
    format_console_messages_for_report,
    check_for_critical_errors,
    create_error_pattern,
    REACT_ERROR_PATTERNS,
    NETWORK_ERROR_PATTERNS,
    WEBSOCKET_ERROR_PATTERNS,
    get_all_error_patterns,
)


class TestConsoleMessage:
    """Tests for ConsoleMessage dataclass."""
    
    def test_create_console_message(self):
        """Test creating a console message."""
        msg = ConsoleMessage(
            level="error",
            message="Test error message"
        )
        
        assert msg.level == "error"
        assert msg.message == "Test error message"
        assert msg.timestamp is not None
    
    def test_console_message_is_error(self):
        """Test is_error method."""
        error_msg = ConsoleMessage(level="error", message="Error")
        log_msg = ConsoleMessage(level="log", message="Log")
        
        assert error_msg.is_error() is True
        assert log_msg.is_error() is False
    
    def test_console_message_is_warning(self):
        """Test is_warning method."""
        warn_msg = ConsoleMessage(level="warn", message="Warning")
        warning_msg = ConsoleMessage(level="warning", message="Warning")
        log_msg = ConsoleMessage(level="log", message="Log")
        
        assert warn_msg.is_warning() is True
        assert warning_msg.is_warning() is True
        assert log_msg.is_warning() is False
    
    def test_console_message_severity(self):
        """Test get_severity method."""
        error_msg = ConsoleMessage(level="error", message="Regular error")
        critical_msg = ConsoleMessage(level="error", message="Uncaught TypeError: x is undefined")
        warn_msg = ConsoleMessage(level="warn", message="Warning")
        info_msg = ConsoleMessage(level="info", message="Info")
        
        assert error_msg.get_severity() == ErrorSeverity.HIGH
        assert critical_msg.get_severity() == ErrorSeverity.CRITICAL
        assert warn_msg.get_severity() == ErrorSeverity.MEDIUM
        assert info_msg.get_severity() == ErrorSeverity.INFO
    
    def test_console_message_to_dict(self):
        """Test to_dict method."""
        msg = ConsoleMessage(
            level="error",
            message="Test error",
            url="http://localhost:5173/",
            line_number=42
        )
        
        data = msg.to_dict()
        
        assert data["level"] == "error"
        assert data["message"] == "Test error"
        assert data["url"] == "http://localhost:5173/"
        assert data["line_number"] == 42
    
    def test_console_message_to_json(self):
        """Test to_json method."""
        msg = ConsoleMessage(level="log", message="Test")
        
        json_str = msg.to_json()
        data = json.loads(json_str)
        
        assert data["level"] == "log"
        assert data["message"] == "Test"


class TestErrorPattern:
    """Tests for ErrorPattern dataclass."""
    
    def test_create_error_pattern(self):
        """Test creating an error pattern."""
        pattern = ErrorPattern(
            name="test_pattern",
            pattern=r"test.*error",
            severity="high",
            is_critical=True,
            should_fail_test=True
        )
        
        assert pattern.name == "test_pattern"
        assert pattern.is_critical is True
        assert pattern.should_fail_test is True
    
    def test_error_pattern_matches(self):
        """Test pattern matching."""
        pattern = ErrorPattern(
            name="uncaught_error",
            pattern=r"uncaught\s+error"
        )
        
        assert pattern.matches("Uncaught Error: Something went wrong") is True
        assert pattern.matches("Regular error message") is False
    
    def test_error_pattern_case_insensitive(self):
        """Test that pattern matching is case insensitive."""
        pattern = ErrorPattern(
            name="test",
            pattern=r"typeerror"
        )
        
        assert pattern.matches("TypeError: x is not defined") is True
        assert pattern.matches("TYPEERROR: x is not defined") is True


class TestConsoleMonitor:
    """Tests for ConsoleMonitor class."""
    
    @pytest.fixture
    def monitor(self, tmp_path):
        """Create a ConsoleMonitor instance for testing."""
        return ConsoleMonitor(report_dir=str(tmp_path))
    
    def test_create_monitor(self, tmp_path):
        """Test creating a console monitor."""
        monitor = ConsoleMonitor(report_dir=str(tmp_path))
        
        assert monitor.report_dir == tmp_path
        assert len(monitor.messages) == 0
    
    def test_add_message(self, monitor):
        """Test adding a console message."""
        msg = monitor.add_message(
            level="error",
            message="Test error",
            url="http://localhost:5173/"
        )
        
        assert len(monitor.messages) == 1
        assert msg.level == "error"
        assert msg.message == "Test error"
    
    def test_add_messages_from_mcp(self, monitor):
        """Test adding messages from MCP response."""
        mcp_messages = [
            {"level": "error", "message": "Error 1"},
            {"level": "warn", "message": "Warning 1"},
            {"level": "log", "message": "Log 1"},
        ]
        
        created = monitor.add_messages_from_mcp(mcp_messages)
        
        assert len(created) == 3
        assert len(monitor.messages) == 3
    
    def test_get_errors(self, monitor):
        """Test getting error messages."""
        monitor.add_message(level="error", message="Error 1")
        monitor.add_message(level="warn", message="Warning 1")
        monitor.add_message(level="error", message="Error 2")
        monitor.add_message(level="log", message="Log 1")
        
        errors = monitor.get_errors()
        
        assert len(errors) == 2
        assert all(e.is_error() for e in errors)
    
    def test_get_warnings(self, monitor):
        """Test getting warning messages."""
        monitor.add_message(level="error", message="Error 1")
        monitor.add_message(level="warn", message="Warning 1")
        monitor.add_message(level="warning", message="Warning 2")
        monitor.add_message(level="log", message="Log 1")
        
        warnings = monitor.get_warnings()
        
        assert len(warnings) == 2
        assert all(w.is_warning() for w in warnings)
    
    def test_should_ignore(self, monitor):
        """Test message ignore patterns."""
        # Default ignore patterns include React DevTools message
        assert monitor.should_ignore("Download the React DevTools for a better experience") is True
        assert monitor.should_ignore("Regular error message") is False
    
    def test_get_errors_excludes_ignored(self, monitor):
        """Test that get_errors excludes ignored messages by default."""
        monitor.add_message(level="error", message="Real error")
        monitor.add_message(level="error", message="Download the React DevTools")
        
        errors = monitor.get_errors(include_ignored=False)
        errors_with_ignored = monitor.get_errors(include_ignored=True)
        
        assert len(errors) == 1
        assert len(errors_with_ignored) == 2
    
    def test_detect_critical_errors(self, monitor):
        """Test detecting critical errors."""
        monitor.add_message(level="error", message="Uncaught TypeError: x is undefined")
        monitor.add_message(level="error", message="Regular error")
        
        critical = monitor.detect_critical_errors()
        
        assert len(critical) == 1
        error, pattern = critical[0]
        assert "TypeError" in error.message
    
    def test_should_fail_test(self, monitor):
        """Test determining if test should fail."""
        # No errors - should not fail
        should_fail, reasons = monitor.should_fail_test()
        assert should_fail is False
        assert len(reasons) == 0
        
        # Add critical error
        monitor.add_message(level="error", message="Uncaught ReferenceError: x is not defined")
        
        should_fail, reasons = monitor.should_fail_test()
        assert should_fail is True
        assert len(reasons) > 0
    
    def test_analyze(self, monitor):
        """Test comprehensive analysis."""
        monitor.add_message(level="error", message="Uncaught TypeError: x is undefined")
        monitor.add_message(level="error", message="Regular error")
        monitor.add_message(level="warn", message="Warning message")
        monitor.add_message(level="log", message="Log message")
        
        result = monitor.analyze()
        
        assert isinstance(result, ConsoleAnalysisResult)
        assert result.total_messages == 4
        assert result.error_count == 2
        assert result.warning_count == 1
        assert len(result.critical_errors) == 1
        assert result.should_fail_test is True
    
    def test_format_error_with_stack(self, monitor):
        """Test formatting error with stack trace."""
        error = ConsoleMessage(
            level="error",
            message="Test error",
            url="http://localhost:5173/main.js",
            line_number=42,
            column_number=10,
            stack_trace="Error: Test error\n    at main.js:42:10"
        )
        
        formatted = monitor.format_error_with_stack(error)
        
        assert "Test error" in formatted
        assert "Line 42" in formatted
        assert "Column 10" in formatted
        assert "Stack Trace" in formatted
    
    def test_clear(self, monitor):
        """Test clearing messages."""
        monitor.add_message(level="error", message="Error")
        monitor.add_message(level="warn", message="Warning")
        
        assert len(monitor.messages) == 2
        
        monitor.clear()
        
        assert len(monitor.messages) == 0
    
    def test_save_logs(self, monitor, tmp_path):
        """Test saving logs to JSON file."""
        monitor.add_message(level="error", message="Test error")
        monitor.add_message(level="warn", message="Test warning")
        
        output_path = monitor.save_logs("test-logs.json")
        
        assert Path(output_path).exists()
        
        with open(output_path) as f:
            data = json.load(f)
        
        assert data["total_messages"] == 2
        assert data["error_count"] == 1
        assert data["warning_count"] == 1
    
    def test_generate_console_report(self, monitor, tmp_path):
        """Test generating markdown report."""
        monitor.add_message(level="error", message="Test error")
        monitor.add_message(level="warn", message="Test warning")
        
        output_path = monitor.generate_console_report("test-report.md")
        
        assert Path(output_path).exists()
        
        with open(output_path) as f:
            content = f.read()
        
        assert "Console Activity Report" in content
        assert "Test error" in content
        assert "Test warning" in content
    
    def test_get_summary(self, monitor):
        """Test getting summary."""
        monitor.add_message(level="error", message="Error 1")
        monitor.add_message(level="warn", message="Warning 1")
        
        summary = monitor.get_summary()
        
        assert summary["total_messages"] == 2
        assert summary["error_count"] == 1
        assert summary["warning_count"] == 1
    
    def test_register_error_handler(self, monitor):
        """Test registering error handler callback."""
        errors_received = []
        
        def handler(error):
            errors_received.append(error)
        
        monitor.register_error_handler(handler)
        
        monitor.add_message(level="log", message="Log")
        monitor.add_message(level="error", message="Error")
        
        assert len(errors_received) == 1
        assert errors_received[0].message == "Error"
    
    def test_get_messages_by_level(self, monitor):
        """Test filtering messages by level."""
        monitor.add_message(level="error", message="Error")
        monitor.add_message(level="warn", message="Warning")
        monitor.add_message(level="log", message="Log")
        
        errors = monitor.get_messages_by_level("error")
        logs = monitor.get_messages_by_level("log")
        
        assert len(errors) == 1
        assert len(logs) == 1
    
    def test_get_messages_with_stack_trace(self, monitor):
        """Test getting messages with stack traces."""
        monitor.add_message(level="error", message="Error without stack")
        monitor.add_message(
            level="error",
            message="Error with stack",
            stack_trace="Error: Test\n    at main.js:1:1"
        )
        
        with_stack = monitor.get_messages_with_stack_trace()
        
        assert len(with_stack) == 1
        assert with_stack[0].message == "Error with stack"


class TestConvenienceFunctions:
    """Tests for convenience functions."""
    
    def test_create_console_monitor(self, tmp_path):
        """Test create_console_monitor function."""
        monitor = create_console_monitor(str(tmp_path))
        
        assert isinstance(monitor, ConsoleMonitor)
    
    def test_parse_mcp_console_message(self):
        """Test parsing MCP console message."""
        mcp_msg = {
            "level": "error",
            "message": "Test error",
            "url": "http://localhost:5173/",
            "lineNumber": 42,
            "columnNumber": 10,
            "stackTrace": "Error: Test\n    at main.js:42:10"
        }
        
        msg = parse_mcp_console_message(mcp_msg)
        
        assert msg.level == "error"
        assert msg.message == "Test error"
        assert msg.line_number == 42
        assert msg.stack_trace is not None
    
    def test_filter_errors(self):
        """Test filter_errors function."""
        messages = [
            ConsoleMessage(level="error", message="Error"),
            ConsoleMessage(level="warn", message="Warning"),
            ConsoleMessage(level="log", message="Log"),
        ]
        
        errors = filter_errors(messages)
        
        assert len(errors) == 1
        assert errors[0].message == "Error"
    
    def test_filter_warnings(self):
        """Test filter_warnings function."""
        messages = [
            ConsoleMessage(level="error", message="Error"),
            ConsoleMessage(level="warn", message="Warning"),
            ConsoleMessage(level="log", message="Log"),
        ]
        
        warnings = filter_warnings(messages)
        
        assert len(warnings) == 1
        assert warnings[0].message == "Warning"
    
    def test_format_console_messages_for_report(self):
        """Test formatting messages for report."""
        messages = [
            ConsoleMessage(level="error", message="Test error"),
            ConsoleMessage(level="warn", message="Test warning"),
        ]
        
        formatted = format_console_messages_for_report(messages)
        
        assert "### Errors" in formatted
        assert "Test error" in formatted
        assert "### Warnings" in formatted
        assert "Test warning" in formatted
    
    def test_format_console_messages_empty(self):
        """Test formatting empty message list."""
        formatted = format_console_messages_for_report([])
        
        assert "No console messages recorded" in formatted
    
    def test_check_for_critical_errors(self):
        """Test check_for_critical_errors function."""
        messages = [
            ConsoleMessage(level="error", message="Uncaught TypeError: x is undefined"),
            ConsoleMessage(level="error", message="Regular error"),
        ]
        
        has_critical, descriptions = check_for_critical_errors(messages)
        
        assert has_critical is True
        assert len(descriptions) == 1
    
    def test_create_error_pattern(self):
        """Test create_error_pattern function."""
        pattern = create_error_pattern(
            name="custom_error",
            pattern=r"custom.*error",
            severity="high",
            is_critical=True,
            should_fail_test=True
        )
        
        assert pattern.name == "custom_error"
        assert pattern.is_critical is True
        assert pattern.matches("Custom Error occurred") is True
    
    def test_get_all_error_patterns(self):
        """Test get_all_error_patterns function."""
        patterns = get_all_error_patterns()
        
        assert len(patterns) > 0
        assert all(isinstance(p, ErrorPattern) for p in patterns)


class TestPredefinedPatterns:
    """Tests for pre-defined error patterns."""
    
    def test_react_error_patterns(self):
        """Test React error patterns."""
        assert len(REACT_ERROR_PATTERNS) > 0
        
        # Test hydration pattern
        hydration_pattern = next(
            (p for p in REACT_ERROR_PATTERNS if "hydration" in p.name),
            None
        )
        assert hydration_pattern is not None
        assert hydration_pattern.matches("Hydration mismatch detected") is True
    
    def test_network_error_patterns(self):
        """Test network error patterns."""
        assert len(NETWORK_ERROR_PATTERNS) > 0
        
        # Test fetch failed pattern
        fetch_pattern = next(
            (p for p in NETWORK_ERROR_PATTERNS if "fetch" in p.name),
            None
        )
        assert fetch_pattern is not None
        assert fetch_pattern.matches("Failed to fetch") is True
    
    def test_websocket_error_patterns(self):
        """Test WebSocket error patterns."""
        assert len(WEBSOCKET_ERROR_PATTERNS) > 0
        
        # Test WebSocket connection pattern
        ws_pattern = next(
            (p for p in WEBSOCKET_ERROR_PATTERNS if "connection" in p.name),
            None
        )
        assert ws_pattern is not None
        assert ws_pattern.matches("WebSocket connection failed") is True
