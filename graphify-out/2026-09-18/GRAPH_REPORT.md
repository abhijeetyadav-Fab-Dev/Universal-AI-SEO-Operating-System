# Graph Report - OmniSEO-OS  (2026-09-18)

## Corpus Check
- 23 files · ~47,805 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 112 nodes · 174 edges · 15 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `10b7927d`
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

## God Nodes (most connected - your core abstractions)
1. `runTestSuite()` - 13 edges
2. `keywords` - 10 edges
3. `executeOrchestratedPlan()` - 10 edges
4. `fetchHTML()` - 8 edges
5. `extractSavedKeywords()` - 8 edges
6. `auditBacklinks()` - 7 edges
7. `researchKeywords()` - 7 edges
8. `OmniSEO-OS: Universal AI-Powered SEO Operating System` - 7 edges
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

## Communities (15 total, 0 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.23
Nodes (21): auditHeadAndEeat(), analyzeCompetitorGap(), analyzeDomainOverview(), classifyIntent(), cpcForIntentINR(), crawlMultiPageSite(), diffForKeyword(), extractSavedKeywords() (+13 more)

### Community 1 - "orchestrator.js"
Cohesion: 0.23
Nodes (9): auditBacklinks(), estimateDA(), KNOWN_DA, auditTechnical(), auditGeoAeo(), fetchPageSpeed(), analyzeKeywordsAndSERP(), fetchGoogleTrendsAndVolume() (+1 more)

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
Cohesion: 0.18
Nodes (10): ⚡ 14 Autonomous SEO Architecture Engines, 1. Install Dependencies, 2. Run Verification Test Suite, 3. Launch Dashboard & Server, 🚀 Deployment, 📊 Enterprise 6-Widget Live Intelligence Stack, 🚀 Key Architectural Pillars, 📄 License (+2 more)

### Community 6 - "Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs"
Cohesion: 0.50
Nodes (3): 1. Ecosystem Overview (GitHub `seo` Topic), 2. Universal API Matrix (Free & Commercial Adapters), Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs

## Knowledge Gaps
- **42 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `keywords` connect `keywords` to `package.json`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._