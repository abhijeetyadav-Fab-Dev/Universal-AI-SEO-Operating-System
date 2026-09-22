/**
 * ==============================================================================
 * OmniSEO-OS Google Cloud & BigQuery Enterprise Hub Test Suite
 * Validates:
 * 1. Google Cloud Services Catalog & Registry (24 enabled enterprise APIs)
 * 2. BigQuery CrUX SQL Generator (public chrome-ux-report datasets)
 * 3. BigQuery Search Console Bulk Export SQL Generator
 * 4. BigQuery Crawler & Search Spider Log Analysis SQL Generator
 * 5. BigQuery Query Estimator (dry-run byte calculation & cost modeling)
 * 6. Google Cloud Storage (GCS) Audit Archiver & URI Generator
 * 7. Google Analytics 4 (GA4) & Core Web Vitals Revenue Lift Correlator
 * 8. Google Cloud Logging & Telemetry Structured Log Dispatcher
 * 9. REST Endpoints on http://localhost:4000
 *
 * Usage: node test/test_google_cloud.js
 * Expected: Exit code 0
 * ==============================================================================
 */

import http from 'http';
import {
  ENABLED_GOOGLE_CLOUD_APIS,
  getGoogleCloudServicesStatus,
  generateCrUXBigQuerySql,
  generateGscBulkExportSql,
  generateLogAnalysisSql,
  executeBigQueryQuery,
  formatGcsUrls,
  uploadAuditToGcs,
  buildGa4OrganicReportRequest,
  correlateCwvWithGa4,
  formatCloudLogEntry
} from '../server/adapters/google_cloud.js';

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
  console.log('🧪 Starting Google Cloud & BigQuery Enterprise Hub Test Suite...\n');

  // --------------------------------------------------------------------------
  // Phase 1: Adapter Unit Tests
  // --------------------------------------------------------------------------
  console.log('📌 Phase 1: Google Cloud Adapter Unit Tests');

  assert(Array.isArray(ENABLED_GOOGLE_CLOUD_APIS), 'ENABLED_GOOGLE_CLOUD_APIS is an array');
  assert(ENABLED_GOOGLE_CLOUD_APIS.length >= 24, `Catalog contains at least 24 enterprise APIs (found: ${ENABLED_GOOGLE_CLOUD_APIS.length})`);
  
  const cruxApi = ENABLED_GOOGLE_CLOUD_APIS.find(a => a.id === 'chromeuxreport.googleapis.com' || a.code === 'crux');
  assert(cruxApi && cruxApi.name === 'Chrome UX Report API', 'Chrome UX Report API is present in catalog');
  
  const bqApi = ENABLED_GOOGLE_CLOUD_APIS.find(a => a.id === 'bigquery.googleapis.com' || a.code === 'bigquery');
  assert(bqApi && bqApi.name === 'BigQuery API', 'BigQuery API is present in catalog');

  const status = getGoogleCloudServicesStatus({ gcpProjectId: 'test-project', gcsBucket: 'test-bucket' });
  assert(status.totalEnabled >= 24, `Status summary returns at least 24 total enabled APIs (found: ${status.totalEnabled})`);
  assert(status.projectId === 'test-project', 'Status preserves GCP Project ID');
  assert(status.categories && Object.keys(status.categories).length > 0, 'Status categorizes APIs into groups');

  // BigQuery CrUX SQL Generator
  const cruxSqlObj = generateCrUXBigQuerySql({ origin: 'https://example.com', metric: 'largest_contentful_paint' });
  const cruxSql = cruxSqlObj.sql;
  assert(cruxSql.includes('chrome-ux-report'), 'CrUX SQL queries public chrome-ux-report dataset');
  assert(cruxSql.includes('largest_contentful_paint'), 'CrUX SQL filters on largest_contentful_paint');
  assert(cruxSql.includes('https://example.com'), 'CrUX SQL filters on specified origin');

  // BigQuery GSC SQL Generator
  const gscSqlObj = generateGscBulkExportSql({ projectId: 'my-gcp-corp', datasetId: 'searchconsole_export' });
  const gscSql = gscSqlObj.sql;
  assert(gscSql.includes('`my-gcp-corp.searchconsole_export.searchdata_url_impression`'), 'GSC SQL targets configured project & dataset');
  assert(gscSql.includes('GROUP BY') && gscSql.includes('url, query'), 'GSC SQL performs URL and query aggregation');

  // BigQuery Crawler Log SQL Generator
  const logSqlObj = generateLogAnalysisSql({ projectId: 'my-gcp-corp', logTable: 'server_access_logs' });
  const logSql = logSqlObj.sql;
  assert(logSql.includes('`my-gcp-corp.seo_logs.server_access_logs`'), 'Log SQL targets log table');
  assert(logSql.includes('Googlebot'), 'Log SQL checks for Googlebot user agents');

  // BigQuery Query Execution (Dry Run)
  const bqDryRun = await executeBigQueryQuery({ sql: cruxSql, dryRun: true });
  assert(bqDryRun.success === true, 'BigQuery dry run execution succeeded');
  assert(bqDryRun.dryRun === true, 'Dry run flag confirmed');
  assert(typeof bqDryRun.totalBytesProcessed === 'number', 'Dry run returns totalBytesProcessed');
  assert(typeof bqDryRun.estimatedCostUSD === 'number', 'Dry run calculates estimated USD cost');

  // GCS Archiver & URIs
  const gcsUrls = formatGcsUrls({ bucketName: 'seo-audit-vault', objectKey: 'audits/2026-09/report.json' });
  assert(gcsUrls.gcsUri === 'gs://seo-audit-vault/audits/2026-09/report.json', 'GCS URI formatted as gs://');
  assert(gcsUrls.publicUrl.includes('storage.googleapis.com'), 'GCS HTTP URL formatted correctly');

  const gcsResult = await uploadAuditToGcs({
    bucketName: 'seo-vault',
    auditData: { targetUrl: 'https://example.com', score: 98 },
    prefix: 'unit-test'
  });
  assert(gcsResult.success === true, 'GCS mock/upload succeeded');
  assert(gcsResult.gcsUri.startsWith('gs://seo-vault/unit-test/'), 'GCS audit path properly formatted');

  // GA4 & CWV Correlator
  const ga4Model = correlateCwvWithGa4({
    currentLcpSec: 4.2,
    targetLcpSec: 2.1,
    monthlyOrganicVisitors: 150000,
    avgOrderValue: 85,
    currentConversionRatePct: 1.8
  });
  assert(ga4Model.projectedMonthlyLiftUSD > 0, 'GA4 model calculates positive revenue lift');
  assert(ga4Model.expectedConversionRatePct > 1.8, 'Conversion rate increases with faster LCP');

  // Cloud Logging / Telemetry
  const cloudLog = formatCloudLogEntry({
    message: 'PageSpeed audit completed for https://example.com',
    severity: 'INFO',
    labels: { module: 'pagespeed', score: '95' }
  });
  assert(cloudLog.severity === 'INFO', 'Cloud log has correct severity');
  assert(cloudLog.labels.module === 'pagespeed', 'Cloud log preserves labels');
  assert(cloudLog.timestamp !== undefined, 'Cloud log includes timestamp');

  // --------------------------------------------------------------------------
  // Phase 2: REST Endpoints Integration Tests
  // --------------------------------------------------------------------------
  console.log('\n📌 Phase 2: REST API Endpoints Integration Tests (http://localhost:4000)');

  // 1. GET /api/gcp/status
  const gcpStatusRes = await httpGet('http://localhost:4000/api/gcp/status');
  assert(gcpStatusRes.status === 200, 'GET /api/gcp/status returns HTTP 200');
  assert(gcpStatusRes.data.success === true, 'Status response has success=true');
  assert(gcpStatusRes.data.status.totalEnabled >= 24, `Endpoint reports at least 24 enabled Google Cloud APIs (found: ${gcpStatusRes.data.status.totalEnabled})`);
  assert(gcpStatusRes.data.hasActiveApiKey === true, 'Active API key detected from environment/config');

  // 2. POST /api/bigquery/crux-sql
  const cruxSqlRes = await httpPost('http://localhost:4000/api/bigquery/crux-sql', {
    origin: 'https://fab.com',
    metric: 'largest_contentful_paint'
  });
  assert(cruxSqlRes.status === 200, 'POST /api/bigquery/crux-sql returns HTTP 200');
  assert(cruxSqlRes.data.sql.includes('https://fab.com'), 'CrUX SQL endpoint injects target origin');
  assert(cruxSqlRes.data.sql.includes('chrome-ux-report'), 'CrUX SQL queries public CrUX dataset');

  // 3. POST /api/bigquery/gsc-sql
  const gscSqlRes = await httpPost('http://localhost:4000/api/bigquery/gsc-sql', {
    projectId: 'my-seo-gcp',
    datasetId: 'gsc_export'
  });
  assert(gscSqlRes.status === 200, 'POST /api/bigquery/gsc-sql returns HTTP 200');
  assert(gscSqlRes.data.sql.includes('`my-seo-gcp.gsc_export.searchdata_url_impression`'), 'GSC SQL endpoint injects dataset identifier');

  // 4. POST /api/bigquery/log-sql
  const logSqlRes = await httpPost('http://localhost:4000/api/bigquery/log-sql', {
    projectId: 'my-seo-gcp',
    logTable: 'edge_cdn_logs'
  });
  assert(logSqlRes.status === 200, 'POST /api/bigquery/log-sql returns HTTP 200');
  assert(logSqlRes.data.sql.includes('edge_cdn_logs'), 'Log SQL endpoint injects custom log table');

  // 5. POST /api/bigquery/execute (Dry Run)
  const bqExecRes = await httpPost('http://localhost:4000/api/bigquery/execute', {
    sql: 'SELECT * FROM `chrome-ux-report.all.202401` LIMIT 10',
    dryRun: true
  });
  assert(bqExecRes.status === 200, 'POST /api/bigquery/execute returns HTTP 200');
  assert(bqExecRes.data.success === true, 'BigQuery dry run endpoint succeeds');
  assert(bqExecRes.data.dryRun === true, 'Response confirms dryRun mode');
  assert(typeof bqExecRes.data.estimatedCostUSD === 'number', 'Response contains estimatedCostUSD');

  // 6. POST /api/gcs/upload
  const gcsUploadRes = await httpPost('http://localhost:4000/api/gcs/upload', {
    auditData: { url: 'https://fab.com', perfScore: 92 },
    prefix: 'api-test'
  });
  assert(gcsUploadRes.status === 200, 'POST /api/gcs/upload returns HTTP 200');
  assert(gcsUploadRes.data.success === true, 'GCS upload endpoint succeeds');
  assert(gcsUploadRes.data.gcsUri.startsWith('gs://'), 'Response contains valid gs:// URI');

  // 7. POST /api/ga4/correlate
  const ga4Res = await httpPost('http://localhost:4000/api/ga4/correlate', {
    currentLcpSec: 3.8,
    targetLcpSec: 2.0,
    monthlyOrganicVisitors: 250000,
    avgOrderValue: 120,
    currentConversionRatePct: 2.2
  });
  assert(ga4Res.status === 200, 'POST /api/ga4/correlate returns HTTP 200');
  assert(ga4Res.data.success === true, 'GA4 correlation endpoint succeeds');
  assert(ga4Res.data.simulation.projectedMonthlyLiftUSD > 0, 'Calculates monthly dollar lift');
  assert(ga4Res.data.simulation.projectedAnnualLiftUSD > 0, 'Calculates annual dollar lift');

  // 8. POST /api/telemetry/log
  const logEmitRes = await httpPost('http://localhost:4000/api/telemetry/log', {
    message: 'Integration test telemetry probe',
    severity: 'NOTICE',
    labels: { suite: 'test_google_cloud' }
  });
  assert(logEmitRes.status === 200, 'POST /api/telemetry/log returns HTTP 200');
  assert(logEmitRes.data.success === true, 'Telemetry log endpoint succeeds');
  assert(logEmitRes.data.entry.severity === 'NOTICE', 'Telemetry log retains severity');

  console.log(`\n=============================================================`);
  console.log(`🎉 ALL ${passed}/${total} GOOGLE CLOUD & BIGQUERY TESTS PASSED!`);
  console.log(`=============================================================\n`);
}

runTests().catch(err => {
  console.error('\n❌ FATAL TEST FAILURE:', err);
  process.exit(1);
});
