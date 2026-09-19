import fetch from 'node-fetch';

/**
 * Google Search Console (GSC) OAuth 2.0 & API Connector
 * Production-ready adapter supporting OAuth 2.0 authorization,
 * token exchange, automatic token refresh, verified sites listing,
 * and search analytics querying with graceful mock fallback mode.
 */

export const GSC_SCOPES = {
  READONLY: 'https://www.googleapis.com/auth/webmasters.readonly',
  FULL: 'https://www.googleapis.com/auth/webmasters'
};

export const GOOGLE_OAUTH_ENDPOINTS = {
  AUTH: 'https://accounts.google.com/o/oauth2/v2/auth',
  TOKEN: 'https://oauth2.googleapis.com/token',
  SITES: 'https://www.googleapis.com/webmasters/v3/sites',
  ANALYTICS: (siteUrl) =>
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
};

const DEFAULT_SCOPE = GSC_SCOPES.READONLY;
const DEFAULT_USER_AGENT = 'OmniSEO-OS/2.0 (GSC Connector; contact@omniseo.os)';

/**
 * Check if real GSC credentials are fully configured in the environment.
 */
export function isGscConfigured() {
  return Boolean(
    process.env.GSC_CLIENT_ID &&
    process.env.GSC_CLIENT_SECRET
  );
}

/**
 * Helper to determine if mock fallback mode should be active.
 */
function shouldUseMockMode(identifier, forceOption = null) {
  if (typeof forceOption === 'boolean') return forceOption;
  if (process.env.GSC_MOCK_FALLBACK === 'true') return true;
  if (!identifier) return !isGscConfigured();
  const idStr = String(identifier).trim().toLowerCase();
  return idStr.startsWith('mock_') || idStr.startsWith('test_') || !isGscConfigured();
}

/**
 * Normalizes domain name from URL prefix or sc-domain property
 */
export function extractDomainFromSiteUrl(siteUrl = '') {
  const str = String(siteUrl || '').trim();
  if (str.startsWith('sc-domain:')) {
    return str.replace(/^sc-domain:/i, '').replace(/\/.*$/, '');
  }
  return str.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '');
}

/**
 * Calculate default date window for GSC (today - 31 days to today - 3 days)
 * GSC search analytics data typically has a 48 to 72 hour processing delay.
 */
export function getDefaultDateRange() {
  const now = new Date();
  const endDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const startDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return { startDate, endDate };
}

/**
 * 1. Generate Google OAuth 2.0 Consent URL
 * Returns the Google authorization URL for user consent with webmasters.readonly scope.
 */
export function generateGoogleAuthUrl({
  clientId = process.env.GSC_CLIENT_ID,
  redirectUri = process.env.GSC_REDIRECT_URI,
  state = '',
  scope = DEFAULT_SCOPE,
  accessType = 'offline',
  prompt = 'consent'
} = {}) {
  const effectiveClientId = (clientId || process.env.GSC_CLIENT_ID || 'mock_client_id.apps.googleusercontent.com').trim();
  const effectiveRedirectUri = (redirectUri || process.env.GSC_REDIRECT_URI || 'http://localhost:4000/api/auth/gsc/callback').trim();

  const params = new URLSearchParams();
  params.set('client_id', effectiveClientId);
  params.set('redirect_uri', effectiveRedirectUri);
  params.set('response_type', 'code');
  params.set('scope', scope || DEFAULT_SCOPE);
  params.set('access_type', accessType || 'offline');
  params.set('prompt', prompt || 'consent');
  params.set('include_granted_scopes', 'true');

  if (state) {
    params.set('state', String(state));
  }

  return `${GOOGLE_OAUTH_ENDPOINTS.AUTH}?${params.toString()}`;
}

/**
 * 2. Exchange Authorization Code for Tokens
 * Exchanges the one-time code for access_token, refresh_token, and expiry metadata.
 */
export async function exchangeCodeForTokens({
  code,
  clientId = process.env.GSC_CLIENT_ID,
  clientSecret = process.env.GSC_CLIENT_SECRET,
  redirectUri = process.env.GSC_REDIRECT_URI,
  mockFallback = null
} = {}) {
  if (!code && !process.env.GSC_MOCK_FALLBACK) {
    return {
      success: false,
      error: 'Authorization code is required for token exchange'
    };
  }

  const effectiveClientId = clientId || process.env.GSC_CLIENT_ID;
  const effectiveClientSecret = clientSecret || process.env.GSC_CLIENT_SECRET;
  const effectiveRedirectUri = redirectUri || process.env.GSC_REDIRECT_URI || 'http://localhost:4000/api/auth/gsc/callback';

  // Check if mock mode is requested or credentials not configured
  const mockActive = shouldUseMockMode(code, mockFallback) || !effectiveClientId || !effectiveClientSecret;

  if (mockActive) {
    const now = Date.now();
    const expiresIn = 3600;
    const randomSuffix = Math.random().toString(36).substring(2, 10);

    return {
      success: true,
      dataStatus: 'mock',
      isMock: true,
      access_token: `mock_gsc_access_token_${randomSuffix}`,
      refresh_token: `mock_gsc_refresh_token_${randomSuffix}`,
      token_type: 'Bearer',
      expires_in: expiresIn,
      expires_at: now + expiresIn * 1000,
      scope: DEFAULT_SCOPE,
      createdAt: now
    };
  }

  // Live Token Exchange
  try {
    const formParams = new URLSearchParams({
      code: String(code).trim(),
      client_id: effectiveClientId.trim(),
      client_secret: effectiveClientSecret.trim(),
      redirect_uri: effectiveRedirectUri.trim(),
      grant_type: 'authorization_code'
    });

    const res = await fetch(GOOGLE_OAUTH_ENDPOINTS.TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': DEFAULT_USER_AGENT
      },
      body: formParams.toString(),
      signal: AbortSignal.timeout(10000)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.error_description || data.error || `Google OAuth token exchange failed (HTTP ${res.status})`,
        statusCode: res.status
      };
    }

    const now = Date.now();
    const expiresIn = Number(data.expires_in) || 3600;

    return {
      success: true,
      dataStatus: 'live',
      isMock: false,
      access_token: data.access_token,
      refresh_token: data.refresh_token || null,
      token_type: data.token_type || 'Bearer',
      expires_in: expiresIn,
      expires_at: now + expiresIn * 1000,
      scope: data.scope || DEFAULT_SCOPE,
      createdAt: now
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error during token exchange: ${err.message}`
    };
  }
}

/**
 * 3. Refresh Expired Access Token
 * Uses the persistent refresh_token to acquire a fresh access_token.
 */
export async function refreshAccessToken({
  refreshToken,
  clientId = process.env.GSC_CLIENT_ID,
  clientSecret = process.env.GSC_CLIENT_SECRET,
  mockFallback = null
} = {}) {
  if (!refreshToken) {
    return {
      success: false,
      error: 'Refresh token is required for token renewal'
    };
  }

  const effectiveClientId = clientId || process.env.GSC_CLIENT_ID;
  const effectiveClientSecret = clientSecret || process.env.GSC_CLIENT_SECRET;

  const mockActive = shouldUseMockMode(refreshToken, mockFallback) || !effectiveClientId || !effectiveClientSecret;

  if (mockActive) {
    const now = Date.now();
    const expiresIn = 3600;
    const randomSuffix = Math.random().toString(36).substring(2, 10);

    return {
      success: true,
      dataStatus: 'mock',
      isMock: true,
      access_token: `mock_refreshed_access_token_${randomSuffix}`,
      token_type: 'Bearer',
      expires_in: expiresIn,
      expires_at: now + expiresIn * 1000,
      scope: DEFAULT_SCOPE,
      refreshedAt: now
    };
  }

  // Live Token Refresh
  try {
    const formParams = new URLSearchParams({
      refresh_token: String(refreshToken).trim(),
      client_id: effectiveClientId.trim(),
      client_secret: effectiveClientSecret.trim(),
      grant_type: 'refresh_token'
    });

    const res = await fetch(GOOGLE_OAUTH_ENDPOINTS.TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': DEFAULT_USER_AGENT
      },
      body: formParams.toString(),
      signal: AbortSignal.timeout(10000)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.error_description || data.error || `Google OAuth token refresh failed (HTTP ${res.status})`,
        statusCode: res.status
      };
    }

    const now = Date.now();
    const expiresIn = Number(data.expires_in) || 3600;

    return {
      success: true,
      dataStatus: 'live',
      isMock: false,
      access_token: data.access_token,
      token_type: data.token_type || 'Bearer',
      expires_in: expiresIn,
      expires_at: now + expiresIn * 1000,
      scope: data.scope || DEFAULT_SCOPE,
      refreshedAt: now
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error during token refresh: ${err.message}`
    };
  }
}

/**
 * 4. List Verified Search Console Sites
 * Calls https://www.googleapis.com/webmasters/v3/sites to retrieve verified domains
 * and permission levels (siteOwner, siteFullUser, siteRestrictedUser).
 */
export async function listVerifiedSites(accessToken, { mockFallback = null } = {}) {
  if (!accessToken) {
    return {
      success: false,
      error: 'Access token is required to list verified Search Console properties'
    };
  }

  const mockActive = shouldUseMockMode(accessToken, mockFallback);

  if (mockActive) {
    const mockSites = [
      {
        siteUrl: 'https://example.com/',
        permissionLevel: 'siteOwner',
        domain: 'example.com',
        isDomainProperty: false,
        protocol: 'https'
      },
      {
        siteUrl: 'sc-domain:example.com',
        permissionLevel: 'siteOwner',
        domain: 'example.com',
        isDomainProperty: true,
        protocol: 'sc-domain'
      },
      {
        siteUrl: 'https://shop.example.com/',
        permissionLevel: 'siteFullUser',
        domain: 'shop.example.com',
        isDomainProperty: false,
        protocol: 'https'
      }
    ];

    return {
      success: true,
      dataStatus: 'mock',
      isMock: true,
      provider: 'Google Search Console Sites API v3 (Mock Fallback)',
      count: mockSites.length,
      sites: mockSites
    };
  }

  // Live Sites List API Call
  try {
    const res = await fetch(GOOGLE_OAUTH_ENDPOINTS.SITES, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${String(accessToken).trim()}`,
        'Accept': 'application/json',
        'User-Agent': DEFAULT_USER_AGENT
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        error: `Search Console Sites API returned HTTP ${res.status}: ${errText.substring(0, 200)}`,
        statusCode: res.status
      };
    }

    const data = await res.json();
    const siteEntries = Array.isArray(data.siteEntry) ? data.siteEntry : [];

    const sites = siteEntries.map(entry => {
      const siteUrl = entry.siteUrl || '';
      const isDomainProperty = siteUrl.startsWith('sc-domain:');
      const domain = extractDomainFromSiteUrl(siteUrl);
      const protocol = isDomainProperty ? 'sc-domain' : (siteUrl.startsWith('https') ? 'https' : 'http');

      return {
        siteUrl,
        permissionLevel: entry.permissionLevel || 'siteUnverifiedUser',
        domain,
        isDomainProperty,
        protocol
      };
    });

    return {
      success: true,
      dataStatus: 'live',
      isMock: false,
      provider: 'Google Search Console Sites API v3',
      count: sites.length,
      sites
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to retrieve verified sites: ${err.message}`
    };
  }
}

/**
 * 5. Normalize Raw Search Analytics Rows & Aggregates
 * Calculates total clicks, total impressions, average CTR, average position,
 * and groups top queries and pages.
 */
export function normalizeSearchAnalyticsResponse(data, dimensions = ['query', 'page'], siteUrl = '') {
  const rawRows = Array.isArray(data?.rows) ? data.rows : [];
  const dimList = Array.isArray(dimensions) && dimensions.length > 0 ? dimensions : ['query', 'page'];

  let totalClicks = 0;
  let totalImpressions = 0;
  let weightedPositionSum = 0;

  const queryMap = new Map();
  const pageMap = new Map();

  const formattedRows = rawRows.map(row => {
    const keys = Array.isArray(row.keys) ? row.keys : [];
    const clicks = Math.round(Number(row.clicks) || 0);
    const impressions = Math.round(Number(row.impressions) || 0);
    const rawCtr = typeof row.ctr === 'number' ? row.ctr : (impressions > 0 ? clicks / impressions : 0);
    const position = Number((Number(row.position) || 0).toFixed(1));

    totalClicks += clicks;
    totalImpressions += impressions;
    weightedPositionSum += (position * impressions);

    const rowObj = {
      clicks,
      impressions,
      ctr: Number(rawCtr.toFixed(4)),
      ctrFormatted: `${(rawCtr * 100).toFixed(2)}%`,
      position,
      keys
    };

    dimList.forEach((dim, idx) => {
      const val = keys[idx] || null;
      rowObj[dim] = val;

      if (dim === 'query' && val) {
        const existing = queryMap.get(val) || { query: val, clicks: 0, impressions: 0, positions: [] };
        existing.clicks += clicks;
        existing.impressions += impressions;
        existing.positions.push({ pos: position, impr: impressions });
        queryMap.set(val, existing);
      }

      if (dim === 'page' && val) {
        const existing = pageMap.get(val) || { page: val, clicks: 0, impressions: 0, positions: [] };
        existing.clicks += clicks;
        existing.impressions += impressions;
        existing.positions.push({ pos: position, impr: impressions });
        pageMap.set(val, existing);
      }
    });

    return rowObj;
  });

  const averageCtr = totalImpressions > 0 ? Number((totalClicks / totalImpressions).toFixed(4)) : 0;
  const averageCtrFormatted = `${(averageCtr * 100).toFixed(2)}%`;
  const averagePosition = totalImpressions > 0
    ? Number((weightedPositionSum / totalImpressions).toFixed(1))
    : (formattedRows.length > 0
      ? Number((formattedRows.reduce((s, r) => s + r.position, 0) / formattedRows.length).toFixed(1))
      : 0);

  // Grouped queries sorted by clicks descending
  const queries = Array.from(queryMap.values()).map(q => {
    const qImpr = q.impressions;
    const avgPos = qImpr > 0
      ? Number((q.positions.reduce((s, p) => s + p.pos * p.impr, 0) / qImpr).toFixed(1))
      : 0;
    const qCtr = qImpr > 0 ? Number((q.clicks / qImpr).toFixed(4)) : 0;
    return {
      query: q.query,
      clicks: q.clicks,
      impressions: q.impressions,
      ctr: qCtr,
      ctrFormatted: `${(qCtr * 100).toFixed(2)}%`,
      position: avgPos
    };
  }).sort((a, b) => b.clicks - a.clicks);

  // Grouped pages sorted by clicks descending
  const pages = Array.from(pageMap.values()).map(p => {
    const pImpr = p.impressions;
    const avgPos = pImpr > 0
      ? Number((p.positions.reduce((s, p) => s + p.pos * p.impr, 0) / pImpr).toFixed(1))
      : 0;
    const pCtr = pImpr > 0 ? Number((p.clicks / pImpr).toFixed(4)) : 0;
    return {
      page: p.page,
      clicks: p.clicks,
      impressions: p.impressions,
      ctr: pCtr,
      ctrFormatted: `${(pCtr * 100).toFixed(2)}%`,
      position: avgPos
    };
  }).sort((a, b) => b.clicks - a.clicks);

  return {
    totalClicks,
    totalImpressions,
    averageCtr,
    averageCtrFormatted,
    averagePosition,
    rowCount: formattedRows.length,
    queries,
    pages,
    rows: formattedRows
  };
}

/**
 * Generate rich, realistic mock Search Analytics data for fallback / test mode.
 */
export function generateMockSearchAnalyticsData(siteUrl, { dimensions = ['query', 'page'] } = {}) {
  const cleanDomain = extractDomainFromSiteUrl(siteUrl);
  const brand = cleanDomain.split('.')[0] || 'brand';
  const baseOrigin = siteUrl.startsWith('sc-domain:') ? `https://${cleanDomain}` : siteUrl.replace(/\/$/, '');

  const mockQueryTerms = [
    { q: `${brand} official website`, baseClicks: 720, baseImpr: 4800, pos: 1.2 },
    { q: `${brand} reviews and ratings`, baseClicks: 510, baseImpr: 5300, pos: 1.8 },
    { q: `best seo audit tools 2026`, baseClicks: 380, baseImpr: 7600, pos: 3.2 },
    { q: `core web vitals test and score`, baseClicks: 295, baseImpr: 6100, pos: 2.9 },
    { q: `${brand} pricing and features`, baseClicks: 230, baseImpr: 3400, pos: 2.4 },
    { q: `how to monitor domain backlinks`, baseClicks: 185, baseImpr: 4200, pos: 4.1 },
    { q: `schema org generator and validator`, baseClicks: 155, baseImpr: 3900, pos: 3.7 },
    { q: `automated search console api integration`, baseClicks: 125, baseImpr: 2800, pos: 4.5 }
  ];

  const mockPages = [
    `${baseOrigin}/`,
    `${baseOrigin}/tools/seo-audit`,
    `${baseOrigin}/guides/core-web-vitals`,
    `${baseOrigin}/pricing`,
    `${baseOrigin}/api/docs`
  ];

  const rawRows = mockQueryTerms.map((item, idx) => {
    const page = mockPages[idx % mockPages.length];
    const keys = [];
    if (dimensions.includes('query')) keys.push(item.q);
    if (dimensions.includes('page')) keys.push(page);
    if (keys.length === 0) keys.push(item.q);

    const clicks = item.baseClicks;
    const impressions = item.baseImpr;
    const ctr = clicks / impressions;
    const position = item.pos;

    return {
      keys,
      clicks,
      impressions,
      ctr,
      position
    };
  });

  return {
    rows: rawRows,
    responseAggregationType: 'byPage'
  };
}

/**
 * 6. Query Search Console Search Analytics API
 * Endpoint: POST https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query
 * Returns formatted queries, pages, clicks, impressions, CTR, and average position.
 */
export async function querySearchAnalytics(accessToken, siteUrl, {
  startDate,
  endDate,
  dimensions = ['query', 'page'],
  rowLimit = 1000,
  startRow = 0,
  type = 'web',
  mockFallback = null
} = {}) {
  // Input validation
  if (!siteUrl || typeof siteUrl !== 'string' || !siteUrl.trim()) {
    return {
      success: false,
      error: 'Valid siteUrl is required (e.g. "https://example.com/" or "sc-domain:example.com")'
    };
  }

  const normalizedSiteUrl = siteUrl.trim();
  const defaultDates = getDefaultDateRange();
  const effectiveStart = startDate || defaultDates.startDate;
  const effectiveEnd = endDate || defaultDates.endDate;
  const effectiveDimensions = Array.isArray(dimensions) && dimensions.length > 0 ? dimensions : ['query', 'page'];
  const effectiveLimit = Math.max(1, Math.min(Number(rowLimit) || 1000, 25000));

  // Determine if mock fallback should run
  const mockActive = shouldUseMockMode(accessToken, mockFallback);

  if (mockActive) {
    const mockRaw = generateMockSearchAnalyticsData(normalizedSiteUrl, {
      dimensions: effectiveDimensions,
      startDate: effectiveStart,
      endDate: effectiveEnd
    });
    const normalized = normalizeSearchAnalyticsResponse(mockRaw, effectiveDimensions, normalizedSiteUrl);

    return {
      success: true,
      dataStatus: 'mock',
      isMock: true,
      provider: 'Google Search Console API v3 (Mock Fallback)',
      siteUrl: normalizedSiteUrl,
      dateRange: {
        startDate: effectiveStart,
        endDate: effectiveEnd
      },
      dimensions: effectiveDimensions,
      rowLimit: effectiveLimit,
      ...normalized
    };
  }

  // Live Query Search Analytics via Google Webmasters REST API
  try {
    const endpoint = GOOGLE_OAUTH_ENDPOINTS.ANALYTICS(normalizedSiteUrl);
    const payload = {
      startDate: effectiveStart,
      endDate: effectiveEnd,
      dimensions: effectiveDimensions,
      rowLimit: effectiveLimit,
      startRow: Number(startRow) || 0,
      type: type || 'web'
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${String(accessToken).trim()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': DEFAULT_USER_AGENT
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        error: `Search Console Analytics query failed (HTTP ${res.status}): ${errText.substring(0, 250)}`,
        statusCode: res.status
      };
    }

    const data = await res.json();
    const normalized = normalizeSearchAnalyticsResponse(data, effectiveDimensions, normalizedSiteUrl);

    return {
      success: true,
      dataStatus: 'live',
      isMock: false,
      provider: 'Google Search Console API v3',
      siteUrl: normalizedSiteUrl,
      dateRange: {
        startDate: effectiveStart,
        endDate: effectiveEnd
      },
      dimensions: effectiveDimensions,
      rowLimit: effectiveLimit,
      ...normalized
    };
  } catch (err) {
    return {
      success: false,
      error: `Search Analytics query failed: ${err.message}`
    };
  }
}
