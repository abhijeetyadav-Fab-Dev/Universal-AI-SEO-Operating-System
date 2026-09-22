#!/usr/bin/env node
/**
 * ==============================================================================
 * OmniSEO-OS Model Context Protocol (MCP) Server
 * Exposes OmniSEO OS capabilities over stdio / JSON-RPC 2.0 to AI assistants:
 * Claude Desktop, Cursor, Antigravity, and other MCP clients.
 *
 * Capabilities:
 * - audit_url: Executes full crawl and technical on-page SEO audit
 * - get_cwv: Inspects Core Web Vitals & Lighthouse metrics via Google PSI
 * - get_backlinks: Fetches backlink profile, referring domains & disavow rules
 * - check_geo: Tests Generative Engine (GEO) & Answer Engine (AEO) grounding
 * - get_open_intel: Queries authoritative zero-auth open protocols (RDAP, DNS, Wiki, HN)
 * ==============================================================================
 */

import dotenv from 'dotenv';
dotenv.config();

import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

// Adapters
import { auditTechnical } from './adapters/crawler.js';
import { crawlMultiPageSite } from './adapters/openseo.js';
import { fetchPageSpeed } from './adapters/pagespeed.js';
import { auditBacklinks } from './adapters/backlinks.js';
import { auditGeoAeo } from './adapters/geo.js';
import {
  queryWikipediaBacklinks,
  queryHackerNewsMentions,
  queryDomainRdap,
  queryGoogleDns,
  queryWikidataEntity,
  queryWikipediaSummary,
  queryDatamuseLsiKeywords
} from './adapters/open_apis.js';
import { auditHelpfulContentGuardrail } from './adapters/head_eeat.js';
import { submitToIndexNow, detectOrphanPages } from './adapters/indexnow_sitemap.js';
import { auditCruxFull } from './adapters/crux.js';
import { queryFreeLlm } from './adapters/freellmapi.js';
import { crawlInteractive } from './adapters/browser_use.js';
import { remember, recall, getMemoryStats } from './adapters/agentmemory.js';
import { generateSeoDiagram } from './adapters/diagram_design.js';
import { searchScientificLiterature, verifyScientificCitations } from './adapters/scientific_skills.js';
import { runAgentHarnessEvaluation } from './adapters/harness_engineering.js';
import { auditSecurityPosture } from './adapters/cybersecurity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── 1. MCP TOOL SCHEMAS ───────────────────────────────────────────
export const TOOLS = [
  {
    name: 'audit_url',
    description: 'Executes an in-depth on-page & technical SEO audit and crawl for a given target URL. Extracts title, description, canonical, robots directives, OpenGraph/Twitter meta, headings hierarchy, image alt coverage, internal/external links, and automated issue diagnostics with scores.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The target website URL to audit (e.g. https://example.com)'
        },
        maxPages: {
          type: 'number',
          description: 'Maximum number of pages to crawl (default: 1 for single-page audit, up to 20 for multi-page crawl)',
          default: 1
        }
      },
      required: ['url']
    }
  },
  {
    name: 'get_cwv',
    description: 'Inspects Core Web Vitals (LCP, CLS, TBT/FID, FCP, Speed Index) and Lighthouse performance scores via Google PageSpeed Insights API with caching and error resilience.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The target URL to inspect for Core Web Vitals'
        },
        strategy: {
          type: 'string',
          description: "Device strategy to analyze: 'mobile' or 'desktop' (default: 'mobile')",
          enum: ['mobile', 'desktop'],
          default: 'mobile'
        },
        apiKey: {
          type: 'string',
          description: 'Optional custom Google PageSpeed Insights API key (falls back to GOOGLE_PSI_API_KEY environment variable)'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'get_backlinks',
    description: 'Fetches backlink profile, referring domains count, Domain Rating (DR), anchor text distribution tiers, and identifies toxic link patterns with Google Disavow recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Target root domain or URL to analyze backlinks for (e.g. example.com or https://example.com)'
        },
        url: {
          type: 'string',
          description: 'Optional target page URL'
        },
        dataforseoLogin: {
          type: 'string',
          description: 'Optional DataForSEO API login for live backlink indexing'
        },
        dataforseoPassword: {
          type: 'string',
          description: 'Optional DataForSEO API password'
        }
      },
      required: ['domain']
    }
  },
  {
    name: 'check_geo',
    description: 'Tests Generative Engine Optimization (GEO) & Answer Engine Optimization (AEO) grounding, citation readiness, structured fact schema detection (Organization, Person, FAQPage, sameAs), and AI search grounding visibility for Perplexity, ChatGPT, and Claude.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Target website URL or domain to audit for GEO/AEO'
        },
        brand: {
          type: 'string',
          description: 'Optional brand or entity name (defaults to domain brand name)'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'get_open_intel',
    description: 'Calls open, zero-auth intelligence APIs across ICANN RDAP (WHOIS & domain age), Google DNS-over-HTTPS (DNSSEC & routing), Wikipedia article citations, Hacker News discussions, and Wikidata Knowledge Graph entities.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Target root domain to investigate (e.g. github.com or example.com)'
        }
      },
      required: ['domain']
    }
  },
  {
    name: 'audit_helpful_content',
    description: "Evaluates any webpage against Google Search Central's official Helpful Content System & E-E-A-T guidelines (https://developers.google.com/search/docs/fundamentals/creating-helpful-content). Returns scores for Who, How, Why, and E-E-A-T dimensions (out of 100), detects search-engine-first anti-patterns (keyword stuffing >3.8%, sensational clickbait, thin fluff, manufactured padding), evaluates the 8-point Google Self-Assessment Matrix, and provides prioritized, actionable remediations.",
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The target website URL to evaluate against Google Helpful Content standards'
        },
        html: {
          type: 'string',
          description: 'Optional raw HTML string to evaluate directly without network fetching (useful for draft content testing)'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'submit_indexnow',
    description: 'Submits one or more URLs to Bing, Yandex, and IndexNow participating search engines for instant indexing and crawl notification via the IndexNow protocol.',
    inputSchema: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          description: 'Target website host/domain (e.g. example.com)'
        },
        urlList: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of URLs to submit for instant indexing'
        },
        key: {
          type: 'string',
          description: 'Optional IndexNow 32-character hexadecimal verification key (auto-generated if omitted)'
        },
        keyLocation: {
          type: 'string',
          description: 'Optional URL where the key verification file is hosted'
        }
      },
      required: ['host', 'urlList']
    }
  },
  {
    name: 'detect_orphan_pages',
    description: 'Identifies orphan pages and coverage gaps by comparing discovered XML sitemap URLs against internal crawl graph links.',
    inputSchema: {
      type: 'object',
      properties: {
        sitemapUrls: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of URLs extracted from XML sitemap'
        },
        crawledUrls: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of URLs discovered during internal crawl'
        }
      },
      required: ['sitemapUrls', 'crawledUrls']
    }
  },
  {
    name: 'get_crux_history',
    description: 'Queries real-user performance data from the Google Chrome User Experience Report (CrUX) and CrUX Vis for a target URL or domain. Returns 28-day rolling snapshot metrics, 25-40 week historical timeseries for Core Web Vitals (LCP, INP, CLS, FCP, TTFB), pass/fail CWV assessment, and official Google CrUX Vis interactive deep links.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The target website URL or origin to query in CrUX (e.g. https://example.com)'
        },
        formFactor: {
          type: 'string',
          enum: ['ALL', 'PHONE', 'DESKTOP', 'TABLET'],
          description: 'Device form factor breakdown (default: ALL)',
          default: 'ALL'
        },
        collectionPeriodCount: {
          type: 'number',
          description: 'Number of weekly collection periods to retrieve (default: 25, max: 40)',
          default: 25
        }
      },
      required: ['url']
    }
  },
  {
    name: 'query_free_llm',
    description: 'Executes 100% free, zero-auth, keyless LLM reasoning and generative strategy queries via FreeLLMAPI (Pollinations AI, AI Horde volunteer GPUs, or local gateway). Automatically enforces Google Helpful Content & E-E-A-T guardrails.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The SEO or content strategy task / prompt to submit to the free LLM'
        },
        context: {
          type: 'string',
          description: 'Optional target page context (e.g. title, headings, meta description) to ground reasoning'
        },
        provider: {
          type: 'string',
          enum: ['auto', 'pollinations', 'aihorde', 'local'],
          description: 'Free LLM provider to route query to (default: auto)',
          default: 'auto'
        },
        model: {
          type: 'string',
          description: 'Optional specific model name (e.g. openai-fast, qwen, or custom)'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'browser_use_crawl',
    description: 'Executes an autonomous interactive DOM crawl and accessibility tree extraction based on Browser-Use (https://github.com/browser-use/browser-use). Extracts clickable targets, buttons, form fields with numbered IDs, and landmark accessibility semantics.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Target website URL to interactively crawl and ground'
        },
        maxElements: {
          type: 'number',
          description: 'Maximum interactive elements to extract (default: 50)',
          default: 50
        }
      },
      required: ['url']
    }
  },
  {
    name: 'manage_agent_memory',
    description: 'Interacts with the hybrid AgentMemory bank (https://github.com/rohitg00/agentmemory). Supports storing knowledge (action="remember"), recalling indexed memories (action="recall"), and inspecting allocation (action="stats").',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['remember', 'recall', 'stats'],
          description: 'Memory operation to perform'
        },
        key: {
          type: 'string',
          description: 'Memory key or identifier'
        },
        value: {
          type: 'string',
          description: 'Memory content / value to store'
        },
        query: {
          type: 'string',
          description: 'Search query for recall action'
        },
        type: {
          type: 'string',
          enum: ['working', 'episodic', 'semantic', 'entity'],
          description: 'Memory tier'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'generate_seo_diagram',
    description: 'Generates production-grade, accessible Mermaid architecture diagrams based on Diagram-Design (https://github.com/cathrynlavery/diagram-design). Types: site_architecture, redirect_chain, eeat_graph, cwv_waterfall, crawler_pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['site_architecture', 'redirect_chain', 'eeat_graph', 'cwv_waterfall', 'crawler_pipeline'],
          description: 'Type of diagram to generate',
          default: 'site_architecture'
        },
        title: {
          type: 'string',
          description: 'Optional diagram title'
        }
      },
      required: ['type']
    }
  },
  {
    name: 'verify_scientific_citations',
    description: 'Searches peer-reviewed academic literature across CrossRef and open scientific repositories based on Scientific Agent Skills (https://github.com/k-dense-ai/scientific-agent-skills) to verify factual, medical, or scientific claims for Google E-E-A-T audits.',
    inputSchema: {
      type: 'object',
      properties: {
        claims: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of factual or scientific claim strings to verify against peer-reviewed literature'
        },
        domain: {
          type: 'string',
          description: 'Optional domain name'
        }
      },
      required: ['claims']
    }
  },
  {
    name: 'run_agent_harness',
    description: 'Runs automated agent evaluation, fault injection resilience testing, and prompt drift detection benchmarks based on Awesome Harness Engineering (https://github.com/walkinglabs/awesome-harness-engineering).',
    inputSchema: {
      type: 'object',
      properties: {
        suite: {
          type: 'string',
          enum: ['all', 'fault_injection', 'prompt_drift', 'schema_integrity'],
          description: 'Evaluation benchmark suite to execute',
          default: 'all'
        }
      }
    }
  },
  {
    name: 'audit_security_posture',
    description: 'Audits HTTP security response headers (CSP, HSTS, X-Frame-Options, Permissions-Policy) and TLS posture mapped to MITRE ATT&CK and F3 based on Anthropic Cybersecurity Skills (https://github.com/mukul975/anthropic-cybersecurity-skills).',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Target website URL to audit for security posture and headers'
        }
      },
      required: ['url']
    }
  }
];

// ─── 2. TOOL EXECUTION HANDLERS ────────────────────────────────────

/**
 * Normalizes input into a valid HTTP/HTTPS URL
 */
function normalizeUrl(target) {
  if (!target || typeof target !== 'string') return '';
  let cleaned = target.trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

/**
 * Extracts a clean domain from a URL or domain string
 */
function extractDomain(target) {
  if (!target || typeof target !== 'string') return '';
  let cleaned = target.trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  try {
    return new URL(cleaned).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return target.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  }
}

/**
 * Executes a tool call by name with provided arguments
 */
export async function handleToolCall(name, args = {}) {
  switch (name) {
    case 'audit_url': {
      const rawUrl = args?.url;
      if (!rawUrl) {
        throw new Error("Missing required parameter: 'url'");
      }
      const targetUrl = normalizeUrl(rawUrl);
      const maxPages = Number(args?.maxPages) || 1;

      if (maxPages > 1) {
        return await crawlMultiPageSite(targetUrl, Math.min(maxPages, 20));
      }
      return await auditTechnical(targetUrl);
    }

    case 'get_cwv': {
      const rawUrl = args?.url;
      if (!rawUrl) {
        throw new Error("Missing required parameter: 'url'");
      }
      const targetUrl = normalizeUrl(rawUrl);
      const strategy = args?.strategy === 'desktop' ? 'desktop' : 'mobile';
      const apiKey = args?.apiKey || null;

      try {
        return await fetchPageSpeed(targetUrl, strategy, apiKey);
      } catch (err) {
        return {
          url: targetUrl,
          strategy,
          dataStatus: 'unavailable',
          isSimulated: false,
          error: err.message,
          metrics: {
            performanceScore: '—',
            lcp: '—',
            cls: '—',
            tbt: '—',
            fcp: '—',
            speedIndex: '—'
          },
          note: 'Google PageSpeed Insights API is unavailable or rate-limited. Pass an apiKey parameter or configure GOOGLE_PSI_API_KEY environment variable.'
        };
      }
    }

    case 'get_backlinks': {
      const rawTarget = args?.domain || args?.url || args?.target;
      if (!rawTarget) {
        throw new Error("Missing required parameter: 'domain' or 'url'");
      }
      const domain = extractDomain(rawTarget);
      const url = rawTarget.startsWith('http') ? rawTarget : `https://${domain}`;
      const options = {
        dataforseoLogin: args?.dataforseoLogin || process.env.DATAFORSEO_LOGIN || '',
        dataforseoPassword: args?.dataforseoPassword || process.env.DATAFORSEO_PASSWORD || '',
        dataforseoKey: args?.dataforseoKey || process.env.DATAFORSEO_API_KEY || ''
      };
      return await auditBacklinks(domain, url, options);
    }

    case 'check_geo': {
      const rawTarget = args?.url || args?.domain || args?.target;
      if (!rawTarget) {
        throw new Error("Missing required parameter: 'url' or 'domain'");
      }
      const domain = extractDomain(rawTarget);
      const url = rawTarget.startsWith('http') ? rawTarget : `https://${domain}`;
      const brand = args?.brand || domain.split('.')[0];
      return await auditGeoAeo(domain, brand, { url });
    }

    case 'get_open_intel': {
      const rawTarget = args?.domain || args?.query || args?.url || args?.target;
      if (!rawTarget) {
        throw new Error("Missing required parameter: 'domain'");
      }
      const domain = extractDomain(rawTarget);
      if (!domain || domain.length < 3) {
        throw new Error("Invalid domain specified for get_open_intel");
      }

      const startTime = Date.now();
      const [rdap, dnsRes, wikiBacklinks, hnStories, wikidata, wikiSummary, datamuseWords] = await Promise.allSettled([
        queryDomainRdap(domain),
        queryGoogleDns(domain),
        queryWikipediaBacklinks(domain, 10),
        queryHackerNewsMentions(domain, 10),
        queryWikidataEntity(domain, 5),
        queryWikipediaSummary(domain),
        queryDatamuseLsiKeywords(domain.split('.')[0] || domain, 10)
      ]);

      return {
        success: true,
        domain,
        latencyMs: Date.now() - startTime,
        dataStatus: 'measured',
        provenance: 'Aggregated Live Open APIs (Zero-Auth Authoritative Endpoints)',
        openEndpoints: {
          icannRdap: rdap.status === 'fulfilled' ? rdap.value : { success: false, error: rdap.reason?.message },
          googleDns: dnsRes.status === 'fulfilled' ? dnsRes.value : { success: false, error: dnsRes.reason?.message },
          wikipediaBacklinks: wikiBacklinks.status === 'fulfilled' ? wikiBacklinks.value : { success: false, error: wikiBacklinks.reason?.message },
          hackerNewsMentions: hnStories.status === 'fulfilled' ? hnStories.value : { success: false, error: hnStories.reason?.message },
          wikidataKnowledgeGraph: wikidata.status === 'fulfilled' ? wikidata.value : { success: false, error: wikidata.reason?.message },
          wikipediaSummary: wikiSummary.status === 'fulfilled' ? wikiSummary.value : { success: false, error: wikiSummary.reason?.message },
          datamuseLsiKeywords: datamuseWords.status === 'fulfilled' ? datamuseWords.value : { success: false, error: datamuseWords.reason?.message }
        }
      };
    }

    case 'audit_helpful_content': {
      const rawUrl = args?.url;
      if (!rawUrl) {
        throw new Error("Missing required parameter: 'url'");
      }
      const targetUrl = normalizeUrl(rawUrl);
      const rawHtml = args?.html || null;
      return await auditHelpfulContentGuardrail(targetUrl, rawHtml);
    }

    case 'submit_indexnow': {
      const host = args?.host || extractDomain(args?.url || '');
      if (!host) {
        throw new Error("Missing required parameter: 'host'");
      }
      const urlList = Array.isArray(args?.urlList) ? args.urlList : (args?.url ? [args.url] : []);
      if (urlList.length === 0) {
        throw new Error("Missing required parameter: 'urlList' (array of URLs)");
      }
      const key = args?.key || null;
      const keyLocation = args?.keyLocation || null;
      const res = await submitToIndexNow({ host, urlList, key, keyLocation });
      return { host, ...res };
    }

    case 'detect_orphan_pages': {
      const sitemapUrls = Array.isArray(args?.sitemapUrls) ? args.sitemapUrls : [];
      const crawledUrls = Array.isArray(args?.crawledUrls) ? args.crawledUrls : [];
      return detectOrphanPages(crawledUrls, sitemapUrls);
    }

    case 'get_crux_history': {
      const rawUrl = args?.url || args?.origin;
      if (!rawUrl) {
        throw new Error("Missing required parameter: 'url'");
      }
      const targetUrl = normalizeUrl(rawUrl);
      const formFactor = args?.formFactor || 'ALL';
      const collectionPeriodCount = Number(args?.collectionPeriodCount) || 25;
      return await auditCruxFull(targetUrl, { formFactor, collectionPeriodCount });
    }

    case 'query_free_llm': {
      const prompt = args?.prompt;
      if (!prompt) {
        throw new Error("Missing required parameter: 'prompt'");
      }
      return await queryFreeLlm({
        prompt,
        context: args?.context || '',
        provider: args?.provider || 'auto',
        model: args?.model || null
      });
    }

    case 'browser_use_crawl': {
      const rawUrl = args?.url;
      if (!rawUrl) {
        throw new Error("Missing required parameter: 'url'");
      }
      return await crawlInteractive({
        url: normalizeUrl(rawUrl),
        maxElements: args?.maxElements || 50
      });
    }

    case 'manage_agent_memory': {
      const action = args?.action;
      if (!action) {
        throw new Error("Missing required parameter: 'action' ('remember', 'recall', or 'stats')");
      }
      if (action === 'remember') {
        if (!args.value) throw new Error("Missing required parameter: 'value' for remember");
        return remember({
          key: args.key,
          value: args.value,
          type: args.type || 'semantic',
          tags: args.tags || []
        });
      } else if (action === 'recall') {
        return recall({
          query: args.query || '',
          type: args.type || null,
          limit: args.limit || 10
        });
      } else if (action === 'stats') {
        return getMemoryStats();
      } else {
        throw new Error(`Invalid memory action: ${action}`);
      }
    }

    case 'generate_seo_diagram': {
      const type = args?.type;
      if (!type) {
        throw new Error("Missing required parameter: 'type'");
      }
      return generateSeoDiagram({
        type,
        data: args?.data || {},
        title: args?.title || 'SEO Architecture Diagram'
      });
    }

    case 'verify_scientific_citations': {
      const claims = args?.claims;
      if (!claims || !Array.isArray(claims)) {
        throw new Error("Missing required parameter: 'claims' (must be an array of claim strings)");
      }
      return await verifyScientificCitations({
        claims,
        domain: args?.domain || ''
      });
    }

    case 'run_agent_harness': {
      return await runAgentHarnessEvaluation({
        suite: args?.suite || 'all',
        targetUrl: args?.targetUrl || 'https://example.com'
      });
    }

    case 'audit_security_posture': {
      const rawUrl = args?.url;
      if (!rawUrl) {
        throw new Error("Missing required parameter: 'url'");
      }
      return await auditSecurityPosture(normalizeUrl(rawUrl));
    }

    default:
      throw new Error(`Unknown tool requested: ${name}`);
  }
}

// ─── 3. JSON-RPC 2.0 PROTOCOL ENGINE ───────────────────────────────

/**
 * Handles incoming JSON-RPC 2.0 message and returns response object (or null for notifications)
 */
export async function handleJsonRpcMessage(message) {
  let req;
  if (typeof message === 'string') {
    try {
      req = JSON.parse(message);
    } catch {
      return {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: Invalid JSON string' }
      };
    }
  } else {
    req = message;
  }

  if (!req || typeof req !== 'object') {
    return {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Invalid Request: expected JSON object' }
    };
  }

  const { id, method, params } = req;
  const isNotification = id === undefined || id === null;

  // Notification: initialized
  if (method === 'notifications/initialized') {
    return null; // Notifications require no response
  }

  // Ping request
  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  // Protocol Initialization
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: false
          }
        },
        serverInfo: {
          name: 'omniseo-os-mcp',
          version: '2.0.0'
        }
      }
    };
  }

  // Tool Discovery
  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: TOOLS
      }
    };
  }

  // Tool Execution
  if (method === 'tools/call') {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};

    try {
      const output = await handleToolCall(toolName, toolArgs);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof output === 'string' ? output : JSON.stringify(output, null, 2)
            }
          ],
          isError: false
        }
      };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: `[MCP Error in ${toolName}]: ${err.message}`
            }
          ],
          isError: true
        }
      };
    }
  }

  // Unknown Method
  if (isNotification) {
    return null;
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`
    }
  };
}

// ─── 4. STDIO MCP SERVER RUNNER ───────────────────────────────────

/**
 * Starts the stdio JSON-RPC reader/writer
 */
export function startMcpServer(inStream = process.stdin, outStream = process.stdout) {
  const rl = readline.createInterface({
    input: inStream,
    terminal: false
  });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const response = await handleJsonRpcMessage(trimmed);
      if (response !== null && response !== undefined) {
        outStream.write(JSON.stringify(response) + '\n');
      }
    } catch (err) {
      const fallbackErr = {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: `Internal server error: ${err.message}` }
      };
      outStream.write(JSON.stringify(fallbackErr) + '\n');
    }
  });

  return rl;
}

// ─── 5. CLI DIRECT EXECUTION ENTRYPOINT ───────────────────────────
const isDirectRun = process.argv[1] && (
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
);

if (isDirectRun) {
  // Divert all normal console.log statements to stderr so stdout is reserved for JSON-RPC 2.0
  console.log = (...args) => {
    process.stderr.write(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n');
  };

  process.stderr.write('[OmniSEO-OS MCP] Initializing OmniSEO Model Context Protocol Server (stdio JSON-RPC)...\n');
  startMcpServer(process.stdin, process.stdout);
  process.stderr.write('[OmniSEO-OS MCP] Ready to receive JSON-RPC messages from Claude Desktop, Cursor & Antigravity.\n');
}
