import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// ─── 1. CORE ORCHESTRATOR & PLANNER ENDPOINTS ────────────
app.post('/api/plan', (req, res) => {
  try {
    const { query, context } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query string is required.' });
    }
    const plan = parseAndPlan(query, context);
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/execute', async (req, res) => {
  try {
    const { query, plan, context } = req.body;
    const finalPlan = plan || parseAndPlan(query, context);
    const result = await executeOrchestratedPlan(finalPlan);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 2. OPENSEO SUITE NATIVE API ENDPOINTS ───────────────

// Multi-Page Site Audit (Crawls up to 20 pages)
app.post('/api/audit', async (req, res) => {
  const startUrl = req.body.url;
  if (!startUrl) return res.status(400).json({ error: 'URL is required for audit' });

  try {
    const results = await crawlMultiPageSite(startUrl, req.body.maxPages || 15);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Site crawl failed: ' + err.message });
  }
});

// Deep Backlinks & Authority Inspection
app.post('/api/backlinks', async (req, res) => {
  const target = req.body.url || req.body.domain;
  if (!target) return res.status(400).json({ error: 'URL or Domain is required' });

  try {
    let domain = target;
    let url = target;
    if (target.startsWith('http')) {
      domain = new URL(target).hostname;
    } else {
      url = `https://${target}`;
    }

    const result = await auditBacklinks(domain, url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Backlink analysis failed: ' + err.message });
  }
});

// Google Search Console (GSC) Insights Simulation
app.post('/api/gsc', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const data = await simulateGSC(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'GSC analysis failed: ' + err.message });
  }
});

// Rank Tracker
app.post('/api/rank', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const data = await trackRankings(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Rank tracking failed: ' + err.message });
  }
});

// Keyword Research with INR CPC & Google Autocomplete
app.post('/api/keywords', async (req, res) => {
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Keyword is required' });

  try {
    const data = await researchKeywords(keyword);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Keyword research failed: ' + err.message });
  }
});

// Domain Overview, Security, SSL & Competitor Benchmark
app.post('/api/domain', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const data = await analyzeDomainOverview(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Domain analysis failed: ' + err.message });
  }
});

// Brand Reputation, Sentiment & Social Share of Voice
app.post('/api/brand', async (req, res) => {
  const { brand } = req.body;
  if (!brand) return res.status(400).json({ error: 'Brand name is required' });

  try {
    const data = await monitorBrand(brand);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Brand scan failed: ' + err.message });
  }
});

// AI SEO Strategy Copilot & Prompt Terminal
app.post('/api/ai-prompt', async (req, res) => {
  const { prompt, url } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const data = await handleAiPrompt(prompt, url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'AI analysis failed: ' + err.message });
  }
});

// Saved Keywords & Content Bigram Extractor
app.post('/api/saved-keywords', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const data = await extractSavedKeywords(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Saved keywords extraction failed: ' + err.message });
  }
});

// ─── 3. GITHUB SEO TOPIC ENHANCEMENTS ────────────────────

// Google SERP Snippet Preview Simulator (Desktop & Mobile)
app.post('/api/serp-preview', (req, res) => {
  try {
    const { url, title, description } = req.body;
    const targetUrl = url || 'https://yatradham.org/kumbh-mela-nashik/';
    const parsed = new URL(targetUrl);
    const breadcrumbs = `${parsed.hostname} > ${parsed.pathname.split('/').filter(Boolean).join(' > ')}`;
    const displayTitle = (title || 'Nashik Kumbh Mela 2026 All Details & Dharamshala Booking').substring(0, 60);
    const displayDesc = (description || 'Get complete information and latest updates on Simhastha Kumbh Mela Nashik. Book verified dharamshalas, ashrams, and hotels online with instant confirmation.').substring(0, 160);

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
      richSnippet: 'Dharamshala Booking & Shahi Snan Dates 2026'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Robots.txt & Sitemap.xml Auto-Detector
app.get('/api/robots-sitemap', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    const parsed = new URL(url);
    const origin = parsed.origin;

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
          if (loc) parsedUrls.push({ loc, lastmod, priority, changefreq });
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

    res.json({ origin, robots, sitemap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Competitor Authority & Keyword Gap Studio
app.post('/api/competitor-gap', async (req, res) => {
  const target = req.body.targetUrl || req.body.url;
  const competitor = req.body.competitorDomain || req.body.competitor || 'tripadvisor.in';
  if (!target) return res.status(400).json({ success: false, error: 'URL is required' });

  try {
    const raw = await analyzeCompetitorGap(target, competitor);
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
      actionableSteps: (raw.actionPlan || []).map(a => `${a.action}: ${a.impact} (${a.urgency})`)
    };
    res.json({ success: true, gapData });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Competitor gap analysis failed: ' + err.message });
  }
});

// Universal Multi-Engine Web Scraper
app.post('/api/scrape', async (req, res) => {
  const { url, mode, selector } = req.body;
  if (!url) return res.status(400).json({ success: false, error: 'URL is required' });

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
app.post('/api/head-eeat', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const data = await auditHeadAndEeat(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'HEAD & E-E-A-T audit failed: ' + err.message });
  }
});

// ─── 4. SOURCE CODE LINE VIEWER & HEALTH ─────────────────
app.get('/api/view-source', async (req, res) => {
  try {
    const { url, line } = req.query;
    if (!url) return res.status(400).send('URL query parameter required');
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

// Interactive Live Page Visual Inspector with On-DOM Highlighting
app.get('/api/inspect-page', async (req, res) => {
  try {
    const { url, highlight, selector, issue } = req.query;
    if (!url) return res.status(400).send('URL query parameter required');

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'OmniSEO-OS Universal Engine',
    version: '2.0.0',
    capabilities: [
      'Multi-Page Crawl (/api/audit)',
      'Backlinks & Disavow (/api/backlinks)',
      'GSC Insights Simulator (/api/gsc)',
      'Rank Tracking (/api/rank)',
      'Keyword Autocomplete & INR CPC (/api/keywords)',
      'Domain Authority & SSL Benchmark (/api/domain)',
      'Brand Sentiment & SOV (/api/brand)',
      'AI Strategy Copilot (/api/ai-prompt)',
      'Body Keyword Density (/api/saved-keywords)',
      'SERP Snippet Simulator (/api/serp-preview)',
      'Robots & Sitemap Prober (/api/robots-sitemap)'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`[OmniSEO-OS] Universal SEO Operating System live on http://localhost:${PORT}`);
});
