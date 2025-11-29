"""
Tests for WebSocket mocking strategy.

This test file validates the WebSocket mocking system for E2E testing.
"""

import pytest
import json
from tests.e2e_websocket_mock import (
    WebSocketMockManager,
    WebSocketState,
    ConnectionBehavior,
    WebSocketMessage,
    WebSocketConnectionConfig,
    create_websocket_manager,
    setup_song_generation_websocket,
    setup_connection_failure_scenario,
    setup_reconnection_scenario,
    inject_websocket_mocks
)


class TestWebSocketMessage:
    """Test WebSocketMessage functionality."""
    
    def test_create_message(self):
        """Test creating a WebSocket message."""
        msg = WebSocketMessage(
            data={"status": "processing", "progress": 50},
            delay_ms=1000
        )
        
        assert msg.data["status"] == "processing"
        assert msg.delay_ms == 1000
        assert msg.trigger_event is None
    
    def test_message_to_json(self):
        """Test JSON serialization of message."""
        msg = WebSocketMessage(
            data={"status": "completed", "song_id": "123"},
            delay_ms=500
        )
        
        json_str = msg.to_json()
        data = json.loads(json_str)
        
        assert data["status"] == "completed"
        assert data["song_id"] == "123"
    
    def test_message_with_trigger(self):
        """Test message with trigger event."""
        msg = WebSocketMessage(
            data={"status": "queued"},
            delay_ms=100,
            trigger_event="subscribe"
        )
        
        assert msg.trigger_event == "subscribe"


class TestWebSocketConnectionConfig:
    """Test WebSocketConnectionConfig functionality."""
    
    def test_create_config(self):
        """Test creating a connection config."""
        config = WebSocketConnectionConfig(
            url_pattern="/ws",
            behavior=ConnectionBehavior.NORMAL,
            connection_delay_ms=100
        )
        
        assert config.url_pattern == "/ws"
        assert config.behavior == ConnectionBehavior.NORMAL
        assert config.connection_delay_ms == 100
        assert len(config.messages) == 0
    
    def test_add_message(self):
        """Test adding messages to config."""
        config = WebSocketConnectionConfig(url_pattern="/ws")
        
        config.add_message({"status": "queued"}, delay_ms=500)
        config.add_message({"status": "processing"}, delay_ms=1000)
        
        assert len(config.messages) == 2
        assert config.messages[0].data["status"] == "queued"
        assert config.messages[1].data["status"] == "processing"
    
    def test_config_with_reconnection(self):
        """Test config with reconnection settings."""
        config = WebSocketConnectionConfig(
            url_pattern="/ws",
            behavior=ConnectionBehavior.INTERMITTENT_FAILURE
        )
        
        config.auto_reconnect = True
        config.max_reconnect_attempts = 5
        config.reconnect_delay_ms = 3000
        
        assert config.auto_reconnect is True
        assert config.max_reconnect_attempts == 5
        assert config.reconnect_delay_ms == 3000


class TestWebSocketMockManager:
    """Test WebSocketMockManager functionality."""
    
    def test_create_manager(self):
        """Test creating a mock manager."""
        manager = WebSocketMockManager()
        
        assert len(manager.connections) == 0
        assert manager.injected is False
    
    def test_add_connection(self):
        """Test adding a connection."""
        manager = WebSocketMockManager()
        
        messages = [
            {"status": "queued", "progress": 0},
            {"status": "processing", "progress": 50}
        ]
        
        config = manager.add_connection(
            url_pattern="/ws",
            messages=messages,
            behavior=ConnectionBehavior.NORMAL
        )
        
        assert len(manager.connections) == 1
        assert config.url_pattern == "/ws"
        assert len(config.messages) == 2
    
    def test_add_song_generation_websocket(self):
        """Test adding song generation WebSocket."""
        manager = WebSocketMockManager()
        
        config = manager.add_song_generation_websocket(
            sequence_type="success",
            behavior=ConnectionBehavior.NORMAL
        )
        
        assert len(manager.connections) == 1
        assert config.url_pattern == "/ws"
        assert len(config.messages) > 0
        
        # Check first and last messages
        assert config.messages[0].data["status"] == "queued"
        assert config.messages[-1].data["status"] == "completed"
    
    def test_add_connection_failure_scenario(self):
        """Test adding connection failure scenario."""
        manager = WebSocketMockManager()
        
        config = manager.add_connection_failure_scenario(
            url_pattern="/ws",
            failure_after_messages=2
        )
        
        assert len(manager.connections) == 1
        assert config.behavior == ConnectionBehavior.INTERMITTENT_FAILURE
        assert len(config.messages) >= 2
    
    def test_add_reconnection_scenario(self):
        """Test adding reconnection scenario."""
        manager = WebSocketMockManager()
        
        config = manager.add_reconnection_scenario(
            url_pattern="/ws",
            max_attempts=3
        )
        
        assert len(manager.connections) == 1
        assert config.auto_reconnect is True
        assert config.max_reconnect_attempts == 3
        assert config.reconnect_delay_ms == 2000
    
    def test_clear_connections(self):
        """Test clearing all connections."""
        manager = WebSocketMockManager()
        
        manager.add_song_generation_websocket()
        manager.add_connection_failure_scenario("/ws")
        
        assert len(manager.connections) == 2
        
        manager.clear_connections()
        
        assert len(manager.connections) == 0
        assert manager.injected is False
    
    def test_generate_injection_script(self):
        """Test generating injection script."""
        manager = WebSocketMockManager()
        manager.add_song_generation_websocket(sequence_type="success")
        
        script = manager.generate_injection_script()
        
        assert "window.WebSocket" in script
        assert "connectionConfigs" in script
        assert "__websocketMockInjected" in script
        assert "activeMockConnections" in script
    
    def test_get_injection_instructions(self):
        """Test getting injection instructions."""
        manager = WebSocketMockManager()
        manager.add_song_generation_websocket()
        
        instructions = manager.get_injection_instructions()
        
        assert instructions["action"] == "inject_websocket_mocks"
        assert "script" in instructions
        assert instructions["connections_count"] == 1
        assert len(instructions["steps"]) > 0
    
    def test_simulate_connection_failure(self):
        """Test generating connection failure script."""
        manager = WebSocketMockManager()
        
        script = manager.simulate_connection_failure()
        
        assert "__websocketMockConnections" in script
        assert "Simulating connection failure" in script
        assert "readyState" in script
    
    def test_simulate_reconnection(self):
        """Test generating reconnection script."""
        manager = WebSocketMockManager()
        
        script = manager.simulate_reconnection()
        
        assert "__websocketMockConnections" in script
        assert "Simulating reconnection" in script
        assert "onopen" in script


class TestConnectionBehaviors:
    """Test different connection behaviors."""
    
    def test_normal_behavior(self):
        """Test normal connection behavior."""
        manager = WebSocketMockManager()
        
        config = manager.add_song_generation_websocket(
            sequence_type="success",
            behavior=ConnectionBehavior.NORMAL
        )
        
        assert config.behavior == ConnectionBehavior.NORMAL
        script = manager.generate_injection_script()
        # Check that the behavior is included in the config
        assert "normal" in script
    
    def test_delayed_open_behavior(self):
        """Test delayed connection opening."""
        manager = WebSocketMockManager()
        
        config = manager.add_connection(
            url_pattern="/ws",
            behavior=ConnectionBehavior.DELAYED_OPEN
        )
        
        assert config.behavior == ConnectionBehavior.DELAYED_OPEN
        script = manager.generate_injection_script()
        assert "delayed_open" in script
    
    def test_immediate_close_behavior(self):
        """Test immediate connection close."""
        manager = WebSocketMockManager()
        
        config = manager.add_connection(
            url_pattern="/ws",
            behavior=ConnectionBehavior.IMMEDIATE_CLOSE
        )
        
        assert config.behavior == ConnectionBehavior.IMMEDIATE_CLOSE
        script = manager.generate_injection_script()
        assert "immediate_close" in script
    
    def test_intermittent_failure_behavior(self):
        """Test intermittent connection failure."""
        manager = WebSocketMockManager()
        
        config = manager.add_connection_failure_scenario("/ws")
        
        assert config.behavior == ConnectionBehavior.INTERMITTENT_FAILURE
        script = manager.generate_injection_script()
        assert "intermittent_failure" in script
    
    def test_permanent_failure_behavior(self):
        """Test permanent connection failure."""
        manager = WebSocketMockManager()
        
        config = manager.add_connection(
            url_pattern="/ws",
            behavior=ConnectionBehavior.PERMANENT_FAILURE
        )
        
        assert config.behavior == ConnectionBehavior.PERMANENT_FAILURE
        script = manager.generate_injection_script()
        assert "permanent_failure" in script


class TestConvenienceFunctions:
    """Test convenience functions."""
    
    def test_create_websocket_manager(self):
        """Test create_websocket_manager function."""
        manager = create_websocket_manager()
        
        assert isinstance(manager, WebSocketMockManager)
        assert len(manager.connections) == 0
    
    def test_setup_song_generation_websocket(self):
        """Test setup_song_generation_websocket function."""
        manager = setup_song_generation_websocket(
            sequence_type="success",
            behavior=ConnectionBehavior.NORMAL
        )
        
        assert len(manager.connections) == 1
        assert manager.connections[0].url_pattern == "/ws"
    
    def test_setup_connection_failure_scenario(self):
        """Test setup_connection_failure_scenario function."""
        manager = setup_connection_failure_scenario()
        
        assert len(manager.connections) == 1
        assert manager.connections[0].behavior == ConnectionBehavior.INTERMITTENT_FAILURE
    
    def test_setup_reconnection_scenario(self):
        """Test setup_reconnection_scenario function."""
        manager = setup_reconnection_scenario(max_attempts=5)
        
        assert len(manager.connections) == 1
        assert manager.connections[0].auto_reconnect is True
        assert manager.connections[0].max_reconnect_attempts == 5
    
    def test_inject_websocket_mocks(self):
        """Test inject_websocket_mocks function."""
        manager = setup_song_generation_websocket()
        instructions = inject_websocket_mocks(manager)
        
        assert "script" in instructions
        assert instructions["connections_count"] == 1


class TestScriptGeneration:
    """Test script generation for different scenarios."""
    
    def test_success_sequence_script(self):
        """Test script generation for success sequence."""
        manager = setup_song_generation_websocket(sequence_type="success")
        script = manager.generate_injection_script()
        
        assert "window.WebSocket" in script
        assert "mockWS" in script
        assert "sendMessages" in script
    
    def test_failed_sequence_script(self):
        """Test script generation for failed sequence."""
        manager = setup_song_generation_websocket(sequence_type="failed")
        script = manager.generate_injection_script()
        
        assert "window.WebSocket" in script
        # Should contain failed status in messages
        assert "failed" in script.lower()
    
    def test_slow_sequence_script(self):
        """Test script generation for slow sequence."""
        manager = setup_song_generation_websocket(sequence_type="slow")
        script = manager.generate_injection_script()
        
        assert "window.WebSocket" in script
        # Should have longer delays
        assert "1500" in script  # Slow sequence uses 1500ms delays
    
    def test_reconnection_script(self):
        """Test script generation for reconnection."""
        manager = setup_reconnection_scenario(max_attempts=3)
        script = manager.generate_injection_script()
        
        assert "handleReconnection" in script
        assert "max_reconnect_attempts" in script
        assert "auto_reconnect" in script


class TestMultipleConnections:
    """Test handling multiple WebSocket connections."""
    
    def test_multiple_connections(self):
        """Test adding multiple connections."""
        manager = WebSocketMockManager()
        
        manager.add_song_generation_websocket(sequence_type="success")
        manager.add_connection_failure_scenario("/ws/status")
        manager.add_reconnection_scenario("/ws/updates")
        
        assert len(manager.connections) == 3
        
        instructions = manager.get_injection_instructions()
        assert instructions["connections_count"] == 3
    
    def test_different_url_patterns(self):
        """Test connections with different URL patterns."""
        manager = WebSocketMockManager()
        
        manager.add_connection(url_pattern="/ws/songs")
        manager.add_connection(url_pattern="/ws/lyrics")
        manager.add_connection(url_pattern="/ws/status")
        
        assert len(manager.connections) == 3
        
        patterns = [conn.url_pattern for conn in manager.connections]
        assert "/ws/songs" in patterns
        assert "/ws/lyrics" in patterns
        assert "/ws/status" in patterns


class TestMessageSequences:
    """Test message sequence handling."""
    
    def test_success_sequence_messages(self):
        """Test success sequence has correct messages."""
        manager = setup_song_generation_websocket(sequence_type="success")
        config = manager.connections[0]
        
        # Should have multiple messages
        assert len(config.messages) > 0
        
        # First message should be queued
        assert config.messages[0].data["status"] == "queued"
        
        # Last message should be completed
        assert config.messages[-1].data["status"] == "completed"
        
        # Should have processing messages in between
        processing_messages = [
            msg for msg in config.messages 
            if msg.data["status"] == "processing"
        ]
        assert len(processing_messages) > 0
    
    def test_failed_sequence_messages(self):
        """Test failed sequence has correct messages."""
        manager = setup_song_generation_websocket(sequence_type="failed")
        config = manager.connections[0]
        
        # Should have messages
        assert len(config.messages) > 0
        
        # Last message should be failed
        assert config.messages[-1].data["status"] == "failed"
    
    def test_custom_message_delays(self):
        """Test custom message delays."""
        manager = WebSocketMockManager()
        config = manager.add_connection(url_pattern="/ws")
        
        config.add_message({"status": "queued"}, delay_ms=100)
        config.add_message({"status": "processing"}, delay_ms=500)
        config.add_message({"status": "completed"}, delay_ms=2000)
        
        assert config.messages[0].delay_ms == 100
        assert config.messages[1].delay_ms == 500
        assert config.messages[2].delay_ms == 2000


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
