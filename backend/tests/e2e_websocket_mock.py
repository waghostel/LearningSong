"""
Enhanced WebSocket mocking strategy for E2E Chrome DevTools testing.

This module provides advanced WebSocket mocking capabilities including:
- Connection lifecycle simulation (connecting, open, closing, closed)
- Message injection with configurable timing
- Connection failure and reconnection simulation
- Multiple WebSocket connection support
- Event-based message triggering

Requirements covered:
- 2.7: Mock WebSocket status updates
- 4.1: Mock WebSocket connection establishment
- 4.2: Mock real-time status updates
- 4.3: Mock WebSocket connection failure
- 4.4: Mock WebSocket reconnection
- 4.5: Mock automatic navigation on completion
"""

import json
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum

from tests.e2e_mock_data import (
    MOCK_WEBSOCKET_SEQUENCE_SUCCESS,
    MOCK_WEBSOCKET_SEQUENCE_FAILED,
    MOCK_WEBSOCKET_SEQUENCE_SLOW,
    get_websocket_sequence_by_type
)


class WebSocketState(Enum):
    """WebSocket connection states."""
    CONNECTING = 0
    OPEN = 1
    CLOSING = 2
    CLOSED = 3


class ConnectionBehavior(Enum):
    """WebSocket connection behavior types."""
    NORMAL = "normal"  # Normal connection and message flow
    DELAYED_OPEN = "delayed_open"  # Slow connection establishment
    IMMEDIATE_CLOSE = "immediate_close"  # Connection closes immediately
    INTERMITTENT_FAILURE = "intermittent_failure"  # Connection drops and reconnects
    PERMANENT_FAILURE = "permanent_failure"  # Connection fails permanently


@dataclass
class WebSocketMessage:
    """Represents a WebSocket message to be sent."""
    data: Any
    delay_ms: int = 1000  # Delay before sending this message
    trigger_event: Optional[str] = None  # Optional event that triggers this message
    
    def to_json(self) -> str:
        """Convert message data to JSON string."""
        return json.dumps(self.data)


@dataclass
class WebSocketConnectionConfig:
    """Configuration for a WebSocket connection mock."""
    url_pattern: str  # URL pattern to match (can be regex)
    messages: List[WebSocketMessage] = field(default_factory=list)
    behavior: ConnectionBehavior = ConnectionBehavior.NORMAL
    connection_delay_ms: int = 100  # Delay before connection opens
    auto_reconnect: bool = False  # Whether to auto-reconnect on failure
    reconnect_delay_ms: int = 2000  # Delay before reconnection attempt
    max_reconnect_attempts: int = 3  # Maximum reconnection attempts
    
    def add_message(
        self,
        data: Any,
        delay_ms: int = 1000,
        trigger_event: Optional[str] = None
    ) -> None:
        """Add a message to the sequence."""
        self.messages.append(WebSocketMessage(data, delay_ms, trigger_event))


class WebSocketMockManager:
    """
    Manager for WebSocket mocking in E2E tests.
    
    This class provides advanced WebSocket mocking capabilities including
    connection lifecycle simulation, message injection, and failure scenarios.
    """
    
    def __init__(self):
        """Initialize the WebSocket mock manager."""
        self.connections: List[WebSocketConnectionConfig] = []
        self.injected = False
    
    def add_connection(
        self,
        url_pattern: str,
        messages: Optional[List[Dict[str, Any]]] = None,
        behavior: ConnectionBehavior = ConnectionBehavior.NORMAL,
        connection_delay_ms: int = 100
    ) -> WebSocketConnectionConfig:
        """
        Add a WebSocket connection configuration.
        
        Args:
            url_pattern: URL pattern to match
            messages: List of message data to send
            behavior: Connection behavior type
            connection_delay_ms: Delay before connection opens
            
        Returns:
            The created WebSocketConnectionConfig
        """
        config = WebSocketConnectionConfig(
            url_pattern=url_pattern,
            behavior=behavior,
            connection_delay_ms=connection_delay_ms
        )
        
        if messages:
            for msg_data in messages:
                config.add_message(msg_data)
        
        self.connections.append(config)
        return config
    
    def add_song_generation_websocket(
        self,
        sequence_type: str = "success",
        behavior: ConnectionBehavior = ConnectionBehavior.NORMAL
    ) -> WebSocketConnectionConfig:
        """
        Add WebSocket mock for song generation status updates.
        
        Args:
            sequence_type: Type of sequence ("success", "failed", "slow")
            behavior: Connection behavior type
            
        Returns:
            The created WebSocketConnectionConfig
        """
        sequence = get_websocket_sequence_by_type(sequence_type)
        
        config = self.add_connection(
            url_pattern="/ws",  # Match WebSocket endpoint
            behavior=behavior
        )
        
        # Add messages from sequence
        for msg_data in sequence:
            # Determine delay based on status
            delay = 1000  # Default 1 second
            if sequence_type == "slow":
                delay = 1500  # Slower updates
            
            config.add_message(msg_data, delay_ms=delay)
        
        return config
    
    def add_connection_failure_scenario(
        self,
        url_pattern: str,
        failure_after_messages: int = 2
    ) -> WebSocketConnectionConfig:
        """
        Add WebSocket connection that fails after sending some messages.
        
        Args:
            url_pattern: URL pattern to match
            failure_after_messages: Number of messages before failure
            
        Returns:
            The created WebSocketConnectionConfig
        """
        sequence = get_websocket_sequence_by_type("failed")
        
        config = self.add_connection(
            url_pattern=url_pattern,
            behavior=ConnectionBehavior.INTERMITTENT_FAILURE
        )
        
        # Add messages up to failure point
        for i, msg_data in enumerate(sequence[:failure_after_messages + 1]):
            config.add_message(msg_data, delay_ms=1000)
        
        return config
    
    def add_reconnection_scenario(
        self,
        url_pattern: str,
        max_attempts: int = 3
    ) -> WebSocketConnectionConfig:
        """
        Add WebSocket connection with reconnection behavior.
        
        Args:
            url_pattern: URL pattern to match
            max_attempts: Maximum reconnection attempts
            
        Returns:
            The created WebSocketConnectionConfig
        """
        sequence = get_websocket_sequence_by_type("success")
        
        config = self.add_connection(
            url_pattern=url_pattern,
            behavior=ConnectionBehavior.INTERMITTENT_FAILURE
        )
        
        config.auto_reconnect = True
        config.max_reconnect_attempts = max_attempts
        config.reconnect_delay_ms = 2000
        
        # Add messages
        for msg_data in sequence:
            config.add_message(msg_data, delay_ms=1000)
        
        return config
    
    def clear_connections(self) -> None:
        """Clear all WebSocket connection configurations."""
        self.connections.clear()
        self.injected = False
    
    def generate_injection_script(self) -> str:
        """
        Generate JavaScript code to inject WebSocket mocking.
        
        Returns:
            JavaScript code as string
        """
        # Convert connections to JSON
        connections_json = json.dumps([
            {
                "url_pattern": conn.url_pattern,
                "messages": [
                    {
                        "data": msg.data,
                        "delay_ms": msg.delay_ms,
                        "trigger_event": msg.trigger_event
                    }
                    for msg in conn.messages
                ],
                "behavior": conn.behavior.value,
                "connection_delay_ms": conn.connection_delay_ms,
                "auto_reconnect": conn.auto_reconnect,
                "reconnect_delay_ms": conn.reconnect_delay_ms,
                "max_reconnect_attempts": conn.max_reconnect_attempts
            }
            for conn in self.connections
        ])
        
        script = f"""
        (function() {{
            // Store original WebSocket
            const originalWebSocket = window.WebSocket;
            
            // WebSocket connection configurations
            const connectionConfigs = {connections_json};
            
            // Track active mock connections
            const activeMockConnections = new Map();
            
            // Helper function to match URL pattern
            function matchesPattern(url, pattern) {{
                // Simple contains match for now
                return url.includes(pattern);
            }}
            
            // Helper function to find matching config
            function findMatchingConfig(url) {{
                return connectionConfigs.find(config => matchesPattern(url, config.url_pattern));
            }}
            
            // Create mock WebSocket class
            window.WebSocket = function(url, protocols) {{
                const config = findMatchingConfig(url);
                
                if (!config) {{
                    // No mock config, use original WebSocket
                    console.log('[MOCK] No WebSocket mock for:', url);
                    return new originalWebSocket(url, protocols);
                }}
                
                console.log('[MOCK] WebSocket connection intercepted:', url);
                console.log('[MOCK] Behavior:', config.behavior);
                
                // Create mock WebSocket object
                const mockWS = {{
                    url: url,
                    readyState: 0, // CONNECTING
                    protocol: '',
                    extensions: '',
                    bufferedAmount: 0,
                    binaryType: 'blob',
                    
                    // Event handlers
                    onopen: null,
                    onmessage: null,
                    onerror: null,
                    onclose: null,
                    
                    // Methods
                    send: function(data) {{
                        console.log('[MOCK] WebSocket send:', data);
                        
                        // Handle send based on behavior
                        if (this.readyState !== 1) {{
                            console.warn('[MOCK] WebSocket not open, cannot send');
                            return;
                        }}
                        
                        // Could trigger events based on sent data
                        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                        console.log('[MOCK] Parsed send data:', parsedData);
                    }},
                    
                    close: function(code, reason) {{
                        console.log('[MOCK] WebSocket close requested:', code, reason);
                        
                        if (this.readyState === 2 || this.readyState === 3) {{
                            return; // Already closing or closed
                        }}
                        
                        this.readyState = 2; // CLOSING
                        
                        setTimeout(() => {{
                            this.readyState = 3; // CLOSED
                            if (this.onclose) {{
                                this.onclose({{
                                    code: code || 1000,
                                    reason: reason || 'Normal closure',
                                    wasClean: true,
                                    target: this
                                }});
                            }}
                        }}, 10);
                    }},
                    
                    // EventTarget methods
                    addEventListener: function(type, listener) {{
                        const eventName = 'on' + type;
                        if (this[eventName] === null) {{
                            this[eventName] = listener;
                        }}
                    }},
                    
                    removeEventListener: function(type, listener) {{
                        const eventName = 'on' + type;
                        if (this[eventName] === listener) {{
                            this[eventName] = null;
                        }}
                    }},
                    
                    dispatchEvent: function(event) {{
                        const handler = this['on' + event.type];
                        if (handler) {{
                            handler.call(this, event);
                        }}
                        return true;
                    }}
                }};
                
                // Store mock connection
                activeMockConnections.set(url, mockWS);
                
                // Handle different behaviors
                if (config.behavior === 'immediate_close') {{
                    // Connection closes immediately
                    setTimeout(() => {{
                        mockWS.readyState = 3; // CLOSED
                        if (mockWS.onerror) {{
                            mockWS.onerror({{
                                type: 'error',
                                message: 'Connection failed',
                                target: mockWS
                            }});
                        }}
                        if (mockWS.onclose) {{
                            mockWS.onclose({{
                                code: 1006,
                                reason: 'Connection failed',
                                wasClean: false,
                                target: mockWS
                            }});
                        }}
                    }}, 10);
                    
                    return mockWS;
                }}
                
                if (config.behavior === 'permanent_failure') {{
                    // Connection never opens
                    setTimeout(() => {{
                        if (mockWS.onerror) {{
                            mockWS.onerror({{
                                type: 'error',
                                message: 'Connection refused',
                                target: mockWS
                            }});
                        }}
                        mockWS.readyState = 3; // CLOSED
                        if (mockWS.onclose) {{
                            mockWS.onclose({{
                                code: 1006,
                                reason: 'Connection refused',
                                wasClean: false,
                                target: mockWS
                            }});
                        }}
                    }}, config.connection_delay_ms);
                    
                    return mockWS;
                }}
                
                // Normal or delayed connection opening
                let connectionDelay = config.connection_delay_ms;
                if (config.behavior === 'delayed_open') {{
                    connectionDelay = 3000; // 3 second delay
                }}
                
                setTimeout(() => {{
                    mockWS.readyState = 1; // OPEN
                    console.log('[MOCK] WebSocket connection opened');
                    
                    if (mockWS.onopen) {{
                        mockWS.onopen({{
                            type: 'open',
                            target: mockWS
                        }});
                    }}
                    
                    // Start sending messages
                    sendMessages(mockWS, config, 0);
                }}, connectionDelay);
                
                // Handle intermittent failure
                if (config.behavior === 'intermittent_failure') {{
                    // Simulate connection drop after some messages
                    const failureDelay = config.connection_delay_ms + (config.messages.length / 2) * 1000;
                    
                    setTimeout(() => {{
                        if (mockWS.readyState === 1) {{
                            console.log('[MOCK] WebSocket connection dropped');
                            mockWS.readyState = 3; // CLOSED
                            
                            if (mockWS.onclose) {{
                                mockWS.onclose({{
                                    code: 1006,
                                    reason: 'Connection lost',
                                    wasClean: false,
                                    target: mockWS
                                }});
                            }}
                            
                            // Handle reconnection
                            if (config.auto_reconnect) {{
                                handleReconnection(url, protocols, config, 1);
                            }}
                        }}
                    }}, failureDelay);
                }}
                
                return mockWS;
            }};
            
            // Function to send messages
            function sendMessages(mockWS, config, index) {{
                if (index >= config.messages.length) {{
                    console.log('[MOCK] All messages sent');
                    return;
                }}
                
                if (mockWS.readyState !== 1) {{
                    console.log('[MOCK] WebSocket not open, stopping message sequence');
                    return;
                }}
                
                const message = config.messages[index];
                
                setTimeout(() => {{
                    if (mockWS.readyState === 1 && mockWS.onmessage) {{
                        console.log('[MOCK] Sending message:', message.data);
                        
                        mockWS.onmessage({{
                            type: 'message',
                            data: JSON.stringify(message.data),
                            origin: mockWS.url,
                            target: mockWS
                        }});
                        
                        // Continue with next message if status is processing
                        if (message.data.status === 'processing') {{
                            sendMessages(mockWS, config, index + 1);
                        }} else if (message.data.status === 'completed') {{
                            console.log('[MOCK] Generation completed');
                            // Could trigger navigation here if needed
                        }} else if (message.data.status === 'failed') {{
                            console.log('[MOCK] Generation failed');
                        }}
                    }}
                }}, message.delay_ms);
            }}
            
            // Function to handle reconnection
            function handleReconnection(url, protocols, config, attempt) {{
                if (attempt > config.max_reconnect_attempts) {{
                    console.log('[MOCK] Max reconnection attempts reached');
                    return;
                }}
                
                console.log('[MOCK] Attempting reconnection (attempt', attempt, ')');
                
                setTimeout(() => {{
                    // Create new connection
                    const newWS = new window.WebSocket(url, protocols);
                    console.log('[MOCK] Reconnection attempt', attempt, 'initiated');
                }}, config.reconnect_delay_ms);
            }}
            
            // Copy WebSocket constants
            window.WebSocket.CONNECTING = 0;
            window.WebSocket.OPEN = 1;
            window.WebSocket.CLOSING = 2;
            window.WebSocket.CLOSED = 3;
            
            // Mark as injected
            window.__websocketMockInjected = true;
            window.__websocketMockConnections = activeMockConnections;
            
            console.log('[MOCK] WebSocket mocking initialized with', connectionConfigs.length, 'configurations');
        }})();
        """
        
        return script
    
    def get_injection_instructions(self) -> Dict[str, Any]:
        """
        Get instructions for injecting WebSocket mocks via Chrome DevTools MCP.
        
        Returns:
            Dictionary with injection instructions
        """
        script = self.generate_injection_script()
        
        return {
            "action": "inject_websocket_mocks",
            "script": script,
            "connections_count": len(self.connections),
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
                    return {
                        injected: window.__websocketMockInjected === true,
                        activeConnections: window.__websocketMockConnections ? 
                            window.__websocketMockConnections.size : 0
                    };
                }
            """
        }
    
    def simulate_connection_failure(self) -> str:
        """
        Generate script to simulate WebSocket connection failure.
        
        Returns:
            JavaScript code to trigger failure
        """
        return """
            () => {
                if (window.__websocketMockConnections) {
                    window.__websocketMockConnections.forEach((ws, url) => {
                        if (ws.readyState === 1) {
                            console.log('[MOCK] Simulating connection failure for:', url);
                            ws.readyState = 3;
                            if (ws.onclose) {
                                ws.onclose({
                                    code: 1006,
                                    reason: 'Simulated failure',
                                    wasClean: false,
                                    target: ws
                                });
                            }
                        }
                    });
                    return { success: true, message: 'Connection failures simulated' };
                }
                return { success: false, message: 'No active connections' };
            }
        """
    
    def simulate_reconnection(self) -> str:
        """
        Generate script to simulate WebSocket reconnection.
        
        Returns:
            JavaScript code to trigger reconnection
        """
        return """
            () => {
                if (window.__websocketMockConnections) {
                    window.__websocketMockConnections.forEach((ws, url) => {
                        if (ws.readyState === 3) {
                            console.log('[MOCK] Simulating reconnection for:', url);
                            // Trigger reconnection logic
                            setTimeout(() => {
                                ws.readyState = 1;
                                if (ws.onopen) {
                                    ws.onopen({
                                        type: 'open',
                                        target: ws
                                    });
                                }
                            }, 1000);
                        }
                    });
                    return { success: true, message: 'Reconnections simulated' };
                }
                return { success: false, message: 'No closed connections' };
            }
        """


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def create_websocket_manager() -> WebSocketMockManager:
    """
    Create a WebSocket mock manager instance.
    
    Returns:
        WebSocketMockManager instance
    """
    return WebSocketMockManager()


def setup_song_generation_websocket(
    sequence_type: str = "success",
    behavior: ConnectionBehavior = ConnectionBehavior.NORMAL
) -> WebSocketMockManager:
    """
    Setup WebSocket mock for song generation.
    
    Args:
        sequence_type: Type of sequence ("success", "failed", "slow")
        behavior: Connection behavior type
        
    Returns:
        Configured WebSocketMockManager
    """
    manager = WebSocketMockManager()
    manager.add_song_generation_websocket(sequence_type, behavior)
    return manager


def setup_connection_failure_scenario() -> WebSocketMockManager:
    """
    Setup WebSocket mock with connection failure.
    
    Returns:
        Configured WebSocketMockManager
    """
    manager = WebSocketMockManager()
    manager.add_connection_failure_scenario("/ws", failure_after_messages=2)
    return manager


def setup_reconnection_scenario(max_attempts: int = 3) -> WebSocketMockManager:
    """
    Setup WebSocket mock with reconnection behavior.
    
    Args:
        max_attempts: Maximum reconnection attempts
        
    Returns:
        Configured WebSocketMockManager
    """
    manager = WebSocketMockManager()
    manager.add_reconnection_scenario("/ws", max_attempts=max_attempts)
    return manager


def inject_websocket_mocks(manager: WebSocketMockManager) -> Dict[str, Any]:
    """
    Get instructions for injecting WebSocket mocks.
    
    Args:
        manager: Configured WebSocketMockManager
        
    Returns:
        Dictionary with injection instructions
    """
    return manager.get_injection_instructions()
