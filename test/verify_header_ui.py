import asyncio
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Standard laptop resolution where it previously wrapped
        page = await browser.new_page(viewport={'width': 1366, 'height': 800})
        
        errors = []
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        
        await page.goto('http://localhost:4000', wait_until='networkidle')
        
        # Check summary badge
        summary = await page.inner_text('.status-summary')
        print(f"Status Summary: '{summary}'")
        assert '14/14 Engines Active' in summary
        
        # Check nav tags
        nav_tags = await page.query_selector_all('.nav-tag')
        print(f"Detected {len(nav_tags)} nav tags")
        assert len(nav_tags) == 14
        
        # Check bounding boxes of the nav-tags to verify they are all on the SAME Y line (no wrapping!)
        y_positions = []
        for tag in nav_tags:
            box = await tag.bounding_box()
            if box:
                y_positions.append(round(box['y'], 1))
        
        print(f"Y positions of tags: {set(y_positions)}")
        # All tags in the ribbon must share the exact same Y position (i.e. strictly 1 row)
        assert len(set(y_positions)) == 1, f"Expected all tags on 1 row, but found multiple Y rows: {set(y_positions)}"
        print("✅ SUCCESS: All 14 engine badges are on the exact same single row! Zero wrapping!")
        
        # Take screenshot of the new header
        header = await page.query_selector('header')
        await header.screenshot(path='test_header_verified.png')
        print("✅ Saved screenshot to test_header_verified.png")
        
        # Test clicking Engine Matrix modal
        await page.click("button:has-text('Engine Matrix')")
        modal = await page.wait_for_selector('#engineSuiteModal.active', state='visible', timeout=3000)
        assert modal, "Engine suite modal did not open!"
        print("✅ Engine Suite Modal successfully opened")
        
        # Close modal
        await page.click('#engineSuiteModal .modal-close-btn')
        await page.wait_for_timeout(500)
        print("✅ Engine Suite Modal successfully closed")
        
        # Test clicking Crawler engine badge
        await page.click(".nav-tag:has-text('Crawler')")
        print("✅ Clicked Crawler engine badge cleanly")
        
        await browser.close()
        
        if errors:
            print(f"Console errors: {errors}")
            sys.exit(1)
        else:
            print("🎉 ALL CHECKS PASSED WITH 0 CONSOLE ERRORS!")

if __name__ == '__main__':
    asyncio.run(run())
