import asyncio
from playwright.async_api import async_playwright
import os

html_content = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1200px;
      height: 630px;
      background: #090d16;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 60px 70px;
      position: relative;
      overflow: hidden;
    }
    .glow-top {
      position: absolute;
      top: -120px;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 350px;
      background: radial-gradient(ellipse at center, rgba(37, 99, 235, 0.45) 0%, rgba(124, 58, 237, 0.15) 50%, transparent 75%);
      pointer-events: none;
    }
    .glow-bottom {
      position: absolute;
      bottom: -100px;
      right: -100px;
      width: 500px;
      height: 350px;
      background: radial-gradient(ellipse at center, rgba(16, 185, 129, 0.25) 0%, transparent 70%);
      pointer-events: none;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      z-index: 2;
    }
    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand-logo-box {
      width: 54px;
      height: 54px;
      background: linear-gradient(135deg, #2563eb, #7c3aed);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 25px rgba(59, 130, 246, 0.5);
    }
    .brand-logo-box svg {
      width: 32px;
      height: 32px;
    }
    .brand-title {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand-badge {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.4);
      color: #93c5fd;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .status-badge {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #a7f3d0;
      padding: 8px 18px;
      border-radius: 30px;
      font-weight: 700;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
    }
    .dot-live {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
    }
    .main-body {
      position: relative;
      z-index: 2;
      margin: auto 0;
    }
    h1 {
      font-size: 52px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -1.5px;
      margin-bottom: 18px;
      background: linear-gradient(180deg, #ffffff 30%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    h1 span {
      background: linear-gradient(90deg, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      font-size: 22px;
      color: #94a3b8;
      line-height: 1.45;
      max-width: 960px;
    }
    .footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      z-index: 2;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 24px;
    }
    .engine-pills {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 6px 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #cbd5e1;
      font-weight: 700;
    }
    .domain-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      color: #38bdf8;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="glow-top"></div>
  <div class="glow-bottom"></div>

  <div class="header-row">
    <div class="brand-wrap">
      <div class="brand-logo-box">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 6.5L25 11.5V20.5L16 25.5L7 20.5V11.5L16 6.5Z" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="16" cy="16" r="4" fill="#38bdf8"/>
          <path d="M16 6.5V16M25 20.5L16 16M7 20.5L16 16" stroke="#93c5fd" stroke-width="1.6"/>
        </svg>
      </div>
      <div class="brand-title">OmniSEO <span style="color:#38bdf8;">OS</span></div>
      <div class="brand-badge">Universal AI Platform</div>
    </div>
    <div class="status-badge">
      <span class="dot-live"></span> 14/14 Architecture Engines
    </div>
  </div>

  <div class="main-body">
    <h1>Autonomous AI SEO<br><span>Operating System</span></h1>
    <p>Unifying Ahrefs, Semrush, Screaming Frog, Google Search Console, Lighthouse, Core Web Vitals, and GEO/AEO into a single real-time HUD.</p>
  </div>

  <div class="footer-row">
    <div class="engine-pills">
      <span class="pill">CRAWLER</span>
      <span class="pill">CORE WEB VITALS</span>
      <span class="pill">GEO / AEO</span>
      <span class="pill">CANNIBALIZATION</span>
      <span class="pill">COMPETITOR GAP</span>
      <span class="pill">TLS RADAR</span>
    </div>
    <div class="domain-tag">universal-ai-seo-operating-system.onrender.com</div>
  </div>
</body>
</html>"""

async def generate():
    temp_html = "test/temp_og.html"
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_content)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1200, "height": 630})
        await page.goto(f"file:///{os.path.abspath(temp_html)}")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="public/og-image.png")
        print("Generated public/og-image.png successfully (1200x630).")
        await browser.close()

    if os.path.exists(temp_html):
        os.remove(temp_html)

if __name__ == "__main__":
    asyncio.run(generate())
