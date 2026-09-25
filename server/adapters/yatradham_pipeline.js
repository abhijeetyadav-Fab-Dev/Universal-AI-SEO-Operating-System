/**
 * Yatra Dham SEO Data Pipeline & API Auditor Adapter
 * 
 * Provides live endpoint auditing, Core Web Vitals + Keyword Research data pipeline inspection,
 * and integration reference for yatradham.org. Incorporates strict "is_real_data" validation
 * based on HTTP 2xx + error-key signals.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Top-level error signals (from is_real_fix.py) that mark a response as non-usable
export const ERROR_KEY_SIGNALS = new Set(['error', 'errors', 'error_type', 'error_message', 'fault']);

export const YATRADHAM_DEFAULT_VARS = {
  TEST_DOMAIN: 'yatradham.org',
  TEST_URL: 'https://yatradham.org/dwarka-hotel-vandana.html',
  TEST_QUERY: 'somnath temple room booking'
};

export const YATRADHAM_PIPELINE_CONFIG = {
  name: 'YatraDham SEO Data Pipeline',
  domain: 'yatradham.org',
  description: 'Keyword research, SERP extraction, and Core Web Vitals data pipeline for yatradham.org with Google Apps Script batching.',
  groups: {
    pagespeed_insights: {
      name: 'Google PageSpeed Insights',
      baseUrl: 'https://www.googleapis.com/pagespeedonline/v5',
      auth: { type: 'query', param: 'key', env: 'GOOGLE_API_KEY' },
      endpoints: [
        {
          method: 'GET',
          path: '/runPagespeed',
          params: { url: '{TEST_URL}', strategy: 'mobile', category: 'performance' },
          notes: 'Real Lighthouse run per call (10-90s). Batch in parallel with UrlFetchApp.fetchAll().'
        }
      ]
    },
    crux: {
      name: 'Google Chrome UX Report (CrUX)',
      baseUrl: 'https://chromeuxreport.googleapis.com/v1',
      auth: { type: 'query', param: 'key', env: 'GOOGLE_API_KEY' },
      endpoints: [
        {
          method: 'POST',
          path: '/records:queryRecord',
          body: { url: '{TEST_URL}', formFactor: 'PHONE' },
          notes: 'URL-level 28-day rolling CrUX data. 404 indicates low traffic (not an error). Requires Chrome UX Report API enabled.'
        },
        {
          method: 'POST',
          path: '/records:queryRecord',
          body: { origin: 'https://{TEST_DOMAIN}', formFactor: 'PHONE' },
          notes: 'Origin-level fallback for domains where individual URLs lack sufficient CrUX traffic.'
        },
        {
          method: 'POST',
          path: '/records:queryHistoryRecord',
          body: { url: '{TEST_URL}', formFactor: 'PHONE', collectionPeriodCount: 4 },
          notes: 'Weekly points, each a 28-day rolling average. No true daily granularity exists.'
        },
        {
          method: 'POST',
          path: '/records:queryHistoryRecord',
          body: { origin: 'https://{TEST_DOMAIN}', formFactor: 'PHONE', collectionPeriodCount: 4 },
          notes: 'Origin-level weekly historical CrUX trends.'
        }
      ]
    },
    openpagerank_new: {
      name: 'Keywords Everywhere OpenPageRank',
      baseUrl: 'https://openpagerank.keywordseverywhere.com/v1',
      auth: { type: 'bearer', env: 'OPR_API_KEY' },
      endpoints: [
        {
          method: 'POST',
          path: '/domains/bulk',
          body: { domains: ['yatradham.org', 'google.com', 'github.com'], include_history: false },
          notes: 'Keywords Everywhere OpenPageRank. Key format opr_live_... Free tier 30k unique domains/mo.'
        },
        {
          method: 'GET',
          path: '/usage',
          notes: 'Read-only, does not count against monthly domain quota.'
        },
        {
          method: 'GET',
          path: '/health',
          auth_override: 'none',
          notes: 'Public health check, no authentication required.'
        }
      ]
    },
    openpagerank_original: {
      name: 'DomCop Original OpenPageRank',
      baseUrl: 'https://openpagerank.com/api/v1.0',
      auth: { type: 'header', header: 'API-OPR', env: 'OPR_ORIGINAL_API_KEY' },
      endpoints: [
        {
          method: 'GET',
          path: '/getPageRank',
          params: { 'domains[0]': 'yatradham.org', 'domains[1]': 'google.com' },
          notes: 'domcop.com original service. DIFFERENT key from the keywordseverywhere.com one above.'
        }
      ]
    },
    serpapi: {
      name: 'SerpApi Google Search Engine',
      baseUrl: 'https://serpapi.com',
      auth: { type: 'query', param: 'api_key', env: 'SERPAPI_KEY' },
      endpoints: [
        {
          method: 'GET',
          path: '/search.json',
          params: { engine: 'google', q: '{TEST_QUERY}', gl: 'in', hl: 'en', num: '10' },
          notes: 'Can return HTTP 200 with an "error" field in JSON on quota exhaustion - check body, not just status.'
        },
        {
          method: 'GET',
          path: '/account',
          notes: 'Quota check (plan_searches_left / searches_per_month).'
        }
      ]
    },
    ahrefs_v3: {
      name: 'Ahrefs v3 REST API',
      baseUrl: 'https://api.ahrefs.com/v3',
      auth: { type: 'bearer', env: 'AHREFS_API_KEY' },
      endpoints: [
        {
          method: 'GET',
          path: '/keywords-explorer/overview',
          params: { country: 'in', keywords: '{TEST_QUERY}', select: 'keyword,volume,difficulty' },
          notes: 'Requires Enterprise plan; "public endpoints" scope returns 401/403.'
        },
        {
          method: 'GET',
          path: '/keywords-explorer/volume-history',
          params: { country: 'in', keyword: '{TEST_QUERY}' },
          notes: 'Historical search volume query.'
        },
        {
          method: 'GET',
          path: '/site-explorer/all-backlinks',
          params: { target: '{TEST_DOMAIN}' },
          notes: 'Live backlinks breakdown.'
        },
        {
          method: 'GET',
          path: '/site-explorer/pages-by-backlinks',
          params: { target: '{TEST_DOMAIN}' },
          notes: 'Top pages by backlinks.'
        },
        {
          method: 'GET',
          path: '/site-explorer/organic-keywords',
          params: { target: '{TEST_DOMAIN}' },
          notes: 'Organic search keyword rankings.'
        },
        {
          method: 'GET',
          path: '/site-explorer/domain-rating',
          params: { target: '{TEST_DOMAIN}' },
          notes: 'Live official Domain Rating (DR).'
        }
      ]
    },
    ahrefs_legacy: {
      name: 'Ahrefs v2 Legacy (Deprecated)',
      baseUrl: 'https://apiv2.ahrefs.com',
      auth: { type: 'none' },
      endpoints: [
        {
          method: 'GET',
          path: '/',
          deprecated: true,
          notes: 'Deprecated v2 API - returns HTML/429, not structured JSON.'
        }
      ]
    },
    ahrefs_v1_legacy: {
      name: 'Ahrefs v1 Legacy (Deprecated)',
      baseUrl: 'https://api.ahrefs.com/v1',
      auth: { type: 'none' },
      endpoints: [
        {
          method: 'GET',
          path: '/get_backlinks',
          deprecated: true,
          notes: 'Deprecated legacy v1 query endpoint - returns 404 HTML, migrate to v3.'
        }
      ]
    },
    google_suggest: {
      name: 'Google Autocomplete & Suggest (Free)',
      baseUrl: 'https://suggestqueries.google.com',
      auth: { type: 'none' },
      endpoints: [
        {
          method: 'GET',
          path: '/complete/search',
          params: { client: 'chrome', q: '{TEST_QUERY}', gl: 'in', hl: 'en' },
          notes: 'Fast, free unauthenticated Google search autocomplete queries for keyword research.'
        }
      ]
    },
    datamuse_lsi: {
      name: 'Datamuse LSI Keywords (Free)',
      baseUrl: 'https://api.datamuse.com',
      auth: { type: 'none' },
      endpoints: [
        {
          method: 'GET',
          path: '/words',
          params: { ml: '{TEST_QUERY}', max: '10' },
          notes: 'Free unauthenticated LSI and semantic co-occurrence keyword associations (ml = means like).'
        }
      ]
    }
  }
};

/**
 * Strict evaluation of whether a response is real, usable API data
 * (Complies with is_real_fix.py: 2xx status + non-empty JSON + absence of top-level error signals)
 */
export function isRealApiData(status, format, bodyText) {
  if (typeof status !== 'number' || status < 200 || status >= 300) {
    return false;
  }
  if (format !== 'JSON') {
    return false;
  }
  if (!bodyText || bodyText.trim().length < 2) {
    return false;
  }

  try {
    const parsed = JSON.parse(bodyText);
    if (Array.isArray(parsed)) {
      return parsed.length > 0;
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const keys = Object.keys(parsed);
      if (keys.length === 0) return false;
      // Case-insensitive check for error signals
      const hasError = keys.some(k => ERROR_KEY_SIGNALS.has(k.toLowerCase()));
      if (hasError) return false;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Replace {VAR} placeholders in strings, objects, or arrays
 */
function substituteVars(value, variables) {
  if (typeof value === 'string') {
    let result = value;
    for (const [k, v] of Object.entries(variables)) {
      result = result.replaceAll(`{${k}}`, String(v));
    }
    return result;
  }
  if (Array.isArray(value)) {
    return value.map(v => substituteVars(v, variables));
  }
  if (typeof value === 'object' && value !== null) {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = substituteVars(v, variables);
    }
    return out;
  }
  return value;
}

/**
 * Classify response content format
 */
function classifyFormat(contentType, bodyText) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('json') || ct.includes('javascript')) {
    const stripped = (bodyText || '').trim().charAt(0);
    if (stripped === '{' || stripped === '[') return 'JSON';
  }
  if (ct.includes('html')) return 'HTML';
  if (ct.includes('xml')) return 'XML';
  const stripped = (bodyText || '').trim().charAt(0);
  if (stripped === '{' || stripped === '[') return 'JSON';
  if (stripped === '<') return 'HTML/XML';
  return bodyText && bodyText.trim() ? 'TEXT' : 'EMPTY';
}

/**
 * Check for deprecation signals
 */
function checkDeprecation(bodyText, headers, endpointCfg) {
  const reasons = [];
  if (endpointCfg.deprecated) {
    reasons.push('Configured deprecated endpoint');
  }
  if (headers['deprecation']) {
    reasons.push(`Deprecation header: ${headers['deprecation']}`);
  }
  if (headers['sunset']) {
    reasons.push(`Sunset header: ${headers['sunset']}`);
  }
  const warning = headers['warning'] || '';
  if (warning.includes('299') && /deprecat|sunset/i.test(warning)) {
    reasons.push(`Warning 299: ${warning}`);
  }
  const notes = endpointCfg.notes || '';
  if (/deprecat|sunset|legacy api|no longer (supported|available)/i.test(notes)) {
    reasons.push(`Notes flag: ${notes}`);
  }
  if (/deprecat|sunset|this (api|endpoint|version) has been retired|please migrate to/i.test(bodyText || '')) {
    reasons.push('Response body mentions deprecation/retirement');
  }

  return {
    isDeprecated: reasons.length > 0,
    deprecationReason: reasons.join('; ')
  };
}

/**
 * Run a single endpoint probe with polite timeout and 429 retry
 */
async function probeSingleEndpoint(groupKey, groupCfg, endpointCfg, variables, envKeys) {
  const method = (endpointCfg.method || 'GET').toUpperCase();
  const pathPart = substituteVars(endpointCfg.path, variables);
  const baseUrl = substituteVars(groupCfg.baseUrl, variables);
  const params = substituteVars(endpointCfg.params || {}, variables);
  const bodyData = substituteVars(endpointCfg.body || null, variables);

  // Authentication configuration
  const authOverride = endpointCfg.auth_override || groupCfg.auth?.type || 'none';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OmniSEO-OS/2.0'
  };

  const envVarName = groupCfg.auth?.env || '';
  const apiKey = envKeys[envVarName] || process.env[envVarName] || '';

  if (authOverride !== 'none' && apiKey) {
    if (authOverride === 'query' && groupCfg.auth?.param) {
      params[groupCfg.auth.param] = apiKey;
    } else if (authOverride === 'header' && groupCfg.auth?.header) {
      headers[groupCfg.auth.header] = apiKey;
    } else if (authOverride === 'bearer') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  const queryStr = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
  const fullUrl = `${baseUrl}${pathPart}${queryStr}`;

  let status = null;
  let statusText = 'UNKNOWN';
  let contentType = 'none';
  let bodyText = '';
  let latencyMs = 0;
  let errorMsg = null;

  async function executeFetch() {
    const t0 = Date.now();
    const fetchOpts = {
      method,
      headers: { ...headers },
      timeout: 20000
    };
    if (method === 'POST' && bodyData) {
      fetchOpts.headers['Content-Type'] = 'application/json';
      fetchOpts.body = JSON.stringify(bodyData);
    }
    const res = await fetch(fullUrl, fetchOpts);
    const duration = Date.now() - t0;
    const txt = await res.text();
    return { res, duration, txt };
  }

  try {
    let result = await executeFetch();
    status = result.res.status;
    statusText = result.res.statusText || `HTTP ${status}`;
    latencyMs = result.duration;
    bodyText = result.txt;
    contentType = result.res.headers.get('content-type') || 'none';

    // Retry once if 429
    if (status === 429) {
      await new Promise(r => setTimeout(r, 1500));
      result = await executeFetch();
      status = result.res.status;
      statusText = result.res.statusText || `HTTP ${status}`;
      latencyMs = result.duration;
      bodyText = result.txt;
      contentType = result.res.headers.get('content-type') || 'none';
    }
  } catch (err) {
    errorMsg = err.message;
    statusText = 'FAILED';
  }

  const format = classifyFormat(contentType, bodyText);
  const isReal = isRealApiData(status, format, bodyText);

  // Headers map for deprecation check
  const headerMap = {};
  if (contentType) headerMap['content-type'] = contentType;

  const depCheck = checkDeprecation(bodyText, headerMap, endpointCfg);

  let combinedNotes = endpointCfg.notes || '';
  if (depCheck.deprecationReason && !combinedNotes.includes(depCheck.deprecationReason)) {
    combinedNotes = combinedNotes ? `${combinedNotes} | ${depCheck.deprecationReason}` : depCheck.deprecationReason;
  }

  return {
    group: groupKey,
    groupName: groupCfg.name,
    method,
    path: pathPart,
    fullUrl,
    status: status !== null ? status : `ERROR: ${errorMsg}`,
    statusText,
    latencyMs,
    format,
    contentType,
    isReal: isReal ? 'YES' : 'NO',
    isRealApi: !!isReal,
    isDeprecated: depCheck.isDeprecated ? 'YES' : 'NO',
    deprecated: !!depCheck.isDeprecated,
    deprecationNotes: combinedNotes,
    discoverySource: `endpoints.json / ${groupKey}`,
    error: errorMsg
  };
}

/**
 * Execute the full audit across all 21 pipeline endpoints
 */
export async function runYatraDhamAudit(options = {}) {
  const {
    domain = YATRADHAM_DEFAULT_VARS.TEST_DOMAIN,
    url = YATRADHAM_DEFAULT_VARS.TEST_URL,
    query = YATRADHAM_DEFAULT_VARS.TEST_QUERY,
    delayMs = 250,
    apiKeys = {}
  } = options;

  const variables = {
    TEST_DOMAIN: domain,
    TEST_URL: url,
    TEST_QUERY: query,
    ...apiKeys
  };

  const rows = [];
  const groups = YATRADHAM_PIPELINE_CONFIG.groups;

  for (const [groupKey, groupCfg] of Object.entries(groups)) {
    for (const endpointCfg of groupCfg.endpoints) {
      const row = await probeSingleEndpoint(groupKey, groupCfg, endpointCfg, variables, apiKeys);
      rows.push(row);
      if (delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }

  // Statistics calculation
  const total = rows.length;
  const liveUsable = rows.filter(r => r.isReal === 'YES' || r.isRealApi === true).length;
  const deprecated = rows.filter(r => r.isDeprecated === 'YES' || r.deprecated === true).length;
  const authBlocked = rows.filter(r => r.status === 401 || r.status === 403).length;
  const rateLimited = rows.filter(r => r.status === 429).length;
  const serverErrors = rows.filter(r => typeof r.status === 'number' && r.status >= 500).length;
  const validLatencies = rows.filter(r => r.latencyMs > 0).map(r => r.latencyMs);
  const avgLatencyMs = validLatencies.length ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length) : 0;

  const summary = {
    total,
    liveUsable,
    authBlocked,
    deprecated,
    rateLimited,
    serverErrors,
    avgLatencyMs
  };

  return {
    success: true,
    target: { domain, url, query },
    auditedAt: new Date().toISOString(),
    count: total,
    total,
    stats: summary,
    summary,
    results: rows,
    rows
  };
}

/**
 * Retrieve Yatra Dham pipeline documentation from SKILL.md
 */
export function getYatraDhamSkillMarkdown() {
  const localSkillPath = path.join(__dirname, '../../Downloads/files (1)/SKILL.md');
  const agentSkillPath = path.join(process.env.USERPROFILE || 'C:\\Users\\ydtva', '.agents/skills/yatradham-seo-pipeline/SKILL.md');

  if (fs.existsSync(localSkillPath)) {
    return fs.readFileSync(localSkillPath, 'utf8');
  }
  if (fs.existsSync(agentSkillPath)) {
    return fs.readFileSync(agentSkillPath, 'utf8');
  }
  return '# Yatra Dham SEO Data Pipeline\n\nSkill documentation loaded.';
}
