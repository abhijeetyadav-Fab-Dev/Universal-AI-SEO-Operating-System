import assert from 'node:assert';
import { evaluateHelpfulContent, auditHelpfulContentGuardrail, auditHeadAndEeat } from '../server/adapters/head_eeat.js';
import { executeOrchestratedPlan } from '../server/engine/orchestrator.js';

const PORT = 4000;
const BASE_URL = `http://localhost:${PORT}`;

let passedCount = 0;
let failedCount = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failedCount++;
  }
}

console.log('========================================================================');
console.log('🧪 RUNNING GOOGLE HELPFUL CONTENT SYSTEM & E-E-A-T GUARDRAIL TEST SUITE');
console.log('   Standard: https://developers.google.com/search/docs/fundamentals/creating-helpful-content');
console.log('========================================================================\n');

// 1. High Quality People-First Content Audit
await test('evaluates high-quality people-first content with COMPLIANT_PEOPLE_FIRST verdict', () => {
  const highQualityHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <title>Comprehensive Enterprise Database Benchmarking Guide</title>
    <meta name="description" content="An in-depth empirical comparison of Postgres, MySQL, and CockroachDB performance under 100k QPS workloads.">
    <link rel="canonical" href="https://example.com/database-benchmarks">
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Comprehensive Enterprise Database Benchmarking Guide",
      "author": {
        "@type": "Person",
        "name": "Dr. Sarah Jenkins",
        "url": "https://example.com/author/sarah-jenkins"
      },
      "publisher": {
        "@type": "Organization",
        "name": "DataOps Engineering Institute"
      },
      "datePublished": "2026-03-15",
      "dateModified": "2026-04-10"
    }
    </script>
  </head>
  <body>
    <article>
      <h1>Comprehensive Enterprise Database Benchmarking Guide</h1>
      <p class="byline">Written by <a href="/author/sarah-jenkins" rel="author">Dr. Sarah Jenkins</a> | Last Updated: April 2026 | Reviewed by Editorial Committee</p>
      
      <section id="methodology">
        <h2>Our Testing Process &amp; Methodology</h2>
        <p>Our methodology evaluated each engine across 40 hours of distributed load testing using automated synthetic traffic generators. All benchmarks were conducted in an isolated VPC on c6i.4xlarge AWS instances with NVMe storage. Peer-reviewed benchmarks were cross-referenced with <a href="https://arxiv.org/abs/cs/12345">ACM SIGMOD standards</a> and <a href="https://postgresql.org/docs">official Postgres documentation</a>.</p>
        <p>During test execution, we measured cold cache startup penalties, buffer pool churn, and write-ahead log flush cycles. Every scenario was replicated five times to calculate statistical confidence intervals and variance bounds.</p>
      </section>

      <section id="results">
        <h2>Empirical Benchmark Comparison</h2>
        <table>
          <thead><tr><th>Engine</th><th>P99 Latency (ms)</th><th>Throughput (QPS)</th><th>Memory Footprint</th></tr></thead>
          <tbody>
            <tr><td>PostgreSQL 17</td><td>3.2 ms</td><td>84,200</td><td>12 GB</td></tr>
            <tr><td>CockroachDB v24</td><td>6.8 ms</td><td>71,000</td><td>18 GB</td></tr>
          </tbody>
        </table>
      </section>

      <section id="experience">
        <h2>First-Hand Deployment Insights &amp; Customer Reviews</h2>
        <p>In our lab experience, connection pooling configuration had the highest single impact on tail latency. Client feedback and verified user reviews from over 20 enterprise deployments demonstrate a 35% cost reduction after tuning memory work_mem parameters. Real-world clusters operating under unpredictable holiday traffic surges sustained zero failover hiccups when pgbouncer was configured in transaction pooling mode.</p>
        <p>For horizontal scalability across cloud regions, CockroachDB demonstrated superior automated consensus recovery via Raft protocols, while PostgreSQL delivered lower raw read latencies within a single availability zone. Engineers should assess their cross-region availability requirements before choosing an architectural paradigm.</p>
      </section>

      <footer>
        <p><a href="/about">About Us</a> | <a href="/editorial-policy">Editorial Policy</a> | <a href="/contact">Contact Support</a> | <a href="/privacy">Privacy Policy</a> | <a href="/terms">Terms of Service</a></p>
      </footer>
    </article>
  </body>
  </html>
  `;

  const result = evaluateHelpfulContent({
    url: 'https://example.com/database-benchmarks',
    html: highQualityHtml
  });

  assert.strictEqual(result.verdict, 'COMPLIANT_PEOPLE_FIRST');
  assert.ok(result.overallScore >= 80, `Expected score >= 80, got ${result.overallScore}`);
  assert.strictEqual(result.antiPatterns.length, 0);
  assert.strictEqual(result.dimensions.who.score >= 20, true);
  assert.strictEqual(result.dimensions.how.score >= 20, true);
  assert.strictEqual(result.dimensions.why.score >= 20, true);
  assert.strictEqual(result.selfAssessment.peopleFirstIntent.passed, true);
  assert.strictEqual(result.selfAssessment.originalReportingAndAnalysis.passed, true);
  assert.strictEqual(result.selfAssessment.headlineIntegrity.passed, true);
});

// 2. Keyword Stuffing Anti-Pattern Detection
await test('flags keyword stuffing and reduces Why dimension score', () => {
  const stuffedWord = 'cryptocurrency';
  const repeatedParagraph = `The ${stuffedWord} market is evolving rapidly. Every ${stuffedWord} trader needs modern ${stuffedWord} analysis tools. Investing in ${stuffedWord} requires understanding ${stuffedWord} volatility and ${stuffedWord} protocols. Our ${stuffedWord} platform delivers automated ${stuffedWord} signals. `;
  
  const stuffedBody = repeatedParagraph.repeat(10); // Causes ~15% density of 'cryptocurrency'
  const html = `<html><head><title>Cryptocurrency News</title></head><body><p>${stuffedBody}</p></body></html>`;

  const result = evaluateHelpfulContent({
    url: 'https://example.com/crypto',
    html
  });

  assert.ok(result.antiPatterns.some(a => a.type === 'KEYWORD_STUFFING'), 'Expected KEYWORD_STUFFING anti-pattern');
  assert.strictEqual(result.selfAssessment.peopleFirstIntent.passed, false);
  assert.ok(result.overallScore < 80, 'Score should be penalized for keyword stuffing');
  assert.ok(result.actionableRemediations.some(r => r.includes('cryptocurrency')), 'Remediation must mention the stuffed keyword');
});

// 3. Clickbait Title Discrepancy Detection
await test('detects sensational clickbait title headlines', () => {
  const html = `<html><head><title>10 Shocking Secrets Revealed: Miracle Cure You Won't Believe!</title></head><body><p>Here are basic nutrition tips for balanced eating.</p></body></html>`;

  const result = evaluateHelpfulContent({
    url: 'https://example.com/tips',
    html
  });

  assert.ok(result.antiPatterns.some(a => a.type === 'CLICKBAIT_TITLE_DISCREPANCY'), 'Expected CLICKBAIT_TITLE_DISCREPANCY');
  assert.strictEqual(result.selfAssessment.headlineIntegrity.passed, false);
});

// 4. Thin Content Detection
await test('identifies thin superficial content without depth', () => {
  const html = `<html><head><title>Quick SEO Tip</title></head><body><p>SEO is very useful for your site. You should add title tags.</p></body></html>`;

  const result = evaluateHelpfulContent({
    url: 'https://example.com/quick-tip',
    html
  });

  assert.ok(result.antiPatterns.some(a => a.type === 'THIN_CONTENT'), 'Expected THIN_CONTENT anti-pattern');
  assert.strictEqual(result.selfAssessment.comprehensiveTopicDescription.passed, false);
});

// 5. Manufactured Filler Padding Detection
await test('detects manufactured padding and transitional filler', () => {
  const fillerHtml = `
  <html>
  <head><title>General Topic Overview</title></head>
  <body>
    <p>In this day and age, computing has changed. In conclusion, it is important to remember that technology evolves.</p>
    <p>Needless to say that modern devices are fast. In this day and age, people use smartphones everyday.</p>
    <p>In conclusion, it is important to remember that updates occur frequently. As previously stated above, software matters.</p>
  </body>
  </html>
  `;

  const result = evaluateHelpfulContent({
    url: 'https://example.com/filler',
    html: fillerHtml
  });

  assert.ok(result.antiPatterns.some(a => a.type === 'MANUFACTURED_FILLER'), 'Expected MANUFACTURED_FILLER anti-pattern');
});

// 6. API Integration: POST /api/guardrail/helpful-content/evaluate
await test('POST /api/guardrail/helpful-content/evaluate evaluates draft content directly', async () => {
  const payload = {
    url: 'https://myblog.com/draft-article',
    title: 'How to Build an Audio Engine in WebAssembly',
    content: `
      <p>Written by Alex Rivera | Published March 2026</p>
      <h2>Testing Methodology & Benchmarks</h2>
      <p>Our methodology benchmarked WebAudio AudioWorklet latency against standard JavaScript threads across 500 audio buffers.</p>
      <table>
        <tr><th>Thread Type</th><th>Buffer Underruns</th><th>DSP Latency</th></tr>
        <tr><td>WebAssembly</td><td>0</td><td>1.4 ms</td></tr>
      </table>
      <p>Source references: <a href="https://w3c.github.io/web-audio-api/">W3C Web Audio Specification</a>.</p>
      <p>Privacy Policy and Terms available at <a href="/privacy">Privacy</a>.</p>
    `
  };

  const res = await fetch(`${BASE_URL}/api/guardrail/helpful-content/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.guardrail);
  assert.ok(data.guardrail.overallScore > 0);
  assert.ok(data.guardrail.dimensions);
  assert.ok(data.guardrail.selfAssessment);
});

// 7. API Integration: POST /api/head-eeat
await test('POST /api/head-eeat returns helpfulContentGuardrail alongside head and eeat data', async () => {
  const res = await fetch(`${BASE_URL}/api/head-eeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://github.com' })
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.headCompleteness, 'headCompleteness should be defined');
  assert.ok(data.eeatAudit, 'eeatAudit should be defined');
  assert.ok(data.helpfulContentGuardrail, 'helpfulContentGuardrail should be defined');
  assert.ok(data.helpfulContentGuardrail.sourceOfAuthority.includes('creating-helpful-content'));
});

// 8. Orchestrator Integration: executeOrchestratedPlan includes helpful content findings
await test('executeOrchestratedPlan executes agent_helpful_content and surfaces guardrail findings', async () => {
  const plan = {
    targetUrl: 'https://github.com',
    targetDomain: 'github.com',
    intents: ['TECHNICAL_AUDIT', 'CONTENT_AUDIT'],
    executionPlan: {
      agents: [
        { id: 'agent_technical_crawler', name: 'Technical Crawler' },
        { id: 'agent_helpful_content', name: 'Google Helpful Content & E-E-A-T Guardrail' }
      ]
    }
  };

  const result = await executeOrchestratedPlan(plan);
  assert.ok(result.detailedPayloads.helpfulContent, 'helpfulContent should be populated in detailedPayloads');
  assert.ok(result.canonicalModel.dataStatusSummary.helpfulContent, 'dataStatusSummary should track helpfulContent');
  assert.ok(Array.isArray(result.recommendations));
});

// 9. SSRF Safety on Guardrail Endpoint
await test('GET /api/guardrail/helpful-content rejects localhost / SSRF targets', async () => {
  const res = await fetch(`${BASE_URL}/api/guardrail/helpful-content?url=http://127.0.0.1:8080`);
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('SSRF') || data.error.includes('restricted'));
});

console.log('\n========================================================================');
if (failedCount === 0) {
  console.log(`🎉 ALL ${passedCount} GOOGLE HELPFUL CONTENT & E-E-A-T GUARDRAIL TESTS PASSED!`);
  console.log('========================================================================');
  process.exit(0);
} else {
  console.error(`💥 ${failedCount} TEST(S) FAILED! (${passedCount} passed)`);
  console.log('========================================================================');
  process.exit(1);
}
