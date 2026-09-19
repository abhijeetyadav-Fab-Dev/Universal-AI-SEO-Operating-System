import assert from 'assert';
import {
  generateExecutiveReportHtml,
  exportToCsv,
  escapeCsvField,
  escapeHtml
} from '../server/adapters/exporter.js';

console.log('─── RUNNING EXPORTER TEST SUITE (OmniSEO-OS) ───\n');

// ─── 1. TEST RFC 4180 ESCAPING & UTILITIES ─────────────────
console.log('Test 1: RFC 4180 Escaping & HTML Escaping Utilities');

// Normal string without special characters
assert.strictEqual(escapeCsvField('hello world'), 'hello world');

// String with comma
assert.strictEqual(escapeCsvField('Apple, Banana, Orange'), '"Apple, Banana, Orange"');

// String with double quotes
assert.strictEqual(escapeCsvField('Say "Hello"'), '"Say ""Hello"""');

// String with newlines
assert.strictEqual(escapeCsvField("Line 1\nLine 2"), '"Line 1\nLine 2"');

// String with comma, quotes, and newlines
assert.strictEqual(
  escapeCsvField('<img src="test.jpg" alt="A, B" />\n'),
  '"<img src=""test.jpg"" alt=""A, B"" />\n"'
);

// Null and undefined
assert.strictEqual(escapeCsvField(null), '');
assert.strictEqual(escapeCsvField(undefined), '');

// HTML escaping
assert.strictEqual(
  escapeHtml('<script>alert("XSS & test")</script>'),
  '&lt;script&gt;alert(&quot;XSS &amp; test&quot;)&lt;/script&gt;'
);

console.log('✅ Passed: RFC 4180 escaping and HTML escaping work correctly.\n');


// ─── 2. TEST CSV EXPORT: crawled_pages ─────────────────────
console.log('Test 2: CSV Export — type: "crawled_pages"');

const mockCrawledPages = [
  {
    url: 'https://example.com',
    status: 200,
    responseTimeMs: 245,
    title: 'Example Domain, Official Homepage',
    missingAlts: 3,
    wordCount: 1420
  },
  {
    url: 'https://example.com/about',
    status: 200,
    responseTimeMs: 180,
    title: 'About "Us" & Team',
    missingAlts: 0,
    wordCount: 850
  },
  {
    url: 'https://example.com/broken',
    status: 404,
    responseTimeMs: 512,
    title: 'Not Found',
    missingAlts: 1,
    wordCount: 40
  }
];

// Test array input
const csvPagesFromArray = exportToCsv('crawled_pages', mockCrawledPages);
const pageLines = csvPagesFromArray.split('\r\n');

assert.strictEqual(pageLines[0], 'URL,Status,Response Time (ms),Title,Missing Alt Count,Word Count');
assert.strictEqual(pageLines.length, 4); // Header + 3 rows
assert.ok(pageLines[1].includes('"Example Domain, Official Homepage"'), 'Title with comma must be quoted');
assert.ok(pageLines[2].includes('"About ""Us"" & Team"'), 'Title with quotes must be RFC 4180 double-quoted');
assert.ok(pageLines[3].includes('404'), 'Status 404 present');

// Test object input with crawledPages property
const csvPagesFromObj = exportToCsv('crawled_pages', { crawledPages: mockCrawledPages });
assert.strictEqual(csvPagesFromObj, csvPagesFromArray, 'Object with crawledPages should produce identical CSV');

console.log('✅ Passed: crawled_pages CSV export complies with RFC 4180.\n');


// ─── 3. TEST CSV EXPORT: missing_alts ───────────────────────
console.log('Test 3: CSV Export — type: "missing_alts"');

const mockMissingAlts = [
  {
    pageUrl: 'https://example.com',
    lineNumber: 42,
    imageSource: 'https://example.com/images/hero-banner.jpg',
    suggestedAltTag: 'Example Domain Hero Banner',
    readyFixCode: '<img src="https://example.com/images/hero-banner.jpg" alt="Example Domain Hero Banner" loading="lazy" />'
  },
  {
    pageUrl: 'https://example.com/products',
    lineNumber: 108,
    imageSource: '/assets/product-alpha.png',
    suggestedAltTag: 'Product Alpha, Professional Edition',
    readyFixCode: '<img src="/assets/product-alpha.png" alt="Product Alpha, Professional Edition" />'
  }
];

const csvAlts = exportToCsv('missing_alts', mockMissingAlts);
const altLines = csvAlts.split('\r\n');

assert.strictEqual(altLines[0], 'Page URL,Line Number,Image Source,Suggested Alt Tag,Ready Fix Code');
assert.strictEqual(altLines.length, 3);
assert.ok(altLines[1].includes('42'));
assert.ok(altLines[1].includes('"<img src=""https://example.com/images/hero-banner.jpg"" alt=""Example Domain Hero Banner"" loading=""lazy"" />"'));
assert.ok(altLines[2].includes('"Product Alpha, Professional Edition"'));

// Test crawler detailedList filtering (should ignore images with isMissingAlt: false)
const crawlerDetailedList = [
  {
    src: '/img1.png',
    alt: 'Already has alt',
    isMissingAlt: false,
    lineNumber: 10,
    suggestedAlt: 'Img 1',
    readyFixCode: '<img src="/img1.png" alt="Img 1" />'
  },
  {
    src: '/img2.png',
    alt: null,
    isMissingAlt: true,
    lineNumber: 25,
    suggestedAlt: 'Img 2 Asset',
    readyFixCode: '<img src="/img2.png" alt="Img 2 Asset" />'
  }
];
const csvCrawlerAlts = exportToCsv('missing_alts', { url: 'https://example.com', detailedList: crawlerDetailedList });
const crawlerAltLines = csvCrawlerAlts.split('\r\n');
assert.strictEqual(crawlerAltLines.length, 2, 'Only missing alt item should be exported from detailedList');
assert.ok(crawlerAltLines[1].includes('/img2.png'));

console.log('✅ Passed: missing_alts CSV export properly handles HTML code fixes and filtering.\n');


// ─── 4. TEST CSV EXPORT: issues ────────────────────────────
console.log('Test 4: CSV Export — type: "issues"');

const mockIssues = [
  {
    discipline: 'CORE_WEB_VITALS',
    urgency: 'P0 - CRITICAL',
    priorityScore: 28.5,
    title: 'Optimize Largest Contentful Paint (LCP: 3.4s)',
    lineNumber: 1,
    readyFix: '<link rel="preload" as="image" href="/hero.webp" fetchpriority="high">'
  },
  {
    discipline: 'TECHNICAL_SEO',
    urgency: 'P1 - HIGH',
    priorityScore: 18.0,
    title: 'Missing Canonical Tag in <head>',
    lineNumber: 8,
    readyFix: '<link rel="canonical" href="https://example.com" />'
  },
  {
    discipline: 'AI_SEARCH_GEO',
    urgency: 'P1 - HIGH',
    priorityScore: 16.5,
    title: 'Missing FAQPage Schema for Perplexity Grounding',
    lineNumber: 1,
    readyFix: '<script type="application/ld+json">\n{"@context":"https://schema.org"}\n</script>'
  }
];

const csvIssues = exportToCsv('issues', mockIssues);
const issueLines = csvIssues.split('\r\n');

assert.strictEqual(issueLines[0], 'Discipline,Urgency,Priority Score,Title,Line Number,Ready Fix');
assert.ok(issueLines.length >= 4);
assert.ok(csvIssues.includes('CORE_WEB_VITALS'));
assert.ok(csvIssues.includes('P0 - CRITICAL'));
assert.ok(csvIssues.includes('28.5'));
assert.ok(csvIssues.includes('TECHNICAL_SEO'));
assert.ok(csvIssues.includes('P1 - HIGH'));

// Test object with recommendations property
const csvIssuesFromObj = exportToCsv('issues', { recommendations: mockIssues });
assert.strictEqual(csvIssuesFromObj, csvIssues);

console.log('✅ Passed: issues CSV export accurately reflects prioritized findings.\n');


// ─── 5. TEST CSV EXPORT: backlinks ─────────────────────────
console.log('Test 5: CSV Export — type: "backlinks"');

const mockBacklinks = [
  {
    referringDomain: 'en.wikipedia.org',
    dr: 98,
    backlinksCount: 14,
    linkType: 'EDITORIAL_WIKIPEDIA',
    anchorText: 'Official Documentation & Source',
    spamStatus: 'CLEAN',
    source: 'https://en.wikipedia.org/wiki/Example'
  },
  {
    referringDomain: 'news.ycombinator.com',
    dr: 92,
    backlinksCount: 85,
    linkType: 'TECH_COMMUNITY',
    anchorText: 'Show HN: Example Launch',
    spamStatus: 'CLEAN',
    source: 'https://news.ycombinator.com/item?id=12345'
  },
  {
    referringDomain: 'scraper-spam-farm.xyz',
    dr: 8,
    backlinksCount: 120,
    linkType: 'SPAM_SCRAPER',
    anchorText: 'click here, best cheap deals',
    spamStatus: 'TOXIC',
    source: 'http://scraper-spam-farm.xyz/links'
  }
];

const csvBacklinks = exportToCsv('backlinks', mockBacklinks);
const backlinkLines = csvBacklinks.split('\r\n');

assert.strictEqual(backlinkLines[0], 'Referring Domain,DR,Backlinks Count,Link Type,Anchor Text,Spam Status,Source');
assert.strictEqual(backlinkLines.length, 4);
assert.ok(csvBacklinks.includes('en.wikipedia.org,98,14'));
assert.ok(csvBacklinks.includes('news.ycombinator.com,92,85'));
assert.ok(csvBacklinks.includes('"click here, best cheap deals"'), 'Anchor with comma must be quoted');
assert.ok(csvBacklinks.includes('TOXIC'));

// Test object with referringDomains property
const csvBacklinksFromObj = exportToCsv('backlinks', { referringDomains: mockBacklinks });
assert.strictEqual(csvBacklinksFromObj, csvBacklinks);

console.log('✅ Passed: backlinks CSV export outputs clean authority and toxic profiles.\n');


// ─── 6. TEST ERROR HANDLING ON INVALID CSV TYPE ────────────
console.log('Test 6: Error Handling for Unsupported CSV Type');
assert.throws(() => {
  exportToCsv('invalid_type', []);
}, /Unsupported export type/);
console.log('✅ Passed: Throws descriptive error for unsupported CSV type.\n');


// ─── 7. TEST EXECUTIVE CLIENT HTML REPORT GENERATION ────────
console.log('Test 7: Executive Client Printable HTML Report Generation');

const mockAuditResult = {
  canonicalModel: {
    projectId: 'proj_test_8819',
    executionId: 'EXEC-7A2B9F',
    query: 'Audit https://github.com',
    targetDomain: 'github.com',
    targetUrl: 'https://github.com',
    timestamp: '2026-09-19T12:00:00.000Z',
    durationMs: 1150,
    overallHealth: 88,
    intents: ['TECHNICAL_AUDIT', 'CORE_WEB_VITALS', 'AI_SEARCH_GEO'],
    dataSourcesUsed: [
      'SSRF-Safe Technical Crawler',
      'Google PageSpeed Insights',
      'DataForSEO Live Backlinks Index',
      'GEO / AEO Engine'
    ]
  },
  detailedPayloads: {
    technical: { score: 94 },
    pageSpeed: { performanceScore: 82 },
    geoAeo: { overallGeoScore: 86 }
  },
  recommendations: [
    {
      type: 'CWV',
      discipline: 'CORE_WEB_VITALS',
      title: 'Optimize Largest Contentful Paint (LCP: 3.2s)',
      problem: 'Hero asset is loaded without high fetchpriority, delaying LCP paint on mobile devices.',
      evidence: 'Crawled https://github.com -> Line 12',
      targetUrl: 'https://github.com',
      selector: 'header img.hero-asset',
      lineNumber: 12,
      rawCodeSnippet: '<img src="/assets/hero.png" class="hero-asset" />',
      fixDiff: '<link rel="preload" as="image" href="/assets/hero.webp" fetchpriority="high">\n<img src="/assets/hero.webp" class="hero-asset" fetchpriority="high" loading="eager" />',
      actionSteps: [
        'Inject <link rel="preload"> tag in <head> for hero image.',
        'Apply fetchpriority="high" to primary visual banner.'
      ],
      priorityScore: 28.5,
      urgency: 'P0 - CRITICAL',
      impact: 9,
      effort: 1
    },
    {
      type: 'GEO_AEO',
      discipline: 'AI_SEARCH_GEO',
      title: 'Inject Structured FAQPage JSON-LD Schema for AI Copilots',
      problem: 'Zero Q&A grounding schema detected in <head>. AI search engines cite third-party forums.',
      evidence: '0 citations found in Perplexity AI search probe.',
      targetUrl: 'https://github.com',
      selector: 'head > script[type="application/ld+json"]',
      lineNumber: 1,
      rawCodeSnippet: '<head>\n  <!-- Missing structured FAQPage Schema -->\n</head>',
      fixDiff: '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage"\n}\n</script>',
      actionSteps: [
        'Add JSON-LD FAQ schema to the document head.',
        'Format H2 questions with 40-word concise answers.'
      ],
      priorityScore: 18.2,
      urgency: 'P1 - HIGH',
      impact: 8,
      effort: 1
    },
    {
      type: 'ON_PAGE',
      discipline: 'ON_PAGE_SEO',
      title: 'Minor Heading Hierarchy Warning',
      problem: 'H3 precedes H2 on minor sidebar component.',
      lineNumber: 90,
      priorityScore: 8.0,
      urgency: 'P2 - MEDIUM',
      impact: 4,
      effort: 1
    }
  ]
};

const html = generateExecutiveReportHtml(mockAuditResult);

// 1. Structure
assert.ok(typeof html === 'string' && html.length > 500, 'HTML should be a non-empty string');
assert.ok(html.includes('<!DOCTYPE html>'), 'Must include DOCTYPE');
assert.ok(html.includes('<meta name="viewport"'), 'Must include responsive viewport');

// 2. Print CSS
assert.ok(html.includes('@media print'), 'Must include @media print stylesheet');
assert.ok(html.includes('page-break-after: always') || html.includes('break-after: page'), 'Must include page break rules');
assert.ok(html.includes('page-break-inside: avoid') || html.includes('break-inside: avoid'), 'Must include break avoidance');
assert.ok(html.includes('.no-print'), 'Must include .no-print rule');

// 3. Cover Branding
assert.ok(html.includes('OmniSEO-OS') || html.includes('Omni<span class="brand-title-accent">SEO</span>-OS'), 'Must include OmniSEO-OS branding');
assert.ok(html.includes('Confidential Client Briefing'), 'Must include confidential client tag');
assert.ok(html.includes('github.com'), 'Must display target domain');
assert.ok(html.includes('EXEC-7A2B9F'), 'Must display execution ID');

// 4. Executive Scorecard
assert.ok(html.includes('Executive Performance Scorecard'), 'Must contain scorecard heading');
assert.ok(html.includes('Overall Health'), 'Must include Overall Health metric');
assert.ok(html.includes('Technical Score'), 'Must include Technical Score metric');
assert.ok(html.includes('Core Web Vitals'), 'Must include CWV metric');
assert.ok(html.includes('GEO Score (AI Search)'), 'Must include GEO Score metric');
assert.ok(html.includes('88'), 'Overall health score 88 present');
assert.ok(html.includes('94'), 'Tech score 94 present');
assert.ok(html.includes('82'), 'CWV score 82 present');
assert.ok(html.includes('86'), 'GEO score 86 present');

// 5. Prioritized P0/P1 Issues Breakdown with Code Diffs
assert.ok(html.includes('Prioritized Critical &amp; High-Priority Actions (P0 / P1)') || html.includes('Prioritized Critical & High-Priority Actions (P0 / P1)'), 'Must contain prioritized actions header');
assert.ok(html.includes('P0 — CRITICAL') || html.includes('P0 &mdash; CRITICAL'), 'Must render P0 badge');
assert.ok(html.includes('P1 — HIGH PRIORITY') || html.includes('P1 &mdash; HIGH PRIORITY'), 'Must render P1 badge');
assert.ok(html.includes('Optimize Largest Contentful Paint'), 'Must render LCP title');
assert.ok(html.includes('Inject Structured FAQPage JSON-LD Schema'), 'Must render FAQPage title');
assert.ok(html.includes('Line 12'), 'Must show line number provenance');

// Code diff rendering & HTML escaping verification
assert.ok(html.includes('&lt;link rel=&quot;preload&quot;'), 'Code diff must be properly HTML escaped to avoid XSS/malformed tags');
assert.ok(html.includes('Production Ready Fix'), 'Must render Ready Fix block');
assert.ok(html.includes('Current Code'), 'Must render Current Code block');

// Low priority issue (P2) shouldn't crowd out the P0/P1 prioritized section
assert.ok(!html.includes('Minor Heading Hierarchy Warning'), 'P2 medium issues should not be displayed in P0/P1 breakdown when P0/P1 exist');

// 6. Provenance
assert.ok(html.includes('Audit Verification Provenance'), 'Must include provenance section');
assert.ok(html.includes('SSRF-Safe Technical Crawler'), 'Must list data sources');
assert.ok(html.includes('DataForSEO Live Backlinks Index'), 'Must list DataForSEO');

console.log('✅ Passed: Executive HTML report verified with print styles, scorecard, P0/P1 diffs, and provenance.\n');


// ─── 8. TEST GRACEFUL DEFAULTS FOR EMPTY AUDIT RESULT ─────
console.log('Test 8: Graceful Fallback for Empty/Partial Audit Result');

const emptyHtml = generateExecutiveReportHtml({});
assert.ok(typeof emptyHtml === 'string' && emptyHtml.includes('<!DOCTYPE html>'));
assert.ok(emptyHtml.includes('example.com'), 'Fallback domain used');
assert.ok(emptyHtml.includes('Zero P0 / P1 Critical Deficiencies Identified'), 'Zero issues banner displayed');

console.log('✅ Passed: Empty audit results handled gracefully without throwing.\n');


console.log('═══════════════════════════════════════════════════════');
console.log('🎉 ALL EXPORTER & CSV ENGINE TESTS PASSED (100% SUCCESS)');
console.log('═══════════════════════════════════════════════════════');
process.exit(0);
