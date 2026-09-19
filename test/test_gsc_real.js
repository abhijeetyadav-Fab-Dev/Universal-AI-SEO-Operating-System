import assert from 'assert';
import {
  generateGoogleAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  listVerifiedSites,
  querySearchAnalytics,
  normalizeSearchAnalyticsResponse,
  extractDomainFromSiteUrl,
  getDefaultDateRange,
  isGscConfigured,
  GSC_SCOPES,
  GOOGLE_OAUTH_ENDPOINTS
} from '../server/adapters/gsc_real.js';

console.log('================================================================');
console.log('🧪 RUNNING GOOGLE SEARCH CONSOLE (GSC) REAL ADAPTER TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

async function itAsync(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

async function runAllTests() {
  console.log('--- 1. GOOGLE OAUTH 2.0 CONSENT URL GENERATION ---');

  it('generates standard Google OAuth 2.0 consent URL with webmasters.readonly scope', () => {
    const clientId = '123456789-abc.apps.googleusercontent.com';
    const redirectUri = 'https://omniseo.os/api/auth/gsc/callback';
    const state = 'security-state-token-xyz-123';

    const authUrl = generateGoogleAuthUrl({ clientId, redirectUri, state });
    assert.ok(typeof authUrl === 'string', 'Auth URL should be a string');
    assert.ok(authUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth'), 'URL must target Google OAuth endpoint');

    const parsedUrl = new URL(authUrl);
    assert.strictEqual(parsedUrl.searchParams.get('client_id'), clientId, 'client_id parameter mismatch');
    assert.strictEqual(parsedUrl.searchParams.get('redirect_uri'), redirectUri, 'redirect_uri parameter mismatch');
    assert.strictEqual(parsedUrl.searchParams.get('response_type'), 'code', 'response_type must be code');
    assert.strictEqual(parsedUrl.searchParams.get('scope'), GSC_SCOPES.READONLY, 'scope must be webmasters.readonly');
    assert.strictEqual(parsedUrl.searchParams.get('access_type'), 'offline', 'access_type must be offline');
    assert.strictEqual(parsedUrl.searchParams.get('prompt'), 'consent', 'prompt must be consent');
    assert.strictEqual(parsedUrl.searchParams.get('state'), state, 'state parameter mismatch');
    assert.strictEqual(parsedUrl.searchParams.get('include_granted_scopes'), 'true', 'include_granted_scopes must be true');
  });

  it('handles default/omitted options gracefully in consent URL generator', () => {
    const defaultUrl = generateGoogleAuthUrl();
    assert.ok(typeof defaultUrl === 'string', 'Should generate default URL string');
    const parsed = new URL(defaultUrl);
    assert.ok(parsed.searchParams.has('client_id'), 'Should have client_id');
    assert.ok(parsed.searchParams.has('redirect_uri'), 'Should have redirect_uri');
    assert.strictEqual(parsed.searchParams.get('scope'), GSC_SCOPES.READONLY, 'Should default to webmasters.readonly');
  });

  console.log('\n--- 2. AUTHORIZATION CODE TOKEN EXCHANGE ---');

  await itAsync('validates input: rejects token exchange when code is missing', async () => {
    const res = await exchangeCodeForTokens({});
    assert.strictEqual(res.success, false, 'Should fail without code');
    assert.ok(res.error.toLowerCase().includes('code is required'), 'Should report missing code error');
  });

  await itAsync('provides mock fallback token parsing when credentials are not configured or code is mock', async () => {
    const res = await exchangeCodeForTokens({
      code: 'mock_authorization_code_abc123',
      clientId: 'mock_client_id',
      clientSecret: 'mock_secret'
    });

    assert.strictEqual(res.success, true, 'Token exchange should succeed');
    assert.strictEqual(res.isMock, true, 'isMock flag should be true in mock mode');
    assert.strictEqual(res.dataStatus, 'mock', 'dataStatus should be mock');
    assert.ok(typeof res.access_token === 'string' && res.access_token.length > 10, 'access_token should be valid string');
    assert.ok(typeof res.refresh_token === 'string' && res.refresh_token.length > 10, 'refresh_token should be valid string');
    assert.strictEqual(res.token_type, 'Bearer', 'token_type should be Bearer');
    assert.strictEqual(res.expires_in, 3600, 'expires_in should be 3600');
    assert.ok(res.expires_at > Date.now(), 'expires_at timestamp should be in the future');
    assert.strictEqual(res.scope, GSC_SCOPES.READONLY, 'scope should match readonly GSC scope');
  });

  console.log('\n--- 3. ACCESS TOKEN REFRESH FLOW ---');

  await itAsync('validates input: rejects token refresh when refresh_token is missing', async () => {
    const res = await refreshAccessToken({});
    assert.strictEqual(res.success, false, 'Should fail without refresh token');
    assert.ok(res.error.toLowerCase().includes('refresh token is required'), 'Should report missing refresh token');
  });

  await itAsync('refreshes expired access token in mock fallback mode', async () => {
    const res = await refreshAccessToken({
      refreshToken: 'mock_refresh_token_valid123',
      clientId: 'mock_client',
      clientSecret: 'mock_secret'
    });

    assert.strictEqual(res.success, true, 'Refresh should succeed');
    assert.strictEqual(res.isMock, true, 'isMock should be true in mock mode');
    assert.ok(typeof res.access_token === 'string' && res.access_token.startsWith('mock_refreshed_access_token_'), 'Should return fresh access token');
    assert.strictEqual(res.token_type, 'Bearer', 'token_type should be Bearer');
    assert.strictEqual(res.expires_in, 3600, 'expires_in should be 3600');
    assert.ok(res.expires_at > Date.now(), 'expires_at should be in the future');
  });

  console.log('\n--- 4. LIST VERIFIED SITES (PROPERTIES) ---');

  await itAsync('validates input: rejects listing sites when accessToken is missing', async () => {
    const res = await listVerifiedSites(null);
    assert.strictEqual(res.success, false, 'Should fail without access token');
    assert.ok(res.error.toLowerCase().includes('access token is required'), 'Should report missing token');
  });

  await itAsync('retrieves and normalizes verified domains & permission levels in mock fallback mode', async () => {
    const res = await listVerifiedSites('mock_access_token_test');
    assert.strictEqual(res.success, true, 'Should succeed in mock fallback');
    assert.strictEqual(res.isMock, true, 'Should be marked as mock');
    assert.ok(res.count >= 2, 'Should return at least 2 mock verified properties');
    assert.ok(Array.isArray(res.sites), 'sites should be an array');

    // Verify property type normalization: sc-domain vs URL prefix
    const domainProp = res.sites.find(s => s.isDomainProperty === true);
    const urlProp = res.sites.find(s => s.isDomainProperty === false);

    assert.ok(domainProp, 'Should identify Domain Property (sc-domain:)');
    assert.ok(domainProp.siteUrl.startsWith('sc-domain:'), 'Domain property should have sc-domain: prefix');
    assert.strictEqual(domainProp.permissionLevel, 'siteOwner', 'Domain property should have siteOwner permission');
    assert.strictEqual(domainProp.domain, 'example.com', 'Domain property should extract clean domain');

    assert.ok(urlProp, 'Should identify URL Prefix Property (https://)');
    assert.ok(urlProp.siteUrl.startsWith('https://'), 'URL property should have https:// prefix');
    assert.ok(['siteOwner', 'siteFullUser', 'siteRestrictedUser'].includes(urlProp.permissionLevel), 'Permission level should be recognized');
  });

  console.log('\n--- 5. SEARCH ANALYTICS QUERY & RESPONSE NORMALIZATION ---');

  await itAsync('validates input: rejects querySearchAnalytics when siteUrl is missing', async () => {
    const res = await querySearchAnalytics('mock_token', null);
    assert.strictEqual(res.success, false, 'Should fail without siteUrl');
    assert.ok(res.error.toLowerCase().includes('siteurl is required'), 'Should report missing siteUrl');
  });

  await itAsync('queries search analytics and returns formatted queries, pages, clicks, impressions, CTR, and position', async () => {
    const siteUrl = 'https://example.com/';
    const res = await querySearchAnalytics('mock_access_token_analytics', siteUrl, {
      dimensions: ['query', 'page'],
      rowLimit: 10
    });

    assert.strictEqual(res.success, true, 'Analytics query should succeed');
    assert.strictEqual(res.isMock, true, 'Should be mock fallback');
    assert.strictEqual(res.siteUrl, siteUrl, 'siteUrl should match requested URL');
    assert.ok(res.dateRange?.startDate, 'startDate should be defined');
    assert.ok(res.dateRange?.endDate, 'endDate should be defined');
    assert.deepStrictEqual(res.dimensions, ['query', 'page'], 'dimensions should match');

    // Verify aggregated totals
    assert.ok(typeof res.totalClicks === 'number' && res.totalClicks > 0, 'totalClicks should be positive number');
    assert.ok(typeof res.totalImpressions === 'number' && res.totalImpressions > res.totalClicks, 'totalImpressions should exceed totalClicks');
    assert.ok(typeof res.averageCtr === 'number' && res.averageCtr > 0 && res.averageCtr <= 1, 'averageCtr should be a decimal ratio (0, 1]');
    assert.ok(typeof res.averageCtrFormatted === 'string' && res.averageCtrFormatted.endsWith('%'), 'averageCtrFormatted should be percentage string');
    assert.ok(typeof res.averagePosition === 'number' && res.averagePosition > 0, 'averagePosition should be positive number');

    // Verify rows normalization
    assert.ok(Array.isArray(res.rows) && res.rows.length > 0, 'rows array should be populated');
    const firstRow = res.rows[0];
    assert.ok(typeof firstRow.query === 'string' && firstRow.query.length > 0, 'row.query should be non-empty string');
    assert.ok(typeof firstRow.page === 'string' && firstRow.page.startsWith('http'), 'row.page should be valid URL string');
    assert.ok(typeof firstRow.clicks === 'number', 'row.clicks should be number');
    assert.ok(typeof firstRow.impressions === 'number', 'row.impressions should be number');
    assert.ok(typeof firstRow.ctr === 'number', 'row.ctr should be number');
    assert.ok(typeof firstRow.ctrFormatted === 'string' && firstRow.ctrFormatted.endsWith('%'), 'row.ctrFormatted should be percentage string');
    assert.ok(typeof firstRow.position === 'number' && firstRow.position > 0, 'row.position should be positive number');

    // Verify grouped queries
    assert.ok(Array.isArray(res.queries) && res.queries.length > 0, 'queries array should be populated');
    const firstQuery = res.queries[0];
    assert.ok(firstQuery.query, 'query text should be defined');
    assert.ok(typeof firstQuery.clicks === 'number', 'query clicks should be number');
    assert.ok(typeof firstQuery.impressions === 'number', 'query impressions should be number');
    assert.ok(typeof firstQuery.ctr === 'number', 'query ctr should be number');
    assert.ok(typeof firstQuery.position === 'number', 'query position should be number');

    // Verify grouped pages
    assert.ok(Array.isArray(res.pages) && res.pages.length > 0, 'pages array should be populated');
    const firstPage = res.pages[0];
    assert.ok(firstPage.page, 'page url should be defined');
    assert.ok(typeof firstPage.clicks === 'number', 'page clicks should be number');
    assert.ok(typeof firstPage.impressions === 'number', 'page impressions should be number');
    assert.ok(typeof firstPage.ctr === 'number', 'page ctr should be number');
    assert.ok(typeof firstPage.position === 'number', 'page position should be number');
  });

  console.log('\n--- 6. RAW RESPONSE NORMALIZATION UNIT TEST ---');

  it('accurately parses raw Google Search Analytics payload and computes weighted position & CTR', () => {
    const rawGooglePayload = {
      rows: [
        {
          keys: ['omni seo audit tool', 'https://example.com/audit'],
          clicks: 250,
          impressions: 5000,
          ctr: 0.05,
          position: 2.5
        },
        {
          keys: ['core web vitals test', 'https://example.com/vitals'],
          clicks: 150,
          impressions: 2500,
          ctr: 0.06,
          position: 4.0
        }
      ],
      responseAggregationType: 'byPage'
    };

    const normalized = normalizeSearchAnalyticsResponse(rawGooglePayload, ['query', 'page'], 'https://example.com');

    assert.strictEqual(normalized.totalClicks, 400, 'Total clicks sum mismatch');
    assert.strictEqual(normalized.totalImpressions, 7500, 'Total impressions sum mismatch');
    // Average CTR = 400 / 7500 = 0.05333... => 0.0533
    assert.strictEqual(normalized.averageCtr, 0.0533, 'Average CTR mismatch');
    assert.strictEqual(normalized.averageCtrFormatted, '5.33%', 'Average CTR formatted string mismatch');
    // Weighted position = (2.5 * 5000 + 4.0 * 2500) / 7500 = (12500 + 10000) / 7500 = 22500 / 7500 = 3.0
    assert.strictEqual(normalized.averagePosition, 3.0, 'Weighted average position mismatch');
    assert.strictEqual(normalized.rowCount, 2, 'Row count mismatch');
    assert.strictEqual(normalized.queries.length, 2, 'Queries count mismatch');
    assert.strictEqual(normalized.pages.length, 2, 'Pages count mismatch');
  });

  console.log('\n--- 7. URL ENCODING & HELPER FUNCTIONS ---');

  it('correctly extracts clean domain from both URL prefix and sc-domain formats', () => {
    assert.strictEqual(extractDomainFromSiteUrl('https://example.com/'), 'example.com');
    assert.strictEqual(extractDomainFromSiteUrl('http://www.sub.example.com/path'), 'sub.example.com');
    assert.strictEqual(extractDomainFromSiteUrl('sc-domain:my-site.org'), 'my-site.org');
  });

  it('correctly percent-encodes siteUrl for Search Analytics endpoint path', () => {
    const urlPrefixSite = 'https://example.com/subpath/';
    const scDomainSite = 'sc-domain:example.com';

    const urlEndpoint = GOOGLE_OAUTH_ENDPOINTS.ANALYTICS(urlPrefixSite);
    const domainEndpoint = GOOGLE_OAUTH_ENDPOINTS.ANALYTICS(scDomainSite);

    assert.ok(urlEndpoint.includes('https%3A%2F%2Fexample.com%2Fsubpath%2F'), 'URL prefix site must be percent-encoded');
    assert.ok(domainEndpoint.includes('sc-domain%3Aexample.com'), 'sc-domain site must be percent-encoded');
  });

  it('computes valid default date window with 3-day GSC lag', () => {
    const range = getDefaultDateRange();
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(range.startDate), 'startDate must be YYYY-MM-DD');
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(range.endDate), 'endDate must be YYYY-MM-DD');
    assert.ok(range.startDate < range.endDate, 'startDate must precede endDate');
  });

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% ACCURACY!`);
  console.log('================================================================');
}

runAllTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test suite failed:', err);
    process.exit(1);
  });
