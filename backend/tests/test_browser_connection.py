"""
Test script to verify browser connection and navigation utilities.

This script tests the helper functions for verifying Chrome and frontend server
status, and demonstrates how to use the navigation utilities.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from tests.e2e_helpers import (
    ChromeDevToolsHelper,
    verify_chrome_running,
    verify_frontend_running,
    get_page_url,
    navigate_to_page,
    connect_to_browser
)


def test_verify_chrome():
    """Test Chrome verification function."""
    print("\n=== Testing Chrome Verification ===")
    is_running, message = verify_chrome_running()
    print(f"Chrome Running: {is_running}")
    print(f"Message: {message}")
    return is_running


def test_verify_frontend():
    """Test frontend server verification function."""
    print("\n=== Testing Frontend Server Verification ===")
    is_running, message = verify_frontend_running()
    print(f"Frontend Running: {is_running}")
    print(f"Message: {message}")
    return is_running


def test_get_page_urls():
    """Test page URL generation."""
    print("\n=== Testing Page URL Generation ===")
    pages = ["home", "page-a", "page-b", "page-c"]
    
    for page in pages:
        url = get_page_url(page)
        print(f"{page}: {url}")


def test_navigation_instructions():
    """Test navigation instruction generation."""
    print("\n=== Testing Navigation Instructions ===")
    
    nav_instructions = navigate_to_page("page-a", timeout=30)
    print(f"\nNavigation to Page A:")
    print(f"  Action: {nav_instructions['action']}")
    print(f"  URL: {nav_instructions['url']}")
    print(f"  Timeout: {nav_instructions['timeout']}s")
    print(f"  Instructions: {nav_instructions['instructions']}")


def test_connection_instructions():
    """Test browser connection instruction generation."""
    print("\n=== Testing Browser Connection Instructions ===")
    
    conn_instructions = connect_to_browser()
    print(f"\nConnection Instructions:")
    print(f"  Action: {conn_instructions['action']}")
    print(f"  Chrome Debug Port: {conn_instructions['chrome_debug_port']}")
    print(f"  Instructions: {conn_instructions['instructions']}")
    print(f"\nSteps:")
    for step in conn_instructions['steps']:
        print(f"    {step}")


def test_helper_class():
    """Test ChromeDevToolsHelper class methods."""
    print("\n=== Testing ChromeDevToolsHelper Class ===")
    
    helper = ChromeDevToolsHelper()
    
    # Test prerequisites check
    print("\nChecking Prerequisites:")
    success, issues = helper.verify_prerequisites()
    print(f"  Success: {success}")
    if issues:
        print("  Issues:")
        for issue in issues:
            print(f"    - {issue}")
    else:
        print("  No issues found!")
    
    # Test wait for element instructions
    print("\nWait for Element Instructions:")
    wait_instructions = helper.wait_for_element("textarea", timeout=10)
    print(f"  Selector: {wait_instructions['selector']}")
    print(f"  Timeout: {wait_instructions['timeout']}s")
    print(f"  Visible: {wait_instructions['visible']}")
    
    # Test page verification
    print("\nPage Verification Instructions:")
    verify_instructions = helper.verify_page_loaded("page-a")
    print(f"  Page: {verify_instructions['page']}")
    print(f"  Expected Elements: {verify_instructions['expected_elements']}")
    
    # Test retry navigation
    print("\nRetry Navigation Instructions:")
    retry_instructions = helper.retry_navigation("page-b", max_retries=3)
    print(f"  URL: {retry_instructions['url']}")
    print(f"  Max Retries: {retry_instructions['max_retries']}")
    print(f"  Retry Strategy: {retry_instructions['retry_strategy']}")


def main():
    """Run all tests."""
    print("=" * 70)
    print("Browser Connection and Navigation Utilities Test")
    print("=" * 70)
    
    # Test verification functions
    chrome_ok = test_verify_chrome()
    frontend_ok = test_verify_frontend()
    
    # Test URL generation
    test_get_page_urls()
    
    # Test instruction generation
    test_navigation_instructions()
    test_connection_instructions()
    
    # Test helper class
    test_helper_class()
    
    # Summary
    print("\n" + "=" * 70)
    print("Test Summary")
    print("=" * 70)
    print(f"Chrome Running: {'✓' if chrome_ok else '✗'}")
    print(f"Frontend Running: {'✓' if frontend_ok else '✗'}")
    
    if chrome_ok and frontend_ok:
        print("\n✓ All prerequisites met! Ready for E2E testing.")
    else:
        print("\n✗ Some prerequisites not met. Please check the messages above.")
        if not chrome_ok:
            print("  - Start Chrome with: chrome --remote-debugging-port=9222")
        if not frontend_ok:
            print("  - Start frontend with: cd frontend && pnpm dev")
    
    print("=" * 70)


if __name__ == "__main__":
    main()
