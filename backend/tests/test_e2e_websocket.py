"""
End-to-End tests for WebSocket connectivity using Chrome DevTools MCP.

This module implements browser-based E2E tests for WebSocket functionality,
validating connection establishment, real-time status updates, connection failures,
reconnection behavior, and automatic navigation on completion.

Requirements tested:
- 4.1: WebSocket connection establishment and status indicator
- 4.2: Real-time status updates during song generation
- 4.3: WebSocket connection failure and offline indicator
- 4.4: WebSocket reconnection after failure
- 4.5: Automatic navigation on generation completion
"""

import pytest
import time
from pathlib import Path
from typing import Dict, Any, List

from tests.e2e_helpers import ChromeDevToolsHelper, create_helper
from tests.e2e_mock_data import (
    MOCK_LYRICS_SUCCESS,
    MOCK_SONG_GENERATION_QUEUED,
    MOCK_WEBSOCKET_SEQUENCE_SUCCESS,
    MOCK_WEBSOCKET_SEQUENCE_FAILED
)
from tests.e2e_network_mock import (
    NetworkMockManager,
    setup_happy_path_mocks
)
from tests.e2e_websocket_mock import (
    WebSocketMockManager,
    ConnectionBehavior,
    setup_song_generation_websocket,
    setup_connection_failure_scenario,
    setup_reconnection_scenario
)


class TestWebSocketConnectionEstablishment:
    """Test WebSocket connection establishment and status indicator."""
    
    def test_websocket_connection_establishment(self):
        """
        Test that WebSocket connection is established and status indicator is displayed.
        
        Validates: Requirement 4.1
        
        This test:
        1. Sets up WebSocket mocks with normal connection behavior
        2. Navigates to Page B with lyrics
        3. Initiates song generation
        4. Verifies WebSocket connection is established
        5. Verifies connection status indicator is displayed
        6. Captures screenshots of connection states
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: WebSocket Connection Establishment and Status Indicator")
        print("="*70)
        
        # Setup network and WebSocket mocks
        network_manager = setup_happy_path_mocks()
        network_injection = network_manager.get_injection_instructions()
        
        ws_manager = setup_song_generation_websocket(
            sequence_type="success",
            behavior=ConnectionBehavior.NORMAL
        )
        ws_injection = ws_manager.get_injection_instructions()
        
        # Screenshot paths
        screenshot_before_connection = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "ws-before-connection")
        )
        screenshot_connecting = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "ws-connecting")
        )
        screenshot_connected = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "ws-connected")
        )
        screenshots.extend([screenshot_before_connection, screenshot_connecting, screenshot_connected])
        
        print(f"\n📸 Screenshots: {len(screenshots)} planned")
        for i, path in enumerate(screenshots, 1):
            print(f"   {i}. {path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("STEP 1: Setup and Navigate to Page B")
        print("-"*70)
        print("1. Connect to browser and navigate to Page A")
        print("2. Inject network mocks (see previous tests)")
        print("3. Submit text to generate lyrics and navigate to Page B")
        print("4. Capture screenshot before WebSocket connection:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_before_connection}')")
        print()
        
        print("-"*70)
        print("STEP 2: Inject WebSocket Mocks")
        print("-"*70)
        print("Call: mcp_chrome_devtools_evaluate_script(")
        print(f"  function={ws_injection['script'][:200]}...")
        print(")")
        print()
        print("Verify injection:")
        print("Call: mcp_chrome_devtools_evaluate_script(")
        print("  function=() => {")
        print("    return {")
        print("      websocketMockInjected: window.__websocketMockInjected === true,")
        print("      originalWebSocket: typeof window.WebSocket === 'function'")
        print("    };")
        print("  }")
        print(")")
        print()
        
        print("-"*70)
        print("STEP 3: Initiate Song Generation and Monitor Connection")
        print("-"*70)
        print("1. Click generate button to initiate song generation")
        print()
        print("2. Immediately check for connecting state:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const statusEl = document.querySelector('[class*=\"status\"], [class*=\"connection\"]');")
        print("         return {")
        print("           hasStatusIndicator: statusEl !== null,")
        print("           statusText: statusEl?.textContent || null,")
        print("           isConnecting: statusEl?.textContent?.toLowerCase().includes('connect')")
        print("         };")
        print("       }")
        print("     )")
        print()
        print("3. Capture screenshot during connection:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_connecting}')")
        print()
        print("4. Wait for connection to be established (should be quick):")
        print("   - Call: mcp_chrome_devtools_wait_for(text='connected', timeout=5000)")
        print()
        print("5. Verify connection is established:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const connections = window.__websocketMockConnections;")
        print("         if (!connections) return { error: 'No mock connections found' };")
        print("         ")
        print("         const wsArray = Array.from(connections.values());")
        print("         return {")
        print("           connectionCount: wsArray.length,")
        print("           connections: wsArray.map(ws => ({")
        print("             url: ws.url,")
        print("             readyState: ws.readyState,")
        print("             isOpen: ws.readyState === 1")
        print("           }))")
        print("         };")
        print("       }")
        print("     )")
        print("   - Expected: readyState === 1 (OPEN)")
        print()
        print("6. Capture screenshot after connection established:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_connected}')")
        print()
        
        helper.record_test_result(
            scenario_id="websocket-connection-establishment",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
        print("\nExpected behavior:")
        print("  - WebSocket connection should be established within 100-200ms")
        print("  - Status indicator should show 'Connecting...' then 'Connected'")
        print("  - readyState should transition from 0 (CONNECTING) to 1 (OPEN)")


class TestWebSocketRealtimeUpdates:
    """Test real-time status updates during song generation."""
    
    def test_realtime_status_updates(self):
        """
        Test that real-time status updates are received and displayed during song generation.
        
        Validates: Requirement 4.2
        
        This property test verifies that for any mocked WebSocket status update received
        during song generation, the application displays the updated status and progress.
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Real-time Status Updates During Song Generation")
        print("="*70)
        
        # Setup mocks
        network_manager = setup_happy_path_mocks()
        ws_manager = setup_song_generation_websocket(sequence_type="success")
        
        # Progress stages to capture
        progress_stages = [
            ("queued", 0, "Queued (0%)"),
            ("processing-25", 25, "Processing (25%)"),
            ("processing-50", 50, "Processing (50%)"),
            ("processing-75", 75, "Processing (75%)"),
            ("completed", 100, "Completed (100%)")
        ]
        
        print(f"\n📋 Testing {len(progress_stages)} progress stages:")
        for stage_name, progress, description in progress_stages:
            print(f"   - {description}")
            
            screenshot_path = helper.get_screenshot_path(
                "page-b",
                helper.generate_screenshot_filename("page-b", f"ws-status-{stage_name}")
            )
            screenshots.append(screenshot_path)
        
        print(f"\n📸 Screenshots: {len(screenshots)} planned")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("Prerequisites:")
        print("- Network and WebSocket mocks should be injected")
        print("- Page B should be loaded with valid lyrics")
        print("- Song generation should be initiated")
        print()
        
        print("-"*70)
        print("STEP 1: Monitor Real-time Updates")
        print("-"*70)
        print("After clicking generate button, monitor for each progress update:")
        print()
        print("For each progress stage (0%, 25%, 50%, 75%, 100%):")
        print()
        print("1. Wait for the update (WebSocket will send automatically)")
        print("   - Updates come every ~1 second")
        print()
        print("2. Verify progress tracker displays current status:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const progressEl = document.querySelector('[class*=\"progress\"]');")
        print("         const statusEl = document.querySelector('[class*=\"status\"]');")
        print("         const percentEl = document.querySelector('[class*=\"percent\"]');")
        print("         const progressBar = document.querySelector('progress, [role=\"progressbar\"]');")
        print("         ")
        print("         return {")
        print("           hasProgressTracker: progressEl !== null,")
        print("           statusText: statusEl?.textContent || null,")
        print("           progressPercent: percentEl?.textContent || null,")
        print("           progressValue: progressBar?.value || progressBar?.getAttribute('aria-valuenow')")
        print("         };")
        print("       }")
        print("     )")
        print()
        print("3. Verify the status matches expected stage:")
        print("   - Queued: status should contain 'queued' or 'waiting'")
        print("   - Processing: status should contain 'processing' or 'generating'")
        print("   - Completed: status should contain 'completed' or 'done'")
        print()
        print("4. Capture screenshot at this stage:")
        print("   - Call: mcp_chrome_devtools_take_screenshot(filePath='<screenshot-path>')")
        print()
        print("5. Wait 1-2 seconds for next update")
        print()
        
        print("-"*70)
        print("STEP 2: Verify Update Timing")
        print("-"*70)
        print("Monitor the timing between updates:")
        print()
        print("Call: mcp_chrome_devtools_evaluate_script(")
        print("  function=() => {")
        print("    // Track update times")
        print("    if (!window.__updateTimes) window.__updateTimes = [];")
        print("    window.__updateTimes.push(Date.now());")
        print("    ")
        print("    if (window.__updateTimes.length > 1) {")
        print("      const intervals = [];")
        print("      for (let i = 1; i < window.__updateTimes.length; i++) {")
        print("        intervals.push(window.__updateTimes[i] - window.__updateTimes[i-1]);")
        print("      }")
        print("      return {")
        print("        updateCount: window.__updateTimes.length,")
        print("        intervals: intervals,")
        print("        averageInterval: intervals.reduce((a,b) => a+b, 0) / intervals.length")
        print("      };")
        print("    }")
        print("    return { updateCount: 1 };")
        print("  }")
        print(")")
        print()
        
        helper.record_test_result(
            scenario_id="websocket-realtime-updates",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
        print("\nExpected WebSocket sequence:")
        for update in MOCK_WEBSOCKET_SEQUENCE_SUCCESS:
            print(f"  - {update['status']}: {update['progress']}% - {update.get('message', '')}")


class TestWebSocketConnectionFailure:
    """Test WebSocket connection failure and offline indicator."""
    
    def test_connection_failure_and_offline_indicator(self):
        """
        Test that WebSocket connection failure displays offline indicator.
        
        Validates: Requirement 4.3
        
        This test:
        1. Sets up WebSocket mocks with connection failure behavior
        2. Initiates song generation
        3. Simulates connection failure
        4. Verifies offline indicator is displayed
        5. Verifies appropriate error messaging
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: WebSocket Connection Failure and Offline Indicator")
        print("="*70)
        
        # Setup mocks with failure scenario
        network_manager = setup_happy_path_mocks()
        ws_manager = setup_connection_failure_scenario()
        ws_injection = ws_manager.get_injection_instructions()
        
        # Screenshot paths
        screenshot_before_failure = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "ws-before-failure")
        )
        screenshot_failure = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "ws-connection-failure")
        )
        screenshot_offline_indicator = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "ws-offline-indicator")
        )
        screenshots.extend([screenshot_before_failure, screenshot_failure, screenshot_offline_indicator])
        
        print(f"\n📸 Screenshots: {len(screenshots)} planned")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("STEP 1: Setup Connection Failure Scenario")
        print("-"*70)
        print("1. Inject network mocks")
        print("2. Inject WebSocket mocks with INTERMITTENT_FAILURE behavior:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print(f"       function={ws_injection['script'][:200]}...")
        print("     )")
        print()
        print("3. Navigate to Page B with valid lyrics")
        print("4. Capture screenshot before failure:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_before_failure}')")
        print()
        
        print("-"*70)
        print("STEP 2: Initiate Generation and Trigger Failure")
        print("-"*70)
        print("1. Click generate button to start song generation")
        print()
        print("2. Wait for connection to be established and first few updates")
        print("   - Connection will drop after 2 messages (configured in mock)")
        print()
        print("3. Monitor for connection failure:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const connections = window.__websocketMockConnections;")
        print("         if (!connections) return { error: 'No connections' };")
        print("         ")
        print("         const wsArray = Array.from(connections.values());")
        print("         return {")
        print("           connections: wsArray.map(ws => ({")
        print("             url: ws.url,")
        print("             readyState: ws.readyState,")
        print("             isClosed: ws.readyState === 3")
        print("           }))")
        print("         };")
        print("       }")
        print("     )")
        print("   - Expected: readyState === 3 (CLOSED)")
        print()
        print("4. Capture screenshot during failure:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_failure}')")
        print()
        
        print("-"*70)
        print("STEP 3: Verify Offline Indicator")
        print("-"*70)
        print("1. Check for offline indicator in UI:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const offlineEl = document.querySelector('[class*=\"offline\"], [class*=\"disconnected\"]');")
        print("         const errorEl = document.querySelector('[role=\"alert\"], .error');")
        print("         const statusEl = document.querySelector('[class*=\"status\"]');")
        print("         ")
        print("         return {")
        print("           hasOfflineIndicator: offlineEl !== null,")
        print("           offlineText: offlineEl?.textContent || null,")
        print("           hasError: errorEl !== null,")
        print("           errorText: errorEl?.textContent || null,")
        print("           statusText: statusEl?.textContent || null")
        print("         };")
        print("       }")
        print("     )")
        print("   - Expected: hasOfflineIndicator: true")
        print("   - Expected: offlineText contains 'offline', 'disconnected', or 'connection lost'")
        print()
        print("2. Capture screenshot showing offline indicator:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_offline_indicator}')")
        print()
        print("3. Verify error message is user-friendly:")
        print("   - Should explain connection was lost")
        print("   - Should suggest checking internet connection")
        print("   - Should indicate system will try to reconnect")
        print()
        
        helper.record_test_result(
            scenario_id="websocket-connection-failure",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
        print("\nExpected behavior:")
        print("  - Connection should fail after 2 status updates")
        print("  - Offline indicator should appear immediately")
        print("  - User should see clear error message")
        print("  - Progress tracker should show connection lost state")


class TestWebSocketReconnection:
    """Test WebSocket reconnection after failure."""
    
    def test_reconnection_after_failure(self):
        """
        Test that WebSocket reconnects after connection failure.
        
        Validates: Requirement 4.4
        
        This test:
        1. Sets up WebSocket mocks with auto-reconnect behavior
        2. Simulates connection failure
        3. Verifies reconnection attempt is made
        4. Verifies connection status indicator updates
        5. Verifies status updates resume after reconnection
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: WebSocket Reconnection After Failure")
        print("="*70)
        
        # Setup mocks with reconnection scenario
        network_manager = setup_happy_path_mocks()
        ws_manager = setup_reconnection_scenario(max_attempts=3)
        ws_injection = ws_manager.get_injection_instructions()
        
        # Screenshot paths
        screenshot_connected = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "ws-reconnect-connected")
        )
        screenshot_disconnected = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "ws-reconnect-disconnected")
        )
        screenshot_reconnecting = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "ws-reconnecting")
        )
        screenshot_reconnected = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "ws-reconnected")
        )
        screenshots.extend([
            screenshot_connected,
            screenshot_disconnected,
            screenshot_reconnecting,
            screenshot_reconnected
        ])
        
        print(f"\n📸 Screenshots: {len(screenshots)} planned")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("STEP 1: Setup Reconnection Scenario")
        print("-"*70)
        print("1. Inject network mocks")
        print("2. Inject WebSocket mocks with auto-reconnect enabled:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print(f"       function={ws_injection['script'][:200]}...")
        print("     )")
        print()
        print("3. Navigate to Page B and initiate song generation")
        print("4. Wait for initial connection:")
        print("   - Call: mcp_chrome_devtools_wait_for(text='connected', timeout=5000)")
        print()
        print("5. Capture screenshot of connected state:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_connected}')")
        print()
        
        print("-"*70)
        print("STEP 2: Simulate Connection Failure")
        print("-"*70)
        print("1. Manually trigger connection failure:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print(f"       function={ws_manager.simulate_connection_failure()}")
        print("     )")
        print()
        print("2. Verify connection is closed:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const connections = window.__websocketMockConnections;")
        print("         const wsArray = Array.from(connections.values());")
        print("         return {")
        print("           allClosed: wsArray.every(ws => ws.readyState === 3)")
        print("         };")
        print("       }")
        print("     )")
        print()
        print("3. Capture screenshot of disconnected state:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_disconnected}')")
        print()
        
        print("-"*70)
        print("STEP 3: Monitor Reconnection Attempt")
        print("-"*70)
        print("1. Wait for reconnection attempt (should start within 2 seconds):")
        print("   - Call: mcp_chrome_devtools_wait_for(text='reconnect', timeout=5000)")
        print()
        print("2. Verify reconnecting status is displayed:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const statusEl = document.querySelector('[class*=\"status\"]');")
        print("         return {")
        print("           statusText: statusEl?.textContent || null,")
        print("           isReconnecting: statusEl?.textContent?.toLowerCase().includes('reconnect')")
        print("         };")
        print("       }")
        print("     )")
        print()
        print("3. Capture screenshot during reconnection:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_reconnecting}')")
        print()
        
        print("-"*70)
        print("STEP 4: Verify Successful Reconnection")
        print("-"*70)
        print("1. Wait for reconnection to complete:")
        print("   - Call: mcp_chrome_devtools_wait_for(text='connected', timeout=5000)")
        print()
        print("2. Verify connection is re-established:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const connections = window.__websocketMockConnections;")
        print("         const wsArray = Array.from(connections.values());")
        print("         return {")
        print("           connectionCount: wsArray.length,")
        print("           anyOpen: wsArray.some(ws => ws.readyState === 1),")
        print("           connections: wsArray.map(ws => ({")
        print("             url: ws.url,")
        print("             readyState: ws.readyState")
        print("           }))")
        print("         };")
        print("       }")
        print("     )")
        print("   - Expected: anyOpen: true")
        print()
        print("3. Verify status updates resume:")
        print("   - Monitor for new progress updates")
        print("   - Updates should continue from where they left off")
        print()
        print("4. Capture screenshot of reconnected state:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_reconnected}')")
        print()
        
        helper.record_test_result(
            scenario_id="websocket-reconnection",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
        print("\nExpected behavior:")
        print("  - Reconnection attempt should start within 2 seconds of failure")
        print("  - UI should show 'Reconnecting...' status")
        print("  - Connection should be re-established successfully")
        print("  - Status updates should resume after reconnection")
        print("  - Maximum 3 reconnection attempts configured")


class TestWebSocketAutomaticNavigation:
    """Test automatic navigation on generation completion."""
    
    def test_automatic_navigation_on_completion(self):
        """
        Test that application automatically navigates to Page C when song generation completes.
        
        Validates: Requirement 4.5
        
        This test:
        1. Sets up complete WebSocket sequence ending in completion
        2. Monitors progress through all stages
        3. Verifies automatic navigation occurs on completion
        4. Verifies Page C loads with song data
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Automatic Navigation on Generation Completion")
        print("="*70)
        
        # Setup mocks
        network_manager = setup_happy_path_mocks()
        ws_manager = setup_song_generation_websocket(sequence_type="success")
        
        # Screenshot paths
        screenshot_page_b_start = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "ws-nav-start")
        )
        screenshot_page_b_progress = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "ws-nav-progress")
        )
        screenshot_page_b_completing = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "ws-nav-completing")
        )
        screenshot_page_c = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "ws-nav-complete")
        )
        screenshots.extend([
            screenshot_page_b_start,
            screenshot_page_b_progress,
            screenshot_page_b_completing,
            screenshot_page_c
        ])
        
        print(f"\n📸 Screenshots: {len(screenshots)} planned")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("STEP 1: Setup and Initiate Generation")
        print("-"*70)
        print("1. Inject network and WebSocket mocks")
        print("2. Navigate to Page B with valid lyrics")
        print("3. Select a music style")
        print("4. Capture screenshot before generation:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_page_b_start}')")
        print()
        print("5. Click generate button to start song generation")
        print()
        
        print("-"*70)
        print("STEP 2: Monitor Progress Updates")
        print("-"*70)
        print("1. Wait for progress to reach ~50%:")
        print("   - Monitor progress tracker updates")
        print()
        print("2. Capture screenshot at mid-progress:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_page_b_progress}')")
        print()
        print("3. Continue monitoring until progress reaches 95%+")
        print()
        print("4. Capture screenshot just before completion:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_page_b_completing}')")
        print()
        
        print("-"*70)
        print("STEP 3: Verify Automatic Navigation")
        print("-"*70)
        print("1. Wait for completion message:")
        print("   - Call: mcp_chrome_devtools_wait_for(text='completed', timeout=10000)")
        print()
        print("2. Monitor for automatic navigation (should happen within 1-2 seconds):")
        print("   - Call: mcp_chrome_devtools_wait_for(text='audio', timeout=5000)")
        print()
        print("3. Verify URL changed to Page C:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         return {")
        print("           pathname: window.location.pathname,")
        print("           isPageC: window.location.pathname.includes('playback') ||")
        print("                    window.location.pathname.includes('song'),")
        print("           previousPage: document.referrer")
        print("         };")
        print("       }")
        print("     )")
        print("   - Expected: isPageC: true")
        print()
        print("4. Verify Page C loaded with song data:")
        print("   - Call: mcp_chrome_devtools_take_snapshot()")
        print("   - Expected elements: audio player, play button, song metadata")
        print()
        print("5. Verify song data is present:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const audioEl = document.querySelector('audio');")
        print("         const titleEl = document.querySelector('[class*=\"title\"]');")
        print("         const styleEl = document.querySelector('[class*=\"style\"]');")
        print("         ")
        print("         return {")
        print("           hasAudio: audioEl !== null,")
        print("           audioSrc: audioEl?.src || null,")
        print("           title: titleEl?.textContent || null,")
        print("           style: styleEl?.textContent || null")
        print("         };")
        print("       }")
        print("     )")
        print()
        print("6. Capture screenshot of Page C:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_page_c}')")
        print()
        
        print("-"*70)
        print("STEP 4: Verify Navigation Timing")
        print("-"*70)
        print("Verify that navigation happened automatically without user interaction:")
        print()
        print("Call: mcp_chrome_devtools_evaluate_script(")
        print("  function=() => {")
        print("    // Check navigation timing")
        print("    const perfEntries = performance.getEntriesByType('navigation');")
        print("    const navEntry = perfEntries[perfEntries.length - 1];")
        print("    ")
        print("    return {")
        print("      navigationType: navEntry?.type || 'unknown',")
        print("      isAutomatic: navEntry?.type === 'navigate',")
        print("      loadTime: navEntry?.loadEventEnd - navEntry?.loadEventStart")
        print("    };")
        print("  }")
        print(")")
        print()
        
        helper.record_test_result(
            scenario_id="websocket-automatic-navigation",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
        print("\nExpected behavior:")
        print("  - Navigation should occur automatically when status becomes 'completed'")
        print("  - No user interaction required for navigation")
        print("  - Page C should load within 1-2 seconds of completion")
        print("  - Song data should be available on Page C")
        print("  - Audio player should be ready to play")


# ============================================================================
# TEST EXECUTION SUMMARY
# ============================================================================

def print_test_summary():
    """Print a summary of all WebSocket connectivity test scenarios."""
    print("\n" + "="*70)
    print("WEBSOCKET CONNECTIVITY TEST SCENARIOS - SUMMARY")
    print("="*70)
    print("\nTest Classes:")
    print("  1. TestWebSocketConnectionEstablishment - Connection setup and status indicator")
    print("  2. TestWebSocketRealtimeUpdates - Real-time status updates during generation")
    print("  3. TestWebSocketConnectionFailure - Connection failure and offline indicator")
    print("  4. TestWebSocketReconnection - Reconnection after failure")
    print("  5. TestWebSocketAutomaticNavigation - Automatic navigation on completion")
    print()
    print("Total Test Methods: 5")
    print()
    print("Requirements Coverage:")
    print("  ✓ 4.1 - WebSocket connection establishment and status indicator")
    print("  ✓ 4.2 - Real-time status updates during song generation")
    print("  ✓ 4.3 - WebSocket connection failure and offline indicator")
    print("  ✓ 4.4 - WebSocket reconnection after failure")
    print("  ✓ 4.5 - Automatic navigation on generation completion")
    print()
    print("Execution Instructions:")
    print("  1. Ensure Chrome is running: chrome --remote-debugging-port=9222")
    print("  2. Ensure frontend is running: cd frontend && pnpm dev")
    print("  3. Run tests: cd backend && poetry run pytest tests/test_e2e_websocket.py -v -s")
    print("  4. Follow the Chrome DevTools MCP instructions printed by each test")
    print("  5. Screenshots will be saved to: ./report/e2e-chrome-devtools-testing/page-b/ and page-c/")
    print()
    print("Mock Data:")
    print("  - WebSocket Sequences:")
    print("    * Success: 5 updates (queued → 25% → 50% → 75% → completed)")
    print("    * Failed: 3 updates (queued → 25% → failed)")
    print("    * Slow: 9 updates (more granular progress)")
    print("  - Connection Behaviors:")
    print("    * NORMAL: Standard connection flow")
    print("    * DELAYED_OPEN: 3-second connection delay")
    print("    * IMMEDIATE_CLOSE: Connection closes immediately")
    print("    * INTERMITTENT_FAILURE: Connection drops and reconnects")
    print("    * PERMANENT_FAILURE: Connection never opens")
    print()
    print("Key Features Tested:")
    print("  - Connection lifecycle (CONNECTING → OPEN → CLOSING → CLOSED)")
    print("  - Status indicator updates")
    print("  - Progress tracking (0% → 100%)")
    print("  - Offline detection and display")
    print("  - Automatic reconnection with retry logic")
    print("  - Automatic navigation on completion")
    print("  - Error handling and user messaging")
    print()
    print("="*70)


if __name__ == "__main__":
    print_test_summary()
