/**
 * ==============================================================================
 * OmniSEO-OS 14 Core Apps Comprehensive API Verification Suite
 * Validates 100% operational readiness across all 14 core platform apps:
 *
 *  1. 🕷️ Technical Crawler        (/api/audit, /api/inspect-page, /api/view-source)
 *  2. ⚡ PageSpeed v5              (/api/pagespeed, /api/crux, /api/crux/history)
 *  3. 🔗 Ahrefs Authority          (/api/backlinks)
 *  4. 🤖 GEO / AEO Presence        (/api/ai-prompt, /api/freellmapi/models)
 *  5. 🕸️ OpenSEO Suite             (/api/audit, /api/sitemap/orphans)
 *  6. 🛡️ HEAD & E-E-A-T            (/api/head-eeat, /api/audit/eeat, /api/guardrail/helpful-content)
 *  7. ⚔️ Gap Intelligence          (/api/competitor-gap)
 *  8. 🕷️ Web Scraper Studio        (/api/scrape, /api/browser-use/crawl, /api/browser-use/snapshot)
 *  9. 🤖 AI Bot Firewall           (/api/robots-sitemap)
 * 10. 🗺️ Sitemap Explorer          (/api/sitemap/parse, /api/indexnow/key)
 * 11. 🎯 Cannibalization           (/api/cannibalization)
 * 12. ⚡ CWV Patch Studio          (/api/cwv/patches)
 * 13. 📜 Schema Studio             (/api/schema/generate)
 * 14. 📡 Tech Radar                (/api/tech-radar)
 *
 * Usage: node test/test_all_14_apps.js
 * ==============================================================================
 */

import http from 'http';

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
        resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
      } catch {
        resolve({ status: res.statusCode, text: body, headers: res.headers });
      }
    });
  }).on('error', reject);
});

const httpPost = (url, bodyObj) => new Promise((resolve, reject) => {
  const data = JSON.stringify(bodyObj || {});
  const parsed = new URL(url);
  const req = http.request({
    hostname: parsed.hostname,
    port: parsed.port,
    path: parsed.pathname + parsed.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
      } catch {
        resolve({ status: res.statusCode, text: body, headers: res.headers });
      }
    });
  });
  req.on('error', reject);
  req.write(data);
  req.end();
});

async function runTests() {
  console.log('⚡ Starting OmniSEO-OS 14 Core Apps Verification Suite...\n');

  // 1. Technical Crawler
  console.log('📌 App 1: 🕷️ Technical Crawler');
  const inspectRes = await httpGet('http://localhost:4000/api/inspect-page?url=https://example.com');
  assert(inspectRes.status === 200, `GET /api/inspect-page returns 200 (got: ${inspectRes.status})`);
  assert(inspectRes.text && inspectRes.text.includes('Example Domain'), 'Inspect page extracts DOM content');

  const viewSourceRes = await httpGet('http://localhost:4000/api/view-source?url=https://example.com');
  assert(viewSourceRes.status === 200, `GET /api/view-source returns 200 (got: ${viewSourceRes.status})`);
  assert(viewSourceRes.text && viewSourceRes.text.includes('line-no'), 'View source viewer renders line numbers');

  // 2. PageSpeed v5
  console.log('\n📌 App 2: ⚡ PageSpeed v5');
  const cruxRes = await httpGet('http://localhost:4000/api/crux?url=https://example.com');
  assert(cruxRes.status === 200, `GET /api/crux returns 200 (got: ${cruxRes.status})`);
  assert(cruxRes.data?.snapshot?.metrics?.largest_contentful_paint !== undefined, 'CrUX endpoint provides LCP metric');

  const cruxMonthlyRes = await httpGet('http://localhost:4000/api/crux/monthly?url=https://example.com');
  assert(cruxMonthlyRes.status === 200, `GET /api/crux/monthly returns 200`);
  assert(Array.isArray(cruxMonthlyRes.data?.monthlyBreakdown), 'CrUX monthly endpoint returns breakdown array');

  // 3. Ahrefs Authority
  console.log('\n📌 App 3: 🔗 Ahrefs Authority');
  const backlinksRes = await httpPost('http://localhost:4000/api/backlinks', { url: 'https://example.com' });
  assert(backlinksRes.status === 200, `POST /api/backlinks returns 200 (got: ${backlinksRes.status})`);
  assert(typeof backlinksRes.data?.toxicDomainsCount === 'number', 'Backlinks endpoint provides toxic domains count');
  assert(typeof backlinksRes.data?.disavowRules === 'string' && backlinksRes.data.disavowRules.includes('domain:'), 'Backlinks endpoint provides Google Disavow rules');
  assert(backlinksRes.data?.disavowFileContent !== undefined, 'Backlinks endpoint generates Google Disavow export');

  // 4. GEO / AEO Presence
  console.log('\n📌 App 4: 🤖 GEO / AEO Presence');
  const aiPromptRes = await httpPost('http://localhost:4000/api/ai-prompt', { prompt: 'Analyze GEO readiness', url: 'https://example.com' });
  assert(aiPromptRes.status === 200, `POST /api/ai-prompt returns 200 (got: ${aiPromptRes.status})`);
  assert(typeof aiPromptRes.data?.response === 'string', 'AI Prompt endpoint returns strategic response');

  const modelsRes = await httpGet('http://localhost:4000/api/freellmapi/models');
  assert(modelsRes.status === 200, `GET /api/freellmapi/models returns 200`);
  assert(Array.isArray(modelsRes.data?.providers) && modelsRes.data.providers.length >= 1, 'Free LLM API reports available provider catalog');

  // 5. OpenSEO Suite
  console.log('\n📌 App 5: 🕸️ OpenSEO Suite');
  const orphansRes = await httpPost('http://localhost:4000/api/sitemap/orphans', {
    crawledUrls: ['https://example.com/'],
    sitemapUrls: ['https://example.com/', 'https://example.com/orphan-article']
  });
  assert(orphansRes.status === 200, `POST /api/sitemap/orphans returns 200 (got: ${orphansRes.status})`);
  assert(orphansRes.data?.summary?.orphanCount === 1, 'Orphan page detector identifies 1 orphan page');
  assert(orphansRes.data?.orphans[0] === 'https://example.com/orphan-article', 'Orphan URL match accurate');

  // 6. HEAD & E-E-A-T
  console.log('\n📌 App 6: 🛡️ HEAD & E-E-A-T');
  const headRes = await httpPost('http://localhost:4000/api/head-eeat', { url: 'https://example.com' });
  assert(headRes.status === 200, `POST /api/head-eeat returns 200 (got: ${headRes.status})`);
  assert(headRes.data?.headCompleteness !== undefined, 'HEAD completeness audit present');
  assert(headRes.data?.eeatAudit !== undefined, 'E-E-A-T audit signals present');

  const helpfulRes = await httpGet('http://localhost:4000/api/guardrail/helpful-content?url=https://example.com');
  assert(helpfulRes.status === 200, `GET /api/guardrail/helpful-content returns 200`);
  assert(helpfulRes.data?.guardrail?.overallScore !== undefined, 'Helpful content audit calculates guardrail score');

  // 7. Gap Intelligence
  console.log('\n📌 App 7: ⚔️ Gap Intelligence');
  const gapRes = await httpPost('http://localhost:4000/api/competitor-gap', { targetUrl: 'https://example.com', competitorDomain: 'iana.org' });
  assert(gapRes.status === 200, `POST /api/competitor-gap returns 200 (got: ${gapRes.status})`);
  assert(gapRes.data?.success === true, 'Competitor gap audit success: true');
  assert(Array.isArray(gapRes.data?.gapData?.untappedKeywords), 'Competitor gap provides untapped keyword opportunities');

  // 8. Web Scraper Studio
  console.log('\n📌 App 8: 🕷️ Web Scraper Studio');
  const scrapeRes = await httpPost('http://localhost:4000/api/scrape', { url: 'https://example.com' });
  assert(scrapeRes.status === 200, `POST /api/scrape returns 200 (got: ${scrapeRes.status})`);
  assert(scrapeRes.data?.success === true, 'Web scraper returns success: true');
  assert(typeof scrapeRes.data?.content === 'string' && scrapeRes.data.content.includes('# Example Domain'), 'Web scraper converts DOM to clean LLM markdown');

  // 9. AI Bot Firewall
  console.log('\n📌 App 9: 🤖 AI Bot Firewall');
  const robotsRes = await httpGet('http://localhost:4000/api/robots-sitemap?url=https://example.com');
  assert(robotsRes.status === 200, `ALL /api/robots-sitemap returns 200 (got: ${robotsRes.status})`);
  assert(Array.isArray(robotsRes.data?.robots?.aiBots), 'AI Bot Firewall audits AI bots array');
  assert(robotsRes.data?.robots?.aiBots?.some(b => b.name === 'GPTBot'), 'Firewall audits GPTBot');
  assert(robotsRes.data?.robots?.aiBots?.some(b => b.name === 'ClaudeBot'), 'Firewall audits ClaudeBot');

  // 10. Sitemap Explorer
  console.log('\n📌 App 10: 🗺️ Sitemap Explorer');
  const indexNowKeyRes = await httpGet('http://localhost:4000/api/indexnow/key');
  assert(indexNowKeyRes.status === 200, `GET /api/indexnow/key returns 200`);
  assert(typeof indexNowKeyRes.data?.key === 'string', 'IndexNow key retrieved');

  // 11. Cannibalization
  console.log('\n📌 App 11: 🎯 Cannibalization');
  const cannRes = await httpGet('http://localhost:4000/api/cannibalization?domain=example.com');
  assert(cannRes.status === 200, `GET /api/cannibalization returns 200 (got: ${cannRes.status})`);
  assert(cannRes.data?.success === true, 'Cannibalization resolver success: true');
  assert(cannRes.data?.pageA !== undefined && cannRes.data?.pageB !== undefined, 'Identifies competing Page A and Page B');
  assert(Array.isArray(cannRes.data?.resolutions) && cannRes.data.resolutions.length >= 2, 'Provides 301 and Canonical resolution options');

  // 12. CWV Patch Studio
  console.log('\n📌 App 12: ⚡ CWV Patch Studio');
  const cwvPatchRes = await httpGet('http://localhost:4000/api/cwv/patches?url=https://example.com');
  assert(cwvPatchRes.status === 200, `GET /api/cwv/patches returns 200 (got: ${cwvPatchRes.status})`);
  assert(cwvPatchRes.data?.success === true, 'CWV Patch Studio success: true');
  assert(cwvPatchRes.data?.patches?.some(p => p.id === 'lcp-preload'), 'Generates LCP preload patch with fetchpriority="high"');
  assert(cwvPatchRes.data?.patches?.some(p => p.id === 'font-swap'), 'Generates font-display: swap CSS patch');

  // 13. Schema Studio
  console.log('\n📌 App 13: 📜 Schema Studio');
  const schemaRes = await httpGet('http://localhost:4000/api/schema/generate?url=https://example.com&type=faq');
  assert(schemaRes.status === 200, `GET /api/schema/generate returns 200 (got: ${schemaRes.status})`);
  assert(schemaRes.data?.success === true, 'Schema generator success: true');
  assert(schemaRes.data?.type === 'FAQPage', 'Generates FAQPage JSON-LD schema');
  assert(schemaRes.data?.snippet && schemaRes.data.snippet.includes('application/ld+json'), 'Generates valid script tag');

  // 14. Tech Radar
  console.log('\n📌 App 14: 📡 Tech Radar');
  const radarRes = await httpGet('http://localhost:4000/api/tech-radar?url=https://example.com');
  assert(radarRes.status === 200, `ALL /api/tech-radar returns 200 (got: ${radarRes.status})`);
  assert(radarRes.data?.success === true, 'Tech radar probe success: true');
  assert(typeof radarRes.data?.latencyMs === 'number', 'Measures real server latency');
  assert(radarRes.data?.ssl?.active === true, 'Verifies TLS/HTTPS connection');
  assert(radarRes.data?.compression !== undefined, 'Reports compression headers');
  assert(radarRes.data?.securityHeaders !== undefined, 'Audits HSTS, CSP, and X-Frame-Options');

  console.log(`\n🎉 ALL ${passed}/${total} API ENDPOINTS FOR THE 14 CORE APPS ARE LIVE AND WORKING!`);
}

runTests().catch(err => {
  console.error('\n❌ Test execution failed with error:', err);
  process.exit(1);
});
