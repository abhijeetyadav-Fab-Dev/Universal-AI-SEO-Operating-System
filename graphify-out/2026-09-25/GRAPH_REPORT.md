# Graph Report - OmniSEO-OS  (2026-09-25)

## Corpus Check
- 66 files · ~161,240 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 469 nodes · 1032 edges · 32 communities (30 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8eae3370`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- openseo.js
- test_exporter.js
- package.json
- scripts
- ui_smoke_test.js
- OmniSEO-OS: Universal AI-Powered SEO Operating System
- Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs
- test_audit_fixes.py
- test_phase1_real_data.py
- test_phase2_enterprise_api.py
- mcp.js
- storage.js
- gsc_real.js
- test_all_14_apps.js
- test_debug_console.js
- crux.js
- indexnow_sitemap.js
- api_health.js
- yatradham_pipeline.js
- index.js
- screaming_frog.js

## God Nodes (most connected - your core abstractions)
1. `handleToolCall()` - 31 edges
2. `scripts` - 24 edges
3. `queryCruxHistory()` - 13 edges
4. `runTests()` - 13 edges
5. `runTests()` - 13 edges
6. `runTestSuite()` - 13 edges
7. `OmniSEO-OS: Universal AI-Powered SEO Operating System` - 13 edges
8. `executeOrchestratedPlan()` - 12 edges
9. `auditBacklinks()` - 11 edges
10. `auditCruxFull()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `runTestSuite()` --calls--> `auditBacklinks()`  [EXTRACTED]
  test/test_suite.js → server/adapters/backlinks.js
- `runTestSuite()` --calls--> `auditHeadAndEeat()`  [EXTRACTED]
  test/test_suite.js → server/adapters/head_eeat.js
- `runTestSuite()` --calls--> `executeOrchestratedPlan()`  [EXTRACTED]
  test/test_suite.js → server/engine/orchestrator.js
- `runTests()` --calls--> `analyzeDeprecation()`  [EXTRACTED]
  test/test_api_health.js → server/adapters/api_health.js
- `runTests()` --calls--> `unpackOpenApiSpec()`  [EXTRACTED]
  test/test_api_health.js → server/adapters/api_health.js

## Import Cycles
- None detected.

## Communities (32 total, 2 thin omitted)

### Community 0 - "openseo.js"
Cohesion: 0.13
Nodes (25): callAiHorde(), callCustomGateway(), callPollinations(), FREELLM_ENDPOINTS, getFreeLlmCatalog(), queryFreeLlm(), testFreeLlmConnection(), analyzeDomainOverview() (+17 more)

### Community 1 - "test_exporter.js"
Cohesion: 0.08
Nodes (28): escapeCsvField(), escapeHtml(), exportToCsv(), generateExecutiveReportHtml(), getScoreTier(), RFC-4180, altLines, backlinkLines (+20 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (34): cors, dotenv, express, author, bugs, url, dependencies, cheerio (+26 more)

### Community 3 - "scripts"
Cohesion: 0.08
Nodes (24): scripts, dev, mcp, start, test, test:14-apps, test:all, test:api-health (+16 more)

### Community 4 - "ui_smoke_test.js"
Cohesion: 0.17
Nodes (10): ctx, __dirname, documentStub, elements, __filename, html, htmlPath, sandbox (+2 more)

### Community 5 - "OmniSEO-OS: Universal AI-Powered SEO Operating System"
Cohesion: 0.12
Nodes (16): ⚡ 14 Autonomous SEO Architecture Engines, 1. Install Dependencies, 2. Run Verification Test Suite, 3. Launch Dashboard & Server, 🚀 Deployment, 📊 Enterprise 6-Widget Live Intelligence Stack, 🛡️ Google Helpful Content & E-E-A-T Guardrail Engine, 🚀 Key Architectural Pillars (+8 more)

### Community 6 - "Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs"
Cohesion: 0.50
Nodes (3): 1. Ecosystem Overview (GitHub `seo` Topic), 2. Universal API Matrix (Free & Commercial Adapters), Comprehensive Evaluation & Catalog of Open Source SEO Ecosystem & APIs

### Community 12 - "test_audit_fixes.py"
Cohesion: 0.83
Nodes (3): make_request(), run_tests(), scan_for_markers()

### Community 19 - "mcp.js"
Cohesion: 0.07
Nodes (53): forget(), getMemoryStats(), MEMORY_FILE, memoryStore, recall(), remember(), savePersistedMemory(), auditBacklinks() (+45 more)

### Community 20 - "storage.js"
Cohesion: 0.23
Nodes (24): clearHistory(), compareSnapshots(), deleteSnapshot(), __dirname, ensureDbInitialized(), extractIssuesList(), extractSnapshotMetrics(), __filename (+16 more)

### Community 21 - "gsc_real.js"
Cohesion: 0.31
Nodes (16): exchangeCodeForTokens(), extractDomainFromSiteUrl(), generateGoogleAuthUrl(), generateMockSearchAnalyticsData(), getDefaultDateRange(), GOOGLE_OAUTH_ENDPOINTS, GSC_SCOPES, isGscConfigured() (+8 more)

### Community 22 - "test_all_14_apps.js"
Cohesion: 0.70
Nodes (4): assert(), httpGet(), httpPost(), runTests()

### Community 25 - "test_debug_console.js"
Cohesion: 0.83
Nodes (3): assert(), httpRequest(), runTestSuite()

### Community 26 - "crux.js"
Cohesion: 0.15
Nodes (30): auditCruxFull(), callCruxApi(), computeMonthlyAggregations(), CRUX_ENDPOINTS, cruxCache, DEFAULT_CRUX_VIS_KEY, evaluateCruxThreshold(), extractLcpSubMetrics() (+22 more)

### Community 27 - "indexnow_sitemap.js"
Cohesion: 0.31
Nodes (10): cleanTagContent(), decompressIfNeeded(), detectOrphanPages(), extractRawUrls(), fetchAndParseSitemap(), generateIndexNowKey(), INDEXNOW_ENDPOINTS, normalizeUrl() (+2 more)

### Community 28 - "api_health.js"
Cohesion: 0.22
Nodes (15): RFC-8594, RFC-9524, analyzeDeprecation(), COMMON_API_PROBES, DOMAIN_PLATFORM_MAP, extractEndpointsFromScript(), isSpaCatchAll(), PLATFORM_REGISTRY (+7 more)

### Community 29 - "yatradham_pipeline.js"
Cohesion: 0.18
Nodes (13): checkDeprecation(), classifyFormat(), __dirname, ERROR_KEY_SIGNALS, __filename, getYatraDhamSkillMarkdown(), isRealApiData(), probeSingleEndpoint() (+5 more)

### Community 31 - "index.js"
Cohesion: 0.11
Nodes (29): DEFAULT_CRUX_KEY, buildGa4OrganicReportRequest(), correlateCwvWithGa4(), DEFAULT_GCP_PROJECT_ID, DEFAULT_GCS_BUCKET, ENABLED_GOOGLE_CLOUD_APIS, executeBigQueryQuery(), formatCloudLogEntry() (+21 more)

### Community 48 - "screaming_frog.js"
Cohesion: 0.17
Nodes (24): buildScreamingFrogCommand(), CRAWL_STORAGE_DIR, crawlJobs, __dirname, __filename, findScreamingFrogBinary(), getScreamingFrogCrawlById(), getScreamingFrogCrawlSummary() (+16 more)

## Knowledge Gaps
- **145 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+140 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `generateExecutiveReportHtml()` connect `test_exporter.js` to `index.js`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `exportToCsv()` connect `test_exporter.js` to `index.js`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `scanWebsiteEndpoints()` connect `api_health.js` to `index.js`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _145 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `openseo.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12857142857142856 - nodes in this community are weakly interconnected._
- **Should `test_exporter.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08275862068965517 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._