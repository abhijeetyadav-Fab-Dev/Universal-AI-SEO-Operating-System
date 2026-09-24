import assert from 'assert';
import fetch from 'node-fetch';
import {
  analyzeDeprecation,
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
  console.log('--- 1. Deprecation Analyzer (RFC 8594 / Sunset / HTTP 410) ---');

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

  test('Active endpoint with no flags returns isDeprecated: false', () => {
    const res = analyzeDeprecation(200, { 'content-type': 'application/json' }, '{"status": "ok"}', '/api/v2/items');
    assert.strictEqual(res.isDeprecated, false);
    assert.strictEqual(res.reasons.length, 0);
  });

  // ─── 2. PLATFORM REGISTRY CATALOG TESTS ──────────────────
  console.log('\n--- 2. Enterprise Platform Registry Catalog ---');

  test('Registry contains all 17 external platforms', () => {
    assert.strictEqual(PLATFORM_REGISTRY.length, 17);
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

  await testAsync('GET /api/api-health/platforms returns 17 platforms and active config', async () => {
    const res = await fetch(`${BASE_URL}/api/api-health/platforms`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.total, 17);
    assert.ok(Array.isArray(json.platforms));
    assert.strictEqual(json.platforms.length, 17);
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
    assert.strictEqual(typeof json.data.summary.avgLatencyMs, 'number');
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
