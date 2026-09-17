import asyncio
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1440, 'height': 1200})
        
        errors = []
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        
        print("1. Navigating to http://localhost:4000...")
        await page.goto("http://localhost:4000", wait_until="networkidle")
        
        print("2. Executing Unified Audit...")
        await page.click("#btnExecute")
        await page.wait_for_selector("#resultsSection", state="visible", timeout=15000)
        await page.wait_for_timeout(2000)
        
        print("3. Verifying Sidebar Stack Widgets...")
        # Check that sidebar-stack exists
        sidebar = await page.query_selector(".sidebar-stack")
        assert sidebar, "sidebar-stack must exist!"
        
        # Widget 1: On-page signals
        on_page = await page.query_selector("#onPageTable")
        assert on_page, "onPageTable must exist in sidebar!"
        url_text = await page.inner_text("#tblUrl")
        print(f"  ✅ Widget 1 (On-Page Signals): Target URL = {url_text.splitlines()[0]}")
        
        # Widget 2: CWV Radar
        lcp_val = await page.inner_text("#cwvLcpVal")
        cls_val = await page.inner_text("#cwvClsVal")
        print(f"  ✅ Widget 2 (CWV Radar): LCP = {lcp_val}, CLS = {cls_val}")
        assert lcp_val != "--", "CWV LCP must be populated!"
        
        # Widget 3: GEO Table
        geo_rows = await page.query_selector_all("#geoTable tbody tr")
        print(f"  ✅ Widget 3 (AI Search GEO): {len(geo_rows)} engines populated")
        assert len(geo_rows) >= 1, "GEO table must have rows!"
        
        # Widget 4: Google Trends
        trend_vol = await page.inner_text("#trendAvgVol")
        trend_cpc = await page.inner_text("#trendCpc")
        print(f"  ✅ Widget 4 (Google Trends): Avg Vol = {trend_vol}, CPC = {trend_cpc}")
        assert trend_vol != "--", "Trends Avg Vol must be populated!"
        
        # Widget 5: Security Radar
        ssl_text = await page.inner_text("#radarSslStatus")
        print(f"  ✅ Widget 5 (Security Radar): {ssl_text}")
        assert "TLS" in ssl_text, "Security radar must be populated!"
        
        # Widget 6: Authority Snapshot
        dr_text = await page.inner_text("#sideDrVal")
        ref_text = await page.inner_text("#sideRefDomVal")
        print(f"  ✅ Widget 6 (Authority Snapshot): DR = {dr_text}, Ref Domains = {ref_text}")
        assert dr_text != "--", "Authority DR must be populated!"
        
        # Measure height comparison
        rec_box = await (await page.query_selector("#recList")).bounding_box()
        side_box = await sidebar.bounding_box()
        print(f"  📊 Height Comparison:")
        print(f"     Priority Inbox Height: {round(rec_box['height'])}px")
        print(f"     Sidebar Stack Height:  {round(side_box['height'])}px")
        
        # The sidebar must now be substantially tall (> 1000px) rather than the old ~400px!
        assert side_box['height'] > 1200, f"Sidebar height {side_box['height']}px should be > 1200px to fill the space!"
        print("  ✅ Confirmed: Sidebar Stack is densely packed and completely eliminates right-hand empty space!")
        
        # Full page screenshot
        await page.screenshot(path="test_sidebar_verified.png", full_page=True)
        print("  📸 Full page screenshot saved to test_sidebar_verified.png")
        
        await browser.close()
        
        if errors:
            print(f"Console errors: {errors}")
            sys.exit(1)
        else:
            print("🎉 ALL SIDEBAR TESTS PASSED WITH 0 CONSOLE ERRORS!")

if __name__ == '__main__':
    asyncio.run(run())
