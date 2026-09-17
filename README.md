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
# Automated regression test suite (11 unit tests)
node test/test_suite.js

# Deep crawler & gap analysis integration tests
python test/test_new_features.py
```

### 3. Launch Dashboard & Server
```bash
node server/index.js
```
Open **[http://localhost:4000](http://localhost:4000)** in your browser.

---

## 🚀 Deployment

OmniSEO-OS is cloud-ready and includes native Render configuration (`render.yaml`):
- **Runtime**: Node.js 18+
- **Build Command**: `npm install`
- **Start Command**: `node server/index.js`
- **Port**: `4000` (configurable via `PORT` environment variable)

---

## 📄 License
MIT © Abhijeet Yadav
