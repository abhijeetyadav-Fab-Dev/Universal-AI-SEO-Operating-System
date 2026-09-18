# Graph Report - OmniSEO-OS  (2026-09-18)

## Corpus Check
- 24 files · ~51,200 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 118 nodes · 179 edges · 16 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `44969476`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- orchestrator.js
- dependencies
- package.json
- keywords
- OmniSEO-OS: Universal AI-Powered SEO Operating System
- Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs
- test_audit_fixes.py

## God Nodes (most connected - your core abstractions)
1. `runTestSuite()` - 13 edges
2. `keywords` - 10 edges
3. `executeOrchestratedPlan()` - 10 edges
4. `OmniSEO-OS: Universal AI-Powered SEO Operating System` - 9 edges
5. `fetchHTML()` - 8 edges
6. `extractSavedKeywords()` - 8 edges
7. `auditBacklinks()` - 7 edges
8. `researchKeywords()` - 7 edges
9. `crawlMultiPageSite()` - 6 edges
10. `simulateGSC()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `runTestSuite()` --calls--> `auditBacklinks()`  [EXTRACTED]
  test/test_suite.js → server/adapters/backlinks.js
- `runTestSuite()` --calls--> `executeOrchestratedPlan()`  [EXTRACTED]
  test/test_suite.js → server/engine/orchestrator.js
- `runTestSuite()` --calls--> `auditHeadAndEeat()`  [EXTRACTED]
  test/test_suite.js → server/adapters/head_eeat.js
- `runTestSuite()` --calls--> `crawlMultiPageSite()`  [EXTRACTED]
  test/test_suite.js → server/adapters/openseo.js
- `runTestSuite()` --calls--> `simulateGSC()`  [EXTRACTED]
  test/test_suite.js → server/adapters/openseo.js

## Import Cycles
- None detected.

## Communities (16 total, 0 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.22
Nodes (21): auditHeadAndEeat(), analyzeCompetitorGap(), analyzeDomainOverview(), classifyIntent(), cpcForIntentINR(), crawlMultiPageSite(), diffForKeyword(), extractSavedKeywords() (+13 more)

### Community 1 - "orchestrator.js"
Cohesion: 0.26
Nodes (8): auditBacklinks(), estimateDA(), auditTechnical(), auditGeoAeo(), fetchPageSpeed(), analyzeKeywordsAndSERP(), fetchGoogleTrendsAndVolume(), executeOrchestratedPlan()

### Community 2 - "dependencies"
Cohesion: 0.18
Nodes (11): cheerio, cors, dotenv, express, node-fetch, dependencies, cheerio, cors (+3 more)

### Community 3 - "package.json"
Cohesion: 0.11
Nodes (17): author, bugs, url, description, homepage, license, main, name (+9 more)

### Community 4 - "keywords"
Cohesion: 0.20
Nodes (10): keywords, aeo, ai-seo, core-web-vitals, crawler, geo, lighthouse, operating-system (+2 more)

### Community 5 - "OmniSEO-OS: Universal AI-Powered SEO Operating System"
Cohesion: 0.15
Nodes (12): ⚡ 14 Autonomous SEO Architecture Engines, 1. Install Dependencies, 2. Run Verification Test Suite, 3. Launch Dashboard & Server, 🚀 Deployment, 📊 Enterprise 6-Widget Live Intelligence Stack, 🚀 Key Architectural Pillars, 📄 License (+4 more)

### Community 6 - "Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs"
Cohesion: 0.50
Nodes (3): 1. Ecosystem Overview (GitHub `seo` Topic), 2. Universal API Matrix (Free & Commercial Adapters), Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs

### Community 12 - "test_audit_fixes.py"
Cohesion: 0.83
Nodes (3): make_request(), run_tests(), scan_for_markers()

## Knowledge Gaps
- **43 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+38 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `keywords` connect `keywords` to `package.json`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _43 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._