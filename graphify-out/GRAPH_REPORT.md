# Graph Report - OmniSEO-OS  (2026-09-19)

## Corpus Check
- 32 files · ~66,122 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 165 nodes · 278 edges · 21 communities (19 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a885f2ee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- orchestrator.js
- dependencies
- package.json
- ui_smoke_test.js
- OmniSEO-OS: Universal AI-Powered SEO Operating System
- Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs
- test_audit_fixes.py
- test_phase1_real_data.py
- test_phase2_enterprise_api.py
- open_apis.js

## God Nodes (most connected - your core abstractions)
1. `runTestSuite()` - 13 edges
2. `keywords` - 10 edges
3. `executeOrchestratedPlan()` - 10 edges
4. `verifyAllOpenApis()` - 10 edges
5. `auditBacklinks()` - 9 edges
6. `OmniSEO-OS: Universal AI-Powered SEO Operating System` - 9 edges
7. `queryHackerNewsMentions()` - 8 edges
8. `queryWikipediaSummary()` - 8 edges
9. `fetchHTML()` - 8 edges
10. `analyzeDomainOverview()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `runTestSuite()` --calls--> `auditBacklinks()`  [EXTRACTED]
  test/test_suite.js → server/adapters/backlinks.js
- `runTestSuite()` --calls--> `executeOrchestratedPlan()`  [EXTRACTED]
  test/test_suite.js → server/engine/orchestrator.js
- `runTestSuite()` --calls--> `auditHeadAndEeat()`  [EXTRACTED]
  test/test_suite.js → server/adapters/head_eeat.js
- `verifyAllOpenApis()` --calls--> `queryWikipediaBacklinks()`  [EXTRACTED]
  test/test_open_apis.js → server/adapters/open_apis.js
- `verifyAllOpenApis()` --calls--> `queryHackerNewsMentions()`  [EXTRACTED]
  test/test_open_apis.js → server/adapters/open_apis.js

## Import Cycles
- None detected.

## Communities (21 total, 2 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.15
Nodes (26): auditHeadAndEeat(), analyzeCompetitorGap(), analyzeDomainOverview(), classifyIntent(), cpcForIntentINR(), crawlMultiPageSite(), diffForKeyword(), extractSavedKeywords() (+18 more)

### Community 1 - "orchestrator.js"
Cohesion: 0.24
Nodes (7): auditBacklinks(), estimateDA(), auditTechnical(), fetchPageSpeed(), psiCache, analyzeKeywordsAndSERP(), executeOrchestratedPlan()

### Community 2 - "dependencies"
Cohesion: 0.18
Nodes (11): cheerio, cors, dotenv, express, node-fetch, dependencies, cheerio, cors (+3 more)

### Community 3 - "package.json"
Cohesion: 0.07
Nodes (27): author, bugs, url, description, homepage, keywords, license, main (+19 more)

### Community 4 - "ui_smoke_test.js"
Cohesion: 0.17
Nodes (10): ctx, __dirname, documentStub, elements, __filename, html, htmlPath, sandbox (+2 more)

### Community 5 - "OmniSEO-OS: Universal AI-Powered SEO Operating System"
Cohesion: 0.15
Nodes (12): ⚡ 14 Autonomous SEO Architecture Engines, 1. Install Dependencies, 2. Run Verification Test Suite, 3. Launch Dashboard & Server, 🚀 Deployment, 📊 Enterprise 6-Widget Live Intelligence Stack, 🚀 Key Architectural Pillars, 📄 License (+4 more)

### Community 6 - "Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs"
Cohesion: 0.50
Nodes (3): 1. Ecosystem Overview (GitHub `seo` Topic), 2. Universal API Matrix (Free & Commercial Adapters), Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs

### Community 12 - "test_audit_fixes.py"
Cohesion: 0.83
Nodes (3): make_request(), run_tests(), scan_for_markers()

### Community 19 - "open_apis.js"
Cohesion: 0.36
Nodes (12): auditGeoAeo(), queryDatamuseLsiKeywords(), queryDomainRdap(), queryGoogleDns(), queryGoogleSuggest(), queryHackerNewsMentions(), queryWikidataEntity(), queryWikimediaPageviews() (+4 more)

## Knowledge Gaps
- **56 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `executeOrchestratedPlan()` connect `orchestrator.js` to `index.js`, `open_apis.js`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _56 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._