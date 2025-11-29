"""
Demonstration script for network interception and mocking system.

This script shows how to use the network mocking system with Chrome DevTools MCP
for E2E testing. It demonstrates various mock scenarios and provides example code.

Run this script to see example output and understand how to use the system.
"""

import sys
from pathlib import Path

# Add tests directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from e2e_network_mock import (
    NetworkMockManager,
    setup_happy_path_mocks,
    setup_error_scenario_mocks,
    inject_network_mocks,
    inject_websocket_mocks,
    verify_mocks_injected
)


def demo_basic_usage():
    """Demonstrate basic usage of network mocking."""
    print("=" * 80)
    print("DEMO 1: Basic Network Mocking")
    print("=" * 80)
    
    # Create a manager
    manager = NetworkMockManager()
    
    # Add mock for lyrics generation
    manager.add_lyrics_generation_mock(response_type="success")
    
    # Add mock for song generation
    manager.add_song_generation_mock(response_type="queued")
    
    # Get injection instructions
    instructions = manager.get_injection_instructions()
    
    print(f"\nCreated {instructions['rules_count']} mock rules")
    print("\nInjection Instructions:")
    print(instructions["instructions"])
    
    print("\nSteps to inject:")
    for step in instructions["steps"]:
        print(f"  {step}")
    
    print("\n✓ Demo 1 complete\n")


def demo_happy_path():
    """Demonstrate happy path scenario setup."""
    print("=" * 80)
    print("DEMO 2: Happy Path Scenario")
    print("=" * 80)
    
    # Setup happy path mocks
    manager = setup_happy_path_mocks()
    
    # Get statistics
    stats = manager.get_rule_stats()
    
    print("\nConfigured mock rules:")
    for stat in stats:
        print(f"  - {stat['method']} {stat['url_pattern']}")
        print(f"    Enabled: {stat['enabled']}, Hit count: {stat['hit_count']}")
    
    # Get injection instructions
    instructions = inject_network_mocks(manager)
    
    print(f"\nReady to inject {instructions['rules_count']} rules")
    print("\n✓ Demo 2 complete\n")


def demo_error_scenarios():
    """Demonstrate error scenario setups."""
    print("=" * 80)
    print("DEMO 3: Error Scenarios")
    print("=" * 80)
    
    error_types = ["rate_limit", "server_error", "timeout"]
    
    for error_type in error_types:
        print(f"\n--- {error_type.upper()} Scenario ---")
        
        manager = setup_error_scenario_mocks(error_type)
        stats = manager.get_rule_stats()
        
        for stat in stats:
            print(f"  Pattern: {stat['url_pattern']}")
            print(f"  Method: {stat['method']}")
        
        # Get the rule to show response details
        rule = manager.rules[0]
        print(f"  Response Status: {rule.response.status}")
        print(f"  Response Body: {rule.response.body}")
    
    print("\n✓ Demo 3 complete\n")


def demo_websocket_mocking():
    """Demonstrate WebSocket mocking."""
    print("=" * 80)
    print("DEMO 4: WebSocket Mocking")
    print("=" * 80)
    
    sequence_types = ["success", "failed", "slow"]
    
    for sequence_type in sequence_types:
        print(f"\n--- {sequence_type.upper()} Sequence ---")
        
        instructions = inject_websocket_mocks(sequence_type=sequence_type)
        
        print(f"  Sequence type: {instructions['sequence_type']}")
        print(f"  Action: {instructions['action']}")
        print(f"  Instructions: {instructions['instructions'][:100]}...")
    
    print("\n✓ Demo 4 complete\n")


def demo_custom_rules():
    """Demonstrate creating custom mock rules."""
    print("=" * 80)
    print("DEMO 5: Custom Mock Rules")
    print("=" * 80)
    
    from e2e_network_mock import MockResponse
    
    manager = NetworkMockManager()
    
    # Custom rule 1: Mock with delay
    print("\n--- Custom Rule 1: With Network Delay ---")
    response1 = MockResponse(
        status=200,
        body={"message": "Delayed response"},
        delay_ms=2000
    )
    manager.add_rule(
        url_pattern="/api/custom/slow",
        response=response1,
        method="GET"
    )
    print("  Added rule with 2000ms delay")
    
    # Custom rule 2: Mock with custom headers
    print("\n--- Custom Rule 2: With Custom Headers ---")
    response2 = MockResponse(
        status=200,
        body={"data": "custom"},
        headers={"X-Custom-Header": "value", "X-Request-ID": "12345"}
    )
    manager.add_rule(
        url_pattern="/api/custom/headers",
        response=response2,
        method="POST"
    )
    print("  Added rule with custom headers")
    
    # Custom rule 3: Mock with regex pattern
    print("\n--- Custom Rule 3: With Regex Pattern ---")
    response3 = MockResponse(
        status=200,
        body={"matched": "regex"}
    )
    manager.add_rule(
        url_pattern=r"/api/(v1|v2)/users/\d+",
        response=response3,
        method="GET",
        match_type="regex"
    )
    print("  Added rule with regex pattern: /api/(v1|v2)/users/\\d+")
    
    # Show all rules
    print("\n--- All Custom Rules ---")
    stats = manager.get_rule_stats()
    for i, stat in enumerate(stats, 1):
        print(f"  Rule {i}: {stat['method']} {stat['url_pattern']}")
    
    print("\n✓ Demo 5 complete\n")


def demo_rule_management():
    """Demonstrate rule management features."""
    print("=" * 80)
    print("DEMO 6: Rule Management")
    print("=" * 80)
    
    manager = NetworkMockManager()
    
    # Add some rules
    manager.add_lyrics_generation_mock()
    manager.add_song_generation_mock()
    
    print("\n--- Initial Rules ---")
    stats = manager.get_rule_stats()
    for stat in stats:
        print(f"  {stat['url_pattern']}: enabled={stat['enabled']}, hits={stat['hit_count']}")
    
    # Disable a rule
    print("\n--- After Disabling Lyrics Rule ---")
    manager.disable_rule("/api/lyrics/generate")
    stats = manager.get_rule_stats()
    for stat in stats:
        print(f"  {stat['url_pattern']}: enabled={stat['enabled']}, hits={stat['hit_count']}")
    
    # Enable it again
    print("\n--- After Re-enabling Lyrics Rule ---")
    manager.enable_rule("/api/lyrics/generate")
    stats = manager.get_rule_stats()
    for stat in stats:
        print(f"  {stat['url_pattern']}: enabled={stat['enabled']}, hits={stat['hit_count']}")
    
    # Simulate some hits
    print("\n--- After Simulating Hits ---")
    manager.rules[0].get_response()
    manager.rules[0].get_response()
    manager.rules[1].get_response()
    stats = manager.get_rule_stats()
    for stat in stats:
        print(f"  {stat['url_pattern']}: enabled={stat['enabled']}, hits={stat['hit_count']}")
    
    # Clear all rules
    print("\n--- After Clearing All Rules ---")
    manager.clear_rules()
    stats = manager.get_rule_stats()
    print(f"  Total rules: {len(stats)}")
    
    print("\n✓ Demo 6 complete\n")


def demo_script_generation():
    """Demonstrate script generation."""
    print("=" * 80)
    print("DEMO 7: Script Generation")
    print("=" * 80)
    
    manager = NetworkMockManager()
    manager.add_lyrics_generation_mock()
    
    # Generate network mock script
    print("\n--- Network Mock Script ---")
    script = manager.generate_injection_script()
    print(f"  Script length: {len(script)} characters")
    print(f"  Contains 'window.fetch': {'window.fetch' in script}")
    print(f"  Contains 'XMLHttpRequest': {'XMLHttpRequest' in script}")
    print(f"  Contains '__networkMockInjected': {'__networkMockInjected' in script}")
    
    # Generate WebSocket mock script
    print("\n--- WebSocket Mock Script ---")
    ws_script = manager.get_websocket_mock_script(sequence_type="success")
    print(f"  Script length: {len(ws_script)} characters")
    print(f"  Contains 'WebSocket': {'WebSocket' in ws_script}")
    print(f"  Contains '__websocketMockInjected': {'__websocketMockInjected' in ws_script}")
    
    # Verification script
    print("\n--- Verification Script ---")
    verify_script = verify_mocks_injected()
    print(f"  Script length: {len(verify_script)} characters")
    print(f"  Script preview:")
    print(f"    {verify_script[:100]}...")
    
    print("\n✓ Demo 7 complete\n")


def demo_complete_workflow():
    """Demonstrate complete workflow for E2E testing."""
    print("=" * 80)
    print("DEMO 8: Complete E2E Testing Workflow")
    print("=" * 80)
    
    print("\n--- Step 1: Setup Prerequisites ---")
    print("  ✓ Chrome running with remote debugging on port 9222")
    print("  ✓ Frontend dev server running on port 5173")
    
    print("\n--- Step 2: Create Mock Manager ---")
    manager = setup_happy_path_mocks()
    print(f"  ✓ Created manager with {len(manager.rules)} rules")
    
    print("\n--- Step 3: Get Injection Instructions ---")
    instructions = inject_network_mocks(manager)
    print(f"  ✓ Generated injection script ({len(instructions['script'])} chars)")
    
    print("\n--- Step 4: Chrome DevTools MCP Commands ---")
    print("  1. mcp_chrome_devtools_list_pages")
    print("     → Lists available browser pages")
    
    print("\n  2. mcp_chrome_devtools_select_page(pageIdx=0)")
    print("     → Selects the first page")
    
    print("\n  3. mcp_chrome_devtools_navigate_page(")
    print("       type='url',")
    print("       url='http://localhost:5173'")
    print("     )")
    print("     → Navigates to the application")
    
    print("\n  4. mcp_chrome_devtools_evaluate_script(")
    print("       function=instructions['script']")
    print("     )")
    print("     → Injects network mocks")
    
    print("\n  5. mcp_chrome_devtools_evaluate_script(")
    print("       function=instructions['verification_script']")
    print("     )")
    print("     → Verifies mocks are injected")
    print("     → Expected result: {'networkMockInjected': true}")
    
    print("\n--- Step 5: Inject WebSocket Mocks ---")
    ws_instructions = inject_websocket_mocks(sequence_type="success")
    print("  6. mcp_chrome_devtools_evaluate_script(")
    print("       function=ws_instructions['script']")
    print("     )")
    print("     → Injects WebSocket mocks")
    
    print("\n--- Step 6: Perform Test Actions ---")
    print("  ✓ Fill text input")
    print("  ✓ Click submit button")
    print("  ✓ Verify navigation to Page B")
    print("  ✓ Edit lyrics")
    print("  ✓ Select music style")
    print("  ✓ Generate song")
    print("  ✓ Verify navigation to Page C")
    
    print("\n--- Step 7: Capture Screenshots ---")
    print("  7. mcp_chrome_devtools_take_screenshot(")
    print("       filePath='./report/e2e-chrome-devtools-testing/page-a/test.png'")
    print("     )")
    print("     → Captures screenshot")
    
    print("\n--- Step 8: Check Mock Statistics ---")
    stats = manager.get_rule_stats()
    print("  Mock rule usage:")
    for stat in stats:
        print(f"    {stat['url_pattern']}: {stat['hit_count']} hits")
    
    print("\n✓ Demo 8 complete\n")


def main():
    """Run all demonstrations."""
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 20 + "NETWORK MOCKING SYSTEM DEMO" + " " * 31 + "║")
    print("╚" + "=" * 78 + "╝")
    print("\n")
    
    demos = [
        demo_basic_usage,
        demo_happy_path,
        demo_error_scenarios,
        demo_websocket_mocking,
        demo_custom_rules,
        demo_rule_management,
        demo_script_generation,
        demo_complete_workflow
    ]
    
    for demo in demos:
        demo()
        input("Press Enter to continue to next demo...")
        print("\n")
    
    print("=" * 80)
    print("ALL DEMOS COMPLETE")
    print("=" * 80)
    print("\nFor more information, see:")
    print("  - NETWORK_MOCK_GUIDE.md")
    print("  - e2e_network_mock.py")
    print("  - test_network_mock.py")
    print("\n")


if __name__ == "__main__":
    main()
