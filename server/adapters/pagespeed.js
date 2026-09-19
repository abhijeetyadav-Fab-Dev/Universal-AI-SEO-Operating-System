import fetch from 'node-fetch';

/**
 * In-memory Cache for Google PageSpeed Insights & Core Web Vitals
 * Key format: `${url.toLowerCase()}__${strategy}`
 * Value: { data: object, timestamp: number }
 * TTL: 6 hours (21,600,000 ms)
 */
const psiCache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Google PageSpeed Insights & Core Web Vitals Adapter
 * Queries the official Google PSI v5 REST endpoint (Free endpoint).
 * Extracts Lab Metrics (LCP, FID/TBT, CLS, Speed Index, FCP) and Overall Performance Score.
 * Features 6-hour TTL in-memory caching and custom API key support.
 */
export async function fetchPageSpeed(url, strategy = 'mobile', customApiKey = null) {
  const startTime = Date.now();
  const normalizedUrl = (url || '').trim();
  const cacheKey = `${normalizedUrl.toLowerCase()}__${strategy}`;

  // 1. Check in-memory cache
  const cachedEntry = psiCache.get(cacheKey);
  const now = Date.now();
  if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_TTL_MS) {
    const ageSec = Math.floor((now - cachedEntry.timestamp) / 1000);
    return {
      ...cachedEntry.data,
      fromCache: true,
      cachedAgeSec: ageSec,
      durationMs: Date.now() - startTime
    };
  }

  // 2. Resolve API Key priority: customApiKey -> GOOGLE_PSI_API_KEY -> PAGESPEED_API_KEY
  const resolvedApiKey = customApiKey || process.env.GOOGLE_PSI_API_KEY || process.env.PAGESPEED_API_KEY || '';
  const keyParam = resolvedApiKey ? `&key=${encodeURIComponent(resolvedApiKey)}` : '';
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalizedUrl)}&strategy=${strategy}${keyParam}`;

  try {
    const res = await fetch(endpoint, { timeout: 25000 });
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`PSI API responded with status ${res.status}: ${errorText.substring(0, 150)}`);
    }

    const data = await res.json();
    const lighthouse = data.lighthouseResult || {};
    const categories = lighthouse.categories || {};
    const audits = lighthouse.audits || {};

    const performanceScore = Math.round((categories.performance?.score || 0) * 100);
    const seoScore = Math.round((categories.seo?.score || 0) * 100);

    const lcpAudit = audits['largest-contentful-paint'] || {};
    const clsAudit = audits['cumulative-layout-shift'] || {};
    const tbtAudit = audits['total-blocking-time'] || {};
    const fcpAudit = audits['first-contentful-paint'] || {};
    const speedIndexAudit = audits['speed-index'] || {};

    const result = {
      provider: 'Google PageSpeed Insights v5',
      strategy,
      durationMs: Date.now() - startTime,
      dataStatus: 'measured',
      isSimulated: false,
      isConfigured: Boolean(resolvedApiKey),
      fromCache: false,
      performanceScore,
      seoScore,
      cwvMetrics: {
        lcp: {
          score: lcpAudit.score,
          displayValue: lcpAudit.displayValue || 'N/A',
          numericValueMs: Math.round(lcpAudit.numericValue || 0),
          status: (lcpAudit.numericValue || 0) <= 2500 ? 'GOOD' : (lcpAudit.numericValue || 0) <= 4000 ? 'NEEDS_IMPROVEMENT' : 'POOR'
        },
        cls: {
          score: clsAudit.score,
          displayValue: clsAudit.displayValue || 'N/A',
          numericValue: parseFloat((clsAudit.numericValue || 0).toFixed(3)),
          status: (clsAudit.numericValue || 0) <= 0.1 ? 'GOOD' : (clsAudit.numericValue || 0) <= 0.25 ? 'NEEDS_IMPROVEMENT' : 'POOR'
        },
        tbt: {
          score: tbtAudit.score,
          displayValue: tbtAudit.displayValue || 'N/A',
          numericValueMs: Math.round(tbtAudit.numericValue || 0),
          status: (tbtAudit.numericValue || 0) <= 200 ? 'GOOD' : (tbtAudit.numericValue || 0) <= 600 ? 'NEEDS_IMPROVEMENT' : 'POOR'
        },
        fcp: {
          displayValue: fcpAudit.displayValue || 'N/A',
          numericValueMs: Math.round(fcpAudit.numericValue || 0)
        },
        speedIndex: {
          displayValue: speedIndexAudit.displayValue || 'N/A'
        }
      },
      diagnosticOpportunities: Object.keys(audits)
        .filter(k => audits[k].details?.type === 'opportunity' && (audits[k].numericValue || 0) > 100)
        .slice(0, 4)
        .map(k => ({
          id: k,
          title: audits[k].title,
          savings: audits[k].displayValue,
          description: audits[k].description
        })),
      isFallback: false,
      provenance: 'Live Google PageSpeed Insights v5 API'
    };

    // Store in 6-hour TTL cache
    psiCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  } catch (err) {
    // If live call fails but we have a stale cached result, return it with a notice
    if (cachedEntry) {
      return {
        ...cachedEntry.data,
        fromCache: true,
        isStale: true,
        warning: `Serving cached PageSpeed data (live refresh failed: ${err.message})`,
        durationMs: Date.now() - startTime
      };
    }

    // Honest handling: do not fabricate fake performance numbers
    return {
      provider: 'Google PageSpeed Insights v5',
      strategy,
      durationMs: Date.now() - startTime,
      dataStatus: 'unavailable',
      isConfigured: Boolean(resolvedApiKey),
      error: err.message,
      isFallback: true,
      fromCache: false,
      provenance: resolvedApiKey
        ? 'Google PSI API Rate-Limited or Connection Error'
        : 'Google PSI API Key Required (Connect Free Key in ⚙️ Settings for Live Core Web Vitals)',
      performanceScore: null,
      seoScore: null,
      cwvMetrics: {
        lcp: { displayValue: '—', numericValueMs: null, status: 'UNAVAILABLE' },
        cls: { displayValue: '—', numericValue: null, status: 'UNAVAILABLE' },
        tbt: { displayValue: '—', numericValueMs: null, status: 'UNAVAILABLE' },
        fcp: { displayValue: '—', numericValueMs: null },
        speedIndex: { displayValue: '—' }
      },
      diagnosticOpportunities: [],
      message: 'Connect a free Google PageSpeed API key in ⚙️ Settings or .env to fetch live Lighthouse & Core Web Vitals diagnostics.'
    };
  }
}

/**
 * Cache management helpers
 */
export function getPsiCacheStats() {
  return {
    size: psiCache.size,
    entries: Array.from(psiCache.keys()),
    ttlHours: CACHE_TTL_MS / (1000 * 60 * 60)
  };
}

export function clearPsiCache() {
  psiCache.clear();
}
