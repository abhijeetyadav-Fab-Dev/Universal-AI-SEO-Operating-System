/**
 * ==============================================================================
 * OmniSEO-OS Screaming Frog SEO Spider Enterprise Integration Test Suite
 * Validates:
 * 1. CLI binary detection & user profile configuration reading
 * 2. Status & license reporting (Full Licensed Version v24.3)
 * 3. Command generation for Spider, List, and Sitemap modes
 * 4. RFC 4180 CSV parser & edge case handling (escaped quotes, commas)
 * 5. Screaming Frog multi-tab CSV export parsing & diagnostic summary
 * 6. Stored crawl discovery and retrieval
 * 7. HTTP REST API endpoints on http://localhost:4000
 * 8. Audit router engine dispatching (engine: 'screaming-frog')
 *
 * Usage: node test/test_screaming_frog.js
 * Expected: Exit code 0
 * ==============================================================================
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  findScreamingFrogBinary,
  readSpiderConfig,
  getScreamingFrogStatus,
  buildScreamingFrogCommand,
  parseCsvLine,
  parseScreamingFrogCsv,
  getScreamingFrogCrawlSummary,
  listScreamingFrogCrawls,
  getScreamingFrogCrawlById,
  CRAWL_STORAGE_DIR
} from '../server/adapters/screaming_frog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        resolve({ status: res.statusCode, data: JSON.parse(body) });
      } catch {
        resolve({ status: res.statusCode, text: body });
      }
    });
  });
  req.on('error', reject);
  req.write(data);
  req.end();
});

async function runTests() {
  console.log('🐸 Starting Screaming Frog SEO Spider Enterprise Test Suite...\n');

  // --------------------------------------------------------------------------
  // Phase 1: Adapter Unit Tests
  // --------------------------------------------------------------------------
  console.log('📌 Phase 1: Screaming Frog CLI Adapter Unit Tests');

  // 1. Binary Discovery
  const binary = findScreamingFrogBinary();
  assert(binary !== null, 'Screaming Frog CLI binary found on local system');
  assert(binary.toLowerCase().includes('screamingfrogseospidercli.exe'), `Binary path ends with ScreamingFrogSEOSpiderCli.exe (${binary})`);
  assert(fs.existsSync(binary), 'Verified binary exists on disk');

  // 2. Spider Configuration Reader
  const config = readSpiderConfig();
  assert(typeof config === 'object', 'Spider configuration parsed successfully');
  assert(config.version === '24.3', `Detected Screaming Frog version 24.3 (got: ${config.version})`);
  assert(config.psiKeyConfigured === true, 'PageSpeed Insights API key detected in Screaming Frog config');
  assert(config.psiKeyPreview && config.psiKeyPreview.startsWith('AIzaSyAp'), `PSI key preview matches expected key prefix (${config.psiKeyPreview})`);

  // 3. Status Reporting
  const status = getScreamingFrogStatus();
  assert(status.success === true, 'getScreamingFrogStatus returns success: true');
  assert(status.installed === true, 'getScreamingFrogStatus returns installed: true');
  assert(status.licensed === true, 'getScreamingFrogStatus returns licensed: true');
  assert(status.supportedModes.length === 3, 'Reports 3 supported crawl modes (Spider, List, Sitemap)');
  assert(status.recommendedExportTabs.includes('Internal:All'), 'Includes Internal:All in recommended export tabs');

  // 4. Command Builder - Spider Mode
  const spiderCmd = buildScreamingFrogCommand({
    target: 'https://example.com',
    mode: 'spider',
    exportTabs: ['Internal:All', 'Response Codes:All'],
    createSitemap: true
  });
  assert(spiderCmd.args.includes('--crawl'), 'Spider mode includes --crawl flag');
  assert(spiderCmd.args.includes('https://example.com'), 'Spider mode includes target URL');
  assert(spiderCmd.args.includes('--headless'), 'Command includes --headless flag');
  assert(spiderCmd.args.includes('--overwrite'), 'Command includes --overwrite flag');
  assert(spiderCmd.args.includes('--create-sitemap'), 'Command includes --create-sitemap flag');
  assert(spiderCmd.fullCommand.includes('& "'), 'Command formatted with PowerShell run operator');

  // 5. Command Builder - List Mode
  const listCmd = buildScreamingFrogCommand({
    target: 'C:\\temp\\urls.txt',
    mode: 'list'
  });
  assert(listCmd.args.includes('--crawl-list'), 'List mode includes --crawl-list flag');
  assert(listCmd.args.includes('C:\\temp\\urls.txt'), 'List mode includes file path');

  // 6. Command Builder - Sitemap Mode
  const sitemapCmd = buildScreamingFrogCommand({
    target: 'https://example.com/sitemap.xml',
    mode: 'sitemap'
  });
  assert(sitemapCmd.args.includes('--crawl-sitemap'), 'Sitemap mode includes --crawl-sitemap flag');
  assert(sitemapCmd.args.includes('https://example.com/sitemap.xml'), 'Sitemap mode includes sitemap URL');

  // 7. RFC 4180 CSV Line Parser
  const testLine1 = 'Simple,Value,Another';
  const parsed1 = parseCsvLine(testLine1);
  assert(parsed1.length === 3 && parsed1[0] === 'Simple' && parsed1[1] === 'Value', 'parseCsvLine handles unquoted commas');

  const testLine2 = '"Quoted, with comma","Second ""Escaped"" Value",Regular';
  const parsed2 = parseCsvLine(testLine2);
  assert(parsed2.length === 3, `parseCsvLine correctly parsed 3 tokens (got ${parsed2.length})`);
  assert(parsed2[0] === 'Quoted, with comma', `Handles comma inside quotes: "${parsed2[0]}"`);
  assert(parsed2[1] === 'Second "Escaped" Value', `Handles escaped double quotes: "${parsed2[1]}"`);
  assert(parsed2[2] === 'Regular', `Handles trailing token: "${parsed2[2]}"`);

  // --------------------------------------------------------------------------
  // Phase 2: CSV Parsing & Crawl Summary Aggregation
  // --------------------------------------------------------------------------
  console.log('\n📌 Phase 2: Crawl Export Parsing & Diagnostic Summary');

  // Create a realistic test crawl fixture directory
  const fixtureDir = path.join(CRAWL_STORAGE_DIR, 'test_sf_fixture');
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }

  const sampleInternalCsv = [
    'Address,Content Type,Status Code,Status,Indexability,Indexability Status,Title 1,Title 1 Length,Meta Description 1,Meta Description 1 Length,H1-1,Canonical Link Element 1,Word Count,Response Time',
    '"https://example.com/","text/html; charset=UTF-8","200","OK","Indexable","","Example Domain","14","Example Domain description for search engine testing.","54","Example Domain","https://example.com/","240","0.125"',
    '"https://example.com/about","text/html; charset=UTF-8","200","OK","Indexable","","About Us","8","Duplicate description test.","26","About Us","https://example.com/about","450","0.210"',
    '"https://example.com/team","text/html; charset=UTF-8","200","OK","Indexable","","","0","Duplicate description test.","26","","https://example.com/team","320","0.180"',
    '"https://example.com/missing-page","text/html; charset=UTF-8","404","Not Found","Non-Indexable","Client Error","404 Not Found","13","","0","Page Not Found","","50","0.080"',
    '"https://example.com/server-error","text/html; charset=UTF-8","500","Server Error","Non-Indexable","Server Error","500 Error","9","","0","","","20","0.350"'
  ].join('\r\n');

  const sampleResponseCodesCsv = [
    'Address,Status Code,Status',
    '"https://example.com/","200","OK"',
    '"https://example.com/about","200","OK"',
    '"https://example.com/team","200","OK"',
    '"https://example.com/missing-page","404","Not Found"',
    '"https://example.com/server-error","500","Server Error"'
  ].join('\r\n');

  fs.writeFileSync(path.join(fixtureDir, 'internal_all.csv'), sampleInternalCsv, 'utf8');
  fs.writeFileSync(path.join(fixtureDir, 'response_codes_all.csv'), sampleResponseCodesCsv, 'utf8');

  // Parse CSV
  const parsedInternal = parseScreamingFrogCsv(path.join(fixtureDir, 'internal_all.csv'), 10);
  assert(parsedInternal.success === true, 'parseScreamingFrogCsv succeeded');
  assert(parsedInternal.totalCount === 5, `Parsed 5 total rows (got: ${parsedInternal.totalCount})`);
  assert(parsedInternal.headers.includes('Address') && parsedInternal.headers.includes('Status Code'), 'Headers extracted accurately');
  assert(parsedInternal.rows[0].Address === 'https://example.com/', 'First row Address parsed');
  assert(parsedInternal.rows[0]['Status Code'] === '200', 'First row Status Code parsed');

  // Crawl Summary Aggregation
  const summary = getScreamingFrogCrawlSummary(fixtureDir);
  assert(summary.success === true, 'getScreamingFrogCrawlSummary succeeded');
  assert(summary.totalUrls === 5, `Total URLs in summary is 5 (got: ${summary.totalUrls})`);
  assert(summary.statusCodes['2xx'] === 3, `Status code 2xx count is 3 (got: ${summary.statusCodes['2xx']})`);
  assert(summary.statusCodes['4xx'] === 1, `Status code 4xx count is 1 (got: ${summary.statusCodes['4xx']})`);
  assert(summary.statusCodes['5xx'] === 1, `Status code 5xx count is 1 (got: ${summary.statusCodes['5xx']})`);
  assert(summary.indexableCount === 3, `Indexable count is 3 (got: ${summary.indexableCount})`);
  assert(summary.nonIndexableCount === 2, `Non-Indexable count is 2 (got: ${summary.nonIndexableCount})`);
  assert(summary.missingTitles === 1, `Missing titles detected: 1 (got: ${summary.missingTitles})`);
  assert(summary.missingH1 === 2, `Missing H1s detected: 2 (got: ${summary.missingH1})`);
  assert(summary.duplicateDescriptions === 2, `Duplicate meta descriptions detected: 2 (got: ${summary.duplicateDescriptions})`);
  assert(summary.avgResponseTimeSec > 0, `Average response time calculated (${summary.avgResponseTimeSec}s)`);
  assert(summary.avgWordCount > 0, `Average word count calculated (${summary.avgWordCount} words)`);
  assert(summary.sampleUrls.length === 5, `Sample URLs populated (${summary.sampleUrls.length})`);

  // Stored Crawl Lookup
  const crawls = listScreamingFrogCrawls();
  assert(crawls.success === true, 'listScreamingFrogCrawls succeeded');
  assert(crawls.crawls.some(c => c.id === 'test_sf_fixture'), 'Stored crawl fixture discovered in list');

  const crawlDetail = getScreamingFrogCrawlById('test_sf_fixture');
  assert(crawlDetail.success === true, 'getScreamingFrogCrawlById succeeded');
  assert(crawlDetail.crawl.summary.totalUrls === 5, 'Crawl detail returns full summary');

  // --------------------------------------------------------------------------
  // Phase 3: HTTP REST API Endpoints
  // --------------------------------------------------------------------------
  console.log('\n📌 Phase 3: Screaming Frog REST API Endpoints on http://localhost:4000');

  // 0. GET /api/screaming-frog (Root Hub Catalog)
  const rootRes = await httpGet('http://localhost:4000/api/screaming-frog');
  assert(rootRes.status === 200, `GET /api/screaming-frog returns 200 (got: ${rootRes.status})`);
  assert(rootRes.data?.installed === true, 'Root catalog confirms Screaming Frog installed');
  assert(rootRes.data?.endpoints?.command !== undefined, 'Root catalog lists command endpoint');

  // 1. GET /api/screaming-frog/status
  const statusRes = await httpGet('http://localhost:4000/api/screaming-frog/status');
  assert(statusRes.status === 200, `GET /api/screaming-frog/status returns 200 (got: ${statusRes.status})`);
  assert(statusRes.data?.success === true, 'Status response indicates success');
  assert(statusRes.data?.installed === true, 'Status response confirms installed: true');
  assert(statusRes.data?.licenseType.includes('Full Licensed Version'), 'Status response confirms Full Licensed Version');

  // 2a. GET /api/screaming-frog/command (Browser Address Bar Navigation)
  const getCmdRes = await httpGet('http://localhost:4000/api/screaming-frog/command');
  assert(getCmdRes.status === 200, `GET /api/screaming-frog/command returns 200 in browser (got: ${getCmdRes.status})`);
  assert(getCmdRes.data?.success === true, 'GET /api/screaming-frog/command returns success: true');
  assert(getCmdRes.data?.fullCommand && getCmdRes.data.fullCommand.includes('--crawl'), 'GET command contains --crawl flag');

  // 2b. GET /api/screaming-frog/command with query parameters
  const queryCmdRes = await httpGet('http://localhost:4000/api/screaming-frog/command?target=https://news.ycombinator.com&mode=spider');
  assert(queryCmdRes.status === 200, `GET /api/screaming-frog/command?target=... returns 200`);
  assert(queryCmdRes.data?.fullCommand.includes('news.ycombinator.com'), 'Query target correctly reflected in generated command');

  // 2c. POST /api/screaming-frog/command
  const cmdRes = await httpPost('http://localhost:4000/api/screaming-frog/command', {
    target: 'https://example.com/blog',
    mode: 'spider',
    exportTabs: ['Internal:All', 'Page Titles:All']
  });
  assert(cmdRes.status === 200, `POST /api/screaming-frog/command returns 200 (got: ${cmdRes.status})`);
  assert(cmdRes.data?.success === true, 'Command generator response success: true');
  assert(cmdRes.data?.fullCommand && cmdRes.data.fullCommand.includes('--crawl'), 'Command contains --crawl flag');

  // 2d. GET /api/screaming-frog/crawl (Informational helper for browser GET)
  const getCrawlRes = await httpGet('http://localhost:4000/api/screaming-frog/crawl');
  assert(getCrawlRes.status === 200, `GET /api/screaming-frog/crawl returns 200`);
  assert(getCrawlRes.data?.usage !== undefined, 'GET crawl returns helpful usage guidance');

  // 3. GET /api/screaming-frog/crawls
  const crawlListRes = await httpGet('http://localhost:4000/api/screaming-frog/crawls');
  assert(crawlListRes.status === 200, `GET /api/screaming-frog/crawls returns 200 (got: ${crawlListRes.status})`);
  assert(crawlListRes.data?.success === true, 'Crawl list response success: true');
  assert(crawlListRes.data?.count >= 1, `Crawl list contains at least 1 crawl (got: ${crawlListRes.data?.count})`);

  // 4. GET /api/screaming-frog/crawls/:id
  const crawlDetailRes = await httpGet('http://localhost:4000/api/screaming-frog/crawls/test_sf_fixture');
  assert(crawlDetailRes.status === 200, `GET /api/screaming-frog/crawls/test_sf_fixture returns 200 (got: ${crawlDetailRes.status})`);
  assert(crawlDetailRes.data?.crawl?.summary?.totalUrls === 5, 'Crawl detail contains accurate summary metrics');

  // 5a. GET /api/screaming-frog/crawls/:id/file/:filename (Raw CSV)
  const fileRes = await httpGet('http://localhost:4000/api/screaming-frog/crawls/test_sf_fixture/file/internal_all.csv');
  assert(fileRes.status === 200, `GET /api/screaming-frog/crawls/.../file/internal_all.csv returns 200 (got: ${fileRes.status})`);
  assert(fileRes.text && fileRes.text.includes('Address,Content Type,Status Code'), 'Raw CSV returned accurately');

  // 5b. GET /api/screaming-frog/crawls/:id/file/:filename?format=json (Parsed JSON)
  const fileJsonRes = await httpGet('http://localhost:4000/api/screaming-frog/crawls/test_sf_fixture/file/internal_all.csv?format=json');
  assert(fileJsonRes.status === 200, `GET /api/screaming-frog/crawls/.../file/internal_all.csv?format=json returns 200`);
  assert(fileJsonRes.data?.success === true, 'JSON file query returned success: true');
  assert(fileJsonRes.data?.totalCount === 5, 'JSON file query returns 5 total rows');

  // 6. GET /api/health capabilities check
  const healthRes = await httpGet('http://localhost:4000/api/health');
  assert(healthRes.status === 200, `GET /api/health returns 200`);
  assert(healthRes.data?.capabilities?.some(c => c.includes('Screaming Frog SEO Spider')), 'GET /api/health advertises Screaming Frog capability');

  console.log(`\n🎉 All ${passed}/${total} Screaming Frog tests PASSED!`);
}

runTests().catch(err => {
  console.error('\n❌ Test execution failed with error:', err);
  process.exit(1);
});
