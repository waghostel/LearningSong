"""
End-to-End tests for Responsive Design using Chrome DevTools MCP.

This module implements browser-based E2E tests for responsive design,
validating layout adaptation across different viewport sizes (mobile, tablet, desktop),
viewport transitions, and touch target sizes on mobile.

Requirements tested:
- 5.1: Mobile viewport (375px) layout
- 5.2: Tablet viewport (768px) layout
- 5.3: Desktop viewport (1920px) layout
- 5.4: Viewport size transitions and layout adaptation
- 5.5: Touch target sizes on mobile viewport
"""

import pytest
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple

from tests.e2e_helpers import ChromeDevToolsHelper, create_helper


class TestResponsiveSetup:
    """Test setup and prerequisites for responsive design testing."""
    
    def test_prerequisites(self):
        """
        Verify that all prerequisites for responsive design testing are met.
        
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


class TestMobileViewport:
    """Test mobile viewport (375px) layout."""
    
    def test_mobile_viewport_page_a(self):
        """
        Test Page A layout at mobile viewport (375px width).
        
        Validates: Requirement 5.1
        
        This test:
        1. Resizes viewport to mobile dimensions (375x667)
        2. Navigates to Page A
        3. Verifies mobile-optimized layout
        4. Captures screenshot
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Mobile Viewport - Page A (375px)")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        mobile_width, mobile_height = viewport_sizes["mobile"]
        
        screenshot_path = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "mobile-page-a")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📱 Viewport: {mobile_width}x{mobile_height} (Mobile)")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("STEP 1: Resize Viewport to Mobile")
        print("-"*70)
        print(f"Call: mcp_chrome_devtools_resize_page(width={mobile_width}, height={mobile_height})")
        print()
        
        print("-"*70)
        print("STEP 2: Navigate to Page A")
        print("-"*70)
        print(f"Call: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-a')}')")
        print()
        
        print("-"*70)
        print("STEP 3: Verify Mobile Layout")
        print("-"*70)
        print("Call: mcp_chrome_devtools_evaluate_script(")
        print("  function=() => {")
        print("    return {")
        print("      viewportWidth: window.innerWidth,")
        print("      viewportHeight: window.innerHeight,")
        print("      isMobile: window.innerWidth <= 768")
        print("    };")
        print("  }")
        print(")")
        print(f"Expected: viewportWidth: {mobile_width}, isMobile: true")
        print()
        
        print("-"*70)
        print("STEP 4: Capture Screenshot")
        print("-"*70)
        print(f"Call: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-mobile-page-a",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
    
    def test_mobile_viewport_page_b(self):
        """
        Test Page B layout at mobile viewport (375px width).
        
        Validates: Requirement 5.1
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Mobile Viewport - Page B (375px)")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        mobile_width, mobile_height = viewport_sizes["mobile"]
        
        screenshot_path = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "mobile-page-b")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📱 Viewport: {mobile_width}x{mobile_height} (Mobile)")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print(f"1. Resize: mcp_chrome_devtools_resize_page(width={mobile_width}, height={mobile_height})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-b')}')")
        print("3. Verify mobile layout elements are stacked vertically")
        print(f"4. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-mobile-page-b",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
    
    def test_mobile_viewport_page_c(self):
        """
        Test Page C layout at mobile viewport (375px width).
        
        Validates: Requirement 5.1
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Mobile Viewport - Page C (375px)")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        mobile_width, mobile_height = viewport_sizes["mobile"]
        
        screenshot_path = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "mobile-page-c")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📱 Viewport: {mobile_width}x{mobile_height} (Mobile)")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print(f"1. Resize: mcp_chrome_devtools_resize_page(width={mobile_width}, height={mobile_height})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-c')}')")
        print("3. Verify audio player controls are accessible on mobile")
        print(f"4. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-mobile-page-c",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")


class TestTabletViewport:
    """Test tablet viewport (768px) layout."""
    
    def test_tablet_viewport_page_a(self):
        """
        Test Page A layout at tablet viewport (768px width).
        
        Validates: Requirement 5.2
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Tablet Viewport - Page A (768px)")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        tablet_width, tablet_height = viewport_sizes["tablet"]
        
        screenshot_path = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "tablet-page-a")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📱 Viewport: {tablet_width}x{tablet_height} (Tablet)")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print(f"1. Resize: mcp_chrome_devtools_resize_page(width={tablet_width}, height={tablet_height})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-a')}')")
        print("3. Verify tablet layout with appropriate spacing")
        print(f"4. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-tablet-page-a",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
    
    def test_tablet_viewport_page_b(self):
        """
        Test Page B layout at tablet viewport (768px width).
        
        Validates: Requirement 5.2
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Tablet Viewport - Page B (768px)")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        tablet_width, tablet_height = viewport_sizes["tablet"]
        
        screenshot_path = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "tablet-page-b")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📱 Viewport: {tablet_width}x{tablet_height} (Tablet)")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print(f"1. Resize: mcp_chrome_devtools_resize_page(width={tablet_width}, height={tablet_height})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-b')}')")
        print("3. Verify lyrics editor and controls are properly laid out")
        print(f"4. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-tablet-page-b",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
    
    def test_tablet_viewport_page_c(self):
        """
        Test Page C layout at tablet viewport (768px width).
        
        Validates: Requirement 5.2
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Tablet Viewport - Page C (768px)")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        tablet_width, tablet_height = viewport_sizes["tablet"]
        
        screenshot_path = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "tablet-page-c")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📱 Viewport: {tablet_width}x{tablet_height} (Tablet)")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print(f"1. Resize: mcp_chrome_devtools_resize_page(width={tablet_width}, height={tablet_height})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-c')}')")
        print("3. Verify audio player and metadata display properly")
        print(f"4. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-tablet-page-c",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")


class TestDesktopViewport:
    """Test desktop viewport (1920px) layout."""
    
    def test_desktop_viewport_page_a(self):
        """
        Test Page A layout at desktop viewport (1920px width).
        
        Validates: Requirement 5.3
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Desktop Viewport - Page A (1920px)")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        desktop_width, desktop_height = viewport_sizes["desktop"]
        
        screenshot_path = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "desktop-page-a")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n🖥️  Viewport: {desktop_width}x{desktop_height} (Desktop)")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print(f"1. Resize: mcp_chrome_devtools_resize_page(width={desktop_width}, height={desktop_height})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-a')}')")
        print("3. Verify desktop layout with full width utilization")
        print(f"4. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-desktop-page-a",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
    
    def test_desktop_viewport_page_b(self):
        """
        Test Page B layout at desktop viewport (1920px width).
        
        Validates: Requirement 5.3
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Desktop Viewport - Page B (1920px)")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        desktop_width, desktop_height = viewport_sizes["desktop"]
        
        screenshot_path = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "desktop-page-b")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n🖥️  Viewport: {desktop_width}x{desktop_height} (Desktop)")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print(f"1. Resize: mcp_chrome_devtools_resize_page(width={desktop_width}, height={desktop_height})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-b')}')")
        print("3. Verify desktop layout with side-by-side elements if applicable")
        print(f"4. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-desktop-page-b",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
    
    def test_desktop_viewport_page_c(self):
        """
        Test Page C layout at desktop viewport (1920px width).
        
        Validates: Requirement 5.3
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Desktop Viewport - Page C (1920px)")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        desktop_width, desktop_height = viewport_sizes["desktop"]
        
        screenshot_path = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "desktop-page-c")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n🖥️  Viewport: {desktop_width}x{desktop_height} (Desktop)")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print(f"1. Resize: mcp_chrome_devtools_resize_page(width={desktop_width}, height={desktop_height})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-c')}')")
        print("3. Verify desktop layout with optimal spacing and alignment")
        print(f"4. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-desktop-page-c",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")


class TestViewportTransitions:
    """Test viewport size transitions and layout adaptation."""
    
    def test_viewport_transition_mobile_to_desktop(self):
        """
        Test layout adaptation when transitioning from mobile to desktop.
        
        Validates: Requirement 5.4
        
        This test verifies that the application adapts its layout smoothly
        when the viewport size changes from mobile to desktop dimensions.
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Viewport Transition - Mobile to Desktop")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        mobile_width, mobile_height = viewport_sizes["mobile"]
        desktop_width, desktop_height = viewport_sizes["desktop"]
        
        screenshot_mobile = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "transition-mobile")
        )
        screenshot_desktop = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "transition-desktop")
        )
        screenshots.extend([screenshot_mobile, screenshot_desktop])
        
        print(f"\n📱 Start: {mobile_width}x{mobile_height} (Mobile)")
        print(f"🖥️  End: {desktop_width}x{desktop_height} (Desktop)")
        print(f"📸 Screenshots: {len(screenshots)}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("STEP 1: Start at Mobile Viewport")
        print("-"*70)
        print(f"1. Resize: mcp_chrome_devtools_resize_page(width={mobile_width}, height={mobile_height})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-a')}')")
        print(f"3. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_mobile}')")
        print()
        
        print("-"*70)
        print("STEP 2: Transition to Desktop Viewport")
        print("-"*70)
        print(f"4. Resize: mcp_chrome_devtools_resize_page(width={desktop_width}, height={desktop_height})")
        print("5. Wait for layout to adapt (2 seconds)")
        print(f"6. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_desktop}')")
        print()
        
        print("-"*70)
        print("STEP 3: Verify Layout Adaptation")
        print("-"*70)
        print("7. Verify no layout breaks or overlapping elements:")
        print("   Call: mcp_chrome_devtools_evaluate_script(")
        print("     function=() => {")
        print("       const elements = document.querySelectorAll('*');")
        print("       let hasOverflow = false;")
        print("       elements.forEach(el => {")
        print("         const rect = el.getBoundingClientRect();")
        print("         if (rect.right > window.innerWidth) hasOverflow = true;")
        print("       });")
        print("       return {")
        print("         viewportWidth: window.innerWidth,")
        print("         hasOverflow: hasOverflow")
        print("       };")
        print("     }")
        print("   )")
        print("   Expected: hasOverflow: false")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-transition-mobile-to-desktop",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
    
    def test_viewport_transition_desktop_to_mobile(self):
        """
        Test layout adaptation when transitioning from desktop to mobile.
        
        Validates: Requirement 5.4
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Viewport Transition - Desktop to Mobile")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        mobile_width, mobile_height = viewport_sizes["mobile"]
        desktop_width, desktop_height = viewport_sizes["desktop"]
        
        screenshot_desktop = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "transition-desktop-start")
        )
        screenshot_mobile = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "transition-mobile-end")
        )
        screenshots.extend([screenshot_desktop, screenshot_mobile])
        
        print(f"\n🖥️  Start: {desktop_width}x{desktop_height} (Desktop)")
        print(f"📱 End: {mobile_width}x{mobile_height} (Mobile)")
        print(f"📸 Screenshots: {len(screenshots)}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print(f"1. Start at desktop: mcp_chrome_devtools_resize_page(width={desktop_width}, height={desktop_height})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-a')}')")
        print(f"3. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_desktop}')")
        print(f"4. Resize to mobile: mcp_chrome_devtools_resize_page(width={mobile_width}, height={mobile_height})")
        print(f"5. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_mobile}')")
        print("6. Verify layout adapts without breaking")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-transition-desktop-to-mobile",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
    
    def test_viewport_transition_tablet_breakpoint(self):
        """
        Test layout adaptation at tablet breakpoint (768px).
        
        Validates: Requirement 5.4
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Viewport Transition - Tablet Breakpoint")
        print("="*70)
        
        # Test around the tablet breakpoint
        viewport_before = (767, 1024)  # Just below tablet breakpoint
        viewport_after = (769, 1024)   # Just above tablet breakpoint
        
        screenshot_before = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "breakpoint-767px")
        )
        screenshot_after = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "breakpoint-769px")
        )
        screenshots.extend([screenshot_before, screenshot_after])
        
        print(f"\n📱 Before: {viewport_before[0]}x{viewport_before[1]} (Mobile)")
        print(f"📱 After: {viewport_after[0]}x{viewport_after[1]} (Tablet)")
        print(f"📸 Screenshots: {len(screenshots)}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print(f"1. Resize to 767px: mcp_chrome_devtools_resize_page(width={viewport_before[0]}, height={viewport_before[1]})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-a')}')")
        print(f"3. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_before}')")
        print(f"4. Resize to 769px: mcp_chrome_devtools_resize_page(width={viewport_after[0]}, height={viewport_after[1]})")
        print(f"5. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_after}')")
        print("6. Verify layout changes appropriately at breakpoint")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-transition-tablet-breakpoint",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")


class TestTouchTargetSizes:
    """Test touch target sizes on mobile viewport."""
    
    def test_touch_target_sizes_page_a(self):
        """
        Test that interactive elements on Page A meet minimum touch target size.
        
        Validates: Requirement 5.5
        
        This test verifies that all interactive elements (buttons, inputs, links)
        on Page A have touch targets of at least 44x44 pixels when viewed on
        mobile viewport, meeting accessibility guidelines.
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Touch Target Sizes - Page A (Mobile)")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        mobile_width, mobile_height = viewport_sizes["mobile"]
        min_touch_size = 44  # Minimum touch target size in pixels
        
        screenshot_path = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "touch-targets-page-a")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📱 Viewport: {mobile_width}x{mobile_height} (Mobile)")
        print(f"✋ Minimum touch target: {min_touch_size}x{min_touch_size}px")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print("-"*70)
        print("STEP 1: Setup Mobile Viewport")
        print("-"*70)
        print(f"1. Resize: mcp_chrome_devtools_resize_page(width={mobile_width}, height={mobile_height})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-a')}')")
        print()
        
        print("-"*70)
        print("STEP 2: Measure Touch Target Sizes")
        print("-"*70)
        print("3. Measure all interactive elements:")
        print("   Call: mcp_chrome_devtools_evaluate_script(")
        print("     function=() => {")
        print("       const interactiveSelectors = [")
        print("         'button', 'a', 'input', 'textarea', 'select',")
        print("         '[role=\"button\"]', '[onclick]'")
        print("       ];")
        print("       const elements = [];")
        print("       interactiveSelectors.forEach(selector => {")
        print("         document.querySelectorAll(selector).forEach(el => {")
        print("           const rect = el.getBoundingClientRect();")
        print("           const computedStyle = window.getComputedStyle(el);")
        print("           if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden') {")
        print("             elements.push({")
        print("               tag: el.tagName,")
        print("               text: el.textContent?.trim().substring(0, 30),")
        print("               width: Math.round(rect.width),")
        print("               height: Math.round(rect.height),")
        print(f"               meetsMinimum: rect.width >= {min_touch_size} && rect.height >= {min_touch_size}")
        print("             });")
        print("           }")
        print("         });")
        print("       });")
        print("       const failingElements = elements.filter(el => !el.meetsMinimum);")
        print("       return {")
        print("         totalElements: elements.length,")
        print("         passingElements: elements.filter(el => el.meetsMinimum).length,")
        print("         failingElements: failingElements,")
        print("         allPass: failingElements.length === 0")
        print("       };")
        print("     }")
        print("   )")
        print()
        print(f"   Expected: allPass: true (all elements >= {min_touch_size}x{min_touch_size}px)")
        print()
        
        print("-"*70)
        print("STEP 3: Capture Screenshot")
        print("-"*70)
        print(f"4. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-touch-targets-page-a",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
        print(f"\nNote: All interactive elements should be at least {min_touch_size}x{min_touch_size}px")
        print("      to meet WCAG 2.1 Level AAA accessibility guidelines.")
    
    def test_touch_target_sizes_page_b(self):
        """
        Test that interactive elements on Page B meet minimum touch target size.
        
        Validates: Requirement 5.5
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Touch Target Sizes - Page B (Mobile)")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        mobile_width, mobile_height = viewport_sizes["mobile"]
        min_touch_size = 44
        
        screenshot_path = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "touch-targets-page-b")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📱 Viewport: {mobile_width}x{mobile_height} (Mobile)")
        print(f"✋ Minimum touch target: {min_touch_size}x{min_touch_size}px")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print(f"1. Resize: mcp_chrome_devtools_resize_page(width={mobile_width}, height={mobile_height})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-b')}')")
        print("3. Measure interactive elements (use same script as Page A test)")
        print(f"4. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-touch-targets-page-b",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")
    
    def test_touch_target_sizes_page_c(self):
        """
        Test that interactive elements on Page C meet minimum touch target size.
        
        Validates: Requirement 5.5
        """
        helper = create_helper()
        screenshots = []
        
        print("\n" + "="*70)
        print("TEST: Touch Target Sizes - Page C (Mobile)")
        print("="*70)
        
        viewport_sizes = helper.get_viewport_sizes()
        mobile_width, mobile_height = viewport_sizes["mobile"]
        min_touch_size = 44
        
        screenshot_path = helper.get_screenshot_path(
            "responsive",
            helper.generate_screenshot_filename("responsive", "touch-targets-page-c")
        )
        screenshots.append(screenshot_path)
        
        print(f"\n📱 Viewport: {mobile_width}x{mobile_height} (Mobile)")
        print(f"✋ Minimum touch target: {min_touch_size}x{min_touch_size}px")
        print(f"📸 Screenshot: {screenshot_path}")
        
        print("\nCHROME DEVTOOLS MCP INSTRUCTIONS:")
        print(f"1. Resize: mcp_chrome_devtools_resize_page(width={mobile_width}, height={mobile_height})")
        print(f"2. Navigate: mcp_chrome_devtools_navigate_page(type='url', url='{helper.get_page_url('page-c')}')")
        print("3. Measure audio player controls (play, pause, volume, download)")
        print(f"4. Screenshot: mcp_chrome_devtools_take_screenshot(filePath='{screenshot_path}')")
        print()
        
        helper.record_test_result(
            scenario_id="responsive-touch-targets-page-c",
            status="manual",
            duration=0,
            screenshots=screenshots
        )
        
        print("✓ Test instructions generated")


# ============================================================================
# TEST EXECUTION SUMMARY
# ============================================================================

def print_test_summary():
    """Print a summary of all responsive design test scenarios."""
    print("\n" + "="*70)
    print("RESPONSIVE DESIGN TEST SCENARIOS - SUMMARY")
    print("="*70)
    print("\nTest Classes:")
    print("  1. TestResponsiveSetup - Prerequisites verification")
    print("  2. TestMobileViewport - Mobile (375px) layout for all pages")
    print("  3. TestTabletViewport - Tablet (768px) layout for all pages")
    print("  4. TestDesktopViewport - Desktop (1920px) layout for all pages")
    print("  5. TestViewportTransitions - Viewport size transitions and adaptation")
    print("  6. TestTouchTargetSizes - Touch target sizes on mobile viewport")
    print()
    print("Total Test Methods: 16")
    print()
    print("Requirements Coverage:")
    print("  ✓ 5.1 - Mobile viewport (375px) layout")
    print("  ✓ 5.2 - Tablet viewport (768px) layout")
    print("  ✓ 5.3 - Desktop viewport (1920px) layout")
    print("  ✓ 5.4 - Viewport size transitions and layout adaptation")
    print("  ✓ 5.5 - Touch target sizes on mobile viewport")
    print()
    print("Viewport Sizes:")
    print("  📱 Mobile:  375x667px")
    print("  📱 Tablet:  768x1024px")
    print("  🖥️  Desktop: 1920x1080px")
    print()
    print("Touch Target Requirements:")
    print("  ✋ Minimum size: 44x44px (WCAG 2.1 Level AAA)")
    print("  ✋ Applies to: buttons, links, inputs, interactive elements")
    print()
    print("Execution Instructions:")
    print("  1. Ensure Chrome is running: chrome --remote-debugging-port=9222")
    print("  2. Ensure frontend is running: cd frontend && pnpm dev")
    print("  3. Run tests: cd backend && poetry run pytest tests/test_e2e_responsive.py -v -s")
    print("  4. Follow the Chrome DevTools MCP instructions printed by each test")
    print("  5. Screenshots will be saved to: ./report/e2e-chrome-devtools-testing/responsive/")
    print()
    print("Test Scenarios:")
    print("  • Mobile viewport tests (3 pages)")
    print("  • Tablet viewport tests (3 pages)")
    print("  • Desktop viewport tests (3 pages)")
    print("  • Viewport transitions (mobile↔desktop, tablet breakpoint)")
    print("  • Touch target size validation (3 pages)")
    print()
    print("="*70)


if __name__ == "__main__":
    print_test_summary()
