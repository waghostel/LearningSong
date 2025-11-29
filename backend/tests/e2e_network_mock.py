"""
Network interception and mocking system for E2E Chrome DevTools testing.

This module provides functionality to intercept and mock network requests
during E2E testing using Chrome DevTools MCP capabilities.

Requirements covered:
- 1.4: Mock API responses for lyrics generation
- 1.5: Mock error responses for error handling
- 2.6: Mock song generation responses
- 2.7: Mock WebSocket status updates
- 6.1, 6.2, 6.3, 6.4: Mock error responses (rate limit, server error, timeout, validation)
"""

import json
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum

from tests.e2e_mock_data import (
    MOCK_LYRICS_SUCCESS,
    MOCK_LYRICS_WITH_SEARCH,
    MOCK_SONG_GENERATION_QUEUED,
    MOCK_SONG_GENERATION_COMPLETED,
    MOCK_WEBSOCKET_SEQUENCE_SUCCESS,
    MOCK_ERROR_RATE_LIMIT,
    MOCK_ERROR_SERVER_ERROR,
    MOCK_ERROR_TIMEOUT,
    MOCK_ERROR_VALIDATION_LYRICS_TOO_LONG,
    MOCK_SONG_DATA_POP,
    get_mock_error_by_type,
    get_websocket_sequence_by_type
)


class MockStrategy(Enum):
    """Strategy for implementing network mocking."""
    JAVASCRIPT_INJECTION = "javascript_injection"
    NETWORK_INTERCEPTION = "network_interception"  # Future: if CDP supports it
    SERVICE_WORKER = "service_worker"  # Future: alternative approach


@dataclass
class RequestPattern:
    """Pattern for matching network requests."""
    url_pattern: str  # Regex pattern or exact URL
    method: str = "GET"  # HTTP method
    match_type: str = "contains"  # "contains", "exact", "regex"
    
    def matches(self, url: str, method: str) -> bool:
        """
        Check if a request matches this pattern.
        
        Args:
            url: Request URL
            method: HTTP method
            
        Returns:
            True if request matches pattern
        """
        if method.upper() != self.method.upper():
            return False
        
        if self.match_type == "exact":
            return url == self.url_pattern
        elif self.match_type == "contains":
            return self.url_pattern in url
        elif self.match_type == "regex":
            import re
            return bool(re.search(self.url_pattern, url))
        
        return False


@dataclass
class MockResponse:
    """Mock response configuration."""
    status: int
    body: Any
    headers: Dict[str, str] = field(default_factory=dict)
    delay_ms: int = 0  # Simulated network delay
    
    def to_json(self) -> str:
        """Convert response to JSON string."""
        return json.dumps({
            "status": self.status,
            "body": self.body,
            "headers": self.headers
        })


@dataclass
class MockRule:
    """Rule for mocking a specific request pattern."""
    pattern: RequestPattern
    response: MockResponse
    enabled: bool = True
    hit_count: int = 0
    
    def matches(self, url: str, method: str) -> bool:
        """Check if request matches this rule."""
        return self.enabled and self.pattern.matches(url, method)
    
    def get_response(self) -> MockResponse:
        """Get the mock response and increment hit count."""
        self.hit_count += 1
        return self.response


class NetworkMockManager:
    """
    Manager for network interception and mocking.
    
    This class provides a high-level interface for setting up network mocks
    during E2E testing with Chrome DevTools MCP.
    """
    
    def __init__(self, strategy: MockStrategy = MockStrategy.JAVASCRIPT_INJECTION):
        """
        Initialize the network mock manager.
        
        Args:
            strategy: Mocking strategy to use
        """
        self.strategy = strategy
        self.rules: List[MockRule] = []
        self.injected = False
        
    def add_rule(
        self,
        url_pattern: str,
        response: MockResponse,
        method: str = "GET",
        match_type: str = "contains"
    ) -> MockRule:
        """
        Add a mock rule for a specific request pattern.
        
        Args:
            url_pattern: URL pattern to match
            response: Mock response to return
            method: HTTP method to match
            match_type: Type of URL matching ("contains", "exact", "regex")
            
        Returns:
            The created MockRule
        """
        pattern = RequestPattern(url_pattern, method, match_type)
        rule = MockRule(pattern, response)
        self.rules.append(rule)
        return rule
    
    def add_lyrics_generation_mock(
        self,
        response_type: str = "success",
        with_search: bool = False
    ) -> MockRule:
        """
        Add mock for lyrics generation API endpoint.
        
        Args:
            response_type: Type of response ("success", "error")
            with_search: Whether to use search-enriched lyrics
            
        Returns:
            The created MockRule
        """
        if response_type == "success":
            body = MOCK_LYRICS_WITH_SEARCH if with_search else MOCK_LYRICS_SUCCESS
            response = MockResponse(status=200, body=body)
        else:
            # Default to server error
            response = MockResponse(
                status=MOCK_ERROR_SERVER_ERROR["status"],
                body={"detail": MOCK_ERROR_SERVER_ERROR["detail"]}
            )
        
        return self.add_rule(
            url_pattern="/api/lyrics/generate",
            response=response,
            method="POST"
        )
    
    def add_song_generation_mock(
        self,
        response_type: str = "queued"
    ) -> MockRule:
        """
        Add mock for song generation API endpoint.
        
        Args:
            response_type: Type of response ("queued", "completed", "error")
            
        Returns:
            The created MockRule
        """
        if response_type == "queued":
            body = MOCK_SONG_GENERATION_QUEUED
            status = 200
        elif response_type == "completed":
            body = MOCK_SONG_GENERATION_COMPLETED
            status = 200
        else:
            body = {"detail": MOCK_ERROR_SERVER_ERROR["detail"]}
            status = 500
        
        response = MockResponse(status=status, body=body)
        
        return self.add_rule(
            url_pattern="/api/songs/generate",
            response=response,
            method="POST"
        )
    
    def add_error_mock(
        self,
        endpoint: str,
        error_type: str,
        method: str = "POST"
    ) -> MockRule:
        """
        Add mock for error responses.
        
        Args:
            endpoint: API endpoint to mock
            error_type: Type of error (rate_limit, server_error, timeout, validation)
            method: HTTP method
            
        Returns:
            The created MockRule
        """
        error_data = get_mock_error_by_type(error_type)
        response = MockResponse(
            status=error_data["status"],
            body={"detail": error_data["detail"]}
        )
        
        return self.add_rule(
            url_pattern=endpoint,
            response=response,
            method=method
        )
    
    def clear_rules(self) -> None:
        """Clear all mock rules."""
        self.rules.clear()
        self.injected = False
    
    def disable_rule(self, url_pattern: str) -> None:
        """
        Disable a specific mock rule.
        
        Args:
            url_pattern: URL pattern of the rule to disable
        """
        for rule in self.rules:
            if rule.pattern.url_pattern == url_pattern:
                rule.enabled = False
    
    def enable_rule(self, url_pattern: str) -> None:
        """
        Enable a specific mock rule.
        
        Args:
            url_pattern: URL pattern of the rule to enable
        """
        for rule in self.rules:
            if rule.pattern.url_pattern == url_pattern:
                rule.enabled = True
    
    def get_rule_stats(self) -> List[Dict[str, Any]]:
        """
        Get statistics about mock rule usage.
        
        Returns:
            List of rule statistics
        """
        return [
            {
                "url_pattern": rule.pattern.url_pattern,
                "method": rule.pattern.method,
                "enabled": rule.enabled,
                "hit_count": rule.hit_count
            }
            for rule in self.rules
        ]
    
    def generate_injection_script(self) -> str:
        """
        Generate JavaScript code to inject for network mocking.
        
        This creates a script that intercepts fetch and XMLHttpRequest
        to return mock responses based on configured rules.
        
        Returns:
            JavaScript code as string
        """
        # Convert rules to JSON for injection
        rules_json = json.dumps([
            {
                "url_pattern": rule.pattern.url_pattern,
                "method": rule.pattern.method,
                "match_type": rule.pattern.match_type,
                "response": {
                    "status": rule.response.status,
                    "body": rule.response.body,
                    "headers": rule.response.headers,
                    "delay_ms": rule.response.delay_ms
                }
            }
            for rule in self.rules if rule.enabled
        ])
        
        script = f"""
        (function() {{
            // Store original fetch and XMLHttpRequest
            const originalFetch = window.fetch;
            const originalXHR = window.XMLHttpRequest;
            
            // Mock rules configuration
            const mockRules = {rules_json};
            
            // Helper function to check if URL matches pattern
            function matchesPattern(url, pattern, matchType) {{
                if (matchType === 'exact') {{
                    return url === pattern;
                }} else if (matchType === 'contains') {{
                    return url.includes(pattern);
                }} else if (matchType === 'regex') {{
                    return new RegExp(pattern).test(url);
                }}
                return false;
            }}
            
            // Helper function to find matching rule
            function findMatchingRule(url, method) {{
                return mockRules.find(rule => 
                    rule.method.toUpperCase() === method.toUpperCase() &&
                    matchesPattern(url, rule.url_pattern, rule.match_type)
                );
            }}
            
            // Override fetch
            window.fetch = function(url, options = {{}}) {{
                const method = (options.method || 'GET').toUpperCase();
                const rule = findMatchingRule(url, method);
                
                if (rule) {{
                    console.log('[MOCK] Intercepted fetch:', method, url);
                    
                    // Simulate network delay if specified
                    const delay = rule.response.delay_ms || 0;
                    
                    return new Promise((resolve) => {{
                        setTimeout(() => {{
                            const response = new Response(
                                JSON.stringify(rule.response.body),
                                {{
                                    status: rule.response.status,
                                    statusText: rule.response.status === 200 ? 'OK' : 'Error',
                                    headers: new Headers({{
                                        'Content-Type': 'application/json',
                                        ...rule.response.headers
                                    }})
                                }}
                            );
                            resolve(response);
                        }}, delay);
                    }});
                }}
                
                // If no rule matches, use original fetch
                return originalFetch.apply(this, arguments);
            }};
            
            // Override XMLHttpRequest
            window.XMLHttpRequest = function() {{
                const xhr = new originalXHR();
                const originalOpen = xhr.open;
                const originalSend = xhr.send;
                
                let requestMethod = '';
                let requestUrl = '';
                
                xhr.open = function(method, url) {{
                    requestMethod = method;
                    requestUrl = url;
                    return originalOpen.apply(this, arguments);
                }};
                
                xhr.send = function() {{
                    const rule = findMatchingRule(requestUrl, requestMethod);
                    
                    if (rule) {{
                        console.log('[MOCK] Intercepted XHR:', requestMethod, requestUrl);
                        
                        // Simulate network delay
                        const delay = rule.response.delay_ms || 0;
                        
                        setTimeout(() => {{
                            // Set response properties
                            Object.defineProperty(xhr, 'status', {{ value: rule.response.status }});
                            Object.defineProperty(xhr, 'statusText', {{ 
                                value: rule.response.status === 200 ? 'OK' : 'Error' 
                            }});
                            Object.defineProperty(xhr, 'responseText', {{ 
                                value: JSON.stringify(rule.response.body) 
                            }});
                            Object.defineProperty(xhr, 'response', {{ 
                                value: JSON.stringify(rule.response.body) 
                            }});
                            Object.defineProperty(xhr, 'readyState', {{ value: 4 }});
                            
                            // Trigger events
                            if (xhr.onreadystatechange) {{
                                xhr.onreadystatechange();
                            }}
                            if (xhr.onload) {{
                                xhr.onload();
                            }}
                        }}, delay);
                        
                        return;
                    }}
                    
                    // If no rule matches, use original send
                    return originalSend.apply(this, arguments);
                }};
                
                return xhr;
            }};
            
            // Mark as injected
            window.__networkMockInjected = true;
            console.log('[MOCK] Network mocking initialized with', mockRules.length, 'rules');
        }})();
        """
        
        return script
    
    def get_injection_instructions(self) -> Dict[str, Any]:
        """
        Get instructions for injecting network mocks via Chrome DevTools MCP.
        
        Returns:
            Dictionary with injection instructions
        """
        script = self.generate_injection_script()
        
        return {
            "action": "inject_network_mocks",
            "strategy": self.strategy.value,
            "script": script,
            "rules_count": len([r for r in self.rules if r.enabled]),
            "instructions": (
                "Use Chrome DevTools MCP to inject network mocking script. "
                "Call mcp_chrome_devtools_evaluate_script with the provided script. "
                "This will intercept fetch and XMLHttpRequest calls to return mock responses."
            ),
            "steps": [
                "1. Ensure you're connected to the browser and have selected a page",
                "2. Call mcp_chrome_devtools_evaluate_script(function=script)",
                "3. Verify injection by checking window.__networkMockInjected === true",
                "4. Navigate to the application page to start testing with mocks"
            ],
            "verification_script": """
                () => {
                    return window.__networkMockInjected === true;
                }
            """
        }
    
    def get_websocket_mock_script(
        self,
        sequence_type: str = "success"
    ) -> str:
        """
        Generate JavaScript code to mock WebSocket connections.
        
        Args:
            sequence_type: Type of WebSocket sequence ("success", "failed", "slow")
            
        Returns:
            JavaScript code as string
        """
        sequence = get_websocket_sequence_by_type(sequence_type)
        sequence_json = json.dumps(sequence)
        
        script = f"""
        (function() {{
            const originalWebSocket = window.WebSocket;
            const mockSequence = {sequence_json};
            let sequenceIndex = 0;
            
            window.WebSocket = function(url, protocols) {{
                console.log('[MOCK] WebSocket connection intercepted:', url);
                
                // Create a mock WebSocket object
                const mockWS = {{
                    url: url,
                    readyState: 0, // CONNECTING
                    onopen: null,
                    onmessage: null,
                    onerror: null,
                    onclose: null,
                    send: function(data) {{
                        console.log('[MOCK] WebSocket send:', data);
                    }},
                    close: function() {{
                        console.log('[MOCK] WebSocket close');
                        this.readyState = 3; // CLOSED
                        if (this.onclose) {{
                            this.onclose({{ code: 1000, reason: 'Normal closure' }});
                        }}
                    }}
                }};
                
                // Simulate connection opening
                setTimeout(() => {{
                    mockWS.readyState = 1; // OPEN
                    if (mockWS.onopen) {{
                        mockWS.onopen({{ target: mockWS }});
                    }}
                    
                    // Start sending mock messages
                    sendNextMessage();
                }}, 100);
                
                function sendNextMessage() {{
                    if (sequenceIndex >= mockSequence.length) {{
                        return;
                    }}
                    
                    const message = mockSequence[sequenceIndex];
                    sequenceIndex++;
                    
                    setTimeout(() => {{
                        if (mockWS.onmessage && mockWS.readyState === 1) {{
                            mockWS.onmessage({{
                                data: JSON.stringify(message),
                                target: mockWS
                            }});
                        }}
                        
                        // Continue with next message if not completed or failed
                        if (message.status === 'processing') {{
                            sendNextMessage();
                        }}
                    }}, 1000); // 1 second between messages
                }}
                
                return mockWS;
            }};
            
            // Copy constants
            window.WebSocket.CONNECTING = 0;
            window.WebSocket.OPEN = 1;
            window.WebSocket.CLOSING = 2;
            window.WebSocket.CLOSED = 3;
            
            window.__websocketMockInjected = true;
            console.log('[MOCK] WebSocket mocking initialized with', mockSequence.length, 'messages');
        }})();
        """
        
        return script
    
    def get_websocket_injection_instructions(
        self,
        sequence_type: str = "success"
    ) -> Dict[str, Any]:
        """
        Get instructions for injecting WebSocket mocks.
        
        Args:
            sequence_type: Type of WebSocket sequence ("success", "failed", "slow")
            
        Returns:
            Dictionary with injection instructions
        """
        script = self.get_websocket_mock_script(sequence_type)
        
        return {
            "action": "inject_websocket_mocks",
            "sequence_type": sequence_type,
            "script": script,
            "instructions": (
                "Use Chrome DevTools MCP to inject WebSocket mocking script. "
                "Call mcp_chrome_devtools_evaluate_script with the provided script. "
                "This will intercept WebSocket connections and simulate status updates."
            ),
            "steps": [
                "1. Ensure you're connected to the browser and have selected a page",
                "2. Call mcp_chrome_devtools_evaluate_script(function=script)",
                "3. Verify injection by checking window.__websocketMockInjected === true",
                "4. WebSocket connections will now use mock data"
            ],
            "verification_script": """
                () => {
                    return window.__websocketMockInjected === true;
                }
            """
        }


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def create_mock_manager(strategy: MockStrategy = MockStrategy.JAVASCRIPT_INJECTION) -> NetworkMockManager:
    """
    Create a network mock manager instance.
    
    Args:
        strategy: Mocking strategy to use
        
    Returns:
        NetworkMockManager instance
    """
    return NetworkMockManager(strategy)


def setup_happy_path_mocks() -> NetworkMockManager:
    """
    Set up mocks for the happy path scenario (successful user journey).
    
    Returns:
        Configured NetworkMockManager
    """
    manager = NetworkMockManager()
    
    # Mock lyrics generation
    manager.add_lyrics_generation_mock(response_type="success", with_search=False)
    
    # Mock song generation
    manager.add_song_generation_mock(response_type="queued")
    
    return manager


def setup_error_scenario_mocks(error_type: str) -> NetworkMockManager:
    """
    Set up mocks for error scenario testing.
    
    Args:
        error_type: Type of error to simulate (rate_limit, server_error, timeout, validation)
        
    Returns:
        Configured NetworkMockManager
    """
    manager = NetworkMockManager()
    
    # Mock error on lyrics generation
    manager.add_error_mock(
        endpoint="/api/lyrics/generate",
        error_type=error_type,
        method="POST"
    )
    
    return manager


def setup_validation_error_mocks() -> NetworkMockManager:
    """
    Set up mocks for validation error testing.
    
    Returns:
        Configured NetworkMockManager
    """
    manager = NetworkMockManager()
    
    # Mock validation error on song generation
    manager.add_error_mock(
        endpoint="/api/songs/generate",
        error_type="validation_lyrics_too_long",
        method="POST"
    )
    
    return manager


def inject_network_mocks(manager: NetworkMockManager) -> Dict[str, Any]:
    """
    Get instructions for injecting network mocks.
    
    Args:
        manager: Configured NetworkMockManager
        
    Returns:
        Dictionary with injection instructions
    """
    return manager.get_injection_instructions()


def inject_websocket_mocks(sequence_type: str = "success") -> Dict[str, Any]:
    """
    Get instructions for injecting WebSocket mocks.
    
    Args:
        sequence_type: Type of WebSocket sequence ("success", "failed", "slow")
        
    Returns:
        Dictionary with injection instructions
    """
    manager = NetworkMockManager()
    return manager.get_websocket_injection_instructions(sequence_type)


def verify_mocks_injected() -> str:
    """
    Get verification script to check if mocks are injected.
    
    Returns:
        JavaScript verification script
    """
    return """
        () => {
            return {
                networkMockInjected: window.__networkMockInjected === true,
                websocketMockInjected: window.__websocketMockInjected === true
            };
        }
    """
