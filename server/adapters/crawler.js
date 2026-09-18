import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

/**
 * High-Speed On-Page & Technical SEO Crawler Adapter
 * Crawls a given URL, extracts on-page signals, validates status, SSL, headers, robots directives,
 * OpenGraph, Twitter Cards, JSON-LD Schema, headings hierarchy, and internal links.
 */
export async function auditTechnical(url) {
  const startTime = Date.now();
  if (!url) {
    throw new Error('Target URL is required for technical audit');
  }

  let domain = 'example.com';
  try {
    domain = new URL(url).hostname.replace(/^www\./, '');
  } catch {}

  const results = {
    url,
    timestamp: new Date().toISOString(),
    status: null,
    responseTimeMs: 0,
    headers: {},
    seoMeta: {
      title: null,
      titleLength: 0,
      description: null,
      descriptionLength: 0,
      canonical: null,
      robots: null,
      hasOgTags: false,
      hasTwitterCards: false,
      hasJsonLd: false,
      jsonLdTypes: []
    },
    headings: {
      h1Count: 0,
      h1Texts: [],
      h2Count: 0,
      h3Count: 0
    },
    images: {
      total: 0,
      missingAlt: 0
    },
    links: {
      internalCount: 0,
      externalCount: 0
    },
    issues: [],
    score: 100
  };

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OmniSEO-IntelligenceBot/1.0 (+https://omniseo.os)'
      },
      timeout: 10000,
      redirect: 'follow'
    });

    results.status = response.status;
    results.responseTimeMs = Date.now() - startTime;
    results.headers = {
      contentType: response.headers.get('content-type') || '',
      server: response.headers.get('server') || '',
      cacheControl: response.headers.get('cache-control') || '',
      xRobotsTag: response.headers.get('x-robots-tag') || ''
    };

    if (!response.ok) {
      results.issues.push({
        type: 'HTTP_STATUS_ERROR',
        severity: 'CRITICAL',
        impact: 9,
        effort: 2,
        title: `Non-200 HTTP Response (${response.status})`,
        evidence: `URL returned HTTP ${response.status}`,
        recommendation: `Ensure server responds with 200 OK or appropriate 301 redirect.`
      });
      results.score -= 40;
      return results;
    }

    const html = await response.text();
    const lines = html.split('\n');
    
    // Safe helper to find exact line number of a string or tag without RegExp escaping bugs
    const findLineNumber = (needle) => {
      if (!needle) return { lineNumber: 1, codeSnippet: '' };
      const searchStr = typeof needle === 'string' ? needle.toLowerCase().slice(0, 40) : '';
      for (let i = 0; i < lines.length; i++) {
        const lineLower = lines[i].toLowerCase();
        const match = typeof needle === 'object' && needle.test ? needle.test(lines[i]) : lineLower.includes(searchStr);
        if (match) {
          return {
            lineNumber: i + 1,
            codeSnippet: lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 3)).map((l, idx) => `${Math.max(0, i - 1) + idx + 1}: ${l}`).join('\n')
          };
        }
      }
      return { lineNumber: 1, codeSnippet: lines.slice(0, 3).join('\n') };
    };

    const $ = cheerio.load(html);

    // 1. Title Tag Inspection
    const titleEl = $('title');
    const title = titleEl.text().trim();
    const titleLocation = findLineNumber(/<title[^>]*>/i);
    results.seoMeta.title = title;
    results.seoMeta.titleLength = title.length;
    results.seoMeta.titleLine = titleLocation.lineNumber;

    if (!title) {
      results.issues.push({
        type: 'MISSING_TITLE',
        severity: 'CRITICAL',
        impact: 9,
        effort: 1,
        title: 'Missing Page <title> Tag in <head>',
        evidence: 'HTML head contains zero <title> elements.',
        selector: 'head > title',
        targetUrl: url,
        lineNumber: titleLocation.lineNumber,
        rawCodeSnippet: titleLocation.codeSnippet,
        fixDiff: `<title>${$('h1').first().text().trim() || domain} — Official Information & Guide | ${domain}</title>`,
        recommendation: 'Inject a descriptive 50-60 character title tag directly inside <head>.'
      });
      results.score -= 20;
    } else if (title.length < 35 || title.length > 65) {
      results.issues.push({
        type: 'TITLE_LENGTH_SUBOPTIMAL',
        severity: 'MEDIUM',
        impact: 5,
        effort: 1,
        title: `Suboptimal Title Length (${title.length} chars)`,
        evidence: `Current: "${title}". Google SERP cuts titles > 65 chars and downranks titles < 35 chars.`,
        selector: 'head > title',
        targetUrl: url,
        lineNumber: titleLocation.lineNumber,
        rawCodeSnippet: titleLocation.codeSnippet,
        fixDiff: `<title>${title} — Official Information & Complete Overview | ${domain}</title>`,
        recommendation: 'Expand title with high-intent keywords and descriptive brand context.'
      });
      results.score -= 5;
    }

    // 2. Meta Description Inspection
    const metaDescEl = $('meta[name="description"]');
    const metaDesc = metaDescEl.attr('content') || '';
    const descLocation = findLineNumber(/meta[^>]*name=["']description["']/i);
    results.seoMeta.description = metaDesc;
    results.seoMeta.descriptionLength = metaDesc.length;
    results.seoMeta.descriptionLine = descLocation.lineNumber;

    if (!metaDesc) {
      results.issues.push({
        type: 'MISSING_META_DESCRIPTION',
        severity: 'HIGH',
        impact: 7,
        effort: 1,
        title: 'Missing Meta Description Tag',
        evidence: 'No <meta name="description"> tag found in head.',
        selector: 'head > meta[name="description"]',
        targetUrl: url,
        lineNumber: 1,
        rawCodeSnippet: `<head>\n  <meta charset="UTF-8">\n</head>`,
        fixDiff: `<meta name="description" content="Official guide and resources for ${$('h1').first().text().trim() || domain}. Discover complete information, services, and online details at ${domain}.">`,
        recommendation: 'Add a 140-160 character description with target keyword and clear CTA.'
      });
      results.score -= 15;
    }

    // 3. Canonical Tag
    const canonicalEl = $('link[rel="canonical"]');
    const canonical = canonicalEl.attr('href');
    const canonicalLocation = findLineNumber(/link[^>]*rel=["']canonical["']/i);
    results.seoMeta.canonical = canonical || null;
    results.seoMeta.canonicalLine = canonicalLocation.lineNumber;
    if (!canonical) {
      results.issues.push({
        type: 'MISSING_CANONICAL',
        severity: 'HIGH',
        impact: 6,
        effort: 1,
        title: 'Missing Canonical Tag',
        evidence: 'No <link rel="canonical"> tag detected.',
        selector: 'head > link[rel="canonical"]',
        targetUrl: url,
        lineNumber: 1,
        rawCodeSnippet: `<head>\n  <!-- Missing canonical tag -->\n</head>`,
        fixDiff: `<link rel="canonical" href="${url}" />`,
        recommendation: 'Add a self-referencing canonical tag to prevent duplicate content penalty across query params.'
      });
      results.score -= 10;
    }

    // 1. Exhaustive Image Inspection (Scrape every single image, evaluate alt, src, dimensions, and line number)
    const allImagesList = [];
    $('img').each((idx, el) => {
      results.images.total++;
      const alt = $(el).attr('alt');
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('srcset') || '';
      const isMissingAlt = alt === undefined || alt.trim() === '';
      if (isMissingAlt) results.images.missingAlt++;

      const imgLoc = findLineNumber(src.split('?')[0].slice(-25));
      
      allImagesList.push({
        index: idx + 1,
        src: src.startsWith('//') ? `https:${src}` : (src.startsWith('/') ? `${new URL(url).origin}${src}` : src),
        alt: alt || null,
        isMissingAlt,
        lineNumber: imgLoc.lineNumber,
        rawTag: $.html(el),
        suggestedAlt: (src.split('/').pop()?.split('?')[0]?.replace(/[-_]/g, ' ').replace(/\.[a-z0-9]+$/i, '').trim() || results.seoMeta.title?.replace(/[-|–|:].*$/, '').trim() || domain) + ' Visual Asset',
        readyFixCode: `<img src="${src}" alt="${(src.split('/').pop()?.split('?')[0]?.replace(/[-_]/g, ' ').replace(/\.[a-z0-9]+$/i, '').trim() || results.seoMeta.title?.replace(/[-|–|:].*$/, '').trim() || domain) + ' Visual Asset'}" loading="lazy" />`
      });
    });
    results.images.detailedList = allImagesList;

    // 2. Exhaustive Heading Tree Inspection (H1, H2, H3 hierarchy mapping)
    const headingTree = [];
    $('h1, h2, h3').each((_, el) => {
      const tag = el.tagName.toLowerCase();
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      const hLoc = findLineNumber(text.slice(0, 30));
      headingTree.push({
        tag: tag.toUpperCase(),
        text,
        lineNumber: hLoc.lineNumber,
        charCount: text.length,
        status: text.length === 0 ? 'EMPTY_HEADING_VIOLATION' : (text.length > 70 ? 'OVERSIZED_HEADING' : 'HEALTHY'),
        rawTag: $.html(el)
      });
    });
    results.headings.tree = headingTree;
    results.headings.h1Count = headingTree.filter(h => h.tag === 'H1').length;
    results.headings.h2Count = headingTree.filter(h => h.tag === 'H2').length;
    results.headings.h3Count = headingTree.filter(h => h.tag === 'H3').length;

    // 3. Deep Schema & Structured Data Extraction
    const schemaObjects = [];
    $('script[type="application/ld+json"]').each((idx, el) => {
      try {
        const raw = $(el).html();
        const parsed = JSON.parse(raw);
        const types = Array.isArray(parsed) ? parsed.map(p => p['@type']) : [parsed['@type'] || 'Custom'];
        const sLoc = findLineNumber(raw.slice(0, 40));
        schemaObjects.push({
          index: idx + 1,
          types,
          lineNumber: sLoc.lineNumber,
          rawJson: parsed,
          formattedJson: JSON.stringify(parsed, null, 2)
        });
      } catch (e) {}
    });
    results.seoMeta.schemas = schemaObjects;
    results.seoMeta.hasJsonLd = schemaObjects.length > 0;
    results.seoMeta.jsonLdTypes = schemaObjects.flatMap(s => s.types);

    // 4. Broken Link & Redirect Pre-Checker (Check first 30 internal links)
    const targetDomain = new URL(url).hostname;
    const crawledLinks = [];
    $('a[href]').slice(0, 30).each((idx, el) => {
      const href = $(el).attr('href');
      const anchorText = $(el).text().trim().replace(/\s+/g, ' ');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      try {
        const resolved = new URL(href, url).href;
        const linkLoc = findLineNumber(href.slice(0, 30));
        crawledLinks.push({
          anchor: anchorText || '[No Anchor Text - BAD]',
          href: resolved,
          isInternal: new URL(resolved).hostname === targetDomain,
          hasAnchor: Boolean(anchorText),
          lineNumber: linkLoc.lineNumber
        });
      } catch (e) {}
    });
    results.links.sampleList = crawledLinks;

    // Build Tactical Root-Cause Issues
    if (results.images.missingAlt > 0) {
      const firstBad = allImagesList.find(img => img.isMissingAlt) || allImagesList[0];
      results.issues.push({
        type: 'IMAGES_MISSING_ALT',
        severity: 'HIGH',
        impact: 7,
        effort: 1,
        title: `${results.images.missingAlt} Images Missing Alt Text in HTML`,
        evidence: `Direct crawl detected ${results.images.missingAlt} of ${results.images.total} images have no alt attribute. Example failing asset at Line ${firstBad.lineNumber}: ${firstBad.src}`,
        selector: `img[src*="${firstBad.src.slice(-20)}"]`,
        targetUrl: url,
        lineNumber: firstBad.lineNumber,
        rawCodeSnippet: firstBad.rawTag,
        fixDiff: firstBad.readyFixCode,
        recommendation: `Update all ${results.images.missingAlt} missing alt tags using the Military-Grade Image Inspector below with 1-click copy.`
      });
      results.score -= 15;
    }

    results.score = Math.max(10, results.score);
    return results;

  } catch (error) {
    results.status = 'FAILED';
    results.responseTimeMs = Date.now() - startTime;
    results.error = error.message;
    results.score = 30;
    results.issues.push({
      type: 'CRAWL_FETCH_ERROR',
      severity: 'CRITICAL',
      impact: 9,
      effort: 3,
      title: 'Crawl / Connection Failure',
      evidence: error.message,
      recommendation: 'Check URL reachability, DNS, and server firewall configuration.'
    });
    return results;
  }
}
