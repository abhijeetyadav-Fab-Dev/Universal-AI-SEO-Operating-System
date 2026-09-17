# Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs

## 1. Ecosystem Overview (GitHub `seo` Topic)
From our review of the GitHub `seo` ecosystem (>11,000 repositories), projects fall into distinct clusters:

| Category | Top Open Source Tools / Frameworks | Architectural Role in OmniSEO | License & Feasibility |
|---|---|---|---|
| **Technical Crawlers & Auditing** | `ScreamingFrog-alternative` (Python/Go crawlers), `scrape-pages`, `crawlergo`, `scrapy-puppeteer`, `crawlee` | Core crawl engine: multi-threaded recursive link checker, canonicals, status codes, robots.txt | MIT/Apache 2.0 (Adoptable) |
| **Performance & CWV** | Google `lighthouse`, `psi-api-client`, `sitespeed.io`, `lighthouse-ci` | Real-time Core Web Vitals (LCP, FID, INP, CLS), TTFB, payload size, asset bottleneck audits | Apache 2.0 (Official standard) |
| **SERP & Keyword Intelligence** | `advertools` (Python SEO/SEM toolkit), `pytrends`, `google-search-results`, `serp-parser` | SERP layout parsing, people-also-ask extraction, keyword n-grams, text clustering | MIT / BSD-3 (Direct core engine integration) |
| **Schema & Structured Data** | `extruct`, `microdata-parser`, `schema-org-jsonld` | Extract & validate JSON-LD, Microdata, OpenGraph, Twitter Cards against schema.org spec | MIT |
| **GEO / AEO (AI Search Engine Optimization)** | `rag-citation-scrapers`, `perplexity-citation-checker`, `ai-search-bench` | Brand mention frequency, citation indexing in Perplexity/ChatGPT/Gemini answer models | Custom / Modern (Integrated) |
| **SEO MCP Servers** | `seo-audit-mcp`, `page-speed-mcp`, `gsc-mcp` | Standard Model Context Protocol adapters for LLM tools | MIT (Adoptable) |

---

## 2. Universal API Matrix (Free & Commercial Adapters)

| Source Provider | Data Capabilities | Free Tier / Endpoint Model | Adapter Status |
|---|---|---|---|
| **Google PageSpeed Insights API** | Field & Lab CWV, Lighthouse audit, performance score | Completely Free (25,000 req/day with standard Google Cloud key) | **Direct Native Adapter** |
| **Google Search Console API** | Search analytics, impressions, clicks, CTR, position, sitemaps | Free (Quota based on domain ownership) | **Native Adapter** |
| **Google Trends (via pytrends/custom RSS)**| Interest over time, rising related queries, regional breakout | Free public endpoint | **Native Adapter** |
| **IndexNow API** | Instant notification to Bing/Yandex for new/updated URLs | Free open protocol | **Native Adapter** |
| **DataForSEO / SerpApi / Serper** | SERP analysis, keyword volumes, backlink indexes | Freemium / Paid with mock fallback & live API key slot | **Modular Adapter** |
| **Open On-Page Scraper Engine** | Crawlability, title, meta, canonical, headers, internal link graph | Direct HTTP/DOM parser with streaming rate limits | **Built-in High-Speed Engine** |
| **GEO / AEO Brand Visibility Engine** | Checks brand visibility & citations across AI search vectors | Live AI synthesis test + open web check | **Built-in AI Search Engine** |
