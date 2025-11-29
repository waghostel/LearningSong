"""
Tests for the network activity monitoring and logging system.
"""

import json
import pytest
from pathlib import Path
import tempfile
import shutil

from tests.e2e_network_monitor import (
    NetworkActivityMonitor,
    NetworkRequestLog,
    WebSocketLog,
    NetworkTimingMetrics,
    ExpectedApiCall,
    RequestType,
    WebSocketState,
    parse_network_request_from_mcp,
    parse_network_list_from_mcp,
    create_network_monitor,
    setup_expected_api_calls_for_user_journey,
    setup_expected_api_calls_for_error_testing,
    verify_api_call_made,
    get_request_payload,
    get_response_data,
    get_network_monitoring_instructions
)


class TestNetworkRequestLog:
    """Tests for NetworkRequestLog dataclass."""
    
    def test_create_request_log(self):
        """Test creating a network request log."""
        log = NetworkRequestLog(
            reqid=1,
            url="http://localhost:8000/api/lyrics/generate",
            method="POST",
            resource_type="fetch",
            status=200,
            status_text="OK"
        )
        assert log.reqid == 1
        assert log.url == "http://localhost:8000/api/lyrics/generate"
        assert log.method == "POST"
        assert log.status == 200

    def test_request_log_to_dict(self):
        """Test converting request log to dictionary."""
        log = NetworkRequestLog(
            reqid=1,
            url="http://localhost:8000/api/test",
            method="GET",
            resource_type="fetch",
            status=200,
            request_headers={"Content-Type": "application/json"}
        )
        result = log.to_dict()
        assert result["reqid"] == 1
        assert result["request_headers"] == {"Content-Type": "application/json"}

    def test_request_log_to_json(self):
        """Test converting request log to JSON string."""
        log = NetworkRequestLog(reqid=1, url="http://test", method="GET", resource_type="fetch")
        json_str = log.to_json()
        parsed = json.loads(json_str)
        assert parsed["reqid"] == 1


class TestWebSocketLog:
    """Tests for WebSocketLog dataclass."""
    
    def test_create_websocket_log(self):
        """Test creating a WebSocket log."""
        log = WebSocketLog(url="ws://localhost:8000/ws/songs/task123", state="open")
        assert log.url == "ws://localhost:8000/ws/songs/task123"
        assert log.state == "open"
        assert log.messages == []

    def test_add_message(self):
        """Test adding messages to WebSocket log."""
        log = WebSocketLog(url="ws://localhost:8000/ws/songs/task123", state="open")
        log.add_message("received", {"status": "processing", "progress": 50})
        log.add_message("sent", {"type": "ping"})
        assert len(log.messages) == 2
        assert log.messages[0]["direction"] == "received"


class TestNetworkTimingMetrics:
    """Tests for NetworkTimingMetrics dataclass."""
    
    def test_create_timing_metrics(self):
        """Test creating timing metrics."""
        metrics = NetworkTimingMetrics(dns_lookup_ms=10.5, waiting_ms=150.0, total_ms=200.0)
        assert metrics.dns_lookup_ms == 10.5
        assert metrics.waiting_ms == 150.0
        assert metrics.total_ms == 200.0

    def test_timing_metrics_to_dict(self):
        """Test converting timing metrics to dictionary."""
        metrics = NetworkTimingMetrics(waiting_ms=100.0, total_ms=150.0)
        result = metrics.to_dict()
        assert result["waiting_ms"] == 100.0
        assert result["dns_lookup_ms"] is None


class TestExpectedApiCall:
    """Tests for ExpectedApiCall dataclass."""
    
    def test_matches_url_contains(self):
        """Test URL matching with contains mode."""
        expected = ExpectedApiCall(url_pattern="/api/lyrics", method="POST", match_type="contains")
        assert expected.matches_url("http://localhost:8000/api/lyrics/generate")
        assert not expected.matches_url("http://localhost:8000/api/songs")

    def test_matches_url_exact(self):
        """Test URL matching with exact mode."""
        expected = ExpectedApiCall(url_pattern="http://localhost:8000/api/lyrics/generate", method="POST", match_type="exact")
        assert expected.matches_url("http://localhost:8000/api/lyrics/generate")
        assert not expected.matches_url("http://localhost:8000/api/lyrics/generate?param=1")

    def test_matches_url_regex(self):
        """Test URL matching with regex mode."""
        expected = ExpectedApiCall(url_pattern=r"/api/songs/\w+", method="GET", match_type="regex")
        assert expected.matches_url("http://localhost:8000/api/songs/abc123")
        assert not expected.matches_url("http://localhost:8000/api/lyrics")


class TestNetworkActivityMonitor:
    """Tests for NetworkActivityMonitor class."""
    
    @pytest.fixture
    def temp_report_dir(self):
        """Create a temporary directory for test reports."""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    @pytest.fixture
    def monitor(self, temp_report_dir):
        """Create a NetworkActivityMonitor instance for testing."""
        return NetworkActivityMonitor(report_dir=temp_report_dir)

    def test_add_request_log(self, monitor):
        """Test adding a request log."""
        log = monitor.add_request_log(reqid=1, url="http://localhost:8000/api/lyrics/generate", method="POST", resource_type="fetch", status=200)
        assert len(monitor.request_logs) == 1
        assert log.reqid == 1

    def test_add_websocket_log(self, monitor):
        """Test adding a WebSocket log."""
        log = monitor.add_websocket_log(url="ws://localhost:8000/ws/songs/task123", state="open")
        assert len(monitor.websocket_logs) == 1
        assert log.state == "open"

    def test_add_expected_call(self, monitor):
        """Test adding an expected API call."""
        expected = monitor.add_expected_call(url_pattern="/api/lyrics/generate", method="POST", expected_status=200)
        assert len(monitor.expected_calls) == 1
        assert expected.expected_status == 200

    def test_add_timing_metrics(self, monitor):
        """Test adding timing metrics."""
        metrics = monitor.add_timing_metrics(reqid=1, waiting_ms=100.0, total_ms=150.0)
        assert 1 in monitor.timing_metrics
        assert metrics.total_ms == 150.0

    def test_get_requests_by_url_contains(self, monitor):
        """Test getting requests by URL with contains matching."""
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/lyrics/generate", method="POST", resource_type="fetch")
        monitor.add_request_log(reqid=2, url="http://localhost:8000/api/songs/generate", method="POST", resource_type="fetch")
        monitor.add_request_log(reqid=3, url="http://localhost:8000/api/lyrics/status", method="GET", resource_type="fetch")
        results = monitor.get_requests_by_url("/api/lyrics")
        assert len(results) == 2

    def test_get_requests_by_type(self, monitor):
        """Test getting requests by resource type."""
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/test", method="GET", resource_type="fetch")
        monitor.add_request_log(reqid=2, url="http://localhost:8000/script.js", method="GET", resource_type="script")
        results = monitor.get_requests_by_type("fetch")
        assert len(results) == 1

    def test_get_failed_requests(self, monitor):
        """Test getting failed requests."""
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/test", method="GET", resource_type="fetch", status=200)
        monitor.add_request_log(reqid=2, url="http://localhost:8000/api/error", method="GET", resource_type="fetch", status=500)
        monitor.add_request_log(reqid=3, url="http://localhost:8000/api/timeout", method="GET", resource_type="fetch", error="Timeout")
        results = monitor.get_failed_requests()
        assert len(results) == 2

    def test_get_api_requests(self, monitor):
        """Test getting API requests."""
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/lyrics", method="POST", resource_type="fetch")
        monitor.add_request_log(reqid=2, url="http://localhost:8000/index.html", method="GET", resource_type="document")
        results = monitor.get_api_requests()
        assert len(results) == 1

    def test_get_cached_requests(self, monitor):
        """Test getting cached requests."""
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/test", method="GET", resource_type="fetch", from_cache=False)
        monitor.add_request_log(reqid=2, url="http://localhost:8000/static/app.js", method="GET", resource_type="script", from_cache=True)
        results = monitor.get_cached_requests()
        assert len(results) == 1
        assert results[0].from_cache is True

    def test_verify_expected_calls_success(self, monitor):
        """Test verifying expected API calls - success case."""
        monitor.add_expected_call(url_pattern="/api/lyrics/generate", method="POST", expected_status=200)
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/lyrics/generate", method="POST", resource_type="fetch", status=200)
        all_verified, results = monitor.verify_expected_calls()
        assert all_verified is True
        assert results[0]["found"] is True

    def test_verify_expected_calls_missing(self, monitor):
        """Test verifying expected API calls - missing call."""
        monitor.add_expected_call(url_pattern="/api/lyrics/generate", method="POST", required=True)
        all_verified, results = monitor.verify_expected_calls()
        assert all_verified is False
        assert "Required API call was not made" in results[0]["issues"]

    def test_verify_expected_calls_wrong_status(self, monitor):
        """Test verifying expected API calls - wrong status code."""
        monitor.add_expected_call(url_pattern="/api/lyrics/generate", method="POST", expected_status=200)
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/lyrics/generate", method="POST", resource_type="fetch", status=500)
        all_verified, results = monitor.verify_expected_calls()
        assert all_verified is False
        assert "Expected status 200, got 500" in results[0]["issues"]

    def test_verify_request_headers(self, monitor):
        """Test verifying request headers."""
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/test", method="POST", resource_type="fetch", request_headers={"Content-Type": "application/json"})
        success, issues = monitor.verify_request_headers(1, {"Content-Type": "application/json"})
        assert success is True
        success, issues = monitor.verify_request_headers(1, {"Content-Type": "text/plain"})
        assert success is False

    def test_verify_response_structure(self, monitor):
        """Test verifying response structure."""
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/lyrics/generate", method="POST", resource_type="fetch", response_body={"lyrics": "Test lyrics", "title": "Test Song"})
        success, missing = monitor.verify_response_structure(1, ["lyrics", "title"])
        assert success is True
        success, missing = monitor.verify_response_structure(1, ["lyrics", "duration"])
        assert success is False
        assert "duration" in missing

    def test_verify_cache_headers(self, monitor):
        """Test verifying cache headers."""
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/test", method="GET", resource_type="fetch", response_headers={"cache-control": "max-age=3600"})
        result = monitor.verify_cache_headers(1)
        assert result["cacheable"] is True
        assert result["cache_duration"] == 3600

    def test_verify_websocket_connection(self, monitor):
        """Test verifying WebSocket connection."""
        monitor.add_websocket_log(url="ws://localhost:8000/ws/songs/task123", state="open")
        connected, info = monitor.verify_websocket_connection("/ws/songs/")
        assert connected is True
        assert info["state"] == "open"

    def test_verify_websocket_messages(self, monitor):
        """Test verifying WebSocket messages."""
        ws_log = monitor.add_websocket_log(url="ws://localhost:8000/ws/songs/task123", state="open")
        ws_log.add_message("received", {"status": "queued"})
        ws_log.add_message("received", {"status": "processing"})
        ws_log.add_message("received", {"status": "completed"})
        verified, result = monitor.verify_websocket_messages("/ws/songs/", expected_message_count=3, expected_message_types=["queued", "processing", "completed"])
        assert verified is True
        assert result["received_messages"] == 3

    def test_get_timing_summary(self, monitor):
        """Test getting timing summary."""
        monitor.add_timing_metrics(reqid=1, total_ms=100.0, waiting_ms=50.0)
        monitor.add_timing_metrics(reqid=2, total_ms=200.0, waiting_ms=100.0)
        monitor.add_timing_metrics(reqid=3, total_ms=150.0, waiting_ms=75.0)
        summary = monitor.get_timing_summary()
        assert summary["request_count"] == 3
        assert summary["total_time"]["min_ms"] == 100.0
        assert summary["total_time"]["max_ms"] == 200.0

    def test_clear_logs(self, monitor):
        """Test clearing all logs."""
        monitor.add_request_log(reqid=1, url="http://test", method="GET", resource_type="fetch")
        monitor.add_websocket_log(url="ws://test", state="open")
        monitor.add_expected_call(url_pattern="/api/test")
        monitor.add_timing_metrics(reqid=1, total_ms=100.0)
        monitor.clear_logs()
        assert len(monitor.request_logs) == 0
        assert len(monitor.websocket_logs) == 0
        assert len(monitor.expected_calls) == 0
        assert len(monitor.timing_metrics) == 0

    def test_save_logs(self, monitor, temp_report_dir):
        """Test saving logs to JSON file."""
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/test", method="GET", resource_type="fetch", status=200)
        output_path = monitor.save_logs("test-logs.json")
        assert Path(output_path).exists()
        with open(output_path) as f:
            data = json.load(f)
        assert data["request_count"] == 1

    def test_generate_network_report(self, monitor, temp_report_dir):
        """Test generating markdown network report."""
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/lyrics/generate", method="POST", resource_type="fetch", status=200, duration_ms=150.0)
        monitor.add_timing_metrics(reqid=1, total_ms=150.0, waiting_ms=100.0)
        output_path = monitor.generate_network_report("test-report.md")
        assert Path(output_path).exists()
        with open(output_path) as f:
            content = f.read()
        assert "Network Activity Report" in content

    def test_format_for_test_report(self, monitor):
        """Test formatting network activity for test report."""
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/lyrics/generate", method="POST", resource_type="fetch", status=200)
        formatted = monitor.format_for_test_report()
        assert "Network Activity" in formatted
        assert "Total Requests: 1" in formatted


class TestMCPIntegrationFunctions:
    """Tests for Chrome DevTools MCP integration functions."""
    
    def test_parse_network_request_from_mcp(self):
        """Test parsing network request from MCP response."""
        mcp_response = {
            "reqid": 123,
            "url": "http://localhost:8000/api/test",
            "method": "POST",
            "resourceType": "fetch",
            "status": 200,
            "statusText": "OK",
            "requestHeaders": {"Content-Type": "application/json"},
            "responseHeaders": {"Cache-Control": "no-cache"},
            "timing": {"total": 150.0},
            "fromCache": False
        }
        log = parse_network_request_from_mcp(mcp_response)
        assert log.reqid == 123
        assert log.url == "http://localhost:8000/api/test"
        assert log.method == "POST"
        assert log.status == 200
        assert log.duration_ms == 150.0

    def test_parse_network_list_from_mcp(self):
        """Test parsing list of network requests from MCP response."""
        mcp_response = [
            {"reqid": 1, "url": "http://test1", "method": "GET", "resourceType": "fetch"},
            {"reqid": 2, "url": "http://test2", "method": "POST", "resourceType": "xhr"}
        ]
        logs = parse_network_list_from_mcp(mcp_response)
        assert len(logs) == 2
        assert logs[0].reqid == 1
        assert logs[1].reqid == 2

    def test_get_network_monitoring_instructions(self):
        """Test getting network monitoring instructions."""
        instructions = get_network_monitoring_instructions()
        assert "action" in instructions
        assert instructions["action"] == "monitor_network"
        assert "tools" in instructions
        assert "steps" in instructions


class TestConvenienceFunctions:
    """Tests for convenience functions."""
    
    @pytest.fixture
    def temp_report_dir(self):
        """Create a temporary directory for test reports."""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_create_network_monitor(self, temp_report_dir):
        """Test creating a network monitor."""
        monitor = create_network_monitor(temp_report_dir)
        assert isinstance(monitor, NetworkActivityMonitor)
        assert monitor.report_dir == Path(temp_report_dir)

    def test_setup_expected_api_calls_for_user_journey(self, temp_report_dir):
        """Test setting up expected API calls for user journey."""
        monitor = create_network_monitor(temp_report_dir)
        setup_expected_api_calls_for_user_journey(monitor)
        assert len(monitor.expected_calls) == 2
        lyrics_call = next((c for c in monitor.expected_calls if "lyrics" in c.url_pattern), None)
        assert lyrics_call is not None
        assert lyrics_call.method == "POST"

    def test_setup_expected_api_calls_for_error_testing(self, temp_report_dir):
        """Test setting up expected API calls for error testing."""
        monitor = create_network_monitor(temp_report_dir)
        setup_expected_api_calls_for_error_testing(monitor, "rate_limit")
        assert monitor.expected_calls[-1].expected_status == 429
        setup_expected_api_calls_for_error_testing(monitor, "server_error")
        assert monitor.expected_calls[-1].expected_status == 500

    def test_verify_api_call_made(self, temp_report_dir):
        """Test verifying an API call was made."""
        monitor = create_network_monitor(temp_report_dir)
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/lyrics/generate", method="POST", resource_type="fetch", status=200)
        found, request = verify_api_call_made(monitor, "/api/lyrics/generate", "POST")
        assert found is True
        assert request is not None
        assert request.status == 200

    def test_get_request_payload(self, temp_report_dir):
        """Test getting request payload."""
        monitor = create_network_monitor(temp_report_dir)
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/lyrics/generate", method="POST", resource_type="fetch", request_body={"text": "Test content", "style": "pop"})
        payload = get_request_payload(monitor, "/api/lyrics/generate", "POST")
        assert payload is not None
        assert payload["text"] == "Test content"

    def test_get_response_data(self, temp_report_dir):
        """Test getting response data."""
        monitor = create_network_monitor(temp_report_dir)
        monitor.add_request_log(reqid=1, url="http://localhost:8000/api/lyrics/generate", method="POST", resource_type="fetch", response_body={"lyrics": "Generated lyrics", "title": "Test Song"})
        response = get_response_data(monitor, "/api/lyrics/generate", "POST")
        assert response is not None
        assert response["lyrics"] == "Generated lyrics"


class TestEnums:
    """Tests for enum classes."""
    
    def test_request_type_values(self):
        """Test RequestType enum values."""
        assert RequestType.FETCH.value == "fetch"
        assert RequestType.XHR.value == "xhr"
        assert RequestType.WEBSOCKET.value == "websocket"

    def test_websocket_state_values(self):
        """Test WebSocketState enum values."""
        assert WebSocketState.CONNECTING.value == "connecting"
        assert WebSocketState.OPEN.value == "open"
        assert WebSocketState.CLOSED.value == "closed"
