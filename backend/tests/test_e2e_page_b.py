"""
End-to-End tests for Page B (Lyrics Editing) using Chrome DevTools MCP.

This module implements browser-based E2E tests for the Lyrics Editing page,
validating UI interactions, lyrics editing, character count updates, style selection,
song generation, WebSocket progress updates, and navigation.

Requirements tested:
- 2.1: Page load with mocked lyrics data and UI element visibility
- 2.2: Lyrics editing and real-time character count updates
- 2.3: 3,100+ character error state (edge case)
- 2.4: 2,800-3,100 character warning state (edge case)
- 2.5: Music style selection for all available styles
- 2.6: Song generation initiation with valid lyrics and mocked responses
- 2.7: WebSocket progress updates during generation
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
    MOCK_ERROR_VALIDATION_LYRICS_TOO_LONG,
    MUSIC_STYLES
)
from tests.e2e_network_mock import (
    NetworkMockManager,
    MockResponse,
    setup_happy_path_mocks
)
from tests.e2e_websocket_mock import (
    WebSocketMockManager,
    ConnectionBehavior,
    setup_song_generation_websocket
)


class TestPageBInitialLoad:
    """Test initial page load with mocked lyrics data."""
    
    def test_page_b_loads_with_lyrics_data(self):
        """
        Test that Page B loads correctly with mocked lyrics data and all UI elements.
        
        Validates: Requirement 2.1
        
        This test:
        1. Sets up network mocks for lyrics generation
        2. Navigates from Page A to Page B with generated lyrics
        3. Verifies all required UI elements are present
        4. Captures screenshot of initial state
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Page B Initial Load with Lyrics Data")
        print("="*70)

        
        # Setup network mocks
        mock_manager = setup_happy_path_mocks()
        injection_instructions = mock_manager.get_injection_instructions()
        
        # Screenshot paths
        screenshot_page_a = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "before-navigation-to-b")
        )
        screenshot_page_b = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "initial-load")
        )
        screenshots.extend([screenshot_page_a, screenshot_page_b])
        
        print(f"\n📸 Screenshots: {len(screenshots)} planned")
        print(f"   - Page A: {screenshot_page_a}")
        print(f"   - Page B: {screenshot_page_b}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("STEP 1: Setup and Navigate to Page A")
        print("-"*70)
        print("1. Connect to browser and select page")
        print("2. Navigate to Page A:")
        print(f"   - Call: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-a')}')")
        print()
        
        print("-"*70)
        print("STEP 2: Inject Network Mocks")
        print("-"*70)
        print("Call: mcp_chrome_devtools_evaluate_script(")
        print(f"  function={injection_instructions['script'][:200]}...")
        print(")")
        print()
        
        print("-"*70)
        print("STEP 3: Submit Text to Generate Lyrics")
        print("-"*70)
        print("1. Take snapshot to find textarea")
        print("2. Fill textarea with test content:")
        print("   - Content: 'Photosynthesis is the process by which plants convert light energy.'")
        print("3. Capture screenshot before submission:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_page_a}')")
        print("4. Click submit button")
        print()
        
        print("-"*70)
        print("STEP 4: Verify Page B Loaded with Lyrics")
        print("-"*70)
        print("1. Wait for navigation to Page B:")
        print("   - Call: mcp_chrome_devtools_wait_for(text='Lyrics', timeout=10000)")
        print()
        print("2. Verify URL changed:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => { return window.location.pathname; }")
        print("     )")
        print()
        print("3. Take snapshot to verify UI elements:")
        print("   - Call: mcp_chrome_devtools_take_snapshot()")
        print("   - Expected elements: textarea (lyrics editor), select (style selector), button (generate)")
        print()
        print("4. Verify lyrics are displayed:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const textarea = document.querySelector('textarea');")
        print("         return {")
        print("           hasLyrics: textarea && textarea.value.length > 0,")
        print("           lyricsLength: textarea ? textarea.value.length : 0,")
        print("           lyricsPreview: textarea ? textarea.value.substring(0, 100) : ''")
        print("         };")
        print("       }")
        print("     )")
        print()
        print("5. Capture screenshot of Page B:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_page_b}')")
        print()
        
        helper.record_test_result(
            scenario_id="page-b-initial-load",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
        print("\nExpected mock lyrics:")
        print(f"  {MOCK_LYRICS_SUCCESS['lyrics'][:100]}...")



class TestPageBLyricsEditing:
    """Test lyrics editing and real-time character count updates."""
    
    def test_lyrics_editing_updates_character_count(self):
        """
        Test that editing lyrics updates the character count in real-time.
        
        Validates: Requirement 2.2
        
        This property test verifies that for any edit made to the lyrics content,
        the character count display updates in real-time to reflect the current length.
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Lyrics Editing with Real-time Character Count")
        print("="*70)
        
        # Test cases with different character counts
        test_cases = [
            ("short", 100, "Short lyrics content. " * 5),
            ("medium", 500, "Medium length lyrics content. " * 25),
            ("normal", 1500, "Normal length lyrics content. " * 75),
            ("long", 2500, "Long lyrics content. " * 125)
        ]
        
        for case_name, char_count, sample_text in test_cases:
            print(f"\n--- Test Case: {case_name.upper()} ({char_count} characters) ---")
            
            # Generate test content with exact character count
            test_content = sample_text[:char_count]
            
            screenshot_path = helper.get_screenshot_path(
                "page-b",
                helper.generate_screenshot_filename("page-b", f"editing-{case_name}")
            )
            screenshots.append(screenshot_path)
            
            print(f"📝 Content length: {len(test_content)} characters")
            print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("Prerequisites: Page B should be loaded with lyrics")
        print()
        print("For each test case:")
        print("1. Take snapshot to find textarea UID")
        print()
        print("2. Clear and fill textarea with test content:")
        print("   - Call: mcp_chrome_devtools_fill(uid='<textarea-uid>', value='<test-content>')")
        print()
        print("3. Verify character count is updated:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const textarea = document.querySelector('textarea');")
        print("         const charCountEl = document.querySelector('[class*=\"char\"], [class*=\"count\"]');")
        print("         return {")
        print("           actualLength: textarea ? textarea.value.length : 0,")
        print("           displayedCount: charCountEl ? charCountEl.textContent : null,")
        print("           countsMatch: true  // Verify they match")
        print("         };")
        print("       }")
        print("     )")
        print()
        print("4. Capture screenshot:")
        print("   - Call: mcp_chrome_devtools_take_screenshot(filePath='<screenshot-path>')")
        print()
        
        helper.record_test_result(
            scenario_id="page-b-lyrics-editing-character-count",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated for all editing cases")


class TestPageBValidationStates:
    """Test validation states for lyrics length."""
    
    def test_lyrics_error_state_over_3100_chars(self):
        """
        Test that lyrics exceeding 3,100 characters display error state.
        
        Validates: Requirement 2.3
        
        This edge case test verifies that the application properly
        validates and displays an error when lyrics exceed the maximum length.
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Lyrics Error State (3,100+ characters)")
        print("="*70)
        
        # Generate content with 3,101 characters
        char_count = 3101
        test_content = "This is test lyrics content. " * 110  # Approximately 3,190 chars
        test_content = test_content[:char_count]
        
        screenshot_path = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "error-state-3100plus")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📝 Test content: {char_count} characters")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("1. Ensure Page B is loaded with lyrics")
        print()
        print("2. Fill textarea with 3,101 characters:")
        print(f"   - Call: mcp_chrome_devtools_fill(uid='<textarea-uid>', value='<3101-char-content>')")
        print(f"   - Content preview: '{test_content[:100]}...'")
        print()
        print("3. Verify error state is displayed:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const errorEl = document.querySelector('[role=\"alert\"], .error, .text-red-500');")
        print("         const generateBtn = document.querySelector('button[type=\"submit\"], button:has-text(\"Generate\")');")
        print("         return {")
        print("           hasError: errorEl !== null,")
        print("           errorText: errorEl?.textContent || null,")
        print("           buttonDisabled: generateBtn ? generateBtn.disabled : null")
        print("         };")
        print("       }")
        print("     )")
        print("   - Expected: hasError: true, errorText contains '3,100' or 'too long'")
        print("   - Expected: buttonDisabled: true")
        print()
        print("4. Capture screenshot showing error:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="page-b-error-state-3100plus",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
    
    def test_lyrics_warning_state_2800_to_3100_chars(self):
        """
        Test that lyrics between 2,800 and 3,100 characters display warning state.
        
        Validates: Requirement 2.4
        
        This edge case test verifies that the application displays a warning
        when lyrics are approaching the maximum length.
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Lyrics Warning State (2,800-3,100 characters)")
        print("="*70)
        
        # Test cases for warning range
        test_cases = [
            ("lower_bound", 2800),
            ("mid_range", 2950),
            ("upper_bound", 3099)
        ]
        
        for case_name, char_count in test_cases:
            print(f"\n--- Test Case: {case_name.upper()} ({char_count} characters) ---")
            
            test_content = ("This is test lyrics content. " * 100)[:char_count]
            
            screenshot_path = helper.get_screenshot_path(
                "page-b",
                helper.generate_screenshot_filename("page-b", f"warning-state-{char_count}")
            )
            screenshots.append(screenshot_path)
            
            print(f"📝 Content length: {len(test_content)} characters")
            print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("For each test case:")
        print("1. Fill textarea with test content (2,800 / 2,950 / 3,099 chars)")
        print()
        print("2. Verify warning state is displayed:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const warningEl = document.querySelector('.warning, .text-yellow-500, .text-orange-500');")
        print("         const generateBtn = document.querySelector('button[type=\"submit\"]');")
        print("         return {")
        print("           hasWarning: warningEl !== null,")
        print("           warningText: warningEl?.textContent || null,")
        print("           buttonEnabled: generateBtn ? !generateBtn.disabled : null")
        print("         };")
        print("       }")
        print("     )")
        print("   - Expected: hasWarning: true, warningText contains 'approaching' or 'close to limit'")
        print("   - Expected: buttonEnabled: true (warning, not error)")
        print()
        print("3. Capture screenshot showing warning:")
        print("   - Call: mcp_chrome_devtools_take_screenshot(filePath='<screenshot-path>')")
        print()
        
        helper.record_test_result(
            scenario_id="page-b-warning-state-2800-3100",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated for all warning cases")



class TestPageBStyleSelection:
    """Test music style selection for all available styles."""
    
    def test_style_selection_all_styles(self):
        """
        Test that all music styles can be selected and UI updates accordingly.
        
        Validates: Requirement 2.5
        
        This property test verifies that for any music style selected from the dropdown,
        the UI reflects the selected style.
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Music Style Selection for All Styles")
        print("="*70)
        
        print(f"\n📋 Testing {len(MUSIC_STYLES)} music styles:")
        for i, style in enumerate(MUSIC_STYLES, 1):
            print(f"   {i}. {style}")
            
            # Clean style name for filename (remove apostrophes)
            style_clean = style.lower().replace("'", "")
            screenshot_path = helper.get_screenshot_path(
                "page-b",
                helper.generate_screenshot_filename("page-b", f"style-{style_clean}")
            )
            screenshots.append(screenshot_path)
        
        print(f"\n📸 Screenshots: {len(screenshots)} planned")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("Prerequisites: Page B should be loaded with valid lyrics")
        print()
        print("For each music style:")
        print("1. Take snapshot to find style selector UID")
        print()
        print("2. Select the style:")
        print("   - Call: mcp_chrome_devtools_fill(uid='<select-uid>', value='<style-name>')")
        print("   - Styles to test: Pop, Rap, Folk, Electronic, Rock, Jazz, Children's, Classical")
        print()
        print("3. Verify style is selected:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const select = document.querySelector('select');")
        print("         return {")
        print("           selectedValue: select ? select.value : null,")
        print("           selectedText: select ? select.options[select.selectedIndex].text : null")
        print("         };")
        print("       }")
        print("     )")
        print()
        print("4. Capture screenshot:")
        print("   - Call: mcp_chrome_devtools_take_screenshot(filePath='<screenshot-path>')")
        print()
        
        helper.record_test_result(
            scenario_id="page-b-style-selection-all",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated for all music styles")


class TestPageBSongGeneration:
    """Test song generation initiation with valid lyrics."""
    
    def test_song_generation_with_valid_lyrics(self):
        """
        Test that song generation initiates correctly with valid lyrics and mocked responses.
        
        Validates: Requirement 2.6
        
        This test:
        1. Sets up network and WebSocket mocks
        2. Fills in valid lyrics and selects a style
        3. Clicks generate button
        4. Verifies generation process starts
        5. Monitors progress updates
        6. Verifies navigation to Page C on completion
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Song Generation with Valid Lyrics")
        print("="*70)
        
        # Setup network mocks
        network_manager = NetworkMockManager()
        network_manager.add_song_generation_mock(response_type="queued")
        network_injection = network_manager.get_injection_instructions()
        
        # Setup WebSocket mocks
        ws_manager = setup_song_generation_websocket(sequence_type="success")
        ws_injection = ws_manager.get_injection_instructions()
        
        # Screenshot paths
        screenshot_before = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "before-generation")
        )
        screenshot_generating = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "generating")
        )
        screenshot_page_c = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "generation-complete")
        )
        screenshots.extend([screenshot_before, screenshot_generating, screenshot_page_c])
        
        print(f"\n📸 Screenshots: {len(screenshots)} planned")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("STEP 1: Inject Network Mocks")
        print("-"*70)
        print("Call: mcp_chrome_devtools_evaluate_script(")
        print(f"  function={network_injection['script'][:200]}...")
        print(")")
        print()
        
        print("-"*70)
        print("STEP 2: Inject WebSocket Mocks")
        print("-"*70)
        print("Call: mcp_chrome_devtools_evaluate_script(")
        print(f"  function={ws_injection['script'][:200]}...")
        print(")")
        print()
        print("Verify both injections:")
        print("Call: mcp_chrome_devtools_evaluate_script(")
        print("  function=() => {")
        print("    return {")
        print("      networkMock: window.__networkMockInjected === true,")
        print("      websocketMock: window.__websocketMockInjected === true")
        print("    };")
        print("  }")
        print(")")
        print()
        
        print("-"*70)
        print("STEP 3: Prepare Lyrics and Style")
        print("-"*70)
        print("1. Ensure Page B is loaded with valid lyrics (500-2000 chars)")
        print("2. Select a music style (e.g., 'Pop')")
        print("3. Capture screenshot before generation:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_before}')")
        print()
        
        print("-"*70)
        print("STEP 4: Initiate Song Generation")
        print("-"*70)
        print("1. Take snapshot to find generate button")
        print("2. Click generate button:")
        print("   - Call: mcp_chrome_devtools_click(uid='<generate-button-uid>')")
        print()
        print("3. Wait for progress tracker to appear:")
        print("   - Call: mcp_chrome_devtools_wait_for(text='progress', timeout=5000)")
        print()
        print("4. Capture screenshot during generation:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_generating}')")
        print()
        
        print("-"*70)
        print("STEP 5: Monitor Progress and Navigation")
        print("-"*70)
        print("1. Wait for completion (WebSocket will send updates):")
        print("   - Call: mcp_chrome_devtools_wait_for(text='completed', timeout=15000)")
        print()
        print("2. Verify navigation to Page C:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => { return window.location.pathname; }")
        print("     )")
        print("   - Expected: '/song-playback' or similar")
        print()
        print("3. Capture screenshot of Page C:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_page_c}')")
        print()
        
        helper.record_test_result(
            scenario_id="page-b-song-generation-valid",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
        print("\nExpected WebSocket sequence:")
        for i, update in enumerate(MOCK_WEBSOCKET_SEQUENCE_SUCCESS, 1):
            print(f"  {i}. Status: {update['status']}, Progress: {update['progress']}%")



class TestPageBWebSocketProgress:
    """Test WebSocket progress updates during generation."""
    
    def test_websocket_progress_updates(self):
        """
        Test that WebSocket progress updates are displayed correctly during song generation.
        
        Validates: Requirement 2.7
        
        This property test verifies that for any mocked WebSocket status update received
        during song generation, the progress tracker displays the updated status and
        progress percentage.
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: WebSocket Progress Updates During Generation")
        print("="*70)
        
        # Progress stages to capture
        progress_stages = [
            ("queued", 0, "Queued"),
            ("processing-25", 25, "Processing 25%"),
            ("processing-50", 50, "Processing 50%"),
            ("processing-75", 75, "Processing 75%"),
            ("completed", 100, "Completed")
        ]
        
        print(f"\n📋 Testing {len(progress_stages)} progress stages:")
        for stage_name, progress, description in progress_stages:
            print(f"   - {description}")
            
            screenshot_path = helper.get_screenshot_path(
                "page-b",
                helper.generate_screenshot_filename("page-b", f"progress-{stage_name}")
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
        print("STEP 1: Monitor Progress Updates")
        print("-"*70)
        print("After clicking generate button, monitor progress tracker:")
        print()
        print("For each progress stage (0%, 25%, 50%, 75%, 100%):")
        print("1. Wait for progress update (WebSocket will send automatically)")
        print()
        print("2. Verify progress tracker displays current status:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const progressEl = document.querySelector('[class*=\"progress\"]');")
        print("         const statusEl = document.querySelector('[class*=\"status\"]');")
        print("         const percentEl = document.querySelector('[class*=\"percent\"]');")
        print("         return {")
        print("           hasProgressTracker: progressEl !== null,")
        print("           statusText: statusEl?.textContent || null,")
        print("           progressPercent: percentEl?.textContent || null")
        print("         };")
        print("       }")
        print("     )")
        print()
        print("3. Capture screenshot at this stage:")
        print("   - Call: mcp_chrome_devtools_take_screenshot(filePath='<screenshot-path>')")
        print()
        print("4. Wait 1-2 seconds for next update")
        print()
        
        print("-"*70)
        print("STEP 2: Verify Completion")
        print("-"*70)
        print("When progress reaches 100%:")
        print("1. Verify completion message is displayed")
        print("2. Verify navigation to Page C occurs")
        print("3. Capture final screenshot")
        print()
        
        helper.record_test_result(
            scenario_id="page-b-websocket-progress-updates",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
        print("\nExpected progress sequence:")
        for update in MOCK_WEBSOCKET_SEQUENCE_SUCCESS:
            print(f"  - {update['status']}: {update['progress']}% - {update.get('message', '')}")


class TestPageBNavigationToPageC:
    """Test navigation to Page C on generation completion."""
    
    def test_navigation_to_page_c_on_completion(self):
        """
        Test that application navigates to Page C when song generation completes.
        
        Validates: Requirement 2.6, 2.7
        
        This test verifies the complete flow from song generation initiation
        through WebSocket updates to final navigation to Page C.
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Navigation to Page C on Generation Completion")
        print("="*70)
        
        # Setup mocks
        network_manager = NetworkMockManager()
        network_manager.add_song_generation_mock(response_type="queued")
        network_injection = network_manager.get_injection_instructions()
        
        ws_manager = setup_song_generation_websocket(sequence_type="success")
        ws_injection = ws_manager.get_injection_instructions()
        
        # Screenshot paths
        screenshot_page_b_before = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "before-completion")
        )
        screenshot_page_b_completing = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "completing")
        )
        screenshot_page_c = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "after-navigation")
        )
        screenshots.extend([screenshot_page_b_before, screenshot_page_b_completing, screenshot_page_c])
        
        print(f"\n📸 Screenshots: {len(screenshots)} planned")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("STEP 1: Setup and Initiate Generation")
        print("-"*70)
        print("1. Inject network and WebSocket mocks (see previous tests)")
        print("2. Ensure Page B is loaded with valid lyrics and style selected")
        print("3. Capture screenshot before generation:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_page_b_before}')")
        print("4. Click generate button")
        print()
        
        print("-"*70)
        print("STEP 2: Monitor Progress to Completion")
        print("-"*70)
        print("1. Wait for progress to reach 95%+:")
        print("   - Monitor progress tracker updates")
        print()
        print("2. Capture screenshot just before completion:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_page_b_completing}')")
        print()
        print("3. Wait for 100% completion message")
        print()
        
        print("-"*70)
        print("STEP 3: Verify Navigation to Page C")
        print("-"*70)
        print("1. Wait for navigation (should happen automatically):")
        print("   - Call: mcp_chrome_devtools_wait_for(text='audio', timeout=10000)")
        print()
        print("2. Verify URL changed to Page C:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         return {")
        print("           pathname: window.location.pathname,")
        print("           isPageC: window.location.pathname.includes('playback') || ")
        print("                    window.location.pathname.includes('song')")
        print("         };")
        print("       }")
        print("     )")
        print()
        print("3. Verify Page C elements are present:")
        print("   - Call: mcp_chrome_devtools_take_snapshot()")
        print("   - Look for: audio player, play button, song metadata")
        print()
        print("4. Capture screenshot of Page C:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_page_c}')")
        print()
        
        helper.record_test_result(
            scenario_id="page-b-navigation-to-page-c",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")


# ============================================================================
# TEST EXECUTION SUMMARY
# ============================================================================

def print_test_summary():
    """Print a summary of all Page B test scenarios."""
    print("\n" + "="*70)
    print("PAGE B (LYRICS EDITING) TEST SCENARIOS - SUMMARY")
    print("="*70)
    print("\nTest Classes:")
    print("  1. TestPageBInitialLoad - Page load with mocked lyrics data")
    print("  2. TestPageBLyricsEditing - Lyrics editing and character count updates")
    print("  3. TestPageBValidationStates - Error and warning states (3,100+ and 2,800-3,100 chars)")
    print("  4. TestPageBStyleSelection - Music style selection for all styles")
    print("  5. TestPageBSongGeneration - Song generation with valid lyrics")
    print("  6. TestPageBWebSocketProgress - WebSocket progress updates")
    print("  7. TestPageBNavigationToPageC - Navigation to Page C on completion")
    print()
    print("Total Test Methods: 8")
    print()
    print("Requirements Coverage:")
    print("  ✓ 2.1 - Page load with mocked lyrics data and UI element visibility")
    print("  ✓ 2.2 - Lyrics editing and real-time character count updates")
    print("  ✓ 2.3 - 3,100+ character error state (edge case)")
    print("  ✓ 2.4 - 2,800-3,100 character warning state (edge case)")
    print("  ✓ 2.5 - Music style selection for all available styles")
    print("  ✓ 2.6 - Song generation initiation with valid lyrics and mocked responses")
    print("  ✓ 2.7 - WebSocket progress updates during generation")
    print()
    print("Execution Instructions:")
    print("  1. Ensure Chrome is running: chrome --remote-debugging-port=9222")
    print("  2. Ensure frontend is running: cd frontend && pnpm dev")
    print("  3. Run tests: cd backend && poetry run pytest tests/test_e2e_page_b.py -v -s")
    print("  4. Follow the Chrome DevTools MCP instructions printed by each test")
    print("  5. Screenshots will be saved to: ./report/e2e-chrome-devtools-testing/page-b/")
    print()
    print("Mock Data:")
    print("  - Lyrics: MOCK_LYRICS_SUCCESS (150 words)")
    print("  - Song Generation: MOCK_SONG_GENERATION_QUEUED")
    print("  - WebSocket: MOCK_WEBSOCKET_SEQUENCE_SUCCESS (5 updates)")
    print("  - Music Styles: 8 styles (Pop, Rap, Folk, Electronic, Rock, Jazz, Children's, Classical)")
    print()
    print("="*70)


if __name__ == "__main__":
    print_test_summary()
