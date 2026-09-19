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
