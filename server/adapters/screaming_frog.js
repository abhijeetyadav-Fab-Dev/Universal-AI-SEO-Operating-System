/**
 * ==============================================================================
 * OmniSEO-OS Screaming Frog SEO Spider Enterprise CLI Adapter
 * Controls and interfaces with Screaming Frog SEO Spider's Full Licensed Version
 * Binary: ScreamingFrogSEOSpiderCli.exe (v24.3)
 *
 * Capabilities:
 * 1. Headless website crawling (--crawl <url> --headless)
 * 2. Targeted URL List crawling (--crawl-list <file>)
 * 3. XML Sitemap crawling (--crawl-sitemap <sitemap-url>)
 * 4. Automated multi-tab export (Internal, Response Codes, Titles, Directives, etc.)
 * 5. Automatic XML sitemap generation (--create-sitemap)
 * 6. Native CSV parsing & structured SEO issue extraction
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard Windows installation paths for Screaming Frog SEO Spider
const POTENTIAL_BINARY_PATHS = [
  'C:\\Program Files (x86)\\Screaming Frog SEO Spider\\ScreamingFrogSEOSpiderCli.exe',
  'C:\\Program Files\\Screaming Frog SEO Spider\\ScreamingFrogSEOSpiderCli.exe',
  path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Screaming Frog SEO Spider', 'ScreamingFrogSEOSpiderCli.exe')
];

export const SCREAMING_FROG_USER_DIR = path.join(os.homedir(), '.ScreamingFrogSEOSpider');
export const CRAWL_STORAGE_DIR = path.join(__dirname, '../../data/screaming_frog_crawls');

// Ensure crawl output directory exists
if (!fs.existsSync(CRAWL_STORAGE_DIR)) {
  try {
    fs.mkdirSync(CRAWL_STORAGE_DIR, { recursive: true });
  } catch {
    // Non-fatal if storage directory creation deferred
  }
}

// In-memory crawl job registry
const crawlJobs = new Map();

/**
 * Locate the Screaming Frog SEO Spider CLI executable
 */
export function findScreamingFrogBinary() {
  if (process.env.SCREAMING_FROG_PATH && fs.existsSync(process.env.SCREAMING_FROG_PATH)) {
    return process.env.SCREAMING_FROG_PATH;
  }

  for (const p of POTENTIAL_BINARY_PATHS) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

/**
 * Inspect Screaming Frog user configuration for version and linked APIs
 */
export function readSpiderConfig() {
  const configPath = path.join(SCREAMING_FROG_USER_DIR, 'spider.config');
  const details = {
    version: '24.3',
    psiKeyConfigured: false,
    psiKeyPreview: null,
    recentCrawls: []
  };

  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        if (line.startsWith('updatechecker.lastest_version=')) {
          details.version = line.split('=')[1].trim();
        } else if (line.startsWith('PSI.secretkey=')) {
          const key = line.split('=')[1].trim();
          if (key) {
            details.psiKeyConfigured = true;
            details.psiKeyPreview = `${key.slice(0, 8)}...`;
          }
        } else if (line.includes('ui.recent_crawl_')) {
          const rawUrl = line.split('=')[1]?.replace(/\\:/g, ':')?.trim();
          if (rawUrl) details.recentCrawls.push(rawUrl);
        }
      }
    } catch {
      // Return defaults on read error
    }
  }

  return details;
}

/**
 * Return operational status and capabilities of the local Screaming Frog installation
 */
export function getScreamingFrogStatus() {
  const binaryPath = findScreamingFrogBinary();
  const config = readSpiderConfig();
  const installed = Boolean(binaryPath);

  return {
    success: true,
    installed,
    binaryPath: binaryPath || 'Not found in standard paths',
    version: config.version,
    licensed: true,
    licenseType: 'Full Licensed Version (Headless CLI Enabled)',
    configDirectory: SCREAMING_FROG_USER_DIR,
    storageDirectory: CRAWL_STORAGE_DIR,
    linkedPsiKey: config.psiKeyPreview,
    activeCrawlJobs: Array.from(crawlJobs.values()).filter(j => j.status === 'RUNNING').length,
    supportedModes: [
      { id: 'spider', name: 'Website Spider', flag: '--crawl <url>', desc: 'Full recursive domain/subfolder crawl' },
      { id: 'list', name: 'URL List Mode', flag: '--crawl-list <file>', desc: 'Audit specific list of URLs' },
      { id: 'sitemap', name: 'XML Sitemap Mode', flag: '--crawl-sitemap <url>', desc: 'Crawl and validate XML sitemap URLs' }
    ],
    recommendedExportTabs: [
      'Internal:All',
      'Response Codes:All',
      'Page Titles:All',
      'Meta Description:All',
      'H1:All',
      'Canonicals:All',
      'Directives:All',
      'Structured Data:All',
      'Security:All',
      'Sitemaps:All'
    ]
  };
}

/**
 * Construct CLI argument list and shell command string
 */
export function buildScreamingFrogCommand({
  target = 'https://example.com',
  mode = 'spider', // 'spider', 'list', or 'sitemap'
  outputFolder = null,
  exportTabs = ['Internal:All', 'Response Codes:All', 'Page Titles:All', 'Meta Description:All', 'H1:All', 'Canonicals:All'],
  createSitemap = false,
  overwrite = true,
  exportFormat = 'csv',
  saveCrawl = false
} = {}) {
  const binary = findScreamingFrogBinary() || 'ScreamingFrogSEOSpiderCli.exe';
  const outDir = outputFolder || path.join(CRAWL_STORAGE_DIR, `crawl_${Date.now()}`);
  const args = [];

  if (mode === 'list') {
    args.push('--crawl-list', target);
  } else if (mode === 'sitemap') {
    args.push('--crawl-sitemap', target);
  } else {
    args.push('--crawl', target);
  }

  args.push('--headless');
  args.push('--output-folder', outDir);
  args.push('--export-format', exportFormat);

  if (exportTabs && exportTabs.length > 0) {
    args.push('--export-tabs', Array.isArray(exportTabs) ? exportTabs.join(',') : exportTabs);
  }

  if (overwrite) {
    args.push('--overwrite');
  }

  if (createSitemap) {
    args.push('--create-sitemap');
  }

  if (saveCrawl) {
    args.push('--save-crawl');
  }

  const quotedArgs = args.map(a => (a.includes(' ') || a.includes(':') ? `"${a}"` : a));
  const fullCommand = `& "${binary}" ${quotedArgs.join(' ')}`;

  return {
    binary,
    args,
    outputFolder: outDir,
    fullCommand
  };
}

/**
 * Robust RFC 4180 CSV line parser
 */
export function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse an exported Screaming Frog CSV file into structured objects
 */
export function parseScreamingFrogCsv(filePath, maxRows = 250) {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: `File not found: ${filePath}`, rows: [] };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      return { success: true, count: 0, headers: [], rows: [] };
    }

    const headers = parseCsvLine(lines[0]).map(h => h.trim());
    const rows = [];

    const limit = Math.min(lines.length, maxRows + 1);
    for (let i = 1; i < limit; i++) {
      const values = parseCsvLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] !== undefined ? values[idx].trim() : '';
      });
      rows.push(row);
    }

    return {
      success: true,
      totalCount: lines.length - 1,
      displayedCount: rows.length,
      headers,
      rows
    };
  } catch (err) {
    return { success: false, error: err.message, rows: [] };
  }
}

/**
 * Summarize all exported CSVs in a crawl output folder
 */
export function getScreamingFrogCrawlSummary(outputDir) {
  if (!fs.existsSync(outputDir)) {
    return { success: false, error: 'Output directory does not exist' };
  }

  const files = fs.readdirSync(outputDir);
  const summary = {
    outputDir,
    filesAvailable: files,
    totalUrls: 0,
    statusCodes: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, other: 0 },
    indexableCount: 0,
    nonIndexableCount: 0,
    missingTitles: 0,
    duplicateTitles: 0,
    missingDescriptions: 0,
    duplicateDescriptions: 0,
    missingH1: 0,
    duplicateH1: 0,
    missingCanonicals: 0,
    avgResponseTimeSec: 0,
    avgWordCount: 0,
    sampleUrls: []
  };

  const internalFile = files.find(f => f.toLowerCase().includes('internal_all.csv'));
  if (internalFile) {
    const parsed = parseScreamingFrogCsv(path.join(outputDir, internalFile), 500);
    if (parsed.success && parsed.rows.length > 0) {
      summary.totalUrls = parsed.totalCount;

      let totalResponseTime = 0;
      let totalWords = 0;
      let respTimeCount = 0;
      let wordCountItems = 0;

      const titleMap = new Map();
      const descMap = new Map();
      const h1Map = new Map();

      for (const r of parsed.rows) {
        const code = parseInt(r['Status Code'], 10);
        if (code >= 200 && code < 300) summary.statusCodes['2xx']++;
        else if (code >= 300 && code < 400) summary.statusCodes['3xx']++;
        else if (code >= 400 && code < 500) summary.statusCodes['4xx']++;
        else if (code >= 500 && code < 600) summary.statusCodes['5xx']++;
        else summary.statusCodes.other++;

        if (r['Indexability'] === 'Indexable') summary.indexableCount++;
        else if (r['Indexability'] === 'Non-Indexable') summary.nonIndexableCount++;

        // Titles
        const title = r['Title 1'] || '';
        if (!title) summary.missingTitles++;
        else titleMap.set(title, (titleMap.get(title) || 0) + 1);

        // Descriptions
        const desc = r['Meta Description 1'] || '';
        if (!desc) summary.missingDescriptions++;
        else descMap.set(desc, (descMap.get(desc) || 0) + 1);

        // H1
        const h1 = r['H1-1'] || '';
        if (!h1) summary.missingH1++;
        else h1Map.set(h1, (h1Map.get(h1) || 0) + 1);

        // Canonicals
        if (!r['Canonical Link Element 1']) summary.missingCanonicals++;

        // Response time
        const respTime = parseFloat(r['Response Time']);
        if (!isNaN(respTime)) {
          totalResponseTime += respTime;
          respTimeCount++;
        }

        // Word count
        const words = parseInt(r['Word Count'], 10);
        if (!isNaN(words)) {
          totalWords += words;
          wordCountItems++;
        }
      }

      for (const [, count] of titleMap) if (count > 1) summary.duplicateTitles += count;
      for (const [, count] of descMap) if (count > 1) summary.duplicateDescriptions += count;
      for (const [, count] of h1Map) if (count > 1) summary.duplicateH1 += count;

      summary.avgResponseTimeSec = respTimeCount > 0 ? parseFloat((totalResponseTime / respTimeCount).toFixed(3)) : 0;
      summary.avgWordCount = wordCountItems > 0 ? Math.round(totalWords / wordCountItems) : 0;

      summary.sampleUrls = parsed.rows.slice(0, 25).map(r => ({
        url: r['Address'],
        statusCode: r['Status Code'],
        title: r['Title 1'],
        h1: r['H1-1'],
        indexable: r['Indexability'],
        wordCount: r['Word Count'],
        responseTime: r['Response Time']
      }));
    }
  }

  return { success: true, ...summary };
}

/**
 * Execute a Screaming Frog headless crawl
 */
export async function runHeadlessCrawl({
  target = 'https://example.com',
  mode = 'spider',
  exportTabs = ['Internal:All', 'Response Codes:All', 'Page Titles:All', 'Meta Description:All', 'H1:All', 'Canonicals:All'],
  createSitemap = false,
  crawlId = null,
  timeoutMs = 180000
} = {}) {
  const binary = findScreamingFrogBinary();
  if (!binary) {
    throw new Error('Screaming Frog SEO Spider CLI executable not found on this system.');
  }

  const id = crawlId || `sf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const outputDir = path.join(CRAWL_STORAGE_DIR, id);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const { args, fullCommand } = buildScreamingFrogCommand({
    target,
    mode,
    outputFolder: outputDir,
    exportTabs,
    createSitemap,
    overwrite: true
  });

  const job = {
    id,
    target,
    mode,
    outputDir,
    command: fullCommand,
    status: 'RUNNING',
    startedAt: new Date().toISOString(),
    completedAt: null,
    progress: 'Initiating crawl process...',
    exitCode: null,
    logs: [],
    summary: null
  };

  crawlJobs.set(id, job);

  return new Promise((resolve, reject) => {
    try {
      const child = spawn(binary, args, {
        windowsHide: true
      });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        job.status = 'TIMEOUT';
        job.completedAt = new Date().toISOString();
        reject(new Error(`Crawl timed out after ${timeoutMs / 1000}s`));
      }, timeoutMs);

      child.stdout.on('data', (data) => {
        const text = data.toString();
        job.logs.push(text);
        if (text.includes('SpiderProgress')) {
          const match = text.match(/mCompleted=(\d+%)/);
          if (match) job.progress = `Crawling: ${match[1]}`;
        }
      });

      child.stderr.on('data', (data) => {
        job.logs.push(`[stderr] ${data.toString()}`);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        job.exitCode = code;
        job.completedAt = new Date().toISOString();

        if (code === 0) {
          job.status = 'COMPLETED';
          job.progress = 'Crawl completed successfully';
          try {
            job.summary = getScreamingFrogCrawlSummary(outputDir);
          } catch {
            // Ignore summary generation errors
          }
          resolve({
            success: true,
            jobId: id,
            target,
            mode,
            outputDir,
            command: fullCommand,
            summary: job.summary
          });
        } else {
          job.status = 'FAILED';
          job.progress = `Crawl failed with exit code ${code}`;
          resolve({
            success: false,
            jobId: id,
            target,
            exitCode: code,
            error: `Screaming Frog exited with code ${code}`,
            logs: job.logs.slice(-20)
          });
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        job.status = 'ERROR';
        job.completedAt = new Date().toISOString();
        job.error = err.message;
        reject(err);
      });
    } catch (err) {
      job.status = 'ERROR';
      reject(err);
    }
  });
}

/**
 * List past Screaming Frog crawl jobs
 */
export function listScreamingFrogCrawls() {
  const jobs = Array.from(crawlJobs.values()).map(j => ({
    id: j.id,
    target: j.target,
    mode: j.mode,
    status: j.status,
    startedAt: j.startedAt,
    completedAt: j.completedAt,
    totalUrls: j.summary?.totalUrls || 0,
    outputDir: j.outputDir
  }));

  // Also discover any saved directories in CRAWL_STORAGE_DIR
  if (fs.existsSync(CRAWL_STORAGE_DIR)) {
    try {
      const dirs = fs.readdirSync(CRAWL_STORAGE_DIR);
      for (const d of dirs) {
        if (!crawlJobs.has(d)) {
          const dirPath = path.join(CRAWL_STORAGE_DIR, d);
          if (fs.statSync(dirPath).isDirectory()) {
            jobs.push({
              id: d,
              target: 'Stored Crawl',
              mode: 'spider',
              status: 'COMPLETED',
              startedAt: null,
              completedAt: fs.statSync(dirPath).mtime.toISOString(),
              totalUrls: 0,
              outputDir: dirPath
            });
          }
        }
      }
    } catch {
      // Ignore directory scan errors
    }
  }

  return {
    success: true,
    count: jobs.length,
    crawls: jobs
  };
}

/**
 * Get detailed crawl results by ID
 */
export function getScreamingFrogCrawlById(id) {
  if (crawlJobs.has(id)) {
    const job = crawlJobs.get(id);
    if (!job.summary && fs.existsSync(job.outputDir)) {
      job.summary = getScreamingFrogCrawlSummary(job.outputDir);
    }
    return { success: true, crawl: job };
  }

  const dirPath = path.join(CRAWL_STORAGE_DIR, id);
  if (fs.existsSync(dirPath)) {
    const summary = getScreamingFrogCrawlSummary(dirPath);
    return {
      success: true,
      crawl: {
        id,
        target: 'Stored Crawl',
        status: 'COMPLETED',
        outputDir: dirPath,
        summary
      }
    };
  }

  return { success: false, error: `Crawl ID "${id}" not found` };
}
