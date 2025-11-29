"""
Network activity monitoring and logging system for E2E Chrome DevTools testing.

This module provides functionality to monitor, log, and verify network activity
during E2E testing using Chrome DevTools MCP capabilities.

Requirements covered:
- 8.1: Capture and verify request headers and payloads
- 8.2: Verify response status codes and data structure
- 8.3: Verify WebSocket connection establishment and message flow
- 8.4: Verify appropriate error handling when API requests fail
- 8.5: Verify cache headers and behavior
"""

import json
import re
from typing import Any, Dict, List, Optional, Tuple, Callable
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path


class RequestType(Enum):
    """Types of network requests."""
    DOCUMENT = "document"
    STYLESHEET = "stylesheet"
    IMAGE = "image"
    MEDIA = "media"
    FONT = "font"
    SCRIPT = "script"
    XHR = "xhr"
    FETCH = "fetch"
    WEBSOCKET = "websocket"
    OTHER = "other"


class WebSocketState(Enum):
    """WebSocket connection states."""
    CONNECTING = "connecting"
    OPEN = "open"
    CLOSING = "closing"
    CLOSED = "closed"


@dataclass
class NetworkRequestLog:
    """Log entry for a network request."""
    
    reqid: int
    url: str
    method: str
    resource_type: str
    status: Optional[int] = None
    status_text: Optional[str] = None
    request_headers: Dict[str, str] = field(default_factory=dict)
    response_headers: Dict[str, str] = field(default_factory=dict)
    request_body: Optional[Any] = None
    response_body: Optional[Any] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    duration_ms: Optional[float] = None
    error: Optional[str] = None
    from_cache: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), indent=2, default=str)


@dataclass
class WebSocketLog:
    """Log entry for WebSocket activity."""
    
    url: str
    state: str
    messages: List[Dict[str, Any]] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    error: Optional[str] = None
    close_code: Optional[int] = None
    close_reason: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    def add_message(self, direction: str, data: Any, timestamp: Optional[str] = None) -> None:
        """
        Add a message to the WebSocket log.
        
        Args:
            direction: "sent" or "received"
            data: Message data
            timestamp: Optional timestamp (uses current time if not provided)
        """
        self.messages.append({
            "direction": direction,
            "data": data,
            "timestamp": timestamp or datetime.now().isoformat()
        })


@dataclass
class NetworkTimingMetrics:
    """Timing metrics for network requests."""
    
    dns_lookup_ms: Optional[float] = None
    tcp_connection_ms: Optional[float] = None
    ssl_handshake_ms: Optional[float] = None
    request_sent_ms: Optional[float] = None
    waiting_ms: Optional[float] = None  # Time to first byte (TTFB)
    content_download_ms: Optional[float] = None
    total_ms: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class ExpectedApiCall:
    """Definition of an expected API call for verification."""
    
    url_pattern: str
    method: str = "GET"
    match_type: str = "contains"  # "contains", "exact", "regex"
    expected_status: Optional[int] = None
    expected_headers: Optional[Dict[str, str]] = None
    expected_body_contains: Optional[List[str]] = None
    required: bool = True
    description: Optional[str] = None
    
    def matches_url(self, url: str) -> bool:
        """Check if URL matches the pattern."""
        if self.match_type == "exact":
            return url == self.url_pattern
        elif self.match_type == "contains":
            return self.url_pattern in url
        elif self.match_type == "regex":
            return bool(re.search(self.url_pattern, url))
        return False


class NetworkActivityMonitor:
    """
    Monitor and log network activity during E2E testing.
    
    This class provides functionality to:
    - Retrieve and log network requests via Chrome DevTools MCP
    - Verify expected API calls were made
    - Collect timing metrics
    - Monitor WebSocket connections
    """
    
    def __init__(self, report_dir: str = "./report/e2e-chrome-devtools-testing"):
        """
        Initialize the network activity monitor.
        
        Args:
            report_dir: Directory for saving network logs
        """
        self.report_dir = Path(report_dir)
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
        self.request_logs: List[NetworkRequestLog] = []
        self.websocket_logs: List[WebSocketLog] = []
        self.expected_calls: List[ExpectedApiCall] = []
        self.timing_metrics: Dict[int, NetworkTimingMetrics] = {}
    
    def add_request_log(
        self,
        reqid: int,
        url: str,
        method: str,
        resource_type: str = "fetch",
        status: Optional[int] = None,
        status_text: Optional[str] = None,
        request_headers: Optional[Dict[str, str]] = None,
        response_headers: Optional[Dict[str, str]] = None,
        request_body: Optional[Any] = None,
        response_body: Optional[Any] = None,
        duration_ms: Optional[float] = None,
        error: Optional[str] = None,
        from_cache: bool = False
    ) -> NetworkRequestLog:
        """
        Add a network request log entry.
        
        Args:
            reqid: Request ID from Chrome DevTools
            url: Request URL
            method: HTTP method
            resource_type: Type of resource (fetch, xhr, document, etc.)
            status: HTTP status code
            status_text: HTTP status text
            request_headers: Request headers
            response_headers: Response headers
            request_body: Request body/payload
            response_body: Response body
            duration_ms: Request duration in milliseconds
            error: Error message if request failed
            from_cache: Whether response was served from cache
            
        Returns:
            The created NetworkRequestLog
        """
        log = NetworkRequestLog(
            reqid=reqid,
            url=url,
            method=method,
            resource_type=resource_type,
            status=status,
            status_text=status_text,
            request_headers=request_headers or {},
            response_headers=response_headers or {},
            request_body=request_body,
            response_body=response_body,
            duration_ms=duration_ms,
            error=error,
            from_cache=from_cache
        )
        self.request_logs.append(log)
        return log
    
    def add_websocket_log(
        self,
        url: str,
        state: str = "connecting",
        error: Optional[str] = None
    ) -> WebSocketLog:
        """
        Add a WebSocket connection log entry.
        
        Args:
            url: WebSocket URL
            state: Connection state
            error: Error message if connection failed
            
        Returns:
            The created WebSocketLog
        """
        log = WebSocketLog(url=url, state=state, error=error)
        self.websocket_logs.append(log)
        return log
    
    def add_expected_call(
        self,
        url_pattern: str,
        method: str = "GET",
        match_type: str = "contains",
        expected_status: Optional[int] = None,
        expected_headers: Optional[Dict[str, str]] = None,
        expected_body_contains: Optional[List[str]] = None,
        required: bool = True,
        description: Optional[str] = None
    ) -> ExpectedApiCall:
        """
        Add an expected API call for verification.
        
        Args:
            url_pattern: URL pattern to match
            method: Expected HTTP method
            match_type: Type of URL matching
            expected_status: Expected HTTP status code
            expected_headers: Expected response headers
            expected_body_contains: Strings that should be in response body
            required: Whether this call is required
            description: Description of the expected call
            
        Returns:
            The created ExpectedApiCall
        """
        expected = ExpectedApiCall(
            url_pattern=url_pattern,
            method=method,
            match_type=match_type,
            expected_status=expected_status,
            expected_headers=expected_headers,
            expected_body_contains=expected_body_contains,
            required=required,
            description=description
        )
        self.expected_calls.append(expected)
        return expected
    
    def add_timing_metrics(
        self,
        reqid: int,
        dns_lookup_ms: Optional[float] = None,
        tcp_connection_ms: Optional[float] = None,
        ssl_handshake_ms: Optional[float] = None,
        request_sent_ms: Optional[float] = None,
        waiting_ms: Optional[float] = None,
        content_download_ms: Optional[float] = None,
        total_ms: Optional[float] = None
    ) -> NetworkTimingMetrics:
        """
        Add timing metrics for a request.
        
        Args:
            reqid: Request ID
            dns_lookup_ms: DNS lookup time
            tcp_connection_ms: TCP connection time
            ssl_handshake_ms: SSL handshake time
            request_sent_ms: Time to send request
            waiting_ms: Time to first byte (TTFB)
            content_download_ms: Content download time
            total_ms: Total request time
            
        Returns:
            The created NetworkTimingMetrics
        """
        metrics = NetworkTimingMetrics(
            dns_lookup_ms=dns_lookup_ms,
            tcp_connection_ms=tcp_connection_ms,
            ssl_handshake_ms=ssl_handshake_ms,
            request_sent_ms=request_sent_ms,
            waiting_ms=waiting_ms,
            content_download_ms=content_download_ms,
            total_ms=total_ms
        )
        self.timing_metrics[reqid] = metrics
        return metrics

    
    def get_requests_by_url(self, url_pattern: str, match_type: str = "contains") -> List[NetworkRequestLog]:
        """
        Get all requests matching a URL pattern.
        
        Args:
            url_pattern: URL pattern to match
            match_type: Type of matching ("contains", "exact", "regex")
            
        Returns:
            List of matching NetworkRequestLog entries
        """
        results = []
        for log in self.request_logs:
            if match_type == "exact" and log.url == url_pattern:
                results.append(log)
            elif match_type == "contains" and url_pattern in log.url:
                results.append(log)
            elif match_type == "regex" and re.search(url_pattern, log.url):
                results.append(log)
        return results
    
    def get_requests_by_type(self, resource_type: str) -> List[NetworkRequestLog]:
        """
        Get all requests of a specific resource type.
        
        Args:
            resource_type: Resource type (fetch, xhr, document, etc.)
            
        Returns:
            List of matching NetworkRequestLog entries
        """
        return [log for log in self.request_logs if log.resource_type == resource_type]
    
    def get_failed_requests(self) -> List[NetworkRequestLog]:
        """
        Get all failed requests (status >= 400 or has error).
        
        Returns:
            List of failed NetworkRequestLog entries
        """
        return [
            log for log in self.request_logs
            if log.error or (log.status and log.status >= 400)
        ]
    
    def get_api_requests(self) -> List[NetworkRequestLog]:
        """
        Get all API requests (requests to /api/ endpoints).
        
        Returns:
            List of API NetworkRequestLog entries
        """
        return [log for log in self.request_logs if "/api/" in log.url]
    
    def get_cached_requests(self) -> List[NetworkRequestLog]:
        """
        Get all requests served from cache.
        
        Returns:
            List of cached NetworkRequestLog entries
        """
        return [log for log in self.request_logs if log.from_cache]
    
    def verify_expected_calls(self) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Verify that all expected API calls were made.
        
        Returns:
            Tuple of (all_verified: bool, verification_results: List)
        """
        results = []
        all_verified = True
        
        for expected in self.expected_calls:
            # Find matching requests
            matching_requests = [
                log for log in self.request_logs
                if expected.matches_url(log.url) and log.method.upper() == expected.method.upper()
            ]
            
            result = {
                "expected": {
                    "url_pattern": expected.url_pattern,
                    "method": expected.method,
                    "description": expected.description
                },
                "found": len(matching_requests) > 0,
                "match_count": len(matching_requests),
                "required": expected.required,
                "issues": []
            }
            
            if not matching_requests:
                if expected.required:
                    result["issues"].append("Required API call was not made")
                    all_verified = False
            else:
                # Verify the first matching request
                request = matching_requests[0]
                
                # Check status code
                if expected.expected_status and request.status != expected.expected_status:
                    result["issues"].append(
                        f"Expected status {expected.expected_status}, got {request.status}"
                    )
                    all_verified = False
                
                # Check headers
                if expected.expected_headers:
                    for header, value in expected.expected_headers.items():
                        actual_value = request.response_headers.get(header)
                        if actual_value != value:
                            result["issues"].append(
                                f"Expected header {header}={value}, got {actual_value}"
                            )
                            all_verified = False
                
                # Check response body contains expected strings
                if expected.expected_body_contains and request.response_body:
                    body_str = json.dumps(request.response_body) if isinstance(request.response_body, dict) else str(request.response_body)
                    for expected_str in expected.expected_body_contains:
                        if expected_str not in body_str:
                            result["issues"].append(
                                f"Response body does not contain: {expected_str}"
                            )
                            all_verified = False
                
                result["actual_status"] = request.status
                result["actual_url"] = request.url
            
            results.append(result)
        
        return all_verified, results
    
    def verify_request_headers(
        self,
        reqid: int,
        expected_headers: Dict[str, str]
    ) -> Tuple[bool, List[str]]:
        """
        Verify request headers for a specific request.
        
        Args:
            reqid: Request ID
            expected_headers: Expected headers to verify
            
        Returns:
            Tuple of (all_match: bool, issues: List[str])
        """
        issues = []
        
        # Find the request
        request = next((log for log in self.request_logs if log.reqid == reqid), None)
        if not request:
            return False, [f"Request with ID {reqid} not found"]
        
        for header, expected_value in expected_headers.items():
            actual_value = request.request_headers.get(header)
            if actual_value != expected_value:
                issues.append(
                    f"Header '{header}': expected '{expected_value}', got '{actual_value}'"
                )
        
        return len(issues) == 0, issues
    
    def verify_response_structure(
        self,
        reqid: int,
        expected_fields: List[str]
    ) -> Tuple[bool, List[str]]:
        """
        Verify response body contains expected fields.
        
        Args:
            reqid: Request ID
            expected_fields: List of field names that should be in response
            
        Returns:
            Tuple of (all_present: bool, missing_fields: List[str])
        """
        # Find the request
        request = next((log for log in self.request_logs if log.reqid == reqid), None)
        if not request:
            return False, [f"Request with ID {reqid} not found"]
        
        if not request.response_body:
            return False, ["Response body is empty"]
        
        if not isinstance(request.response_body, dict):
            return False, ["Response body is not a JSON object"]
        
        missing = [field for field in expected_fields if field not in request.response_body]
        return len(missing) == 0, missing
    
    def verify_cache_headers(
        self,
        reqid: int
    ) -> Dict[str, Any]:
        """
        Verify cache-related headers for a request.
        
        Args:
            reqid: Request ID
            
        Returns:
            Dictionary with cache header analysis
        """
        # Find the request
        request = next((log for log in self.request_logs if log.reqid == reqid), None)
        if not request:
            return {"error": f"Request with ID {reqid} not found"}
        
        cache_headers = {
            "cache-control": request.response_headers.get("cache-control"),
            "etag": request.response_headers.get("etag"),
            "last-modified": request.response_headers.get("last-modified"),
            "expires": request.response_headers.get("expires"),
            "pragma": request.response_headers.get("pragma"),
            "vary": request.response_headers.get("vary")
        }
        
        # Analyze cache behavior
        analysis = {
            "headers": cache_headers,
            "from_cache": request.from_cache,
            "cacheable": False,
            "cache_duration": None
        }
        
        cache_control = cache_headers.get("cache-control", "")
        if cache_control:
            analysis["cacheable"] = "no-store" not in cache_control and "no-cache" not in cache_control
            
            # Extract max-age if present
            max_age_match = re.search(r"max-age=(\d+)", cache_control)
            if max_age_match:
                analysis["cache_duration"] = int(max_age_match.group(1))
        
        return analysis
    
    def verify_websocket_connection(
        self,
        url_pattern: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Verify WebSocket connection was established.
        
        Args:
            url_pattern: URL pattern to match
            
        Returns:
            Tuple of (connected: bool, connection_info: Dict)
        """
        matching_logs = [
            log for log in self.websocket_logs
            if url_pattern in log.url
        ]
        
        if not matching_logs:
            return False, {"error": f"No WebSocket connection found for {url_pattern}"}
        
        log = matching_logs[0]
        connected = log.state in ["open", WebSocketState.OPEN.value]
        
        return connected, {
            "url": log.url,
            "state": log.state,
            "message_count": len(log.messages),
            "error": log.error
        }
    
    def verify_websocket_messages(
        self,
        url_pattern: str,
        expected_message_count: Optional[int] = None,
        expected_message_types: Optional[List[str]] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Verify WebSocket messages were received.
        
        Args:
            url_pattern: URL pattern to match
            expected_message_count: Expected number of messages
            expected_message_types: Expected message types/statuses
            
        Returns:
            Tuple of (verified: bool, verification_info: Dict)
        """
        matching_logs = [
            log for log in self.websocket_logs
            if url_pattern in log.url
        ]
        
        if not matching_logs:
            return False, {"error": f"No WebSocket connection found for {url_pattern}"}
        
        log = matching_logs[0]
        received_messages = [m for m in log.messages if m.get("direction") == "received"]
        
        result = {
            "url": log.url,
            "total_messages": len(log.messages),
            "received_messages": len(received_messages),
            "issues": []
        }
        
        verified = True
        
        if expected_message_count is not None:
            if len(received_messages) < expected_message_count:
                result["issues"].append(
                    f"Expected at least {expected_message_count} messages, got {len(received_messages)}"
                )
                verified = False
        
        if expected_message_types:
            received_types = []
            for msg in received_messages:
                data = msg.get("data", {})
                if isinstance(data, str):
                    try:
                        data = json.loads(data)
                    except json.JSONDecodeError:
                        pass
                if isinstance(data, dict):
                    received_types.append(data.get("status", data.get("type", "unknown")))
            
            for expected_type in expected_message_types:
                if expected_type not in received_types:
                    result["issues"].append(f"Expected message type '{expected_type}' not found")
                    verified = False
            
            result["received_types"] = received_types
        
        return verified, result

    
    def get_timing_summary(self) -> Dict[str, Any]:
        """
        Get summary of timing metrics across all requests.
        
        Returns:
            Dictionary with timing summary statistics
        """
        if not self.timing_metrics:
            return {"error": "No timing metrics collected"}
        
        total_times = [m.total_ms for m in self.timing_metrics.values() if m.total_ms]
        waiting_times = [m.waiting_ms for m in self.timing_metrics.values() if m.waiting_ms]
        
        summary = {
            "request_count": len(self.timing_metrics),
            "total_time": {
                "min_ms": min(total_times) if total_times else None,
                "max_ms": max(total_times) if total_times else None,
                "avg_ms": sum(total_times) / len(total_times) if total_times else None
            },
            "ttfb": {
                "min_ms": min(waiting_times) if waiting_times else None,
                "max_ms": max(waiting_times) if waiting_times else None,
                "avg_ms": sum(waiting_times) / len(waiting_times) if waiting_times else None
            }
        }
        
        return summary
    
    def clear_logs(self) -> None:
        """Clear all logged data."""
        self.request_logs.clear()
        self.websocket_logs.clear()
        self.expected_calls.clear()
        self.timing_metrics.clear()
    
    def save_logs(self, output_filename: Optional[str] = None) -> str:
        """
        Save all network logs to a JSON file.
        
        Args:
            output_filename: Optional custom filename
            
        Returns:
            Path to the saved file
        """
        if output_filename is None:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            output_filename = f"network-logs-{timestamp}.json"
        
        output_path = self.report_dir / output_filename
        
        data = {
            "timestamp": datetime.now().isoformat(),
            "request_count": len(self.request_logs),
            "websocket_count": len(self.websocket_logs),
            "requests": [log.to_dict() for log in self.request_logs],
            "websockets": [log.to_dict() for log in self.websocket_logs],
            "timing_metrics": {
                str(k): v.to_dict() for k, v in self.timing_metrics.items()
            }
        }
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
        
        return str(output_path)
    
    def generate_network_report(self, output_filename: Optional[str] = None) -> str:
        """
        Generate a markdown report of network activity.
        
        Args:
            output_filename: Optional custom filename
            
        Returns:
            Path to the generated report
        """
        if output_filename is None:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            output_filename = f"network-report-{timestamp}.md"
        
        output_path = self.report_dir / output_filename
        
        lines = [
            f"# Network Activity Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "## Summary",
            "",
            f"- **Total Requests**: {len(self.request_logs)}",
            f"- **API Requests**: {len(self.get_api_requests())}",
            f"- **Failed Requests**: {len(self.get_failed_requests())}",
            f"- **Cached Requests**: {len(self.get_cached_requests())}",
            f"- **WebSocket Connections**: {len(self.websocket_logs)}",
            ""
        ]
        
        # Timing summary
        timing_summary = self.get_timing_summary()
        if "error" not in timing_summary:
            lines.extend([
                "## Timing Metrics",
                "",
                f"- **Requests with timing data**: {timing_summary['request_count']}",
                f"- **Average response time**: {timing_summary['total_time']['avg_ms']:.2f}ms" if timing_summary['total_time']['avg_ms'] else "- **Average response time**: N/A",
                f"- **Average TTFB**: {timing_summary['ttfb']['avg_ms']:.2f}ms" if timing_summary['ttfb']['avg_ms'] else "- **Average TTFB**: N/A",
                ""
            ])
        
        # API Requests
        api_requests = self.get_api_requests()
        if api_requests:
            lines.extend([
                "## API Requests",
                "",
                "| Method | URL | Status | Duration |",
                "|--------|-----|--------|----------|"
            ])
            
            for req in api_requests:
                duration = f"{req.duration_ms:.0f}ms" if req.duration_ms else "N/A"
                status = str(req.status) if req.status else "N/A"
                # Truncate URL for readability
                url = req.url if len(req.url) <= 60 else req.url[:57] + "..."
                lines.append(f"| {req.method} | {url} | {status} | {duration} |")
            
            lines.append("")
        
        # Failed Requests
        failed_requests = self.get_failed_requests()
        if failed_requests:
            lines.extend([
                "## Failed Requests",
                ""
            ])
            
            for req in failed_requests:
                lines.append(f"### {req.method} {req.url}")
                lines.append("")
                lines.append(f"- **Status**: {req.status or 'N/A'}")
                lines.append(f"- **Error**: {req.error or 'N/A'}")
                if req.response_body:
                    lines.append(f"- **Response**: ```json\n{json.dumps(req.response_body, indent=2)}\n```")
                lines.append("")
        
        # WebSocket Activity
        if self.websocket_logs:
            lines.extend([
                "## WebSocket Activity",
                ""
            ])
            
            for ws in self.websocket_logs:
                lines.append(f"### {ws.url}")
                lines.append("")
                lines.append(f"- **State**: {ws.state}")
                lines.append(f"- **Messages**: {len(ws.messages)}")
                if ws.error:
                    lines.append(f"- **Error**: {ws.error}")
                lines.append("")
        
        # Expected Calls Verification
        if self.expected_calls:
            all_verified, verification_results = self.verify_expected_calls()
            
            lines.extend([
                "## Expected API Calls Verification",
                "",
                f"**Status**: {'✓ All verified' if all_verified else '✗ Some issues found'}",
                ""
            ])
            
            for result in verification_results:
                status_icon = "✓" if result["found"] and not result["issues"] else "✗"
                lines.append(f"### {status_icon} {result['expected']['method']} {result['expected']['url_pattern']}")
                lines.append("")
                
                if result["expected"]["description"]:
                    lines.append(f"*{result['expected']['description']}*")
                    lines.append("")
                
                lines.append(f"- **Found**: {'Yes' if result['found'] else 'No'}")
                lines.append(f"- **Required**: {'Yes' if result['required'] else 'No'}")
                
                if result.get("actual_status"):
                    lines.append(f"- **Actual Status**: {result['actual_status']}")
                
                if result["issues"]:
                    lines.append("- **Issues**:")
                    for issue in result["issues"]:
                        lines.append(f"  - {issue}")
                
                lines.append("")
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        
        return str(output_path)
    
    def format_for_test_report(self) -> str:
        """
        Format network activity for inclusion in test report.
        
        Returns:
            Formatted markdown string
        """
        lines = [
            "## Network Activity",
            "",
            f"- Total Requests: {len(self.request_logs)}",
            f"- Failed Requests: {len(self.get_failed_requests())}",
            f"- API Requests: {len(self.get_api_requests())}",
            ""
        ]
        
        # Add timing summary
        timing = self.get_timing_summary()
        if "error" not in timing and timing["total_time"]["avg_ms"]:
            lines.append(f"- Average Response Time: {timing['total_time']['avg_ms']:.2f}ms")
            lines.append("")
        
        # Add API request details
        api_requests = self.get_api_requests()
        if api_requests:
            lines.append("### API Requests")
            lines.append("")
            
            for req in api_requests[:10]:  # Limit to first 10
                status_icon = "✓" if req.status and req.status < 400 else "✗"
                lines.append(f"- {status_icon} `{req.method} {req.url}` - {req.status or 'N/A'}")
            
            if len(api_requests) > 10:
                lines.append(f"- ... and {len(api_requests) - 10} more")
            
            lines.append("")
        
        return "\n".join(lines)


# ============================================================================
# CHROME DEVTOOLS MCP INTEGRATION FUNCTIONS
# ============================================================================

def parse_network_request_from_mcp(mcp_response: Dict[str, Any]) -> NetworkRequestLog:
    """
    Parse a network request from Chrome DevTools MCP response.
    
    Args:
        mcp_response: Response from mcp_chrome_devtools_get_network_request
        
    Returns:
        NetworkRequestLog object
    """
    return NetworkRequestLog(
        reqid=mcp_response.get("reqid", 0),
        url=mcp_response.get("url", ""),
        method=mcp_response.get("method", "GET"),
        resource_type=mcp_response.get("resourceType", "other"),
        status=mcp_response.get("status"),
        status_text=mcp_response.get("statusText"),
        request_headers=mcp_response.get("requestHeaders", {}),
        response_headers=mcp_response.get("responseHeaders", {}),
        request_body=mcp_response.get("requestBody"),
        response_body=mcp_response.get("responseBody"),
        duration_ms=mcp_response.get("timing", {}).get("total"),
        from_cache=mcp_response.get("fromCache", False)
    )


def parse_network_list_from_mcp(mcp_response: List[Dict[str, Any]]) -> List[NetworkRequestLog]:
    """
    Parse a list of network requests from Chrome DevTools MCP response.
    
    Args:
        mcp_response: Response from mcp_chrome_devtools_list_network_requests
        
    Returns:
        List of NetworkRequestLog objects
    """
    return [parse_network_request_from_mcp(req) for req in mcp_response]


def get_network_monitoring_instructions() -> Dict[str, Any]:
    """
    Get instructions for monitoring network activity via Chrome DevTools MCP.
    
    Returns:
        Dictionary with monitoring instructions
    """
    return {
        "action": "monitor_network",
        "instructions": (
            "Use Chrome DevTools MCP to monitor network activity during testing. "
            "The following tools are available for network monitoring:"
        ),
        "tools": [
            {
                "name": "mcp_chrome_devtools_list_network_requests",
                "description": "List all network requests since last navigation",
                "usage": "Call with optional resourceTypes filter (e.g., ['fetch', 'xhr'])"
            },
            {
                "name": "mcp_chrome_devtools_get_network_request",
                "description": "Get detailed information about a specific request",
                "usage": "Call with reqid from list_network_requests"
            }
        ],
        "steps": [
            "1. Navigate to the page you want to test",
            "2. Perform the actions that trigger network requests",
            "3. Call mcp_chrome_devtools_list_network_requests to get all requests",
            "4. For detailed info, call mcp_chrome_devtools_get_network_request with specific reqid",
            "5. Use NetworkActivityMonitor to log and verify requests"
        ],
        "example_workflow": """
# Example workflow for network monitoring:

# 1. List all API requests
requests = mcp_chrome_devtools_list_network_requests(resourceTypes=['fetch', 'xhr'])

# 2. Get details for a specific request
details = mcp_chrome_devtools_get_network_request(reqid=123)

# 3. Log to monitor
monitor = NetworkActivityMonitor()
monitor.add_request_log(
    reqid=details['reqid'],
    url=details['url'],
    method=details['method'],
    status=details['status'],
    response_body=details.get('responseBody')
)

# 4. Verify expected calls
monitor.add_expected_call('/api/lyrics/generate', method='POST', expected_status=200)
verified, results = monitor.verify_expected_calls()
"""
    }


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def create_network_monitor(report_dir: str = "./report/e2e-chrome-devtools-testing") -> NetworkActivityMonitor:
    """
    Create a NetworkActivityMonitor instance.
    
    Args:
        report_dir: Directory for saving network logs
        
    Returns:
        NetworkActivityMonitor instance
    """
    return NetworkActivityMonitor(report_dir)


def setup_expected_api_calls_for_user_journey(monitor: NetworkActivityMonitor) -> None:
    """
    Set up expected API calls for the complete user journey.
    
    Args:
        monitor: NetworkActivityMonitor instance
    """
    # Page A: Lyrics generation
    monitor.add_expected_call(
        url_pattern="/api/lyrics/generate",
        method="POST",
        expected_status=200,
        expected_body_contains=["lyrics"],
        description="Lyrics generation API call from Page A"
    )
    
    # Page B: Song generation
    monitor.add_expected_call(
        url_pattern="/api/songs/generate",
        method="POST",
        expected_status=200,
        expected_body_contains=["task_id"],
        description="Song generation API call from Page B"
    )


def setup_expected_api_calls_for_error_testing(
    monitor: NetworkActivityMonitor,
    error_type: str
) -> None:
    """
    Set up expected API calls for error scenario testing.
    
    Args:
        monitor: NetworkActivityMonitor instance
        error_type: Type of error (rate_limit, server_error, timeout, validation)
    """
    status_map = {
        "rate_limit": 429,
        "server_error": 500,
        "timeout": 504,
        "validation": 400
    }
    
    expected_status = status_map.get(error_type, 500)
    
    monitor.add_expected_call(
        url_pattern="/api/",
        method="POST",
        expected_status=expected_status,
        description=f"API call expected to return {error_type} error"
    )


def verify_api_call_made(
    monitor: NetworkActivityMonitor,
    url_pattern: str,
    method: str = "POST"
) -> Tuple[bool, Optional[NetworkRequestLog]]:
    """
    Verify that a specific API call was made.
    
    Args:
        monitor: NetworkActivityMonitor instance
        url_pattern: URL pattern to match
        method: HTTP method
        
    Returns:
        Tuple of (found: bool, request: Optional[NetworkRequestLog])
    """
    requests = monitor.get_requests_by_url(url_pattern)
    matching = [r for r in requests if r.method.upper() == method.upper()]
    
    if matching:
        return True, matching[0]
    return False, None


def get_request_payload(
    monitor: NetworkActivityMonitor,
    url_pattern: str,
    method: str = "POST"
) -> Optional[Any]:
    """
    Get the request payload for a specific API call.
    
    Args:
        monitor: NetworkActivityMonitor instance
        url_pattern: URL pattern to match
        method: HTTP method
        
    Returns:
        Request body/payload or None
    """
    found, request = verify_api_call_made(monitor, url_pattern, method)
    if found and request:
        return request.request_body
    return None


def get_response_data(
    monitor: NetworkActivityMonitor,
    url_pattern: str,
    method: str = "POST"
) -> Optional[Any]:
    """
    Get the response data for a specific API call.
    
    Args:
        monitor: NetworkActivityMonitor instance
        url_pattern: URL pattern to match
        method: HTTP method
        
    Returns:
        Response body or None
    """
    found, request = verify_api_call_made(monitor, url_pattern, method)
    if found and request:
        return request.response_body
    return None
