import assert from 'assert';
import fetch from 'node-fetch';
import {
  analyzeDeprecation,
  unpackOpenApiSpec,
  extractEndpointsFromScript,
  profileRootHtml,
  isSpaCatchAll,
  scanWebsiteEndpoints,
  testPlatformEndpoints,
  PLATFORM_REGISTRY
} from '../server/adapters/api_health.js';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4000';

async function runTests() {
  console.log('🧪 Starting API Health, Endpoint Probing & Deprecation Suite...\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
      failed++;
    }
  }

  // ─── 1. DEPRECATION ANALYZER UNIT TESTS ──────────────────
  console.log('--- 1. Deprecation Analyzer (RFC 8594 / Sunset / HTTP 410 / OpenAPI) ---');

  test('Detects RFC 8594 "Deprecation: true" header', () => {
    const res = analyzeDeprecation(200, { deprecation: 'true' }, '', '/v1/users');
    assert.strictEqual(res.isDeprecated, true);
    assert.ok(res.reasons.some(r => r.includes('RFC 8594')));
  });

  test('Detects RFC 8594 "Sunset" header with date', () => {
    const res = analyzeDeprecation(200, { sunset: 'Wed, 11 Nov 2026 00:00:00 GMT' }, '', '/api/v1');
    assert.strictEqual(res.isDeprecated, true);
    assert.strictEqual(res.sunsetDate, 'Wed, 11 Nov 2026 00:00:00 GMT');
    assert.ok(res.reasons.some(r => r.includes('Sunset header')));
  });

  test('Detects HTTP 410 Gone status', () => {
    const res = analyzeDeprecation(410, {}, '', '/legacy/resource');
    assert.strictEqual(res.isDeprecated, true);
    assert.ok(res.reasons.some(r => r.includes('HTTP 410 Gone')));
  });

  test('Detects RFC 7234 "Warning: 299" deprecation header', () => {
    const res = analyzeDeprecation(200, { warning: '299 - "API endpoint has been deprecated"' }, '', '/api/feed');
    assert.strictEqual(res.isDeprecated, true);
    assert.ok(res.reasons.some(r => r.includes('Warning header')));
  });

  test('Detects deprecation notices in JSON/text response bodies', () => {
    const res = analyzeDeprecation(200, { 'content-type': 'application/json' }, '{"error": "This API endpoint is deprecated and will be removed"}', '/api/users');
    assert.strictEqual(res.isDeprecated, true);
    assert.ok(res.reasons.some(r => r.includes('body indicates deprecation')));
  });

  test('Detects deprecation from OpenAPI spec deprecated flag', () => {
    const res = analyzeDeprecation(200, { 'content-type': 'application/json' }, '{"status": "ok"}', '/api/v1/legacy', true);
    assert.strictEqual(res.isDeprecated, true);
    assert.ok(res.reasons.some(r => r.includes('OpenAPI / Swagger spec explicitly flags this operation as deprecated')));
  });

  test('Active endpoint with no flags returns isDeprecated: false', () => {
    const res = analyzeDeprecation(200, { 'content-type': 'application/json' }, '{"status": "ok"}', '/api/v2/items');
    assert.strictEqual(res.isDeprecated, false);
    assert.strictEqual(res.reasons.length, 0);
  });

  // ─── 1.2 OPENAPI SPEC UNPACKER TESTS ─────────────────────
  console.log('\n--- 1.2 OpenAPI & Swagger Spec Unpacker ---');

  test('Unpacks operations, parameters, and deprecated status from OpenAPI 3.x spec', () => {
    const mockSpec = {
      openapi: '3.0.1',
      servers: [{ url: '/api/v1' }],
      paths: {
        '/users': {
          get: { summary: 'List all users', parameters: [{ name: 'limit' }, { name: 'offset' }] },
          post: { summary: 'Create user' }
        },
        '/users/{id}': {
          get: { summary: 'Get user by ID', parameters: [{ name: 'id' }] },
          delete: { summary: 'Delete user', deprecated: true }
        }
      }
    };

    const unpacked = unpackOpenApiSpec(mockSpec, 'https://example.com/openapi.json', 'https://example.com');
    assert.strictEqual(unpacked.length, 4);

    const deleteOp = unpacked.find(op => op.method === 'DELETE');
    assert.ok(deleteOp, 'Expected DELETE operation to be unpacked');
    assert.strictEqual(deleteOp.path, '/api/v1/users/{id}');
    assert.strictEqual(deleteOp.deprecatedInSpec, true);

    const getOp = unpacked.find(op => op.method === 'GET' && op.path === '/api/v1/users');
    assert.ok(getOp, 'Expected GET /api/v1/users');
    assert.strictEqual(getOp.deprecatedInSpec, false);
    assert.deepStrictEqual(getOp.parameters, ['limit', 'offset']);
  });

  // ─── 1.3 JS BUNDLE ENDPOINT HARVESTER TESTS ──────────────
  console.log('\n--- 1.3 JavaScript Bundle Route Harvester ---');

  test('Extracts REST API routes and GraphQL endpoints from JS bundle source code', () => {
    const mockBundleCode = `
      function loadUser(id) {
        return fetch('/api/v1/users/' + id).then(r => r.json());
      }
      const sessionUrl = "/api/auth/session";
      const analyticsEndpoint = '/v2/analytics/events';
      const gql = '/graphql';
      const ignoreMe = '/assets/logo.png';
      const ignoreScript = '/_next/static/chunks/app.js';
      axios.post('/api/checkout/cart', { items: [] });
    `;

    const routes = extractEndpointsFromScript(mockBundleCode, 'app.chunk.js');
    const paths = routes.map(r => r.path);

    assert.ok(paths.includes('/api/auth/session'), 'Expected /api/auth/session');
    assert.ok(paths.includes('/v2/analytics/events'), 'Expected /v2/analytics/events');
    assert.ok(paths.includes('/graphql'), 'Expected /graphql');
    assert.ok(paths.includes('/api/checkout/cart'), 'Expected /api/checkout/cart');
    assert.ok(!paths.includes('/assets/logo.png'), 'Expected static images to be ignored');
    assert.ok(!paths.includes('/_next/static/chunks/app.js'), 'Expected chunk assets to be ignored');
  });

  // ─── 1.4 SPA FALLBACK / HTML CATCH-ALL DETECTION ─────────
  console.log('\n--- 1.4 SPA Catch-All & Anti-False-Positive Filter ---');

  test('Correctly identifies SPA catch-all when probe returns root HTML template', () => {
    const rootProfile = {
      title: 'Modern SPA Web Application',
      byteLength: 4500,
      isSpa: true
    };

    const probeBody = `<!DOCTYPE html><html><head><title>Modern SPA Web Application</title></head><body><div id="root"></div><script src="/_next/static/main.js"></script></body></html>`;
    const isCatchAll = isSpaCatchAll(200, { 'content-type': 'text/html; charset=utf-8' }, probeBody, rootProfile, '/api/random-probe');

    assert.strictEqual(isCatchAll, true, 'SPA index HTML catch-all should be detected as false positive');
  });

  test('Does NOT flag valid Swagger UI / API documentation as catch-all', () => {
    const rootProfile = {
      title: 'App Home',
      byteLength: 4500,
      isSpa: true
    };

    const docBody = `<!DOCTYPE html><html><head><title>API Docs - Swagger UI</title></head><body><div id="swagger-ui"></div></body></html>`;
    const isCatchAll = isSpaCatchAll(200, { 'content-type': 'text/html; charset=utf-8' }, docBody, rootProfile, '/docs');

    assert.strictEqual(isCatchAll, false, 'Swagger UI documentation should not be treated as SPA catch-all');
  });

  test('Does NOT flag valid JSON responses as catch-all', () => {
    const rootProfile = {
      title: 'App Home',
      byteLength: 4500,
      isSpa: true
    };

    const isCatchAll = isSpaCatchAll(200, { 'content-type': 'application/json' }, '{"status":"ok"}', rootProfile, '/api/health');
    assert.strictEqual(isCatchAll, false, 'JSON response is never a catch-all');
  });

  // ─── 2. PLATFORM REGISTRY CATALOG TESTS ──────────────────
  console.log('\n--- 2. Enterprise Platform Registry Catalog ---');

  test('Registry contains all 25 external platforms', () => {
    assert.strictEqual(PLATFORM_REGISTRY.length, 25);
    const ids = PLATFORM_REGISTRY.map(p => p.id);
    assert.ok(ids.includes('google-psi'));
    assert.ok(ids.includes('google-crux'));
    assert.ok(ids.includes('google-gsc'));
    assert.ok(ids.includes('google-gemini'));
    assert.ok(ids.includes('openrouter'));
    assert.ok(ids.includes('nvidia-nim'));
    assert.ok(ids.includes('openai'));
    assert.ok(ids.includes('freellm'));
    assert.ok(ids.includes('dataforseo'));
    assert.ok(ids.includes('indexnow'));
    assert.ok(ids.includes('screaming-frog'));
    assert.ok(ids.includes('google-dns'));
    assert.ok(ids.includes('open-rdap'));
    assert.ok(ids.includes('wikidata-api'));
    assert.ok(ids.includes('wikimedia-pageviews'));
    assert.ok(ids.includes('datamuse-lsi'));
    assert.ok(ids.includes('google-suggest'));
    assert.ok(ids.includes('ahrefs'));
    assert.ok(ids.includes('semrush'));
    assert.ok(ids.includes('moz'));
    assert.ok(ids.includes('serpapi'));
    assert.ok(ids.includes('anthropic'));
    assert.ok(ids.includes('github-api'));
    assert.ok(ids.includes('stripe-api'));
    assert.ok(ids.includes('cloudflare-api'));
  });

  test('Every platform defines name, category, endpoints, and healthCheck', () => {
    PLATFORM_REGISTRY.forEach(p => {
      assert.ok(p.id, `Platform ${p.id} missing id`);
      assert.ok(p.name, `Platform ${p.id} missing name`);
      assert.ok(p.category, `Platform ${p.id} missing category`);
      assert.ok(Array.isArray(p.endpoints) && p.endpoints.length > 0, `Platform ${p.id} missing endpoints array`);
      assert.ok(p.healthCheck && p.healthCheck.url, `Platform ${p.id} missing healthCheck`);
    });
  });

  // ─── 3. LIVE REST SERVER ENDPOINTS TESTS ─────────────────
  console.log('\n--- 3. Server REST API & SSRF Security Tests ---');

  await testAsync('GET /api/api-health/platforms returns 25 platforms and active config', async () => {
    const res = await fetch(`${BASE_URL}/api/api-health/platforms`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.total, 25);
    assert.ok(Array.isArray(json.platforms));
    assert.strictEqual(json.platforms.length, 25);
  });

  await testAsync('POST /api/api-health/test-platforms performs live health sweep', async () => {
    const res = await fetch(`${BASE_URL}/api/api-health/test-platforms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.totalPlatforms >= 17);
    assert.ok(json.healthyPlatforms >= 8, `Expected at least 8 healthy platforms, got ${json.healthyPlatforms}`);
    assert.ok(Array.isArray(json.results));
    assert.ok(json.results.length >= 17);
  });

  await testAsync('POST /api/api-health/scan probes target website and returns endpoint summary', async () => {
    const res = await fetch(`${BASE_URL}/api/api-health/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.targetUrl.includes('example.com'));
    assert.ok(Array.isArray(json.data.endpoints));
    assert.ok(json.data.endpoints.length > 0);
    assert.ok(json.data.summary.totalEndpoints > 0);
    assert.strictEqual(typeof json.data.summary.healthyEndpoints, 'number');
    assert.strictEqual(typeof json.data.summary.deprecatedEndpoints, 'number');
    assert.strictEqual(typeof json.data.summary.filteredHtmlCatchAlls, 'number');
    assert.strictEqual(typeof json.data.summary.avgLatencyMs, 'number');
    assert.ok(json.data.endpoints[0].format !== undefined);
    assert.ok(typeof json.data.endpoints[0].isRealApi === 'boolean');
  });

  await testAsync('POST /api/api-health/scan auto-recognizes platform domains like app.ahrefs.com', async () => {
    const res = await fetch(`${BASE_URL}/api/api-health/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://app.ahrefs.com/' })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.matchedPlatform);
    assert.strictEqual(json.data.matchedPlatform.id, 'ahrefs');
    assert.ok(json.data.endpoints.some(ep => ep.path && ep.path.includes('/v3/site-explorer/')));
    assert.ok(json.data.endpoints.some(ep => ep.isDeprecated === true));
  });

  await testAsync('POST /api/api-health/scan defends against SSRF (blocks localhost and 127.0.0.1)', async () => {
    const res = await fetch(`${BASE_URL}/api/api-health/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1:8080/admin' })
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.ok(json.error.includes('SSRF') || json.error.includes('Localhost') || json.error.includes('Private IP') || json.error.includes('Invalid URL'));
  });

  console.log(`\n=============================================`);
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`=============================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
