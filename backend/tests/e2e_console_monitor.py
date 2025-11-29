"""
Console monitoring and error detection system for E2E Chrome DevTools testing.

This module provides functionality to monitor, log, and analyze console messages
during E2E testing using Chrome DevTools MCP capabilities.

Requirements covered:
- 9.1: Monitor console messages for errors
- 9.2: Capture error messages with stack traces
- 9.3: Capture warning messages for review
- 9.4: Report all console errors and warnings found
- 9.5: Fail test and report error details when critical errors occur
"""

import json
import re
from typing import Any, Dict, List, Optional, Tuple, Callable
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path


class ConsoleLevel(Enum):
    """Console message severity levels."""
    LOG = "log"
    INFO = "info"
    WARN = "warn"
    WARNING = "warning"
    ERROR = "error"
    DEBUG = "debug"
    VERBOSE = "verbose"


class ErrorSeverity(Enum):
    """Error severity classification."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


@dataclass
class ConsoleMessage:
    """Log entry for a console message."""
    
    level: str
    message: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    source: Optional[str] = None
    url: Optional[str] = None
    line_number: Optional[int] = None
    column_number: Optional[int] = None
    stack_trace: Optional[str] = None
    args: Optional[List[Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), indent=2, default=str)
    
    def is_error(self) -> bool:
        """Check if this is an error message."""
        return self.level.lower() == "error"
    
    def is_warning(self) -> bool:
        """Check if this is a warning message."""
        return self.level.lower() in ["warn", "warning"]
    
    def get_severity(self) -> ErrorSeverity:
        """Determine the severity of this message."""
        if self.level.lower() == "error":
            # Check for critical error patterns
            critical_patterns = [
                r"uncaught.*error",
                r"unhandled.*rejection",
                r"fatal",
                r"crash",
                r"out of memory",
                r"stack overflow",
            ]
            for pattern in critical_patterns:
                if re.search(pattern, self.message.lower()):
                    return ErrorSeverity.CRITICAL
            return ErrorSeverity.HIGH
        elif self.level.lower() in ["warn", "warning"]:
            return ErrorSeverity.MEDIUM
        elif self.level.lower() == "info":
            return ErrorSeverity.INFO
        return ErrorSeverity.LOW


@dataclass
class ErrorPattern:
    """Pattern for matching and categorizing errors."""
    
    name: str
    pattern: str
    severity: str = "high"
    description: Optional[str] = None
    is_critical: bool = False
    should_fail_test: bool = False
    
    def matches(self, message: str) -> bool:
        """Check if the pattern matches a message."""
        return bool(re.search(self.pattern, message, re.IGNORECASE))


@dataclass
class ConsoleAnalysisResult:
    """Result of console message analysis."""
    
    total_messages: int
    error_count: int
    warning_count: int
    critical_errors: List[ConsoleMessage]
    errors: List[ConsoleMessage]
    warnings: List[ConsoleMessage]
    should_fail_test: bool
    failure_reasons: List[str]
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "total_messages": self.total_messages,
            "error_count": self.error_count,
            "warning_count": self.warning_count,
            "critical_errors": [e.to_dict() for e in self.critical_errors],
            "errors": [e.to_dict() for e in self.errors],
            "warnings": [w.to_dict() for w in self.warnings],
            "should_fail_test": self.should_fail_test,
            "failure_reasons": self.failure_reasons,
            "timestamp": self.timestamp
        }



class ConsoleMonitor:
    """
    Monitor and analyze console messages during E2E testing.
    
    This class provides functionality to:
    - Retrieve and log console messages via Chrome DevTools MCP
    - Filter errors and warnings
    - Capture error stack traces
    - Detect critical errors and determine test failure
    - Generate console activity reports
    """
    
    # Default error patterns that indicate critical issues
    DEFAULT_CRITICAL_PATTERNS = [
        ErrorPattern(
            name="uncaught_error",
            pattern=r"uncaught\s+(type)?error",
            severity="critical",
            description="Uncaught JavaScript error",
            is_critical=True,
            should_fail_test=True
        ),
        ErrorPattern(
            name="unhandled_rejection",
            pattern=r"unhandled\s+promise\s+rejection",
            severity="critical",
            description="Unhandled Promise rejection",
            is_critical=True,
            should_fail_test=True
        ),
        ErrorPattern(
            name="react_error",
            pattern=r"react.*error|error.*boundary",
            severity="critical",
            description="React rendering error",
            is_critical=True,
            should_fail_test=True
        ),
        ErrorPattern(
            name="network_error",
            pattern=r"failed\s+to\s+fetch|network\s+error|net::err",
            severity="high",
            description="Network request failure",
            is_critical=False,
            should_fail_test=False
        ),
        ErrorPattern(
            name="cors_error",
            pattern=r"cors|cross-origin|access-control-allow",
            severity="high",
            description="CORS policy violation",
            is_critical=False,
            should_fail_test=False
        ),
        ErrorPattern(
            name="syntax_error",
            pattern=r"syntaxerror|unexpected\s+token",
            severity="critical",
            description="JavaScript syntax error",
            is_critical=True,
            should_fail_test=True
        ),
        ErrorPattern(
            name="reference_error",
            pattern=r"referenceerror|is\s+not\s+defined",
            severity="critical",
            description="Reference to undefined variable",
            is_critical=True,
            should_fail_test=True
        ),
        ErrorPattern(
            name="type_error",
            pattern=r"typeerror|cannot\s+read\s+propert|is\s+not\s+a\s+function",
            severity="critical",
            description="Type error in JavaScript",
            is_critical=True,
            should_fail_test=True
        ),
    ]
    
    # Patterns to ignore (common non-critical warnings)
    DEFAULT_IGNORE_PATTERNS = [
        r"download\s+the\s+react\s+devtools",
        r"react-dom\.development\.js",
        r"source\s+map",
        r"favicon\.ico",
        r"hot\s+module\s+replacement",
        r"\[hmr\]",
        r"vite.*hmr",
    ]
    
    def __init__(
        self,
        report_dir: str = "./report/e2e-chrome-devtools-testing",
        critical_patterns: Optional[List[ErrorPattern]] = None,
        ignore_patterns: Optional[List[str]] = None
    ):
        """
        Initialize the console monitor.
        
        Args:
            report_dir: Directory for saving console logs
            critical_patterns: Custom critical error patterns (uses defaults if None)
            ignore_patterns: Patterns to ignore (uses defaults if None)
        """
        self.report_dir = Path(report_dir)
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
        self.messages: List[ConsoleMessage] = []
        self.critical_patterns = critical_patterns or self.DEFAULT_CRITICAL_PATTERNS
        self.ignore_patterns = ignore_patterns or self.DEFAULT_IGNORE_PATTERNS
        
        # Custom error handlers
        self.error_handlers: List[Callable[[ConsoleMessage], None]] = []
    
    def add_message(
        self,
        level: str,
        message: str,
        source: Optional[str] = None,
        url: Optional[str] = None,
        line_number: Optional[int] = None,
        column_number: Optional[int] = None,
        stack_trace: Optional[str] = None,
        args: Optional[List[Any]] = None,
        timestamp: Optional[str] = None
    ) -> ConsoleMessage:
        """
        Add a console message to the log.
        
        Args:
            level: Message level (log, info, warn, error, debug)
            message: Message content
            source: Source of the message (e.g., "javascript", "network")
            url: URL where the message originated
            line_number: Line number in source file
            column_number: Column number in source file
            stack_trace: Error stack trace if available
            args: Additional arguments passed to console method
            timestamp: Optional timestamp (uses current time if not provided)
            
        Returns:
            The created ConsoleMessage
        """
        console_msg = ConsoleMessage(
            level=level,
            message=message,
            timestamp=timestamp or datetime.now().isoformat(),
            source=source,
            url=url,
            line_number=line_number,
            column_number=column_number,
            stack_trace=stack_trace,
            args=args
        )
        
        self.messages.append(console_msg)
        
        # Call error handlers for errors
        if console_msg.is_error():
            for handler in self.error_handlers:
                handler(console_msg)
        
        return console_msg
    
    def add_messages_from_mcp(self, mcp_messages: List[Dict[str, Any]]) -> List[ConsoleMessage]:
        """
        Add multiple messages from Chrome DevTools MCP response.
        
        Args:
            mcp_messages: List of message dictionaries from MCP
            
        Returns:
            List of created ConsoleMessage objects
        """
        created = []
        for msg in mcp_messages:
            console_msg = self.add_message(
                level=msg.get("level", "log"),
                message=msg.get("message", msg.get("text", "")),
                source=msg.get("source"),
                url=msg.get("url"),
                line_number=msg.get("lineNumber"),
                column_number=msg.get("columnNumber"),
                stack_trace=msg.get("stackTrace"),
                args=msg.get("args"),
                timestamp=msg.get("timestamp")
            )
            created.append(console_msg)
        return created
    
    def register_error_handler(self, handler: Callable[[ConsoleMessage], None]) -> None:
        """
        Register a callback function to be called when errors are logged.
        
        Args:
            handler: Function that takes a ConsoleMessage and handles it
        """
        self.error_handlers.append(handler)
    
    def should_ignore(self, message: str) -> bool:
        """
        Check if a message should be ignored based on ignore patterns.
        
        Args:
            message: Message content to check
            
        Returns:
            True if message should be ignored
        """
        for pattern in self.ignore_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                return True
        return False
    
    def get_errors(self, include_ignored: bool = False) -> List[ConsoleMessage]:
        """
        Get all error messages.
        
        Args:
            include_ignored: Whether to include messages matching ignore patterns
            
        Returns:
            List of error ConsoleMessage objects
        """
        errors = [msg for msg in self.messages if msg.is_error()]
        if not include_ignored:
            errors = [e for e in errors if not self.should_ignore(e.message)]
        return errors
    
    def get_warnings(self, include_ignored: bool = False) -> List[ConsoleMessage]:
        """
        Get all warning messages.
        
        Args:
            include_ignored: Whether to include messages matching ignore patterns
            
        Returns:
            List of warning ConsoleMessage objects
        """
        warnings = [msg for msg in self.messages if msg.is_warning()]
        if not include_ignored:
            warnings = [w for w in warnings if not self.should_ignore(w.message)]
        return warnings
    
    def get_messages_by_level(self, level: str) -> List[ConsoleMessage]:
        """
        Get all messages of a specific level.
        
        Args:
            level: Message level to filter by
            
        Returns:
            List of matching ConsoleMessage objects
        """
        return [msg for msg in self.messages if msg.level.lower() == level.lower()]
    
    def get_messages_by_source(self, source: str) -> List[ConsoleMessage]:
        """
        Get all messages from a specific source.
        
        Args:
            source: Source to filter by (e.g., "javascript", "network")
            
        Returns:
            List of matching ConsoleMessage objects
        """
        return [msg for msg in self.messages if msg.source and source.lower() in msg.source.lower()]
    
    def get_messages_with_stack_trace(self) -> List[ConsoleMessage]:
        """
        Get all messages that have stack traces.
        
        Returns:
            List of ConsoleMessage objects with stack traces
        """
        return [msg for msg in self.messages if msg.stack_trace]

    
    def detect_critical_errors(self) -> List[Tuple[ConsoleMessage, ErrorPattern]]:
        """
        Detect critical errors based on defined patterns.
        
        Returns:
            List of tuples containing (ConsoleMessage, matching ErrorPattern)
        """
        critical = []
        errors = self.get_errors(include_ignored=False)
        
        for error in errors:
            for pattern in self.critical_patterns:
                if pattern.is_critical and pattern.matches(error.message):
                    critical.append((error, pattern))
                    break
        
        return critical
    
    def should_fail_test(self) -> Tuple[bool, List[str]]:
        """
        Determine if the test should fail based on console errors.
        
        Returns:
            Tuple of (should_fail: bool, reasons: List[str])
        """
        reasons = []
        
        # Check for critical errors
        critical_errors = self.detect_critical_errors()
        for error, pattern in critical_errors:
            if pattern.should_fail_test:
                reasons.append(
                    f"Critical error detected ({pattern.name}): {error.message[:100]}"
                )
        
        return len(reasons) > 0, reasons
    
    def analyze(self) -> ConsoleAnalysisResult:
        """
        Perform comprehensive analysis of console messages.
        
        Returns:
            ConsoleAnalysisResult with analysis details
        """
        errors = self.get_errors()
        warnings = self.get_warnings()
        critical_errors_with_patterns = self.detect_critical_errors()
        critical_errors = [e for e, _ in critical_errors_with_patterns]
        
        should_fail, failure_reasons = self.should_fail_test()
        
        return ConsoleAnalysisResult(
            total_messages=len(self.messages),
            error_count=len(errors),
            warning_count=len(warnings),
            critical_errors=critical_errors,
            errors=errors,
            warnings=warnings,
            should_fail_test=should_fail,
            failure_reasons=failure_reasons
        )
    
    def format_error_with_stack(self, error: ConsoleMessage) -> str:
        """
        Format an error message with its stack trace for display.
        
        Args:
            error: ConsoleMessage to format
            
        Returns:
            Formatted string with error details and stack trace
        """
        lines = [
            f"**Error**: {error.message}",
            f"- **Level**: {error.level}",
            f"- **Timestamp**: {error.timestamp}",
        ]
        
        if error.url:
            lines.append(f"- **URL**: {error.url}")
        
        if error.line_number is not None:
            location = f"Line {error.line_number}"
            if error.column_number is not None:
                location += f", Column {error.column_number}"
            lines.append(f"- **Location**: {location}")
        
        if error.source:
            lines.append(f"- **Source**: {error.source}")
        
        if error.stack_trace:
            lines.append("")
            lines.append("**Stack Trace**:")
            lines.append("```")
            lines.append(error.stack_trace)
            lines.append("```")
        
        return "\n".join(lines)
    
    def clear(self) -> None:
        """Clear all logged messages."""
        self.messages.clear()
    
    def save_logs(self, output_filename: Optional[str] = None) -> str:
        """
        Save all console logs to a JSON file.
        
        Args:
            output_filename: Optional custom filename
            
        Returns:
            Path to the saved file
        """
        if output_filename is None:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            output_filename = f"console-logs-{timestamp}.json"
        
        output_path = self.report_dir / output_filename
        
        data = {
            "timestamp": datetime.now().isoformat(),
            "total_messages": len(self.messages),
            "error_count": len(self.get_errors()),
            "warning_count": len(self.get_warnings()),
            "messages": [msg.to_dict() for msg in self.messages]
        }
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        
        return str(output_path)
    
    def generate_console_report(self, output_filename: Optional[str] = None) -> str:
        """
        Generate a markdown report of console activity.
        
        Args:
            output_filename: Optional custom filename
            
        Returns:
            Path to the generated report
        """
        if output_filename is None:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            output_filename = f"console-report-{timestamp}.md"
        
        output_path = self.report_dir / output_filename
        
        analysis = self.analyze()
        
        lines = [
            f"# Console Activity Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "## Summary",
            "",
            f"- **Total Messages**: {analysis.total_messages}",
            f"- **Errors**: {analysis.error_count}",
            f"- **Warnings**: {analysis.warning_count}",
            f"- **Critical Errors**: {len(analysis.critical_errors)}",
            f"- **Test Should Fail**: {'Yes' if analysis.should_fail_test else 'No'}",
            ""
        ]
        
        # Test failure reasons
        if analysis.failure_reasons:
            lines.extend([
                "## Test Failure Reasons",
                ""
            ])
            for reason in analysis.failure_reasons:
                lines.append(f"- {reason}")
            lines.append("")
        
        # Critical errors section
        if analysis.critical_errors:
            lines.extend([
                "## Critical Errors",
                "",
                "These errors indicate serious issues that should be addressed immediately.",
                ""
            ])
            
            for i, error in enumerate(analysis.critical_errors, 1):
                lines.append(f"### Critical Error {i}")
                lines.append("")
                lines.append(self.format_error_with_stack(error))
                lines.append("")
        
        # All errors section
        if analysis.errors:
            lines.extend([
                "## All Errors",
                ""
            ])
            
            for i, error in enumerate(analysis.errors, 1):
                lines.append(f"### Error {i}")
                lines.append("")
                lines.append(self.format_error_with_stack(error))
                lines.append("")
        
        # Warnings section
        if analysis.warnings:
            lines.extend([
                "## Warnings",
                ""
            ])
            
            for warning in analysis.warnings:
                lines.append(f"- **{warning.timestamp}**: {warning.message}")
                if warning.url:
                    lines.append(f"  - URL: {warning.url}")
            lines.append("")
        
        # No issues found
        if not analysis.errors and not analysis.warnings:
            lines.extend([
                "## Status",
                "",
                "✅ No errors or warnings detected during testing.",
                ""
            ])
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        
        return str(output_path)
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get a summary of console activity.
        
        Returns:
            Dictionary with summary statistics
        """
        analysis = self.analyze()
        
        return {
            "total_messages": analysis.total_messages,
            "error_count": analysis.error_count,
            "warning_count": analysis.warning_count,
            "critical_error_count": len(analysis.critical_errors),
            "should_fail_test": analysis.should_fail_test,
            "failure_reasons": analysis.failure_reasons,
            "has_stack_traces": len(self.get_messages_with_stack_trace()) > 0
        }



# Convenience functions for common operations

def create_console_monitor(
    report_dir: str = "./report/e2e-chrome-devtools-testing"
) -> ConsoleMonitor:
    """
    Create and return a ConsoleMonitor instance.
    
    Args:
        report_dir: Directory path for saving console logs
        
    Returns:
        ConsoleMonitor instance
    """
    return ConsoleMonitor(report_dir)


def parse_mcp_console_message(mcp_message: Dict[str, Any]) -> ConsoleMessage:
    """
    Parse a console message from Chrome DevTools MCP response.
    
    Args:
        mcp_message: Message dictionary from MCP
        
    Returns:
        ConsoleMessage object
    """
    return ConsoleMessage(
        level=mcp_message.get("level", "log"),
        message=mcp_message.get("message", mcp_message.get("text", "")),
        source=mcp_message.get("source"),
        url=mcp_message.get("url"),
        line_number=mcp_message.get("lineNumber"),
        column_number=mcp_message.get("columnNumber"),
        stack_trace=mcp_message.get("stackTrace"),
        args=mcp_message.get("args"),
        timestamp=mcp_message.get("timestamp", datetime.now().isoformat())
    )


def filter_errors(messages: List[ConsoleMessage]) -> List[ConsoleMessage]:
    """
    Filter console messages to get only errors.
    
    Args:
        messages: List of ConsoleMessage objects
        
    Returns:
        List of error messages
    """
    return [msg for msg in messages if msg.is_error()]


def filter_warnings(messages: List[ConsoleMessage]) -> List[ConsoleMessage]:
    """
    Filter console messages to get only warnings.
    
    Args:
        messages: List of ConsoleMessage objects
        
    Returns:
        List of warning messages
    """
    return [msg for msg in messages if msg.is_warning()]


def format_console_messages_for_report(
    messages: List[ConsoleMessage],
    include_stack_traces: bool = True
) -> str:
    """
    Format console messages for inclusion in a test report.
    
    Args:
        messages: List of ConsoleMessage objects
        include_stack_traces: Whether to include stack traces
        
    Returns:
        Formatted markdown string
    """
    if not messages:
        return "No console messages recorded."
    
    lines = []
    
    errors = filter_errors(messages)
    warnings = filter_warnings(messages)
    
    if errors:
        lines.append("### Errors")
        lines.append("")
        for error in errors:
            lines.append(f"- **{error.timestamp}**: {error.message}")
            if include_stack_traces and error.stack_trace:
                lines.append(f"  ```\n  {error.stack_trace}\n  ```")
        lines.append("")
    
    if warnings:
        lines.append("### Warnings")
        lines.append("")
        for warning in warnings:
            lines.append(f"- **{warning.timestamp}**: {warning.message}")
        lines.append("")
    
    if not errors and not warnings:
        lines.append("No errors or warnings detected.")
    
    return "\n".join(lines)


def check_for_critical_errors(
    messages: List[ConsoleMessage],
    custom_patterns: Optional[List[ErrorPattern]] = None
) -> Tuple[bool, List[str]]:
    """
    Check if any messages contain critical errors.
    
    Args:
        messages: List of ConsoleMessage objects
        custom_patterns: Optional custom error patterns
        
    Returns:
        Tuple of (has_critical_errors: bool, error_descriptions: List[str])
    """
    monitor = ConsoleMonitor()
    monitor.messages = messages
    
    if custom_patterns:
        monitor.critical_patterns = custom_patterns
    
    critical = monitor.detect_critical_errors()
    
    descriptions = []
    for error, pattern in critical:
        descriptions.append(f"{pattern.name}: {error.message[:100]}")
    
    return len(critical) > 0, descriptions


def create_error_pattern(
    name: str,
    pattern: str,
    severity: str = "high",
    is_critical: bool = False,
    should_fail_test: bool = False,
    description: Optional[str] = None
) -> ErrorPattern:
    """
    Create a custom error pattern for matching.
    
    Args:
        name: Pattern name
        pattern: Regex pattern to match
        severity: Error severity level
        is_critical: Whether this is a critical error
        should_fail_test: Whether matching errors should fail the test
        description: Optional description
        
    Returns:
        ErrorPattern object
    """
    return ErrorPattern(
        name=name,
        pattern=pattern,
        severity=severity,
        is_critical=is_critical,
        should_fail_test=should_fail_test,
        description=description
    )


# Pre-defined error patterns for common scenarios

REACT_ERROR_PATTERNS = [
    ErrorPattern(
        name="react_hydration_error",
        pattern=r"hydration.*mismatch|text\s+content\s+does\s+not\s+match",
        severity="high",
        description="React hydration mismatch",
        is_critical=False,
        should_fail_test=False
    ),
    ErrorPattern(
        name="react_key_warning",
        pattern=r"each\s+child.*should\s+have\s+a\s+unique.*key",
        severity="medium",
        description="Missing React key prop",
        is_critical=False,
        should_fail_test=False
    ),
    ErrorPattern(
        name="react_state_update_unmounted",
        pattern=r"can't\s+perform.*state\s+update.*unmounted",
        severity="medium",
        description="State update on unmounted component",
        is_critical=False,
        should_fail_test=False
    ),
]

NETWORK_ERROR_PATTERNS = [
    ErrorPattern(
        name="fetch_failed",
        pattern=r"failed\s+to\s+fetch",
        severity="high",
        description="Fetch request failed",
        is_critical=False,
        should_fail_test=False
    ),
    ErrorPattern(
        name="network_error",
        pattern=r"networkerror|net::err",
        severity="high",
        description="Network error",
        is_critical=False,
        should_fail_test=False
    ),
    ErrorPattern(
        name="timeout_error",
        pattern=r"timeout|timed\s+out",
        severity="medium",
        description="Request timeout",
        is_critical=False,
        should_fail_test=False
    ),
]

WEBSOCKET_ERROR_PATTERNS = [
    ErrorPattern(
        name="websocket_connection_failed",
        pattern=r"websocket.*connection.*failed|websocket.*error",
        severity="high",
        description="WebSocket connection failure",
        is_critical=False,
        should_fail_test=False
    ),
    ErrorPattern(
        name="websocket_closed",
        pattern=r"websocket.*closed|connection.*closed.*unexpectedly",
        severity="medium",
        description="WebSocket connection closed",
        is_critical=False,
        should_fail_test=False
    ),
]


def get_all_error_patterns() -> List[ErrorPattern]:
    """
    Get all pre-defined error patterns.
    
    Returns:
        List of all ErrorPattern objects
    """
    return (
        ConsoleMonitor.DEFAULT_CRITICAL_PATTERNS +
        REACT_ERROR_PATTERNS +
        NETWORK_ERROR_PATTERNS +
        WEBSOCKET_ERROR_PATTERNS
    )
