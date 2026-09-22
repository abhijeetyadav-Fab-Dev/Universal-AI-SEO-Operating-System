/**
 * Automated Test Suite: FreeLLMAPI Integration
 * Verifies keyless, zero-auth, 100% free open-source LLM inference
 * based on https://github.com/tashfeenahmed/freellmapi
 * 
 * Features verified:
 * - Direct provider connectors: Pollinations AI & AI Horde
 * - FreeLLMAPI catalog discovery & model endpoints
 * - Connection health checker with latency metrics
 * - Universal query dispatcher with fallback & helpful content guardrail
 * - OpenSEO handleAiPrompt copilot integration
 * - Server REST API endpoints (/api/freellmapi/chat, /api/freellmapi/models, /api/settings/test)
 */

import assert from 'node:assert';
import {
  queryFreeLlm,
  testFreeLlmConnection,
  getFreeLlmCatalog
} from '../server/adapters/freellmapi.js';
import { handleAiPrompt } from '../server/adapters/openseo.js';

console.log('========================================================================');
console.log('🧪 RUNNING FREELLMAPI KEYLESS LLM INFERENCE AUTOMATED TEST SUITE');
console.log('========================================================================\n');

let passCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// ─── 1. FREELLMAPI CATALOG & METADATA TESTS ─────────────────────────────
console.log('[SECTION 1] FreeLLMAPI Catalog & Provider Discovery...');

await asyncTest('getFreeLlmCatalog returns multi-tier keyless providers and GitHub repo attribution', async () => {
  const catalog = await getFreeLlmCatalog();
  assert.strictEqual(catalog.success, true, 'Catalog response has success: true');
  assert.strictEqual(catalog.repository, 'https://github.com/tashfeenahmed/freellmapi');
  assert.ok(Array.isArray(catalog.providers), 'Catalog providers is an array');

  const pollinations = catalog.providers.find(p => p.id === 'pollinations');
  assert.ok(pollinations, 'Pollinations AI provider listed in catalog');
  assert.ok(pollinations.auth.includes('Keyless'), 'Pollinations documented as keyless');

  const aihorde = catalog.providers.find(p => p.id === 'aihorde');
  assert.ok(aihorde, 'AI Horde provider listed in catalog');
  assert.ok(aihorde.auth.includes('0000000000'), 'AI Horde documents anonymous key');

  const local = catalog.providers.find(p => p.id === 'local');
  assert.ok(local, 'Local FreeLLMAPI gateway listed in catalog');
});

// ─── 2. ADAPTER LEVEL INFERENCE & CONNECTION TESTS ───────────────────────
console.log('\n[SECTION 2] FreeLLMAPI Adapter Execution & Health Check...');

await asyncTest('testFreeLlmConnection successfully validates Pollinations AI without API keys', async () => {
  const result = await testFreeLlmConnection({ provider: 'pollinations' });
  assert.strictEqual(result.success, true, 'Pollinations test returned success: true');
  assert.strictEqual(result.provider, 'pollinations');
  assert.ok(result.latencyMs > 0, 'Measured positive round-trip latency');
  assert.ok(result.message.includes('Pollinations AI'), 'Message mentions Pollinations AI');
});

await asyncTest('queryFreeLlm executes live keyless reasoning with measured status', async () => {
  const prompt = 'In 1 sentence, explain why E-E-A-T matters for search ranking.';
  const result = await queryFreeLlm({
    prompt,
    provider: 'pollinations',
    timeoutMs: 25000
  });

  assert.strictEqual(result.success, true, 'Query succeeded');
  assert.strictEqual(result.dataStatus, 'measured', 'Marked as measured live DOM/API');
  assert.strictEqual(result.isSimulated, false, 'Marked as non-simulated');
  assert.ok(typeof result.response === 'string' && result.response.length > 10, 'Returned substantive text');
  assert.ok(result.provenance.includes('FreeLLMAPI'), 'Provenance attributes FreeLLMAPI');
});

await asyncTest('queryFreeLlm with dead custom URL throws structured connection error', async () => {
  let thrown = false;
  try {
    await queryFreeLlm({
      prompt: 'Ping',
      provider: 'custom',
      customUrl: 'http://127.0.0.1:59999/v1',
      timeoutMs: 2000
    });
  } catch (err) {
    thrown = true;
    assert.ok(err.message.length > 0, 'Error message populated');
  }
  assert.strictEqual(thrown, true, 'Expected custom gateway with invalid port to fail gracefully');
});

// ─── 3. OPENSEO INTEGRATION TESTS ───────────────────────────────────────
console.log('\n[SECTION 3] OpenSEO handleAiPrompt Copilot Integration...');

await asyncTest('handleAiPrompt routes to FreeLLMAPI when useFreeLlm option is set', async () => {
  const result = await handleAiPrompt(
    'Recommend 3 high-impact SEO titles for our ecommerce store',
    'https://example.com',
    { useFreeLlm: true, freellmProvider: 'pollinations' }
  );

  assert.strictEqual(result.isRealLlm, true, 'Identified as real LLM inference');
  assert.strictEqual(result.dataStatus, 'measured', 'Data status is measured');
  assert.strictEqual(result.isSimulated, false, 'Not simulated');
  assert.ok(result.model.includes('FreeLLMAPI'), 'Model label includes FreeLLMAPI');
  assert.ok(result.provenance.includes('FreeLLMAPI / Pollinations AI'), 'Provenance specifies Pollinations');
  assert.ok(typeof result.response === 'string' && result.response.length > 15, 'Response text present');
});

await asyncTest('handleAiPrompt maintains backward-compatible heuristic fallback when options are empty', async () => {
  const result = await handleAiPrompt('Generate meta tags', null, {});
  assert.strictEqual(result.isRealLlm, false, 'Fallback heuristic returns isRealLlm: false');
  assert.strictEqual(result.dataStatus, 'simulated', 'Simulated data status for unconfigured mode');
  assert.ok(result.response.includes('[Rule-Based Heuristic'), 'Contains transparency notice');
  assert.ok(result.response.includes('FreeLLMAPI'), 'Notice suggests FreeLLMAPI as free option');
  assert.ok(result.response.includes('OpenRouter'), 'Notice still suggests OpenRouter');
});

// ─── 4. SERVER REST API ENDPOINT TESTS ──────────────────────────────────
console.log('\n[SECTION 4] Server REST API Endpoints...');
const serverBase = 'http://localhost:4000';

await asyncTest('GET /api/freellmapi/models returns 200 with catalog', async () => {
  const res = await fetch(`${serverBase}/api/freellmapi/models`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.providers));
});

await asyncTest('POST /api/freellmapi/chat returns 200 with generated answer', async () => {
  const res = await fetch(`${serverBase}/api/freellmapi/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Return exactly: FreeLLMAPI OK',
      provider: 'pollinations'
    })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.isSimulated, false);
  assert.strictEqual(data.dataStatus, 'measured');
  assert.ok(data.response.length > 0);
  assert.ok(data.provenance.includes('FreeLLMAPI'));
});

await asyncTest('POST /api/settings/test verifies freellmapi service parameter', async () => {
  const res = await fetch(`${serverBase}/api/settings/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service: 'freellmapi',
      provider: 'pollinations'
    })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.message.includes('successful'));
  assert.ok(data.latencyMs > 0);
});

await asyncTest('POST /api/settings/save stores freellmapi preferences', async () => {
  const res = await fetch(`${serverBase}/api/settings/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      freellmEnabled: true,
      freellmProvider: 'pollinations',
      freellmCustomUrl: ''
    })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.settings.freellmapi, 'Settings response includes freellmapi');
  assert.strictEqual(data.settings.freellmapi.keyless, true);
});

await asyncTest('GET /api/settings returns freellmapi configuration schema', async () => {
  const res = await fetch(`${serverBase}/api/settings`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.settings.freellmapi, 'freellmapi present in settings');
  assert.strictEqual(data.settings.freellmapi.configured, true);
  assert.strictEqual(data.settings.freellmapi.keyless, true);
  assert.strictEqual(data.settings.freellmapi.source, 'https://github.com/tashfeenahmed/freellmapi');
});

console.log('\n========================================================================');
console.log(`🎉 ALL ${passCount} FREELLMAPI AUTOMATED TESTS PASSED SUCCESSFULLY!`);
console.log('========================================================================\n');
process.exit(0);
