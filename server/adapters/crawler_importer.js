/**
 * Universal Multi-Tool Crawl & Rank Importer
 * Ingests and normalizes exports from:
 * 1. Open SEO Crawler (CSV / JSON / XLSX)
 * 2. LibreCrawl (CSV / JSON)
 * 3. Screaming Frog SEO Spider (CSV)
 * 4. SerpBear (JSON / CSV)
 */

export function parseCsvRows(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  // Simple CSV split handling basic quotes
  const parseLine = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]).map(v => v.replace(/^["']|["']$/g, '').trim());
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    rows.push(obj);
  }
  return rows;
}

export function importExternalCrawlData(payload) {
  let format = 'unknown';
  let rawData = payload;

  if (typeof payload === 'string') {
    try {
      rawData = JSON.parse(payload);
    } catch {
      // It's CSV text
      rawData = parseCsvRows(payload);
      format = 'csv';
    }
  }

  // Detect cleven12/seo_optimizer JSON report
  if (rawData && rawData.meta && (rawData.keyword_analysis || rawData.geo_analysis || rawData.technical_seo)) {
    const url = rawData.meta.url || '';
    const issuesList = [];
    (rawData.top_recommendations || []).forEach(r => {
      issuesList.push({ type: 'Content Optimization', severity: 'P1 - High', recommendation: r });
    });
    if (rawData.technical_seo?.recommendations) {
      rawData.technical_seo.recommendations.forEach(r => issuesList.push({ type: 'Technical SEO', severity: 'P1 - High', recommendation: r }));
    }
    if (rawData.geo_analysis?.recommendations) {
      rawData.geo_analysis.recommendations.forEach(r => issuesList.push({ type: 'Generative Engine Optimization (GEO)', severity: 'P0 - Critical', recommendation: r }));
    }

    return {
      success: true,
      sourceTool: 'SEO Analyzer (cleven12/seo_optimizer)',
      type: 'page_audit',
      overallScore: rawData.overall_score || 0,
      targetUrl: url,
      geoAnalysis: rawData.geo_analysis || null,
      keywords: rawData.keyword_analysis?.individual_keywords || [],
      issuesCount: issuesList.length,
      issuesList
    };
  }

  // Detect SerpBear export
  if (Array.isArray(rawData) && rawData.some(r => r.keyword || r.position)) {
    return {
      success: true,
      sourceTool: 'SerpBear',
      type: 'rank_tracking',
      totalKeywords: rawData.length,
      keywords: rawData.map(r => ({
        keyword: r.keyword || r['keyword'] || 'keyword',
        position: parseInt(r.position || r['position'] || 0, 10),
        previousPosition: parseInt(r.previousPosition || r['previousposition'] || r.position || 0, 10),
        url: r.url || r['url'] || '',
        device: r.device || 'desktop',
        country: r.country || 'US',
        updatedAt: r.updatedAt || new Date().toISOString()
      }))
    };
  }

  // Detect Screaming Frog CSV
  if (Array.isArray(rawData) && rawData.some(r => r['address'] !== undefined || r['title 1'] !== undefined)) {
    format = 'Screaming Frog SEO Spider';
    const pages = rawData.map(r => {
      const url = r['address'] || r['url'] || '';
      const status = parseInt(r['status code'] || r['status'] || 200, 10);
      const title = r['title 1'] || r['title'] || '';
      const meta = r['meta description 1'] || r['meta description'] || '';
      const h1 = r['h1-1'] || r['h1'] || '';
      const canonical = r['canonical link element 1'] || r['canonical'] || '';

      const issuesList = [];
      if (!title) issuesList.push({ type: 'Missing Page Title', severity: 'P0 - Critical', recommendation: 'Add a descriptive <title> tag.' });
      if (title.length > 60) issuesList.push({ type: 'Title Too Long', severity: 'P2 - Warning', recommendation: 'Keep title under 60 characters.' });
      if (!meta) issuesList.push({ type: 'Missing Meta Description', severity: 'P1 - High', recommendation: 'Add meta description between 120-155 chars.' });
      if (!h1) issuesList.push({ type: 'Missing H1 Heading', severity: 'P0 - Critical', recommendation: 'Add a clear primary <h1> heading.' });
      if (!canonical) issuesList.push({ type: 'Missing Canonical Tag', severity: 'P1 - High', recommendation: 'Add <link rel="canonical"> to avoid duplicate content.' });

      return {
        url,
        status,
        title,
        metaDescription: meta,
        h1,
        canonical,
        issuesCount: issuesList.length,
        issuesList
      };
    });

    return {
      success: true,
      sourceTool: format,
      type: 'crawler_audit',
      pagesCrawled: pages.length,
      totalIssues: pages.reduce((acc, p) => acc + p.issuesCount, 0),
      crawledPages: pages
    };
  }

  // Detect Open SEO Crawler or LibreCrawl
  if (Array.isArray(rawData) || (rawData && rawData.results) || (rawData && rawData.crawledPages)) {
    const list = Array.isArray(rawData) ? rawData : (rawData.results || rawData.crawledPages || []);
    const sourceTool = rawData.source || (list.some(r => r.meta_len !== undefined) ? 'Open SEO Crawler' : 'LibreCrawl');

    const pages = list.map(r => {
      const url = r.url || r['url'] || '';
      const status = parseInt(r.status_code || r.status || r['status code'] || 200, 10);
      const title = r.title || r['title'] || '';
      const meta = r.meta_description || r.meta || r['meta description'] || '';
      const h1 = r.h1 || r['h1'] || '';
      const canonical = r.canonical || r['canonical'] || '';

      const issuesList = [];
      if (!title) issuesList.push({ type: 'Missing Page Title', severity: 'P0 - Critical', recommendation: 'Add a descriptive <title> tag.' });
      if (title.length > 60) issuesList.push({ type: 'Title Too Long', severity: 'P2 - Warning', recommendation: 'Keep title under 60 characters.' });
      if (!meta) issuesList.push({ type: 'Missing Meta Description', severity: 'P1 - High', recommendation: 'Add meta description between 120-155 chars.' });
      if (!h1) issuesList.push({ type: 'Missing H1 Heading', severity: 'P0 - Critical', recommendation: 'Add a clear primary <h1> heading.' });

      return {
        url,
        status,
        title,
        metaDescription: meta,
        h1,
        canonical,
        issuesCount: issuesList.length,
        issuesList
      };
    });

    return {
      success: true,
      sourceTool,
      type: 'crawler_audit',
      pagesCrawled: pages.length,
      totalIssues: pages.reduce((acc, p) => acc + p.issuesCount, 0),
      crawledPages: pages
    };
  }

  throw new Error('Unsupported crawl export format. Supported formats: Open SEO Crawler CSV/JSON, LibreCrawl JSON/CSV, Screaming Frog CSV, SerpBear JSON.');
}
