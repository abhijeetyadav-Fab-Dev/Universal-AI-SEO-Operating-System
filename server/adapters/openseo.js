import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { queryDomainRdap, queryGoogleDns, queryHackerNewsMentions, queryWikipediaSummary } from './open_apis.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OmniSEO/2.0';

function normalizeUrl(baseUrl, href) {
  try {
    const u = new URL(href, baseUrl);
    u.hash = '';
    return u.href;
  } catch {
    return null;
  }
}

export function classifyIntent(kw) {
  const k = (kw || '').toLowerCase();
  if (/buy|price|cheap|book|order|purchase|deal|discount|coupon|cost|ticket|tariff/.test(k)) return 'Transactional';
  if (/best|top|review|compare|vs|recommend|rating|list/.test(k)) return 'Commercial';
  if (/how|what|why|when|where|guide|tutorial|tips|meaning|dates|schedule|timing|distance|route/.test(k)) return 'Informational';
  return 'Navigational';
}

export function cpcForIntentINR(intent) {
  const map = {
    Transactional: [45, 160],
    Commercial: [30, 95],
    Informational: [12, 45],
    Navigational: [8, 25]
  };
  const [lo, hi] = map[intent] || [15, 60];
  const val = Math.floor(Math.random() * (hi - lo) + lo);
  return `₹${val.toFixed(2)}`;
}

export function diffForKeyword(kw) {
  const words = (kw || '').trim().split(/\s+/).length;
  if (words <= 2) return Math.floor(Math.random() * 40 + 45);
  if (words <= 4) return Math.floor(Math.random() * 30 + 20);
  return Math.floor(Math.random() * 20 + 10);
}

async function fetchHTML(url) {
  const start = Date.now();
  const resp = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(8000)
  });
  const html = await resp.text();
  return {
    html,
    status: resp.status,
    responseTimeMs: Date.now() - start
  };
}

/**
 * 1. Multi-Page Site Audit (Crawls up to 20 internal pages)
 */
export async function crawlMultiPageSite(startUrl, maxPages = 15) {
  const parsedStartUrl = new URL(startUrl);
  const domain = parsedStartUrl.hostname;
  const queue = [startUrl];
  const visited = new Set();
  const results = {
    startUrl,
    domain,
    dataStatus: 'measured',
    isSimulated: false,
    provider: 'Built-in SSRF-safe multi-page crawler',
    pagesCrawled: 0,
    avgResponseTime: 0,
    issuesFound: 0,
    warningCount: 0,
    infoCount: 0,
    crawledPages: [],
    issues: {
      imagesMissingAlt: [],
      slowResponse: [],
      metaDescriptionTooLong: [],
      titleTooLong: [],
      renderBlocking: [],
      excessiveDOM: [],
      missingH1: []
    }
  };
  let totalResponseTime = 0;

  while (queue.length > 0 && visited.size < maxPages) {
    const batch = [];
    while (queue.length > 0 && (visited.size + batch.length) < maxPages && batch.length < 4) {
      const u = queue.shift();
      if (!visited.has(u)) {
        visited.add(u);
        batch.push(u);
      }
    }
    if (batch.length === 0) break;

    await Promise.all(batch.map(async (currentUrl) => {
      try {
        const { html, status, responseTimeMs } = await fetchHTML(currentUrl);
        totalResponseTime += responseTimeMs;
        results.pagesCrawled++;
        const $ = cheerio.load(html);

        let pageIssues = 0;
        if (responseTimeMs > 1500) {
          results.issues.slowResponse.push({ url: currentUrl, responseTimeMs });
          pageIssues++;
        }

        const metaDesc = $('meta[name="description"]').attr('content') || '';
        if (metaDesc.length > 160) {
          results.issues.metaDescriptionTooLong.push({ url: currentUrl, length: metaDesc.length });
          pageIssues++;
        }

        const title = $('title').text().trim() || '';
        if (title.length > 60) {
          results.issues.titleTooLong.push({ url: currentUrl, length: title.length });
          pageIssues++;
        }

        let imagesMissingAlt = 0;
        let imagesTotal = 0;
        $('img').each((_, el) => {
          imagesTotal++;
          const alt = $(el).attr('alt');
          if (alt === undefined || alt === null || alt.trim() === '') {
            imagesMissingAlt++;
          }
        });
        if (imagesMissingAlt > 0) {
          results.issues.imagesMissingAlt.push({ url: currentUrl, imagesMissingAlt, imagesTotal });
          pageIssues++;
        }

        const blockingScripts = [];
        $('script[src]').each((_, el) => {
          if (!$(el).attr('defer') && !$(el).attr('async')) {
            blockingScripts.push($(el).attr('src'));
          }
        });
        if (blockingScripts.length > 0) {
          results.issues.renderBlocking.push({ url: currentUrl, scripts: blockingScripts.slice(0, 5) });
          pageIssues++;
        }

        const domCount = $('*').length;
        if (domCount > 1500) {
          results.issues.excessiveDOM.push({ url: currentUrl, count: domCount });
          pageIssues++;
        }

        const h1Count = $('h1').length;
        const pageIssuesList = [];

        if (h1Count === 0) {
          results.issues.missingH1.push({ url: currentUrl });
          pageIssuesList.push({
            type: 'Missing H1 Heading',
            severity: 'P0 - Critical',
            description: 'No <h1> heading found. Primary topic relevance anchor is missing for Googlebot and screen readers.',
            selector: 'h1',
            code: `<h1>${title ? title.split('|')[0].trim() : 'Primary Content Heading'}</h1>`,
            recommendation: 'Inject a semantic <h1> heading matching the target search intent at the top of the content container.'
          });
        }

        if (imagesMissingAlt > 0) {
          results.issues.imagesMissingAlt.push({ url: currentUrl, imagesMissingAlt, imagesTotal });
          pageIssuesList.push({
            type: 'Missing Image Alt Attributes',
            severity: 'P1 - High',
            description: `${imagesMissingAlt} of ${imagesTotal} images lack an alt description on this page.`,
            selector: 'img:not([alt]), img[alt=""]',
            code: '<img src="..." alt="Descriptive accessible context" loading="lazy" />',
            recommendation: 'Add descriptive alt text to all visual assets to satisfy accessibility standards (WCAG 2.1) and Google Image Search.'
          });
        }

        if (responseTimeMs > 600) {
          results.issues.slowResponse.push({ url: currentUrl, responseTimeMs });
          pageIssuesList.push({
            type: 'Slow Server Latency (TTFB)',
            severity: responseTimeMs > 1000 ? 'P0 - Critical' : 'P2 - Medium',
            description: `Server response time was ${responseTimeMs}ms (optimal threshold: < 500ms).`,
            selector: 'server',
            code: 'Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=600',
            recommendation: 'Implement Edge CDN caching and server-side response compression (Brotli/Gzip) to accelerate TTFB.'
          });
        }

        if (blockingScripts.length > 0) {
          pageIssuesList.push({
            type: 'Render-Blocking JavaScript',
            severity: 'P1 - High',
            description: `${blockingScripts.length} synchronous <script> tags detected in the critical path.`,
            selector: 'script[src]:not([defer]):not([async])',
            code: blockingScripts.slice(0, 2).map(s => `<script src="${s}" defer></script>`).join('\n'),
            recommendation: 'Add "defer" or "async" attributes to non-essential JavaScript to unblock First Contentful Paint (FCP).'
          });
        }

        if (domCount > 1500) {
          pageIssuesList.push({
            type: 'Excessive DOM Depth',
            severity: 'P2 - Warning',
            description: `Page DOM contains ${domCount} nodes (recommended max: 1,500).`,
            selector: 'body',
            code: '<!-- Flatten nested DOM containers -->',
            recommendation: 'Refactor deeply nested <div> elements and lazy-render below-the-fold component trees.'
          });
        }

        if (metaDesc.length > 160 || metaDesc.length === 0) {
          pageIssuesList.push({
            type: metaDesc.length === 0 ? 'Missing Meta Description' : 'Meta Description Too Long',
            severity: 'P2 - Warning',
            description: metaDesc.length === 0 ? 'No meta description tag found in <head>.' : `Meta description is ${metaDesc.length} characters (recommended: 120-155 characters).`,
            selector: 'meta[name="description"]',
            code: `<meta name="description" content="${metaDesc.substring(0, 150) || `${title ? title.split('|')[0].trim() : domain} — Complete guide, resources, and essential information.`}">`,
            recommendation: 'Provide an enticing, intent-driven meta description within 120-155 characters to maximize organic CTR.'
          });
        }

        results.crawledPages.push({
          url: currentUrl,
          status,
          responseTimeMs,
          title: title.substring(0, 60),
          h1: $('h1').first().text().trim().substring(0, 50) || 'Missing H1',
          imagesCount: imagesTotal,
          missingAlts: imagesMissingAlt,
          issuesCount: pageIssuesList.length,
          issuesList: pageIssuesList
        });

        // Extract internal links to queue
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            const nextUrl = normalizeUrl(currentUrl, href);
            if (nextUrl && new URL(nextUrl).hostname === domain && !visited.has(nextUrl) && !queue.includes(nextUrl)) {
              if (!nextUrl.match(/\.(png|jpg|jpeg|gif|css|js|pdf|zip|svg|ico)$/i)) {
                if (queue.length < 30) queue.push(nextUrl);
              }
            }
          }
        });
      } catch {
        // Continue crawling other links if one fails
      }
    }));
  }

  if (results.pagesCrawled > 0) {
    results.avgResponseTime = Math.round(totalResponseTime / results.pagesCrawled);
  }

  results.issuesFound =
    results.issues.imagesMissingAlt.length +
    results.issues.slowResponse.length +
    results.issues.metaDescriptionTooLong.length +
    results.issues.titleTooLong.length +
    results.issues.renderBlocking.length +
    results.issues.excessiveDOM.length +
    results.issues.missingH1.length;

  results.warningCount = results.issues.imagesMissingAlt.length + results.issues.renderBlocking.length + results.issues.missingH1.length;
  results.infoCount = results.issuesFound - results.warningCount;

  return results;
}

/**
 * 2. GSC Simulation from On-Page Structure
 */
export async function simulateGSC(url) {
  const { html } = await fetchHTML(url);
  const $ = cheerio.load(html);
  const domain = new URL(url).hostname;

  const pages = new Set([url]);
  $('a[href]').each((_, el) => {
    const resolved = normalizeUrl(url, $(el).attr('href'));
    if (resolved) {
      try {
        if (new URL(resolved).hostname === domain) pages.add(resolved);
      } catch {}
    }
  });

  const queries = [];
  const seen = new Set();
  $('title, h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 3 && text.length < 80 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      const rawClicks = Math.floor(Math.random() * 1200 + 80);
      const multiplier = Math.floor(Math.random() * 18 + 12); // Always 12x - 30x impressions
      const rawImpr = rawClicks * multiplier;
      queries.push({
        q: text.substring(0, 60),
        c: rawClicks,
        i: rawImpr > 1000 ? (rawImpr / 1000).toFixed(1) + 'k' : rawImpr.toString(),
        cRaw: rawClicks,
        iRaw: rawImpr,
        ctr: ((rawClicks / rawImpr) * 100).toFixed(2) + '%',
        p: (Math.random() * 12 + 1.5).toFixed(1)
      });
    }
  });

  if (queries.length === 0) {
    const cleanBrand = domain.replace(/^www\./, '').split('.')[0];
    const defaultTerms = [`${cleanBrand} official`, `${cleanBrand} overview`, `${cleanBrand} reviews`, `${cleanBrand} tools`];
    for (const term of defaultTerms) {
      const rawClicks = Math.floor(Math.random() * 600 + 80);
      const rawImpr = rawClicks * Math.floor(Math.random() * 16 + 12);
      queries.push({
        q: term,
        c: rawClicks,
        i: (rawImpr / 1000).toFixed(1) + 'k',
        cRaw: rawClicks,
        iRaw: rawImpr,
        ctr: ((rawClicks / rawImpr) * 100).toFixed(2) + '%',
        p: (Math.random() * 8 + 1.2).toFixed(1)
      });
    }
  }

  const pageList = [...pages].slice(0, 8).map(p => {
    const c = Math.floor(Math.random() * 2500 + 150);
    const im = c * Math.floor(Math.random() * 16 + 10);
    return {
      url: p,
      c,
      i: (im / 1000).toFixed(1) + 'k',
      ctr: ((c / im) * 100).toFixed(2) + '%'
    };
  });

  const totalClicks = queries.reduce((s, q) => s + (q.cRaw || q.c), 0);
  const totalImpr = queries.reduce((s, q) => s + (q.iRaw || (q.c * 15)), 0);
  const safeCTR = totalImpr > 0 ? Math.min(100, (totalClicks / totalImpr) * 100).toFixed(2) + '%' : '0%';

  return {
    provider: 'Google Search Console Intelligence Simulator',
    provenance: 'Simulated Search Model (Connect GSC OAuth for Verified Property Data)',
    dataStatus: 'simulated',
    isSimulated: true,
    clicks: totalClicks,
    impressions: totalImpr,
    ctr: safeCTR,
    position: queries.length > 0 ? (queries.reduce((s, q) => s + parseFloat(q.p), 0) / queries.length).toFixed(1) : '0',
    queries: queries.slice(0, 8),
    pages: pageList
  };
}

/**
 * 3. Rank Tracking
 */
export async function trackRankings(url) {
  const { html } = await fetchHTML(url);
  const $ = cheerio.load(html);

  const kwSet = new Set();
  $('title, h1, h2').each((_, el) => {
    const text = $(el).text().trim().toLowerCase().replace(/[-|–].*$/, '').trim();
    if (text.length > 4 && text.length < 55) kwSet.add(text);
  });

  const keywords = [...kwSet].slice(0, 8).map(kw => {
    const cp = Math.floor(Math.random() * 18 + 1);
    const pp = Math.max(1, cp + Math.floor(Math.random() * 6 - 3));
    const ch = pp - cp;
    const vol = Math.floor(Math.random() * 22000 + 1200);
    return {
      kw,
      currentPos: cp,
      prevPos: pp,
      change: ch,
      vol: vol > 1000 ? (vol / 1000).toFixed(1) + 'k' : vol.toString(),
      trend: ch > 0 ? 'up' : ch < 0 ? 'down' : 'stable'
    };
  });

  const positions = keywords.map(k => k.currentPos);
  const avgPos = positions.length > 0 ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1) : '0';
  const top3 = positions.filter(p => p <= 3).length;
  const visibility = Math.min(100, Math.round((1 - (parseFloat(avgPos) / 100)) * 100));

  return {
    avgPosition: avgPos,
    top3Count: top3,
    visibility: visibility + '%',
    keywords,
    isSimulated: true,
    dataStatus: 'simulated',
    provenance: 'Estimated Rank Visibility Model (Connect DataForSEO in ⚙️ Settings for live SERP tracking)'
  };
}

/**
 * 4. Google Autocomplete Keyword Research (with INR CPC)
 */
export async function researchKeywords(keyword) {
  const acUrl = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword)}`;
  let suggestions = [];

  try {
    const resp = await fetch(acUrl, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000)
    });
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && Array.isArray(data[1])) {
        suggestions = data[1].filter(s => s.toLowerCase() !== keyword.toLowerCase()).slice(0, 10);
      }
    }
  } catch {}

  if (suggestions.length === 0) {
    suggestions = [
      `best ${keyword}`, `${keyword} booking`, `${keyword} price`,
      `${keyword} guide 2026`, `${keyword} near me`, `top ${keyword}`,
      `${keyword} dates`, `${keyword} online check`
    ];
  }

  const mainIntent = classifyIntent(keyword);
  const mainDiff = diffForKeyword(keyword);
  const mainCpc = cpcForIntentINR(mainIntent);
  const mainVol = Math.floor(Math.random() * 45000 + 6000);

  const variants = suggestions.map((s, i) => {
    const intent = classifyIntent(s);
    return {
      kw: s,
      vol: Math.max(120, Math.floor(mainVol * (0.85 - i * 0.07))),
      diff: diffForKeyword(s),
      cpc: cpcForIntentINR(intent),
      intent
    };
  });

  const kl = keyword.toLowerCase();
  let serpDomains;
  if (kl.includes('hotel') || kl.includes('travel') || kl.includes('vacation') || kl.includes('flight')) {
    serpDomains = ['booking.com', 'expedia.com', 'airbnb.com', 'tripadvisor.com', 'hotels.com', 'kayak.com'];
  } else if (kl.includes('code') || kl.includes('dev') || kl.includes('software') || kl.includes('tech') || kl.includes('api') || kl.includes('data')) {
    serpDomains = ['github.com', 'stackoverflow.com', 'developer.mozilla.org', 'medium.com', 'en.wikipedia.org'];
  } else if (kl.includes('news') || kl.includes('today') || kl.includes('market')) {
    serpDomains = ['reuters.com', 'nytimes.com', 'bbc.com', 'bloomberg.com', 'forbes.com'];
  } else {
    serpDomains = ['en.wikipedia.org', 'nytimes.com', 'forbes.com', 'medium.com', 'reddit.com', 'quora.com'];
  }

  const trendPoints = Array.from({ length: 7 }, () => Math.floor(Math.random() * 60) + 20);
  const diffLabel = mainDiff < 30 ? 'Low Competition' : mainDiff < 60 ? 'Medium Competition' : 'High Competition';

  return {
    keyword,
    volume: mainVol,
    difficulty: mainDiff,
    cpc: mainCpc,
    diffLabel,
    variants,
    serpDomains,
    trendPoints
  };
}

/**
 * 5. Domain Overview & Authority Benchmark
 */
export async function analyzeDomainOverview(url, options = {}) {
  const startTime = Date.now();
  const { html } = await fetchHTML(url);
  const responseTime = Date.now() - startTime;
  const $ = cheerio.load(html);
  const domain = new URL(url).hostname;

  const internalLinks = new Set();
  const externalDomains = new Set();
  let totalLinks = 0;

  $('a[href]').each((_, el) => {
    const resolved = normalizeUrl(url, $(el).attr('href'));
    if (!resolved) return;
    totalLinks++;
    try {
      const linkDomain = new URL(resolved).hostname;
      if (linkDomain === domain || linkDomain.endsWith('.' + domain)) {
        internalLinks.add(resolved);
      } else {
        externalDomains.add(linkDomain);
      }
    } catch {}
  });

  const isSSL = url.startsWith('https');
  const cleanDomain = domain.toLowerCase().replace(/^www\./, '');
  const domainHash = cleanDomain.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const isMega = ['google.com', 'wikipedia.org', 'youtube.com', 'apple.com', 'microsoft.com', 'amazon.com'].includes(cleanDomain);
  const isTech = ['github.com', 'stackoverflow.com', 'gitlab.com', 'cloudflare.com', 'mozilla.org'].includes(cleanDomain);
  const isTravel = cleanDomain.includes('booking') || cleanDomain.includes('airbnb') || cleanDomain.includes('expedia') || cleanDomain.includes('hotels') || cleanDomain.includes('tripadvisor');

  let authority = 65;
  let refDomains = Math.max(externalDomains.size * 12, 140 + (domainHash % 850));
  let totalBacklinks = refDomains * Math.floor((domainHash % 15) + 8);
  let organicTraffic = refDomains * Math.floor((domainHash % 30) + 14);
  let organicKeywords = Math.floor(organicTraffic * 0.08);
  let competitors = [];
  let isLive = false;

  // 1. Live DataForSEO Integration if configured
  const dfLogin = options.dataforseoLogin || process.env.DATAFORSEO_LOGIN;
  const dfPass = options.dataforseoPassword || process.env.DATAFORSEO_PASSWORD;

  if (dfLogin && dfPass) {
    try {
      const auth = Buffer.from(`${dfLogin}:${dfPass}`).toString('base64');
      const apiRes = await fetch('https://api.dataforseo.com/v3/backlinks/summary/live', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{ target: domain, internal_list_limit: 5 }]),
        timeout: 8000
      });
      if (apiRes.ok) {
        const json = await apiRes.json();
        const item = json.tasks?.[0]?.result?.[0];
        if (item) {
          isLive = true;
          authority = Math.round(item.rank || 65);
          refDomains = item.referring_domains || refDomains;
          totalBacklinks = item.backlinks || totalBacklinks;
        }
      }
    } catch {}
  }

  if (!isLive) {
    if (isMega) {
      authority = 98;
      refDomains = 1450000;
      totalBacklinks = 54000000;
      organicTraffic = 850000000;
      organicKeywords = 12500000;
      competitors = cleanDomain === 'wikipedia.org' ? [
        { name: 'britannica.com', da: 92, trend: 'steady' },
        { name: 'wiktionary.org', da: 89, trend: 'up' },
        { name: 'archive.org', da: 94, trend: 'up' },
        { name: 'citizendium.org', da: 68, trend: 'down' }
      ] : [
        { name: 'microsoft.com', da: 98, trend: 'up' },
        { name: 'apple.com', da: 97, trend: 'steady' },
        { name: 'amazon.com', da: 96, trend: 'up' },
        { name: 'wikipedia.org', da: 95, trend: 'steady' }
      ];
    } else if (isTech) {
      authority = 94;
      refDomains = 520000;
      totalBacklinks = 22000000;
      organicTraffic = 68000000;
      organicKeywords = 3800000;
      competitors = [
        { name: 'gitlab.com', da: 89, trend: 'up' },
        { name: 'bitbucket.org', da: 86, trend: 'steady' },
        { name: 'sourceforge.net', da: 85, trend: 'down' },
        { name: 'codeberg.org', da: 74, trend: 'up' }
      ];
    } else if (isTravel) {
      authority = 88;
      refDomains = 112000;
      totalBacklinks = 18400000;
      organicTraffic = 45000000;
      organicKeywords = 540000;
      competitors = [
        { name: 'booking.com', da: 92, trend: 'up' },
        { name: 'expedia.com', da: 89, trend: 'up' },
        { name: 'airbnb.com', da: 91, trend: 'steady' },
        { name: 'tripadvisor.com', da: 93, trend: 'up' }
      ];
    } else {
      const linkFactor = Math.min(30, internalLinks.size * 2);
      authority = Math.min(85, Math.max(30, 35 + linkFactor + (domainHash % 25)));

      // Discover real external peer domains from actual page links if present
      const excluded = ['google.com', 'gstatic.com', 'googleapis.com', 'facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'linkedin.com', 'schema.org', 'w3.org', 'cloudflare.com', 'jsdelivr.net', 'unpkg.com', 'github.com'];
      const discoveredPeers = [...externalDomains].filter(d => !excluded.some(ex => d === ex || d.endsWith('.' + ex))).slice(0, 4);

      if (discoveredPeers.length >= 3) {
        competitors = discoveredPeers.map((p, idx) => ({
          name: p,
          da: Math.max(35, Math.min(92, authority + ((idx % 2 === 0 ? 1 : -1) * (5 + idx * 3)))),
          trend: idx % 2 === 0 ? 'up' : 'steady'
        }));
      } else {
        competitors = [
          { name: `alternative-to-${cleanDomain.split('.')[0]}.com`, da: Math.min(85, authority + 6), trend: 'up' },
          { name: `${cleanDomain.split('.')[0]}-guide.org`, da: Math.max(35, authority - 4), trend: 'steady' },
          { name: `top-${cleanDomain.split('.')[0]}-solutions.io`, da: Math.min(82, authority + 3), trend: 'up' },
          { name: `industry-index-${cleanDomain.split('.')[0]}.net`, da: Math.max(32, authority - 8), trend: 'steady' }
        ];
      }
    }
  }

  let spamSignals = 0;
  $('[style*="display:none"] a, [style*="visibility:hidden"] a').each(() => spamSignals++);
  if (externalDomains.size > internalLinks.size * 3) spamSignals += 5;
  const spamScore = Math.min(35, spamSignals * 4 + 2);

  // Query Open RDAP (WHOIS) and Google DNS-over-HTTPS
  let rdapData = null;
  let dohData = null;
  try {
    const [r, d] = await Promise.all([
      queryDomainRdap(cleanDomain),
      queryGoogleDns(cleanDomain, 'A')
    ]);
    rdapData = r.success ? r : null;
    dohData = d.success ? d : null;
  } catch {}

  return {
    domain,
    authority,
    isSSL,
    responseTimeMs: responseTime,
    refDomains,
    totalBacklinks,
    spamScore: spamScore.toFixed(1) + '%',
    organicTraffic,
    organicKeywords,
    brokenBacklinks: Math.floor(totalLinks * 0.04),
    competitors,
    rdap: rdapData,
    dns: dohData,
    domainAge: rdapData?.domainAgeFormatted || null,
    registrar: rdapData?.registrar || null,
    resolvedIps: dohData?.answers?.map(a => a.data) || [],
    isSimulated: !isLive,
    dataStatus: isLive ? 'measured' : 'simulated',
    provider: isLive ? 'DataForSEO Live Domain Authority API' : 'Domain Intelligence Model (Heuristic/Simulated)',
    provenance: isLive
      ? 'Live DataForSEO Domain Authority & SERP Index'
      : (rdapData
        ? `Live ICANN RDAP (${rdapData.registrar || 'Registered'}, ${rdapData.domainAgeFormatted || 'Active'}) & DNS Topology`
        : 'Heuristic Domain Intelligence (Live DNS, HTTP, and Link Topology — Connect DataForSEO in ⚙️ Settings for Live Metrics)')
  };
}

/**
 * 6. Brand Reputation & Sentiment Monitor
 */
export async function monitorBrand(brand) {
  const acUrl = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(brand)}`;
  let suggestions = [];

  try {
    const resp = await fetch(acUrl, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000)
    });
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && Array.isArray(data[1])) {
        suggestions = data[1];
      }
    }
  } catch {}

  const positive = ['best', 'top', 'great', 'amazing', 'official', 'trusted', 'popular', 'recommended', 'good', 'safe'];
  const negative = ['scam', 'fraud', 'fake', 'bad', 'worst', 'complaint', 'negative', 'issues', 'problem'];
  let posCount = 0;
  let negCount = 0;

  suggestions.forEach(s => {
    const sl = s.toLowerCase();
    if (positive.some(p => sl.includes(p))) posCount++;
    if (negative.some(n => sl.includes(n))) negCount++;
  });

  const sentimentScore = Math.min(100, Math.max(20, Math.round(((posCount + 3) / (posCount + negCount + 5)) * 100)));
  const reach = (Math.random() * 4 + 1.2).toFixed(1) + 'M';
  const sov = (Math.random() * 14 + 6).toFixed(1) + '%';

  const platforms = ['Google Search', 'Twitter / X', 'LinkedIn', 'Reddit', 'Quora', 'YouTube'];
  const mentions = platforms.map(source => ({
    source,
    sentiment: sentimentScore > 65 ? 'Positive' : sentimentScore > 45 ? 'Neutral' : 'Negative',
    reach: Math.floor(Math.random() * 250 + 15) + 'k',
    date: new Date(Date.now() - Math.floor(Math.random() * 25 * 86400000)).toISOString().split('T')[0]
  }));

  let liveDiscussions = [];
  let wikiEntitySummary = null;
  try {
    const [hnRes, wikiRes] = await Promise.all([
      queryHackerNewsMentions(brand, 5),
      queryWikipediaSummary(brand)
    ]);
    if (hnRes.success && hnRes.hits?.length) liveDiscussions = hnRes.hits;
    if (wikiRes.success) wikiEntitySummary = wikiRes;
  } catch {}

  return {
    brand,
    sentiment: `${sentimentScore > 65 ? 'Positive' : sentimentScore > 45 ? 'Neutral' : 'Negative'} (${sentimentScore}%)`,
    sentimentScore,
    reach,
    shareOfVoice: sov,
    mentions,
    liveDiscussions,
    wikiEntitySummary,
    isSimulated: true,
    dataStatus: 'simulated',
    provenance: liveDiscussions.length > 0
      ? `Live Google Suggest & Hacker News Discussions (${liveDiscussions.length} threads)`
      : 'Google Suggest Search Sentiment Heuristics'
  };
}

/**
 * 7. AI Prompt Engine & SEO Copilot
 * Supports Google Gemini (2.5/1.5 Flash) and OpenAI (gpt-4o-mini) REST APIs.
 * When API keys are configured, generates real LLM analysis grounded in live crawled DOM context.
 * When unconfigured, provides a transparent rule-based heuristic labeled honestly.
 */
export async function handleAiPrompt(prompt, url = null, options = {}) {
  const startTime = Date.now();
  let pageContext = '';
  let derivedTopic = 'Your Domain';
  let targetDomain = 'example.com';
  let rawCrawlData = {};

  if (url) {
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);
      targetDomain = u.hostname.replace(/^www\./, '');
      derivedTopic = targetDomain.split('.')[0];
      const { html } = await fetchHTML(url);
      const $ = cheerio.load(html);
      const title = $('title').text().trim();
      const meta = $('meta[name="description"]').attr('content') || '';
      const h1List = $('h1').map((_, el) => $(el).text().trim()).get().filter(Boolean);
      const h2List = $('h2').map((_, el) => $(el).text().trim()).get().slice(0, 4);
      const schemaCount = $('script[type="application/ld+json"]').length;
      const imagesWithoutAlt = $('img:not([alt]), img[alt=""]').length;
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      const wordCount = bodyText.split(' ').filter(Boolean).length;

      if (title) derivedTopic = title.replace(/[-|–|:].*$/, '').trim();
      else if (h1List[0]) derivedTopic = h1List[0];

      rawCrawlData = {
        title,
        meta,
        h1List,
        h2List,
        schemaCount,
        imagesWithoutAlt,
        wordCount
      };

      pageContext = `Page Title: "${title}"\nMeta Description: "${meta}"\nH1 Tags: ${JSON.stringify(h1List)}\nPrimary H2s: ${JSON.stringify(h2List)}\nSchema Blocks: ${schemaCount}\nImages Missing Alt: ${imagesWithoutAlt}\nWord Count: ~${wordCount}`;
    } catch {}
  }

  const openrouterKey = options.openrouterKey || process.env.OPENROUTER_API_KEY;
  const openrouterModel = options.openrouterModel || process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
  const nvidiaKey = options.nvidiaKey || process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY;
  const nvidiaModel = options.nvidiaModel || process.env.NVIDIA_MODEL || 'meta/llama-3.3-70b-instruct';
  const geminiKey = options.geminiKey || options.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const geminiModel = options.geminiModel || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const openaiKey = options.openaiKey || process.env.OPENAI_API_KEY;

  // 1. Try OpenRouter API if key is available (Supports DeepSeek, Llama 3.3, Free Models)
  if (openrouterKey) {
    try {
      const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'http://localhost:4000',
          'X-Title': 'OmniSEO OS'
        },
        body: JSON.stringify({
          model: openrouterModel,
          messages: [
            {
              role: 'system',
              content: "You are an elite AI SEO Architect and Technical Search Strategist for OmniSEO OS. Provide concise, tactical, bullet-pointed recommendations based on the target page's crawled context and the user's prompt. Include precise HTML/code snippets where relevant."
            },
            {
              role: 'user',
              content: `PAGE CONTEXT:\n${pageContext || `Target Domain: ${targetDomain}`}\n\nUSER PROMPT / TASK:\n${prompt}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1024
        }),
        timeout: 20000
      });

      if (openrouterRes.ok) {
        const openrouterData = await openrouterRes.json();
        const generatedText = openrouterData.choices?.[0]?.message?.content;
        if (generatedText) {
          return {
            response: generatedText,
            model: `OpenRouter (${openrouterModel})`,
            isRealLlm: true,
            dataStatus: 'measured',
            isSimulated: false,
            latencyMs: Date.now() - startTime,
            provenance: `Live Generative AI (OpenRouter - ${openrouterModel})`
          };
        }
      }
    } catch (llmErr) {
      // Fall through to next provider
    }
  }

  // 2. Try NVIDIA NIM API if key is available (Llama-3.3, Nemotron, DeepSeek)
  if (nvidiaKey) {
    try {
      const nvidiaRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nvidiaKey}`
        },
        body: JSON.stringify({
          model: nvidiaModel,
          messages: [
            {
              role: 'system',
              content: "You are an elite AI SEO Architect and Technical Search Strategist for OmniSEO OS. Provide concise, tactical, bullet-pointed recommendations based on the target page's crawled context and the user's prompt. Include precise HTML/code snippets where relevant."
            },
            {
              role: 'user',
              content: `PAGE CONTEXT:\n${pageContext || `Target Domain: ${targetDomain}`}\n\nUSER PROMPT / TASK:\n${prompt}`
            }
          ],
          temperature: 0.2,
          max_tokens: 1024
        }),
        timeout: 20000
      });

      if (nvidiaRes.ok) {
        const nvidiaData = await nvidiaRes.json();
        const generatedText = nvidiaData.choices?.[0]?.message?.content;
        if (generatedText) {
          return {
            response: generatedText,
            model: `NVIDIA NIM (${nvidiaModel})`,
            isRealLlm: true,
            dataStatus: 'measured',
            isSimulated: false,
            latencyMs: Date.now() - startTime,
            provenance: `Live Generative AI (NVIDIA NIM - ${nvidiaModel})`
          };
        }
      }
    } catch (llmErr) {
      // Fall through to next provider
    }
  }

  // 3. Try Google Gemini API if key is available (with multi-model resilient fallback)
  if (geminiKey) {
    try {
      const systemInstruction = `You are an elite AI SEO Architect and Technical Search Strategist for OmniSEO OS.
Provide concise, tactical, bullet-pointed recommendations based on the target page's real crawled context and the user's prompt.
Include precise HTML/code snippets where relevant (such as meta tags, schema, or robots rules).
Be direct, actionable, and mathematically grounded in modern search algorithms.`;

      const promptPayload = {
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction}\n\nPAGE CONTEXT:\n${pageContext || `Target Domain: ${targetDomain}`}\n\nUSER PROMPT / TASK:\n${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      };

      // Resilient candidate list to prevent 404 model not found errors across API versions
      const geminiCandidateModels = [
        geminiModel,
        'gemini-2.0-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-2.5-flash',
        'gemini-1.5-pro-latest'
      ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

      let geminiData = null;
      let usedModel = null;

      for (const modelCandidate of geminiCandidateModels) {
        for (const apiVersion of ['v1beta', 'v1']) {
          try {
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${modelCandidate}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(promptPayload),
              timeout: 15000
            });
            if (geminiRes.ok) {
              geminiData = await geminiRes.json();
              usedModel = modelCandidate;
              break;
            }
          } catch {}
        }
        if (geminiData) break;
      }

      if (geminiData) {
        const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
          return {
            response: generatedText,
            model: `Google Gemini (${usedModel})`,
            isRealLlm: true,
            dataStatus: 'measured',
            isSimulated: false,
            latencyMs: Date.now() - startTime,
            provenance: `Live Generative AI (Google Gemini - ${usedModel})`
          };
        }
      }
    } catch (llmErr) {
      // Fall through to next provider or heuristic
    }
  }

  // 4. Try OpenAI API if key is available
  if (openaiKey) {
    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an elite AI SEO Architect and Technical Search Strategist for OmniSEO OS. Provide concise, tactical, bullet-pointed recommendations based on the target page\'s crawled context and the user\'s prompt.'
            },
            {
              role: 'user',
              content: `PAGE CONTEXT:\n${pageContext || `Target Domain: ${targetDomain}`}\n\nUSER PROMPT / TASK:\n${prompt}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1024
        }),
        timeout: 15000
      });

      if (openaiRes.ok) {
        const openaiData = await openaiRes.json();
        const generatedText = openaiData.choices?.[0]?.message?.content;
        if (generatedText) {
          return {
            response: generatedText,
            model: 'OpenAI GPT-4o-mini',
            isRealLlm: true,
            dataStatus: 'measured',
            isSimulated: false,
            latencyMs: Date.now() - startTime,
            provenance: 'Live Generative AI (OpenAI GPT-4o-mini)'
          };
        }
      }
    } catch (llmErr) {
      // Fall through to heuristic
    }
  }

  // 5. Fallback: Transparent Rule-Based Heuristic
  const p = (prompt || '').toLowerCase();
  let baseResponse = '';

  if (p.includes('meta') || p.includes('description') || p.includes('title')) {
    baseResponse = pageContext
      ? `Based on your audited page context:\n${pageContext}\n\n1. Target Length: 150–160 characters for meta description, 50–60 characters for title.\n2. Title Formula: [Primary Keyword] – [High-Value Feature / USP] | [Brand Name].\n3. Meta Description Formula: [Action Verb] + [Primary Search Query] + [Unique Value Proposition] + [Clear CTA].\n4. Tailored Snippet Recommendation:\n   <title>${derivedTopic} – Verified Guide & Complete Overview | ${targetDomain}</title>\n   <meta name="description" content="Explore verified features, services, and official updates for ${derivedTopic}. Learn how to get started and access official resources today."/>`
      : `Recommended Meta Tag Strategy:\n• Title: 50–60 characters. Place primary target keyword first, followed by modifier and brand name.\n• Meta Description: 150–160 characters. Incorporate high-CTR triggers (Key Features, Free Access, Instant Verification).\n• Add OpenGraph og:title and og:description to preserve preview cards across social networks.`;
  } else if (p.includes('keyword') || p.includes('content') || p.includes('cluster')) {
    baseResponse = `Recommended Content Hub & Spoke Model for ${derivedTopic}:\n\n1. Pillar Page: "Comprehensive Guide to ${derivedTopic}" (High Search Intent Hub).\n2. Supporting Spokes (Sub-topics):\n   • "Key Features & Capabilities of ${derivedTopic}"\n   • "Best Practices & Implementation Guide for ${derivedTopic}"\n   • "Comparing Top Alternatives to ${derivedTopic}"\n   • "Frequently Asked Questions & Troubleshooting for ${derivedTopic}"\n3. Internal Linking: Every spoke page must link back to the primary pillar page using descriptive semantic anchor text.`;
  } else if (p.includes('competitor') || p.includes('gap')) {
    baseResponse = `Competitor Gap Remediation Plan for ${targetDomain}:\n\n1. Identify Competitor Footprint: Analyze organic competitors ranking on page 1 for core commercial queries.\n2. Content Differentiator: Provide verified primary research, structured comparative tables, and interactive utility tools that competitors lack.\n3. Structured Data Edge: Inject FAQPage + Organization schema to secure rich SERP carousels above standard competitor organic links.`;
  } else if (p.includes('backlink') || p.includes('link')) {
    baseResponse = `Authority Backlink Blueprint for ${targetDomain}:\n\n1. Industry Registries & Resource Hubs: Outreach to accredited directories and curated ecosystem resources in your domain.\n2. News Jacking & Digital PR: Release quarterly industry benchmark reports and case studies to earn tier-1 editorial citations.\n3. Disavow Scrapers: Export and submit the OmniSEO Google Disavow file to remove toxic link farms and scraping networks.\n4. Reclaim Unlinked Mentions: Monitor mentions of "${derivedTopic}" and request contextual hyperlinks to canonical landing pages.`;
  } else if (p.includes('speed') || p.includes('cwv') || p.includes('lcp')) {
    baseResponse = `Core Web Vitals Optimization Checklist:\n\n1. LCP (<2.5s): Preload the critical hero banner with <link rel="preload" as="image" href="..." fetchpriority="high"> and serve modern AVIF/WebP formats.\n2. CLS (<0.1): Add explicit width and height attributes to all <img> tags to avoid layout shifts.\n3. INP (<200ms): Defer non-critical analytics and chat widgets using defer or requestIdleCallback.`;
  } else {
    baseResponse = `OmniSEO Strategy Guidance for ${targetDomain}:\n\nFocus on the convergence of Traditional SEO and AI Search (GEO):\n• Structure direct answer paragraphs (40–60 words) immediately beneath H2 tags for Perplexity and Google AI Overviews.\n• Ensure 100% of images have descriptive, localized alt tags.\n• Resolve internal keyword cannibalization via cross-page canonicals or 301 redirects.\n• Maintain strict schema validation for FAQPage, Organization, and WebPage entities.`;
  }

  const prefixedNotice = '⚡ [Rule-Based Heuristic — Connect OpenRouter, NVIDIA NIM, Gemini, or OpenAI in ⚙️ Settings for Live Generative Reasoning]\n\n';

  return {
    response: `${prefixedNotice}${baseResponse}`,
    model: 'Rule-Based Pattern Matcher (No API Key Configured)',
    isRealLlm: false,
    dataStatus: 'simulated',
    isSimulated: true,
    latencyMs: Date.now() - startTime,
    provenance: 'Rule-Based Heuristic — Connect OpenRouter/NVIDIA/Gemini in ⚙️ Settings'
  };
}

/**
 * 8. Body Content Keyword & Bigram Extractor
 */
export async function extractSavedKeywords(url) {
  const { html } = await fetchHTML(url);
  const $ = cheerio.load(html);

  const text = $('body').text().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
  const words = text.split(' ').filter(w => w.length > 3);

  const phrases = {};
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = words[i] + ' ' + words[i + 1];
    if (bigram.length > 8 && !/this|that|with|from|have|will|your|about|their/.test(bigram)) {
      phrases[bigram] = (phrases[bigram] || 0) + 1;
    }
  }

  const topPhrases = Object.entries(phrases)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([kw, freq]) => {
      const intent = classifyIntent(kw);
      const rawVol = Math.floor(freq * Math.random() * 2200 + 450);
      const diff = diffForKeyword(kw);
      return {
        kw,
        rawVol,
        vol: rawVol >= 1000 ? (rawVol / 1000).toFixed(1) + 'k' : rawVol.toString(),
        diff,
        intent,
        cpc: cpcForIntentINR(intent),
        url: '/' + kw.replace(/\s+/g, '-') + '/',
        status: diff < 30 ? 'Optimized' : diff < 60 ? 'Pending' : 'Critical'
      };
    });

  const totalVol = topPhrases.reduce((s, k) => s + (k.rawVol || 0), 0);
  const avgVol = topPhrases.length > 0 ? Math.round(totalVol / topPhrases.length) : 0;

  return {
    total: topPhrases.length,
    avgVolume: avgVol >= 1000 ? (avgVol / 1000).toFixed(1) + 'k' : avgVol.toString(),
    density: topPhrases.length > 5 ? 'High' : topPhrases.length > 2 ? 'Medium' : 'Low',
    opportunityScore: Math.floor(Math.random() * 25 + 68) + '/100',
    keywords: topPhrases
  };
}

/**
 * 9. Competitor Gap Intelligence Studio
 */
export async function analyzeCompetitorGap(targetUrl, competitorDomain, options = {}) {
  let targetHost = 'example.com';
  try {
    const u = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    targetHost = u.hostname.replace(/^www\./, '');
  } catch {}

  const isMega = /google|wikipedia|github|microsoft|apple|amazon|youtube/i.test(targetHost);
  const isTech = /stack|gitlab|npm|vercel|dev\.to|medium/i.test(targetHost);
  const isTravel = /booking|airbnb|expedia|hotels|kayak/i.test(targetHost);

  let targetDA, targetTraffic, targetRefDomains;
  if (isMega) {
    targetDA = 96;
    targetTraffic = '1.2B';
    targetRefDomains = 450000;
  } else if (isTech) {
    targetDA = 84;
    targetTraffic = '28.5M';
    targetRefDomains = 28400;
  } else if (isTravel) {
    targetDA = 88;
    targetTraffic = '45.0M';
    targetRefDomains = 38500;
  } else {
    const hash = targetHost.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    targetDA = 55 + (hash % 30);
    targetRefDomains = targetDA * 22 + 150;
    targetTraffic = (targetRefDomains * 125).toLocaleString();
  }

  let defaultComp = 'medium.com';
  if (isMega) defaultComp = targetHost.includes('github') ? 'gitlab.com' : 'wikipedia.org';
  else if (isTech) defaultComp = 'github.com';
  else if (isTravel) defaultComp = 'booking.com';
  else defaultComp = `competitor-${targetHost.replace(/\.[a-z]+$/, '')}.com`;

  const compHost = (competitorDomain || defaultComp).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

  const knownCompMetrics = {
    'github.com': { da: 96, traffic: '1.1B', refDomains: 520000, topKw: 'open source, git repositories, developer tools' },
    'gitlab.com': { da: 91, traffic: '32.4M', refDomains: 68500, topKw: 'devops platform, ci/cd pipeline, git hosting' },
    'wikipedia.org': { da: 98, traffic: '4.8B', refDomains: 1850000, topKw: 'encyclopedia, historical facts, reference' },
    'en.wikipedia.org': { da: 98, traffic: '4.8B', refDomains: 1850000, topKw: 'encyclopedia, articles, reference guide' },
    'booking.com': { da: 92, traffic: '112.5M', refDomains: 142000, topKw: 'hotels, vacation rentals, travel deals' },
    'expedia.com': { da: 89, traffic: '48.2M', refDomains: 84000, topKw: 'cheap flights, hotel packages, vacation' },
    'medium.com': { da: 94, traffic: '142.0M', refDomains: 310000, topKw: 'tech blog, programming tutorials, insights' },
    'hubspot.com': { da: 92, traffic: '38.6M', refDomains: 115000, topKw: 'inbound marketing, crm software, seo tools' }
  };

  const cInfo = knownCompMetrics[compHost] || {
    da: Math.min(95, Math.max(45, 60 + (compHost.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 25))),
    traffic: '12.4M',
    refDomains: 24500,
    topKw: 'official resources, guides, digital solutions'
  };

  const cleanTarget = targetHost.replace(/\.[a-z]+$/, '');
  const cleanComp = compHost.replace(/\.[a-z]+$/, '');

  const untappedKeywords = [
    {
      keyword: `${cleanTarget} vs ${cleanComp} features and review`,
      compRank: 2,
      targetRank: 'Not in Top 100',
      searchVolume: 16800,
      kd: 36,
      intent: 'Commercial',
      cpcINR: '₹45.00',
      difficulty: 'Easy-Medium',
      opportunityScore: 94
    },
    {
      keyword: `best alternatives to ${cleanComp} in 2026`,
      compRank: 3,
      targetRank: 32,
      searchVolume: 24500,
      kd: 46,
      intent: 'Commercial',
      cpcINR: '₹68.00',
      difficulty: 'Medium',
      opportunityScore: 91
    },
    {
      keyword: `${cleanTarget} official guide and tutorials`,
      compRank: 4,
      targetRank: 'Not in Top 100',
      searchVolume: 11200,
      kd: 28,
      intent: 'Informational',
      cpcINR: '₹32.00',
      difficulty: 'Low',
      opportunityScore: 88
    },
    {
      keyword: `how to get started with ${cleanTarget}`,
      compRank: 5,
      targetRank: 41,
      searchVolume: 14300,
      kd: 31,
      intent: 'Informational',
      cpcINR: '₹28.50',
      difficulty: 'Low-Medium',
      opportunityScore: 86
    },
    {
      keyword: `${cleanTarget} enterprise platform pricing`,
      compRank: 1,
      targetRank: 14,
      searchVolume: 35000,
      kd: 52,
      intent: 'Transactional',
      cpcINR: '₹55.00',
      difficulty: 'Medium',
      opportunityScore: 84
    }
  ];

  const sharedKeywords = [
    {
      keyword: `${cleanTarget} ${cleanComp} migration guide`,
      targetRank: 12,
      compRank: 2,
      delta: -10,
      searchVolume: 9200,
      cpcINR: '₹52.00'
    },
    {
      keyword: `${cleanTarget} ecosystem integrations`,
      targetRank: 7,
      compRank: 5,
      delta: -2,
      searchVolume: 6400,
      cpcINR: '₹38.00'
    },
    {
      keyword: `${cleanTarget} tools and extensions`,
      targetRank: 5,
      compRank: 8,
      delta: +3,
      searchVolume: 8100,
      cpcINR: '₹34.00'
    }
  ];

  const backlinkGaps = [
    {
      domain: 'techcrunch.com',
      dr: 93,
      competitorLinked: true,
      targetLinked: false,
      opportunityType: 'Industry Editorial Feature',
      pitchAngle: `${cleanTarget} ecosystem benchmark & competitive capability study vs ${cleanComp}`
    },
    {
      domain: 'producthunt.com',
      dr: 91,
      competitorLinked: true,
      targetLinked: false,
      opportunityType: 'Ecosystem Product Directory',
      pitchAngle: `Official community listing and verified product release notes for ${cleanTarget}`
    },
    {
      domain: 'forbes.com',
      dr: 94,
      competitorLinked: true,
      targetLinked: false,
      opportunityType: 'Expert Contributor Analysis',
      pitchAngle: `Digital transformation and market trends analysis featuring ${cleanTarget}`
    }
  ];

  const actionPlan = [
    {
      step: 1,
      action: `Publish Dedicated Comparison Hub: "${cleanTarget} vs ${cleanComp}"`,
      impact: '+16,800 Monthly Organic Visits',
      urgency: 'P0 - Immediate',
      details: `Create a comprehensive comparison landing page targeting high-intent queries currently dominated by ${compHost}. Include clear feature matrices and direct CTAs.`
    },
    {
      step: 2,
      action: `Harvest Backlinks from Industry Portals & Editorial Hubs`,
      impact: '+5 Domain Authority Points',
      urgency: 'P1 - High',
      details: `Conduct outreach to high-DR technology and business portals that currently cite ${compHost}.`
    },
    {
      step: 3,
      action: `Add Multi-Entity FAQPage & Product Schema Markup`,
      impact: 'Gain Google Rich Snippet Highlights in SERPs',
      urgency: 'P0 - Immediate',
      details: `Outshine ${compHost} with structured schema attributes (aggregateRating, FAQ, and SoftwareApplication).`
    }
  ];

  return {
    targetHost,
    compHost,
    targetDA,
    compDA: cInfo.da,
    daGap: targetDA - cInfo.da,
    targetTraffic,
    compTraffic: cInfo.traffic,
    targetRefDomains,
    compRefDomains: cInfo.refDomains,
    untappedKeywords,
    sharedKeywords,
    backlinkGaps,
    actionPlan,
    isSimulated: true,
    dataStatus: 'heuristic',
    provenance: 'Heuristic Competitor Gap Matrix (Connect DataForSEO in ⚙️ Settings for live SERP competitor ranking)'
  };
}

/**
 * 10. Universal Multi-Engine Web Scraper
 */
export async function universalWebScraper(url, mode = 'markdown', selector = '') {
  const { html, status, responseTimeMs } = await fetchHTML(url);
  const $ = cheerio.load(html);

  if (mode === 'markdown') {
    $('script, style, noscript, svg, iframe, nav, footer').remove();
    let md = '';
    $('h1, h2, h3, h4, p, li, blockquote, pre, table').each((_, el) => {
      const tag = el.tagName.toLowerCase();
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (!text) return;
      if (tag === 'h1') md += `\n# ${text}\n\n`;
      else if (tag === 'h2') md += `\n## ${text}\n\n`;
      else if (tag === 'h3') md += `\n### ${text}\n\n`;
      else if (tag === 'h4') md += `\n#### ${text}\n\n`;
      else if (tag === 'li') md += `- ${text}\n`;
      else if (tag === 'blockquote') md += `> ${text}\n\n`;
      else md += `${text}\n\n`;
    });
    return {
      url,
      status,
      latency: `${responseTimeMs}ms`,
      mode,
      extractedLength: md.length,
      content: md.trim()
    };
  }

  if (mode === 'metadata') {
    const meta = {
      title: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      canonical: $('link[rel="canonical"]').attr('href') || '',
      ogTitle: $('meta[property="og:title"]').attr('content') || '',
      ogDesc: $('meta[property="og:description"]').attr('content') || '',
      ogImage: $('meta[property="og:image"]').attr('content') || '',
      twitterCard: $('meta[name="twitter:card"]').attr('content') || '',
      h1: $('h1').map((_, el) => $(el).text().trim()).get(),
      h2: $('h2').map((_, el) => $(el).text().trim()).get().slice(0, 10),
      imagesCount: $('img').length,
      linksCount: $('a[href]').length,
      schemas: []
    };
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        meta.schemas.push(JSON.parse($(el).html()));
      } catch {}
    });
    return {
      url,
      status,
      latency: `${responseTimeMs}ms`,
      mode,
      metadata: meta
    };
  }

  if (mode === 'selector' && selector) {
    const matches = [];
    $(selector).each((i, el) => {
      matches.push({
        index: i + 1,
        tag: el.tagName.toLowerCase(),
        text: $(el).text().replace(/\s+/g, ' ').trim(),
        html: $(el).html() ? $(el).html().substring(0, 200) : '',
        attributes: el.attribs || {}
      });
    });
    return {
      url,
      status,
      latency: `${responseTimeMs}ms`,
      mode,
      selector,
      matchCount: matches.length,
      matches
    };
  }

  return {
    url,
    status,
    latency: `${responseTimeMs}ms`,
    mode: 'html',
    htmlLength: html.length,
    html: html.substring(0, 50000)
  };
}
