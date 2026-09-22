import fetch from 'node-fetch';

/**
 * In-memory Cache for Google PageSpeed Insights & Core Web Vitals
 * Key format: `${url.toLowerCase()}__${strategy}`
 * Value: { data: object, timestamp: number }
 * TTL: 6 hours (21,600,000 ms)
 */
const psiCache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Default Verified Google PageSpeed Insights API Key
export const DEFAULT_PSI_KEY = 'AIzaSyApEZWT3r73AW7BFixZ1WiAUMMycWNKfkw';

/**
 * Generate official deep links to PageSpeed Insights and CrUX Vis
 */
export function generatePageSpeedLinks(url, strategy = 'mobile') {
  const normalizedUrl = (url || '').trim();
  const formFactor = strategy.toLowerCase() === 'desktop' ? 'desktop' : 'mobile';
  const cruxDevice = strategy.toLowerCase() === 'desktop' ? 'DESKTOP' : 'PHONE';
  return {
    pagespeedWebDev: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(normalizedUrl)}&form_factor=${formFactor}`,
    cruxVis: `https://cruxvis.withgoogle.com/#/?url=${encodeURIComponent(normalizedUrl)}&device=${cruxDevice}&identifier=url`
  };
}

/**
 * Categorize a real-user CrUX percentile metric according to official Google CWV thresholds
 */
function evaluateFieldMetric(key, val, rawCategory) {
  if (val === null || val === undefined || isNaN(val)) {
    return {
      status: 'INSUFFICIENT_DATA',
      rating: 'No Data',
      color: 'slate',
      displayValue: '—'
    };
  }

  const num = Number(val);

  switch (key) {
    case 'lcp': {
      const displayValue = (num / 1000).toFixed(2) + 's';
      if (num <= 2500) return { status: 'GOOD', rating: 'Good', color: 'emerald', displayValue, benchmark: '<= 2.5s' };
      if (num <= 4000) return { status: 'NEEDS_IMPROVEMENT', rating: 'Needs Improvement', color: 'amber', displayValue, benchmark: '2.5s - 4.0s' };
      return { status: 'POOR', rating: 'Poor', color: 'rose', displayValue, benchmark: '> 4.0s' };
    }
    case 'inp': {
      const displayValue = Math.round(num) + 'ms';
      if (num <= 200) return { status: 'GOOD', rating: 'Good', color: 'emerald', displayValue, benchmark: '<= 200ms' };
      if (num <= 500) return { status: 'NEEDS_IMPROVEMENT', rating: 'Needs Improvement', color: 'amber', displayValue, benchmark: '200ms - 500ms' };
      return { status: 'POOR', rating: 'Poor', color: 'rose', displayValue, benchmark: '> 500ms' };
    }
    case 'cls': {
      // In CrUX / PSI, CLS percentile is multiplied by 100 if >= 1 or raw fraction if < 1
      const clsScore = num >= 1 ? parseFloat((num / 100).toFixed(3)) : parseFloat(num.toFixed(3));
      const displayValue = clsScore.toFixed(2);
      if (clsScore <= 0.1) return { status: 'GOOD', rating: 'Good', color: 'emerald', displayValue, numericValue: clsScore, benchmark: '<= 0.10' };
      if (clsScore <= 0.25) return { status: 'NEEDS_IMPROVEMENT', rating: 'Needs Improvement', color: 'amber', displayValue, numericValue: clsScore, benchmark: '0.10 - 0.25' };
      return { status: 'POOR', rating: 'Poor', color: 'rose', displayValue, numericValue: clsScore, benchmark: '> 0.25' };
    }
    case 'fcp': {
      const displayValue = (num / 1000).toFixed(2) + 's';
      if (num <= 1800) return { status: 'GOOD', rating: 'Good', color: 'emerald', displayValue, benchmark: '<= 1.8s' };
      if (num <= 3000) return { status: 'NEEDS_IMPROVEMENT', rating: 'Needs Improvement', color: 'amber', displayValue, benchmark: '1.8s - 3.0s' };
      return { status: 'POOR', rating: 'Poor', color: 'rose', displayValue, benchmark: '> 3.0s' };
    }
    case 'ttfb': {
      const displayValue = Math.round(num) + 'ms';
      if (num <= 800) return { status: 'GOOD', rating: 'Good', color: 'emerald', displayValue, benchmark: '<= 800ms' };
      if (num <= 1800) return { status: 'NEEDS_IMPROVEMENT', rating: 'Needs Improvement', color: 'amber', displayValue, benchmark: '800ms - 1800ms' };
      return { status: 'POOR', rating: 'Poor', color: 'rose', displayValue, benchmark: '> 1800ms' };
    }
    default:
      return { status: 'MEASURED', rating: rawCategory || 'Measured', color: 'sky', displayValue: String(num) };
  }
}

/**
 * Parses CrUX loadingExperience object from PSI v5
 */
function parseLoadingExperience(exp, scope = 'url') {
  if (!exp || !exp.metrics) {
    return {
      hasData: false,
      scope,
      overallCategory: 'NONE',
      cwvStatus: 'INSUFFICIENT_DATA',
      metrics: {}
    };
  }

  const raw = exp.metrics;
  const lcpData = raw.LARGEST_CONTENTFUL_PAINT_MS;
  const inpData = raw.INTERACTION_TO_NEXT_PAINT;
  const clsData = raw.CUMULATIVE_LAYOUT_SHIFT_SCORE;
  const fcpData = raw.FIRST_CONTENTFUL_PAINT_MS;
  const ttfbData = raw.EXPERIMENTAL_TIME_TO_FIRST_BYTE;

  const lcpEval = evaluateFieldMetric('lcp', lcpData?.percentile, lcpData?.category);
  const inpEval = evaluateFieldMetric('inp', inpData?.percentile, inpData?.category);
  const clsEval = evaluateFieldMetric('cls', clsData?.percentile, clsData?.category);
  const fcpEval = evaluateFieldMetric('fcp', fcpData?.percentile, fcpData?.category);
  const ttfbEval = evaluateFieldMetric('ttfb', ttfbData?.percentile, ttfbData?.category);

  // Overall Core Web Vitals Status
  let cwvStatus = 'INSUFFICIENT_DATA';
  const cat = exp.overall_category;
  if (cat === 'FAST') cwvStatus = 'PASSED';
  else if (cat === 'AVERAGE') cwvStatus = 'NEEDS_IMPROVEMENT';
  else if (cat === 'SLOW') cwvStatus = 'FAILED';
  else if (lcpEval.status !== 'INSUFFICIENT_DATA' && inpEval.status !== 'INSUFFICIENT_DATA' && clsEval.status !== 'INSUFFICIENT_DATA') {
    if (lcpEval.status === 'GOOD' && inpEval.status === 'GOOD' && clsEval.status === 'GOOD') cwvStatus = 'PASSED';
    else if (lcpEval.status === 'POOR' || inpEval.status === 'POOR' || clsEval.status === 'POOR') cwvStatus = 'FAILED';
    else cwvStatus = 'NEEDS_IMPROVEMENT';
  }

  return {
    hasData: true,
    scope,
    overallCategory: cat || 'UNKNOWN',
    cwvStatus,
    metrics: {
      lcp: {
        percentileMs: lcpData?.percentile ?? null,
        category: lcpData?.category || lcpEval.rating,
        displayValue: lcpEval.displayValue,
        status: lcpEval.status,
        color: lcpEval.color,
        distributions: lcpData?.distributions || []
      },
      inp: {
        percentileMs: inpData?.percentile ?? null,
        category: inpData?.category || inpEval.rating,
        displayValue: inpEval.displayValue,
        status: inpEval.status,
        color: inpEval.color,
        distributions: inpData?.distributions || []
      },
      cls: {
        percentile: clsEval.numericValue ?? null,
        rawPercentile: clsData?.percentile ?? null,
        category: clsData?.category || clsEval.rating,
        displayValue: clsEval.displayValue,
        status: clsEval.status,
        color: clsEval.color,
        distributions: clsData?.distributions || []
      },
      fcp: {
        percentileMs: fcpData?.percentile ?? null,
        category: fcpData?.category || fcpEval.rating,
        displayValue: fcpEval.displayValue,
        status: fcpEval.status,
        color: fcpEval.color,
        distributions: fcpData?.distributions || []
      },
      ttfb: {
        percentileMs: ttfbData?.percentile ?? null,
        category: ttfbData?.category || ttfbEval.rating,
        displayValue: ttfbEval.displayValue,
        status: ttfbEval.status,
        color: ttfbEval.color,
        distributions: ttfbData?.distributions || []
      }
    }
  };
}

/**
 * Google PageSpeed Insights & Core Web Vitals Adapter
 * Queries the official Google PSI v5 REST endpoint.
 * Extracts:
 * 1. Real-User Field Experience (CrUX per-page LCP, INP, CLS, FCP, TTFB + Origin aggregation)
 * 2. Lab Diagnostics (Lighthouse performance score, LCP, TBT, CLS, Speed Index, FCP)
 * 3. Deep links to official Google PageSpeed & CrUX Vis visualizers
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
      success: true,
      ...cachedEntry.data,
      fromCache: true,
      cachedAgeSec: ageSec,
      durationMs: Date.now() - startTime
    };
  }

  // 2. Resolve API Key priority: customApiKey -> GOOGLE_PSI_API_KEY -> PAGESPEED_API_KEY -> DEFAULT_PSI_KEY
  const resolvedApiKey = customApiKey || process.env.GOOGLE_PSI_API_KEY || process.env.PAGESPEED_API_KEY || DEFAULT_PSI_KEY;
  const keyParam = resolvedApiKey ? `&key=${encodeURIComponent(resolvedApiKey)}` : '';
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalizedUrl)}&strategy=${strategy}${keyParam}`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': 'OmniSEO-OS/2.0 (PageSpeed Insights Real-User Inspector; +https://pagespeed.web.dev)'
      },
      timeout: 30000
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`PSI API responded with status ${res.status}: ${errorText.substring(0, 150)}`);
    }

    const data = await res.json();
    const lighthouse = data.lighthouseResult || {};
    const categories = lighthouse.categories || {};
    const audits = lighthouse.audits || {};

    const performanceScore = categories.performance?.score !== undefined && categories.performance?.score !== null
      ? Math.round(categories.performance.score * 100)
      : null;
    const seoScore = categories.seo?.score !== undefined && categories.seo?.score !== null
      ? Math.round(categories.seo.score * 100)
      : null;
    const accessibilityScore = categories.accessibility?.score !== undefined && categories.accessibility?.score !== null
      ? Math.round(categories.accessibility.score * 100)
      : null;
    const bestPracticesScore = categories['best-practices']?.score !== undefined && categories['best-practices']?.score !== null
      ? Math.round(categories['best-practices'].score * 100)
      : null;

    const lcpAudit = audits['largest-contentful-paint'] || {};
    const clsAudit = audits['cumulative-layout-shift'] || {};
    const tbtAudit = audits['total-blocking-time'] || {};
    const fcpAudit = audits['first-contentful-paint'] || {};
    const speedIndexAudit = audits['speed-index'] || {};

    // 3. Real-User Field Experience (CrUX)
    const urlFieldExp = parseLoadingExperience(data.loadingExperience, 'url');
    const originFieldExp = parseLoadingExperience(data.originLoadingExperience, 'origin');
    const effectiveField = urlFieldExp.hasData ? urlFieldExp : originFieldExp;

    const result = {
      success: true,
      targetUrl: normalizedUrl,
      provider: 'Google PageSpeed Insights v5',
      strategy,
      durationMs: Date.now() - startTime,
      dataStatus: 'measured',
      isSimulated: false,
      isConfigured: Boolean(resolvedApiKey),
      fromCache: false,
      performanceScore,
      seoScore,
      accessibilityScore,
      bestPracticesScore,

      // Real-user Field Experience (CrUX)
      fieldExperience: {
        hasUrlData: urlFieldExp.hasData,
        hasOriginData: originFieldExp.hasData,
        scope: effectiveField.scope,
        overallCategory: effectiveField.overallCategory,
        cwvStatus: effectiveField.cwvStatus,
        metrics: effectiveField.metrics,
        urlData: urlFieldExp.hasData ? urlFieldExp : null,
        originData: originFieldExp.hasData ? originFieldExp : null
      },

      // Lab Experience (Lighthouse Simulation)
      labExperience: {
        performanceScore,
        accessibilityScore,
        bestPracticesScore,
        seoScore,
        metrics: {
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
        }
      },

      // Backwards-compatible cwvMetrics (for existing orchestrator, exports & test suites)
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
        .slice(0, 6)
        .map(k => ({
          id: k,
          title: audits[k].title,
          savings: audits[k].displayValue,
          description: audits[k].description
        })),

      // Official Direct Deep Links
      links: generatePageSpeedLinks(normalizedUrl, strategy),

      isFallback: false,
      provenance: 'Live Google PageSpeed Insights v5 API (Real-User CrUX + Lighthouse Lab)'
    };

    // Store in 6-hour TTL cache
    psiCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  } catch (err) {
    // If live call fails but we have a cached result, return it with warning
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
      success: false,
      targetUrl: normalizedUrl,
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
      accessibilityScore: null,
      bestPracticesScore: null,
      fieldExperience: {
        hasUrlData: false,
        hasOriginData: false,
        scope: 'none',
        overallCategory: 'UNAVAILABLE',
        cwvStatus: 'INSUFFICIENT_DATA',
        metrics: {}
      },
      labExperience: {
        performanceScore: null,
        metrics: {}
      },
      cwvMetrics: {
        lcp: { displayValue: '—', numericValueMs: null, status: 'UNAVAILABLE' },
        cls: { displayValue: '—', numericValue: null, status: 'UNAVAILABLE' },
        tbt: { displayValue: '—', numericValueMs: null, status: 'UNAVAILABLE' },
        fcp: { displayValue: '—', numericValueMs: null },
        speedIndex: { displayValue: '—' }
      },
      diagnosticOpportunities: [],
      links: generatePageSpeedLinks(normalizedUrl, strategy),
      message: 'Connect a free Google PageSpeed API key in ⚙️ Settings or .env to fetch live Lighthouse & Core Web Vitals diagnostics.'
    };
  }
}

/**
 * Batch analysis for multiple page URLs
 * Analyzes each page URL sequentially/with light pacing to respect API limits,
 * returning per-page real-user CrUX vitals and Lighthouse lab scores.
 */
export async function batchFetchPageSpeed(urls = [], strategy = 'mobile', apiKey = null, delayMs = 600) {
  if (!Array.isArray(urls)) {
    if (typeof urls === 'string') {
      urls = urls.split(/[\r\n,]+/).map(u => u.trim()).filter(Boolean);
    } else {
      urls = [];
    }
  }

  // Deduplicate and cap at 20 URLs per batch run
  const cleanUrls = Array.from(new Set(urls.map(u => u.trim()).filter(u => /^https?:\/\//i.test(u)))).slice(0, 20);

  const results = [];
  for (let i = 0; i < cleanUrls.length; i++) {
    const u = cleanUrls[i];
    try {
      const pageResult = await fetchPageSpeed(u, strategy, apiKey);
      results.push(pageResult);
    } catch (err) {
      results.push({
        targetUrl: u,
        dataStatus: 'unavailable',
        error: err.message,
        performanceScore: null
      });
    }

    // Polite pacing delay between sequential requests
    if (i < cleanUrls.length - 1 && delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  // Calculate batch summary stats
  const successful = results.filter(r => r.dataStatus === 'measured');
  const avgLabScore = successful.length > 0
    ? Math.round(successful.reduce((acc, r) => acc + (r.performanceScore || 0), 0) / successful.length)
    : null;

  return {
    success: true,
    totalUrls: cleanUrls.length,
    completedCount: successful.length,
    strategy,
    avgLabScore,
    results
  };
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
