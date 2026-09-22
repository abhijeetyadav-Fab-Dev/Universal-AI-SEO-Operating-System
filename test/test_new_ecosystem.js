/**
 * ==============================================================================
 * OmniSEO-OS Extended Agentic Skills & Tools Ecosystem Verification Suite
 * Tests Browser-Use, AgentMemory, Diagram-Design, Scientific Agent Skills,
 * Awesome Harness Engineering, OpenViking, and Anthropic Cybersecurity Skills.
 *
 * Usage: node test/test_new_ecosystem.js
 * Expected: Exit code 0
 * ==============================================================================
 */

import assert from 'assert';
import { crawlInteractive, takeDomSnapshot } from '../server/adapters/browser_use.js';
import { remember, recall, forget, getMemoryStats } from '../server/adapters/agentmemory.js';
import { generateSeoDiagram } from '../server/adapters/diagram_design.js';
import { searchScientificLiterature, verifyScientificCitations } from '../server/adapters/scientific_skills.js';
import { runAgentHarnessEvaluation } from '../server/adapters/harness_engineering.js';
import { compressAgentContext, getOpenVikingTierStats } from '../server/adapters/openviking.js';
import { auditSecurityPosture } from '../server/adapters/cybersecurity.js';

let passed = 0;
let total = 0;

function syncTest(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function asyncTest(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('='.repeat(72));
console.log('🧪 RUNNING OMNISEO-OS AGENT ARSENAL & ECOSYSTEM TEST SUITE');
console.log('='.repeat(72));

// ─────────────────────────────────────────────────────────────────
// SECTION 1: Browser-Use Adapter (DOM Grounding & Accessibility)
// ─────────────────────────────────────────────────────────────────
console.log('\n[SECTION 1] Browser-Use Adapter Tests...');

await asyncTest('crawlInteractive extracts interactive elements & landmarks', async () => {
  const result = await crawlInteractive({ url: 'https://example.com' });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.dataStatus, 'measured');
  assert.ok(result.interactiveElementsCount >= 1);
  assert.ok(result.interactiveElements[0].isClickable);
  assert.ok(typeof result.accessibilityScore === 'number');
  assert.ok(result.source.includes('browser-use'));
});

await asyncTest('takeDomSnapshot extracts targeted DOM snippet', async () => {
  const snapshot = await takeDomSnapshot({ url: 'https://example.com', selector: 'h1' });
  assert.strictEqual(snapshot.success, true);
  assert.ok(snapshot.domSnippet.includes('Example Domain') || snapshot.domSnippet.length > 0);
  assert.strictEqual(snapshot.viewport.isResponsive, true);
});

await asyncTest('Browser-Use blocks SSRF localhost addresses', async () => {
  let threw = false;
  try {
    await crawlInteractive({ url: 'http://localhost:4000' });
  } catch (err) {
    threw = true;
    assert.ok(err.message.includes('SSRF Protection'));
  }
  assert.ok(threw, 'Blocked loopback URL successfully');
});

// ─────────────────────────────────────────────────────────────────
// SECTION 2: AgentMemory Adapter (Persistent Multi-Tier Memory)
// ─────────────────────────────────────────────────────────────────
console.log('\n[SECTION 2] AgentMemory Hybrid Store Tests...');

syncTest('remember stores knowledge across memory tiers', () => {
  const mem1 = remember({
    key: 'test_lcp_fix',
    value: 'Preload the LCP hero image with rel="preload" as="image".',
    type: 'semantic',
    tags: ['cwv', 'lcp', 'performance']
  });
  assert.strictEqual(mem1.success, true);
  assert.strictEqual(mem1.key, 'test_lcp_fix');

  const mem2 = remember({
    key: 'test_session_crawl',
    value: { url: 'https://example.com', score: 92 },
    type: 'episodic',
    tags: ['crawls']
  });
  assert.strictEqual(mem2.success, true);
});

syncTest('recall retrieves relevant memories by token scoring', () => {
  const recalled = recall({ query: 'hero image preload' });
  assert.strictEqual(recalled.success, true);
  assert.ok(recalled.count >= 1);
  assert.ok(recalled.memories.some(m => m.key === 'test_lcp_fix'));
  assert.ok(recalled.estimatedTokensSaved >= 0);
});

syncTest('getMemoryStats reports memory counts across tiers', () => {
  const stats = getMemoryStats();
  assert.strictEqual(stats.success, true);
  assert.ok(stats.totalMemories >= 2);
  assert.strictEqual(stats.retrievalSpeed, '< 1ms');
});

syncTest('forget removes specified memory entry', () => {
  const f = forget({ key: 'test_lcp_fix', type: 'semantic' });
  assert.strictEqual(f.success, true);
  assert.strictEqual(f.removed, true);
});

// ─────────────────────────────────────────────────────────────────
// SECTION 3: Diagram Design Adapter (Accessible Mermaid Diagrams)
// ─────────────────────────────────────────────────────────────────
console.log('\n[SECTION 3] Diagram Design Adapter Tests...');

syncTest('generateSeoDiagram produces site_architecture flowchart', () => {
  const d = generateSeoDiagram({ type: 'site_architecture', data: { url: 'https://target.com' } });
  assert.strictEqual(d.success, true);
  assert.strictEqual(d.diagramType, 'site_architecture');
  assert.ok(d.mermaid.includes('graph TD'));
  assert.ok(d.mermaid.includes('https://target.com'));
  assert.ok(d.wcagContrastRatio.includes('WCAG AAA'));
});

syncTest('generateSeoDiagram produces redirect_chain sequence diagram', () => {
  const d = generateSeoDiagram({ type: 'redirect_chain' });
  assert.strictEqual(d.success, true);
  assert.ok(d.mermaid.includes('sequenceDiagram'));
  assert.ok(d.mermaid.includes('HTTP 301'));
});

syncTest('generateSeoDiagram produces eeat_graph entity relationships', () => {
  const d = generateSeoDiagram({ type: 'eeat_graph', data: { brand: 'Acme Corp', author: 'Dr. Jane Doe' } });
  assert.strictEqual(d.success, true);
  assert.ok(d.mermaid.includes('Dr. Jane Doe'));
  assert.ok(d.mermaid.includes('E-E-A-T'));
});

// ─────────────────────────────────────────────────────────────────
// SECTION 4: Scientific Agent Skills (Scholarly Citations)
// ─────────────────────────────────────────────────────────────────
console.log('\n[SECTION 4] Scientific Agent Skills Tests...');

await asyncTest('searchScientificLiterature queries CrossRef API', async () => {
  const res = await searchScientificLiterature({ query: 'Core Web Vitals search ranking', rows: 2 });
  assert.strictEqual(res.success, true);
  assert.ok(Array.isArray(res.papers));
  assert.ok(res.source.includes('scientific-agent-skills'));
});

await asyncTest('verifyScientificCitations validates claims & generates Schema.org', async () => {
  const verified = await verifyScientificCitations({
    claims: ['Page speed directly influences user engagement metrics'],
    domain: 'example.com'
  });
  assert.strictEqual(verified.success, true);
  assert.strictEqual(verified.totalClaimsAudited, 1);
  assert.ok(typeof verified.academicEeatScore === 'number');
  assert.strictEqual(verified.recommendedSchema['@type'], 'ScholarlyArticle');
});

// ─────────────────────────────────────────────────────────────────
// SECTION 5: Awesome Harness Engineering (Faults & Drift)
// ─────────────────────────────────────────────────────────────────
console.log('\n[SECTION 5] Awesome Harness Engineering Tests...');

await asyncTest('runAgentHarnessEvaluation executes multi-pillar benchmarks', async () => {
  const harness = await runAgentHarnessEvaluation({ suite: 'all' });
  assert.strictEqual(harness.success, true);
  assert.ok(harness.totalTests >= 5);
  assert.strictEqual(harness.failed, 0);
  assert.strictEqual(harness.passRate, '100%');
  assert.strictEqual(harness.verdict, 'HARNESS_CERTIFIED');
  assert.ok(harness.faultResilienceScore >= 90);
});

// ─────────────────────────────────────────────────────────────────
// SECTION 6: OpenViking Context Database (Token Compression)
// ─────────────────────────────────────────────────────────────────
console.log('\n[SECTION 6] OpenViking Context Database Tests...');

syncTest('compressAgentContext partitions into L0-L3 tiers and saves tokens', () => {
  const rawHtml = '<html><head><script>console.log(1)</script></head><body>' + '<p>Long repetitive content paragraph. </p>'.repeat(50) + '</body></html>';
  const result = compressAgentContext({
    rawContext: rawHtml,
    userPrompt: 'Analyze the heading distribution for SEO',
    maxTokens: 500
  });
  assert.strictEqual(result.success, true);
  assert.ok(result.tiers.L0 && result.tiers.L1 && result.tiers.L2 && result.tiers.L3);
  assert.ok(result.stats.estimatedTokensSaved > 0);
  assert.ok(result.optimizedPrompt.includes('PAGE_SIGNALS:'));
});

syncTest('getOpenVikingTierStats reports active context slots', () => {
  const stats = getOpenVikingTierStats();
  assert.strictEqual(stats.success, true);
  assert.strictEqual(stats.activeContextSlots, 4);
});

// ─────────────────────────────────────────────────────────────────
// SECTION 7: Anthropic Cybersecurity Skills (Header Posture)
// ─────────────────────────────────────────────────────────────────
console.log('\n[SECTION 7] Anthropic Cybersecurity Skills Tests...');

await asyncTest('auditSecurityPosture evaluates HTTP headers & MITRE mapping', async () => {
  const sec = await auditSecurityPosture('https://example.com');
  assert.strictEqual(sec.success, true);
  assert.strictEqual(sec.isHttps, true);
  assert.ok(typeof sec.securityScore === 'number');
  assert.ok(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(sec.riskTier));
  assert.ok(Array.isArray(sec.headerAudits));
  assert.ok(sec.headerAudits.some(h => h.header === 'content-security-policy'));
  assert.ok(sec.mitreFrameworkCoverage.includes('MITRE ATT&CK'));
});

// ─────────────────────────────────────────────────────────────────
// SECTION 8: Express REST API Live Endpoints
// ─────────────────────────────────────────────────────────────────
console.log('\n[SECTION 8] Server REST API Endpoints Tests...');
const baseUrl = 'http://localhost:4000';

await asyncTest('POST /api/browser-use/crawl returns 200 with interactive DOM', async () => {
  const res = await fetch(`${baseUrl}/api/browser-use/crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com' })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.interactiveElements));
});

await asyncTest('POST /api/memory/remember stores knowledge via REST', async () => {
  const res = await fetch(`${baseUrl}/api/memory/remember`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: 'rest_mem_test',
      value: 'Target canonical must always match the final resolved 200 URL.',
      type: 'semantic'
    })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
});

await asyncTest('GET /api/memory/recall retrieves stored memory via REST', async () => {
  const res = await fetch(`${baseUrl}/api/memory/recall?query=canonical`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.count >= 1);
});

await asyncTest('GET /api/memory/stats returns memory breakdown via REST', async () => {
  const res = await fetch(`${baseUrl}/api/memory/stats`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.totalMemories >= 1);
});

await asyncTest('POST /api/diagrams/generate returns Mermaid diagram via REST', async () => {
  const res = await fetch(`${baseUrl}/api/diagrams/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'site_architecture' })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.mermaid.includes('graph TD'));
});

await asyncTest('POST /api/scientific/search queries literature via REST', async () => {
  const res = await fetch(`${baseUrl}/api/scientific/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'web performance latency' })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.papers));
});

await asyncTest('POST /api/harness/evaluate runs agent benchmarks via REST', async () => {
  const res = await fetch(`${baseUrl}/api/harness/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suite: 'schema_integrity' })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.passRate, '100%');
});

await asyncTest('POST /api/openviking/compress token-optimizes context via REST', async () => {
  const res = await fetch(`${baseUrl}/api/openviking/compress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawContext: '<div>Sample context body</div>', userPrompt: 'Test prompt' })
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.tiers.L0);
});

await asyncTest('GET /api/security/audit evaluates target security via REST', async () => {
  const res = await fetch(`${baseUrl}/api/security/audit?url=https://example.com`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.headerAudits.length > 0);
});

console.log('\n' + '='.repeat(72));
console.log(`🎉 ALL ${passed}/${total} AGENT ARSENAL & ECOSYSTEM TESTS PASSED SUCCESSFULLY!`);
console.log('='.repeat(72));
process.exit(0);
