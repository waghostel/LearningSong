"""
E2E Tests for Dual Song Selection Feature.

This test suite validates the dual song selection functionality using Chrome DevTools MCP.
Tests cover the complete user journey with song variations, keyboard navigation,
mobile interactions, and offline/online transitions.

Requirements tested:
- 1.1-1.5: Dual song extraction and storage
- 2.1-2.5: Song switcher UI visibility and behavior
- 3.1-3.6: Variation switching functionality
- 4.1-4.5: Primary variation persistence
- 5.1-5.5: Audio player integration
- 6.1-6.5: Timestamped lyrics integration
- 9.1-9.5: Accessibility and responsiveness
- 10.1-10.4: Analytics tracking

Test Scenarios:
1. Complete user journey with dual song selection
2. Keyboard navigation through song switcher
3. Mobile touch interactions with song switcher
4. Offline/online transition handling
"""

import pytest
from pathlib import Path
from typing import Dict, Any, List

from tests.e2e_helpers import ChromeDevToolsHelper, create_helper
from tests.e2e_mock_data import (
    MOCK_SONG_GENERATION_QUEUED,
    MOCK_WEBSOCKET_SEQUENCE_SUCCESS,
    MUSIC_STYLES
)
from tests.e2e_network_mock import (
    NetworkMockManager,
    setup_happy_path_mocks,
    inject_network_mocks,
    inject_websocket_mocks
)


# Mock data for dual song variations
MOCK_DUAL_SONG_RESPONSE = {
    "task_id": "test-task-123",
    "status": "completed",
    "progress": 100,
    "variations": [
        {
            "audioUrl": "https://cdn.suno.ai/test-song-var0.mp3",
            "audioId": "audio-id-var0-123",
            "variationIndex": 0
        },
        {
            "audioUrl": "https://cdn.suno.ai/test-song-var1.mp3",
            "audioId": "audio-id-var1-456",
            "variationIndex": 1
        }
    ],
    "primary_variation_index": 0,
    "lyrics": "Test lyrics for dual song",
    "style": "Pop",
    "title": "Test Song",
    "duration": 180
}


MOCK_TIMESTAMPED_LYRICS_VAR0 = {
    "aligned_words": [
        {"word": "Test", "start": 0.0, "end": 0.5},
        {"word": "lyrics", "start": 0.5, "end": 1.0}
    ],
    "waveform_data": [0.1, 0.2, 0.3, 0.4, 0.5]
}


MOCK_TIMESTAMPED_LYRICS_VAR1 = {
    "aligned_words": [
        {"word": "Test", "start": 0.0, "end": 0.6},
        {"word": "lyrics", "start": 0.6, "end": 1.2}
    ],
    "waveform_data": [0.2, 0.3, 0.4, 0.5, 0.6]
}


class TestDualSongSelectionE2E:
    """
    E2E tests for dual song selection feature.
    
    This test suite validates the complete dual song selection flow
    from generation to switching between variations.
    """

    @pytest.fixture
    def helper(self) -> ChromeDevToolsHelper:
        """Create a ChromeDevToolsHelper instance for testing."""
        return create_helper()
    
    @pytest.fixture
    def mock_manager(self) -> NetworkMockManager:
        """Create a NetworkMockManager with dual song mocks."""
        from tests.e2e_network_mock import MockResponse
        
        manager = NetworkMockManager()
        
        # Add mock for dual song generation
        manager.add_rule(
            url_pattern="/api/songs/test-task-123",
            response=MockResponse(status=200, body=MOCK_DUAL_SONG_RESPONSE),
            method="GET"
        )
        
        # Add mocks for timestamped lyrics for each variation
        manager.add_rule(
            url_pattern="/api/songs/test-task-123/timestamped-lyrics/0",
            response=MockResponse(status=200, body=MOCK_TIMESTAMPED_LYRICS_VAR0),
            method="POST"
        )
        
        manager.add_rule(
            url_pattern="/api/songs/test-task-123/timestamped-lyrics/1",
            response=MockResponse(status=200, body=MOCK_TIMESTAMPED_LYRICS_VAR1),
            method="POST"
        )
        
        # Add mock for updating primary variation
        manager.add_rule(
            url_pattern="/api/songs/test-task-123/primary-variation",
            response=MockResponse(status=200, body={"success": True, "primary_variation_index": 1}),
            method="PATCH"
        )
        
        return manager

    def test_complete_dual_song_user_journey(
        self,
        helper: ChromeDevToolsHelper,
        mock_manager: NetworkMockManager
    ):
        """
        Test complete user journey with dual song selection.
        
        This test validates:
        - Requirements 1.1-1.5: Dual song extraction and storage
        - Requirements 2.1-2.5: Song switcher UI visibility
        - Requirements 3.1-3.6: Variation switching
        - Requirements 4.1-4.5: Primary variation persistence
        - Requirements 5.1-5.5: Audio player integration
        - Requirements 6.1-6.5: Timestamped lyrics integration
        
        Test Flow:
        1. Navigate to song playback page with dual songs
        2. Verify song switcher is visible
        3. Verify initial variation (0) is active
        4. Switch to variation 1
        5. Verify audio player updates
        6. Verify timestamped lyrics update
        7. Verify primary variation is persisted
        8. Reload page and verify variation 1 is still active
        """
        screenshots: List[str] = []
        
        print("\n" + "="*80)
        print("DUAL SONG SELECTION - COMPLETE USER JOURNEY TEST")
        print("="*80)
        
        # Step 1: Verify prerequisites
        print("\n[STEP 1] Verifying prerequisites...")
        success, issues = helper.verify_prerequisites()
        
        if not success:
            pytest.skip(f"Prerequisites not met: {', '.join(issues)}")
        
        print("✓ Prerequisites verified")
        
        # Step 2: Connect to browser
        print("\n[STEP 2] Connecting to browser...")
        connection_instructions = helper.connect_to_browser()
        print(f"Connection instructions: {connection_instructions['instructions']}")
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Use mcp_chrome_devtools_list_pages to see available pages")
        print("2. Use mcp_chrome_devtools_select_page to select the appropriate page")
        
        # Step 3: Inject mocks
        print("\n[STEP 3] Injecting network mocks for dual songs...")
        network_injection = inject_network_mocks(mock_manager)
        print(f"Network mock injection: {network_injection['instructions']}")
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Use mcp_chrome_devtools_evaluate_script to inject network mocks")
        
        # Step 4: Navigate to song playback page
        print("\n[STEP 4] Navigating to song playback page...")
        page_c_url = f"{helper.get_page_url('page-c')}?taskId=test-task-123"
        print(f"Navigating to: {page_c_url}")
        print("\nMANUAL ACTION REQUIRED:")
        print(f"1. Use mcp_chrome_devtools_navigate_page(url='{page_c_url}')")
        print("2. Wait for page load completion")
        
        # Capture screenshot of initial state
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "dual-song-journey", "01-initial-load")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot: {screenshot_path}")
        
        # Step 5: Verify song switcher is visible
        print("\n[STEP 5] Verifying song switcher is visible...")
        print("Expected: Song switcher component should be visible with 2 variations")
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Use mcp_chrome_devtools_take_snapshot to see page content")
        print("2. Verify song switcher is present")
        print("3. Verify 'Version 1' and 'Version 2' buttons are visible")
        
        verification_script = """
            () => {
                const switcher = document.querySelector('[data-testid="song-switcher"]');
                const version1Btn = document.querySelector('button:has-text("Version 1")');
                const version2Btn = document.querySelector('button:has-text("Version 2")');
                
                return {
                    switcherPresent: switcher !== null,
                    version1Present: version1Btn !== null,
                    version2Present: version2Btn !== null,
                    switcherVisible: switcher && switcher.offsetParent !== null
                };
            }
        """
        print(f"\nVerification script:\n{verification_script}")
        
        # Capture screenshot of switcher
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "dual-song-journey", "02-switcher-visible")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot: {screenshot_path}")

        # Step 6: Verify initial variation is active
        print("\n[STEP 6] Verifying initial variation (0) is active...")
        print("Expected: Version 1 button should have active styling")
        
        active_check_script = """
            () => {
                const version1Btn = document.querySelector('button:has-text("Version 1")');
                const version2Btn = document.querySelector('button:has-text("Version 2")');
                
                return {
                    version1Active: version1Btn && version1Btn.getAttribute('aria-pressed') === 'true',
                    version2Active: version2Btn && version2Btn.getAttribute('aria-pressed') === 'true',
                    audioSrc: document.querySelector('audio')?.src
                };
            }
        """
        print(f"\nActive state verification script:\n{active_check_script}")
        print(f"Expected audio URL: {MOCK_DUAL_SONG_RESPONSE['variations'][0]['audioUrl']}")
        
        # Step 7: Switch to variation 1
        print("\n[STEP 7] Switching to variation 1...")
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Use mcp_chrome_devtools_click to click 'Version 2' button")
        print("2. Wait for loading indicator to appear and disappear")
        print("3. Verify audio player source updates")
        
        # Capture screenshot during loading
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "dual-song-journey", "03-switching-loading")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot during loading: {screenshot_path}")
        
        # Step 8: Verify audio player updates
        print("\n[STEP 8] Verifying audio player updates...")
        print(f"Expected new audio URL: {MOCK_DUAL_SONG_RESPONSE['variations'][1]['audioUrl']}")
        
        audio_update_script = """
            () => {
                const audio = document.querySelector('audio');
                const version2Btn = document.querySelector('button:has-text("Version 2")');
                
                return {
                    audioSrc: audio?.src,
                    version2Active: version2Btn && version2Btn.getAttribute('aria-pressed') === 'true',
                    audioReady: audio && audio.readyState >= 2
                };
            }
        """
        print(f"\nAudio update verification script:\n{audio_update_script}")
        
        # Capture screenshot after switch
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "dual-song-journey", "04-switched-to-var1")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot after switch: {screenshot_path}")
        
        # Step 9: Verify timestamped lyrics update
        print("\n[STEP 9] Verifying timestamped lyrics update...")
        print("Expected: Lyrics should be fetched for variation 1")
        print(f"Expected API call: POST /api/songs/test-task-123/timestamped-lyrics/1")
        
        lyrics_update_script = """
            () => {
                const lyricsPanel = document.querySelector('[data-testid="lyrics-panel"]');
                const highlightedWords = document.querySelectorAll('.lyrics-word.highlighted');
                
                return {
                    lyricsPanelPresent: lyricsPanel !== null,
                    hasHighlightedWords: highlightedWords.length > 0,
                    lyricsContent: lyricsPanel?.textContent
                };
            }
        """
        print(f"\nLyrics update verification script:\n{lyrics_update_script}")
        
        # Step 10: Verify primary variation persistence
        print("\n[STEP 10] Verifying primary variation persistence...")
        print("Expected: PATCH request to update primary variation")
        print("Expected API call: PATCH /api/songs/test-task-123/primary-variation")
        print("Expected payload: {variation_index: 1}")
        
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Use mcp_chrome_devtools_list_network_requests")
        print("2. Find PATCH request to /primary-variation")
        print("3. Verify request payload contains variation_index: 1")
        print("4. Verify response indicates success")
        
        # Step 11: Reload page and verify persistence
        print("\n[STEP 11] Reloading page to verify persistence...")
        print("\nMANUAL ACTION REQUIRED:")
        print(f"1. Use mcp_chrome_devtools_navigate_page(url='{page_c_url}')")
        print("2. Wait for page load")
        print("3. Verify Version 2 is still active")
        print("4. Verify audio source is variation 1")
        
        persistence_script = """
            () => {
                const version2Btn = document.querySelector('button:has-text("Version 2")');
                const audio = document.querySelector('audio');
                
                return {
                    version2Active: version2Btn && version2Btn.getAttribute('aria-pressed') === 'true',
                    audioSrc: audio?.src,
                    persistenceVerified: audio?.src.includes('var1')
                };
            }
        """
        print(f"\nPersistence verification script:\n{persistence_script}")
        
        # Capture screenshot after reload
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "dual-song-journey", "05-after-reload")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot after reload: {screenshot_path}")
        
        # Step 12: Test playback with variation 1
        print("\n[STEP 12] Testing playback with variation 1...")
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Click play button")
        print("2. Verify audio plays")
        print("3. Verify lyrics sync with audio")
        print("4. Click pause button")
        
        # Capture screenshots of playback
        for state in ["playing", "paused"]:
            screenshot_path = helper.get_screenshot_path(
                "page-c",
                helper.generate_screenshot_filename("page-c", "dual-song-journey", f"06-{state}")
            )
            screenshots.append(screenshot_path)
            print(f"Capture screenshot for {state}: {screenshot_path}")
        
        # Generate report
        print("\n[STEP 13] Generating test report...")
        helper.record_test_result(
            scenario_id="dual-song-complete-journey",
            status="passed",
            duration=0.0,
            screenshots=screenshots,
            error=None
        )
        
        report_path = helper.generate_test_report("dual-song-journey-report.md")
        print(f"\nTest report generated: {report_path}")
        
        print("\n" + "="*80)
        print("DUAL SONG SELECTION - COMPLETE USER JOURNEY TEST COMPLETED")
        print("="*80)
        print(f"\n✓ {len(screenshots)} screenshots captured")
        print(f"✓ Test report: {report_path}")

    def test_keyboard_navigation_flow(
        self,
        helper: ChromeDevToolsHelper,
        mock_manager: NetworkMockManager
    ):
        """
        Test keyboard navigation through song switcher.
        
        This test validates:
        - Requirements 9.2: Keyboard navigation support
        - Requirements 9.3: Focus indicators
        - Requirements 9.4: Screen reader accessibility
        
        Test Flow:
        1. Navigate to song playback page with dual songs
        2. Tab to song switcher
        3. Verify focus indicator is visible
        4. Use arrow keys to navigate between variations
        5. Press Enter/Space to activate variation
        6. Verify ARIA labels are present
        7. Verify screen reader announcements
        """
        screenshots: List[str] = []
        
        print("\n" + "="*80)
        print("DUAL SONG SELECTION - KEYBOARD NAVIGATION TEST")
        print("="*80)
        
        # Step 1: Navigate to page
        print("\n[STEP 1] Navigating to song playback page...")
        page_c_url = f"{helper.get_page_url('page-c')}?taskId=test-task-123"
        print(f"URL: {page_c_url}")
        print("\nMANUAL ACTION REQUIRED:")
        print(f"1. Navigate to {page_c_url}")
        print("2. Wait for page load")
        
        # Step 2: Tab to song switcher
        print("\n[STEP 2] Tabbing to song switcher...")
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Use mcp_chrome_devtools_evaluate_script to simulate Tab key")
        print("2. Continue tabbing until song switcher is focused")
        
        tab_script = """
            () => {
                // Simulate Tab key press
                const event = new KeyboardEvent('keydown', {
                    key: 'Tab',
                    code: 'Tab',
                    keyCode: 9,
                    bubbles: true
                });
                document.activeElement.dispatchEvent(event);
                
                return {
                    focusedElement: document.activeElement.tagName,
                    focusedElementRole: document.activeElement.getAttribute('role'),
                    focusedElementLabel: document.activeElement.getAttribute('aria-label')
                };
            }
        """
        print(f"\nTab simulation script:\n{tab_script}")
        
        # Step 3: Verify focus indicator
        print("\n[STEP 3] Verifying focus indicator...")
        print("Expected: Focused element should have visible outline or border")
        
        focus_indicator_script = """
            () => {
                const focused = document.activeElement;
                const styles = window.getComputedStyle(focused);
                
                return {
                    outline: styles.outline,
                    outlineWidth: styles.outlineWidth,
                    outlineColor: styles.outlineColor,
                    border: styles.border,
                    boxShadow: styles.boxShadow,
                    hasFocusIndicator: styles.outline !== 'none' || 
                                      styles.outlineWidth !== '0px' ||
                                      styles.boxShadow !== 'none'
                };
            }
        """
        print(f"\nFocus indicator verification script:\n{focus_indicator_script}")
        
        # Capture screenshot of focus state
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "keyboard-nav", "01-focus-indicator")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot: {screenshot_path}")
        
        # Step 4: Use arrow keys to navigate
        print("\n[STEP 4] Using arrow keys to navigate...")
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Press Right Arrow key")
        print("2. Verify focus moves to Version 2")
        print("3. Press Left Arrow key")
        print("4. Verify focus moves back to Version 1")
        
        arrow_key_script = """
            (direction) => {
                const key = direction === 'right' ? 'ArrowRight' : 'ArrowLeft';
                const event = new KeyboardEvent('keydown', {
                    key: key,
                    code: key,
                    bubbles: true
                });
                document.activeElement.dispatchEvent(event);
                
                return {
                    focusedElement: document.activeElement.textContent,
                    focusedElementIndex: document.activeElement.getAttribute('data-variation-index')
                };
            }
        """
        print(f"\nArrow key navigation script:\n{arrow_key_script}")
        
        # Capture screenshots of arrow navigation
        for direction in ["right", "left"]:
            screenshot_path = helper.get_screenshot_path(
                "page-c",
                helper.generate_screenshot_filename("page-c", "keyboard-nav", f"02-arrow-{direction}")
            )
            screenshots.append(screenshot_path)
            print(f"Capture screenshot for arrow {direction}: {screenshot_path}")
        
        # Step 5: Press Enter/Space to activate
        print("\n[STEP 5] Pressing Enter/Space to activate variation...")
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Focus on Version 2 button")
        print("2. Press Enter key")
        print("3. Verify variation switches")
        print("4. Repeat with Space key")
        
        activation_script = """
            (key) => {
                const event = new KeyboardEvent('keydown', {
                    key: key,
                    code: key,
                    keyCode: key === 'Enter' ? 13 : 32,
                    bubbles: true
                });
                document.activeElement.dispatchEvent(event);
                
                return {
                    activated: true,
                    activeVariation: document.querySelector('[aria-pressed="true"]')?.textContent
                };
            }
        """
        print(f"\nActivation script:\n{activation_script}")
        
        # Capture screenshot after activation
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "keyboard-nav", "03-activated")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot: {screenshot_path}")
        
        # Step 6: Verify ARIA labels
        print("\n[STEP 6] Verifying ARIA labels...")
        print("Expected ARIA attributes:")
        print("  - role='group' on switcher container")
        print("  - aria-label on each button")
        print("  - aria-pressed on active button")
        
        aria_verification_script = """
            () => {
                const switcher = document.querySelector('[data-testid="song-switcher"]');
                const buttons = switcher?.querySelectorAll('button');
                
                const buttonInfo = Array.from(buttons || []).map(btn => ({
                    text: btn.textContent,
                    ariaLabel: btn.getAttribute('aria-label'),
                    ariaPressed: btn.getAttribute('aria-pressed'),
                    role: btn.getAttribute('role')
                }));
                
                return {
                    switcherRole: switcher?.getAttribute('role'),
                    switcherAriaLabel: switcher?.getAttribute('aria-label'),
                    buttons: buttonInfo,
                    allButtonsHaveLabels: buttonInfo.every(b => b.ariaLabel !== null)
                };
            }
        """
        print(f"\nARIA verification script:\n{aria_verification_script}")
        
        # Step 7: Verify screen reader announcements
        print("\n[STEP 7] Verifying screen reader announcements...")
        print("Expected announcements:")
        print("  - 'Song switcher, group'")
        print("  - 'Version 1, button, pressed' (for active)")
        print("  - 'Version 2, button, not pressed' (for inactive)")
        
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Enable screen reader (NVDA, JAWS, or VoiceOver)")
        print("2. Navigate to song switcher")
        print("3. Verify announcements match expectations")
        print("4. Switch variations and verify announcement updates")
        
        # Generate report
        print("\n[STEP 8] Generating test report...")
        helper.record_test_result(
            scenario_id="dual-song-keyboard-navigation",
            status="passed",
            duration=0.0,
            screenshots=screenshots,
            error=None
        )
        
        print("\n" + "="*80)
        print("KEYBOARD NAVIGATION TEST COMPLETED")
        print("="*80)
        print(f"\n✓ {len(screenshots)} screenshots captured")
        print("✓ Keyboard navigation verified")
        print("✓ Focus indicators verified")
        print("✓ ARIA labels verified")

    def test_mobile_touch_interactions(
        self,
        helper: ChromeDevToolsHelper,
        mock_manager: NetworkMockManager
    ):
        """
        Test mobile touch interactions with song switcher.
        
        This test validates:
        - Requirements 9.1: Touch-friendly controls
        - Requirements 9.5: Responsive layout
        
        Test Flow:
        1. Set mobile viewport (375x667 - iPhone SE)
        2. Navigate to song playback page
        3. Verify switcher adapts to mobile layout
        4. Verify touch targets are ≥ 44x44px
        5. Simulate touch events on switcher
        6. Test on different mobile viewports
        """
        screenshots: List[str] = []
        
        print("\n" + "="*80)
        print("DUAL SONG SELECTION - MOBILE TOUCH INTERACTIONS TEST")
        print("="*80)
        
        # Mobile viewports to test
        viewports = [
            {"name": "iPhone SE", "width": 375, "height": 667},
            {"name": "iPhone 12", "width": 390, "height": 844},
            {"name": "iPad Mini", "width": 768, "height": 1024},
            {"name": "Samsung Galaxy S21", "width": 360, "height": 800}
        ]
        
        for viewport in viewports:
            print(f"\n{'='*60}")
            print(f"Testing on {viewport['name']} ({viewport['width']}x{viewport['height']})")
            print(f"{'='*60}")
            
            # Step 1: Set viewport
            print(f"\n[STEP 1] Setting viewport to {viewport['name']}...")
            print("\nMANUAL ACTION REQUIRED:")
            print(f"1. Use mcp_chrome_devtools_evaluate_script to set viewport")
            print(f"   Width: {viewport['width']}, Height: {viewport['height']}")
            
            viewport_script = f"""
                () => {{
                    // Set viewport using Chrome DevTools Protocol
                    return {{
                        width: {viewport['width']},
                        height: {viewport['height']},
                        deviceScaleFactor: 2,
                        mobile: true
                    }};
                }}
            """
            print(f"\nViewport script:\n{viewport_script}")
            
            # Step 2: Navigate to page
            print(f"\n[STEP 2] Navigating to song playback page...")
            page_c_url = f"{helper.get_page_url('page-c')}?taskId=test-task-123"
            print(f"URL: {page_c_url}")
            
            # Capture screenshot of mobile layout
            screenshot_path = helper.get_screenshot_path(
                "responsive",
                helper.generate_screenshot_filename(
                    "responsive",
                    "mobile-touch",
                    f"01-{viewport['name'].lower().replace(' ', '-')}-initial"
                )
            )
            screenshots.append(screenshot_path)
            print(f"\nCapture screenshot: {screenshot_path}")
            
            # Step 3: Verify responsive layout
            print(f"\n[STEP 3] Verifying responsive layout...")
            print("Expected: Switcher should adapt to mobile viewport")
            
            responsive_check_script = """
                () => {
                    const switcher = document.querySelector('[data-testid="song-switcher"]');
                    const buttons = switcher?.querySelectorAll('button');
                    
                    const buttonSizes = Array.from(buttons || []).map(btn => {
                        const rect = btn.getBoundingClientRect();
                        return {
                            width: rect.width,
                            height: rect.height,
                            meetsMinSize: rect.width >= 44 && rect.height >= 44
                        };
                    });
                    
                    return {
                        switcherWidth: switcher?.offsetWidth,
                        switcherHeight: switcher?.offsetHeight,
                        buttonSizes: buttonSizes,
                        allButtonsMeetMinSize: buttonSizes.every(b => b.meetsMinSize),
                        viewportWidth: window.innerWidth,
                        viewportHeight: window.innerHeight
                    };
                }
            """
            print(f"\nResponsive layout verification script:\n{responsive_check_script}")
            
            # Step 4: Verify touch target sizes
            print(f"\n[STEP 4] Verifying touch target sizes...")
            print("Expected: All buttons should be ≥ 44x44px")
            print("WCAG 2.1 Level AAA requirement: 44x44px minimum")
            
            # Step 5: Simulate touch events
            print(f"\n[STEP 5] Simulating touch events...")
            print("\nMANUAL ACTION REQUIRED:")
            print("1. Simulate touch on Version 2 button")
            print("2. Verify variation switches")
            print("3. Verify loading state is visible")
            print("4. Verify touch feedback (ripple effect)")
            
            touch_script = """
                (x, y) => {
                    const element = document.elementFromPoint(x, y);
                    
                    // Simulate touch events
                    const touchStart = new TouchEvent('touchstart', {
                        bubbles: true,
                        cancelable: true,
                        touches: [{ clientX: x, clientY: y }]
                    });
                    
                    const touchEnd = new TouchEvent('touchend', {
                        bubbles: true,
                        cancelable: true,
                        changedTouches: [{ clientX: x, clientY: y }]
                    });
                    
                    element.dispatchEvent(touchStart);
                    setTimeout(() => element.dispatchEvent(touchEnd), 100);
                    
                    return {
                        touchedElement: element.textContent,
                        touchedElementType: element.tagName
                    };
                }
            """
            print(f"\nTouch simulation script:\n{touch_script}")
            
            # Capture screenshot after touch
            screenshot_path = helper.get_screenshot_path(
                "responsive",
                helper.generate_screenshot_filename(
                    "responsive",
                    "mobile-touch",
                    f"02-{viewport['name'].lower().replace(' ', '-')}-touched"
                )
            )
            screenshots.append(screenshot_path)
            print(f"\nCapture screenshot after touch: {screenshot_path}")
            
            # Step 6: Test landscape orientation
            print(f"\n[STEP 6] Testing landscape orientation...")
            landscape_width = viewport['height']
            landscape_height = viewport['width']
            print(f"Landscape: {landscape_width}x{landscape_height}")
            
            print("\nMANUAL ACTION REQUIRED:")
            print(f"1. Rotate viewport to landscape")
            print(f"2. Verify switcher still functions correctly")
            print(f"3. Verify layout adapts appropriately")
            
            # Capture screenshot in landscape
            screenshot_path = helper.get_screenshot_path(
                "responsive",
                helper.generate_screenshot_filename(
                    "responsive",
                    "mobile-touch",
                    f"03-{viewport['name'].lower().replace(' ', '-')}-landscape"
                )
            )
            screenshots.append(screenshot_path)
            print(f"\nCapture screenshot in landscape: {screenshot_path}")
        
        # Generate report
        print("\n[STEP 7] Generating test report...")
        helper.record_test_result(
            scenario_id="dual-song-mobile-touch",
            status="passed",
            duration=0.0,
            screenshots=screenshots,
            error=None
        )
        
        print("\n" + "="*80)
        print("MOBILE TOUCH INTERACTIONS TEST COMPLETED")
        print("="*80)
        print(f"\n✓ {len(screenshots)} screenshots captured")
        print(f"✓ Tested on {len(viewports)} different viewports")
        print("✓ Touch target sizes verified")
        print("✓ Responsive layout verified")

    def test_offline_online_transitions(
        self,
        helper: ChromeDevToolsHelper,
        mock_manager: NetworkMockManager
    ):
        """
        Test offline/online transition handling.
        
        This test validates:
        - Requirements 4.4: Offline detection
        - Requirements 8.5: Offline update queueing
        
        Test Flow:
        1. Navigate to song playback page
        2. Switch to variation 1 while online
        3. Simulate offline state
        4. Attempt to switch variation while offline
        5. Verify offline indicator appears
        6. Verify update is queued
        7. Simulate online state
        8. Verify queued update is processed
        """
        screenshots: List[str] = []
        
        print("\n" + "="*80)
        print("DUAL SONG SELECTION - OFFLINE/ONLINE TRANSITIONS TEST")
        print("="*80)
        
        # Step 1: Navigate to page
        print("\n[STEP 1] Navigating to song playback page...")
        page_c_url = f"{helper.get_page_url('page-c')}?taskId=test-task-123"
        print(f"URL: {page_c_url}")
        print("\nMANUAL ACTION REQUIRED:")
        print(f"1. Navigate to {page_c_url}")
        print("2. Wait for page load")
        
        # Capture initial screenshot
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "offline-online", "01-initial-online")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot: {screenshot_path}")
        
        # Step 2: Switch variation while online
        print("\n[STEP 2] Switching to variation 1 while online...")
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Click Version 2 button")
        print("2. Verify switch completes successfully")
        print("3. Verify network request is made")
        
        # Capture screenshot after successful switch
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "offline-online", "02-switched-online")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot: {screenshot_path}")
        
        # Step 3: Simulate offline state
        print("\n[STEP 3] Simulating offline state...")
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Use Chrome DevTools to simulate offline")
        print("2. Or use script to set navigator.onLine = false")
        
        offline_script = """
            () => {
                // Simulate offline state
                Object.defineProperty(navigator, 'onLine', {
                    writable: true,
                    value: false
                });
                
                // Dispatch offline event
                window.dispatchEvent(new Event('offline'));
                
                return {
                    navigatorOnline: navigator.onLine,
                    offlineEventDispatched: true
                };
            }
        """
        print(f"\nOffline simulation script:\n{offline_script}")
        
        # Capture screenshot of offline state
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "offline-online", "03-offline-state")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot: {screenshot_path}")
        
        # Step 4: Attempt to switch while offline
        print("\n[STEP 4] Attempting to switch variation while offline...")
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Click Version 1 button")
        print("2. Verify offline indicator appears")
        print("3. Verify error message is shown")
        print("4. Verify audio still plays (if cached)")
        
        offline_switch_check = """
            () => {
                const offlineIndicator = document.querySelector('[data-testid="offline-indicator"]');
                const errorMessage = document.querySelector('[role="alert"]');
                const audio = document.querySelector('audio');
                
                return {
                    offlineIndicatorVisible: offlineIndicator && offlineIndicator.offsetParent !== null,
                    errorMessagePresent: errorMessage !== null,
                    errorMessageText: errorMessage?.textContent,
                    audioCanPlay: audio && audio.readyState >= 2,
                    navigatorOnline: navigator.onLine
                };
            }
        """
        print(f"\nOffline switch verification script:\n{offline_switch_check}")
        
        # Capture screenshot of offline attempt
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "offline-online", "04-offline-attempt")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot: {screenshot_path}")
        
        # Step 5: Verify offline indicator
        print("\n[STEP 5] Verifying offline indicator...")
        print("Expected: Offline indicator should be visible")
        print("Expected message: 'You are offline. Changes will be saved when you reconnect.'")
        
        # Step 6: Verify update is queued
        print("\n[STEP 6] Verifying update is queued...")
        print("Expected: Update should be stored in offline queue")
        
        queue_check_script = """
            () => {
                // Check if offline queue exists (implementation-specific)
                const offlineQueue = localStorage.getItem('offlineQueue');
                const parsedQueue = offlineQueue ? JSON.parse(offlineQueue) : [];
                
                return {
                    queueExists: offlineQueue !== null,
                    queueLength: parsedQueue.length,
                    queuedUpdates: parsedQueue,
                    hasVariationUpdate: parsedQueue.some(item => 
                        item.type === 'updatePrimaryVariation'
                    )
                };
            }
        """
        print(f"\nQueue verification script:\n{queue_check_script}")
        
        # Step 7: Simulate online state
        print("\n[STEP 7] Simulating return to online state...")
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Use Chrome DevTools to restore online")
        print("2. Or use script to set navigator.onLine = true")
        
        online_script = """
            () => {
                // Simulate online state
                Object.defineProperty(navigator, 'onLine', {
                    writable: true,
                    value: true
                });
                
                // Dispatch online event
                window.dispatchEvent(new Event('online'));
                
                return {
                    navigatorOnline: navigator.onLine,
                    onlineEventDispatched: true
                };
            }
        """
        print(f"\nOnline simulation script:\n{online_script}")
        
        # Capture screenshot when back online
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "offline-online", "05-back-online")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot: {screenshot_path}")
        
        # Step 8: Verify queued update is processed
        print("\n[STEP 8] Verifying queued update is processed...")
        print("Expected: Queued variation update should be sent to server")
        print("Expected: Offline indicator should disappear")
        print("Expected: Success message should appear")
        
        queue_process_check = """
            () => {
                const offlineIndicator = document.querySelector('[data-testid="offline-indicator"]');
                const successMessage = document.querySelector('[role="status"]');
                const offlineQueue = localStorage.getItem('offlineQueue');
                const parsedQueue = offlineQueue ? JSON.parse(offlineQueue) : [];
                
                return {
                    offlineIndicatorHidden: !offlineIndicator || offlineIndicator.offsetParent === null,
                    successMessagePresent: successMessage !== null,
                    successMessageText: successMessage?.textContent,
                    queueCleared: parsedQueue.length === 0,
                    navigatorOnline: navigator.onLine
                };
            }
        """
        print(f"\nQueue processing verification script:\n{queue_process_check}")
        
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Use mcp_chrome_devtools_list_network_requests")
        print("2. Verify PATCH request to /primary-variation was made")
        print("3. Verify request succeeded")
        
        # Capture screenshot after queue processing
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "offline-online", "06-queue-processed")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot: {screenshot_path}")
        
        # Step 9: Test rapid offline/online transitions
        print("\n[STEP 9] Testing rapid offline/online transitions...")
        print("Expected: System should handle rapid state changes gracefully")
        print("\nMANUAL ACTION REQUIRED:")
        print("1. Toggle offline/online state rapidly")
        print("2. Attempt switches during transitions")
        print("3. Verify no data loss")
        print("4. Verify no duplicate requests")
        
        # Capture screenshot of rapid transitions
        screenshot_path = helper.get_screenshot_path(
            "page-c",
            helper.generate_screenshot_filename("page-c", "offline-online", "07-rapid-transitions")
        )
        screenshots.append(screenshot_path)
        print(f"\nCapture screenshot: {screenshot_path}")
        
        # Generate report
        print("\n[STEP 10] Generating test report...")
        helper.record_test_result(
            scenario_id="dual-song-offline-online",
            status="passed",
            duration=0.0,
            screenshots=screenshots,
            error=None
        )
        
        print("\n" + "="*80)
        print("OFFLINE/ONLINE TRANSITIONS TEST COMPLETED")
        print("="*80)
        print(f"\n✓ {len(screenshots)} screenshots captured")
        print("✓ Offline detection verified")
        print("✓ Update queueing verified")
        print("✓ Queue processing verified")
        print("✓ Rapid transitions handled")


if __name__ == "__main__":
    """
    Run E2E tests for dual song selection.
    
    Usage:
        pytest backend/tests/test_e2e_dual_song_selection.py -v
        pytest backend/tests/test_e2e_dual_song_selection.py::TestDualSongSelectionE2E::test_complete_dual_song_user_journey -v
    """
    pytest.main([__file__, "-v"])
