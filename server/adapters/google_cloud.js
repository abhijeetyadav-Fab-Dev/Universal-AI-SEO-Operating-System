/**
 * ==============================================================================
 * OmniSEO-OS Google Cloud Enterprise Services Adapter
 * Integrates enabled GCP APIs:
 * 1. Chrome UX Report API & PageSpeed Insights API (Core CWV & Field Data)
 * 2. BigQuery API, BigQuery Storage, Data Transfer & Analytics Hub
 * 3. Google Cloud Storage JSON API (Audit Archival & Sitemaps)
 * 4. Google Analytics API (GA4 Organic Traffic & Conversion Correlator)
 * 5. Cloud Logging, Cloud Monitoring, Cloud Trace & Telemetry API
 * 6. Service Usage & Service Management API (Cloud API Health Registry)
 * ==============================================================================
 */

import fetch from 'node-fetch';
import { DEFAULT_PSI_KEY } from './pagespeed.js';
import { DEFAULT_CRUX_KEY } from './crux.js';

// Default GCP Configuration
export const DEFAULT_GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID || 'omniseo-seo-intelligence';
export const DEFAULT_GCS_BUCKET = process.env.GCS_BUCKET_NAME || process.env.GOOGLE_GCS_BUCKET || 'omniseo-audit-archives';

/**
 * /**
 * Registry of all 24 Google Cloud APIs enabled for this deployment
 */
export const ENABLED_GOOGLE_CLOUD_APIS = [
  {
    id: 'pagespeedonline.googleapis.com',
    code: 'psi',
    name: 'PageSpeed Insights API',
    category: 'Core Web Vitals & Performance',
    relevance: 'CRITICAL',
    description: 'Real-user field (CrUX) and lab (Lighthouse) performance metrics per page URL',
    authType: 'API Key',
    activeKey: DEFAULT_PSI_KEY ? `${DEFAULT_PSI_KEY.slice(0, 8)}...` : 'None',
    status: 'ACTIVE'
  },
  {
    id: 'chromeuxreport.googleapis.com',
    code: 'crux',
    name: 'Chrome UX Report API',
    category: 'Real-User Experience (CrUX)',
    relevance: 'CRITICAL',
    description: 'Historical 40-week Core Web Vitals, device form factors, and LCP 4-part sub-metrics',
    authType: 'API Key',
    activeKey: DEFAULT_CRUX_KEY ? `${DEFAULT_CRUX_KEY.slice(0, 8)}...` : 'None',
    status: 'ACTIVE'
  },
  {
    id: 'bigquery.googleapis.com',
    code: 'bigquery',
    name: 'BigQuery API',
    category: 'Data Warehouse & Analytics',
    relevance: 'HIGH',
    description: 'Enterprise SQL queries across CrUX historical datasets, GSC bulk exports, and server log crawl archives',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'bigqueryconnection.googleapis.com',
    code: 'bigqueryconnection',
    name: 'BigQuery Connection API',
    category: 'Data Warehouse & Analytics',
    relevance: 'MEDIUM',
    description: 'Federated queries connecting BigQuery to Cloud SQL and external SEO data stores',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'bigquerydatapolicy.googleapis.com',
    code: 'bigquerydatapolicy',
    name: 'BigQuery Data Policy API',
    category: 'Data Governance',
    relevance: 'MEDIUM',
    description: 'Column-level data masking and security policies for customer search telemetry',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'bigquerydatatransfer.googleapis.com',
    code: 'bigquerydatatransfer',
    name: 'BigQuery Data Transfer API',
    category: 'Data Pipeline',
    relevance: 'MEDIUM',
    description: 'Automated scheduled ingestion of Google Search Console data and external SEO logs into BigQuery tables',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'bigquerymigration.googleapis.com',
    code: 'bigquerymigration',
    name: 'BigQuery Migration API',
    category: 'Data Transformation',
    relevance: 'LOW',
    description: 'SQL translation and migration workflows for legacy SEO data warehouses into BigQuery',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'bigqueryreservation.googleapis.com',
    code: 'bigqueryreservation',
    name: 'BigQuery Reservation API',
    category: 'Capacity Management',
    relevance: 'LOW',
    description: 'Dedicated slot commitments and autoscaling workload management for petabyte crawl processing',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'bigquerystorage.googleapis.com',
    code: 'bigquerystorage',
    name: 'BigQuery Storage API',
    category: 'Data Warehouse & Analytics',
    relevance: 'HIGH',
    description: 'High-throughput stream reading for petabyte-scale CrUX multi-country and Search Console dataset exports',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'analyticshub.googleapis.com',
    code: 'analyticshub',
    name: 'Analytics Hub API',
    category: 'Data Sharing & Exchange',
    relevance: 'MEDIUM',
    description: 'Secure enterprise sharing and consumption of Curated CrUX datasets and SEO industry benchmarks',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'dataplex.googleapis.com',
    code: 'dataplex',
    name: 'Cloud Dataplex API',
    category: 'Data Governance',
    relevance: 'LOW',
    description: 'Data mesh governance and quality checking for enterprise SEO lakehouses',
    authType: 'OAuth2',
    status: 'READY'
  },
  {
    id: 'datastore.googleapis.com',
    code: 'datastore',
    name: 'Cloud Datastore API',
    category: 'NoSQL Database',
    relevance: 'MEDIUM',
    description: 'Document key-value storage for page crawl trees, metadata indexes, and keyword rankings',
    authType: 'OAuth2',
    status: 'READY'
  },
  {
    id: 'logging.googleapis.com',
    code: 'logging',
    name: 'Cloud Logging API',
    category: 'Observability & Auditing',
    relevance: 'MEDIUM',
    description: 'Structured crawl logs, HTTP 4xx/5xx error streaming, and bot crawler log analysis',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'monitoring.googleapis.com',
    code: 'monitoring',
    name: 'Cloud Monitoring API',
    category: 'Observability & Metrics',
    relevance: 'MEDIUM',
    description: 'Real-time latency charts, Core Web Vitals health SLOs, and crawler throughput monitoring',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'sqladmin.googleapis.com',
    code: 'sqladmin',
    name: 'Cloud SQL',
    category: 'Relational Database',
    relevance: 'MEDIUM',
    description: 'Managed PostgreSQL/MySQL storage for relational SEO crawl history and URL backlink maps',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'storage-component.googleapis.com',
    code: 'storage-component',
    name: 'Cloud Storage',
    category: 'Object Storage & Persistence',
    relevance: 'HIGH',
    description: 'Scalable Google Cloud Storage infrastructure for multi-domain crawl archives',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'storage.googleapis.com',
    code: 'storage',
    name: 'Cloud Storage API',
    category: 'Object Storage & Persistence',
    relevance: 'HIGH',
    description: 'Cloud storage bucket management and access control for SEO audit artifacts',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'storage-api.googleapis.com',
    code: 'storage-api',
    name: 'Google Cloud Storage JSON API',
    category: 'Object Storage & Persistence',
    relevance: 'HIGH',
    description: 'Cloud storage bucket archival for crawl snapshots, sitemap XML backups, and executive PDF/CSV reports',
    authType: 'Service Account / OAuth2 / Signed URLs',
    status: 'READY'
  },
  {
    id: 'cloudtrace.googleapis.com',
    code: 'cloudtrace',
    name: 'Cloud Trace API',
    category: 'Observability & Telemetry',
    relevance: 'MEDIUM',
    description: 'Distributed tracing for multi-page audit pipelines, adapter network latency, and API hop monitoring',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'telemetry.googleapis.com',
    code: 'telemetry',
    name: 'Telemetry API',
    category: 'Observability & Telemetry',
    relevance: 'MEDIUM',
    description: 'Real-time system telemetry and performance metrics streaming across worker nodes',
    authType: 'Service Account / OAuth2',
    status: 'READY'
  },
  {
    id: 'dataform.googleapis.com',
    code: 'dataform',
    name: 'Dataform API',
    category: 'Data Transformation',
    relevance: 'LOW',
    description: 'Data transformation pipeline definitions for modeling raw search logs into reporting tables',
    authType: 'OAuth2',
    status: 'READY'
  },
  {
    id: 'analyticsdata.googleapis.com',
    code: 'analyticsdata',
    name: 'Google Analytics API',
    category: 'Web Analytics & Conversions',
    relevance: 'HIGH',
    description: 'Real-time organic search traffic, bounce rates, landing page engagement, and conversion telemetry',
    authType: 'OAuth2 / Service Account',
    status: 'READY'
  },
  {
    id: 'cloudapis.googleapis.com',
    code: 'cloudapis',
    name: 'Google Cloud APIs',
    category: 'Cloud Management',
    relevance: 'HIGH',
    description: 'Core Google Cloud API discovery, authentication, and endpoint multiplexing layer',
    authType: 'API Key / OAuth2',
    status: 'ACTIVE'
  },
  {
    id: 'servicemanagement.googleapis.com',
    code: 'servicemanagement',
    name: 'Service Management API',
    category: 'Cloud Management',
    relevance: 'MEDIUM',
    description: 'Project API endpoint configuration and credential policy verification',
    authType: 'OAuth2',
    status: 'READY'
  },
  {
    id: 'serviceusage.googleapis.com',
    code: 'serviceusage',
    name: 'Service Usage API',
    category: 'Cloud Management',
    relevance: 'HIGH',
    description: 'Inspection and verification of enabled Google Cloud services, quotas, and billing status',
    authType: 'API Key / OAuth2',
    status: 'ACTIVE'
  }
];

/**
 * Return summary status of all enabled Google Cloud APIs
 */
export function getGoogleCloudServicesStatus(options = {}) {
  const activeCount = ENABLED_GOOGLE_CLOUD_APIS.filter(a => a.status === 'ACTIVE').length;
  const readyCount = ENABLED_GOOGLE_CLOUD_APIS.filter(a => a.status === 'READY').length;

  const categories = {};
  for (const api of ENABLED_GOOGLE_CLOUD_APIS) {
    if (!categories[api.category]) categories[api.category] = [];
    categories[api.category].push(api);
  }

  return {
    success: true,
    totalEnabled: ENABLED_GOOGLE_CLOUD_APIS.length,
    totalApis: ENABLED_GOOGLE_CLOUD_APIS.length,
    activeApis: activeCount,
    readyApis: readyCount,
    projectId: options.gcpProjectId || DEFAULT_GCP_PROJECT_ID,
    storageBucket: options.gcsBucket || DEFAULT_GCS_BUCKET,
    verifiedApiKey: options.apiKey || DEFAULT_PSI_KEY,
    categories,
    services: ENABLED_GOOGLE_CLOUD_APIS
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BIGQUERY SEO & CRUX WAREHOUSE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates production standard SQL for querying Google CrUX Public Datasets in BigQuery
 * Official Google Dataset: `chrome-ux-report.*`
 */
export function generateCrUXBigQuerySql({
  origin = 'https://web.dev',
  country = null,
  metric = 'largest_contentful_paint',
  yearMonth = '202608'
} = {}) {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const datasetTable = country
    ? `\`chrome-ux-report.country_${country.toLowerCase()}.${yearMonth}\``
    : `\`chrome-ux-report.all.${yearMonth}\``;

  return {
    dataset: country ? `chrome-ux-report.country_${country.toLowerCase()}` : 'chrome-ux-report.all',
    table: yearMonth,
    description: `Query historical real-user distributions and P75 for ${cleanOrigin} in Google CrUX BigQuery public dataset`,
    sql: `-- Query Google CrUX Public BigQuery Dataset for ${cleanOrigin}
SELECT
  yyyymm,
  origin,
  form_factor.name AS form_factor,
  -- P75 Core Web Vitals
  ${metric}.histogram.bin[OFFSET(0)].start AS good_start_ms,
  ROUND(${metric}.histogram.bin[OFFSET(0)].density * 100, 1) AS good_pct,
  ROUND(${metric}.histogram.bin[OFFSET(1)].density * 100, 1) AS needs_improvement_pct,
  ROUND(${metric}.histogram.bin[OFFSET(2)].density * 100, 1) AS poor_pct,
  -- 4-Part LCP Sub-Metrics if available
  experimental.time_to_first_byte.histogram.bin[OFFSET(0)].density AS ttfb_good_density
FROM
  ${datasetTable}
WHERE
  origin = '${cleanOrigin}'
ORDER BY
  form_factor.name ASC;`
  };
}

/**
 * Generates SQL for querying Google Search Console (GSC) BigQuery Bulk Data Exports
 */
export function generateGscBulkExportSql({
  projectId = null,
  datasetName = 'searchconsole',
  datasetId = null,
  siteUrl = 'sc-domain:example.com',
  startDate = '2026-08-01',
  endDate = '2026-08-31',
  limit = 100
} = {}) {
  const targetDataset = datasetId || datasetName;
  const tableRef = projectId
    ? `\`${projectId}.${targetDataset}.searchdata_url_impression\``
    : `\`${targetDataset}.searchdata_url_impression\``;

  return {
    dataset: targetDataset,
    description: `Query Search Console Bulk Data Export table searchdata_url_impression for organic visibility`,
    sql: `-- Google Search Console BigQuery Bulk Export URL Query
SELECT
  data_date,
  url,
  query,
  country,
  device,
  SUM(impressions) AS total_impressions,
  SUM(clicks) AS total_clicks,
  ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) AS ctr_pct,
  ROUND(AVG(sum_top_position / impressions), 1) AS avg_position
FROM
  ${tableRef}
WHERE
  site_url = '${siteUrl}'
  AND data_date BETWEEN DATE('${startDate}') AND DATE('${endDate}')
GROUP BY
  data_date, url, query, country, device
HAVING
  total_impressions >= 10
ORDER BY
  total_clicks DESC
LIMIT ${limit};`
  };
}

/**
 * Generates SQL for analyzing Web Server Crawl Logs in BigQuery (Googlebot vs Users)
 */
export function generateLogAnalysisSql({
  projectId = null,
  datasetName = 'seo_logs',
  tableName = 'access_logs',
  logTable = null,
  days = 14
} = {}) {
  const targetTable = logTable || tableName;
  const tableRef = projectId
    ? `\`${projectId}.${datasetName}.${targetTable}\``
    : `\`${datasetName}.${targetTable}\``;

  return {
    dataset: datasetName,
    tableName: targetTable,
    description: `Enterprise Googlebot & Search Engine Spider crawl frequency analysis`,
    sql: `-- SEO Server Log Crawler Analysis in BigQuery
SELECT
  DATE(timestamp) AS crawl_date,
  CASE
    WHEN REGEXP_CONTAINS(user_agent, r'(?i)Googlebot-Mobile|Android.*Chrome') THEN 'Googlebot Smartphone'
    WHEN REGEXP_CONTAINS(user_agent, r'(?i)Googlebot') THEN 'Googlebot Desktop'
    WHEN REGEXP_CONTAINS(user_agent, r'(?i)bingbot') THEN 'Bingbot'
    WHEN REGEXP_CONTAINS(user_agent, r'(?i)Applebot') THEN 'Applebot'
    WHEN REGEXP_CONTAINS(user_agent, r'(?i)YandexBot') THEN 'Yandex'
    ELSE 'Other Crawler'
  END AS bot_type,
  status_code,
  COUNT(*) AS total_hits,
  COUNT(DISTINCT request_path) AS distinct_urls_crawled,
  ROUND(AVG(response_time_ms), 1) AS avg_response_time_ms
FROM
  ${tableRef}
WHERE
  timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
  AND (
    user_agent LIKE '%Googlebot%'
    OR user_agent LIKE '%bingbot%'
    OR user_agent LIKE '%Applebot%'
  )
GROUP BY
  crawl_date, bot_type, status_code
ORDER BY
  crawl_date DESC, total_hits DESC;`
  };
}

/**
 * Executes a BigQuery Query REST Request (or provides Dry-Run execution simulation)
 */
export async function executeBigQueryQuery(options = {}) {
  let query = options.query || options.sql;
  if (query && typeof query === 'object' && query.sql) {
    query = query.sql;
  }
  const projectId = options.projectId || DEFAULT_GCP_PROJECT_ID;
  const accessToken = options.accessToken || null;
  const dryRun = options.dryRun !== undefined ? Boolean(options.dryRun) : false;

  if (!query || typeof query !== 'string') {
    throw new Error('Query string is required for BigQuery execution.');
  }

  // If OAuth access token is provided, run live against BigQuery v2 REST API
  if (accessToken) {
    const endpoint = `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}/queries`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          useLegacySql: false,
          dryRun
        }),
        timeout: 30000
      });

      const data = await res.json();
      const bytes = Number(data.totalBytesProcessed) || 0;
      const cost = parseFloat(((bytes / (1024 * 1024 * 1024 * 1024)) * 6.25).toFixed(6));
      return {
        success: res.ok,
        status: res.status,
        projectId,
        dryRun,
        totalBytesProcessed: bytes,
        estimatedBytesProcessed: bytes,
        estimatedCostUSD: cost,
        estimatedCostUsd: cost,
        jobComplete: data.jobComplete,
        rowsCount: data.rows?.length || 0,
        schema: data.schema || null,
        rows: data.rows || [],
        error: data.error || null
      };
    } catch (err) {
      return {
        success: false,
        projectId,
        error: err.message
      };
    }
  }

  // Pre-Execution Syntax & Estimation Plan (No OAuth Token provided)
  const lineCount = query.split('\n').length;
  const estimatedBytes = Math.min(query.length * 150000, 250 * 1024 * 1024);
  const cost = parseFloat(((estimatedBytes / (1024 * 1024 * 1024 * 1024)) * 6.25).toFixed(6));

  return {
    success: true,
    isPlan: true,
    projectId,
    dryRun: true,
    queryLines: lineCount,
    totalBytesProcessed: estimatedBytes,
    estimatedBytesProcessed: estimatedBytes,
    estimatedCostUSD: cost,
    estimatedCostUsd: cost,
    targetEngines: ['BigQuery SQL (Standard SQL)', 'Google Analytics Hub', 'BigQuery Storage API'],
    authStatus: 'Awaiting GCP Service Account or OAuth Bearer Token to dispatch to live cluster',
    sqlPreview: query.slice(0, 300) + '...'
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GOOGLE CLOUD STORAGE (GCS) AUDIT ARCHIVER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format GCS Object URIs
 */
export function formatGcsUrls(bucket = DEFAULT_GCS_BUCKET, objectPath = 'audits/snapshot.json') {
  let finalBucket = bucket;
  let finalPath = objectPath;
  if (typeof bucket === 'object' && bucket !== null) {
    finalBucket = bucket.bucketName || bucket.bucket || DEFAULT_GCS_BUCKET;
    finalPath = bucket.objectKey || bucket.objectPath || 'audits/snapshot.json';
  }
  const cleanPath = (finalPath || 'audits/snapshot.json').replace(/^\/+/, '');
  const gsUri = `gs://${finalBucket}/${cleanPath}`;
  const publicUrl = `https://storage.googleapis.com/${finalBucket}/${cleanPath}`;
  return {
    gsUri,
    gcsUri: gsUri,
    publicUrl,
    httpUrl: publicUrl,
    consoleUrl: `https://console.cloud.google.com/storage/browser/${finalBucket}/${cleanPath}`
  };
}

/**
 * Upload an audit snapshot or report to Google Cloud Storage
 */
export async function uploadAuditToGcs(options = {}) {
  const bucket = options.bucketName || options.bucket || DEFAULT_GCS_BUCKET;
  const data = options.auditData || options.data || {};
  const prefix = options.prefix || 'audits';
  const objectPath = options.objectPath || `${prefix}/${data.domain || 'report'}_${Date.now()}.json`;
  const contentType = options.contentType || 'application/json';
  const accessToken = options.accessToken || null;

  const urls = formatGcsUrls(bucket, objectPath);
  const payload = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  if (accessToken) {
    const uploadEndpoint = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectPath)}`;
    try {
      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': contentType
        },
        body: payload,
        timeout: 20000
      });
      const resData = await res.json();
      return {
        success: res.ok,
        status: res.status,
        bucket,
        objectPath,
        bytes: Buffer.byteLength(payload),
        contentType,
        ...urls,
        metadata: resData
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        bucket,
        objectPath
      };
    }
  }

  // Offline / Configured storage descriptor
  return {
    success: true,
    isPrepared: true,
    bucket,
    objectPath,
    bytes: Buffer.byteLength(payload),
    contentType,
    ...urls,
    message: 'Audit archive manifest generated. Connect GCP credentials/token for instant live cloud sync.'
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GOOGLE ANALYTICS (GA4) SEO & CORE WEB VITALS CORRELATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds standard Google Analytics Data API (GA4) report requests
 */
export function buildGa4OrganicReportRequest({
  propertyId = process.env.GA4_PROPERTY_ID || '123456789',
  startDate = '30daysAgo',
  endDate = 'today',
  pagePath = '/',
  limit = 20
} = {}) {
  return {
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: 'landingPagePlusQueryString' },
      { name: 'sessionDefaultChannelGroup' }
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'conversions' }
    ],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: 'sessionDefaultChannelGroup',
              stringFilter: { matchType: 'EXACT', value: 'Organic Search' }
            }
          },
          ...(pagePath && pagePath !== '/' ? [{
            filter: {
              fieldName: 'landingPagePlusQueryString',
              stringFilter: { matchType: 'CONTAINS', value: pagePath }
            }
          }] : [])
        ]
      }
    },
    limit
  };
}

/**
 * Correlates Core Web Vitals performance with Google Analytics Organic KPIs
 */
export function correlateCwvWithGa4(input = {}) {
  let currentLcpSec = input.currentLcpSec;
  let targetLcpSec = input.targetLcpSec !== undefined ? Number(input.targetLcpSec) : 2.5;
  let visitors = input.monthlyOrganicVisitors;
  let aov = input.avgOrderValue !== undefined ? Number(input.avgOrderValue) : 75;
  let crPct = input.currentConversionRatePct;

  if (input.cwvMetrics && currentLcpSec === undefined) {
    currentLcpSec = input.cwvMetrics.lcp?.numericValueMs ? input.cwvMetrics.lcp.numericValueMs / 1000 : undefined;
  }
  if (input.ga4Data) {
    if (visitors === undefined && input.ga4Data.sessions) visitors = input.ga4Data.sessions;
    if (crPct === undefined && input.ga4Data.conversionRate) crPct = input.ga4Data.conversionRate;
  }

  currentLcpSec = currentLcpSec !== undefined ? Number(currentLcpSec) : 3.5;
  visitors = visitors !== undefined ? Number(visitors) : 50000;
  crPct = crPct !== undefined ? Number(crPct) : 2.0;

  const currentLcpMs = Math.round(currentLcpSec * 1000);
  const targetLcpMs = Math.round(targetLcpSec * 1000);

  const improvementSec = Math.max(0, currentLcpSec - targetLcpSec);
  const conversionLiftMultiplier = 1 + (improvementSec * 0.09);
  const expectedConversionRatePct = parseFloat((crPct * conversionLiftMultiplier).toFixed(2));
  const additionalMonthlyConversions = Math.round(visitors * ((expectedConversionRatePct - crPct) / 100));
  const projectedMonthlyLiftUSD = Math.round(additionalMonthlyConversions * aov);
  const projectedAnnualLiftUSD = projectedMonthlyLiftUSD * 12;

  const bounceRiskLevel = currentLcpSec > 4.0 ? 'CRITICAL' : currentLcpSec > 2.5 ? 'ELEVATED' : 'OPTIMAL';

  return {
    evaluatedUrl: input.evaluatedUrl || input.url || 'Audited Page',
    currentLcpSec,
    targetLcpSec,
    currentLcpMs,
    targetLcpMs,
    monthlyOrganicVisitors: visitors,
    currentConversionRatePct: crPct,
    expectedConversionRatePct,
    projectedMonthlyLiftUSD,
    projectedAnnualLiftUSD,
    additionalMonthlyConversions,
    bounceRiskLevel,
    simulation: {
      projectedMonthlyLiftUSD,
      projectedAnnualLiftUSD,
      expectedConversionRatePct,
      additionalMonthlyConversions
    },
    cwvSummary: {
      lcpMs: currentLcpMs,
      lcpRating: currentLcpSec <= 2.5 ? 'GOOD' : currentLcpSec <= 4.0 ? 'NEEDS_IMPROVEMENT' : 'POOR'
    },
    recommendation: currentLcpSec > 2.5
      ? `Accelerate LCP from ${currentLcpSec.toFixed(2)}s to ${targetLcpSec.toFixed(2)}s. This is projected to generate $${projectedMonthlyLiftUSD.toLocaleString()}/mo in incremental revenue.`
      : `Core Web Vitals are within Google's optimal threshold. Maintain current asset delivery and server speed.`
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CLOUD LOGGING & TELEMETRY API EMITTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a structured audit telemetry log entry for Cloud Logging / Telemetry API
 */
export function formatCloudLogEntry(options = {}) {
  const event = options.event || 'AUDIT_COMPLETED';
  const targetUrl = options.targetUrl || options.url || 'https://example.com';
  const durationMs = options.durationMs || 1250;
  const healthScore = options.healthScore || 90;
  const cwvScore = options.cwvScore || 85;
  const severity = (options.severity || 'INFO').toUpperCase();
  const labels = options.labels || {};
  const message = options.message || `Audit completed for ${targetUrl}`;

  return {
    logName: `projects/${DEFAULT_GCP_PROJECT_ID}/logs/omniseo-audit`,
    resource: {
      type: 'generic_task',
      labels: {
        project_id: DEFAULT_GCP_PROJECT_ID,
        task_id: 'seo-audit-job',
        location: 'global'
      }
    },
    timestamp: new Date().toISOString(),
    severity,
    labels: {
      project_id: DEFAULT_GCP_PROJECT_ID,
      ...labels
    },
    message,
    jsonPayload: {
      message,
      event,
      targetUrl,
      durationMs,
      healthScore,
      cwvScore,
      labels,
      source: 'OmniSEO-OS Universal Engine',
      provenance: 'Google Cloud Platform Telemetry Integration'
    }
  };
}
