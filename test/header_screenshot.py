import asyncio
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        await page.goto("http://localhost:4000", wait_until="networkidle")
        header = await page.query_selector("header")
        screenshot_path = "C:/Users/ydtva/OmniSEO-OS/test/header_fixed.png"
        await header.screenshot(path=screenshot_path)
        print(f"Header screenshot saved to {screenshot_path}")

        # Also test on smaller screen (1100px) to verify zero wrapping
        await page.set_viewport_size({"width": 1100, "height": 800})
        screenshot_path_1100 = "C:/Users/ydtva/OmniSEO-OS/test/header_fixed_1100.png"
        await header.screenshot(path=screenshot_path_1100)
        print(f"1100px Header screenshot saved to {screenshot_path_1100}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
