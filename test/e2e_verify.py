import asyncio
import sys
import os

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        
        print("1. Loading http://localhost:4000...")
        await page.goto("http://localhost:4000", wait_until="networkidle")
        
        # Set input to Yatradham query
        print("2. Executing audit for https://yatradham.org/kumbh-mela-nashik/...")
        await page.fill("#queryInput", "Audit https://yatradham.org/kumbh-mela-nashik/ and inspect images, missing alt text, and backlinks")
        await page.click("#btnExecute")
        
        # Wait for resultsSection to become visible
        await page.wait_for_selector("#resultsSection", state="visible", timeout=15000)
        await page.wait_for_timeout(2000)
        
        # Verify recommendation cards
        rec_items = await page.query_selector_all(".rec-item")
        print(f"  ✅ Rendered {len(rec_items)} recommendation items.")
        
        # Check for any unescaped quotes / raw inline style blowout in the DOM
        body_text = await page.inner_text("body")
        assert "}') style=" not in body_text, "White box / unescaped quote blowout detected in body!"
        assert "copyCode(this" not in body_text, "Unescaped copyCode detected in body text!"
        print("  ✅ Zero code blowout / white box errors detected in DOM.")
        
        # Verify right sidebar table
        tbl_url = await page.inner_text("#tblUrl")
        tbl_images = await page.inner_text("#tblImages")
        print(f"  ✅ On-Page URL: {tbl_url[:40]}...")
        print(f"  ✅ On-Page Images: {tbl_images[:50]}...")
        
        # Test Deep Tab switching
        print("3. Testing Deep Dive Tabs...")
        # Backlinks tab
        await page.click("button:has-text('Backlinks & Disavow')")
        await page.wait_for_timeout(500)
        bl_dr = await page.inner_text("#blDomainRating")
        print(f"  ✅ Backlinks Tab: Domain Rating = {bl_dr}")
        
        # Multi-Page Audit tab
        await page.click("button:has-text('Multi-Page Audit')")
        await page.wait_for_timeout(500)
        multi_title = await page.inner_text("#tabMultiAudit h4")
        print(f"  ✅ Multi-Page Audit Tab: {multi_title}")
        
        # Domain tab
        await page.click("button:has-text('Domain & Competitors')")
        await page.wait_for_timeout(500)
        dom_auth = await page.inner_text("#domAuthority")
        print(f"  ✅ Domain Tab: Authority = {dom_auth}")
        
        # SERP Simulator tab
        await page.click("button:has-text('SERP & Social Preview')")
        await page.wait_for_timeout(500)
        serp_title = await page.inner_text("#serpCardTitle")
        print(f"  ✅ SERP Simulator Tab: Title = {serp_title}")
        
        # Head & EEAT tab
        await page.click("button[onclick*='tabHeadEeat']")
        await page.wait_for_timeout(1000)
        head_score = await page.inner_text("#headCompScore")
        eeat_score = await page.inner_text("#eeatScoreVal")
        print(f"  ✅ <head> Score = {head_score}, E-E-A-T Score = {eeat_score}")
        
        # Verify Export buttons exist and are visible
        btn_md = await page.query_selector("button:has-text('Export Markdown')")
        btn_json = await page.query_selector("button:has-text('Export JSON')")
        assert btn_md and btn_json, "Export buttons must exist!"
        print("  ✅ 1-Click Export Suite (Markdown & JSON) verified.")

        # Verify Copy Rule button works on Cannibalization Options
        print("4. Testing Copy Rule functionality...")
        copy_buttons = await page.query_selector_all("button:has-text('Copy Rule')")
        assert len(copy_buttons) >= 3, "Must have at least 3 Copy Rule buttons for Cannibalization options"
        opt_c_btn = copy_buttons[2] # Option C
        await opt_c_btn.click()
        await page.wait_for_timeout(300)
        btn_text = await opt_c_btn.inner_text()
        print(f"  ✅ Clicked Option C Copy Rule -> Button text: '{btn_text}'")
        assert "Copied" in btn_text, "Copy Rule button must indicate copied state!"

        # Take full page screenshot of main dashboard
        screenshot_path = "C:/Users/ydtva/OmniSEO-OS/test/screenshot_verified.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"  📸 Main dashboard screenshot saved to: {screenshot_path}")

        # 5. Test Live Page Visual Inspector with Highlighting (/api/inspect-page)
        print("5. Testing Live Page Visual Inspector with In-DOM Highlighting...")
        inspector_page = await browser.new_page()
        await inspector_page.goto("http://localhost:4000/api/inspect-page?url=https%3A%2F%2Fyatradham.org%2Fkumbh-mela-nashik%2F&highlight=Kumbh%20Mela&issue=Keyword%20Cannibalization%20Primary%20Landing%20Page", wait_until="load")
        await inspector_page.wait_for_selector("#omniseo-hud", timeout=10000)
        hud_text = await inspector_page.inner_text("#omniseo-hud")
        print(f"  ✅ Live Inspector HUD rendered: {hud_text[:60]}...")
        highlights = await inspector_page.query_selector_all(".omniseo-target-highlight")
        print(f"  ✅ Detected {len(highlights)} highlighted elements on live page.")
        assert len(highlights) > 0, "Live Inspector must highlight target occurrences!"

        # Take screenshot of the Live Inspector in action
        inspector_screenshot = "C:/Users/ydtva/OmniSEO-OS/test/screenshot_inspector.png"
        await inspector_page.screenshot(path=inspector_screenshot, full_page=False)
        print(f"  📸 Live Inspector screenshot saved to: {inspector_screenshot}")
        await inspector_page.close()

        if console_errors:
            print("  ⚠️ Console errors logged:", console_errors)
        else:
            print("  ✅ 0 Console errors encountered during execution.")
            
        await browser.close()
        print("\n🎉 BROWSER E2E VERIFICATION COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(main())
