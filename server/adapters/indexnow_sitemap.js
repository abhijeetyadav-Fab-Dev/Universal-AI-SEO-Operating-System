import crypto from 'crypto';
import zlib from 'zlib';

// Use platform-native globalThis.fetch with optional node-fetch fallback
let platformFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch : null;
if (!platformFetch) {
  try {
    const mod = await import('node-fetch');
    platformFetch = mod.default || mod;
  } catch {}
}

// Optional Cheerio fallback for malformed XML
let cheerioLib = null;
try {
  cheerioLib = await import('cheerio');
} catch {}

const DEFAULT_UA = 'OmniSEO-OS/2.0 (IndexNow Dispatcher & Streaming XML Sitemap Parser; +https://universal-ai-seo-operating-system.onrender.com)';

export const INDEXNOW_ENDPOINTS = {
  indexnow: 'https://api.indexnow.org/indexnow',
  bing: 'https://www.bing.com/indexnow',
  yandex: 'https://yandex.com/indexnow',
  seznam: 'https://search.seznam.cz/indexnow'
};

/**
 * 1. IndexNow Key Generator
 * Generates standard 32-character hexadecimal key according to IndexNow Protocol specification.
 * Specification: Key must be 8 to 128 hexadecimal characters (standard length: 32 hex chars).
 */
export function generateIndexNowKey() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Normalizes URL for canonical comparison (strips fragments, normalizes trailing slashes and casing)
 */
export function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    let pathname = (parsed.pathname || '/').toLowerCase();
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.searchParams.sort();
    const search = parsed.searchParams.toString() ? `?${parsed.searchParams.toString()}` : '';
    return `${parsed.protocol.toLowerCase()}//${parsed.hostname.toLowerCase()}${parsed.port ? `:${parsed.port}` : ''}${pathname}${search}`;
  } catch {
    return trimmed.replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * 2. IndexNow Batch Dispatcher
 * Submits batch URLs to IndexNow API (api.indexnow.org, Bing, Yandex, etc.)
 * Returns HTTP status code and an immutable submission receipt.
 *
 * @param {Object} params
 * @param {string} params.host Domain hostname (e.g. "example.com")
 * @param {string} params.key 32-char hex key
 * @param {string} [params.keyLocation] Optional full URL to key file (e.g. "https://example.com/key.txt")
 * @param {string[]|string} params.urlList Array of URLs to index
 * @param {string} [params.endpoint] IndexNow endpoint URL or alias ('indexnow', 'bing', 'yandex', 'seznam')
 * @param {Function} [params.fetchFn] Optional custom fetch implementation (for testing/mocking)
 */
export async function submitToIndexNow({
  host,
  key,
  keyLocation,
  urlList = [],
  endpoint = INDEXNOW_ENDPOINTS.indexnow,
  fetchFn = null
} = {}) {
  // Normalize URL list
  const rawList = Array.isArray(urlList) ? urlList : [urlList];
  const urls = rawList
    .map(item => (typeof item === 'string' ? item : item?.loc || item?.url))
    .filter(Boolean)
    .map(u => String(u).trim());

  if (urls.length === 0) {
    return {
      success: false,
      status: 400,
      statusText: 'Bad Request',
      error: 'urlList must contain at least one valid URL string',
      receipt: null
    };
  }

  // Determine and sanitize host
  let cleanHost = host;
  if (!cleanHost && urls.length > 0) {
    try {
      cleanHost = new URL(urls[0]).hostname;
    } catch {}
  }
  if (cleanHost) {
    try {
      if (cleanHost.includes('://')) {
        cleanHost = new URL(cleanHost).hostname;
      } else {
        cleanHost = cleanHost.replace(/\/.*$/, '').replace(/:\d+$/, '');
      }
    } catch {}
  }

  // Resolve target endpoint
  const targetEndpoint = INDEXNOW_ENDPOINTS[String(endpoint).toLowerCase()] || endpoint || INDEXNOW_ENDPOINTS.indexnow;

  // Ensure key is present
  const submissionKey = key || generateIndexNowKey();

  // Construct IndexNow RFC compliant JSON payload
  const payload = {
    host: cleanHost,
    key: submissionKey,
    ...(keyLocation ? { keyLocation } : {}),
    urlList: urls
  };

  const doFetch = fetchFn || platformFetch || globalThis.fetch;

  try {
    const response = await doFetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': DEFAULT_UA
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    const isSuccess = response.status === 200 || response.status === 202;
    const receipt = {
      receiptId: `idx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      submittedAt: new Date().toISOString(),
      endpoint: targetEndpoint,
      host: cleanHost,
      key: submissionKey,
      keyLocation: keyLocation || (cleanHost ? `https://${cleanHost}/${submissionKey}.txt` : null),
      urlCount: urls.length,
      httpStatus: response.status,
      httpStatusText: response.statusText,
      payload
    };

    return {
      success: isSuccess,
      status: response.status,
      statusText: response.statusText,
      endpoint: targetEndpoint,
      urlCount: urls.length,
      receipt,
      error: isSuccess ? null : `IndexNow returned HTTP ${response.status}: ${response.statusText}`
    };
  } catch (err) {
    return {
      success: false,
      status: 0,
      statusText: 'Network Error',
      endpoint: targetEndpoint,
      urlCount: urls.length,
      receipt: null,
      error: err.message
    };
  }
}

/**
 * Unzips buffer if compressed with gzip magic bytes (0x1f, 0x8b) or zlib deflate
 */
export function decompressIfNeeded(buffer) {
  if (!buffer || buffer.length === 0) return '';
  if (Buffer.isBuffer(buffer) || buffer instanceof Uint8Array) {
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
      try {
        return zlib.gunzipSync(buf).toString('utf-8');
      } catch {
        return zlib.unzipSync(buf).toString('utf-8');
      }
    }
    return buf.toString('utf-8');
  }
  return String(buffer);
}

/**
 * Cleans XML CDATA and entity escaping
 */
function cleanTagContent(raw) {
  if (!raw) return '';
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

/**
 * High-performance XML parser for standard sitemap.xml and sitemap_index.xml
 * Supports CDATA, namespaces, and extracts <loc>, <lastmod>, <priority>, <changefreq>.
 *
 * @param {string|Buffer} xmlContent
 * @param {Object} [options]
 * @param {number} [options.maxUrls=5000]
 * @returns {{ isIndex: boolean, subSitemaps: Array<{loc: string, lastmod: string|null}>, urls: Array<{loc: string, lastmod: string|null, priority: number|null}> }}
 */
export function parseSitemapXml(xmlContent, { maxUrls = 5000 } = {}) {
  const text = typeof xmlContent === 'string' ? xmlContent : decompressIfNeeded(xmlContent);
  if (!text || typeof text !== 'string') {
    return { isIndex: false, subSitemaps: [], urls: [] };
  }

  // Detect index sitemap vs urlset
  const isIndex = /<sitemapindex[\s>]/i.test(text) || (/<sitemap[\s>]/i.test(text) && !/<urlset[\s>]/i.test(text));

  if (isIndex) {
    const subSitemaps = [];
    const sitemapRegex = /<sitemap[\s>]([\s\S]*?)<\/sitemap>/gi;
    let match;
    while ((match = sitemapRegex.exec(text)) !== null) {
      const block = match[1];
      const locMatch = /<loc>([\s\S]*?)<\/loc>/i.exec(block);
      if (locMatch) {
        const loc = cleanTagContent(locMatch[1]);
        const lastmodMatch = /<lastmod>([\s\S]*?)<\/lastmod>/i.exec(block);
        const lastmod = lastmodMatch ? cleanTagContent(lastmodMatch[1]) : null;
        if (loc) {
          subSitemaps.push({ loc, lastmod });
        }
      }
    }
    return { isIndex: true, subSitemaps, urls: [] };
  }

  // Standard <urlset>
  const urls = [];
  const urlRegex = /<url[\s>]([\s\S]*?)<\/url>/gi;
  let match;
  while ((match = urlRegex.exec(text)) !== null && urls.length < maxUrls) {
    const block = match[1];
    const locMatch = /<loc>([\s\S]*?)<\/loc>/i.exec(block);
    if (!locMatch) continue;

    const loc = cleanTagContent(locMatch[1]);
    if (!loc) continue;

    const lastmodMatch = /<lastmod>([\s\S]*?)<\/lastmod>/i.exec(block);
    const priorityMatch = /<priority>([\s\S]*?)<\/priority>/i.exec(block);
    const changefreqMatch = /<changefreq>([\s\S]*?)<\/changefreq>/i.exec(block);

    const lastmod = lastmodMatch ? cleanTagContent(lastmodMatch[1]) : null;
    const priorityStr = priorityMatch ? cleanTagContent(priorityMatch[1]) : null;
    const priority = priorityStr !== null && !isNaN(parseFloat(priorityStr)) ? parseFloat(priorityStr) : null;
    const changefreq = changefreqMatch ? cleanTagContent(changefreqMatch[1]) : null;

    urls.push({
      loc,
      lastmod,
      priority,
      ...(changefreq ? { changefreq } : {})
    });
  }

  // Fallback to Cheerio if regex captured 0 urls but <url> exists
  if (urls.length === 0 && !isIndex && /<url[\s>]/i.test(text) && cheerioLib) {
    try {
      const loadFn = cheerioLib.load || cheerioLib.default?.load;
      if (typeof loadFn === 'function') {
        const $ = loadFn(text, { xmlMode: true });
        $('url').each((_, el) => {
          if (urls.length >= maxUrls) return false;
          const loc = cleanTagContent($(el).find('loc').text());
          if (!loc) return;
          const lastmod = cleanTagContent($(el).find('lastmod').text()) || null;
          const priorityText = cleanTagContent($(el).find('priority').text());
          const priority = priorityText && !isNaN(parseFloat(priorityText)) ? parseFloat(priorityText) : null;
          const changefreq = cleanTagContent($(el).find('changefreq').text()) || null;
          urls.push({
            loc,
            lastmod,
            priority,
            ...(changefreq ? { changefreq } : {})
          });
        });
      }
    } catch {}
  }

  return { isIndex: false, subSitemaps: [], urls };
}

/**
 * 3. XML Sitemap Streaming Parser
 * Fetches and parses standard sitemap.xml, sitemap_index.xml (recursively traversing sub-sitemaps),
 * handling .gz compression if present, extracting <loc>, <lastmod>, <priority>.
 *
 * @param {string} sitemapUrl URL of sitemap, raw XML string, or data URI
 * @param {number} [maxUrls=5000] Maximum URLs to collect across all sub-sitemaps
 * @param {Object} [options]
 * @param {Function} [options.fetchFn] Custom fetch function (for unit testing / mock)
 * @param {number} [options.timeout=10000] Request timeout ms
 */
export async function fetchAndParseSitemap(sitemapUrl, maxUrls = 5000, options = {}) {
  const customFetch = options.fetchFn || platformFetch || globalThis.fetch;
  const timeoutMs = options.timeout || 10000;
  const visitedSitemaps = new Set();
  const queue = [sitemapUrl];
  const allUrls = [];
  const errors = [];
  let isIndexSitemap = false;

  while (queue.length > 0 && allUrls.length < maxUrls) {
    const currentUrl = queue.shift();
    if (!currentUrl || visitedSitemaps.has(currentUrl)) continue;
    visitedSitemaps.add(currentUrl);

    try {
      let xmlText = '';

      // Direct XML string support (for testing / mocking without network)
      const trimmed = String(currentUrl).trim();
      if (trimmed.startsWith('<') || trimmed.startsWith('<?xml')) {
        xmlText = trimmed;
      } else if (trimmed.startsWith('data:')) {
        const base64Part = trimmed.split(',')[1];
        const buf = Buffer.from(base64Part, 'base64');
        xmlText = decompressIfNeeded(buf);
      } else {
        const res = await customFetch(trimmed, {
          headers: {
            'User-Agent': DEFAULT_UA,
            'Accept': 'application/xml,text/xml,application/x-gzip,application/gzip,*/*'
          },
          signal: AbortSignal.timeout(timeoutMs)
        });

        if (!res.ok) {
          errors.push({ url: trimmed, error: `HTTP ${res.status}: ${res.statusText}` });
          continue;
        }

        let buffer;
        if (typeof res.buffer === 'function') {
          buffer = await res.buffer();
        } else if (typeof res.arrayBuffer === 'function') {
          const ab = await res.arrayBuffer();
          if (Buffer.isBuffer(ab)) {
            buffer = ab;
          } else if (ab instanceof Uint8Array) {
            buffer = Buffer.from(ab.buffer, ab.byteOffset, ab.byteLength);
          } else if (ab instanceof ArrayBuffer) {
            buffer = Buffer.from(ab);
          } else {
            buffer = Buffer.from(String(ab));
          }
        } else if (typeof res.text === 'function') {
          buffer = Buffer.from(await res.text(), 'utf-8');
        } else {
          buffer = Buffer.alloc(0);
        }

        xmlText = decompressIfNeeded(buffer);
      }

      const parsed = parseSitemapXml(xmlText, { maxUrls: maxUrls - allUrls.length });

      if (parsed.isIndex) {
        isIndexSitemap = true;
        for (const sub of parsed.subSitemaps) {
          if (!visitedSitemaps.has(sub.loc) && !queue.includes(sub.loc)) {
            queue.push(sub.loc);
          }
        }
      } else {
        for (const item of parsed.urls) {
          if (allUrls.length < maxUrls) {
            allUrls.push(item);
          } else {
            break;
          }
        }
      }
    } catch (err) {
      errors.push({ url: currentUrl, error: err.message });
    }
  }

  return {
    success: errors.length === 0 || allUrls.length > 0,
    sitemapUrl,
    type: isIndexSitemap ? 'sitemap_index' : 'sitemap',
    isIndex: isIndexSitemap,
    totalUrls: allUrls.length,
    subSitemapsParsed: visitedSitemaps.size,
    subSitemaps: Array.from(visitedSitemaps),
    urls: allUrls,
    errors
  };
}

/**
 * Normalizes input list into an array of URL strings
 */
function extractRawUrls(input) {
  if (!input) return [];
  if (input instanceof Set) return Array.from(input);
  if (Array.isArray(input)) return input;
  if (typeof input === 'object') {
    if (Array.isArray(input.urls)) return input.urls;
    if (Array.isArray(input.crawledPages)) return input.crawledPages;
    if (Array.isArray(input.links)) return input.links;
  }
  if (typeof input === 'string') return [input];
  return [];
}

/**
 * 4. Orphan Page & Unindexed URL Detector
 * Cross-references internal crawled link graph against sitemap URLs:
 * - orphans: URLs listed in sitemap but never linked internally in crawled pages.
 * - unindexed: URLs found via internal crawling but missing from the XML sitemap.
 * - coverageRatio: percentage of site mapped.
 *
 * @param {string[]|Object[]} crawledUrls URLs found during internal crawl
 * @param {string[]|Object[]} sitemapUrls URLs found in XML sitemap
 */
export function detectOrphanPages(crawledUrls, sitemapUrls) {
  const rawCrawled = extractRawUrls(crawledUrls);
  const rawSitemap = extractRawUrls(sitemapUrls);

  const crawledMap = new Map(); // normalized -> original
  const sitemapMap = new Map(); // normalized -> original

  for (const item of rawCrawled) {
    const str = typeof item === 'string' ? item : item?.url || item?.loc || item?.link || item?.href;
    if (!str) continue;
    const norm = normalizeUrl(str);
    if (norm && !crawledMap.has(norm)) {
      crawledMap.set(norm, str);
    }
  }

  for (const item of rawSitemap) {
    const str = typeof item === 'string' ? item : item?.loc || item?.url || item?.link || item?.href;
    if (!str) continue;
    const norm = normalizeUrl(str);
    if (norm && !sitemapMap.has(norm)) {
      sitemapMap.set(norm, str);
    }
  }

  const orphans = [];
  const unindexed = [];
  const matched = [];

  // Orphans: present in sitemap, but NEVER found during internal crawling
  for (const [norm, origUrl] of sitemapMap.entries()) {
    if (!crawledMap.has(norm)) {
      orphans.push(origUrl);
    } else {
      matched.push(origUrl);
    }
  }

  // Unindexed: crawled internally, but missing from sitemap
  for (const [norm, origUrl] of crawledMap.entries()) {
    if (!sitemapMap.has(norm)) {
      unindexed.push(origUrl);
    }
  }

  const totalCrawled = crawledMap.size;
  const totalSitemap = sitemapMap.size;

  // Percentage of site mapped = (Crawled URLs in Sitemap / Total Crawled URLs) * 100
  let coverageRatio = 0;
  if (totalCrawled > 0) {
    coverageRatio = Math.round((matched.length / totalCrawled) * 10000) / 100;
  } else if (totalSitemap > 0) {
    coverageRatio = 100;
  }

  return {
    orphans,
    unindexed,
    matched,
    totalCrawled,
    totalSitemap,
    coverageRatio,
    coverageRatioFormatted: `${coverageRatio}%`,
    coverageFraction: totalCrawled > 0 ? parseFloat((matched.length / totalCrawled).toFixed(4)) : 1,
    summary: {
      orphanCount: orphans.length,
      unindexedCount: unindexed.length,
      matchedCount: matched.length,
      coverageRatio
    }
  };
}
