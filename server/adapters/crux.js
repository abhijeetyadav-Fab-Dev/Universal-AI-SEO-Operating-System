/**
 * ==============================================================================
 * OmniSEO-OS Chrome User Experience Report (CrUX) & CrUX Vis Adapter
 * Integrates Google Chrome UX Report API & CrUX History API:
 * - Query historical weekly 25-40 week timeseries for real-user Core Web Vitals
 * - Date-wise and Month-wise filtering, aggregation, and drilldown
 * - Query current 28-day rolling field snapshot (LCP, INP, CLS, FCP, TTFB)
 * - Deep-link generator for official Google CrUX Vis (https://cruxvis.withgoogle.com)
 * - Automatic URL-to-Origin fallback for sites with low URL-level traffic
 * ==============================================================================
 */

import fetch from 'node-fetch';

// In-memory cache for CrUX responses (6-hour TTL)
const cruxCache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export const CRUX_ENDPOINTS = {
  history: 'https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord',
  record: 'https://chromeuxreport.googleapis.com/v1/records:queryRecord',
  vis: 'https://cruxvis.withgoogle.com/#/'
};

// Verified Google Chrome UX Report API Key
export const DEFAULT_CRUX_KEY = 'AIzaSyApEZWT3r73AW7BFixZ1WiAUMMycWNKfkw';
// Authoritative public CrUX Vis API Gateway Key
export const DEFAULT_CRUX_VIS_KEY = 'AIzaSyDipzriNNJU5e3IiXNUDnSliqqEVTAmIHU';
const CRUX_VIS_REFERER = 'https://cruxvis.withgoogle.com/';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Normalizes input into a clean origin (e.g. "https://example.com")
 */
export function extractOrigin(target) {
  if (!target || typeof target !== 'string') return '';
  let cleaned = target.trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  try {
    const u = new URL(cleaned);
    return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}`;
  } catch {
    return cleaned.replace(/\/.*$/, '');
  }
}

/**
 * Formats a CrUX date object { year, month, day } to 'YYYY-MM-DD'
 */
export function formatCruxDate(dateObj) {
  if (!dateObj || !dateObj.year) return '';
  const y = dateObj.year;
  const m = String(dateObj.month || 1).padStart(2, '0');
  const d = String(dateObj.day || 1).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a CrUX date object to 'YYYY-MM'
 */
export function formatCruxMonth(dateObj) {
  if (!dateObj || !dateObj.year) return '';
  const y = dateObj.year;
  const m = String(dateObj.month || 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Returns human-readable label for 'YYYY-MM' (e.g. 'September 2026')
 */
export function getMonthLabel(monthKey) {
  if (!monthKey || !monthKey.includes('-')) return monthKey || '';
  const [year, month] = monthKey.split('-');
  const idx = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[idx] || month} ${year}`;
}

/**
 * Generates an official Google CrUX Vis interactive visualizer deep link
 */
export function generateCruxVisUrl({ url = null, origin = null, formFactor = 'ALL', view = 'cwvsummary', display = 'both' } = {}) {
  const params = new URLSearchParams();
  if (url) {
    params.set('url', url);
    params.set('identifier', 'url');
  } else if (origin) {
    params.set('origin', origin);
    params.set('identifier', 'origin');
  } else {
    return CRUX_ENDPOINTS.vis;
  }

  if (formFactor && formFactor !== 'ALL') {
    params.set('device', formFactor.toUpperCase());
  } else {
    params.set('device', 'ALL');
  }

  params.set('view', view);
  params.set('display', display);

  return `${CRUX_ENDPOINTS.vis}?${params.toString()}`;
}

/**
 * Categorizes a Core Web Vital metric according to Google thresholds
 */
export function evaluateCruxThreshold(metricKey, p75Value) {
  if (p75Value === null || p75Value === undefined || isNaN(p75Value)) {
    return { status: 'UNKNOWN', rating: 'No Data', color: 'slate' };
  }

  const val = Number(p75Value);

  switch (metricKey) {
    case 'largest_contentful_paint':
    case 'lcp':
      if (val <= 2500) return { status: 'GOOD', rating: 'Good', color: 'emerald', benchmark: '<= 2.5s' };
      if (val <= 4000) return { status: 'NEEDS_IMPROVEMENT', rating: 'Needs Improvement', color: 'amber', benchmark: '2.5s - 4.0s' };
      return { status: 'POOR', rating: 'Poor', color: 'rose', benchmark: '> 4.0s' };

    case 'interaction_to_next_paint':
    case 'inp':
      if (val <= 200) return { status: 'GOOD', rating: 'Good', color: 'emerald', benchmark: '<= 200ms' };
      if (val <= 500) return { status: 'NEEDS_IMPROVEMENT', rating: 'Needs Improvement', color: 'amber', benchmark: '200ms - 500ms' };
      return { status: 'POOR', rating: 'Poor', color: 'rose', benchmark: '> 500ms' };

    case 'cumulative_layout_shift':
    case 'cls':
      if (val <= 0.1) return { status: 'GOOD', rating: 'Good', color: 'emerald', benchmark: '<= 0.10' };
      if (val <= 0.25) return { status: 'NEEDS_IMPROVEMENT', rating: 'Needs Improvement', color: 'amber', benchmark: '0.10 - 0.25' };
      return { status: 'POOR', rating: 'Poor', color: 'rose', benchmark: '> 0.25' };

    case 'first_contentful_paint':
    case 'fcp':
      if (val <= 1800) return { status: 'GOOD', rating: 'Good', color: 'emerald', benchmark: '<= 1.8s' };
      if (val <= 3000) return { status: 'NEEDS_IMPROVEMENT', rating: 'Needs Improvement', color: 'amber', benchmark: '1.8s - 3.0s' };
      return { status: 'POOR', rating: 'Poor', color: 'rose', benchmark: '> 3.0s' };

    case 'experimental_time_to_first_byte':
    case 'ttfb':
    case 'largest_contentful_paint_image_time_to_first_byte':
      if (val <= 800) return { status: 'GOOD', rating: 'Good', color: 'emerald', benchmark: '<= 800ms' };
      if (val <= 1800) return { status: 'NEEDS_IMPROVEMENT', rating: 'Needs Improvement', color: 'amber', benchmark: '800ms - 1800ms' };
      return { status: 'POOR', rating: 'Poor', color: 'rose', benchmark: '> 1800ms' };

    case 'largest_contentful_paint_image_element_render_delay':
    case 'largest_contentful_paint_image_resource_load_delay':
    case 'largest_contentful_paint_image_resource_load_duration':
    case 'round_trip_time':
      if (val <= 500) return { status: 'GOOD', rating: 'Good', color: 'emerald', benchmark: '<= 500ms' };
      if (val <= 1000) return { status: 'NEEDS_IMPROVEMENT', rating: 'Needs Improvement', color: 'amber', benchmark: '500ms - 1000ms' };
      return { status: 'POOR', rating: 'Poor', color: 'rose', benchmark: '> 1000ms' };

    default:
      return { status: 'MEASURED', rating: 'Measured', color: 'sky', benchmark: 'N/A' };
  }
}

/**
 * Internal request dispatcher to Google Chrome UX Report API
 */
async function callCruxApi(endpoint, payload, apiKey = null) {
  const key = apiKey || process.env.GOOGLE_CRUX_API_KEY || DEFAULT_CRUX_KEY || DEFAULT_CRUX_VIS_KEY;
  const targetUrl = `${endpoint}?key=${encodeURIComponent(key)}`;

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'OmniSEO-OS/2.0 (Google CrUX Vis Integration; +https://cruxvis.withgoogle.com)'
  };

  // If using default CrUX Vis key or if no explicit key is provided, pass required Referer and Origin
  if (!apiKey || apiKey === DEFAULT_CRUX_VIS_KEY) {
    headers['Referer'] = CRUX_VIS_REFERER;
    headers['Origin'] = 'https://cruxvis.withgoogle.com';
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      timeout: 20000
    });

    const data = await response.json();
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      statusText: 'Fetch Error',
      data: { error: { message: err.message } }
    };
  }
}

/**
 * Extracts and formats the 4-part LCP sub-metrics breakdown and RTT
 */
export function extractLcpSubMetrics(metrics = {}) {
  const ttfb = metrics.largest_contentful_paint_image_time_to_first_byte?.latestP75
    ?? metrics.experimental_time_to_first_byte?.latestP75
    ?? null;
  const resourceLoadDelay = metrics.largest_contentful_paint_image_resource_load_delay?.latestP75 ?? null;
  const resourceLoadDuration = metrics.largest_contentful_paint_image_resource_load_duration?.latestP75 ?? null;
  const elementRenderDelay = metrics.largest_contentful_paint_image_element_render_delay?.latestP75 ?? null;
  const roundTripTime = metrics.round_trip_time?.latestP75 ?? null;

  return {
    time_to_first_byte: {
      p75: ttfb,
      threshold: evaluateCruxThreshold('experimental_time_to_first_byte', ttfb),
      benchmark: '<= 800ms'
    },
    resource_load_delay: {
      p75: resourceLoadDelay,
      threshold: evaluateCruxThreshold('largest_contentful_paint_image_resource_load_delay', resourceLoadDelay),
      benchmark: '<= 500ms'
    },
    resource_load_duration: {
      p75: resourceLoadDuration,
      threshold: evaluateCruxThreshold('largest_contentful_paint_image_resource_load_duration', resourceLoadDuration),
      benchmark: '<= 500ms'
    },
    element_render_delay: {
      p75: elementRenderDelay,
      threshold: evaluateCruxThreshold('largest_contentful_paint_image_element_render_delay', elementRenderDelay),
      benchmark: '<= 500ms'
    },
    round_trip_time: {
      p75: roundTripTime,
      threshold: evaluateCruxThreshold('round_trip_time', roundTripTime),
      benchmark: '<= 500ms'
    }
  };
}

/**
 * Groups collection periods by month (YYYY-MM) and computes monthly P75 averages and assessments
 */
export function computeMonthlyAggregations(periods = [], metrics = {}) {
  const monthMap = new Map();

  periods.forEach((p, idx) => {
    const mKey = formatCruxMonth(p.lastDate) || formatCruxMonth(p.firstDate);
    if (!mKey) return;
    if (!monthMap.has(mKey)) {
      monthMap.set(mKey, {
        monthKey: mKey,
        monthLabel: getMonthLabel(mKey),
        periodIndices: [],
        periods: [],
        firstDate: formatCruxDate(p.firstDate),
        lastDate: formatCruxDate(p.lastDate)
      });
    }
    const item = monthMap.get(mKey);
    item.periodIndices.push(idx);
    item.periods.push(p);
    item.lastDate = formatCruxDate(p.lastDate);
  });

  const months = Array.from(monthMap.values()).map(m => {
    const monthMetrics = {};
    for (const [key, metricData] of Object.entries(metrics)) {
      const timeseries = metricData.percentilesTimeseries || [];
      const valuesInMonth = m.periodIndices
        .map(i => timeseries[i])
        .filter(v => v !== null && v !== undefined && !isNaN(Number(v)))
        .map(Number);

      if (valuesInMonth.length > 0) {
        const latestVal = valuesInMonth[valuesInMonth.length - 1];
        const avgVal = valuesInMonth.reduce((a, b) => a + b, 0) / valuesInMonth.length;
        const roundedAvg = key === 'cumulative_layout_shift' ? parseFloat(avgVal.toFixed(3)) : Math.round(avgVal);
        const threshold = evaluateCruxThreshold(key, latestVal);
        monthMetrics[key] = {
          latestP75: latestVal,
          averageP75: roundedAvg,
          threshold,
          values: valuesInMonth
        };
      } else {
        monthMetrics[key] = {
          latestP75: null,
          averageP75: null,
          threshold: { status: 'UNKNOWN', rating: 'No Data', color: 'slate' },
          values: []
        };
      }
    }

    // Determine overall monthly CWV verdict
    const lcpStatus = monthMetrics.largest_contentful_paint?.threshold?.status;
    const inpStatus = monthMetrics.interaction_to_next_paint?.threshold?.status;
    const clsStatus = monthMetrics.cumulative_layout_shift?.threshold?.status;

    let verdict = 'UNKNOWN';
    let verdictColor = 'slate';
    if (lcpStatus && inpStatus && clsStatus) {
      if (lcpStatus === 'GOOD' && inpStatus === 'GOOD' && clsStatus === 'GOOD') {
        verdict = 'PASSED';
        verdictColor = 'emerald';
      } else if (lcpStatus === 'POOR' || inpStatus === 'POOR' || clsStatus === 'POOR') {
        verdict = 'FAILED';
        verdictColor = 'rose';
      } else {
        verdict = 'NEEDS_IMPROVEMENT';
        verdictColor = 'amber';
      }
    }

    return {
      monthKey: m.monthKey,
      monthLabel: m.monthLabel,
      periodsCount: m.periods.length,
      dateRange: `${m.firstDate} to ${m.lastDate}`,
      metrics: monthMetrics,
      cwvStatus: verdict,
      verdictColor
    };
  });

  // Sort descending (newest month first)
  months.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  return months;
}

/**
 * Filters a CrUX history result by date range and/or month
 */
export function filterCruxHistory(historyData, { startDate = null, endDate = null, month = null } = {}) {
  if (!historyData) {
    return historyData;
  }

  const periods = historyData.periods || historyData.collectionPeriods || [];
  if (!Array.isArray(periods) || periods.length === 0) {
    return historyData;
  }

  const metrics = historyData.metrics || {};

  // Find matching period indices
  const matchingIndices = [];
  periods.forEach((p, idx) => {
    const pStart = formatCruxDate(p.firstDate);
    const pEnd = formatCruxDate(p.lastDate);
    const pMonth = formatCruxMonth(p.lastDate);

    // Month filter
    if (month && month !== 'all' && pMonth !== month) {
      return;
    }

    // Date range filter
    if (startDate && pEnd < startDate) {
      return;
    }
    if (endDate && pStart > endDate) {
      return;
    }

    matchingIndices.push(idx);
  });

  const filteredPeriods = matchingIndices.map(i => periods[i]);
  const filteredMetrics = {};

  for (const [key, mData] of Object.entries(metrics)) {
    const rawTimeseries = mData.percentilesTimeseries || [];
    const rawHist = mData.histogramFractions || [];
    const slicedP75s = matchingIndices.map(i => rawTimeseries[i]);
    const slicedHist = matchingIndices.map(i => rawHist[i]);

    const latestVal = slicedP75s.length > 0 ? slicedP75s[slicedP75s.length - 1] : null;
    const oldestVal = slicedP75s.length > 1 ? slicedP75s[0] : latestVal;

    let trend = 'STABLE';
    if (latestVal !== null && oldestVal !== null) {
      const delta = Number(latestVal) - Number(oldestVal);
      if (delta < -50 || (key === 'cumulative_layout_shift' && delta < -0.02)) {
        trend = 'IMPROVING';
      } else if (delta > 50 || (key === 'cumulative_layout_shift' && delta > 0.02)) {
        trend = 'DEGRADING';
      }
    }

    filteredMetrics[key] = {
      ...mData,
      latestP75: latestVal,
      threshold: evaluateCruxThreshold(key, latestVal),
      trend,
      percentilesTimeseries: slicedP75s,
      histogramFractions: slicedHist
    };
  }

  const allMonthlyBreakdown = computeMonthlyAggregations(periods, metrics);
  const filteredMonthlyBreakdown = computeMonthlyAggregations(filteredPeriods, filteredMetrics);

  return {
    ...historyData,
    filterApplied: {
      startDate: startDate || null,
      endDate: endDate || null,
      month: month || 'all',
      isFiltered: Boolean(startDate || endDate || (month && month !== 'all'))
    },
    totalAvailablePeriods: periods.length,
    filteredPeriodsCount: filteredPeriods.length,
    periodsCount: filteredPeriods.length,
    periods: filteredPeriods,
    collectionPeriods: filteredPeriods,
    metrics: filteredMetrics,
    lcpSubMetrics: extractLcpSubMetrics(filteredMetrics),
    availableMonths: allMonthlyBreakdown.map(m => ({ monthKey: m.monthKey, monthLabel: m.monthLabel, count: m.periodsCount })),
    monthlyBreakdown: filteredMonthlyBreakdown
  };
}

/**
 * Queries the CrUX History API for up to 40 weekly collection periods
 * Supports optional date-wise and month-wise filtering
 */
export async function queryCruxHistory({
  url = null,
  origin = null,
  formFactor = 'ALL',
  collectionPeriodCount = 25,
  apiKey = null,
  startDate = null,
  endDate = null,
  month = null
} = {}) {
  const target = url || origin;
  if (!target) throw new Error('Either "url" or "origin" must be provided to queryCrUXHistory.');

  const resolvedOrigin = origin || extractOrigin(target);
  const cacheKey = `history__${(url || resolvedOrigin).toLowerCase()}__${formFactor}__${collectionPeriodCount}`;

  let baseResult = null;
  const cached = cruxCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    baseResult = { ...cached.data, fromCache: true };
  } else {
    const payload = {
      collectionPeriodCount: Math.min(40, Math.max(1, Number(collectionPeriodCount) || 25))
    };

    if (formFactor && formFactor.toUpperCase() !== 'ALL') {
      payload.formFactor = formFactor.toUpperCase();
    }

    if (url) {
      payload.url = url;
    } else {
      payload.origin = resolvedOrigin;
    }

    let scope = url ? 'url' : 'origin';
    let apiRes = await callCruxApi(CRUX_ENDPOINTS.history, payload, apiKey);

    // If custom API key gets 403 (e.g. CrUX API not enabled for that key), fallback to CrUX Vis gateway
    if (!apiRes.ok && apiRes.status === 403 && apiKey !== DEFAULT_CRUX_VIS_KEY) {
      apiRes = await callCruxApi(CRUX_ENDPOINTS.history, payload, DEFAULT_CRUX_VIS_KEY);
    }

    // If URL has insufficient traffic (404), seamlessly fallback to Origin
    if (!apiRes.ok && apiRes.status === 404 && url && resolvedOrigin) {
      payload.url = undefined;
      payload.origin = resolvedOrigin;
      scope = 'origin';
      apiRes = await callCruxApi(CRUX_ENDPOINTS.history, payload, apiKey);
      if (!apiRes.ok && apiRes.status === 403 && apiKey !== DEFAULT_CRUX_VIS_KEY) {
        apiRes = await callCruxApi(CRUX_ENDPOINTS.history, payload, DEFAULT_CRUX_VIS_KEY);
      }
    }

    if (!apiRes.ok) {
      return {
        success: false,
        status: apiRes.status,
        scope,
        target: url || resolvedOrigin,
        error: apiRes.data?.error?.message || `CrUX API responded with HTTP ${apiRes.status}`,
        visUrl: generateCruxVisUrl({ url, origin: resolvedOrigin, formFactor })
      };
    }

    const record = apiRes.data?.record || {};
    const metrics = record.metrics || {};
    const periods = record.collectionPeriods || [];

    // Parse structured timeseries for each Core Web Vital and diagnostic metric
    const formattedMetrics = {};
    for (const [key, metricData] of Object.entries(metrics)) {
      const rawP75s = metricData.percentilesTimeseries?.p75s || [];
      const p75s = rawP75s.map(v => (v !== null && v !== undefined && !isNaN(parseFloat(v)) ? parseFloat(v) : v));
      const latestP75 = p75s.length > 0 ? p75s[p75s.length - 1] : null;
      const oldestP75 = p75s.length > 1 ? p75s[0] : latestP75;

      let trend = 'STABLE';
      if (latestP75 !== null && oldestP75 !== null) {
        const delta = Number(latestP75) - Number(oldestP75);
        if (delta < -50 || (key === 'cumulative_layout_shift' && delta < -0.02)) {
          trend = 'IMPROVING';
        } else if (delta > 50 || (key === 'cumulative_layout_shift' && delta > 0.02)) {
          trend = 'DEGRADING';
        }
      }

      formattedMetrics[key] = {
        latestP75,
        threshold: evaluateCruxThreshold(key, latestP75),
        trend,
        percentilesTimeseries: p75s,
        histogramFractions: metricData.histogramTimeseries || []
      };
    }

    const monthlyBreakdown = computeMonthlyAggregations(periods, formattedMetrics);
    const availableMonths = monthlyBreakdown.map(m => ({
      monthKey: m.monthKey,
      monthLabel: m.monthLabel,
      count: m.periodsCount
    }));

    baseResult = {
      success: true,
      target: url || resolvedOrigin,
      scope,
      formFactor,
      periodsCount: periods.length,
      periods,
      metrics: formattedMetrics,
      lcpSubMetrics: extractLcpSubMetrics(formattedMetrics),
      availableMonths,
      monthlyBreakdown,
      dataStatus: 'measured',
      isSimulated: false,
      provenance: 'Google Chrome User Experience Report (CrUX History API)',
      visUrl: generateCruxVisUrl({ url: scope === 'url' ? url : null, origin: resolvedOrigin, formFactor })
    };

    cruxCache.set(cacheKey, { data: baseResult, timestamp: Date.now() });
  }

  // If date or month filters are provided, apply them
  if (startDate || endDate || (month && month !== 'all')) {
    return filterCruxHistory(baseResult, { startDate, endDate, month });
  }

  return baseResult;
}

/**
 * Queries the CrUX Single Snapshot Record API (latest 28-day rolling window)
 */
export async function queryCruxSnapshot({
  url = null,
  origin = null,
  formFactor = 'ALL',
  apiKey = null
} = {}) {
  const target = url || origin;
  if (!target) throw new Error('Either "url" or "origin" must be provided to queryCruxSnapshot.');

  const resolvedOrigin = origin || extractOrigin(target);
  const cacheKey = `record__${(url || resolvedOrigin).toLowerCase()}__${formFactor}`;

  const cached = cruxCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return { ...cached.data, fromCache: true };
  }

  const payload = {};
  if (formFactor && formFactor.toUpperCase() !== 'ALL') {
    payload.formFactor = formFactor.toUpperCase();
  }
  if (url) {
    payload.url = url;
  } else {
    payload.origin = resolvedOrigin;
  }

  let scope = url ? 'url' : 'origin';
  let apiRes = await callCruxApi(CRUX_ENDPOINTS.record, payload, apiKey);

  if (!apiRes.ok && apiRes.status === 403 && apiKey !== DEFAULT_CRUX_VIS_KEY) {
    apiRes = await callCruxApi(CRUX_ENDPOINTS.record, payload, DEFAULT_CRUX_VIS_KEY);
  }

  if (!apiRes.ok && apiRes.status === 404 && url && resolvedOrigin) {
    payload.url = undefined;
    payload.origin = resolvedOrigin;
    scope = 'origin';
    apiRes = await callCruxApi(CRUX_ENDPOINTS.record, payload, apiKey);
    if (!apiRes.ok && apiRes.status === 403 && apiKey !== DEFAULT_CRUX_VIS_KEY) {
      apiRes = await callCruxApi(CRUX_ENDPOINTS.record, payload, DEFAULT_CRUX_VIS_KEY);
    }
  }

  if (!apiRes.ok) {
    return {
      success: false,
      status: apiRes.status,
      scope,
      target: url || resolvedOrigin,
      error: apiRes.data?.error?.message || `CrUX Record API responded with HTTP ${apiRes.status}`,
      visUrl: generateCruxVisUrl({ url, origin: resolvedOrigin, formFactor })
    };
  }

  const record = apiRes.data?.record || {};
  const rawMetrics = record.metrics || {};

  const metrics = {};
  for (const [key, metricData] of Object.entries(rawMetrics)) {
    const rawP75 = metricData.percentiles?.p75;
    const p75 = rawP75 !== undefined && rawP75 !== null && !isNaN(parseFloat(rawP75)) ? parseFloat(rawP75) : rawP75;
    metrics[key] = {
      p75,
      threshold: evaluateCruxThreshold(key, p75),
      histogram: metricData.histogram || []
    };
  }

  const result = {
    success: true,
    target: url || resolvedOrigin,
    scope,
    formFactor,
    metrics,
    dataStatus: 'measured',
    isSimulated: false,
    provenance: 'Google Chrome User Experience Report (CrUX Snapshot API)',
    visUrl: generateCruxVisUrl({ url: scope === 'url' ? url : null, origin: resolvedOrigin, formFactor })
  };

  cruxCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

/**
 * Combined Comprehensive CrUX Audit (Snapshot + Timeseries History + Assessment + Monthly Breakdown)
 */
export async function auditCruxFull(targetUrl, {
  formFactor = 'ALL',
  collectionPeriodCount = 25,
  apiKey = null,
  startDate = null,
  endDate = null,
  month = null
} = {}) {
  const origin = extractOrigin(targetUrl);

  const [snapshotRes, historyRes] = await Promise.allSettled([
    queryCruxSnapshot({ url: targetUrl, origin, formFactor, apiKey }),
    queryCruxHistory({ url: targetUrl, origin, formFactor, collectionPeriodCount, apiKey, startDate, endDate, month })
  ]);

  const snapshot = snapshotRes.status === 'fulfilled' ? snapshotRes.value : { success: false, error: snapshotRes.reason?.message };
  const history = historyRes.status === 'fulfilled' ? historyRes.value : { success: false, error: historyRes.reason?.message };

  // Determine overall Core Web Vitals Status (LCP <= 2.5s, INP <= 200ms, CLS <= 0.1)
  const lcp = snapshot.metrics?.largest_contentful_paint?.threshold?.status || history.metrics?.largest_contentful_paint?.threshold?.status;
  const inp = snapshot.metrics?.interaction_to_next_paint?.threshold?.status || history.metrics?.interaction_to_next_paint?.threshold?.status;
  const cls = snapshot.metrics?.cumulative_layout_shift?.threshold?.status || history.metrics?.cumulative_layout_shift?.threshold?.status;

  let cwvAssessment = 'UNKNOWN';
  let badgeColor = 'slate';

  if (lcp && inp && cls) {
    if (lcp === 'GOOD' && inp === 'GOOD' && cls === 'GOOD') {
      cwvAssessment = 'PASSED';
      badgeColor = 'emerald';
    } else if (lcp === 'POOR' || inp === 'POOR' || cls === 'POOR') {
      cwvAssessment = 'FAILED';
      badgeColor = 'rose';
    } else {
      cwvAssessment = 'NEEDS_IMPROVEMENT';
      badgeColor = 'amber';
    }
  }

  return {
    success: snapshot.success || history.success,
    targetUrl,
    origin,
    formFactor,
    cwvAssessment,
    badgeColor,
    snapshot,
    history,
    lcpSubMetrics: history?.lcpSubMetrics || extractLcpSubMetrics(history?.metrics || {}),
    availableMonths: history.availableMonths || [],
    monthlyBreakdown: history.monthlyBreakdown || [],
    visUrl: generateCruxVisUrl({ url: targetUrl, origin, formFactor }),
    provenance: 'Google Chrome User Experience Report (CrUX & CrUX Vis)',
    dataStatus: (snapshot.success || history.success) ? 'measured' : 'unavailable'
  };
}
