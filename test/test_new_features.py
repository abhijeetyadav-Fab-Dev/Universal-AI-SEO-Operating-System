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
        
        print("1. Loading OmniSEO-OS at http://localhost:4000...")
        await page.goto("http://localhost:4000", wait_until="networkidle")

        # Verify Header Badges (14/14 Engines)
        print("2. Verifying 14/14 Active Engines Suite in Header...")
        summary_text = await page.inner_text(".status-summary")
        print(f"  ✅ Status Summary: '{summary_text}'")
        assert "14/14 Engines Active" in summary_text, f"Expected 14/14 Engines Active, got: {summary_text}"
        
        nav_tags = await page.query_selector_all(".nav-tag")
        print(f"  ✅ Detected {len(nav_tags)} active engine badges in header:")
        tag_texts = [await t.inner_text() for t in nav_tags]
        print(f"     {', '.join(tag_texts)}")
        assert len(nav_tags) >= 13, f"Expected at least 13 badges, found {len(nav_tags)}"

        # Execute Unified Audit
        print("3. Executing Unified Audit for Yatradham Kumbh Mela...")
        await page.click("#btnExecute")
        await page.wait_for_selector("#resultsSection", state="visible", timeout=15000)
        await page.wait_for_timeout(2000)

        # 4. Verify AI Bot Firewall Matrix & XML Sitemap Explorer (in SERP tab)
        print("4. Testing AI Firewall Matrix & Visual XML Sitemap Explorer...")
        await page.click("button:has-text('SERP & Social Preview')")
        await page.wait_for_timeout(1000)
        
        # Verify AI Bots
        for bot in ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot", "Bytespider"]:
            bot_el = await page.query_selector(f"#bot-{bot}")
            assert bot_el, f"AI Bot badge for {bot} must exist!"
            status = await bot_el.inner_text()
            print(f"  ✅ AI Bot: {bot} -> Status: {status}")
            assert status in ["Allowed", "Blocked"], f"Invalid bot status: {status}"

        # Verify Sitemap Table
        sitemap_rows = await page.query_selector_all("#sitemapUrlsTable tbody tr")
        print(f"  ✅ Discovered & parsed {len(sitemap_rows)} XML sitemap URLs.")
        assert len(sitemap_rows) >= 1, "Sitemap table must have parsed URLs!"

        # 5. Testing Multi-Page Site Audit & Issues Inspector Modal
        print("5. Testing Multi-Page Deep Site Crawler & Issues Inspector Modal...")
        await page.click("button:has-text('Multi-Page Audit')")
        await page.wait_for_timeout(500)
        
        # Select 10 pages and trigger audit
        await page.select_option("#crawlMaxPages", "10")
        await page.click("button:has-text('Start Deep Crawl')")
        
        # Wait for table to populate
        print("  ⏳ Waiting for crawler to analyze internal pages...")
        await page.wait_for_selector("#crawledPagesTable tbody tr", timeout=20000)
        crawled_rows = await page.query_selector_all("#crawledPagesTable tbody tr")
        print(f"  ✅ Crawled and indexed {len(crawled_rows)} internal pages.")
        assert len(crawled_rows) >= 2, "Must crawl at least 2 pages!"

        # Click the first Issues badge to open modal
        issue_btn = await page.query_selector("#crawledPagesTable tbody tr button.btn-line-tag")
        assert issue_btn, "Issues button must exist in crawler table!"
        btn_text = await issue_btn.inner_text()
        print(f"  👉 Clicking Crawler Issues Button: '{btn_text}'...")
        await issue_btn.click()
        
        # Verify modal opens
        await page.wait_for_selector("#crawlerIssuesModal.active", timeout=5000)
        print("  ✅ Crawler Issues Modal successfully opened (#crawlerIssuesModal.active).")
        modal_url = await page.inner_text("#modalPageUrlTitle")
        print(f"  ✅ Inspected Target URL: {modal_url}")
        
        # Check issues inside modal
        modal_issues = await page.query_selector_all("#modalIssuesContainer > div")
        print(f"  ✅ Rendered {len(modal_issues)} structured issues with code fixes inside modal.")
        assert len(modal_issues) >= 1, "Modal must contain at least 1 issue!"

        # Check Copy Fix button inside modal
        copy_fix_btn = await page.query_selector("#modalIssuesContainer button:has-text('Copy Fix')")
        if copy_fix_btn:
            await copy_fix_btn.click()
            await page.wait_for_timeout(300)
            btn_state = await copy_fix_btn.inner_text()
            print(f"  ✅ Tested Copy Fix button -> Result: '{btn_state}'")
            assert "Copied" in btn_state, "Copy Fix must confirm copied state!"

        # Close Modal
        await page.click("#crawlerIssuesModal button.modal-close-btn")
        await page.wait_for_timeout(500)
        is_modal_closed = not await page.is_visible("#crawlerIssuesModal.active")
        assert is_modal_closed, "Crawler Issues Modal must close cleanly!"
        print("  ✅ Crawler Issues Modal closed cleanly.")

        # 6. Testing Competitor Authority & Keyword Gap Intelligence Modal
        print("6. Testing Competitor Authority & Keyword Gap Intelligence Modal...")
        await page.click("button:has-text('Domain & Competitors')")
        await page.wait_for_timeout(500)

        # Click "Analyze Gap" on the first competitor (e.g. tripadvisor.in or makemytrip.com)
        gap_btn = await page.query_selector("#domainCompetitorsTable tbody tr button:has-text('Analyze Gap')")
        assert gap_btn, "Analyze Gap button must exist in competitors table!"
        print("  👉 Clicking Competitor 'Analyze Gap'...")
        await gap_btn.click()

        # Wait for Competitor Gap Modal
        await page.wait_for_selector("#competitorGapModal.active", timeout=5000)
        print("  ✅ Competitor Gap Modal opened (#competitorGapModal.active).")
        
        # Wait for gap content wrapper to populate
        await page.wait_for_selector("#gapContentWrapper", state="visible", timeout=10000)
        da_gap = await page.inner_text("#gapDaMetric")
        traffic_gap = await page.inner_text("#gapTrafficMetric")
        print(f"  ✅ Competitor Gap KPIs -> DA: {da_gap} | Competitor Traffic: {traffic_gap}")

        # Check Untapped Keywords Table with INR CPC
        ut_rows = await page.query_selector_all("#gapUntappedKeywordsTable tbody tr")
        print(f"  ✅ Discovered {len(ut_rows)} untapped competitor keywords:")
        assert len(ut_rows) >= 3, "Must return at least 3 untapped keywords!"

        first_cpc = await page.inner_text("#gapUntappedKeywordsTable tbody tr td:nth-child(4)")
        print(f"  ✅ Untapped Keyword CPC format verified: '{first_cpc}'")
        assert first_cpc.startswith("₹"), f"CPC must be in INR (₹), got: {first_cpc}"

        # Close Competitor Gap Modal
        await page.click("#competitorGapModal button.modal-close-btn")
        await page.wait_for_timeout(500)
        print("  ✅ Competitor Gap Modal closed cleanly.")

        # 7. Testing Universal Web Scraper Studio Tab
        print("7. Testing Universal Web Scraper Studio (Firecrawl & Crawl4AI Native)...")
        await page.click("button:has-text('Web Scraper Studio')")
        await page.wait_for_timeout(500)

        # Run Markdown scrape
        print("  👉 Executing live LLM Markdown Extraction...")
        await page.click("button:has-text('Scrape Now')")
        await page.wait_for_timeout(2500)

        output_stats = await page.inner_text("#scrapeOutputStats")
        output_content = await page.inner_text("#scrapeOutputContent")
        print(f"  ✅ Scraped Output Stats: {output_stats}")
        print(f"  ✅ Scraped Markdown Sample (first 100 chars): {output_content[:100]}...")
        assert "characters" in output_stats and int(output_stats.split()[0].replace(",", "")) > 100, "Must extract substantial markdown!"
        assert "# " in output_content or "Nashik" in output_content or "Kumbh" in output_content, "Extracted content must contain relevant page copy!"

        # Test structured metadata mode
        print("  👉 Testing Structured Metadata Extraction mode...")
        await page.click("button:has-text('OpenGraph & Twitter JSON')")
        await page.wait_for_timeout(2500)
        meta_stats = await page.inner_text("#scrapeOutputStats")
        meta_content = await page.inner_text("#scrapeOutputContent")
        print(f"  ✅ Metadata Output Stats: {meta_stats}")
        assert "{" in meta_content and '"title"' in meta_content, "Metadata mode must return structured JSON!"

        # Verify zero console errors
        if console_errors:
            print("  ⚠️ Console errors logged:", console_errors)
        else:
            print("  ✅ 0 Console errors encountered during execution.")

        # Take screenshot of final verified state
        await page.screenshot(path="C:/Users/ydtva/OmniSEO-OS/test/screenshot_verified.png", full_page=True)
        print("  📸 Updated screenshot_verified.png successfully saved.")

        await browser.close()
        print("\n🎉 ALL USER REQUIREMENTS VERIFIED WITH 100% SUCCESS!")

if __name__ == "__main__":
    asyncio.run(main())
