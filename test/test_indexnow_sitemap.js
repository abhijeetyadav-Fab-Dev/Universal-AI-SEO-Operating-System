import assert from 'assert';
import zlib from 'zlib';
import {
  generateIndexNowKey,
  submitToIndexNow,
  fetchAndParseSitemap,
  parseSitemapXml,
  detectOrphanPages,
  normalizeUrl,
  decompressIfNeeded,
  INDEXNOW_ENDPOINTS
} from '../server/adapters/indexnow_sitemap.js';

console.log('================================================================');
console.log('🧪 RUNNING INDEXNOW & SITEMAP TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${testName}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${testName}`);
    console.error(err);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────
// 1. IndexNow Protocol Key Generation
// ─────────────────────────────────────────────────────────────
runTest('generateIndexNowKey() returns 32-character hexadecimal string', () => {
  const key = generateIndexNowKey();
  assert.strictEqual(typeof key, 'string', 'Key must be a string');
  assert.strictEqual(key.length, 32, 'Key length must be exactly 32 chars');
  assert.match(key, /^[0-9a-f]{32}$/, 'Key must be valid lowercase hex characters');
});

runTest('generateIndexNowKey() generates unique random keys without collision', () => {
  const keys = new Set();
  for (let i = 0; i < 100; i++) {
    keys.add(generateIndexNowKey());
  }
  assert.strictEqual(keys.size, 100, 'All 100 generated keys must be unique');
});

// ─────────────────────────────────────────────────────────────
// 2. IndexNow Submission Schema & Dispatcher
// ─────────────────────────────────────────────────────────────
await runAsyncTest('submitToIndexNow() constructs compliant payload and receives 200 receipt', async () => {
  let capturedUrl = '';
  let capturedOptions = null;

  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      status: 200,
      statusText: 'OK',
      ok: true,
      text: async () => 'OK'
    };
  };

  const key = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const res = await submitToIndexNow({
    host: 'https://example.com/subpage', // Should sanitize to example.com
    key,
    keyLocation: 'https://example.com/custom-key-loc.txt',
    urlList: ['https://example.com/p1', 'https://example.com/p2'],
    endpoint: 'bing',
    fetchFn: mockFetch
  });

  assert.strictEqual(capturedUrl, INDEXNOW_ENDPOINTS.bing, 'Should route alias "bing" to bing.com endpoint');
  assert.strictEqual(capturedOptions.method, 'POST');
  assert.strictEqual(capturedOptions.headers['Content-Type'], 'application/json; charset=utf-8');

  const sentBody = JSON.parse(capturedOptions.body);
  assert.strictEqual(sentBody.host, 'example.com', 'Host should be cleanly stripped of protocol and path');
  assert.strictEqual(sentBody.key, key);
  assert.strictEqual(sentBody.keyLocation, 'https://example.com/custom-key-loc.txt');
  assert.deepStrictEqual(sentBody.urlList, ['https://example.com/p1', 'https://example.com/p2']);

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.urlCount, 2);
  assert.ok(res.receipt, 'Receipt must be generated');
  assert.ok(res.receipt.receiptId.startsWith('idx_'));
  assert.strictEqual(res.receipt.httpStatus, 200);
  assert.strictEqual(res.receipt.key, key);
});

await runAsyncTest('submitToIndexNow() handles 202 Accepted status properly', async () => {
  const mockFetch = async () => ({
    status: 202,
    statusText: 'Accepted',
    ok: true,
    text: async () => 'Accepted'
  });

  const res = await submitToIndexNow({
    host: 'site.io',
    urlList: ['https://site.io/page'],
    fetchFn: mockFetch
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.status, 202);
  assert.strictEqual(res.receipt.httpStatus, 202);
});

await runAsyncTest('submitToIndexNow() rejects empty urlList with 400 Bad Request', async () => {
  const res = await submitToIndexNow({
    host: 'example.com',
    urlList: []
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.receipt, null);
});

await runAsyncTest('submitToIndexNow() handles upstream error status codes (e.g. 403 Forbidden)', async () => {
  const mockFetch = async () => ({
    status: 403,
    statusText: 'Forbidden',
    ok: false,
    text: async () => 'Key not found'
  });

  const res = await submitToIndexNow({
    host: 'example.com',
    urlList: ['https://example.com/p1'],
    fetchFn: mockFetch
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.status, 403);
  assert.ok(res.error.includes('403'));
});

// ─────────────────────────────────────────────────────────────
// 3. XML Sitemap Parsing, Decompression & Index Traversal
// ─────────────────────────────────────────────────────────────
runTest('parseSitemapXml() extracts <loc>, <lastmod>, <priority>, and cleans CDATA', () => {
  const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc><![CDATA[https://example.com/articles/seo-guide?ref=top&amp;v=1]]></loc>
      <lastmod>2026-09-01T10:00:00Z</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.9</priority>
    </url>
    <url>
      <loc>https://example.com/about</loc>
      <lastmod>2026-08-15</lastmod>
      <priority>0.5</priority>
    </url>
    <url>
      <loc>https://example.com/contact</loc>
    </url>
  </urlset>`;

  const result = parseSitemapXml(mockXml);
  assert.strictEqual(result.isIndex, false);
  assert.strictEqual(result.urls.length, 3);

  const u0 = result.urls[0];
  assert.strictEqual(u0.loc, 'https://example.com/articles/seo-guide?ref=top&v=1');
  assert.strictEqual(u0.lastmod, '2026-09-01T10:00:00Z');
  assert.strictEqual(u0.priority, 0.9);
  assert.strictEqual(u0.changefreq, 'daily');

  const u1 = result.urls[1];
  assert.strictEqual(u1.loc, 'https://example.com/about');
  assert.strictEqual(u1.lastmod, '2026-08-15');
  assert.strictEqual(u1.priority, 0.5);

  const u2 = result.urls[2];
  assert.strictEqual(u2.loc, 'https://example.com/contact');
  assert.strictEqual(u2.lastmod, null);
  assert.strictEqual(u2.priority, null);
});

runTest('decompressIfNeeded() correctly unzips Gzip compressed buffer with magic bytes', () => {
  const rawXml = '<urlset><url><loc>https://compressed.com/page1</loc></url></urlset>';
  const gzippedBuffer = zlib.gzipSync(Buffer.from(rawXml, 'utf-8'));

  assert.strictEqual(gzippedBuffer[0], 0x1f);
  assert.strictEqual(gzippedBuffer[1], 0x8b);

  const unzipped = decompressIfNeeded(gzippedBuffer);
  assert.strictEqual(unzipped, rawXml);
});

await runAsyncTest('fetchAndParseSitemap() recursively traverses sitemap_index.xml and unzips .gz sub-sitemaps', async () => {
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
      <loc>https://example.com/sitemaps/posts.xml</loc>
      <lastmod>2026-09-19</lastmod>
    </sitemap>
    <sitemap>
      <loc>https://example.com/sitemaps/products.xml.gz</loc>
      <lastmod>2026-09-18</lastmod>
    </sitemap>
  </sitemapindex>`;

  const postsXml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://example.com/post-1</loc><priority>0.8</priority></url>
    <url><loc>https://example.com/post-2</loc><priority>0.7</priority></url>
  </urlset>`;

  const productsXml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://example.com/product-a</loc><priority>1.0</priority></url>
    <url><loc>https://example.com/product-b</loc><priority>0.9</priority></url>
  </urlset>`;

  const gzippedProducts = zlib.gzipSync(Buffer.from(productsXml, 'utf-8'));

  const toArrayBuffer = (buf) => {
    const nodeBuf = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    return nodeBuf.buffer.slice(nodeBuf.byteOffset, nodeBuf.byteOffset + nodeBuf.byteLength);
  };

  const mockFetcher = async (url) => {
    if (url === 'https://example.com/sitemap_index.xml') {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: async () => toArrayBuffer(indexXml)
      };
    }
    if (url === 'https://example.com/sitemaps/posts.xml') {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: async () => toArrayBuffer(postsXml)
      };
    }
    if (url === 'https://example.com/sitemaps/products.xml.gz') {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: async () => toArrayBuffer(gzippedProducts)
      };
    }
    return { ok: false, status: 404, statusText: 'Not Found' };
  };

  const parsed = await fetchAndParseSitemap('https://example.com/sitemap_index.xml', 100, {
    fetchFn: mockFetcher
  });

  assert.strictEqual(parsed.success, true);
  assert.strictEqual(parsed.isIndex, true);
  assert.strictEqual(parsed.subSitemapsParsed, 3); // Index + 2 sub-sitemaps
  assert.strictEqual(parsed.totalUrls, 4);

  const locs = parsed.urls.map(u => u.loc);
  assert.deepStrictEqual(locs, [
    'https://example.com/post-1',
    'https://example.com/post-2',
    'https://example.com/product-a',
    'https://example.com/product-b'
  ]);
});

await runAsyncTest('fetchAndParseSitemap() respects maxUrls truncation ceiling', async () => {
  const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>https://example.com/1</loc></url>
    <url><loc>https://example.com/2</loc></url>
    <url><loc>https://example.com/3</loc></url>
    <url><loc>https://example.com/4</loc></url>
  </urlset>`;

  const parsed = await fetchAndParseSitemap(mockXml, 2);
  assert.strictEqual(parsed.totalUrls, 2);
  assert.strictEqual(parsed.urls.length, 2);
  assert.strictEqual(parsed.urls[0].loc, 'https://example.com/1');
  assert.strictEqual(parsed.urls[1].loc, 'https://example.com/2');
});

// ─────────────────────────────────────────────────────────────
// 4. Orphan Page Detection Math & Link Cross-Referencing
// ─────────────────────────────────────────────────────────────
runTest('detectOrphanPages() accurately cross-references link graph and computes coverage ratio', () => {
  // Scenario:
  // 4 crawled URLs discovered internally:
  // - https://example.com/ (in sitemap)
  // - https://example.com/about (in sitemap)
  // - https://example.com/blog (in sitemap)
  // - https://example.com/internal-crawler-discovery (MISSING FROM SITEMAP -> UNINDEXED)
  //
  // 4 sitemap URLs declared in XML:
  // - https://example.com/ (crawled)
  // - https://example.com/about (crawled)
  // - https://example.com/blog (crawled)
  // - https://example.com/orphaned-landing-page (NEVER LINKED INTERNALLY -> ORPHAN)

  const crawled = [
    'https://example.com/',
    'https://example.com/about',
    'https://example.com/blog',
    'https://example.com/internal-crawler-discovery'
  ];

  const sitemap = [
    'https://example.com/',
    'https://example.com/about',
    'https://example.com/blog',
    'https://example.com/orphaned-landing-page'
  ];

  const audit = detectOrphanPages(crawled, sitemap);

  // 1. Orphans: listed in sitemap but never linked internally
  assert.deepStrictEqual(audit.orphans, ['https://example.com/orphaned-landing-page']);
  assert.strictEqual(audit.summary.orphanCount, 1);

  // 2. Unindexed: found via internal crawl but missing from sitemap
  assert.deepStrictEqual(audit.unindexed, ['https://example.com/internal-crawler-discovery']);
  assert.strictEqual(audit.summary.unindexedCount, 1);

  // 3. Matched: 3 URLs present in both
  assert.strictEqual(audit.matched.length, 3);
  assert.strictEqual(audit.totalCrawled, 4);
  assert.strictEqual(audit.totalSitemap, 4);

  // 4. Coverage Ratio: 3 / 4 = 75.0%
  assert.strictEqual(audit.coverageRatio, 75);
  assert.strictEqual(audit.coverageRatioFormatted, '75%');
  assert.strictEqual(audit.coverageFraction, 0.75);
});

runTest('detectOrphanPages() handles 100% full coverage parity', () => {
  const urls = [
    'https://example.com/home',
    'https://example.com/pricing',
    'https://example.com/docs'
  ];

  const audit = detectOrphanPages(urls, urls);
  assert.strictEqual(audit.orphans.length, 0);
  assert.strictEqual(audit.unindexed.length, 0);
  assert.strictEqual(audit.matched.length, 3);
  assert.strictEqual(audit.coverageRatio, 100);
});

runTest('detectOrphanPages() handles 0% disjoint sets', () => {
  const crawled = ['https://example.com/c1', 'https://example.com/c2'];
  const sitemap = ['https://example.com/s1', 'https://example.com/s2'];

  const audit = detectOrphanPages(crawled, sitemap);
  assert.strictEqual(audit.orphans.length, 2);
  assert.strictEqual(audit.unindexed.length, 2);
  assert.strictEqual(audit.matched.length, 0);
  assert.strictEqual(audit.coverageRatio, 0);
});

runTest('detectOrphanPages() normalizes trailing slashes, URL casing, and accepts object arrays', () => {
  const crawledObjects = [
    { url: 'https://example.com/PageA/' }, // Trailing slash + uppercase
    { url: 'https://example.com/pageB#section' } // Hash fragment
  ];

  const sitemapObjects = [
    { loc: 'https://example.com/pagea' },
    { loc: 'https://example.com/pageb' }
  ];

  const audit = detectOrphanPages(crawledObjects, sitemapObjects);
  assert.strictEqual(audit.orphans.length, 0, 'Normalized URLs should match despite trailing slash and case');
  assert.strictEqual(audit.unindexed.length, 0);
  assert.strictEqual(audit.matched.length, 2);
  assert.strictEqual(audit.coverageRatio, 100);
});

console.log(`\n================================================================`);
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS COMPLETED SUCCESSFULLY WITH EXIT CODE 0!`);
console.log(`================================================================`);
