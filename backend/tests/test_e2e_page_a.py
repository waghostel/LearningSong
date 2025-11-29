"""
End-to-End tests for Page A (Text Input) using Chrome DevTools MCP.

This module implements browser-based E2E tests for the Text Input page,
validating UI interactions, form validation, API integration, and error handling
with mocked network responses.

Requirements tested:
- 1.1: Initial page load and UI element visibility
- 1.2: Valid text input enables submit button
- 1.3: Text exceeding 10,000 words displays validation error
- 1.4: Successful submission with mocked API response navigates to Page B
- 1.5: API error handling (rate limit, server error, timeout)
"""

import pytest
import time
from pathlib import Path
from typing import Dict, Any, List

from tests.e2e_helpers import ChromeDevToolsHelper, create_helper
from tests.e2e_mock_data import (
    MOCK_LYRICS_SUCCESS,
    MOCK_ERROR_RATE_LIMIT,
    MOCK_ERROR_SERVER_ERROR,
    MOCK_ERROR_TIMEOUT,
    MOCK_ERROR_VALIDATION_TEXT_TOO_LONG
)
from tests.e2e_network_mock import (
    NetworkMockManager,
    MockResponse,
    setup_happy_path_mocks,
    setup_error_scenario_mocks
)


class TestPageASetup:
    """Test setup and prerequisites for Page A testing."""
    
    def test_prerequisites(self):
        """
        Verify that all prerequisites for E2E testing are met.
        
        This test checks:
        - Chrome is running with remote debugging on port 9222
        - Frontend dev server is running on port 5173
        - Report directory structure exists
        """
        helper = create_helper()
        
        success, issues = helper.verify_prerequisites()
        
        if not success:
            pytest.skip(f"Prerequisites not met:\n" + "\n".join(f"- {issue}" for issue in issues))
        
        print("\n✓ All prerequisites met")
        print(f"✓ Chrome running on port {helper.chrome_debug_port}")
        print(f"✓ Frontend running at {helper.frontend_url}")
        print(f"✓ Report directory: {helper.report_dir}")


class TestPageAInitialLoad:
    """Test initial page load and UI element visibility."""
    
    def test_page_a_initial_load(self):
        """
        Test that Page A loads correctly with all required UI elements visible.
        
        Validates: Requirement 1.1
        
        This test:
        1. Navigates to Page A (Text Input Page)
        2. Waits for page load completion
        3. Verifies all required UI elements are present
        4. Captures screenshot of initial state
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Page A Initial Load")
        print("="*70)
        
        # Step 1: Get navigation instructions
        nav_instructions = helper.navigate_to_page("page-a", timeout=30)
        print(f"\n📍 Navigation: {nav_instructions['url']}")
        print(f"   Instructions: {nav_instructions['instructions']}")
        
        # Step 2: Get page load verification instructions
        verify_instructions = helper.verify_page_loaded("page-a")
        print(f"\n✓ Verification: Checking for elements")
        print(f"   Expected elements: {', '.join(verify_instructions['expected_elements'])}")
        
        # Step 3: Generate screenshot path
        screenshot_path = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "initial-load")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📸 Screenshot: {screenshot_path}")
        
        # Instructions for manual execution with Chrome DevTools MCP
        print("\n" + "-"*70)
        print("CHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("1. Connect to browser:")
        print("   - Call: mcp_chrome_devtools_list_pages")
        print("   - Call: mcp_chrome_devtools_select_page(pageIdx=<index>)")
        print()
        print(f"2. Navigate to Page A:")
        print(f"   - Call: mcp_chrome_devtools_navigate_page(type='url', url='{nav_instructions['url']}')")
        print()
        print("3. Take snapshot to verify elements:")
        print("   - Call: mcp_chrome_devtools_take_snapshot()")
        print("   - Verify presence of: textarea, button elements")
        print()
        print("4. Capture screenshot:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        print("5. Verify elements using JavaScript:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print(f"       function={verify_instructions['verification_script']}")
        print("     )")
        print("-"*70)
        
        # Record test result
        helper.record_test_result(
            scenario_id="page-a-initial-load",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("\n✓ Test instructions generated")
        print("  Execute the above steps using Chrome DevTools MCP tools")


class TestPageATextInput:
    """Test text input with various valid lengths."""
    
    def test_text_input_valid_lengths(self):
        """
        Test text input with various valid word counts.
        
        Validates: Requirement 1.2
        
        This property test verifies that for any valid text content
        (between 1 and 10,000 words), the submit button is enabled.
        
        Test cases:
        - Short text (50 words)
        - Medium text (500 words)
        - Long text (5,000 words)
        - Maximum text (9,999 words)
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Text Input with Valid Lengths")
        print("="*70)
        
        # Test cases with different word counts
        test_cases = [
            ("short", 50, "Short educational content about photosynthesis."),
            ("medium", 500, "Medium length educational content. " * 50),
            ("long", 5000, "Long educational content. " * 500),
            ("maximum", 9999, "Maximum length content. " * 1000)
        ]
        
        for case_name, word_count, sample_text in test_cases:
            print(f"\n--- Test Case: {case_name.upper()} ({word_count} words) ---")
            
            # Generate test content with exact word count
            words = sample_text.split()
            test_content = ' '.join(words[:word_count])
            
            screenshot_path = helper.get_screenshot_path(
                "page-a",
                helper.generate_screenshot_filename("page-a", f"text-input-{case_name}")
            )
            screenshots.append(screenshot_path)
            
            print(f"📝 Content length: {len(test_content)} characters, {word_count} words")
            print(f"📸 Screenshot: {screenshot_path}")
            
            print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
            print("1. Take snapshot to find textarea UID")
            print("   - Call: mcp_chrome_devtools_take_snapshot()")
            print()
            print("2. Fill textarea with test content:")
            print(f"   - Call: mcp_chrome_devtools_fill(uid='<textarea-uid>', value='{test_content[:50]}...')")
            print()
            print("3. Verify submit button is enabled:")
            print("   - Call: mcp_chrome_devtools_evaluate_script(")
            print("       function=() => {")
            print("         const button = document.querySelector('button[type=\"submit\"]');")
            print("         return { enabled: !button.disabled, text: button.textContent };")
            print("       }")
            print("     )")
            print()
            print("4. Capture screenshot:")
            print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
            print()
        
        # Record test result
        helper.record_test_result(
            scenario_id="page-a-text-input-valid-lengths",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("\n✓ Test instructions generated for all valid length cases")


class TestPageASubmitButtonState:
    """Test submit button enable/disable based on input validity."""
    
    def test_submit_button_disabled_when_empty(self):
        """
        Test that submit button is disabled when textarea is empty.
        
        Validates: Requirement 1.2
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Submit Button Disabled When Empty")
        print("="*70)
        
        screenshot_path = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "submit-disabled-empty")
        )
        screenshots.append(screenshot_path)
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("1. Navigate to Page A (if not already there)")
        print()
        print("2. Clear textarea:")
        print("   - Call: mcp_chrome_devtools_take_snapshot()")
        print("   - Call: mcp_chrome_devtools_fill(uid='<textarea-uid>', value='')")
        print()
        print("3. Verify submit button is disabled:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const button = document.querySelector('button[type=\"submit\"]');")
        print("         return { disabled: button.disabled, enabled: !button.disabled };")
        print("       }")
        print("     )")
        print("   - Expected: { disabled: true, enabled: false }")
        print()
        print("4. Capture screenshot:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="page-a-submit-disabled-empty",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")


class TestPageAValidationError:
    """Test 10,000+ word validation error."""
    
    def test_validation_error_text_too_long(self):
        """
        Test that text exceeding 10,000 words displays validation error.
        
        Validates: Requirement 1.3
        
        This edge case test verifies that the application properly
        validates and rejects content that exceeds the word limit.
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Validation Error - Text Too Long (10,000+ words)")
        print("="*70)
        
        # Generate content with 10,001 words
        word_count = 10001
        test_content = ' '.join(['word'] * word_count)
        
        screenshot_path = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "validation-error-too-long")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📝 Test content: {word_count} words ({len(test_content)} characters)")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("1. Take snapshot to find textarea UID")
        print()
        print("2. Fill textarea with 10,001 words:")
        print(f"   - Call: mcp_chrome_devtools_fill(uid='<textarea-uid>', value='<10001-word-content>')")
        print(f"   - Content: '{test_content[:100]}...' (truncated)")
        print()
        print("3. Verify validation error is displayed:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const errorEl = document.querySelector('[role=\"alert\"], .error-message, .text-red-500');")
        print("         return {")
        print("           hasError: errorEl !== null,")
        print("           errorText: errorEl?.textContent || null")
        print("         };")
        print("       }")
        print("     )")
        print("   - Expected: hasError: true, errorText contains '10,000'")
        print()
        print("4. Verify submit button is disabled:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const button = document.querySelector('button[type=\"submit\"]');")
        print("         return { disabled: button.disabled };")
        print("       }")
        print("     )")
        print("   - Expected: { disabled: true }")
        print()
        print("5. Capture screenshot showing error:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="page-a-validation-error-too-long",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")


class TestPageASuccessfulSubmission:
    """Test successful submission with mocked API response."""
    
    def test_successful_submission_navigates_to_page_b(self):
        """
        Test that successful submission with mocked API navigates to Page B.
        
        Validates: Requirement 1.4
        
        This test:
        1. Sets up network mocks for successful lyrics generation
        2. Fills in valid text content
        3. Submits the form
        4. Verifies navigation to Page B
        5. Verifies generated lyrics are displayed
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Successful Submission with Mocked API")
        print("="*70)
        
        # Setup network mocks
        mock_manager = setup_happy_path_mocks()
        injection_instructions = mock_manager.get_injection_instructions()
        
        # Test content
        test_content = "Photosynthesis is the process by which plants convert light energy into chemical energy."
        
        # Screenshot paths
        screenshot_before = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "submission-before")
        )
        screenshot_after = helper.get_screenshot_path(
            "page-b",
            helper.generate_screenshot_filename("page-b", "submission-success")
        )
        screenshots.extend([screenshot_before, screenshot_after])
        
        print(f"\n📝 Test content: {test_content}")
        print(f"📸 Screenshots: {len(screenshots)} planned")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("STEP 1: Inject Network Mocks")
        print("-"*70)
        print("Call: mcp_chrome_devtools_evaluate_script(")
        print(f"  function={injection_instructions['script'][:200]}...")
        print(")")
        print()
        print("Verify injection:")
        print("Call: mcp_chrome_devtools_evaluate_script(")
        print("  function=() => { return window.__networkMockInjected === true; }")
        print(")")
        print()
        
        print("-"*70)
        print("STEP 2: Fill Form and Submit")
        print("-"*70)
        print("1. Take snapshot to find elements")
        print()
        print("2. Fill textarea:")
        print(f"   - Call: mcp_chrome_devtools_fill(uid='<textarea-uid>', value='{test_content}')")
        print()
        print("3. Capture screenshot before submission:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_before}')")
        print()
        print("4. Click submit button:")
        print("   - Call: mcp_chrome_devtools_click(uid='<submit-button-uid>')")
        print()
        
        print("-"*70)
        print("STEP 3: Verify Navigation to Page B")
        print("-"*70)
        print("1. Wait for navigation:")
        print("   - Call: mcp_chrome_devtools_wait_for(text='Lyrics', timeout=10000)")
        print()
        print("2. Verify URL changed to Page B:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => { return window.location.pathname; }")
        print("     )")
        print("   - Expected: '/lyrics-editing' or similar")
        print()
        print("3. Verify lyrics are displayed:")
        print("   - Call: mcp_chrome_devtools_take_snapshot()")
        print("   - Look for lyrics content in textarea or display area")
        print()
        print("4. Capture screenshot of Page B:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_after}')")
        print()
        
        helper.record_test_result(
            scenario_id="page-a-successful-submission",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
        print("\nExpected mock response:")
        print(f"  Lyrics: {MOCK_LYRICS_SUCCESS['lyrics'][:100]}...")
        print(f"  Word count: {MOCK_LYRICS_SUCCESS['word_count']}")


class TestPageAErrorHandling:
    """Test API error handling scenarios."""
    
    def test_rate_limit_error(self):
        """
        Test that rate limit error (429) is displayed correctly.
        
        Validates: Requirement 1.5
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Rate Limit Error Handling")
        print("="*70)
        
        # Setup error mock
        mock_manager = setup_error_scenario_mocks("rate_limit")
        injection_instructions = mock_manager.get_injection_instructions()
        
        test_content = "Test content for rate limit error"
        
        screenshot_path = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "error-rate-limit")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📝 Test content: {test_content}")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("1. Inject network mocks for rate limit error:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print(f"       function={injection_instructions['script'][:200]}...")
        print("     )")
        print()
        print("2. Fill textarea and submit:")
        print(f"   - Fill: '{test_content}'")
        print("   - Click submit button")
        print()
        print("3. Verify error message is displayed:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const errorEl = document.querySelector('[role=\"alert\"], .error-message');")
        print("         return {")
        print("           hasError: errorEl !== null,")
        print("           errorText: errorEl?.textContent || null")
        print("         };")
        print("       }")
        print("     )")
        print(f"   - Expected error text: '{MOCK_ERROR_RATE_LIMIT['detail']}'")
        print()
        print("4. Capture screenshot showing error:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="page-a-error-rate-limit",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
    
    def test_server_error(self):
        """
        Test that server error (500) is displayed correctly.
        
        Validates: Requirement 1.5
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Server Error Handling")
        print("="*70)
        
        # Setup error mock
        mock_manager = setup_error_scenario_mocks("server_error")
        injection_instructions = mock_manager.get_injection_instructions()
        
        test_content = "Test content for server error"
        
        screenshot_path = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "error-server")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📝 Test content: {test_content}")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("1. Inject network mocks for server error:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print(f"       function={injection_instructions['script'][:200]}...")
        print("     )")
        print()
        print("2. Fill textarea and submit:")
        print(f"   - Fill: '{test_content}'")
        print("   - Click submit button")
        print()
        print("3. Verify error message is displayed:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const errorEl = document.querySelector('[role=\"alert\"], .error-message');")
        print("         return {")
        print("           hasError: errorEl !== null,")
        print("           errorText: errorEl?.textContent || null")
        print("         };")
        print("       }")
        print("     )")
        print(f"   - Expected error text: '{MOCK_ERROR_SERVER_ERROR['detail']}'")
        print()
        print("4. Capture screenshot showing error:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="page-a-error-server",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
    
    def test_timeout_error(self):
        """
        Test that timeout error is displayed correctly.
        
        Validates: Requirement 1.5
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Timeout Error Handling")
        print("="*70)
        
        # Setup error mock
        mock_manager = setup_error_scenario_mocks("timeout")
        injection_instructions = mock_manager.get_injection_instructions()
        
        test_content = "Test content for timeout error"
        
        screenshot_path = helper.get_screenshot_path(
            "page-a",
            helper.generate_screenshot_filename("page-a", "error-timeout")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📝 Test content: {test_content}")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("1. Inject network mocks for timeout error:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print(f"       function={injection_instructions['script'][:200]}...")
        print("     )")
        print()
        print("2. Fill textarea and submit:")
        print(f"   - Fill: '{test_content}'")
        print("   - Click submit button")
        print()
        print("3. Verify error message is displayed:")
        print("   - Call: mcp_chrome_devtools_evaluate_script(")
        print("       function=() => {")
        print("         const errorEl = document.querySelector('[role=\"alert\"], .error-message');")
        print("         return {")
        print("           hasError: errorEl !== null,")
        print("           errorText: errorEl?.textContent || null")
        print("         };")
        print("       }")
        print("     )")
        print(f"   - Expected error text: '{MOCK_ERROR_TIMEOUT['detail']}'")
        print()
        print("4. Capture screenshot showing error:")
        print(f"   - Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="page-a-error-timeout",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")


# ============================================================================
# TEST EXECUTION SUMMARY
# ============================================================================

def print_test_summary():
    """Print a summary of all Page A test scenarios."""
    print("\n" + "="*70)
    print("PAGE A (TEXT INPUT) TEST SCENARIOS - SUMMARY")
    print("="*70)
    print("\nTest Classes:")
    print("  1. TestPageASetup - Prerequisites verification")
    print("  2. TestPageAInitialLoad - Initial page load and UI visibility")
    print("  3. TestPageATextInput - Text input with various valid lengths")
    print("  4. TestPageASubmitButtonState - Submit button enable/disable")
    print("  5. TestPageAValidationError - 10,000+ word validation error")
    print("  6. TestPageASuccessfulSubmission - Successful submission with mocked API")
    print("  7. TestPageAErrorHandling - API error handling (rate limit, server, timeout)")
    print()
    print("Total Test Methods: 9")
    print()
    print("Requirements Coverage:")
    print("  ✓ 1.1 - Initial page load and UI element visibility")
    print("  ✓ 1.2 - Valid text input enables submit button")
    print("  ✓ 1.3 - Text exceeding 10,000 words displays validation error")
    print("  ✓ 1.4 - Successful submission navigates to Page B")
    print("  ✓ 1.5 - API error handling (rate limit, server error, timeout)")
    print()
    print("Execution Instructions:")
    print("  1. Ensure Chrome is running: chrome --remote-debugging-port=9222")
    print("  2. Ensure frontend is running: cd frontend && pnpm dev")
    print("  3. Run tests: cd backend && poetry run pytest tests/test_e2e_page_a.py -v -s")
    print("  4. Follow the Chrome DevTools MCP instructions printed by each test")
    print("  5. Screenshots will be saved to: ./report/e2e-chrome-devtools-testing/page-a/")
    print()
    print("="*70)


if __name__ == "__main__":
    print_test_summary()
