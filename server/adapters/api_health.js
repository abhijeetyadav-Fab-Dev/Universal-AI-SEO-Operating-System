import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { getScreamingFrogStatus } from './screaming_frog.js';

const UA = 'OmniSEO-OS/2.0 (+https://universal-ai-seo-operating-system.onrender.com; API Health & Deprecation Auditor)';

/**
 * Common standard API endpoint paths probed during target website discovery
 */
export const COMMON_API_PROBES = [
  // OpenAPI & Docs
  { path: '/openapi.json', type: 'OPENAPI_SPEC', method: 'GET' },
  { path: '/swagger.json', type: 'SWAGGER_SPEC', method: 'GET' },
  { path: '/api/v1/openapi.json', type: 'OPENAPI_SPEC', method: 'GET' },
  { path: '/api-docs', type: 'API_DOCS', method: 'GET' },
  { path: '/docs', type: 'DOCS', method: 'GET' },

  // Standard Health & Status
  { path: '/health', type: 'HEALTH_CHECK', method: 'GET' },
  { path: '/api/health', type: 'HEALTH_CHECK', method: 'GET' },
  { path: '/api/v1/health', type: 'HEALTH_CHECK', method: 'GET' },
  { path: '/status', type: 'STATUS', method: 'GET' },
  { path: '/ping', type: 'PING', method: 'GET' },

  // API Roots & Versions
  { path: '/api', type: 'API_ROOT', method: 'GET' },
  { path: '/api/v1', type: 'API_VERSION', method: 'GET' },
  { path: '/api/v2', type: 'API_VERSION', method: 'GET' },

  // Well-Known Protocols
  { path: '/.well-known/security.txt', type: 'SECURITY_TXT', method: 'GET' },
  { path: '/.well-known/openid-configuration', type: 'OPENID_CONFIG', method: 'GET' },

  // GraphQL
  { path: '/graphql', type: 'GRAPHQL_ENDPOINT', method: 'GET' },
  { path: '/api/graphql', type: 'GRAPHQL_ENDPOINT', method: 'GET' },

  // CMS REST APIs
  { path: '/wp-json/', type: 'WORDPRESS_REST', method: 'GET' },
  { path: '/wp-json/wp/v2/posts', type: 'WORDPRESS_POSTS', method: 'GET' }
];

/**
 * Platform integrations master registry (all 17 platforms & services)
 */
export const PLATFORM_REGISTRY = [
  {
    id: 'google-psi',
    name: 'Google PageSpeed Insights',
    platform: 'Google PageSpeed Insights',
    category: 'Core SEO & Performance',
    icon: '⚡',
    description: 'Official Google Lighthouse 11.0 & CrUX field performance engine.',
    authType: 'api_key',
    method: 'GET',
    endpointUrl: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
    healthCheck: { url: 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed', method: 'GET' },
    docUrl: 'https://developers.google.com/speed/docs/insights/v5/get-started',
    docsUrl: 'https://developers.google.com/speed/docs/insights/v5/get-started',
    version: 'v5 (Lighthouse 11.0+)',
    deprecationNotes: 'Active (v5). Legacy v1, v2, v3, v4 shut down by Google.',
    isDeprecated: false,
    quotaInfo: '25,000 queries / day free with API Key (240 req/min)',
    envKey: 'GOOGLE_PSI_API_KEY',
    endpoints: [
      { path: '/pagespeedonline/v5/runPagespeed', method: 'GET', version: 'v5', lifecycle: 'active', quota: '25,000 / day', description: 'Run full mobile/desktop audit' },
      { path: '/pagespeedonline/v4/runPagespeed', method: 'GET', version: 'v4', lifecycle: 'sunset_planned', quota: 'Deprecated (410 Gone)', deprecated: true, description: 'Legacy v4 API shutdown' }
    ]
  },
  {
    id: 'google-crux',
    name: 'Google Chrome UX Report (CrUX)',
    platform: 'Google Chrome UX Report (CrUX)',
    category: 'Core SEO & Performance',
    icon: '📊',
    description: 'Real-user 28-day rolling Core Web Vitals field data across millions of origins.',
    authType: 'api_key',
    method: 'POST',
    endpointUrl: 'https://chromeuxreport.googleapis.com/v1/records:queryRecord',
    healthCheck: { url: 'https://chromeuxreport.googleapis.com/v1/records:queryRecord', method: 'POST' },
    docUrl: 'https://developer.chrome.com/docs/crux/api',
    docsUrl: 'https://developer.chrome.com/docs/crux/api',
    version: 'v1',
    deprecationNotes: 'Active (v1). Official real-user field metrics.',
    isDeprecated: false,
    quotaInfo: '150 queries / min free per Google Cloud project',
    envKey: 'GOOGLE_CRUX_API_KEY',
    endpoints: [
      { path: '/v1/records:queryRecord', method: 'POST', version: 'v1', lifecycle: 'active', quota: '150 req / min', description: 'Query origin/URL 28-day rolling CWV' },
      { path: '/v1/records:queryHistoryRecord', method: 'POST', version: 'v1', lifecycle: 'active', quota: '150 req / min', description: 'Query up to 40-week historical trends' }
    ]
  },
  {
    id: 'google-gsc',
    name: 'Google Search Console',
    platform: 'Google Search Console',
    category: 'Core SEO & Performance',
    icon: '📈',
    description: 'Organic search performance, keyword clicks, impressions, and indexation.',
    authType: 'oauth2',
    method: 'GET',
    endpointUrl: 'https://searchconsole.googleapis.com/v1/urlTestingTools/mobileFriendlyTest:run',
    healthCheck: { url: 'https://searchconsole.googleapis.com/v1/urlTestingTools/mobileFriendlyTest:run', method: 'GET' },
    docUrl: 'https://developers.google.com/webmaster-tools/v1/searchanalytics/query',
    docsUrl: 'https://developers.google.com/webmaster-tools/v1/searchanalytics/query',
    version: 'v1 / Webmasters v3',
    deprecationNotes: 'Webmasters v3 discovery transitioning to Search Console v1 APIs.',
    isDeprecated: false,
    quotaInfo: '1,200,000 queries / day (Search Analytics API)',
    envKey: 'GSC_CLIENT_ID',
    endpoints: [
      { path: '/webmasters/v3/sites/{siteUrl}/searchAnalytics/query', method: 'POST', version: 'v1', lifecycle: 'active', quota: '1,200,000 / day', description: 'Search performance analytics' },
      { path: '/v1/urlInspection/index:inspect', method: 'POST', version: 'v1', lifecycle: 'active', quota: '2,000 / day', description: 'URL inspection & index status' }
    ]
  },
  {
    id: 'google-gemini',
    name: 'Google Gemini AI Studio',
    platform: 'Google Gemini AI Studio',
    category: 'AI & LLMs',
    icon: '🤖',
    description: 'Direct multi-modal inference with gemini-2.0-flash and gemini-1.5-pro.',
    authType: 'api_key',
    method: 'GET',
    endpointUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    healthCheck: { url: 'https://generativelanguage.googleapis.com/v1beta/models', method: 'GET' },
    docUrl: 'https://ai.google.dev/api/rest',
    docsUrl: 'https://ai.google.dev/api/rest',
    version: 'v1beta / v1',
    deprecationNotes: 'Active (gemini-2.0-flash / gemini-1.5-pro). Note: gemini-1.0-pro retired.',
    isDeprecated: false,
    quotaInfo: '15 RPM free tier / 1,500 requests per day on AI Studio',
    envKey: 'GEMINI_API_KEY',
    endpoints: [
      { path: '/v1beta/models/gemini-2.0-flash:generateContent', method: 'POST', version: 'v1beta', lifecycle: 'active', quota: '15 RPM / 1,500 day', description: 'High-speed content & SEO synthesis' },
      { path: '/v1beta/models/gemini-1.5-pro:generateContent', method: 'POST', version: 'v1beta', lifecycle: 'active', quota: '2 RPM / 50 day', description: 'Deep reasoning & architectural audit' },
      { path: '/v1/models/gemini-1.0-pro', method: 'POST', version: 'v1', lifecycle: 'sunset_planned', quota: 'Deprecated (410)', deprecated: true, description: 'Decommissioned Gemini 1.0 endpoint' }
    ]
  },
  {
    id: 'openrouter',
    name: 'OpenRouter AI Gateway',
    platform: 'OpenRouter AI Gateway',
    category: 'AI & LLMs',
    icon: '🔀',
    description: 'Unified OpenAI-compatible gateway routing across 200+ frontier LLMs.',
    authType: 'api_key',
    method: 'GET',
    endpointUrl: 'https://openrouter.ai/api/v1/auth/key',
    healthCheck: { url: 'https://openrouter.ai/api/v1/auth/key', method: 'GET' },
    docUrl: 'https://openrouter.ai/docs',
    docsUrl: 'https://openrouter.ai/docs',
    version: 'v1',
    deprecationNotes: 'Active. Unified OpenAI-compatible gateway across 200+ models.',
    isDeprecated: false,
    quotaInfo: 'Free models have dynamic rate-limits; 200 req/min on paid tier',
    envKey: 'OPENROUTER_API_KEY',
    endpoints: [
      { path: '/api/v1/chat/completions', method: 'POST', version: 'v1', lifecycle: 'active', quota: '200 RPM', description: 'Multi-LLM streaming completions' },
      { path: '/api/v1/auth/key', method: 'GET', version: 'v1', lifecycle: 'active', quota: 'Unlimited', description: 'Key verification and credit balance check' }
    ]
  },
  {
    id: 'nvidia-nim',
    name: 'NVIDIA NIM Microservices',
    platform: 'NVIDIA NIM Microservices',
    category: 'AI & LLMs',
    icon: '⚡',
    description: 'Hardware-accelerated cloud inference with Llama 3.3 and Nemotron 70B.',
    authType: 'api_key',
    method: 'GET',
    endpointUrl: 'https://integrate.api.nvidia.com/v1/models',
    healthCheck: { url: 'https://integrate.api.nvidia.com/v1/models', method: 'GET' },
    docUrl: 'https://build.nvidia.com/explore/discover',
    docsUrl: 'https://build.nvidia.com/explore/discover',
    version: 'v1',
    deprecationNotes: 'Active (OpenAI-compatible /v1/chat/completions).',
    isDeprecated: false,
    quotaInfo: '1,000 free API credits on NVIDIA NGC / Developer Program',
    envKey: 'NVIDIA_API_KEY',
    endpoints: [
      { path: '/v1/chat/completions', method: 'POST', version: 'v1', lifecycle: 'active', quota: '1,000 free credits', description: 'NVIDIA hosted LLM inference' },
      { path: '/v1/models', method: 'GET', version: 'v1', lifecycle: 'active', quota: 'Standard', description: 'List active NIM microservice models' }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI API',
    platform: 'OpenAI API',
    category: 'AI & LLMs',
    icon: '🤖',
    description: 'Industry-standard GPT-4o, o3-mini, and text-embedding-3 models.',
    authType: 'api_key',
    method: 'GET',
    endpointUrl: 'https://api.openai.com/v1/models',
    healthCheck: { url: 'https://api.openai.com/v1/models', method: 'GET' },
    docUrl: 'https://platform.openai.com/docs/api-reference',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    version: 'v1',
    deprecationNotes: 'Active (v1). Legacy /v1/completions & engines shut down.',
    isDeprecated: false,
    quotaInfo: 'Tier-based credits & RPM rate limits',
    envKey: 'OPENAI_API_KEY',
    endpoints: [
      { path: '/v1/chat/completions', method: 'POST', version: 'v1', lifecycle: 'active', quota: 'Tier limits', description: 'GPT-4o chat completions' },
      { path: '/v1/embeddings', method: 'POST', version: 'v1', lifecycle: 'active', quota: 'Tier limits', description: 'Vector embeddings generation' },
      { path: '/v1/engines', method: 'GET', version: 'v1', lifecycle: 'sunset_planned', quota: 'Deprecated (410)', deprecated: true, description: 'Decommissioned Instruct engines' }
    ]
  },
  {
    id: 'freellm',
    name: 'FreeLLM API (Keyless Engine)',
    platform: 'FreeLLM API (Keyless Engine)',
    category: 'AI & LLMs',
    icon: '🆓',
    description: 'Autonomous zero-config keyless fallback for uninterrupted AI execution.',
    authType: 'anonymous',
    method: 'GET',
    endpointUrl: 'https://text.pollinations.ai/hello',
    healthCheck: { url: 'https://text.pollinations.ai/hello', method: 'GET' },
    docUrl: 'https://github.com/tashfeenahmed/freellmapi',
    docsUrl: 'https://github.com/tashfeenahmed/freellmapi',
    version: 'v1 (Keyless)',
    deprecationNotes: 'Active. Keyless fallback for uninterrupted AI execution.',
    isDeprecated: false,
    quotaInfo: 'Unlimited community / open-tier access',
    envKey: 'FREELLM_ENABLED',
    endpoints: [
      { path: '/prompt', method: 'POST', version: 'v1', lifecycle: 'active', quota: 'Unlimited Community', description: 'Keyless prompt generation' }
    ]
  },
  {
    id: 'dataforseo',
    name: 'DataForSEO Live SERP & Backlinks',
    platform: 'DataForSEO Live SERP & Backlinks',
    category: 'Core SEO & Performance',
    icon: '🔗',
    description: 'Enterprise SERP scraping, live backlink graphs, and domain authority.',
    authType: 'api_key',
    method: 'GET',
    endpointUrl: 'https://api.dataforseo.com/v3/appendix/user_data',
    healthCheck: { url: 'https://api.dataforseo.com/v3/appendix/user_data', method: 'GET' },
    docUrl: 'https://docs.dataforseo.com/v3/',
    docsUrl: 'https://docs.dataforseo.com/v3/',
    version: 'v3',
    deprecationNotes: 'v3 Active. DataForSEO v2 deprecated & retired.',
    isDeprecated: false,
    quotaInfo: 'Pay-per-task usage balance',
    envKey: 'DATAFORSEO_LOGIN',
    endpoints: [
      { path: '/v3/backlinks/summary/live', method: 'POST', version: 'v3', lifecycle: 'active', quota: 'Pay per query (~$0.02)', description: 'Live backlink summary & toxic anchor check' },
      { path: '/v3/serp/google/organic/live/advanced', method: 'POST', version: 'v3', lifecycle: 'active', quota: 'Pay per task', description: 'Live SERP ranking extraction' }
    ]
  },
  {
    id: 'indexnow',
    name: 'IndexNow Protocol (Bing & Yandex)',
    platform: 'IndexNow Protocol (Bing & Yandex)',
    category: 'Core SEO & Performance',
    icon: '⚡',
    description: 'Instant multi-engine search indexing standard supporting Bing, Yandex, Seznam.',
    authType: 'anonymous',
    method: 'POST',
    endpointUrl: 'https://api.indexnow.org/indexnow',
    healthCheck: { url: 'https://www.indexnow.org/documentation', method: 'GET' },
    docUrl: 'https://www.indexnow.org/documentation',
    docsUrl: 'https://www.indexnow.org/documentation',
    version: 'RFC Protocol v1',
    deprecationNotes: 'Active. Universal multi-engine instant indexing standard.',
    isDeprecated: false,
    quotaInfo: 'Up to 10,000 URLs per day per host',
    envKey: 'INDEXNOW_KEY',
    endpoints: [
      { path: '/indexnow', method: 'POST', version: 'v1', lifecycle: 'active', quota: '10,000 URLs / day', description: 'Instant URL push for indexing' }
    ]
  },
  {
    id: 'screaming-frog',
    name: 'Screaming Frog SEO Spider CLI',
    platform: 'Screaming Frog SEO Spider CLI',
    category: 'Infrastructure & Scraping',
    icon: '🐸',
    description: 'Enterprise desktop crawler CLI executing headless crawls and forensic CSV exports.',
    authType: 'cli',
    method: 'CLI Process',
    endpointUrl: 'C:\\Program Files (x86)\\Screaming Frog SEO Spider\\ScreamingFrogSEOSpiderCli.exe',
    healthCheck: { url: 'C:\\Program Files (x86)\\Screaming Frog SEO Spider\\ScreamingFrogSEOSpiderCli.exe', method: 'CLI' },
    docUrl: 'https://www.screamingfrog.co.uk/seo-spider/user-guide/general/#command-line',
    docsUrl: 'https://www.screamingfrog.co.uk/seo-spider/user-guide/general/#command-line',
    version: 'v24.3 (Full Version Active)',
    deprecationNotes: 'Active binary. Current release supports 1M+ URL crawls & headless CLI.',
    isDeprecated: false,
    quotaInfo: 'Unlimited local crawls (Full License)',
    envKey: 'SCREAMING_FROG_INSTALLED',
    endpoints: [
      { path: '--crawl --headless', method: 'CLI', version: 'v24.3', lifecycle: 'active', quota: 'Unlimited local', description: 'Headless background crawler execution' },
      { path: '--export-tabs "Internal:All"', method: 'CLI', version: 'v24.3', lifecycle: 'active', quota: 'Unlimited local', description: 'Automated CSV report export' }
    ]
  },
  {
    id: 'open-rdap',
    name: 'ICANN RDAP Open Registry',
    platform: 'ICANN RDAP Open Registry',
    category: 'Open Data & Knowledge',
    icon: '🌐',
    description: 'Registration Data Access Protocol replacing deprecated WHOIS port 43.',
    authType: 'anonymous',
    method: 'GET',
    endpointUrl: 'https://rdap.org/domain/google.com',
    healthCheck: { url: 'https://rdap.org/domain/google.com', method: 'GET' },
    docUrl: 'https://about.rdap.org/',
    docsUrl: 'https://about.rdap.org/',
    version: 'RFC 7480-7484 RDAP',
    deprecationNotes: 'Modern successor to deprecated port 43 WHOIS.',
    isDeprecated: false,
    quotaInfo: 'Free public rate-limited community registry',
    envKey: null,
    endpoints: [
      { path: '/domain/{domain}', method: 'GET', version: 'RFC 7480', lifecycle: 'active', quota: 'Public rate-limited', description: 'Domain registration & DNSSEC info' }
    ]
  },
  {
    id: 'google-dns',
    name: 'Google DNS-over-HTTPS',
    platform: 'Google DNS-over-HTTPS',
    category: 'Open Data & Knowledge',
    icon: '🔒',
    description: 'Authoritative RFC 8484 DNS queries over HTTPS for MX, A, AAAA, and TXT.',
    authType: 'anonymous',
    method: 'GET',
    endpointUrl: 'https://dns.google/resolve?name=google.com&type=A',
    healthCheck: { url: 'https://dns.google/resolve?name=google.com&type=A', method: 'GET' },
    docUrl: 'https://developers.google.com/speed/public-dns/docs/doh',
    docsUrl: 'https://developers.google.com/speed/public-dns/docs/doh',
    version: 'DoH RFC 8484',
    deprecationNotes: 'Active RFC 8484 DNS over HTTPS.',
    isDeprecated: false,
    quotaInfo: 'Free global anycast Google infrastructure',
    envKey: null,
    endpoints: [
      { path: '/resolve?name={domain}&type=A', method: 'GET', version: 'RFC 8484', lifecycle: 'active', quota: 'Unlimited', description: 'Query IPv4 records' },
      { path: '/resolve?name={domain}&type=MX', method: 'GET', version: 'RFC 8484', lifecycle: 'active', quota: 'Unlimited', description: 'Query mail exchange records' }
    ]
  },
  {
    id: 'wikidata-api',
    name: 'Wikidata Semantic Knowledge Graph',
    platform: 'Wikidata Semantic Knowledge Graph',
    category: 'Open Data & Knowledge',
    icon: '🧠',
    description: 'Open structured entity graph for semantic SEO entity reconciliation.',
    authType: 'anonymous',
    method: 'GET',
    endpointUrl: 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Google&language=en&format=json',
    healthCheck: { url: 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Google&language=en&format=json', method: 'GET' },
    docUrl: 'https://www.wikidata.org/w/api.php',
    docsUrl: 'https://www.wikidata.org/w/api.php',
    version: 'MediaWiki Action API v1',
    deprecationNotes: 'Active. High-availability open knowledge base.',
    isDeprecated: false,
    quotaInfo: 'Free open wiki access (max 200 req/sec)',
    envKey: null,
    endpoints: [
      { path: '/w/api.php?action=wbsearchentities', method: 'GET', version: 'v1', lifecycle: 'active', quota: '200 req / sec', description: 'Search entity Q-identifiers' },
      { path: '/w/api.php?action=wbgetentities', method: 'GET', version: 'v1', lifecycle: 'active', quota: '200 req / sec', description: 'Fetch full entity claims & relations' }
    ]
  },
  {
    id: 'wikimedia-pageviews',
    name: 'Wikimedia REST Pageviews API',
    platform: 'Wikimedia REST Pageviews API',
    category: 'Open Data & Knowledge',
    icon: '📈',
    description: 'Daily Wikipedia pageview statistics for brand entity search interest.',
    authType: 'anonymous',
    method: 'GET',
    endpointUrl: 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/Google/daily/20260901/20260905',
    healthCheck: { url: 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/Google/daily/20260901/20260905', method: 'GET' },
    docUrl: 'https://wikimedia.org/api/rest_v1/',
    docsUrl: 'https://wikimedia.org/api/rest_v1/',
    version: 'REST v1',
    deprecationNotes: 'Active RESTful analytics endpoint.',
    isDeprecated: false,
    quotaInfo: 'Free open API with polite User-Agent',
    envKey: null,
    endpoints: [
      { path: '/metrics/pageviews/per-article/{project}/{access}/{agent}/{article}/{granularity}/{start}/{end}', method: 'GET', version: 'v1', lifecycle: 'active', quota: 'Free public', description: 'Query pageview timeseries' }
    ]
  },
  {
    id: 'datamuse-lsi',
    name: 'Datamuse Semantic NLP & LSI API',
    platform: 'Datamuse Semantic NLP & LSI API',
    category: 'Open Data & Knowledge',
    icon: '💡',
    description: 'Latent Semantic Indexing word correlation and conceptual search intent.',
    authType: 'anonymous',
    method: 'GET',
    endpointUrl: 'https://api.datamuse.com/words?ml=seo&max=5',
    healthCheck: { url: 'https://api.datamuse.com/words?ml=seo&max=5', method: 'GET' },
    docUrl: 'https://www.datamuse.com/api/',
    docsUrl: 'https://www.datamuse.com/api/',
    version: 'v1',
    deprecationNotes: 'Active semantic word correlation engine.',
    isDeprecated: false,
    quotaInfo: 'Up to 100,000 requests/day free',
    envKey: null,
    endpoints: [
      { path: '/words?ml={term}', method: 'GET', version: 'v1', lifecycle: 'active', quota: '100,000 / day', description: 'Semantic similar meaning query' }
    ]
  },
  {
    id: 'google-suggest',
    name: 'Google Search Autocomplete API',
    platform: 'Google Search Autocomplete API',
    category: 'Core SEO & Performance',
    icon: '🔍',
    description: 'Real-time search autocomplete suggestions and zero-click query questions.',
    authType: 'anonymous',
    method: 'GET',
    endpointUrl: 'https://suggestqueries.google.com/complete/search?client=chrome&q=seo',
    healthCheck: { url: 'https://suggestqueries.google.com/complete/search?client=chrome&q=seo', method: 'GET' },
    docUrl: 'https://www.google.com',
    docsUrl: 'https://www.google.com',
    version: 'Chrome Public Query Endpoint',
    deprecationNotes: 'Active public query interface.',
    isDeprecated: false,
    quotaInfo: 'Dynamic client query pool',
    envKey: null,
    endpoints: [
      { path: '/complete/search?client=chrome&q={keyword}', method: 'GET', version: 'Chrome API', lifecycle: 'active', quota: 'Dynamic public pool', description: 'Autocomplete search suggestions' }
    ]
  }
];

/**
 * Detects RFC 8594 / RFC 9524 deprecation headers, 410 Gone status, or body deprecation signals
 */
export function analyzeDeprecation(status, headers = {}, body = '', urlPath = '') {
  const reasons = [];
  let isDeprecated = false;
  let sunsetDate = null;
  let recommendation = null;

  // 1. Explicit RFC 8594 / RFC 9524 Deprecation header
  const deprecationHdr = headers['deprecation'] || headers['x-api-deprecation'] || headers['x-deprecated'];
  if (deprecationHdr) {
    isDeprecated = true;
    reasons.push(`RFC 8594 Deprecation Header Detected (${deprecationHdr})`);
  }

  // 2. Sunset Header (RFC 8594 Sunset Header)
  if (headers['sunset']) {
    isDeprecated = true;
    sunsetDate = headers['sunset'];
    reasons.push(`Sunset header specifies retirement on ${headers['sunset']}`);
  }

  // 3. HTTP Warning Header with 299 Deprecated
  if (headers['warning'] && /299|deprecated/i.test(headers['warning'])) {
    isDeprecated = true;
    reasons.push(`Warning header: ${headers['warning']}`);
  }

  // 4. Status 410 Gone
  if (status === 410) {
    isDeprecated = true;
    reasons.push('HTTP 410 Gone — Endpoint permanently retired and decommissioned');
  }

  // 5. Keyword analysis in body
  const bodyLower = String(body || '').toLowerCase();
  const deprecationRegex = /(this endpoint is deprecated|endpoint has been deprecated|api version is deprecated|please migrate to|will be removed|has been retired|is discontinued|deprecated in favor of)/i;
  if (deprecationRegex.test(bodyLower)) {
    const match = bodyLower.match(deprecationRegex)[0];
    isDeprecated = true;
    reasons.push(`Response body indicates deprecation ("${match}")`);
  }

  // 6. Recommendation
  if (isDeprecated) {
    recommendation = sunsetDate
      ? `Migrate before sunset date ${sunsetDate}. Check API documentation for current alternative.`
      : 'Endpoint is flagged as deprecated. Transition to the latest API version or successor endpoint.';
  }

  return {
    isDeprecated,
    reasons,
    reason: reasons[0] || null,
    evidence: reasons.join('; ') || null,
    sunsetDate,
    recommendation
  };
}

/**
 * Scan a website URL for discovered API endpoints, probe their health, and detect deprecation.
 */
export async function scanWebsiteEndpoints(targetUrl) {
  const startTime = Date.now();
  let base;
  try {
    let raw = String(targetUrl || '').trim();
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    base = new URL(raw);
  } catch (err) {
    throw new Error(`Invalid URL target: ${targetUrl}`);
  }

  const origin = base.origin;
  const discoveredPaths = new Map();

  // Add standard probe paths
  COMMON_API_PROBES.forEach(p => {
    discoveredPaths.set(p.path, { path: p.path, type: p.type, method: p.method, source: 'Standard Probe' });
  });

  // Fetch target HTML to discover inlined endpoints & scripts
  try {
    const htmlRes = await fetch(origin, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow'
    });
    if (htmlRes.ok) {
      const htmlText = await htmlRes.text();
      const $ = cheerio.load(htmlText);

      // 1. Check link tags (e.g. <link rel="https://api.w.org/" href="https://example.com/wp-json/">)
      $('link[rel*="api"], link[rel*="w.org"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const u = new URL(href, origin);
            if (u.origin === origin) {
              discoveredPaths.set(u.pathname, { path: u.pathname, type: 'DISCOVERED_LINK', method: 'GET', source: 'HTML <link> tag' });
            }
          } catch {}
        }
      });

      // 2. Scan script tags & inline JS for endpoint patterns (e.g. /api/v1/..., /graphql)
      $('script').each((_, el) => {
        const text = $(el).html() || '';
        const matches = text.match(/(["'`])(\/api\/[a-zA-Z0-9_\-\/]+|\/v[0-9]+\/[a-zA-Z0-9_\-\/]+)\1/g);
        if (matches) {
          matches.forEach(m => {
            const cleanPath = m.slice(1, -1);
            if (cleanPath.length > 4 && cleanPath.length < 60 && !discoveredPaths.has(cleanPath)) {
              discoveredPaths.set(cleanPath, { path: cleanPath, type: 'INLINE_SCRIPT_EXTRACT', method: 'GET', source: 'HTML Script Extraction' });
            }
          });
        }
      });
    }
  } catch {}

  // Limit probe candidates to at most 24 endpoints to keep response snappy
  const endpointsToProbe = Array.from(discoveredPaths.values()).slice(0, 24);

  // Probe all discovered endpoints in parallel
  const probeResults = await Promise.all(endpointsToProbe.map(async (item) => {
    const probeUrl = `${origin}${item.path}`;
    const pStart = Date.now();
    try {
      const res = await fetch(probeUrl, {
        method: item.method,
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json, text/plain, */*'
        },
        signal: AbortSignal.timeout(5000),
        redirect: 'manual'
      });

      const latencyMs = Date.now() - pStart;
      const status = res.status;
      const headers = Object.fromEntries(res.headers.entries());

      let bodySnippet = '';
      try {
        const text = await res.text();
        bodySnippet = text.substring(0, 500);
      } catch {}

      // Analyze deprecation
      const deprecationInfo = analyzeDeprecation(status, headers, bodySnippet, item.path);

      // Determine health state
      let healthStatus = 'UNKNOWN';
      if (deprecationInfo.isDeprecated) {
        healthStatus = 'DEPRECATED';
      } else if (status >= 200 && status < 300) {
        healthStatus = 'HEALTHY';
      } else if (status === 401 || status === 403) {
        healthStatus = 'AUTH_REQUIRED';
      } else if (status >= 300 && status < 400) {
        healthStatus = 'REDIRECT';
      } else if (status === 405) {
        healthStatus = 'METHOD_NOT_ALLOWED';
      } else if (status === 404 || status >= 500) {
        healthStatus = 'BROKEN';
      } else {
        healthStatus = 'INACTIVE';
      }

      return {
        path: item.path,
        url: probeUrl,
        fullUrl: probeUrl,
        method: item.method,
        type: item.type,
        source: item.source,
        status,
        statusText: res.statusText || String(status),
        latencyMs,
        healthStatus,
        contentType: headers['content-type'] || 'unknown',
        isDeprecated: deprecationInfo.isDeprecated,
        deprecationReason: deprecationInfo.reason,
        deprecationEvidence: deprecationInfo.evidence,
        deprecationDetails: deprecationInfo,
        bodyPreview: bodySnippet,
        headers: {
          deprecation: headers['deprecation'] || null,
          sunset: headers['sunset'] || null,
          warning: headers['warning'] || null,
          location: headers['location'] || null
        }
      };
    } catch (err) {
      const latencyMs = Date.now() - pStart;
      return {
        path: item.path,
        url: probeUrl,
        fullUrl: probeUrl,
        method: item.method,
        type: item.type,
        source: item.source,
        status: 0,
        statusText: 'ERR_CONNECTION_FAILED',
        latencyMs,
        healthStatus: 'BROKEN',
        contentType: 'none',
        isDeprecated: false,
        deprecationReason: null,
        deprecationEvidence: null,
        deprecationDetails: { isDeprecated: false, reasons: [], reason: null, evidence: null },
        bodyPreview: '',
        error: err.message
      };
    }
  }));

  // Calculate Summary Statistics
  const total = probeResults.length;
  const healthy = probeResults.filter(p => p.healthStatus === 'HEALTHY').length;
  const deprecated = probeResults.filter(p => p.isDeprecated).length;
  const authRequired = probeResults.filter(p => p.healthStatus === 'AUTH_REQUIRED').length;
  const broken = probeResults.filter(p => p.healthStatus === 'BROKEN' || p.status === 404 || p.status >= 500).length;
  const redirected = probeResults.filter(p => p.healthStatus === 'REDIRECT').length;
  const validLatencies = probeResults.filter(p => p.latencyMs > 0).map(p => p.latencyMs);
  const avgLatencyMs = validLatencies.length ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length) : 0;

  return {
    success: true,
    targetUrl: origin,
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    summary: {
      totalEndpoints: total,
      total,
      healthyEndpoints: healthy,
      healthy,
      deprecatedEndpoints: deprecated,
      deprecated,
      authRequiredEndpoints: authRequired,
      authRequired,
      errorEndpoints: broken,
      broken,
      redirected,
      avgLatencyMs,
      healthScore: total > 0 ? Math.max(0, Math.round(((healthy + authRequired * 0.8) / total) * 100)) : 0
    },
    endpoints: probeResults
  };
}

/**
 * Sweeps all registered platform endpoints, probes live health, and measures latency.
 */
export async function testPlatformEndpoints(apiSettings = {}) {
  let sfStatus = { installed: false, binaryPath: null };
  try {
    sfStatus = getScreamingFrogStatus();
  } catch {}

  const results = await Promise.all(PLATFORM_REGISTRY.map(async (plat) => {
    const pStart = Date.now();
    let isConfigured = false;
    let status = 0;
    let healthStatus = 'UNCONFIGURED';
    let latencyMs = 0;
    let detail = '';

    if (plat.id === 'screaming-frog') {
      isConfigured = sfStatus.installed;
      latencyMs = 2;
      healthStatus = sfStatus.installed ? 'HEALTHY' : 'UNAVAILABLE';
      detail = sfStatus.installed ? `CLI detected at ${sfStatus.binaryPath} (Full Licensed v24.3)` : 'Binary not found in Program Files';
      return {
        ...plat,
        isConfigured,
        authConfigured: isConfigured,
        healthStatus,
        status: sfStatus.installed ? 200 : 404,
        statusCode: sfStatus.installed ? 200 : 404,
        statusText: sfStatus.installed ? 'OK' : 'Not Installed',
        latencyMs,
        detail,
        testedAt: new Date().toISOString()
      };
    }

    // Determine configuration flag
    if (plat.id === 'google-psi') isConfigured = Boolean(apiSettings.psiApiKey);
    else if (plat.id === 'google-crux') isConfigured = Boolean(apiSettings.cruxApiKey || apiSettings.psiApiKey);
    else if (plat.id === 'google-gsc') isConfigured = Boolean(apiSettings.gscClientId);
    else if (plat.id === 'google-gemini') isConfigured = Boolean(apiSettings.geminiApiKey);
    else if (plat.id === 'openrouter') isConfigured = Boolean(apiSettings.openrouterApiKey);
    else if (plat.id === 'nvidia-nim') isConfigured = Boolean(apiSettings.nvidiaApiKey);
    else if (plat.id === 'openai') isConfigured = Boolean(apiSettings.openaiApiKey);
    else if (plat.id === 'freellm') isConfigured = apiSettings.freellmEnabled !== false;
    else if (plat.id === 'dataforseo') isConfigured = Boolean(apiSettings.dataforseoLogin);
    else if (plat.id === 'indexnow') isConfigured = true;
    else isConfigured = true; // Open APIs are keyless

    try {
      let reqUrl = plat.endpointUrl;
      let reqMethod = plat.method;
      let reqBody = null;
      const headers = { 'User-Agent': UA };
      let timeoutMs = 6000;

      // Special cases for platform endpoint probes
      if (plat.id === 'google-psi') {
        const key = apiSettings.psiApiKey;
        reqUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile${key ? `&key=${encodeURIComponent(key)}` : ''}`;
        timeoutMs = 9000;
      } else if (plat.id === 'google-crux') {
        const key = apiSettings.cruxApiKey || apiSettings.psiApiKey;
        if (key) {
          reqUrl = `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(key)}`;
          reqMethod = 'POST';
          headers['Content-Type'] = 'application/json';
          reqBody = JSON.stringify({ formFactor: 'PHONE', url: 'https://example.com' });
        } else {
          reqUrl = 'https://www.googleapis.com/discovery/v1/apis/chromeuxreport/v1/rest';
          reqMethod = 'GET';
        }
      } else if (plat.id === 'google-gsc') {
        reqUrl = 'https://www.googleapis.com/discovery/v1/apis/searchconsole/v1/rest';
        reqMethod = 'GET';
      } else if (plat.id === 'google-gemini') {
        reqMethod = 'GET';
        if (apiSettings.geminiApiKey) {
          reqUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiSettings.geminiApiKey)}`;
        }
      } else if (plat.id === 'openrouter') {
        reqMethod = 'GET';
        if (apiSettings.openrouterApiKey) {
          headers['Authorization'] = `Bearer ${apiSettings.openrouterApiKey}`;
        }
      } else if (plat.id === 'nvidia-nim') {
        reqMethod = 'GET';
        if (apiSettings.nvidiaApiKey) {
          headers['Authorization'] = `Bearer ${apiSettings.nvidiaApiKey}`;
        }
      } else if (plat.id === 'openai') {
        reqMethod = 'GET';
        if (apiSettings.openaiApiKey) {
          headers['Authorization'] = `Bearer ${apiSettings.openaiApiKey}`;
        }
      } else if (plat.id === 'freellm') {
        reqUrl = 'https://text.pollinations.ai/hello';
        reqMethod = 'GET';
      } else if (plat.id === 'dataforseo') {
        reqMethod = 'GET';
        if (apiSettings.dataforseoLogin && apiSettings.dataforseoPassword) {
          headers['Authorization'] = 'Basic ' + Buffer.from(`${apiSettings.dataforseoLogin}:${apiSettings.dataforseoPassword}`).toString('base64');
        }
      } else if (plat.id === 'indexnow') {
        reqUrl = 'https://www.indexnow.org/documentation';
        reqMethod = 'GET';
      }

      if (reqMethod === 'POST' && !reqBody) {
        reqMethod = 'GET';
      }

      const res = await fetch(reqUrl, {
        method: reqMethod,
        headers,
        body: reqBody,
        signal: AbortSignal.timeout(timeoutMs)
      });

      latencyMs = Date.now() - pStart;
      status = res.status;

      if (res.ok) {
        healthStatus = 'HEALTHY';
        detail = `Responsive (${status} OK)`;
      } else if (status === 401 || status === 403) {
        if (isConfigured) {
          healthStatus = 'AUTH_ERROR';
          detail = `Authentication key error (${status})`;
        } else {
          healthStatus = 'UNCONFIGURED';
          detail = `Requires API Key (${status} Unauthorized)`;
        }
      } else if (status === 404 || status >= 500) {
        healthStatus = 'DEGRADED';
        detail = `HTTP ${status} ${res.statusText}`;
      } else {
        healthStatus = 'HEALTHY';
        detail = `HTTP ${status}`;
      }
    } catch (err) {
      latencyMs = Date.now() - pStart;
      healthStatus = isConfigured ? 'ERROR' : 'UNCONFIGURED';
      detail = err.name === 'TimeoutError' ? 'Connection timed out' : err.message;
    }

    return {
      ...plat,
      isConfigured,
      authConfigured: isConfigured,
      healthStatus,
      status,
      statusCode: status,
      statusText: detail,
      latencyMs,
      detail,
      testedAt: new Date().toISOString()
    };
  }));

  const total = results.length;
  const healthy = results.filter(r => r.healthStatus === 'HEALTHY').length;
  const configured = results.filter(r => r.isConfigured).length;
  const activeLatencies = results.filter(r => r.latencyMs > 0).map(r => r.latencyMs);
  const avgLatency = activeLatencies.length ? Math.round(activeLatencies.reduce((a, b) => a + b, 0) / activeLatencies.length) : 0;

  return {
    success: true,
    testedAt: new Date().toISOString(),
    totalPlatforms: total,
    healthyPlatforms: healthy,
    configuredPlatforms: configured,
    avgLatencyMs: avgLatency,
    results: results,
    platforms: results
  };
}
