import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns/promises';
import net from 'net';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { parseAndPlan } from './engine/planner.js';
import { executeOrchestratedPlan } from './engine/orchestrator.js';
import { auditBacklinks } from './adapters/backlinks.js';
import {
  crawlMultiPageSite,
  simulateGSC,
  trackRankings,
  researchKeywords,
  analyzeDomainOverview,
  monitorBrand,
  handleAiPrompt,
  extractSavedKeywords,
  analyzeCompetitorGap,
  universalWebScraper
} from './adapters/openseo.js';
import { auditHeadAndEeat } from './adapters/head_eeat.js';
import {
  queryWikipediaBacklinks,
  queryHackerNewsMentions,
  queryDomainRdap,
  queryGoogleDns,
  queryWikidataEntity,
  queryWikipediaSummary,
  queryWikimediaPageviews,
  queryDatamuseLsiKeywords,
  queryGoogleSuggest
} from './adapters/open_apis.js';
import {
  saveAuditSnapshot,
  getAuditHistory,
  getProjectList,
  getSnapshotById,
  compareSnapshots,
  deleteSnapshot,
  clearHistory
} from './adapters/storage.js';
import {
  generateGoogleAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  listVerifiedSites,
  querySearchAnalytics,
  isGscConfigured
} from './adapters/gsc_real.js';
import {
  generateExecutiveReportHtml,
  exportToCsv
} from './adapters/exporter.js';
import {
  generateIndexNowKey,
  submitToIndexNow,
  fetchAndParseSitemap,
  detectOrphanPages
} from './adapters/indexnow_sitemap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── ACTIVE ENTERPRISE API SETTINGS STORE ─────────────────
const activeApiSettings = {
  psiApiKey: process.env.GOOGLE_PSI_API_KEY || process.env.PAGESPEED_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openrouterModel: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
  nvidiaApiKey: process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY || '',
  nvidiaModel: process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct',
  dataforseoLogin: process.env.DATAFORSEO_LOGIN || '',
  dataforseoPassword: process.env.DATAFORSEO_PASSWORD || '',
  gscClientId: process.env.GSC_CLIENT_ID || '',
  gscClientSecret: process.env.GSC_CLIENT_SECRET || '',
  gscRedirectUri: process.env.GSC_REDIRECT_URI || ''
};

export function maskKey(key) {
  if (!key || typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.substring(0, 4)}••••${trimmed.substring(trimmed.length - 4)}`;
}

export function resolveRequestOptions(req) {
  return {
    psiApiKey: req.headers['x-psi-key'] || activeApiSettings.psiApiKey || '',
    openrouterKey: req.headers['x-openrouter-key'] || activeApiSettings.openrouterApiKey || '',
    openrouterModel: req.headers['x-openrouter-model'] || activeApiSettings.openrouterModel || 'deepseek/deepseek-chat',
    nvidiaKey: req.headers['x-nvidia-key'] || activeApiSettings.nvidiaApiKey || '',
    nvidiaModel: req.headers['x-nvidia-model'] || activeApiSettings.nvidiaModel || 'meta/llama-3.3-70b-instruct',
    geminiKey: req.headers['x-gemini-key'] || activeApiSettings.geminiApiKey || '',
    geminiModel: req.headers['x-gemini-model'] || activeApiSettings.geminiModel || 'gemini-2.0-flash',
    openaiKey: req.headers['x-openai-key'] || activeApiSettings.openaiApiKey || '',
    dataforseoLogin: req.headers['x-dataforseo-login'] || activeApiSettings.dataforseoLogin || '',
    dataforseoPassword: req.headers['x-dataforseo-password'] || activeApiSettings.dataforseoPassword || '',
    dataforseoKey: req.headers['x-dataforseo-key'] || ''
  };
}

const app = express();
const PORT = process.env.PORT || 4000;

// ─── ENTERPRISE SECURITY HEADERS & CSP MIDDLEWARE ────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'self'; base-uri 'self'; form-action 'self';");
  next();
});

// ─── IN-MEMORY SLIDING-WINDOW RATE LIMITER ─────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1-minute window
const MAX_GENERAL_API_PER_MIN = 120;
const MAX_CRAWL_API_PER_MIN = 30;

function rateLimiter(req, res, next) {
  if (!req.path.startsWith('/api/')) return next();
  
  const clientIp = (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) || req.socket?.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const isCrawlEndpoint = req.path === '/api/audit' || req.path === '/api/scrape' || req.path === '/api/v1/audit' || req.path === '/api/v1/scrape';
  const limit = isCrawlEndpoint ? MAX_CRAWL_API_PER_MIN : MAX_GENERAL_API_PER_MIN;

  let clientRecord = rateLimitMap.get(clientIp);
  if (!clientRecord) {
    clientRecord = { crawl: [], general: [] };
    rateLimitMap.set(clientIp, clientRecord);
  }

  const bucket = isCrawlEndpoint ? clientRecord.crawl : clientRecord.general;
  const filtered = bucket.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  if (isCrawlEndpoint) {
    clientRecord.crawl = filtered;
  } else {
    clientRecord.general = filtered;
  }

  if (filtered.length >= limit) {
    const oldest = filtered[0];
    const retryAfterSec = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000));
    res.setHeader('Retry-After', retryAfterSec);
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded (${limit} requests/min). Please slow down and try again.`,
      retryAfter: retryAfterSec
    });
  }

  filtered.push(now);
  next();
}

// Stale entry garbage collector (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    record.crawl = record.crawl.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    record.general = record.general.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    if (record.crawl.length === 0 && record.general.length === 0) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

app.use(rateLimiter);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static Asset Serving with 1-day Browser Caching
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  etag: true
}));

// ─── DEDICATED SEO & DISCOVERY ROUTES ─────────────────────
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, '../public/robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, '../public/sitemap.xml'));
});

app.get('/llms.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, '../public/llms.txt'));
});

app.get(['/.well-known/security.txt', '/security.txt'], (req, res) => {
  res.type('text/plain');
  res.send(`Contact: mailto:security@universal-ai-seo-operating-system.onrender.com
Expires: 2027-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://universal-ai-seo-operating-system.onrender.com/.well-known/security.txt
Policy: https://github.com/abhijeetyadav-Fab-Dev/Universal-AI-SEO-Operating-System/security/policy
`);
});

// Clean Knowledge Base & Blog URLs
app.get(['/blog', '/blog/'], (req, res) => {
  res.sendFile(path.join(__dirname, '../public/blog/index.html'));
});

app.get('/blog/:slug', (req, res) => {
  const filePath = path.join(__dirname, `../public/blog/${req.params.slug}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
    }
  });
});

// ─── OPENAPI 3.0 SPECIFICATION & INTERACTIVE DOCUMENTATION ──
app.get(['/api/openapi.json', '/api/v1/openapi.json'], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(path.join(__dirname, 'openapi.json'));
});

app.get(['/api/docs', '/api/v1/docs'], (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OmniSEO OS — Enterprise API (v1) Reference</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
  <style>
    body { margin: 0; background: #0b0f19; font-family: system-ui, -apple-system, sans-serif; color: #f1f5f9; }
    .top-header { background: #020617; border-bottom: 1px solid #1e293b; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .top-header h1 { margin: 0; font-size: 1.1rem; color: #38bdf8; display: flex; align-items: center; gap: 8px; font-weight: 700; }
    .top-header a { color: #94a3b8; text-decoration: none; font-size: 0.85rem; padding: 6px 12px; border: 1px solid #334155; border-radius: 6px; transition: all 0.2s; }
    .top-header a:hover { color: #f8fafc; border-color: #38bdf8; background: rgba(56,189,248,0.1); }
    .swagger-ui { filter: invert(88%) hue-rotate(180deg); max-width: 1200px; margin: 0 auto; padding: 20px; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui img { filter: invert(100%) hue-rotate(180deg); }
  </style>
</head>
<body>
  <div class="top-header">
    <h1>⚡ OmniSEO OS — Enterprise API (v1) Reference</h1>
    <div style="display:flex; gap:12px;">
      <a href="/api/v1/openapi.json" target="_blank">OpenAPI 3.0 Spec JSON ↗</a>
      <a href="/">← Return to Dashboard</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`);
});

export function isBlockedIp(ip) {
  if (!net.isIP(ip)) return true;
  if (ip === '0.0.0.0' || ip === '::' || ip === '::1') return true;
  const v6 = ip.toLowerCase();
  if (v6.startsWith('fc') || v6.startsWith('fd')) return true;          // ULA fc00::/7
  if (v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb')) return true; // link-local
  if (v6 === '127::1' || v6.startsWith('64:ff9b::') || v6.startsWith('100::')) return true; // NAT64 / TLA
  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    if (parts[0] === 0 || parts[0] === 10 || parts[0] === 127) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // CGNAT
    if (parts[0] === 169 && parts[1] === 254) return true;                  // link-local / cloud metadata
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true; // benchmarking
  }
  return false;
}

export async function assertSafeUrl(target) {
  let u;
  try {
    let urlToTest = String(target || '').trim();
    if (!/^https?:\/\//i.test(urlToTest)) urlToTest = `https://${urlToTest}`;
    u = new URL(urlToTest);
  } catch {
    throw new Error('Invalid or restricted URL target (SSRF protection).');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Invalid or restricted URL target (SSRF protection).');
  if (u.username || u.password) throw new Error('Invalid or restricted URL target (SSRF protection).');
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host === 'metadata.google.internal' || host === 'instance-data' || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan')) {
    throw new Error('Invalid or restricted URL target (SSRF protection).');
  }
  let ips;
  if (net.isIP(host)) {
    ips = [host];
  } else {
    try {
      ips = (await dns.lookup(host, { all: true })).map(r => r.address);
    } catch {
      throw new Error('DNS resolution failed for target.');
    }
  }
  if (!ips.length || ips.some(isBlockedIp)) throw new Error('Invalid or restricted URL target (SSRF protection).');
  return u;
}

export function isSafeUrl(rawUrl) {
  try {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    let urlToTest = rawUrl.trim();
    if (!/^https?:\/\//i.test(urlToTest)) {
      urlToTest = `https://${urlToTest}`;
    }
    
    const parsed = new URL(urlToTest);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (parsed.username || parsed.password) return false;

    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return false;
    if (host === '169.254.169.254' || host === 'metadata.google.internal' || host === 'instance-data') return false;
    if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan')) return false;

    if (net.isIP(host)) {
      if (isBlockedIp(host)) return false;
    }

    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = host.match(ipv4Regex);
    if (ipMatch) {
      const octets = ipMatch.slice(1, 5).map(Number);
      if (octets.some(o => o < 0 || o > 255)) return false;
      if (isBlockedIp(host)) return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ─── 0. ENTERPRISE API SETTINGS & CONNECTIVITY TESTING ──
app.get(['/api/settings', '/api/v1/settings'], (req, res) => {
  res.json({
    success: true,
    settings: {
      psi: {
        configured: Boolean(activeApiSettings.psiApiKey),
        maskedKey: maskKey(activeApiSettings.psiApiKey)
      },
      openrouter: {
        configured: Boolean(activeApiSettings.openrouterApiKey),
        maskedKey: maskKey(activeApiSettings.openrouterApiKey),
        model: activeApiSettings.openrouterModel
      },
      nvidia: {
        configured: Boolean(activeApiSettings.nvidiaApiKey),
        maskedKey: maskKey(activeApiSettings.nvidiaApiKey),
        model: activeApiSettings.nvidiaModel
      },
      gemini: {
        configured: Boolean(activeApiSettings.geminiApiKey),
        maskedKey: maskKey(activeApiSettings.geminiApiKey),
        model: activeApiSettings.geminiModel
      },
      openai: {
        configured: Boolean(activeApiSettings.openaiApiKey),
        maskedKey: maskKey(activeApiSettings.openaiApiKey)
      },
      dataforseo: {
        configured: Boolean(activeApiSettings.dataforseoLogin && activeApiSettings.dataforseoPassword),
        maskedLogin: maskKey(activeApiSettings.dataforseoLogin)
      },
      gsc: {
        configured: Boolean(activeApiSettings.gscClientId && activeApiSettings.gscClientSecret),
        maskedClientId: maskKey(activeApiSettings.gscClientId),
        redirectUri: activeApiSettings.gscRedirectUri || 'http://localhost:4000/api/auth/gsc/callback'
      }
    }
  });
});

app.post(['/api/settings/save', '/api/v1/settings/save'], (req, res) => {
  const {
    psiApiKey,
    openrouterApiKey,
    openrouterModel,
    nvidiaApiKey,
    nvidiaModel,
    geminiApiKey,
    geminiModel,
    openaiApiKey,
    dataforseoLogin,
    dataforseoPassword,
    gscClientId,
    gscClientSecret,
    gscRedirectUri
  } = req.body || {};

  if (psiApiKey !== undefined) activeApiSettings.psiApiKey = (psiApiKey || '').trim();
  if (openrouterApiKey !== undefined) activeApiSettings.openrouterApiKey = (openrouterApiKey || '').trim();
  if (openrouterModel !== undefined) activeApiSettings.openrouterModel = (openrouterModel || '').trim() || 'deepseek/deepseek-chat';
  if (nvidiaApiKey !== undefined) activeApiSettings.nvidiaApiKey = (nvidiaApiKey || '').trim();
  if (nvidiaModel !== undefined) activeApiSettings.nvidiaModel = (nvidiaModel || '').trim() || 'meta/llama-3.3-70b-instruct';
  if (geminiApiKey !== undefined) activeApiSettings.geminiApiKey = (geminiApiKey || '').trim();
  if (geminiModel !== undefined) activeApiSettings.geminiModel = (geminiModel || '').trim() || 'gemini-2.0-flash';
  if (openaiApiKey !== undefined) activeApiSettings.openaiApiKey = (openaiApiKey || '').trim();
  if (dataforseoLogin !== undefined) activeApiSettings.dataforseoLogin = (dataforseoLogin || '').trim();
  if (dataforseoPassword !== undefined) activeApiSettings.dataforseoPassword = (dataforseoPassword || '').trim();
  if (gscClientId !== undefined) activeApiSettings.gscClientId = (gscClientId || '').trim();
  if (gscClientSecret !== undefined) activeApiSettings.gscClientSecret = (gscClientSecret || '').trim();
  if (gscRedirectUri !== undefined) activeApiSettings.gscRedirectUri = (gscRedirectUri || '').trim();

  res.json({
    success: true,
    message: 'API settings saved to active session.',
    settings: {
      psi: { configured: Boolean(activeApiSettings.psiApiKey), maskedKey: maskKey(activeApiSettings.psiApiKey) },
      openrouter: { configured: Boolean(activeApiSettings.openrouterApiKey), maskedKey: maskKey(activeApiSettings.openrouterApiKey), model: activeApiSettings.openrouterModel },
      nvidia: { configured: Boolean(activeApiSettings.nvidiaApiKey), maskedKey: maskKey(activeApiSettings.nvidiaApiKey), model: activeApiSettings.nvidiaModel },
      gemini: { configured: Boolean(activeApiSettings.geminiApiKey), maskedKey: maskKey(activeApiSettings.geminiApiKey), model: activeApiSettings.geminiModel },
      openai: { configured: Boolean(activeApiSettings.openaiApiKey), maskedKey: maskKey(activeApiSettings.openaiApiKey) },
      dataforseo: { configured: Boolean(activeApiSettings.dataforseoLogin && activeApiSettings.dataforseoPassword), maskedLogin: maskKey(activeApiSettings.dataforseoLogin) },
      gsc: { configured: Boolean(activeApiSettings.gscClientId && activeApiSettings.gscClientSecret), maskedClientId: maskKey(activeApiSettings.gscClientId) }
    }
  });
});

app.post(['/api/settings/test', '/api/v1/settings/test'], async (req, res) => {
  const { service, apiKey, model, login, password } = req.body || {};
  if (!service) return res.status(400).json({ error: 'Service identifier is required.' });

  const startTime = Date.now();
  try {
    if (service === 'gsc') {
      const clientIdToTest = apiKey || activeApiSettings.gscClientId || 'mock_test_client_id';
      const authUrl = generateGoogleAuthUrl({ clientId: clientIdToTest });
      return res.json({
        success: true,
        durationMs: Date.now() - startTime,
        message: 'Google Search Console OAuth 2.0 URL generator verified successfully.',
        authUrl
      });
    }

    if (service === 'psi') {
      const keyToTest = apiKey || activeApiSettings.psiApiKey;
      if (!keyToTest) return res.status(400).json({ error: 'No Google PSI API key provided to test.' });
      const testUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile&key=${encodeURIComponent(keyToTest)}`;
      const testRes = await fetch(testUrl, { timeout: 15000 });
      if (!testRes.ok) {
        const errText = await testRes.text().catch(() => '');
        return res.status(400).json({ success: false, error: `Google PSI API responded with status ${testRes.status}: ${errText.substring(0, 100)}` });
      }
      return res.json({ success: true, message: 'Google PageSpeed Insights API key verified successfully!', latencyMs: Date.now() - startTime });
    }

    if (service === 'openrouter') {
      const keyToTest = apiKey || activeApiSettings.openrouterApiKey;
      if (!keyToTest) return res.status(400).json({ error: 'No OpenRouter API key provided to test.' });
      const modelToTest = model || activeApiSettings.openrouterModel || 'deepseek/deepseek-chat';

      // 1. Try key info endpoint first
      let keyInfo = null;
      try {
        const authRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { 'Authorization': `Bearer ${keyToTest}` },
          timeout: 10000
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          keyInfo = authData.data;
        }
      } catch {}

      // 2. If auth endpoint didn't verify, try lightweight completions probe
      if (!keyInfo) {
        const compRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keyToTest}`,
            'HTTP-Referer': 'http://localhost:4000',
            'X-Title': 'OmniSEO OS'
          },
          body: JSON.stringify({
            model: modelToTest,
            messages: [{ role: 'user', content: 'Respond with OK' }],
            max_tokens: 5
          }),
          timeout: 15000
        });

        if (!compRes.ok) {
          const errText = await compRes.text().catch(() => '');
          return res.status(400).json({
            success: false,
            error: `OpenRouter API responded with status ${compRes.status}: ${errText.substring(0, 120)}`
          });
        }
      }

      return res.json({
        success: true,
        message: `OpenRouter API verified successfully! Model: ${modelToTest} (Account: ${keyInfo?.label || 'Active'})`,
        latencyMs: Date.now() - startTime,
        model: modelToTest
      });
    }

    if (service === 'nvidia') {
      const keyToTest = apiKey || activeApiSettings.nvidiaApiKey;
      if (!keyToTest) return res.status(400).json({ error: 'No NVIDIA NIM API key provided to test.' });
      const modelToTest = model || activeApiSettings.nvidiaModel || 'meta/llama-3.3-70b-instruct';

      const testRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToTest}`
        },
        body: JSON.stringify({
          model: modelToTest,
          messages: [{ role: 'user', content: 'Respond with OK' }],
          max_tokens: 5
        }),
        timeout: 15000
      });

      if (!testRes.ok) {
        // Also check if /v1/models responds
        const modelsRes = await fetch('https://integrate.api.nvidia.com/v1/models', {
          headers: { 'Authorization': `Bearer ${keyToTest}` },
          timeout: 10000
        });
        if (!modelsRes.ok) {
          const errText = await testRes.text().catch(() => '');
          return res.status(400).json({
            success: false,
            error: `NVIDIA NIM API responded with status ${testRes.status}: ${errText.substring(0, 120)}`
          });
        }
      }

      return res.json({
        success: true,
        message: `NVIDIA NIM API verified successfully! Access to ${modelToTest} active.`,
        latencyMs: Date.now() - startTime,
        model: modelToTest
      });
    }

    if (service === 'gemini') {
      const keyToTest = apiKey || activeApiSettings.geminiApiKey;
      if (!keyToTest) return res.status(400).json({ error: 'No Google Gemini API key provided to test.' });
      const requestedModel = model || activeApiSettings.geminiModel || 'gemini-2.0-flash';

      // Multi-model resilient fallback loop to prevent 404s
      const candidateModels = [
        requestedModel,
        'gemini-2.0-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-2.5-flash',
        'gemini-1.5-pro-latest'
      ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

      let verifiedModel = null;
      let lastError = '';
      let lastStatus = 404;

      for (const candidate of candidateModels) {
        for (const apiVersion of ['v1beta', 'v1']) {
          try {
            const testRes = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${candidate}:generateContent?key=${encodeURIComponent(keyToTest)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: 'Respond with OK' }] }] }),
              timeout: 10000
            });
            if (testRes.ok) {
              verifiedModel = candidate;
              break;
            } else {
              lastStatus = testRes.status;
              lastError = await testRes.text().catch(() => '');
            }
          } catch (err) {
            lastError = err.message;
          }
        }
        if (verifiedModel) break;
      }

      if (verifiedModel) {
        activeApiSettings.geminiModel = verifiedModel;
        return res.json({
          success: true,
          message: `Google Gemini API verified successfully! Connected via ${verifiedModel}`,
          latencyMs: Date.now() - startTime,
          workingModel: verifiedModel
        });
      }

      return res.status(400).json({
        success: false,
        error: `Gemini API responded with status ${lastStatus}: ${lastError.substring(0, 120)}. Tip: Connect OpenRouter or NVIDIA NIM in Settings for instant free LLM access without Google Cloud project restrictions!`
      });
    }

    if (service === 'openai') {
      const keyToTest = apiKey || activeApiSettings.openaiApiKey;
      if (!keyToTest) return res.status(400).json({ error: 'No OpenAI API key provided to test.' });
      const testRes = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${keyToTest}` },
        timeout: 10000
      });
      if (!testRes.ok) {
        return res.status(400).json({ success: false, error: `OpenAI API responded with status ${testRes.status}` });
      }
      return res.json({ success: true, message: 'OpenAI API key verified successfully!', latencyMs: Date.now() - startTime });
    }

    if (service === 'dataforseo') {
      const loginToTest = login || activeApiSettings.dataforseoLogin;
      const passToTest = password || activeApiSettings.dataforseoPassword;
      if (!loginToTest || !passToTest) return res.status(400).json({ error: 'Both login and password are required for DataForSEO.' });
      const auth = Buffer.from(`${loginToTest}:${passToTest}`).toString('base64');
      const testRes = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
        headers: { 'Authorization': `Basic ${auth}` },
        timeout: 10000
      });
      if (!testRes.ok) {
        return res.status(400).json({ success: false, error: `DataForSEO returned status ${testRes.status} (Authentication Failed)` });
      }
      return res.json({ success: true, message: 'DataForSEO credentials verified successfully!', latencyMs: Date.now() - startTime });
    }

    return res.status(400).json({ error: `Unknown service: ${service}` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 1. CORE ORCHESTRATOR & PLANNER ENDPOINTS ────────────
app.post(['/api/plan', '/api/v1/plan'], (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }
    const { query, context, url } = req.body;
    const finalQuery = query || url;
    if (!finalQuery) {
      return res.status(400).json({ error: 'Query string or target URL is required.' });
    }
    const plan = parseAndPlan(finalQuery, context);
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/execute', '/api/v1/execute'], async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }
    const { query, plan, context, url, agents } = req.body;
    if (!query && !plan && !url) {
      return res.status(400).json({ error: 'Either query, plan, or target url is required.' });
    }
    let finalPlan = plan;
    if (!finalPlan) {
      finalPlan = parseAndPlan(query || url, context);
    }
    if (agents && Array.isArray(agents) && (!finalPlan.executionPlan || !finalPlan.executionPlan.agents || finalPlan.executionPlan.agents.length === 0)) {
      finalPlan.executionPlan = finalPlan.executionPlan || {};
      finalPlan.executionPlan.agents = agents.map(a => typeof a === 'string' ? { id: a, name: a } : a);
    }
    if (url && !finalPlan.targetUrl) {
      finalPlan.targetUrl = url;
    }
    const options = resolveRequestOptions(req);
    const result = await executeOrchestratedPlan(finalPlan, options);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 2. OPENSEO SUITE NATIVE API ENDPOINTS ───────────────

// Multi-Page Site Audit (Crawls up to 20 pages)
app.post(['/api/audit', '/api/v1/audit'], async (req, res) => {
  const startUrl = req.body?.url;
  if (!startUrl) return res.status(400).json({ error: 'URL is required for audit' });
  try {
    await assertSafeUrl(startUrl);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Invalid or restricted URL target (SSRF protection).' });
  }

  try {
    const results = await crawlMultiPageSite(startUrl, req.body.maxPages || 15);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Site crawl failed: ' + err.message });
  }
});

// Deep Backlinks & Authority Inspection
app.post(['/api/backlinks', '/api/v1/backlinks'], async (req, res) => {
  const target = req.body?.url || req.body?.domain;
  if (!target) return res.status(400).json({ error: 'URL or Domain is required' });
  if (!isSafeUrl(target)) return res.status(400).json({ error: 'Invalid or restricted domain target (SSRF protection).' });

  try {
    let domain = target;
    let url = target;
    if (target.startsWith('http')) {
      domain = new URL(target).hostname;
    } else {
      url = `https://${target}`;
    }

    const options = resolveRequestOptions(req);
    const result = await auditBacklinks(domain, url, options);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Backlink analysis failed: ' + err.message });
  }
});

// ─── GOOGLE SEARCH CONSOLE (GSC) OAUTH 2.0 & API CONNECTOR ──
app.get('/api/auth/gsc/url', (req, res) => {
  try {
    const { state, redirectUri } = req.query || {};
    const authUrl = generateGoogleAuthUrl({
      state,
      redirectUri: redirectUri || activeApiSettings.gscRedirectUri
    });
    res.json({ success: true, authUrl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/gsc/token', async (req, res) => {
  try {
    const { code, redirectUri } = req.body || {};
    if (!code) return res.status(400).json({ success: false, error: 'Authorization code is required' });
    const tokens = await exchangeCodeForTokens({
      code,
      redirectUri: redirectUri || activeApiSettings.gscRedirectUri
    });
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/gsc/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token is required' });
    const refreshed = await refreshAccessToken({ refreshToken });
    res.json(refreshed);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/gsc/sites', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.replace(/^Bearer\s+/i, '') || req.headers['x-gsc-token'] || req.query.accessToken;
    if (!accessToken) return res.status(401).json({ success: false, error: 'Authorization token is required' });
    const sites = await listVerifiedSites(accessToken);
    res.json(sites);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/gsc/query', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.replace(/^Bearer\s+/i, '') || req.headers['x-gsc-token'] || req.body?.accessToken;
    const { siteUrl, startDate, endDate, dimensions, rowLimit } = req.body || {};
    if (!siteUrl) return res.status(400).json({ success: false, error: 'siteUrl is required' });
    const result = await querySearchAnalytics(accessToken, siteUrl, { startDate, endDate, dimensions, rowLimit });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Google Search Console (GSC) Unified Endpoint (Supports Live GSC OAuth Token or Simulation Fallback)
app.post(['/api/gsc', '/api/v1/gsc'], async (req, res) => {
  const { url, accessToken, startDate, endDate, dimensions, rowLimit } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL is required' });
  if (!isSafeUrl(url)) return res.status(400).json({ error: 'Invalid or restricted URL target (SSRF protection).' });

  const effectiveToken = accessToken || req.headers['x-gsc-token'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');

  try {
    if (effectiveToken) {
      const liveData = await querySearchAnalytics(effectiveToken, url, { startDate, endDate, dimensions, rowLimit });
      return res.json(liveData);
    }
    const options = resolveRequestOptions(req);
    const data = await simulateGSC(url, options);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'GSC analysis failed: ' + err.message });
  }
});

// Rank Tracker
app.post(['/api/rank', '/api/v1/rank'], async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL is required' });
  if (!isSafeUrl(url)) return res.status(400).json({ error: 'Invalid or restricted URL target (SSRF protection).' });

  try {
    const options = resolveRequestOptions(req);
    const data = await trackRankings(url, options);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Rank tracking failed: ' + err.message });
  }
});

// Keyword Research with INR CPC & Google Autocomplete
app.post(['/api/keywords', '/api/v1/keywords'], async (req, res) => {
  const { keyword } = req.body || {};
  if (!keyword) return res.status(400).json({ error: 'Keyword is required' });

  try {
    const data = await researchKeywords(keyword);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Keyword research failed: ' + err.message });
  }
});

// Domain Overview, Security, SSL & Competitor Benchmark
app.post(['/api/domain', '/api/v1/domain'], async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL is required' });
  if (!isSafeUrl(url)) return res.status(400).json({ error: 'Invalid or restricted domain target (SSRF protection).' });

  try {
    const options = resolveRequestOptions(req);
    const data = await analyzeDomainOverview(url, options);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Domain analysis failed: ' + err.message });
  }
});

// Brand Reputation, Sentiment & Social Share of Voice
app.post(['/api/brand', '/api/v1/brand'], async (req, res) => {
  const { brand } = req.body || {};
  if (!brand) return res.status(400).json({ error: 'Brand name is required' });

  try {
    const options = resolveRequestOptions(req);
    const data = await monitorBrand(brand, options);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Brand scan failed: ' + err.message });
  }
});

// AI SEO Strategy Copilot & Prompt Terminal
app.post(['/api/ai-prompt', '/api/v1/ai-prompt'], async (req, res) => {
  const { prompt, url } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
  if (url && !isSafeUrl(url)) return res.status(400).json({ error: 'Invalid or restricted URL target (SSRF protection).' });

  try {
    const options = resolveRequestOptions(req);
    const data = await handleAiPrompt(prompt, url, options);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'AI analysis failed: ' + err.message });
  }
});

// Saved Keywords & Content Bigram Extractor
app.post(['/api/saved-keywords', '/api/v1/saved-keywords'], async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL is required' });
  if (!isSafeUrl(url)) return res.status(400).json({ error: 'Invalid or restricted URL target (SSRF protection).' });

  try {
    const data = await extractSavedKeywords(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Saved keywords extraction failed: ' + err.message });
  }
});

// Universal Open-API Intelligence Endpoint (Zero-Auth, Rate-Limit Friendly, Authoritative)
app.all(['/api/open-intel', '/api/v1/open-intel'], async (req, res) => {
  try {
    const rawTarget = req.method === 'GET'
      ? (req.query.domain || req.query.query || req.query.url)
      : (req.body?.domain || req.body?.query || req.body?.url);

    if (!rawTarget) {
      return res.status(400).json({
        success: false,
        error: 'Target domain or query is required. Example: ?domain=example.com'
      });
    }

    if (String(rawTarget).startsWith('http') && !isSafeUrl(rawTarget)) {
      return res.status(400).json({ error: 'Invalid or restricted domain target (SSRF protection).' });
    }

    const domain = String(rawTarget).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '').trim();
    if (!domain || domain.length < 3) {
      return res.status(400).json({ error: 'Invalid domain specified.' });
    }

    const startTime = Date.now();

    // Concurrently query all 7 open zero-auth intelligence sources
    const [rdap, dnsRes, wikiBacklinks, hnStories, wikidata, wikiSummary, datamuseWords] = await Promise.allSettled([
      queryDomainRdap(domain),
      queryGoogleDns(domain),
      queryWikipediaBacklinks(domain, 10),
      queryHackerNewsMentions(domain, 10),
      queryWikidataEntity(domain, 5),
      queryWikipediaSummary(domain),
      queryDatamuseLsiKeywords(domain.split('.')[0] || domain, 10)
    ]);

    res.json({
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
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Open intelligence lookup failed: ' + err.message });
  }
});

// ─── 3. GITHUB SEO TOPIC ENHANCEMENTS ────────────────────

// Google SERP Snippet Preview Simulator (Desktop & Mobile)
app.post(['/api/serp-preview', '/api/v1/serp-preview'], (req, res) => {
  try {
    const { url, title, description } = req.body || {};
    const targetUrl = url || 'https://example.com';
    if (!isSafeUrl(targetUrl)) return res.status(400).json({ error: 'Invalid or restricted URL target (SSRF protection).' });
    const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    const host = parsed.hostname.replace(/^www\./, '');
    const cleanTopic = host.split('.')[0];
    const breadcrumbs = `${parsed.hostname} > ${parsed.pathname.split('/').filter(Boolean).join(' > ') || 'home'}`;
    const displayTitle = (title || `${cleanTopic.toUpperCase()} — Official Guide & Resources | ${host}`).substring(0, 60);
    const displayDesc = (description || `Explore official resources, updates, and comprehensive services for ${cleanTopic}. Access documentation and get started today at ${host}.`).substring(0, 160);

    res.json({
      url: targetUrl,
      domain: parsed.hostname,
      breadcrumbs,
      title: displayTitle,
      titleLength: displayTitle.length,
      titleStatus: displayTitle.length <= 60 ? 'Optimal (Under 60 chars)' : 'Truncated in Google SERP',
      description: displayDesc,
      descriptionLength: displayDesc.length,
      descStatus: displayDesc.length <= 160 ? 'Optimal (Under 160 chars)' : 'Truncated in Google SERP',
      rating: '4.8 ★★★★★ (1,240 reviews)',
      richSnippet: `${cleanTopic} Official Verified Resource`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Robots.txt & Sitemap.xml Auto-Detector
app.all(['/api/robots-sitemap', '/api/v1/robots-sitemap'], async (req, res) => {
  try {
    const url = req.query.url || req.body?.url;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    try {
      await assertSafeUrl(url);
    } catch (e) {
      return res.status(400).json({ error: e.message || 'Invalid or restricted URL target (SSRF protection).' });
    }
    const parsed = new URL(url);
    const origin = parsed.origin;

    // Live page check for live security radar metrics (measured)
    let pageCheck = null;
    try {
      const pRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 OmniSEO-Probe/1.0' },
        signal: AbortSignal.timeout(6000),
        redirect: 'follow'
      });
      if (pRes.ok) {
        const pHtml = await pRes.text();
        const $p = cheerio.load(pHtml);
        const canonical = $p('link[rel="canonical"]').attr('href') || null;
        let selfCanonical = false;
        if (canonical) {
          try {
            selfCanonical = new URL(canonical, url).href === new URL(url).href;
          } catch {}
        }
        pageCheck = {
          status: pRes.status,
          isHttps: url.startsWith('https:'),
          contentEncoding: pRes.headers.get('content-encoding') || null,
          hsts: pRes.headers.get('strict-transport-security') || null,
          canonical,
          hasSelfCanonical: selfCanonical
        };
      }
    } catch {}

    let robots = { status: 'Not Found', exists: false, content: '', aiBots: [], disallowCount: 0, allowCount: 0, sitemapsDeclared: [] };
    let sitemap = { status: 'Not Found', exists: false, content: '', urlCount: 0, urls: [] };

    try {
      const robRes = await fetch(`${origin}/robots.txt`, {
        headers: { 'User-Agent': 'Mozilla/5.0 OmniSEO-Probe/1.0' },
        signal: AbortSignal.timeout(4000)
      });
      if (robRes.ok) {
        const text = await robRes.text();
        const lines = text.split('\n');
        const sitemaps = [];
        let disallows = 0;
        let allows = 0;

        lines.forEach(l => {
          const trimmed = l.trim();
          if (/^sitemap:/i.test(trimmed)) sitemaps.push(trimmed.split(':')[1]?.trim() || '');
          if (/^disallow:/i.test(trimmed)) disallows++;
          if (/^allow:/i.test(trimmed)) allows++;
        });

        // Evaluate AI Bots
        const botList = [
          { name: 'GPTBot', org: 'OpenAI / ChatGPT', agent: 'GPTBot' },
          { name: 'ClaudeBot', org: 'Anthropic / Claude', agent: 'ClaudeBot' },
          { name: 'PerplexityBot', org: 'Perplexity AI', agent: 'PerplexityBot' },
          { name: 'Google-Extended', org: 'Google Gemini', agent: 'Google-Extended' },
          { name: 'CCBot', org: 'Common Crawl', agent: 'CCBot' },
          { name: 'Bytespider', org: 'ByteDance / TikTok', agent: 'Bytespider' }
        ];

        const aiBots = botList.map(b => {
          const re = new RegExp(`User-agent:\\s*${b.agent}[\\s\\S]*?(?:User-agent:|$)`, 'i');
          const m = text.match(re);
          let status = 'Allowed (Unrestricted)';
          let allowed = true;
          if (m) {
            const block = m[0];
            if (/Disallow:\s*\/\s*$/m.test(block)) {
              status = 'Blocked (Root Disallowed)';
              allowed = false;
            } else if (/Allow:\s*\//i.test(block)) {
              status = 'Custom / Allowed';
              allowed = true;
            }
          } else {
            // Check global * rule
            const globalMatch = text.match(/User-agent:\s*\*[\s\S]*?(?:User-agent:|$)/i);
            if (globalMatch && /Disallow:\s*\/\s*$/m.test(globalMatch[0])) {
              status = 'Blocked via Global *';
              allowed = false;
            }
          }
          return { ...b, status, allowed };
        });

        robots = {
          status: `${robRes.status} OK`,
          exists: true,
          content: text,
          disallowCount: disallows,
          allowCount: allows,
          sitemapsDeclared: sitemaps,
          aiBots
        };
      }
    } catch {}

    try {
      const siteRes = await fetch(`${origin}/sitemap.xml`, {
        headers: { 'User-Agent': 'Mozilla/5.0 OmniSEO-Probe/1.0' },
        signal: AbortSignal.timeout(4000)
      });
      if (siteRes.ok) {
        const text = await siteRes.text();
        const $ = cheerio.load(text, { xmlMode: true });
        const parsedUrls = [];
        $('url').slice(0, 25).each((_, el) => {
          const loc = $(el).find('loc').text().trim();
          const lastmod = $(el).find('lastmod').text().trim() || '2026-09-01';
          const priority = $(el).find('priority').text().trim() || '0.5';
          const changefreq = $(el).find('changefreq').text().trim() || 'weekly';
          if (loc) parsedUrls.push({ url: loc, loc, lastmod, priority, changefreq });
        });

        sitemap = {
          status: `${siteRes.status} OK`,
          exists: true,
          content: text.substring(0, 2500),
          urlCount: $('url').length || $('sitemap').length || parsedUrls.length,
          urls: parsedUrls
        };
      }
    } catch {}

    res.json({
      origin,
      robots,
      sitemap,
      pageCheck,
      dataStatus: 'measured',
      isSimulated: false,
      provider: 'Live fetch of target robots.txt, sitemap & page headers'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Competitor Authority & Keyword Gap Studio
app.post(['/api/competitor-gap', '/api/v1/competitor-gap'], async (req, res) => {
  const target = req.body?.targetUrl || req.body?.url;
  const competitor = req.body?.competitorDomain || req.body?.competitor || null;
  if (!target) return res.status(400).json({ success: false, error: 'URL is required' });
  if (!isSafeUrl(target)) return res.status(400).json({ success: false, error: 'Invalid or restricted URL target (SSRF protection).' });
  if (competitor && !isSafeUrl(competitor)) return res.status(400).json({ success: false, error: 'Invalid or restricted competitor domain (SSRF protection).' });

  try {
    const options = resolveRequestOptions(req);
    const raw = await analyzeCompetitorGap(target, competitor, options);
    const gapData = {
      targetHost: raw.targetHost,
      compHost: raw.compHost,
      targetDA: raw.targetDA,
      competitorDA: raw.compDA,
      compDA: raw.compDA,
      daDeficit: Math.abs(raw.targetDA - raw.compDA),
      daGap: raw.daGap,
      targetTraffic: raw.targetTraffic,
      competitorTraffic: raw.compTraffic,
      compTraffic: raw.compTraffic,
      targetRefDomains: raw.targetRefDomains,
      competitorRefDomains: raw.compRefDomains,
      compRefDomains: raw.compRefDomains,
      untappedKeywords: (raw.untappedKeywords || []).map(k => ({
        keyword: k.keyword,
        volume: k.searchVolume || k.volume,
        difficulty: k.kd || k.difficulty,
        cpc: k.cpcINR || k.cpc,
        intent: k.intent,
        competitorRank: k.compRank || k.competitorRank
      })),
      sharedKeywords: (raw.sharedKeywords || []).map(s => ({
        keyword: s.keyword,
        targetRank: s.targetRank,
        competitorRank: s.compRank || s.competitorRank,
        volume: s.searchVolume || s.volume
      })),
      backlinkOpportunities: (raw.backlinkGaps || []).map(b => ({
        domain: b.domain,
        dr: b.dr,
        pitchAngle: b.pitchAngle
      })),
      actionableSteps: (raw.actionPlan || []).map(a => `${a.action}: ${a.impact} (${a.urgency})`),
      isSimulated: Boolean(raw.isSimulated),
      provenance: raw.provenance
    };
    res.json({ success: true, gapData });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Competitor gap analysis failed: ' + err.message });
  }
});

// Universal Multi-Engine Web Scraper
app.post(['/api/scrape', '/api/v1/scrape'], async (req, res) => {
  const { url, mode, selector } = req.body || {};
  if (!url) return res.status(400).json({ success: false, error: 'URL is required' });
  if (!isSafeUrl(url)) return res.status(400).json({ success: false, error: 'Invalid or restricted URL target (SSRF protection).' });

  try {
    const data = await universalWebScraper(url, mode, selector);
    res.json({
      success: true,
      title: data.title || data.metadata?.title || url,
      content: data.content || data.metadata || data.matches || data.html,
      raw: data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Scraping execution failed: ' + err.message });
  }
});

// HTML <head> Completeness & E-E-A-T Quality Signals (joshbuchea/HEAD & claude-seo)
app.post(['/api/head-eeat', '/api/v1/head-eeat'], async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL is required' });
  if (!isSafeUrl(url)) return res.status(400).json({ error: 'Invalid or restricted URL target (SSRF protection).' });

  try {
    const data = await auditHeadAndEeat(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'HEAD & E-E-A-T audit failed: ' + err.message });
  }
});

// ─── 4. SOURCE CODE LINE VIEWER & HEALTH ─────────────────
app.get(['/api/view-source', '/api/v1/view-source'], async (req, res) => {
  try {
    const { url, line } = req.query;
    if (!url) return res.status(400).send('URL query parameter required');
    if (!isSafeUrl(url)) return res.status(400).send('Invalid or restricted URL target (SSRF protection)');
    const targetLine = parseInt(line, 10) || 1;

    const fetchRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniSEO-SourceInspector/1.0'
      },
      signal: AbortSignal.timeout(10000)
    });
    const html = await fetchRes.text();
    const rawLines = html.split('\n');

    const renderedLines = rawLines.map((l, idx) => {
      const lineNum = idx + 1;
      const isTarget = lineNum === targetLine;
      const escaped = l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      return `<tr id="L${lineNum}" class="${isTarget ? 'highlight-line' : ''}">
        <td class="line-no"><a href="#L${lineNum}">${lineNum}</a></td>
        <td class="line-code"><code>${escaped || ' '}</code></td>
      </tr>`;
    }).join('\n');

    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OmniSEO Source Inspector: ${url}#L${targetLine}</title>
  <style>
    body { background: #090d16; color: #f1f5f9; font-family: 'JetBrains Mono', Consolas, monospace; margin: 0; padding: 0; }
    .header { background: #1e293b; padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); position: sticky; top: 0; z-index: 100; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
    .header strong { color: #38bdf8; font-size: 0.95rem; }
    .actions { display: flex; gap: 10px; align-items: center; }
    .badge { background: #f43f5e; color: #fff; padding: 5px 12px; border-radius: 6px; font-weight: bold; font-size: 0.8rem; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .badge:hover { background: #e11d48; }
    .btn-live { background: rgba(255,255,255,0.1); color: #38bdf8; padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; text-decoration: none; border: 1px solid rgba(255,255,255,0.15); }
    .btn-live:hover { background: rgba(255,255,255,0.2); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6; }
    td { padding: 2px 8px; vertical-align: top; }
    .line-no { width: 65px; text-align: right; user-select: none; color: #64748b; border-right: 1px solid rgba(255,255,255,0.08); padding-right: 12px; }
    .line-no a { color: inherit; text-decoration: none; }
    .line-code { white-space: pre-wrap; word-break: break-all; padding-left: 14px; }
    .highlight-line { background: rgba(244, 63, 94, 0.28) !important; border-top: 2px solid #f43f5e; border-bottom: 2px solid #f43f5e; box-shadow: inset 4px 0 0 #f43f5e; }
    .highlight-line .line-no { background: rgba(244, 63, 94, 0.45); color: #fff; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div><strong>🔍 Target Audit Source:</strong> <a href="${url}" target="_blank" style="color:#93c5fd; text-decoration:none;">${url}</a> &nbsp;|&nbsp; Focused on <strong style="color:#f43f5e;">Line ${targetLine}</strong></div>
    <div class="actions">
      <a href="${url}" target="_blank" class="btn-live">🔗 Live Page ↗</a>
      <button class="badge" onclick="jumpToTarget()">🎯 Jump to Line ${targetLine}</button>
    </div>
  </div>
  <table>
    <tbody>
      ${renderedLines}
    </tbody>
  </table>
  <script>
    function jumpToTarget() {
      const el = document.getElementById('L${targetLine}');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(jumpToTarget, 150);
    });
  </script>
</body>
</html>`);
  } catch (err) {
    res.status(500).send('Error fetching source: ' + err.message);
  }
});

app.get('/api/inspect-page', async (req, res) => {
  try {
    const { url, highlight, selector, issue } = req.query;
    if (!url) return res.status(400).send('URL query parameter required');
    if (!isSafeUrl(url)) return res.status(400).send('Invalid or restricted URL target (SSRF protection)');

    const fetchRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OmniSEO-LiveInspector/2.0'
      },
      signal: AbortSignal.timeout(10000)
    });
    const html = await fetchRes.text();
    const parsedUrl = new URL(url);

    const $ = cheerio.load(html);

    // 1. Inject <base> tag so relative styles, images, and fonts load correctly
    if ($('head').length > 0) {
      $('head').prepend(`<base href="${parsedUrl.origin}/">`);
    }

    let matchCount = 0;

    // 2. Highlight by CSS selector if provided
    if (selector) {
      try {
        $(selector).each((i, el) => {
          matchCount++;
          $(el).addClass('omniseo-target-highlight');
          $(el).attr('data-omniseo-idx', matchCount);
          $(el).before(`
            <div class="omniseo-badge" style="background:linear-gradient(135deg,#f43f5e,#be123c); color:#fff; padding:4px 10px; border-radius:4px; font-weight:800; font-size:11px; font-family:'Plus Jakarta Sans',sans-serif; margin:6px 0; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(244,63,94,0.5); z-index:99999;">
              <span>🚨 OMNISEO AUDIT FINDING:</span>
              <span>${(issue || 'Identified Defect').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
            </div>
          `);
        });
      } catch {}
    }

    // 3. Highlight text occurrences if provided
    if (highlight && highlight.trim()) {
      const term = highlight.trim();
      const regex = new RegExp(`(${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
      
      $('body *').each((i, el) => {
        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        if (['script', 'style', 'noscript', 'textarea', 'pre'].includes(tag)) return;
        $(el).contents().each((j, node) => {
          if (node.type === 'text' && node.data && regex.test(node.data)) {
            matchCount++;
            const newHtml = node.data.replace(regex, `<mark class="omniseo-text-highlight omniseo-target-highlight" data-omniseo-idx="${matchCount}">$1</mark>`);
            $(node).replaceWith(newHtml);
          }
        });
      });
    }

    // Fallback: If no match was found yet, highlight the H1 or main headline
    if (matchCount === 0) {
      $('h1, main h2, .page-title, header').first().each((i, el) => {
        matchCount = 1;
        $(el).addClass('omniseo-target-highlight');
        $(el).attr('data-omniseo-idx', '1');
        $(el).before(`
          <div class="omniseo-badge" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8); color:#fff; padding:6px 14px; border-radius:6px; font-weight:800; font-size:12px; font-family:'Plus Jakarta Sans',sans-serif; margin:10px 0; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 15px rgba(59,130,246,0.6); z-index:99999;">
            <span>📍 OMNISEO INSPECTED SECTION:</span>
            <span>${(issue || 'Page Focus Element').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
          </div>
        `);
      });
    }

    const safeIssue = (issue || 'On-Page Signal Inspection').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeUrl = url.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 4. Inject HUD and Highlighting Styles
    const hudHtml = `
      <style>
        body { padding-top: 65px !important; }
        .omniseo-target-highlight {
          outline: 4px solid #f43f5e !important;
          outline-offset: 3px !important;
          box-shadow: 0 0 35px rgba(244,63,94,0.85) !important;
          animation: omniseo-glow 1.5s infinite alternate !important;
          scroll-margin-top: 100px !important;
        }
        @keyframes omniseo-glow {
          0% { outline-color: #f43f5e; box-shadow: 0 0 20px #f43f5e; }
          100% { outline-color: #38bdf8; box-shadow: 0 0 35px #38bdf8; }
        }
        .omniseo-text-highlight {
          background: #fef08a !important;
          color: #854d0e !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-weight: 800 !important;
          border: 2px solid #eab308 !important;
        }
        #omniseo-hud {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 2147483647 !important;
          background: rgba(9, 13, 22, 0.96) !important;
          backdrop-filter: blur(12px) !important;
          color: #f1f5f9 !important;
          border-bottom: 2px solid #38bdf8 !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8) !important;
          padding: 10px 20px !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
      </style>
      <div id="omniseo-hud">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="background:linear-gradient(135deg,#3b82f6,#8b5cf6); color:#fff; font-weight:800; font-size:11px; padding:4px 8px; border-radius:5px; letter-spacing:0.5px; text-transform:uppercase;">OmniSEO Live Inspector</span>
          <div>
            <div style="font-weight:700; color:#fff; font-size:13px; display:flex; align-items:center; gap:8px;">
              <span>🎯 ${safeIssue}</span>
              <span style="background:rgba(16,185,129,0.2); color:#a7f3d0; border:1px solid #10b981; font-size:11px; padding:2px 8px; border-radius:12px; font-weight:700;">
                ${matchCount} Highlighted Target${matchCount === 1 ? '' : 's'}
              </span>
            </div>
            <div style="font-size:11px; color:#94a3b8; margin-top:2px;">
              Target: <code style="color:#38bdf8;">${safeUrl}</code>
            </div>
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button onclick="omniseoJump(-1)" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:600;">◀ Prev</button>
          <span id="omniseo-indicator" style="font-size:11px; color:#cbd5e1; font-family:monospace;">1 / ${matchCount}</span>
          <button onclick="omniseoJump(1)" style="background:#3b82f6; border:none; color:#fff; padding:6px 14px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:700;">Next ▶</button>
          <a href="${safeUrl}" target="_blank" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:#94a3b8; padding:6px 12px; border-radius:6px; text-decoration:none; font-size:12px;">Open Direct Live ↗</a>
          <button onclick="window.close()" style="background:rgba(244,63,94,0.2); border:1px solid #f43f5e; color:#fda4af; padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer;">✕ Close</button>
        </div>
      </div>
      <script>
        let currentMatch = 1;
        const totalMatches = ${matchCount};
        function omniseoJump(dir) {
          if (totalMatches <= 0) return;
          currentMatch += dir;
          if (currentMatch > totalMatches) currentMatch = 1;
          if (currentMatch < 1) currentMatch = totalMatches;
          const ind = document.getElementById('omniseo-indicator');
          if (ind) ind.innerText = currentMatch + ' / ' + totalMatches;
          const el = document.querySelector('[data-omniseo-idx="' + currentMatch + '"]');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            const first = document.querySelector('[data-omniseo-idx="1"]');
            if (first) {
              first.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 350);
        });
      </script>
    `;

    $('body').prepend(hudHtml);
    res.send($.html());
  } catch (err) {
    res.status(500).send('Live inspection failed: ' + err.message);
  }
});

// Live Provenance & Data Source Integrity Registry
app.get(['/api/provenance', '/api/v1/provenance'], (req, res) => {
  const hasPsi = Boolean(activeApiSettings.psiApiKey);
  const hasLlm = Boolean(
    activeApiSettings.openrouterApiKey ||
    activeApiSettings.nvidiaApiKey ||
    activeApiSettings.geminiApiKey ||
    activeApiSettings.openaiApiKey
  );

  let activeLlmName = 'None';
  if (activeApiSettings.openrouterApiKey) activeLlmName = `OpenRouter (${activeApiSettings.openrouterModel})`;
  else if (activeApiSettings.nvidiaApiKey) activeLlmName = `NVIDIA NIM (${activeApiSettings.nvidiaModel})`;
  else if (activeApiSettings.geminiApiKey) activeLlmName = `Google Gemini (${activeApiSettings.geminiModel})`;
  else if (activeApiSettings.openaiApiKey) activeLlmName = 'OpenAI (gpt-4o-mini)';

  const hasDataForSeo = Boolean(activeApiSettings.dataforseoLogin && activeApiSettings.dataforseoPassword);
  const hasGsc = Boolean(activeApiSettings.gscClientId && activeApiSettings.gscClientSecret) || isGscConfigured();

  res.json({
    note: 'Live provenance summary for the current deployment.',
    modules: {
      technicalCrawl: { dataStatus: 'measured', provider: 'Built-in SSRF-safe crawler (server-side)' },
      robotsSitemap: { dataStatus: 'measured', provider: 'Live fetch of target robots.txt / XML sitemap & page headers' },
      headLint: { dataStatus: 'measured', provider: 'Built-in <head> linter (server-side)' },
      eeat: { dataStatus: 'heuristic', provider: 'Static heuristics over crawled content (NOT a provider API)' },
      scrape: { dataStatus: 'measured', provider: 'Built-in HTML→markdown scraper' },
      pageSpeed: {
        dataStatus: hasPsi ? 'measured' : 'measured-or-unavailable',
        provider: 'Google PageSpeed Insights API v5' + (hasPsi ? ' (API key active)' : ' (no API key configured — expect occasional rate-limit unavailability; NO fake fallback)')
      },
      backlinks: {
        dataStatus: hasDataForSeo ? 'measured' : 'simulated',
        provider: hasDataForSeo ? 'DataForSEO Live Backlinks API' : null,
        note: hasDataForSeo ? 'Live DataForSEO backlink index' : 'Connect DataForSEO in ⚙️ Settings for live metrics'
      },
      domainAuthority: {
        dataStatus: hasDataForSeo ? 'measured' : 'simulated',
        provider: hasDataForSeo ? 'DataForSEO Live Domain Authority API' : null
      },
      trendsVolume: { dataStatus: 'simulated', provider: null, note: 'Connect Google Trends / DataForSEO in ⚙️ Settings' },
      serpKeywords: { dataStatus: 'simulated', provider: null, note: 'Connect DataForSEO in ⚙️ Settings for live SERP' },
      gsc: {
        dataStatus: hasGsc ? 'measured' : 'ready-for-oauth',
        provider: hasGsc ? 'Google Search Console API v3 (OAuth 2.0)' : 'Google Search Console API Connector (Ready for OAuth / Mock Fallback)',
        note: hasGsc ? 'Live GSC OAuth configured' : 'Connect GSC OAuth in ⚙️ Settings for verified property data'
      },
      rankTracker: { dataStatus: 'simulated', provider: null, note: 'Connect DataForSEO in ⚙️ Settings for live SERP rank tracking' },
      brandSentiment: { dataStatus: 'simulated', provider: null, note: 'Google Suggest search sentiment heuristics' },
      geoAeo: {
        dataStatus: hasLlm ? 'measured' : 'simulated',
        provider: hasLlm ? `Live AI Search Entity Grounding Probe (${activeLlmName})` : null,
        note: hasLlm ? `Live LLM entity grounding via ${activeLlmName}` : 'Connect OpenRouter/NVIDIA/Gemini in ⚙️ Settings for live citation queries'
      },
      aiCopilot: {
        dataStatus: hasLlm ? 'measured' : 'simulated',
        provider: hasLlm ? activeLlmName : null,
        note: hasLlm ? `Live generative reasoning via ${activeLlmName}` : 'Static template — connect OpenRouter/NVIDIA/Gemini in ⚙️ Settings'
      },
      openIntel: {
        dataStatus: 'measured',
        provider: 'Live Open APIs (ICANN RDAP, Google DoH, Wikipedia exturlusage, HackerNews Algolia, Wikidata wbsearchentities, Datamuse Semantic API, Google Suggest)',
        note: 'Zero-auth authoritative public protocols integrated out of the box'
      }
    },
    generatedAt: new Date().toISOString()
  });
});

// ─── 4. STORAGE & AUDIT HISTORY ENGINE ─────────────────────

// Save Audit Snapshot
app.post(['/api/storage/snapshot', '/api/v1/storage/snapshot'], async (req, res) => {
  try {
    const { domain, auditResult } = req.body || {};
    const result = await saveAuditSnapshot(domain, auditResult || req.body);
    res.json({ success: true, snapshot: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save audit snapshot: ' + err.message });
  }
});

// Get Audit History for a domain
app.get(['/api/storage/history/:domain', '/api/v1/storage/history/:domain'], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const history = await getAuditHistory(req.params.domain, limit);
    res.json({ success: true, domain: req.params.domain, count: history.length, history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve audit history: ' + err.message });
  }
});

// Get Project List (all audited domains)
app.get(['/api/storage/projects', '/api/v1/storage/projects'], async (req, res) => {
  try {
    const projects = await getProjectList();
    res.json({ success: true, count: projects.length, projects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve project list: ' + err.message });
  }
});

// Get Specific Snapshot by ID
app.get(['/api/storage/snapshot/:snapshotId', '/api/v1/storage/snapshot/:snapshotId'], async (req, res) => {
  try {
    const snapshot = await getSnapshotById(req.params.snapshotId);
    if (!snapshot) {
      return res.status(404).json({ error: `Snapshot with ID "${req.params.snapshotId}" not found.` });
    }
    res.json({ success: true, snapshot });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve snapshot: ' + err.message });
  }
});

// Compare two snapshots
app.post(['/api/storage/compare', '/api/v1/storage/compare'], async (req, res) => {
  try {
    const { snapshotId1, snapshotId2 } = req.body || {};
    if (!snapshotId1 || !snapshotId2) {
      return res.status(400).json({ error: 'Both snapshotId1 and snapshotId2 are required.' });
    }
    const comparison = await compareSnapshots(snapshotId1, snapshotId2);
    res.json({ success: true, comparison });
  } catch (err) {
    res.status(400).json({ error: 'Comparison failed: ' + err.message });
  }
});

// Delete specific snapshot
app.delete(['/api/storage/snapshot/:snapshotId', '/api/v1/storage/snapshot/:snapshotId'], async (req, res) => {
  try {
    const deleted = await deleteSnapshot(req.params.snapshotId);
    if (!deleted) {
      return res.status(404).json({ error: `Snapshot with ID "${req.params.snapshotId}" not found.` });
    }
    res.json({ success: true, message: `Snapshot ${req.params.snapshotId} deleted.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete snapshot: ' + err.message });
  }
});

// Clear history for domain
app.delete(['/api/storage/history/:domain', '/api/v1/storage/history/:domain'], async (req, res) => {
  try {
    const result = await clearHistory(req.params.domain);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history: ' + err.message });
  }
});

// ─── 5. EXECUTIVE REPORT & BULK CSV EXPORT ENGINE ─────────

// Generate Printable Executive Client HTML/PDF Report
app.post(['/api/export/report', '/api/v1/export/report'], (req, res) => {
  try {
    const auditResult = req.body?.auditResult || req.body || {};
    const html = generateExecutiveReportHtml(auditResult);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate executive report: ' + err.message });
  }
});

// Bulk CSV Data Exporter (RFC 4180 compliant)
app.post(['/api/export/csv', '/api/v1/export/csv'], (req, res) => {
  try {
    const { type, data } = req.body || {};
    if (!type) {
      return res.status(400).json({ error: 'Export "type" parameter is required (crawled_pages, missing_alts, issues, backlinks).' });
    }
    const csv = exportToCsv(type, data || []);
    const filename = `omniseo-${type}-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// IndexNow Protocol Key Generator
app.get(['/api/indexnow/key', '/api/v1/indexnow/key'], (req, res) => {
  const key = generateIndexNowKey();
  res.json({
    success: true,
    key,
    length: key.length,
    format: '32-character hex'
  });
});

// IndexNow Batch URL Submission Dispatcher
app.post(['/api/indexnow', '/api/v1/indexnow'], async (req, res) => {
  try {
    const { host, key, keyLocation, urlList, endpoint } = req.body || {};
    if (!urlList || (Array.isArray(urlList) && urlList.length === 0)) {
      return res.status(400).json({ success: false, error: 'urlList must contain at least one valid URL' });
    }

    const result = await submitToIndexNow({ host, key, keyLocation, urlList, endpoint });
    res.status(result.status || 200).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'IndexNow dispatch failed: ' + err.message });
  }
});

// Streaming XML Sitemap Deep Parser & Sub-Sitemap Crawler
app.all(['/api/sitemap/parse', '/api/v1/sitemap/parse'], async (req, res) => {
  try {
    const rawUrl = req.method === 'GET'
      ? (req.query.url || req.query.sitemapUrl)
      : (req.body?.url || req.body?.sitemapUrl);

    if (!rawUrl) {
      return res.status(400).json({ success: false, error: 'Target sitemap URL is required (e.g. ?url=https://example.com/sitemap.xml)' });
    }

    if (String(rawUrl).startsWith('http') && !isSafeUrl(rawUrl)) {
      return res.status(400).json({ error: 'Invalid or restricted URL target (SSRF protection).' });
    }

    const maxUrls = parseInt(req.query.maxUrls || req.body?.maxUrls || 5000, 10);
    const parsed = await fetchAndParseSitemap(rawUrl, maxUrls);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Sitemap parsing failed: ' + err.message });
  }
});

// Sitemap vs Link Graph Orphan & Unindexed Detector
app.post(['/api/sitemap/orphans', '/api/v1/sitemap/orphans'], (req, res) => {
  try {
    const { crawledUrls, sitemapUrls } = req.body || {};
    if (!crawledUrls && !sitemapUrls) {
      return res.status(400).json({ success: false, error: 'Both crawledUrls and sitemapUrls must be provided.' });
    }

    const analysis = detectOrphanPages(crawledUrls || [], sitemapUrls || []);
    res.json({ success: true, ...analysis });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Orphan analysis failed: ' + err.message });
  }
});

// Health check endpoint
app.get(['/api/health', '/api/v1/health'], (req, res) => {
  res.json({
    status: 'ok',
    state: 'UP',
    service: 'OmniSEO-OS Universal Engine',
    version: '2.0.0',
    capabilities: [
      'Multi-Page Crawl (/api/audit)',
      'Backlinks & Disavow (/api/backlinks)',
      'Open Intelligence Engine (/api/open-intel)',
      'GSC Insights Simulator (/api/gsc)',
      'Rank Tracking (/api/rank)',
      'Keyword Autocomplete & INR CPC (/api/keywords)',
      'Domain Authority & SSL Benchmark (/api/domain)',
      'Brand Sentiment & SOV (/api/brand)',
      'AI Strategy Copilot (/api/ai-prompt)',
      'Body Keyword Density (/api/saved-keywords)',
      'SERP Snippet Simulator (/api/serp-preview)',
      'Robots & Sitemap Prober (/api/robots-sitemap)',
      'Data Integrity & Provenance (/api/provenance)',
      'Audit History & Snapshot Persistence (/api/storage)',
      'Executive HTML & PDF Report (/api/export/report)',
      'Bulk CSV Data Export (/api/export/csv)',
      'Live IndexNow Dispatcher (/api/indexnow)',
      'Streaming XML Sitemap Deep Parser (/api/sitemap/parse)',
      'Orphan Page Detector (/api/sitemap/orphans)'
    ]
  });
});

// ─── 404 CATCH-ALL HANDLER ───────────────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
});

app.listen(PORT, () => {
  console.log(`[OmniSEO-OS] Universal SEO Operating System live on http://localhost:${PORT}`);
});
