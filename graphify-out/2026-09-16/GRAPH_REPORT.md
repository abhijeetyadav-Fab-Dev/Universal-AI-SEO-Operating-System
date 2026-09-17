# Graph Report - OmniSEO-OS  (2026-09-16)

## Corpus Check
- 19 files · ~133,128 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 82 nodes · 148 edges · 14 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b00e6088`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_suite.js
- orchestrator.js
- dependencies
- package.json
- index.js
- 🛠️ Quick Start
- Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs
- openseo.js
- backlinks.js
- fetchHTML

## God Nodes (most connected - your core abstractions)
1. `runTestSuite()` - 13 edges
2. `executeOrchestratedPlan()` - 10 edges
3. `fetchHTML()` - 8 edges
4. `extractSavedKeywords()` - 8 edges
5. `auditBacklinks()` - 7 edges
6. `researchKeywords()` - 7 edges
7. `crawlMultiPageSite()` - 6 edges
8. `simulateGSC()` - 6 edges
9. `analyzeDomainOverview()` - 6 edges
10. `trackRankings()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `runTestSuite()` --calls--> `auditBacklinks()`  [EXTRACTED]
  test/test_suite.js → server/adapters/backlinks.js
- `runTestSuite()` --calls--> `trackRankings()`  [EXTRACTED]
  test/test_suite.js → server/adapters/openseo.js
- `runTestSuite()` --calls--> `researchKeywords()`  [EXTRACTED]
  test/test_suite.js → server/adapters/openseo.js
- `runTestSuite()` --calls--> `handleAiPrompt()`  [EXTRACTED]
  test/test_suite.js → server/adapters/openseo.js
- `runTestSuite()` --calls--> `extractSavedKeywords()`  [EXTRACTED]
  test/test_suite.js → server/adapters/openseo.js

## Import Cycles
- None detected.

## Communities (14 total, 0 thin omitted)

### Community 0 - "test_suite.js"
Cohesion: 0.44
Nodes (7): auditHeadAndEeat(), analyzeDomainOverview(), crawlMultiPageSite(), monitorBrand(), normalizeUrl(), simulateGSC(), runTestSuite()

### Community 1 - "orchestrator.js"
Cohesion: 0.32
Nodes (6): auditTechnical(), auditGeoAeo(), fetchPageSpeed(), analyzeKeywordsAndSERP(), fetchGoogleTrendsAndVolume(), executeOrchestratedPlan()

### Community 2 - "dependencies"
Cohesion: 0.18
Nodes (11): cheerio, cors, dotenv, express, node-fetch, dependencies, cheerio, cors (+3 more)

### Community 3 - "package.json"
Cohesion: 0.20
Nodes (9): description, main, name, scripts, dev, start, test, type (+1 more)

### Community 4 - "index.js"
Cohesion: 0.33
Nodes (5): analyzeCompetitorGap(), parseAndPlan(), app, __dirname, __filename

### Community 5 - "🛠️ Quick Start"
Cohesion: 0.29
Nodes (6): 1. Install Dependencies, 2. Run Verification Test Suite, 3. Launch Dashboard & Server, 🚀 Key Architectural Pillars, OmniSEO-OS: Universal AI-Powered SEO Operating System, 🛠️ Quick Start

### Community 6 - "Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs"
Cohesion: 0.50
Nodes (3): 1. Ecosystem Overview (GitHub `seo` Topic), 2. Universal API Matrix (Free & Commercial Adapters), Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs

### Community 9 - "openseo.js"
Cohesion: 0.73
Nodes (5): classifyIntent(), cpcForIntentINR(), diffForKeyword(), extractSavedKeywords(), researchKeywords()

### Community 10 - "backlinks.js"
Cohesion: 0.67
Nodes (3): auditBacklinks(), estimateDA(), KNOWN_DA

### Community 12 - "fetchHTML"
Cohesion: 0.50
Nodes (4): fetchHTML(), handleAiPrompt(), trackRankings(), universalWebScraper()

## Knowledge Gaps
- **23 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `executeOrchestratedPlan()` connect `orchestrator.js` to `test_suite.js`, `backlinks.js`, `index.js`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._