# OmniSEO-OS: Universal AI-Powered SEO Operating System

A unified, autonomous AI execution platform combining the capabilities of **Ahrefs, Semrush, Screaming Frog, Google Search Console, Google PageSpeed Insights, Lighthouse, SERP intelligence, and GEO/AEO (AI Search Engine Optimization)** into a single natural-language command center.

---

## 🚀 Key Architectural Pillars

1. **Natural-Language Command Engine & Planner** (`/server/engine/planner.js`):
   - Ingests queries like *"Why did my organic traffic decline?"*, *"Find keyword gaps vs 3 competitors"*, or *"Audit Core Web Vitals and AEO visibility"*.
   - Automatically detects entities (domains, URLs, keywords) and maps them into modular multi-agent execution plans with cost credits and estimated latency.

2. **High-Speed Technical Crawler & Auditor** (`/server/adapters/crawler.js`):
   - Uses native stream parsing to evaluate HTTP status codes, response time, title, meta descriptions, canonicalization, robots tags, H1/H2 hierarchy, JSON-LD Schema markup, and missing image alt tags.

3. **Core Web Vitals & PageSpeed Adapter** (`/server/adapters/pagespeed.js`):
   - Direct integration with Google PageSpeed Insights v5 REST API for mobile/desktop performance, LCP, CLS, TBT/FID, and automated optimization opportunities.

4. **SERP & Keyword Intelligence Adapter** (`/server/adapters/serp.js`):
   - Search volume, CPC, keyword intent labeling (Informational, Commercial, Transactional), PAA extraction, and automated **Keyword Cannibalization** detection.

5. **Generative Engine Optimization (GEO/AEO)** (`/server/adapters/geo.js`):
   - Benchmarks visibility and citation prominence across AI search models (Perplexity AI, ChatGPT Search, Gemini Grounding).

6. **Canonical Prioritization Engine** (`/server/engine/orchestrator.js`):
   - Mathematically scores every action:
     $$\text{Priority Score} = \frac{\text{Business Impact} \times \text{Traffic Opportunity} \times \text{Confidence}}{\text{Implementation Effort}}$$
   - Categorizes findings into P0 (Critical), P1 (High), and P2 (Medium) urgency tiers.

---

## ⚡ 14 Autonomous SEO Architecture Engines

OmniSEO-OS unifies all major enterprise SEO workflows into a single real-time HUD:

| Engine | Badge | Primary Functionality |
| :--- | :--- | :--- |
| **Ahrefs Engine** | `AHREFS` | Domain rating, referring domains, backlink authority audit & toxicity scanning |
| **Semrush Engine** | `SEMRUSH` | Keyword volume, CPC tracking in INR (`₹`), ranking distribution & SERP features |
| **Screaming Frog Core** | `SCREAMING FROG` | Deep multi-page asynchronous streaming crawler (status, title, H1, meta, alt text) |
| **GSC Engine** | `GOOGLE SEARCH CONSOLE` | Impressions, clicks, CTR anomalies, cannibalization detection & position shifts |
| **PageSpeed Engine** | `PAGESPEED` | Google PageSpeed Insights v5 REST integration with mobile/desktop field data |
| **Lighthouse Engine** | `LIGHTHOUSE` | Synthetic lab audits for Performance, Accessibility, Best Practices & SEO |
| **Core Web Vitals Radar** | `CORE WEB VITALS` | Real-time threshold monitoring for LCP (<2.5s), INP (<200ms), and CLS (<0.1) |
| **GEO / AEO Engine** | `GEO / AEO` | Generative Engine Optimization visibility across ChatGPT, Perplexity & Gemini Grounding |
| **Deep Site Crawler** | `DEEP CRAWLER` | Recursive internal link traversal with latency metrics and issue classification |
| **Action Orchestrator** | `ORCHESTRATOR` | Priority-weighted decision matrix ($Score = \frac{Impact \times Opp \times Conf}{Effort}$) |
| **Content Copilot** | `CONTENT COPILOT` | NLP semantic TF-IDF recommendations, heading structure & entity optimization |
| **Cannibalization Resolver**| `CANNIBALIZATION` | Competing URL conflict detection with copyable canonical tags and 301 rules |
| **Competitor Gap Matrix** | `COMPETITOR GAP` | Keyword overlap, missing keyword opportunities & domain authority benchmarking |
| **Enterprise TLS Radar** | `SECURITY RADAR` | Protocol enforcement (HTTP/2, TLS 1.3), HSTS, and Content Security Policy auditing |

---

## 📊 Enterprise 6-Widget Live Intelligence Stack

The right-side command panel features an always-on, real-time intelligence matrix:
1. **🔍 On-Page Signal Inspection**: Live DOM extraction displaying Status, Latency, Indexability, Meta Title, Description, and Schema Markup.
2. **⚡ Core Web Vitals Lab Radar**: Mobile & Desktop breakdown for LCP, INP, CLS, and FCP with sub-second lab timings.
3. **🤖 AI Search GEO / AEO Presence**: Real-time AI engine brand presence with citation count, Perplexity, and ChatGPT visibility index.
4. **📈 Google Trends & Keyword Economics**: Live volume, search trends, competition grade, and localized INR CPC (`₹`).
5. **🛡️ Security & TLS Radar**: Protocol version, TLS certificate validation, HSTS compliance, and security posture score.
6. **🔗 Authority & Backlink Snapshot**: Domain rating gauge, external backlinks, referring domains, and link toxicity ratio.

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Verification Test Suite
```bash
# Core automated regression test suite (11 unit tests)
node test/test_suite.js

# Production SEO deployment test suite (robots, sitemap, llms.txt, headers, 404, blog routes)
python test/test_seo_deploy_suite.py

# Deep crawler & competitor gap integration tests
python test/test_new_features.py
```

### 3. Launch Dashboard & Server
```bash
node server/index.js
```
Open **[http://localhost:4000](http://localhost:4000)** in your browser.

---

## 📚 Technical Knowledge Base & Indexable Guides

OmniSEO-OS includes crawlable, static-rendered technical deep-dives to drive topical authority:
- **Knowledge Base Hub** (`/blog`): Central repository of technical SEO guides.
- **[GEO vs AEO Guide](/blog/geo-vs-aeo-optimize-for-ai-search)**: Retrieval-augmented generation algorithms and citation grounding for Perplexity, ChatGPT Search, and Gemini.
- **[Keyword Cannibalization Guide](/blog/keyword-cannibalization-find-and-fix)**: Detecting intent conflicts in Google Search Console and implementing cross-page canonicals or 301 server merges.
- **[Core Web Vitals Guide](/blog/core-web-vitals-lcp-cls-inp-explained)**: Engineering playbook for sub-2.5s LCP, zero CLS, and passing the new INP (&le;200ms) threshold.

---

## 🤖 Modern AI Discovery & Search Architecture

- **`robots.txt`**: Explicit crawl permissions welcoming modern AI search engines (`GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`).
- **`sitemap.xml`**: Validated sitemap protocol covering the core application and all knowledge base hubs.
- **`llms.txt`**: Standardized AI ingestion document detailing API endpoints, supported architectures, and system capabilities.
- **Open Graph & Twitter Cards**: High-definition 1200x630 social preview card (`/og-image.png`) with Schema.org `SoftwareApplication` JSON-LD markup.
- **Enterprise Security Middleware**: Automatic injection of `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **Static Caching**: 1-day HTTP cache headers on all public static assets to optimize TTFB and eliminate redundant bandwidth.

---

---

## 🛡️ Google Helpful Content & E-E-A-T Guardrail Engine

OmniSEO-OS enforces Google Search Central's official standard ([Creating Helpful, Reliable, People-First Content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)) as an active, automated guardrail:

- **"Who" Dimension (25 pts)**: Authorship bylines, verified author biographies, Schema.org `Person`/`Author` structured data, and editorial transparency.
- **"How" Dimension (25 pts)**: Methodology disclosure, empirical data tables, benchmark evidence, primary source citations, and editorial review standards.
- **"Why" Dimension (25 pts)**: Verification of People-First intent vs. search-engine-first anti-patterns:
  - **Keyword Stuffing**: Flags unnatural keyword density > 3.8%.
  - **Sensational Clickbait**: Detects misleading title-to-body discrepancies.
  - **Thin Content**: Identifies shallow, superficial content lacking original value.
  - **Manufactured Padding**: Detects transitional filler fluff designed to inflate word counts.
- **E-E-A-T Trust Foundations (25 pts)**: Experience, Expertise, Authoritativeness, and Trustworthiness verification.
- **8-Question Self-Assessment Matrix**: Evaluates original reporting, comprehensive topic coverage, bookmark-worthy utility, and true people-first intent.

---

## 🔌 Model Context Protocol (MCP) Server

OmniSEO-OS embeds a full **JSON-RPC 2.0 / stdio MCP server** (`server/mcp.js`) enabling seamless native tool execution for **Claude Desktop, Cursor, Antigravity CLI**, and any MCP-compatible agent:

| MCP Tool | Description |
| :--- | :--- |
| `audit_url` | Full crawl and technical on-page SEO audit (title, meta, canonical, headings, alts, issues). |
| `get_cwv` | Inspects Core Web Vitals & Lighthouse lab/field metrics via Google PageSpeed Insights. |
| `get_backlinks` | Backlink profile, domain authority rating, referring domains, and disavow toxicity scan. |
| `check_geo` | Tests Generative Engine Optimization (GEO) & Answer Engine Optimization (AEO) grounding. |
| `get_open_intel` | Authoritative zero-auth open protocols (ICANN RDAP, Google DoH DNS, Wikipedia, Hacker News). |
| `audit_helpful_content` | Google Search Central Helpful Content System & E-E-A-T self-assessment with Who/How/Why scoring. |
| `submit_indexnow` | Dispatches instant indexing notifications to Bing and Yandex via IndexNow protocol. |
| `detect_orphan_pages` | Cross-references XML sitemap URLs against internal crawl graph to identify unlinked orphan pages. |

**Launch MCP Server:**
```bash
npm run mcp
# or directly:
node server/mcp.js
```

---

## 🤖 Multi-Model AI Strategy Copilot

Connect any modern LLM provider for strategic SEO recommendations:
- **OpenRouter**: DeepSeek V3/R1, Meta Llama 3.3 70B, Qwen 2.5, and free tier open-weights models.
- **NVIDIA NIM**: Llama 3.3 70B Instruct, Nemotron-4, and DeepSeek-R1 via high-throughput inference microservices.
- **Google Gemini**: Gemini 2.0 Flash, Gemini 1.5 Flash, and Gemini 1.5 Pro with automatic multi-model fallback.
- **OpenAI**: GPT-4o, GPT-4o-mini.

---

## 📖 OpenAPI 3.0 & Swagger UI

OmniSEO-OS provides full interactive API documentation covering all 34 endpoints:
- **Interactive Swagger UI**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **OpenAPI 3.0 Specification**: [http://localhost:4000/api/v1/openapi.json](http://localhost:4000/api/v1/openapi.json)

---

## 🚀 Deployment

OmniSEO-OS is cloud-ready and includes native Render configuration (`render.yaml`), Dockerfile, and docker-compose:
- **Runtime**: Node.js 18+
- **Build Command**: `npm install`
- **Start Command**: `node server/index.js`
- **Port**: `4000` (configurable via `PORT` environment variable)

---

## 📄 License
MIT © Abhijeet Yadav

