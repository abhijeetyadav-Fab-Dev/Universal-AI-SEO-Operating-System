/**
 * ==============================================================================
 * OmniSEO-OS Google PageSpeed Insights & CrUX Vis Feature Test Suite
 * Validates:
 * 1. PageSpeed Insights API Key integration (real-user CrUX + lab tests)
 * 2. Single PageSpeed analysis (GET & POST) with CWV, field & lab experiences
 * 3. Batch PageSpeed analysis with progress summaries and per-page metrics
 * 4. Deep links to pagespeed.web.dev and cruxvis.withgoogle.com
 * 5. CrUX Date-wise and Month-wise filtering and monthly aggregation
 * 6. CrUX 4-part LCP sub-metric diagnostics (TTFB, Load Delay, Duration, Render Delay, RTT)
 * 7. SSRF Protection and edge cases
 *
 * Usage: node test/test_pagespeed_crux_features.js
 * Expected: Exit code 0
 * ==============================================================================
 */

import http from 'http';
import {
  fetchPageSpeed,
  batchFetchPageSpeed,
  generatePageSpeedLinks
} from '../server/adapters/pagespeed.js';
import {
  formatCruxDate,
  formatCruxMonth,
  computeMonthlyAggregations,
  filterCruxHistory,
  queryCruxHistory,
  queryCruxSnapshot
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

async function runTestSuite() {
  console.log('='.repeat(76));
  console.log('⚡ RUNNING PAGESPEED INSIGHTS & CRUX VIS FILTERING VERIFICATION SUITE');
  console.log('   APIs: https://pagespeed.web.dev/ | https://cruxvis.withgoogle.com/');
  console.log('='.repeat(76));

  // --------------------------------------------------------------------------
  // 1. Adapter Unit Tests: Date & Month Formatting and Aggregations
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 1] CrUX Date and Month Utilities...');
  const samplePeriod = {
    firstDate: { year: 2026, month: 7, day: 15 },
    lastDate: { year: 2026, month: 8, day: 11 }
  };
  assert(formatCruxDate(samplePeriod.firstDate) === '2026-07-15', 'formatCruxDate formats YYYY-MM-DD correctly');
  assert(formatCruxMonth(samplePeriod.lastDate) === '2026-08', 'formatCruxMonth formats YYYY-MM correctly');

  // Test filterCruxHistory by month
  const mockPeriods = [
    { firstDate: { year: 2026, month: 6, day: 1 }, lastDate: { year: 2026, month: 6, day: 28 } },
    { firstDate: { year: 2026, month: 7, day: 1 }, lastDate: { year: 2026, month: 7, day: 28 } },
    { firstDate: { year: 2026, month: 8, day: 1 }, lastDate: { year: 2026, month: 8, day: 28 } }
  ];
  const mockMetrics = {
    largest_contentful_paint: {
      percentilesTimeseries: [2200, 2100, 1950],
      histogramFractions: [
        [{ density: 0.8 }, { density: 0.15 }, { density: 0.05 }],
        [{ density: 0.82 }, { density: 0.14 }, { density: 0.04 }],
        [{ density: 0.85 }, { density: 0.12 }, { density: 0.03 }]
      ]
    },
    cumulative_layout_shift: {
      percentilesTimeseries: [0.05, 0.04, 0.03]
    },
    interaction_to_next_paint: {
      percentilesTimeseries: [180, 160, 140]
    }
  };

  const filteredMonth = filterCruxHistory({ collectionPeriods: mockPeriods, metrics: mockMetrics }, { month: '2026-08' });
  assert(filteredMonth.collectionPeriods.length === 1, 'filterCruxHistory filters exactly 1 period for month 2026-08');
  assert(filteredMonth.metrics.largest_contentful_paint.percentilesTimeseries[0] === 1950, 'filtered metrics correctly align with selected month');

  // Test computeMonthlyAggregations (sorted newest month first)
  const monthlyAggs = computeMonthlyAggregations(mockPeriods, mockMetrics);
  assert(monthlyAggs.length === 3, 'computeMonthlyAggregations produces 3 months of summaries');
  assert(monthlyAggs[0].monthKey === '2026-08', 'monthly aggregation contains month 2026-08 as newest');
  assert(monthlyAggs[0].metrics.largest_contentful_paint.averageP75 === 1950, 'monthly aggregation calculates correct LCP average');
  assert(monthlyAggs[0].cwvStatus === 'PASSED', 'monthly aggregation evaluates correct verdict (PASSED)');

  // --------------------------------------------------------------------------
  // 2. PageSpeed Deep Links & Key Configuration
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 2] PageSpeed & CrUX Vis Deep Links...');
  const links = generatePageSpeedLinks('https://web.dev/articles/vitals', 'mobile');
  assert(links.pagespeedWebDev.includes('https://pagespeed.web.dev/analysis?url='), 'PageSpeed deep link includes analysis base URL');
  assert(links.pagespeedWebDev.includes('form_factor=mobile'), 'PageSpeed deep link includes mobile form_factor');
  assert(links.cruxVis.includes('https://cruxvis.withgoogle.com/#/?url='), 'CrUX Vis deep link includes cruxvis URL');
  assert(links.cruxVis.includes('device=PHONE'), 'CrUX Vis deep link maps mobile to PHONE');

  // --------------------------------------------------------------------------
  // 3. Adapter PageSpeed Fetch Live Verification
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 3] Live PageSpeed Insights Adapter...');
  console.log('  Fetching PageSpeed report for https://web.dev...');
  const psiData = await fetchPageSpeed('https://web.dev', 'mobile');
  assert(psiData.success === true, 'fetchPageSpeed returned success: true');
  assert(typeof psiData.performanceScore === 'number', `fetchPageSpeed has numeric performanceScore (${psiData.performanceScore})`);
  assert(psiData.fieldExperience !== null && typeof psiData.fieldExperience === 'object', 'fetchPageSpeed contains fieldExperience (real-user CrUX)');
  assert(typeof psiData.labExperience?.metrics?.lcp?.numericValueMs === 'number', 'fetchPageSpeed contains labExperience LCP');
  assert(psiData.links?.pagespeedWebDev?.startsWith('https://pagespeed.web.dev/'), 'fetchPageSpeed contains pagespeed.web.dev link');
  assert(psiData.links?.cruxVis?.startsWith('https://cruxvis.withgoogle.com/'), 'fetchPageSpeed contains cruxvis.withgoogle.com link');

  // --------------------------------------------------------------------------
  // 4. Server Endpoint: GET & POST /api/pagespeed
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 4] Server Endpoints: PageSpeed Single & Batch...');
  const getPsi = await httpGet('http://localhost:4000/api/pagespeed?url=https://web.dev&strategy=desktop');
  assert(getPsi.status === 200, 'GET /api/pagespeed returns HTTP 200');
  assert(getPsi.data.success === true, 'GET /api/pagespeed data.success is true');
  assert(getPsi.data.strategy === 'desktop', 'GET /api/pagespeed respects strategy=desktop');
  assert('cwvMetrics' in getPsi.data, 'GET /api/pagespeed contains cwvMetrics');

  const postAnalyze = await httpPost('http://localhost:4000/api/pagespeed/analyze', {
    url: 'https://web.dev',
    strategy: 'mobile'
  });
  assert(postAnalyze.status === 200, 'POST /api/pagespeed/analyze returns HTTP 200');
  assert(postAnalyze.data.success === true, 'POST /api/pagespeed/analyze data.success is true');
  assert(postAnalyze.data.fieldExperience?.cwvStatus !== undefined, 'POST /api/pagespeed/analyze contains real-user CWV status');

  console.log('  Testing POST /api/pagespeed/batch with 2 URLs...');
  const batchRes = await httpPost('http://localhost:4000/api/pagespeed/batch', {
    urls: ['https://web.dev', 'https://web.dev/vitals/'],
    strategy: 'mobile'
  });
  assert(batchRes.status === 200, 'POST /api/pagespeed/batch returns HTTP 200');
  assert(batchRes.data.success === true, 'POST /api/pagespeed/batch data.success is true');
  assert(batchRes.data.totalUrls === 2, 'POST /api/pagespeed/batch processed 2 URLs');
  assert(Array.isArray(batchRes.data.results), 'POST /api/pagespeed/batch results is an array');
  assert(batchRes.data.results[0].links?.pagespeedWebDev !== undefined, 'batch item contains pagespeedWebDev link');
  assert(batchRes.data.results[0].links?.cruxVis !== undefined, 'batch item contains cruxVis link');

  // --------------------------------------------------------------------------
  // 5. Server Endpoint: CrUX Date & Month Filtering & Monthly Aggregations
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 5] Server Endpoints: CrUX Date/Month Filters & Aggregations...');
  const cruxMonthly = await httpGet('http://localhost:4000/api/crux/monthly?origin=https://web.dev');
  assert(cruxMonthly.status === 200, 'GET /api/crux/monthly returns HTTP 200');
  assert(cruxMonthly.data.success === true, 'GET /api/crux/monthly data.success is true');
  assert(Array.isArray(cruxMonthly.data.monthlyBreakdown), 'GET /api/crux/monthly contains monthlyBreakdown array');
  assert(cruxMonthly.data.monthlyBreakdown.length > 0, `GET /api/crux/monthly returned ${cruxMonthly.data.monthlyBreakdown.length} months`);

  const sampleMonth = cruxMonthly.data.monthlyBreakdown[0].monthKey;
  console.log(`  Querying CrUX with filter for month ${sampleMonth}...`);
  const cruxFilteredMonth = await httpGet(`http://localhost:4000/api/crux?origin=https://web.dev&month=${sampleMonth}`);
  assert(cruxFilteredMonth.status === 200, 'GET /api/crux with month filter returns HTTP 200');
  assert(cruxFilteredMonth.data.history?.periodsCount > 0, 'Filtered CrUX contains periods');
  assert(cruxFilteredMonth.data.history?.filterApplied?.month === sampleMonth, 'Filtered CrUX records filterApplied.month');

  // Verify 4-Part LCP Sub-Metric Diagnostics in CrUX History response
  const lcpSubMetrics = cruxFilteredMonth.data.history?.lcpSubMetrics;
  assert(lcpSubMetrics !== undefined, 'CrUX history response includes lcpSubMetrics object');
  console.log('  CrUX LCP Sub-Metrics detected:', Object.keys(lcpSubMetrics));

  // --------------------------------------------------------------------------
  // 6. Security and SSRF Prevention
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 6] Security & Input Validation...');
  const ssrf1 = await httpGet('http://localhost:4000/api/pagespeed?url=http://127.0.0.1:8080');
  assert(ssrf1.status === 400, 'GET /api/pagespeed blocks SSRF (127.0.0.1) with HTTP 400');

  const ssrf2 = await httpPost('http://localhost:4000/api/pagespeed/analyze', { url: 'http://localhost:3000' });
  assert(ssrf2.status === 400, 'POST /api/pagespeed/analyze blocks SSRF (localhost) with HTTP 400');

  const emptyBatch = await httpPost('http://localhost:4000/api/pagespeed/batch', { urls: [] });
  assert(emptyBatch.status === 400, 'POST /api/pagespeed/batch rejects empty urls array with HTTP 400');

  console.log('\n' + '='.repeat(76));
  console.log(`🎉 ALL ${passed}/${total} PAGESPEED & CRUX VIS FILTERING TESTS PASSED!`);
  console.log('='.repeat(76));
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('\n❌ Test Suite encountered fatal error:', err);
  process.exit(1);
});
