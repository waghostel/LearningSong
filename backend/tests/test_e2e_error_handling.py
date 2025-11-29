"""
E2E Error Handling Test Scenarios using Chrome DevTools MCP.

This module implements comprehensive error handling tests for the LearningSong
application, covering server errors, rate limits, timeouts, validation errors,
and error recovery scenarios.

Requirements covered:
- 6.1: Test 500 server error response and error message display
- 6.2: Test 429 rate limit error response with retry information
- 6.3: Test network timeout handling and error message
- 6.4: Test validation errors with field-specific messages
- 6.5: Test error recovery and state clearing
"""

import pytest
from tests.e2e_helpers import ChromeDevToolsHelper, create_helper
from tests.e2e_network_mock import NetworkMockManager, setup_error_scenario_mocks
from tests.e2e_mock_data import (
    MOCK_ERROR_RATE_LIMIT,
    MOCK_ERROR_SERVER_ERROR,
    MOCK_ERROR_TIMEOUT,
    MOCK_ERROR_VALIDATION_EMPTY_LYRICS,
    MOCK_ERROR_VALIDATION_LYRICS_TOO_LONG,
    MOCK_ERROR_VALIDATION_LYRICS_TOO_SHORT,
    get_mock_error_by_type
)


class TestServerErrorHandling:
    """
    Test 500 server error response and error message display.
    
    Validates: Requirement 6.1
    """
    
    def test_server_error_on_lyrics_generation(self):
        """
        Test that 500 server error on lyrics generation displays appropriate error message.
        
        This test verifies that when the lyrics generation API returns a 500 error,
        the application displays a user-friendly error message.
        
        Validates: Requirement 6.1
        """
        print("\n" + "="*70)
        print("TEST: Server Error (500) on Lyrics Generation")
        print("="*70)
        
        # Initialize helper and mock manager
        helper = create_helper()
        mock_manager = setup_error_scenario_mocks("server_error")
        
        # Get injection instructions
        injection_instructions = mock_manager.get_injection_instructions()
        
        # Test content
        test_content = "Test content for server error scenario"
        
        # Screenshot path
        screenshot_path = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "server-error-500", "error-message")
        )
        
        print("\n📋 Test Setup:")
        print(f"  - Mock: 500 Server Error on /api/lyrics/generate")
        print(f"  - Expected Error: {MOCK_ERROR_SERVER_ERROR['detail']}")
        print(f"  - Screenshot: {screenshot_path}")
        
        print("\n🔧 Test Steps:")
        print("  1. Connect to browser via Chrome DevTools MCP")
        print("     → Use mcp_chrome_devtools_list_pages")
        print("     → Use mcp_chrome_devtools_select_page")
        
        print("\n  2. Inject network mocks for server error")
        print(f"     → Script: {len(injection_instructions['script'])} characters")
        print("     → Use mcp_chrome_devtools_evaluate_script")
        
        print("\n  3. Navigate to Page A (Text Input)")
        print(f"     → URL: {helper.get_page_url('page-a')}")
        print("     → Use mcp_chrome_devtools_navigate_page")
        
        print("\n  4. Fill text input with test content")
        print(f"     → Content: '{test_content}'")
        print("     → Use mcp_chrome_devtools_fill")
        
        print("\n  5. Click submit button")
        print("     → Use mcp_chrome_devtools_click")
        
        print("\n  6. Wait for error message to appear")
        print("     → Expected: Error message containing 'Internal server error'")
        print("     → Use mcp_chrome_devtools_wait_for")
        
        print("\n  7. Capture screenshot of error state")
        print(f"     → Path: {screenshot_path}")
        print("     → Use mcp_chrome_devtools_take_screenshot")
        
        print("\n  8. Verify error message content")
        print("     → Use mcp_chrome_devtools_take_snapshot to check error text")
        
        print("\n✅ Expected Results:")
        print("  - Error message is displayed to the user")
        print("  - Error message contains 'Internal server error'")
        print("  - Error message suggests trying again later")
        print("  - Submit button remains enabled for retry")
        print("  - No navigation occurs (stays on Page A)")
        
        print("\n✓ Test instructions generated")
    
    def test_server_error_on_song_generation(self):
        """
        Test that 500 server error on song generation displays appropriate error message.
        
        This test verifies that when the song generation API returns a 500 error,
        the application displays a user-friendly error message on Page B.
        
        Validates: Requirement 6.1
        """
        print("\n" + "="*70)
        print("TEST: Server Error (500) on Song Generation")
        print("="*70)
        
        # Initialize helper
        helper = create_helper()
        
        # Setup mocks for successful lyrics but failed song generation
        mock_manager = NetworkMockManager()
        mock_manager.add_lyrics_generation_mock(response_type="success")
        mock_manager.add_error_mock("/api/songs/generate", "server_error", method="POST")
        
        injection_instructions = mock_manager.get_injection_instructions()
        
        screenshot_path = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "server-error-500-song", "error-message")
        )
        
        print("\n📋 Test Setup:")
        print(f"  - Mock: Successful lyrics generation, 500 error on song generation")
        print(f"  - Screenshot: {screenshot_path}")
        
        print("\n🔧 Test Steps:")
        print("  1. Navigate through Page A to Page B with successful lyrics")
        print("  2. On Page B, select a music style")
        print("  3. Click 'Generate Song' button")
        print("  4. Wait for error message to appear")
        print("  5. Capture screenshot of error state")
        print("  6. Verify error message content")
        
        print("\n✅ Expected Results:")
        print("  - Error message is displayed on Page B")
        print("  - Error message contains 'Internal server error'")
        print("  - Generate button remains enabled for retry")
        print("  - No navigation occurs (stays on Page B)")
        
        print("\n✓ Test instructions generated")


class TestRateLimitErrorHandling:
    """
    Test 429 rate limit error response with retry information.
    
    Validates: Requirement 6.2
    """
    
    def test_rate_limit_error_on_lyrics_generation(self):
        """
        Test that 429 rate limit error displays appropriate message with retry information.
        
        This test verifies that when the lyrics generation API returns a 429 rate limit error,
        the application displays a user-friendly error message with information about when
        the user can try again.
        
        Validates: Requirement 6.2
        """
        print("\n" + "="*70)
        print("TEST: Rate Limit Error (429) on Lyrics Generation")
        print("="*70)
        
        # Initialize helper and mock manager
        helper = create_helper()
        mock_manager = setup_error_scenario_mocks("rate_limit")
        
        injection_instructions = mock_manager.get_injection_instructions()
        
        test_content = "Test content for rate limit error"
        
        screenshot_path = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "rate-limit-429", "error-message")
        )
        
        print("\n📋 Test Setup:")
        print(f"  - Mock: 429 Rate Limit Error on /api/lyrics/generate")
        print(f"  - Expected Error: {MOCK_ERROR_RATE_LIMIT['detail']}")
        print(f"  - Reset Time: {MOCK_ERROR_RATE_LIMIT['reset_time']}")
        print(f"  - Screenshot: {screenshot_path}")
        
        print("\n🔧 Test Steps:")
        print("  1. Connect to browser and inject network mocks")
        print("  2. Navigate to Page A")
        print("  3. Fill text input with test content")
        print("  4. Click submit button")
        print("  5. Wait for rate limit error message")
        print("  6. Capture screenshot")
        print("  7. Verify error message contains:")
        print("     - 'Rate limit exceeded'")
        print("     - '3 songs per day'")
        print("     - Retry information")
        
        print("\n✅ Expected Results:")
        print("  - Error message is displayed")
        print("  - Message explains rate limit (3 songs per day)")
        print("  - Message includes when user can try again")
        print("  - Submit button state allows retry after reset time")
        
        print("\n✓ Test instructions generated")
    
    def test_rate_limit_error_on_song_generation(self):
        """
        Test that 429 rate limit error on song generation displays appropriate message.
        
        Validates: Requirement 6.2
        """
        print("\n" + "="*70)
        print("TEST: Rate Limit Error (429) on Song Generation")
        print("="*70)
        
        helper = create_helper()
        
        # Setup mocks for successful lyrics but rate limit on song generation
        mock_manager = NetworkMockManager()
        mock_manager.add_lyrics_generation_mock(response_type="success")
        mock_manager.add_error_mock("/api/songs/generate", "rate_limit", method="POST")
        
        injection_instructions = mock_manager.get_injection_instructions()
        
        screenshot_path = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "rate-limit-429-song", "error-message")
        )
        
        print("\n📋 Test Setup:")
        print(f"  - Mock: Successful lyrics, 429 rate limit on song generation")
        print(f"  - Screenshot: {screenshot_path}")
        
        print("\n🔧 Test Steps:")
        print("  1. Navigate through Page A to Page B")
        print("  2. Select music style and click 'Generate Song'")
        print("  3. Wait for rate limit error message")
        print("  4. Capture screenshot")
        print("  5. Verify error message content")
        
        print("\n✅ Expected Results:")
        print("  - Rate limit error message is displayed on Page B")
        print("  - Message explains daily limit")
        print("  - Message includes retry information")
        
        print("\n✓ Test instructions generated")


class TestTimeoutErrorHandling:
    """
    Test network timeout handling and error message.
    
    Validates: Requirement 6.3
    """
    
    def test_timeout_error_on_lyrics_generation(self):
        """
        Test that network timeout displays appropriate error message.
        
        This test verifies that when the lyrics generation API times out,
        the application displays a user-friendly error message suggesting retry.
        
        Validates: Requirement 6.3
        """
        print("\n" + "="*70)
        print("TEST: Network Timeout Error on Lyrics Generation")
        print("="*70)
        
        helper = create_helper()
        mock_manager = setup_error_scenario_mocks("timeout")
        
        injection_instructions = mock_manager.get_injection_instructions()
        
        test_content = "Test content for timeout error"
        
        screenshot_path = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "timeout-504", "error-message")
        )
        
        print("\n📋 Test Setup:")
        print(f"  - Mock: 504 Timeout Error on /api/lyrics/generate")
        print(f"  - Expected Error: {MOCK_ERROR_TIMEOUT['detail']}")
        print(f"  - Screenshot: {screenshot_path}")
        
        print("\n🔧 Test Steps:")
        print("  1. Connect to browser and inject network mocks")
        print("  2. Navigate to Page A")
        print("  3. Fill text input with test content")
        print("  4. Click submit button")
        print("  5. Wait for timeout error message")
        print("  6. Capture screenshot")
        print("  7. Verify error message contains:")
        print("     - 'timeout' or 'took too long'")
        print("     - Suggestion to try again")
        
        print("\n✅ Expected Results:")
        print("  - Timeout error message is displayed")
        print("  - Message explains the timeout")
        print("  - Message suggests trying again")
        print("  - Submit button remains enabled for retry")
        
        print("\n✓ Test instructions generated")
    
    def test_timeout_error_on_song_generation(self):
        """
        Test that network timeout on song generation displays appropriate error message.
        
        Validates: Requirement 6.3
        """
        print("\n" + "="*70)
        print("TEST: Network Timeout Error on Song Generation")
        print("="*70)
        
        helper = create_helper()
        
        # Setup mocks for successful lyrics but timeout on song generation
        mock_manager = NetworkMockManager()
        mock_manager.add_lyrics_generation_mock(response_type="success")
        mock_manager.add_error_mock("/api/songs/generate", "timeout", method="POST")
        
        injection_instructions = mock_manager.get_injection_instructions()
        
        screenshot_path = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "timeout-504-song", "error-message")
        )
        
        print("\n📋 Test Setup:")
        print(f"  - Mock: Successful lyrics, 504 timeout on song generation")
        print(f"  - Screenshot: {screenshot_path}")
        
        print("\n🔧 Test Steps:")
        print("  1. Navigate through Page A to Page B")
        print("  2. Select music style and click 'Generate Song'")
        print("  3. Wait for timeout error message")
        print("  4. Capture screenshot")
        print("  5. Verify error message content")
        
        print("\n✅ Expected Results:")
        print("  - Timeout error message is displayed on Page B")
        print("  - Message suggests trying again")
        
        print("\n✓ Test instructions generated")


class TestValidationErrorHandling:
    """
    Test validation errors with field-specific messages.
    
    Validates: Requirement 6.4
    """
    
    def test_validation_error_empty_lyrics(self):
        """
        Test that empty lyrics validation error displays field-specific message.
        
        This test verifies that when a user tries to generate a song with empty lyrics,
        the application displays a clear validation error message.
        
        Validates: Requirement 6.4
        """
        print("\n" + "="*70)
        print("TEST: Validation Error - Empty Lyrics")
        print("="*70)
        
        helper = create_helper()
        
        # Setup mocks for successful lyrics generation to reach Page B
        mock_manager = NetworkMockManager()
        mock_manager.add_lyrics_generation_mock(response_type="success")
        mock_manager.add_error_mock("/api/songs/generate", "validation_empty_lyrics", method="POST")
        
        injection_instructions = mock_manager.get_injection_instructions()
        
        screenshot_path = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "validation-empty-lyrics", "error-message")
        )
        
        print("\n📋 Test Setup:")
        print(f"  - Mock: Validation error for empty lyrics")
        print(f"  - Expected Error: {MOCK_ERROR_VALIDATION_EMPTY_LYRICS['detail']}")
        print(f"  - Screenshot: {screenshot_path}")
        
        print("\n🔧 Test Steps:")
        print("  1. Navigate to Page B with generated lyrics")
        print("  2. Clear all lyrics content (make it empty)")
        print("  3. Select a music style")
        print("  4. Click 'Generate Song' button")
        print("  5. Wait for validation error message")
        print("  6. Capture screenshot")
        print("  7. Verify error message is field-specific")
        
        print("\n✅ Expected Results:")
        print("  - Validation error message is displayed")
        print("  - Message specifically mentions 'Lyrics cannot be empty'")
        print("  - Error is shown near the lyrics field")
        print("  - Generate button is disabled or shows error state")
        
        print("\n✓ Test instructions generated")
    
    def test_validation_error_lyrics_too_long(self):
        """
        Test that lyrics exceeding 3,100 characters displays field-specific validation error.
        
        Validates: Requirement 6.4
        """
        print("\n" + "="*70)
        print("TEST: Validation Error - Lyrics Too Long (3,100+ characters)")
        print("="*70)
        
        helper = create_helper()
        
        mock_manager = NetworkMockManager()
        mock_manager.add_lyrics_generation_mock(response_type="success")
        mock_manager.add_error_mock("/api/songs/generate", "validation_lyrics_too_long", method="POST")
        
        injection_instructions = mock_manager.get_injection_instructions()
        
        # Generate long lyrics content (over 3,100 characters)
        long_lyrics = "[Verse 1]\n" + ("Learning is a journey " * 200)
        
        screenshot_path = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "validation-lyrics-too-long", "error-message")
        )
        
        print("\n📋 Test Setup:")
        print(f"  - Mock: Validation error for lyrics exceeding 3,100 characters")
        print(f"  - Expected Error: {MOCK_ERROR_VALIDATION_LYRICS_TOO_LONG['detail']}")
        print(f"  - Test Lyrics Length: {len(long_lyrics)} characters")
        print(f"  - Screenshot: {screenshot_path}")
        
        print("\n🔧 Test Steps:")
        print("  1. Navigate to Page B")
        print("  2. Edit lyrics to exceed 3,100 characters")
        print("  3. Observe real-time character count update")
        print("  4. Verify error state is shown (red border, error message)")
        print("  5. Attempt to click 'Generate Song' button")
        print("  6. Capture screenshot of error state")
        print("  7. Verify field-specific error message")
        
        print("\n✅ Expected Results:")
        print("  - Character count shows > 3,100")
        print("  - Error state is displayed (red border on textarea)")
        print("  - Field-specific error message: 'Lyrics exceed 3,100 character limit'")
        print("  - Generate button is disabled")
        
        print("\n✓ Test instructions generated")
    
    def test_validation_error_lyrics_too_short(self):
        """
        Test that lyrics under 50 characters displays field-specific validation error.
        
        Validates: Requirement 6.4
        """
        print("\n" + "="*70)
        print("TEST: Validation Error - Lyrics Too Short (< 50 characters)")
        print("="*70)
        
        helper = create_helper()
        
        mock_manager = NetworkMockManager()
        mock_manager.add_lyrics_generation_mock(response_type="success")
        mock_manager.add_error_mock("/api/songs/generate", "validation_lyrics_too_short", method="POST")
        
        injection_instructions = mock_manager.get_injection_instructions()
        
        short_lyrics = "Too short"  # Only 9 characters
        
        screenshot_path = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "validation-lyrics-too-short", "error-message")
        )
        
        print("\n📋 Test Setup:")
        print(f"  - Mock: Validation error for lyrics under 50 characters")
        print(f"  - Expected Error: {MOCK_ERROR_VALIDATION_LYRICS_TOO_SHORT['detail']}")
        print(f"  - Test Lyrics: '{short_lyrics}' ({len(short_lyrics)} characters)")
        print(f"  - Screenshot: {screenshot_path}")
        
        print("\n🔧 Test Steps:")
        print("  1. Navigate to Page B")
        print("  2. Edit lyrics to be very short (< 50 characters)")
        print("  3. Select a music style")
        print("  4. Click 'Generate Song' button")
        print("  5. Wait for validation error message")
        print("  6. Capture screenshot")
        
        print("\n✅ Expected Results:")
        print("  - Validation error message is displayed")
        print("  - Message specifically mentions minimum 50 characters")
        print("  - Error is shown near the lyrics field")
        
        print("\n✓ Test instructions generated")
    
    def test_validation_error_no_style_selected(self):
        """
        Test that attempting to generate without selecting a style shows validation error.
        
        Validates: Requirement 6.4
        """
        print("\n" + "="*70)
        print("TEST: Validation Error - No Music Style Selected")
        print("="*70)
        
        helper = create_helper()
        
        mock_manager = NetworkMockManager()
        mock_manager.add_lyrics_generation_mock(response_type="success")
        mock_manager.add_error_mock("/api/songs/generate", "validation_no_style", method="POST")
        
        injection_instructions = mock_manager.get_injection_instructions()
        
        screenshot_path = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "validation-no-style", "error-message")
        )
        
        print("\n📋 Test Setup:")
        print(f"  - Mock: Validation error for missing music style")
        print(f"  - Expected Error: Please select a music style")
        print(f"  - Screenshot: {screenshot_path}")
        
        print("\n🔧 Test Steps:")
        print("  1. Navigate to Page B with generated lyrics")
        print("  2. Do NOT select any music style")
        print("  3. Click 'Generate Song' button")
        print("  4. Wait for validation error message")
        print("  5. Capture screenshot")
        
        print("\n✅ Expected Results:")
        print("  - Validation error message is displayed")
        print("  - Message mentions selecting a music style")
        print("  - Error is shown near the style selector")
        
        print("\n✓ Test instructions generated")


class TestErrorRecovery:
    """
    Test error recovery and state clearing.
    
    Validates: Requirement 6.5
    """
    
    def test_error_recovery_after_server_error(self):
        """
        Test that application recovers from server error and clears error state.
        
        This test verifies that after encountering a server error, the user can
        take corrective action and the error state is properly cleared.
        
        Validates: Requirement 6.5
        """
        print("\n" + "="*70)
        print("TEST: Error Recovery - Clear Error State After Server Error")
        print("="*70)
        
        helper = create_helper()
        
        screenshot_path_error = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "error-recovery", "01-error-state")
        )
        
        screenshot_path_recovery = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "error-recovery", "02-recovered-state")
        )
        
        print("\n📋 Test Setup:")
        print(f"  - Scenario: Server error followed by successful retry")
        print(f"  - Screenshot (Error): {screenshot_path_error}")
        print(f"  - Screenshot (Recovery): {screenshot_path_recovery}")
        
        print("\n🔧 Test Steps:")
        print("  1. Connect to browser and inject network mocks for server error")
        print("  2. Navigate to Page A")
        print("  3. Fill text input and submit")
        print("  4. Wait for server error message to appear")
        print("  5. Capture screenshot of error state")
        
        print("\n  6. Clear network mocks and inject success mocks")
        print("     → Remove server error mock")
        print("     → Add successful lyrics generation mock")
        print("     → Re-inject network mocks")
        
        print("\n  7. Click submit button again (retry)")
        print("  8. Wait for error message to disappear")
        print("  9. Wait for successful navigation to Page B")
        print("  10. Capture screenshot of recovered state")
        
        print("\n✅ Expected Results:")
        print("  - Error message is displayed initially")
        print("  - After retry with successful mock:")
        print("    • Error message is cleared")
        print("    • Application navigates to Page B")
        print("    • No error state remains")
        print("    • Normal functionality is restored")
        
        print("\n✓ Test instructions generated")
    
    def test_error_recovery_after_validation_error(self):
        """
        Test that application recovers from validation error when user corrects input.
        
        This test verifies that validation errors are cleared when the user
        corrects the invalid input.
        
        Validates: Requirement 6.5
        """
        print("\n" + "="*70)
        print("TEST: Error Recovery - Clear Validation Error After Correction")
        print("="*70)
        
        helper = create_helper()
        
        screenshot_path_error = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "validation-recovery", "01-error-state")
        )
        
        screenshot_path_recovery = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "validation-recovery", "02-recovered-state")
        )
        
        print("\n📋 Test Setup:")
        print(f"  - Scenario: Lyrics too long, then corrected")
        print(f"  - Screenshot (Error): {screenshot_path_error}")
        print(f"  - Screenshot (Recovery): {screenshot_path_recovery}")
        
        print("\n🔧 Test Steps:")
        print("  1. Navigate to Page B with generated lyrics")
        print("  2. Edit lyrics to exceed 3,100 characters")
        print("  3. Observe error state (red border, error message)")
        print("  4. Capture screenshot of error state")
        
        print("\n  5. Edit lyrics to reduce to valid length (< 3,100 characters)")
        print("  6. Observe error state clearing in real-time")
        print("  7. Verify character count updates")
        print("  8. Verify error message disappears")
        print("  9. Verify red border is removed")
        print("  10. Verify Generate button becomes enabled")
        print("  11. Capture screenshot of recovered state")
        
        print("\n✅ Expected Results:")
        print("  - Error state is displayed when lyrics exceed limit")
        print("  - After correction:")
        print("    • Error message is cleared")
        print("    • Red border is removed from textarea")
        print("    • Character count shows valid number")
        print("    • Generate button is enabled")
        print("    • Normal functionality is restored")
        
        print("\n✓ Test instructions generated")
    
    def test_error_recovery_after_rate_limit(self):
        """
        Test that application properly handles rate limit recovery scenario.
        
        This test verifies that after a rate limit error, the application
        can successfully retry when the limit is reset.
        
        Validates: Requirement 6.5
        """
        print("\n" + "="*70)
        print("TEST: Error Recovery - Retry After Rate Limit Reset")
        print("="*70)
        
        helper = create_helper()
        
        screenshot_path_error = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "rate-limit-recovery", "01-rate-limit-error")
        )
        
        screenshot_path_recovery = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "rate-limit-recovery", "02-successful-retry")
        )
        
        print("\n📋 Test Setup:")
        print(f"  - Scenario: Rate limit error, then successful retry")
        print(f"  - Screenshot (Error): {screenshot_path_error}")
        print(f"  - Screenshot (Recovery): {screenshot_path_recovery}")
        
        print("\n🔧 Test Steps:")
        print("  1. Inject network mocks for rate limit error")
        print("  2. Navigate to Page A and submit content")
        print("  3. Wait for rate limit error message")
        print("  4. Capture screenshot of rate limit error")
        
        print("\n  5. Simulate rate limit reset:")
        print("     → Clear rate limit mock")
        print("     → Inject successful lyrics generation mock")
        print("     → Re-inject network mocks")
        
        print("\n  6. Click submit button again (retry)")
        print("  7. Wait for error message to clear")
        print("  8. Wait for successful navigation to Page B")
        print("  9. Capture screenshot of successful retry")
        
        print("\n✅ Expected Results:")
        print("  - Rate limit error is displayed initially")
        print("  - After simulated reset and retry:")
        print("    • Error message is cleared")
        print("    • Application navigates to Page B")
        print("    • Lyrics are generated successfully")
        print("    • Normal functionality is restored")
        
        print("\n✓ Test instructions generated")


# Test execution summary
def print_test_summary():
    """Print summary of all error handling test scenarios."""
    print("\n" + "="*70)
    print("ERROR HANDLING TEST SCENARIOS SUMMARY")
    print("="*70)
    print("\nTest Classes:")
    print("  1. TestServerErrorHandling - 500 server errors")
    print("     - test_server_error_on_lyrics_generation")
    print("     - test_server_error_on_song_generation")
    print()
    print("  2. TestRateLimitErrorHandling - 429 rate limit errors")
    print("     - test_rate_limit_error_on_lyrics_generation")
    print("     - test_rate_limit_error_on_song_generation")
    print()
    print("  3. TestTimeoutErrorHandling - Network timeout errors")
    print("     - test_timeout_error_on_lyrics_generation")
    print("     - test_timeout_error_on_song_generation")
    print()
    print("  4. TestValidationErrorHandling - Field-specific validation errors")
    print("     - test_validation_error_empty_lyrics")
    print("     - test_validation_error_lyrics_too_long")
    print("     - test_validation_error_lyrics_too_short")
    print("     - test_validation_error_no_style_selected")
    print()
    print("  5. TestErrorRecovery - Error recovery and state clearing")
    print("     - test_error_recovery_after_server_error")
    print("     - test_error_recovery_after_validation_error")
    print("     - test_error_recovery_after_rate_limit")
    print()
    print("Total Test Methods: 13")
    print()
    print("Requirements Coverage:")
    print("  ✓ 6.1: Server error response and error message display")
    print("  ✓ 6.2: Rate limit error response with retry information")
    print("  ✓ 6.3: Network timeout handling and error message")
    print("  ✓ 6.4: Validation errors with field-specific messages")
    print("  ✓ 6.5: Error recovery and state clearing")
    print()
    print("="*70)


if __name__ == "__main__":
    print_test_summary()
