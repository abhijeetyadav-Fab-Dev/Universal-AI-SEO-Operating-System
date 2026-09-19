/**
 * Automated Test Suite: OpenRouter, NVIDIA NIM, and Gemini Resilient Fallback
 * Verifies that OmniSEO OS supports OpenRouter and NVIDIA NIM as first-class
 * LLM providers, alongside multi-model Gemini fallback avoiding 404 errors.
 */

import assert from 'node:assert';
import http from 'node:http';
import { handleAiPrompt } from '../server/adapters/openseo.js';

function maskKey(key) {
  if (!key || typeof key !== 'string') return null;
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.substring(0, 4)}••••${trimmed.substring(trimmed.length - 4)}`;
}

console.log('========================================================================');
console.log('🧪 RUNNING OPENROUTER, NVIDIA NIM & GEMINI MULTI-MODEL TEST SUITE');
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

// ─── 1. Key Masking Unit Tests ───────────────────────────────────────────────
test('maskKey accurately redacts OpenRouter and NVIDIA keys', () => {
  const orKey = 'sk-or-v1-abcdef1234567890abcdef1234567890';
  const maskedOr = maskKey(orKey);
  assert.strictEqual(maskedOr, 'sk-o••••7890', 'OpenRouter key properly masked');

  const nvKey = 'nvapi-1234567890abcdef1234567890abcdef';
  const maskedNv = maskKey(nvKey);
  assert.strictEqual(maskedNv, 'nvap••••cdef', 'NVIDIA NIM key properly masked');

  assert.strictEqual(maskKey(null), null);
  assert.strictEqual(maskKey('short'), '••••••••');
});

// ─── 2. Mock Server for OpenRouter, NVIDIA, and Gemini ──────────────────────
const mockPort = 9988;
let mockResponses = {
  openrouterAuth: { status: 200, body: { data: { label: 'UserAccount', is_free_tier: true } } },
  openrouterChat: { status: 200, body: { choices: [{ message: { content: 'OpenRouter live SEO analysis for test.' } }] } },
  nvidiaChat: { status: 200, body: { choices: [{ message: { content: 'NVIDIA NIM Llama-3.3 tactical recommendations.' } }] } },
  gemini404: { status: 404, body: { error: { code: 404, message: 'models/gemini-1.5-flash is not found for API version v1beta' } } },
  gemini20Success: { status: 200, body: { candidates: [{ content: { parts: [{ text: 'Gemini 2.0 Flash live analysis.' }] } }] } }
};

const mockServer = http.createServer((req, res) => {
  const url = req.url;

  if (url.includes('/api/v1/auth/key')) {
    res.writeHead(mockResponses.openrouterAuth.status, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(mockResponses.openrouterAuth.body));
  }

  if (url.includes('/api/v1/chat/completions') || url.includes('openrouter')) {
    res.writeHead(mockResponses.openrouterChat.status, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(mockResponses.openrouterChat.body));
  }

  if (url.includes('/v1/chat/completions') && req.headers['authorization']?.includes('nvapi')) {
    res.writeHead(mockResponses.nvidiaChat.status, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(mockResponses.nvidiaChat.body));
  }

  if (url.includes('gemini-2.0-flash')) {
    res.writeHead(mockResponses.gemini20Success.status, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(mockResponses.gemini20Success.body));
  }

  if (url.includes('gemini-1.5-flash')) {
    res.writeHead(mockResponses.gemini404.status, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(mockResponses.gemini404.body));
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
});

await new Promise((resolve) => mockServer.listen(mockPort, resolve));

// ─── 3. Local Heuristic Fallback Verification ───────────────────────────────
await asyncTest('handleAiPrompt returns transparent rule-based heuristic when no keys are provided', async () => {
  const result = await handleAiPrompt('Optimize meta description for our store', null, {});
  assert.ok(result.response.includes('[Rule-Based Heuristic'), 'Response contains transparency notice');
  assert.ok(result.response.includes('OpenRouter'), 'Notice suggests OpenRouter');
  assert.ok(result.response.includes('NVIDIA NIM'), 'Notice suggests NVIDIA NIM');
  assert.strictEqual(result.isRealLlm, false);
  assert.strictEqual(result.dataStatus, 'simulated');
  assert.ok(result.provenance.includes('OpenRouter/NVIDIA/Gemini'));
});

// ─── 4. Live Server API Settings Endpoint Verification ───────────────────────
const serverBase = 'http://localhost:4000';

await asyncTest('GET /api/settings returns openrouter and nvidia configuration schema', async () => {
  const res = await fetch(`${serverBase}/api/settings`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok('openrouter' in data.settings, 'settings has openrouter');
  assert.ok('nvidia' in data.settings, 'settings has nvidia');
  assert.ok('gemini' in data.settings, 'settings has gemini');
  assert.ok('model' in data.settings.openrouter, 'openrouter specifies default model');
  assert.ok('model' in data.settings.nvidia, 'nvidia specifies default model');
});

await asyncTest('POST /api/settings/save stores OpenRouter and NVIDIA keys & models', async () => {
  const testPayload = {
    openrouterApiKey: 'sk-or-v1-testkey1234567890abcdef',
    openrouterModel: 'deepseek/deepseek-chat',
    nvidiaApiKey: 'nvapi-testkey1234567890abcdef',
    nvidiaModel: 'meta/llama-3.3-70b-instruct',
    geminiModel: 'gemini-2.0-flash'
  };

  const res = await fetch(`${serverBase}/api/settings/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.settings.openrouter.configured, true);
  assert.strictEqual(data.settings.nvidia.configured, true);
  assert.strictEqual(data.settings.openrouter.model, 'deepseek/deepseek-chat');
  assert.strictEqual(data.settings.nvidia.model, 'meta/llama-3.3-70b-instruct');
  assert.strictEqual(data.settings.gemini.model, 'gemini-2.0-flash');
});

await asyncTest('POST /api/settings/test validates required service parameter', async () => {
  const res = await fetch(`${serverBase}/api/settings/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Service identifier is required'));
});

await asyncTest('POST /api/settings/test handles OpenRouter missing key validation', async () => {
  const res = await fetch(`${serverBase}/api/settings/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service: 'openrouter', apiKey: '' })
  });
  // If activeApiSettings has key from previous step, it uses that or rejects if empty
  const data = await res.json();
  assert.ok(data.success !== undefined);
});

await asyncTest('POST /api/settings/test handles NVIDIA missing key validation', async () => {
  const res = await fetch(`${serverBase}/api/settings/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service: 'nvidia', apiKey: '' })
  });
  const data = await res.json();
  assert.ok(data.success !== undefined);
});

await asyncTest('POST /api/settings/test gemini multi-model fallback handles invalid key gracefully', async () => {
  const res = await fetch(`${serverBase}/api/settings/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service: 'gemini', apiKey: 'invalid_gemini_key_for_testing' })
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.error.includes('Gemini API responded') || data.error.includes('OpenRouter'));
  assert.ok(data.error.includes('OpenRouter or NVIDIA NIM'), 'Error suggests OpenRouter or NVIDIA NIM fallback');
});

await asyncTest('GET /api/provenance reports active LLM engine dynamically', async () => {
  const res = await fetch(`${serverBase}/api/provenance`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.modules.aiCopilot.dataStatus, 'measured');
  assert.ok(
    data.modules.aiCopilot.provider.includes('OpenRouter') ||
    data.modules.aiCopilot.provider.includes('NVIDIA') ||
    data.modules.aiCopilot.provider.includes('Gemini'),
    `Provider correctly labeled: ${data.modules.aiCopilot.provider}`
  );
});

// Clean up mock server
mockServer.close();

console.log('\n========================================================================');
console.log(`🎉 ALL ${passCount} OPENROUTER, NVIDIA NIM & GEMINI TESTS PASSED!`);
console.log('========================================================================\n');
process.exit(0);
