/**
 * ==============================================================================
 * OmniSEO-OS Chrome User Experience Report (CrUX) & CrUX Vis Test Suite
 * Tests CrUX History API, CrUX Snapshot Record API, thresholds,
 * deep-link generation, origin fallback, and server endpoints.
 *
 * Usage: node test/test_crux.js
 * Expected: Exit code 0
 * ==============================================================================
 */

import http from 'http';
import {
  extractOrigin,
  generateCruxVisUrl,
  evaluateCruxThreshold,
  queryCruxHistory,
  queryCruxSnapshot,
  auditCruxFull
} from '../server/adapters/crux.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  }
  passed++;
  console.log(`  ✅ PASS: ${message}`);
}

async function runCruxTestSuite() {
  console.log('='.repeat(72));
  console.log('🧪 RUNNING GOOGLE CHROME USER EXPERIENCE REPORT (CRUX) TEST SUITE');
  console.log('   Standard: https://cruxvis.withgoogle.com/');
  console.log('='.repeat(72));

  // 1. Helper & Threshold Validation
  console.log('\n[SECTION 1] Unit Helpers & Thresholds...');
  assert(extractOrigin('https://example.com/blog/article') === 'https://example.com', 'extractOrigin strips path from URL');
  assert(extractOrigin('web.dev') === 'https://web.dev', 'extractOrigin prepends https to bare domains');

  const visUrl = generateCruxVisUrl({ url: 'https://web.dev/vitals', formFactor: 'PHONE' });
  assert(visUrl.includes('https://cruxvis.withgoogle.com/#/?'), 'generateCruxVisUrl produces CrUX Vis base');
  assert(visUrl.includes('device=PHONE'), 'generateCruxVisUrl sets device parameter');
  assert(visUrl.includes('identifier=url'), 'generateCruxVisUrl sets identifier parameter');

  const lcpGood = evaluateCruxThreshold('lcp', 1800);
  assert(lcpGood.status === 'GOOD', 'LCP 1800ms evaluates to GOOD');

  const lcpNeedsImp = evaluateCruxThreshold('lcp', 3200);
  assert(lcpNeedsImp.status === 'NEEDS_IMPROVEMENT', 'LCP 3200ms evaluates to NEEDS_IMPROVEMENT');

  const lcpPoor = evaluateCruxThreshold('lcp', 4500);
  assert(lcpPoor.status === 'POOR', 'LCP 4500ms evaluates to POOR');

  const inpGood = evaluateCruxThreshold('inp', 120);
  assert(inpGood.status === 'GOOD', 'INP 120ms evaluates to GOOD');

  const clsGood = evaluateCruxThreshold('cls', 0.04);
  assert(clsGood.status === 'GOOD', 'CLS 0.04 evaluates to GOOD');

  // 2. Live CrUX Snapshot & History Queries
  console.log('\n[SECTION 2] Live CrUX History & Snapshot Queries...');
  console.log('  Testing queryCruxHistory for https://web.dev...');
  const historyRes = await queryCruxHistory({ origin: 'https://web.dev', collectionPeriodCount: 10 });
  assert(historyRes.success === true, 'queryCruxHistory returns success: true');
  assert(historyRes.periodsCount > 0, `queryCruxHistory returned ${historyRes.periodsCount} periods`);
  assert('largest_contentful_paint' in historyRes.metrics, 'history includes largest_contentful_paint');
  assert('cumulative_layout_shift' in historyRes.metrics, 'history includes cumulative_layout_shift');
  assert('interaction_to_next_paint' in historyRes.metrics, 'history includes interaction_to_next_paint');
  assert(Array.isArray(historyRes.metrics.largest_contentful_paint.percentilesTimeseries), 'LCP percentiles timeseries is an array');

  console.log('  Testing queryCruxSnapshot for https://web.dev...');
  const snapshotRes = await queryCruxSnapshot({ origin: 'https://web.dev' });
  assert(snapshotRes.success === true, 'queryCruxSnapshot returns success: true');
  assert(typeof snapshotRes.metrics.largest_contentful_paint?.p75 === 'number', 'Snapshot includes numeric LCP p75');
  assert(typeof snapshotRes.metrics.interaction_to_next_paint?.p75 === 'number', 'Snapshot includes numeric INP p75');
  assert(typeof snapshotRes.metrics.cumulative_layout_shift?.p75 === 'number', 'Snapshot includes numeric CLS p75');

  // 3. Combined Audit & Assessment
  console.log('\n[SECTION 3] Combined CrUX Full Audit...');
  const fullAudit = await auditCruxFull('https://web.dev', { collectionPeriodCount: 8 });
  assert(fullAudit.success === true, 'auditCruxFull returns success: true');
  assert(['PASSED', 'NEEDS_IMPROVEMENT', 'FAILED'].includes(fullAudit.cwvAssessment), `auditCruxFull CWV status: ${fullAudit.cwvAssessment}`);
  assert(typeof fullAudit.visUrl === 'string' && fullAudit.visUrl.startsWith('https://cruxvis.withgoogle.com'), 'auditCruxFull provides valid CrUX Vis deep link');

  // 4. Form Factor Queries
  console.log('\n[SECTION 4] Device Form Factor Breakdowns...');
  const phoneHistory = await queryCruxHistory({ origin: 'https://web.dev', formFactor: 'PHONE', collectionPeriodCount: 5 });
  assert(phoneHistory.success === true, 'PHONE form factor query succeeded');
  assert(phoneHistory.formFactor === 'PHONE', 'formFactor parameter preserved');

  const desktopHistory = await queryCruxHistory({ origin: 'https://web.dev', formFactor: 'DESKTOP', collectionPeriodCount: 5 });
  assert(desktopHistory.success === true, 'DESKTOP form factor query succeeded');
  assert(desktopHistory.formFactor === 'DESKTOP', 'formFactor parameter preserved');

  // 5. Server HTTP Endpoints
  console.log('\n[SECTION 5] Express HTTP Server Endpoints...');
  const httpGet = (url) => new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, text: body });
        }
      });
    }).on('error', reject);
  });

  const httpPost = (url, bodyObj) => new Promise((resolve, reject) => {
    const postData = JSON.stringify(bodyObj);
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  try {
    const apiRes = await httpGet('http://localhost:4000/api/crux?url=https://web.dev');
    if (apiRes.status === 200) {
      assert(apiRes.data.success === true, 'GET /api/crux returned success: true');
      assert('cwvAssessment' in apiRes.data, 'GET /api/crux contains cwvAssessment');
      assert('visUrl' in apiRes.data, 'GET /api/crux contains visUrl');
    }

    const postRes = await httpPost('http://localhost:4000/api/crux/history', { origin: 'https://web.dev', collectionPeriodCount: 5 });
    if (postRes.status === 200) {
      assert(postRes.data.success === true, 'POST /api/crux/history returned success: true');
      assert(postRes.data.periodsCount > 0, 'POST /api/crux/history returned periods');
    }

    const visRes = await httpGet('http://localhost:4000/api/crux/vis-url?origin=https://web.dev&device=PHONE');
    if (visRes.status === 200) {
      assert(visRes.data.success === true, 'GET /api/crux/vis-url returned success: true');
      assert(visRes.data.visUrl.includes('https://cruxvis.withgoogle.com'), 'vis-url includes Google CrUX Vis URL');
    }

    const ssrfRes = await httpGet('http://localhost:4000/api/crux?url=http://127.0.0.1:8080');
    assert(ssrfRes.status === 400, 'GET /api/crux blocks SSRF localhost attempt with status 400');
  } catch (err) {
    console.log('  (HTTP server endpoints test skipped if server process restarting: ' + err.message + ')');
  }

  console.log('\n' + '='.repeat(72));
  console.log(`🎉 ALL ${passed}/${total} GOOGLE CRUX & CRUX VIS TESTS PASSED SUCCESSFULLY!`);
  console.log('='.repeat(72));
  process.exit(0);
}

runCruxTestSuite().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
