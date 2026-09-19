# Graph Report - OmniSEO-OS  (2026-09-19)

## Corpus Check
- 41 files · ~85,434 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 275 nodes · 547 edges · 25 communities (23 shown, 2 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1f90be76`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- test_exporter.js
- dependencies
- package.json
- ui_smoke_test.js
- OmniSEO-OS: Universal AI-Powered SEO Operating System
- Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs
- test_audit_fixes.py
- test_phase1_real_data.py
- test_phase2_enterprise_api.py
- mcp.js
- storage.js
- gsc_real.js
- indexnow_sitemap.js

## God Nodes (most connected - your core abstractions)
1. `handleToolCall()` - 18 edges
2. `runTestSuite()` - 13 edges
3. `auditBacklinks()` - 11 edges
4. `runAllTests()` - 11 edges
5. `runStorageTestSuite()` - 11 edges
6. `scripts` - 10 edges
7. `keywords` - 10 edges
8. `queryHackerNewsMentions()` - 10 edges
9. `queryWikipediaSummary()` - 10 edges
10. `saveAuditSnapshot()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `runTestSuite()` --calls--> `auditBacklinks()`  [EXTRACTED]
  test/test_suite.js → server/adapters/backlinks.js
- `runTestSuite()` --calls--> `executeOrchestratedPlan()`  [EXTRACTED]
  test/test_suite.js → server/engine/orchestrator.js
- `runAllTests()` --calls--> `extractDomainFromSiteUrl()`  [EXTRACTED]
  test/test_gsc_real.js → server/adapters/gsc_real.js
- `runAllTests()` --calls--> `getDefaultDateRange()`  [EXTRACTED]
  test/test_gsc_real.js → server/adapters/gsc_real.js
- `runAllTests()` --calls--> `generateGoogleAuthUrl()`  [EXTRACTED]
  test/test_gsc_real.js → server/adapters/gsc_real.js

## Import Cycles
- None detected.

## Communities (25 total, 2 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.14
Nodes (27): auditHeadAndEeat(), analyzeCompetitorGap(), analyzeDomainOverview(), classifyIntent(), cpcForIntentINR(), crawlMultiPageSite(), diffForKeyword(), extractSavedKeywords() (+19 more)

### Community 1 - "test_exporter.js"
Cohesion: 0.08
Nodes (28): escapeCsvField(), escapeHtml(), exportToCsv(), generateExecutiveReportHtml(), getScoreTier(), RFC-4180, altLines, backlinkLines (+20 more)

### Community 2 - "dependencies"
Cohesion: 0.18
Nodes (11): cors, dotenv, express, dependencies, cheerio, cors, dotenv, express (+3 more)

### Community 3 - "package.json"
Cohesion: 0.06
Nodes (33): author, bugs, url, description, homepage, keywords, license, main (+25 more)

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

### Community 19 - "mcp.js"
Cohesion: 0.13
Nodes (32): auditBacklinks(), estimateDA(), auditTechnical(), auditGeoAeo(), queryDatamuseLsiKeywords(), queryDomainRdap(), queryGoogleDns(), queryGoogleSuggest() (+24 more)

### Community 20 - "storage.js"
Cohesion: 0.23
Nodes (24): clearHistory(), compareSnapshots(), deleteSnapshot(), __dirname, ensureDbInitialized(), extractIssuesList(), extractSnapshotMetrics(), __filename (+16 more)

### Community 21 - "gsc_real.js"
Cohesion: 0.31
Nodes (16): exchangeCodeForTokens(), extractDomainFromSiteUrl(), generateGoogleAuthUrl(), generateMockSearchAnalyticsData(), getDefaultDateRange(), GOOGLE_OAUTH_ENDPOINTS, GSC_SCOPES, isGscConfigured() (+8 more)

### Community 22 - "indexnow_sitemap.js"
Cohesion: 0.31
Nodes (10): cleanTagContent(), decompressIfNeeded(), detectOrphanPages(), extractRawUrls(), fetchAndParseSitemap(), generateIndexNowKey(), INDEXNOW_ENDPOINTS, normalizeUrl() (+2 more)

## Knowledge Gaps
- **96 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+91 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `generateExecutiveReportHtml()` connect `test_exporter.js` to `index.js`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `exportToCsv()` connect `test_exporter.js` to `index.js`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `handleToolCall()` connect `mcp.js` to `index.js`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _96 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14453781512605043 - nodes in this community are weakly interconnected._
- **Should `test_exporter.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08275862068965517 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._