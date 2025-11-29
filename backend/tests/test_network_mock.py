"""
Tests for network interception and mocking system.

This test file demonstrates how to use the network mocking system
and validates that mock rules are configured correctly.
"""

import pytest
import json
from tests.e2e_network_mock import (
    NetworkMockManager,
    MockStrategy,
    RequestPattern,
    MockResponse,
    MockRule,
    create_mock_manager,
    setup_happy_path_mocks,
    setup_error_scenario_mocks,
    setup_validation_error_mocks,
    inject_network_mocks,
    inject_websocket_mocks,
    verify_mocks_injected
)


class TestRequestPattern:
    """Test RequestPattern matching logic."""
    
    def test_exact_match(self):
        """Test exact URL matching."""
        pattern = RequestPattern(
            url_pattern="http://localhost:5173/api/lyrics/generate",
            method="POST",
            match_type="exact"
        )
        
        assert pattern.matches("http://localhost:5173/api/lyrics/generate", "POST")
        assert not pattern.matches("http://localhost:5173/api/lyrics/generate?foo=bar", "POST")
        assert not pattern.matches("http://localhost:5173/api/lyrics/generate", "GET")
    
    def test_contains_match(self):
        """Test URL contains matching."""
        pattern = RequestPattern(
            url_pattern="/api/lyrics/generate",
            method="POST",
            match_type="contains"
        )
        
        assert pattern.matches("http://localhost:5173/api/lyrics/generate", "POST")
        assert pattern.matches("http://localhost:5173/api/lyrics/generate?foo=bar", "POST")
        assert not pattern.matches("http://localhost:5173/api/songs/generate", "POST")
        assert not pattern.matches("http://localhost:5173/api/lyrics/generate", "GET")
    
    def test_regex_match(self):
        """Test regex URL matching."""
        pattern = RequestPattern(
            url_pattern=r"/api/(lyrics|songs)/generate",
            method="POST",
            match_type="regex"
        )
        
        assert pattern.matches("http://localhost:5173/api/lyrics/generate", "POST")
        assert pattern.matches("http://localhost:5173/api/songs/generate", "POST")
        assert not pattern.matches("http://localhost:5173/api/other/generate", "POST")


class TestMockResponse:
    """Test MockResponse functionality."""
    
    def test_to_json(self):
        """Test JSON serialization of mock response."""
        response = MockResponse(
            status=200,
            body={"message": "success"},
            headers={"Content-Type": "application/json"}
        )
        
        json_str = response.to_json()
        data = json.loads(json_str)
        
        assert data["status"] == 200
        assert data["body"]["message"] == "success"
        assert data["headers"]["Content-Type"] == "application/json"


class TestMockRule:
    """Test MockRule functionality."""
    
    def test_rule_matching(self):
        """Test that rules match requests correctly."""
        pattern = RequestPattern("/api/lyrics/generate", "POST", "contains")
        response = MockResponse(200, {"lyrics": "test"})
        rule = MockRule(pattern, response)
        
        assert rule.matches("http://localhost:5173/api/lyrics/generate", "POST")
        assert not rule.matches("http://localhost:5173/api/songs/generate", "POST")
    
    def test_rule_hit_count(self):
        """Test that hit count is tracked."""
        pattern = RequestPattern("/api/lyrics/generate", "POST", "contains")
        response = MockResponse(200, {"lyrics": "test"})
        rule = MockRule(pattern, response)
        
        assert rule.hit_count == 0
        
        rule.get_response()
        assert rule.hit_count == 1
        
        rule.get_response()
        assert rule.hit_count == 2
    
    def test_rule_enable_disable(self):
        """Test enabling and disabling rules."""
        pattern = RequestPattern("/api/lyrics/generate", "POST", "contains")
        response = MockResponse(200, {"lyrics": "test"})
        rule = MockRule(pattern, response, enabled=True)
        
        assert rule.matches("http://localhost:5173/api/lyrics/generate", "POST")
        
        rule.enabled = False
        assert not rule.matches("http://localhost:5173/api/lyrics/generate", "POST")


class TestNetworkMockManager:
    """Test NetworkMockManager functionality."""
    
    def test_create_manager(self):
        """Test creating a mock manager."""
        manager = NetworkMockManager()
        assert manager.strategy == MockStrategy.JAVASCRIPT_INJECTION
        assert len(manager.rules) == 0
        assert not manager.injected
    
    def test_add_rule(self):
        """Test adding a mock rule."""
        manager = NetworkMockManager()
        response = MockResponse(200, {"lyrics": "test"})
        
        rule = manager.add_rule(
            url_pattern="/api/lyrics/generate",
            response=response,
            method="POST"
        )
        
        assert len(manager.rules) == 1
        assert rule.pattern.url_pattern == "/api/lyrics/generate"
        assert rule.pattern.method == "POST"
    
    def test_add_lyrics_generation_mock(self):
        """Test adding lyrics generation mock."""
        manager = NetworkMockManager()
        
        rule = manager.add_lyrics_generation_mock(response_type="success")
        
        assert len(manager.rules) == 1
        assert rule.pattern.url_pattern == "/api/lyrics/generate"
        assert rule.response.status == 200
    
    def test_add_song_generation_mock(self):
        """Test adding song generation mock."""
        manager = NetworkMockManager()
        
        rule = manager.add_song_generation_mock(response_type="queued")
        
        assert len(manager.rules) == 1
        assert rule.pattern.url_pattern == "/api/songs/generate"
        assert rule.response.status == 200
    
    def test_add_error_mock(self):
        """Test adding error mock."""
        manager = NetworkMockManager()
        
        rule = manager.add_error_mock(
            endpoint="/api/lyrics/generate",
            error_type="rate_limit",
            method="POST"
        )
        
        assert len(manager.rules) == 1
        assert rule.response.status == 429
    
    def test_clear_rules(self):
        """Test clearing all rules."""
        manager = NetworkMockManager()
        manager.add_lyrics_generation_mock()
        manager.add_song_generation_mock()
        
        assert len(manager.rules) == 2
        
        manager.clear_rules()
        assert len(manager.rules) == 0
    
    def test_disable_enable_rule(self):
        """Test disabling and enabling specific rules."""
        manager = NetworkMockManager()
        manager.add_lyrics_generation_mock()
        
        assert manager.rules[0].enabled
        
        manager.disable_rule("/api/lyrics/generate")
        assert not manager.rules[0].enabled
        
        manager.enable_rule("/api/lyrics/generate")
        assert manager.rules[0].enabled
    
    def test_get_rule_stats(self):
        """Test getting rule statistics."""
        manager = NetworkMockManager()
        manager.add_lyrics_generation_mock()
        manager.add_song_generation_mock()
        
        # Simulate some hits
        manager.rules[0].get_response()
        manager.rules[0].get_response()
        
        stats = manager.get_rule_stats()
        
        assert len(stats) == 2
        assert stats[0]["url_pattern"] == "/api/lyrics/generate"
        assert stats[0]["hit_count"] == 2
        assert stats[1]["hit_count"] == 0
    
    def test_generate_injection_script(self):
        """Test generating JavaScript injection script."""
        manager = NetworkMockManager()
        manager.add_lyrics_generation_mock()
        
        script = manager.generate_injection_script()
        
        assert "window.fetch" in script
        assert "XMLHttpRequest" in script
        assert "mockRules" in script
        assert "__networkMockInjected" in script
    
    def test_get_injection_instructions(self):
        """Test getting injection instructions."""
        manager = NetworkMockManager()
        manager.add_lyrics_generation_mock()
        
        instructions = manager.get_injection_instructions()
        
        assert instructions["action"] == "inject_network_mocks"
        assert instructions["strategy"] == "javascript_injection"
        assert "script" in instructions
        assert instructions["rules_count"] == 1
        assert len(instructions["steps"]) > 0
    
    def test_get_websocket_mock_script(self):
        """Test generating WebSocket mock script."""
        manager = NetworkMockManager()
        
        script = manager.get_websocket_mock_script(sequence_type="success")
        
        assert "WebSocket" in script
        assert "mockSequence" in script
        assert "__websocketMockInjected" in script
    
    def test_get_websocket_injection_instructions(self):
        """Test getting WebSocket injection instructions."""
        manager = NetworkMockManager()
        
        instructions = manager.get_websocket_injection_instructions(sequence_type="success")
        
        assert instructions["action"] == "inject_websocket_mocks"
        assert instructions["sequence_type"] == "success"
        assert "script" in instructions
        assert len(instructions["steps"]) > 0


class TestConvenienceFunctions:
    """Test convenience functions."""
    
    def test_create_mock_manager(self):
        """Test create_mock_manager function."""
        manager = create_mock_manager()
        assert isinstance(manager, NetworkMockManager)
    
    def test_setup_happy_path_mocks(self):
        """Test setup_happy_path_mocks function."""
        manager = setup_happy_path_mocks()
        
        assert len(manager.rules) == 2
        # Should have lyrics and song generation mocks
        patterns = [rule.pattern.url_pattern for rule in manager.rules]
        assert "/api/lyrics/generate" in patterns
        assert "/api/songs/generate" in patterns
    
    def test_setup_error_scenario_mocks(self):
        """Test setup_error_scenario_mocks function."""
        manager = setup_error_scenario_mocks("rate_limit")
        
        assert len(manager.rules) == 1
        assert manager.rules[0].response.status == 429
    
    def test_setup_validation_error_mocks(self):
        """Test setup_validation_error_mocks function."""
        manager = setup_validation_error_mocks()
        
        assert len(manager.rules) == 1
        assert manager.rules[0].response.status == 400
    
    def test_inject_network_mocks(self):
        """Test inject_network_mocks function."""
        manager = setup_happy_path_mocks()
        instructions = inject_network_mocks(manager)
        
        assert "script" in instructions
        assert instructions["rules_count"] == 2
    
    def test_inject_websocket_mocks(self):
        """Test inject_websocket_mocks function."""
        instructions = inject_websocket_mocks(sequence_type="success")
        
        assert "script" in instructions
        assert instructions["sequence_type"] == "success"
    
    def test_verify_mocks_injected(self):
        """Test verify_mocks_injected function."""
        script = verify_mocks_injected()
        
        assert "networkMockInjected" in script
        assert "websocketMockInjected" in script


class TestScriptGeneration:
    """Test that generated scripts are valid JavaScript."""
    
    def test_network_mock_script_syntax(self):
        """Test that network mock script has valid syntax."""
        manager = NetworkMockManager()
        manager.add_lyrics_generation_mock()
        
        script = manager.generate_injection_script()
        
        # Basic syntax checks
        assert script.count("(function()") == script.count("})();")
        assert "window.fetch" in script
        assert "window.XMLHttpRequest" in script
    
    def test_websocket_mock_script_syntax(self):
        """Test that WebSocket mock script has valid syntax."""
        manager = NetworkMockManager()
        
        script = manager.get_websocket_mock_script()
        
        # Basic syntax checks
        assert script.count("(function()") == script.count("})();")
        assert "window.WebSocket" in script
        assert "mockSequence" in script


class TestMockScenarios:
    """Test complete mock scenarios."""
    
    def test_happy_path_scenario(self):
        """Test setting up happy path scenario."""
        manager = setup_happy_path_mocks()
        
        # Verify lyrics mock
        lyrics_rule = next(r for r in manager.rules if "/lyrics/" in r.pattern.url_pattern)
        assert lyrics_rule.response.status == 200
        assert "lyrics" in lyrics_rule.response.body
        
        # Verify song mock
        song_rule = next(r for r in manager.rules if "/songs/" in r.pattern.url_pattern)
        assert song_rule.response.status == 200
        assert "task_id" in song_rule.response.body
    
    def test_rate_limit_scenario(self):
        """Test setting up rate limit error scenario."""
        manager = setup_error_scenario_mocks("rate_limit")
        
        rule = manager.rules[0]
        assert rule.response.status == 429
        assert "detail" in rule.response.body
    
    def test_server_error_scenario(self):
        """Test setting up server error scenario."""
        manager = setup_error_scenario_mocks("server_error")
        
        rule = manager.rules[0]
        assert rule.response.status == 500
        assert "detail" in rule.response.body
    
    def test_validation_error_scenario(self):
        """Test setting up validation error scenario."""
        manager = setup_validation_error_mocks()
        
        rule = manager.rules[0]
        assert rule.response.status == 400
        assert "detail" in rule.response.body


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
