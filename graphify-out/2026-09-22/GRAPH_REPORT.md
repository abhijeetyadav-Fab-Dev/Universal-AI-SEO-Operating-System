# Graph Report - OmniSEO-OS  (2026-09-21)

## Corpus Check
- 69 files · ~174,429 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 677 nodes · 1194 edges · 49 communities (47 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `193401e4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- openseo.js
- test_exporter.js
- scripts
- dependencies
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
- Install
- crux.js
- Awesome Harness Engineering [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)
- Anthropic Cybersecurity Skills
- Diagram Design
- Skill Categories
- index.js
- openviking.md
- Scientific Agent Skills
- browser-use.md
- package.json
- keywords
- Paper Citation
- 🤝 Contributing
- 🔬 Use Cases
- 💡 Quick Examples
- 🎯 Getting Started
- 📝 From the Blog
- install_global_skills.js
- 🚀 Why Use This?
- ❓ FAQ
- repository
- 📄 License
- screaming_frog.js

## God Nodes (most connected - your core abstractions)
1. `Install` - 33 edges
2. `handleToolCall()` - 31 edges
3. `scripts` - 22 edges
4. `Anthropic Cybersecurity Skills` - 21 edges
5. `Scientific Agent Skills` - 20 edges
6. `Skill Categories` - 20 edges
7. `Diagram Design` - 15 edges
8. `queryCruxHistory()` - 13 edges
9. `runTests()` - 13 edges
10. `runTests()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `runTestSuite()` --calls--> `auditBacklinks()`  [EXTRACTED]
  test/test_suite.js → server/adapters/backlinks.js
- `runTestSuite()` --calls--> `auditHeadAndEeat()`  [EXTRACTED]
  test/test_suite.js → server/adapters/head_eeat.js
- `runTestSuite()` --calls--> `executeOrchestratedPlan()`  [EXTRACTED]
  test/test_suite.js → server/engine/orchestrator.js
- `runCruxTestSuite()` --calls--> `extractOrigin()`  [EXTRACTED]
  test/test_crux.js → server/adapters/crux.js
- `runTestSuite()` --calls--> `formatCruxDate()`  [EXTRACTED]
  test/test_pagespeed_crux_features.js → server/adapters/crux.js

## Import Cycles
- None detected.

## Communities (49 total, 2 thin omitted)

### Community 0 - "openseo.js"
Cohesion: 0.12
Nodes (26): callAiHorde(), callCustomGateway(), callPollinations(), FREELLM_ENDPOINTS, getFreeLlmCatalog(), queryFreeLlm(), testFreeLlmConnection(), analyzeCompetitorGap() (+18 more)

### Community 1 - "test_exporter.js"
Cohesion: 0.08
Nodes (28): escapeCsvField(), escapeHtml(), exportToCsv(), generateExecutiveReportHtml(), getScoreTier(), RFC-4180, altLines, backlinkLines (+20 more)

### Community 2 - "scripts"
Cohesion: 0.09
Nodes (22): scripts, dev, mcp, start, test, test:14-apps, test:all, test:crux (+14 more)

### Community 3 - "dependencies"
Cohesion: 0.18
Nodes (11): cors, dotenv, express, dependencies, cheerio, cors, dotenv, express (+3 more)

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
Cohesion: 0.08
Nodes (50): forget(), getMemoryStats(), MEMORY_FILE, memoryStore, recall(), remember(), savePersistedMemory(), auditBacklinks() (+42 more)

### Community 20 - "storage.js"
Cohesion: 0.23
Nodes (24): clearHistory(), compareSnapshots(), deleteSnapshot(), __dirname, ensureDbInitialized(), extractIssuesList(), extractSnapshotMetrics(), __filename (+16 more)

### Community 21 - "gsc_real.js"
Cohesion: 0.31
Nodes (16): exchangeCodeForTokens(), extractDomainFromSiteUrl(), generateGoogleAuthUrl(), generateMockSearchAnalyticsData(), getDefaultDateRange(), GOOGLE_OAUTH_ENDPOINTS, GSC_SCOPES, isGscConfigured() (+8 more)

### Community 22 - "test_all_14_apps.js"
Cohesion: 0.70
Nodes (4): assert(), httpGet(), httpPost(), runTests()

### Community 25 - "Install"
Cohesion: 0.05
Nodes (37): 4-Tier Memory Consolidation, 54 Tools, 6 Resources · 3 Prompts · 17 Skills, Claude Code (one block, paste it), Claude Code without the plugin install (MCP-standalone path), Codex CLI (Codex plugin platform), Codex Desktop: plugin hooks currently silent (workaround available), Config File (+29 more)

### Community 26 - "crux.js"
Cohesion: 0.15
Nodes (30): auditCruxFull(), callCruxApi(), computeMonthlyAggregations(), CRUX_ENDPOINTS, cruxCache, DEFAULT_CRUX_VIS_KEY, evaluateCruxThreshold(), extractLcpSubMetrics() (+22 more)

### Community 27 - "Awesome Harness Engineering [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)"
Cohesion: 0.06
Nodes (34): Awesome Harness Engineering [![Awesome](https://awesome.re/badge.svg)](https://awesome.re), Benchmarks, Browser, MCP & Tool Integration, Coding-Agent Harnesses, Coding & Terminal Agents, Constraints, Guardrails & Safe Autonomy, Contents, Context Design & Delivery (+26 more)

### Community 28 - "Anthropic Cybersecurity Skills"
Cohesion: 0.07
Nodes (28): Anthropic Cybersecurity Skills, Citation, Community, Compatible platforms, Contributing, Featured in, 🌍 GARS-2026 — Global Agentic AI Readiness Survey, Give any AI agent the security skills of a senior analyst (+20 more)

### Community 29 - "Diagram Design"
Cohesion: 0.07
Nodes (27): About, Accessible by default, Architecture, Contrast checks happen automatically, Contributing, Contributing / skin lint, Diagram Design, Editable install (+19 more)

### Community 30 - "Skill Categories"
Cohesion: 0.10
Nodes (20): 🧬 **Bioinformatics & Genomics** (28 skills), 🧪 **Cheminformatics & Drug Discovery** (10 skills), 🏥 **Clinical Research & Evidence Workflows** (8 skills), 📊 **Data Analysis & Visualization** (22 skills), ⚙️ **Engineering & Simulation** (6 skills), 🔧 **Infrastructure & Platforms** (12 skills), 🧪 **Laboratory Automation** (6 skills), 🤖 **Machine Learning & AI** (14 core skills) (+12 more)

### Community 31 - "index.js"
Cohesion: 0.08
Nodes (40): DEFAULT_CRUX_KEY, buildGa4OrganicReportRequest(), correlateCwvWithGa4(), DEFAULT_GCP_PROJECT_ID, DEFAULT_GCS_BUCKET, ENABLED_GOOGLE_CLOUD_APIS, executeBigQueryQuery(), formatCloudLogEntry() (+32 more)

### Community 32 - "openviking.md"
Cohesion: 0.12
Nodes (15): Commercial editions, Community & Contributing, Deploy in production, Desktop App (Beta), License, OpenViking: The Context Database for AI Agents, Partner Projects, Proof it works (+7 more)

### Community 33 - "Scientific Agent Skills"
Cohesion: 0.14
Nodes (13): 📚 Available Skills, Common Issues, Installing uv, 🎥 More tutorials, ⚙️ Prerequisites, Scientific Agent Skills, ⚠️ Security Disclaimer, 🙏 Skill Credits (+5 more)

### Community 34 - "browser-use.md"
Cohesion: 0.17
Nodes (11): Browser Use Benchmark v2, Citation, FAQ, Integrations, hosting, custom tools, MCP, and more on our [Docs ↗](https://docs.browser-use.com), Navigate the web like a human does., Path 1: Fully Hosted Cloud, Path 2: CLI, Path 3: Python Library (+3 more)

### Community 35 - "package.json"
Cohesion: 0.18
Nodes (10): author, bugs, url, description, homepage, license, main, name (+2 more)

### Community 36 - "keywords"
Cohesion: 0.20
Nodes (10): keywords, aeo, ai-seo, core-web-vitals, crawler, geo, lighthouse, operating-system (+2 more)

### Community 37 - "Paper Citation"
Cohesion: 0.25
Nodes (8): APA, BibTeX, 📖 Citation, Individual Skill Citation, MLA, Paper Citation, Plain Text, Software Citation

### Community 38 - "🤝 Contributing"
Cohesion: 0.25
Nodes (8): 🤝 Contributing, Contribution Guidelines, How to Contribute, Recognition, Security Scanning, Support Open Source, Testing, Ways to Contribute

### Community 39 - "🔬 Use Cases"
Cohesion: 0.29
Nodes (7): 🧬 Bioinformatics & Genomics, 🏥 Clinical Research & Evidence Workflows, 📊 Data Analysis & Visualization, 🧪 Drug Discovery & Medicinal Chemistry, 🧪 Laboratory Automation, 🔬 Multi-Omics & Systems Biology, 🔬 Use Cases

### Community 40 - "💡 Quick Examples"
Cohesion: 0.29
Nodes (7): 🧪 Drug Discovery Pipeline, 🧬 Multi-Omics Biomarker Discovery, 💡 Quick Examples, 🏥 Research Variant Evidence Review, 🔬 Single-Cell RNA-seq Analysis, 🌐 Systems Biology Network Analysis, 🎯 Virtual Screening Campaign

### Community 41 - "🎯 Getting Started"
Cohesion: 0.29
Nodes (7): 🎯 Getting Started, Keeping skills up to date, Option 1: npx (supported hosts), Option 2: GitHub CLI (`gh skill`), Option 3: Agent Plugins (Cursor, Codex, and other plugin clients), Other Agent Skills hosts (OpenClaw, NemoClaw, Pi, Hermes, …), Version pinning

### Community 42 - "📝 From the Blog"
Cohesion: 0.33
Nodes (6): Complementary open-source projects, 📝 From the Blog, Security and safe deployment, Skill benchmarks and deep dives, Start here, Why the workflow layer matters

### Community 43 - "install_global_skills.js"
Cohesion: 0.40
Nodes (4): aliases, fs, path, skills

### Community 44 - "🚀 Why Use This?"
Cohesion: 0.40
Nodes (5): ⚡ **Accelerate Your Research**, 🎯 **Comprehensive Coverage**, 🔧 **Easy Integration**, 🌟 **Maintained & Supported**, 🚀 Why Use This?

### Community 45 - "❓ FAQ"
Cohesion: 0.50
Nodes (4): Contributing, ❓ FAQ, General Questions, Installation & Setup

### Community 46 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

### Community 47 - "📄 License"
Cohesion: 0.67
Nodes (3): Individual Skill Licenses, Key Points:, 📄 License

### Community 48 - "screaming_frog.js"
Cohesion: 0.17
Nodes (24): buildScreamingFrogCommand(), CRAWL_STORAGE_DIR, crawlJobs, __dirname, __filename, findScreamingFrogBinary(), getScreamingFrogCrawlById(), getScreamingFrogCrawlSummary() (+16 more)

## Knowledge Gaps
- **340 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+335 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Scientific Agent Skills` connect `Scientific Agent Skills` to `Paper Citation`, `🤝 Contributing`, `🔬 Use Cases`, `💡 Quick Examples`, `🎯 Getting Started`, `📝 From the Blog`, `🚀 Why Use This?`, `❓ FAQ`, `📄 License`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `generateExecutiveReportHtml()` connect `test_exporter.js` to `index.js`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `exportToCsv()` connect `test_exporter.js` to `index.js`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _340 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `openseo.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12312312312312312 - nodes in this community are weakly interconnected._
- **Should `test_exporter.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08275862068965517 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._