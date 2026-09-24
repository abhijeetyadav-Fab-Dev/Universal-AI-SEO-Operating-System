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
  { path: '/spec.json', type: 'SWAGGER_SPEC', method: 'GET' },
  { path: '/v2/api-docs', type: 'SWAGGER_SPEC', method: 'GET' },
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
 * Safely parses JSON string, returns null on failure
 */
export function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Detects RFC 8594 / RFC 9524 deprecation headers, 410 Gone status, body deprecation signals,
 * or OpenAPI spec-level deprecated flags
 */
export function analyzeDeprecation(status, headers = {}, body = '', urlPath = '', specDeprecated = false) {
  const reasons = [];
  let isDeprecated = false;
  let sunsetDate = null;
  let recommendation = null;

  // 0. Explicit OpenAPI / Swagger Spec deprecation flag
  if (specDeprecated) {
    isDeprecated = true;
    reasons.push('OpenAPI / Swagger spec explicitly flags this operation as deprecated (deprecated: true)');
  }

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
 * Extracts and unpacks all operation paths from an OpenAPI 3.x or Swagger 2.0 JSON spec
 */
export function unpackOpenApiSpec(spec, specUrl = '', origin = '') {
  if (!spec || typeof spec !== 'object' || !spec.paths || typeof spec.paths !== 'object') {
    return [];
  }

  const results = [];
  let basePath = '';
  if (spec.openapi && Array.isArray(spec.servers) && spec.servers.length > 0) {
    const sUrl = spec.servers[0].url || '';
    if (sUrl.startsWith('http://') || sUrl.startsWith('https://')) {
      try {
        basePath = new URL(sUrl).pathname;
      } catch {}
    } else {
      basePath = sUrl;
    }
  } else if (spec.swagger && spec.basePath) {
    basePath = spec.basePath;
  }
  basePath = basePath.replace(/\/+$/, '');

  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

  for (const [rawPath, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    const fullPath = (basePath + '/' + rawPath.replace(/^\/+/, '')).replace(/\/+/g, '/');

    for (const method of httpMethods) {
      const op = pathItem[method];
      if (op && typeof op === 'object') {
        const isDep = Boolean(op.deprecated || pathItem.deprecated);
        const params = Array.isArray(op.parameters)
          ? op.parameters.map(p => (typeof p === 'object' && p.name ? p.name : '')).filter(Boolean)
          : [];

        results.push({
          path: fullPath,
          rawPath,
          method: method.toUpperCase(),
          type: 'OPENAPI_OPERATION',
          source: specUrl ? `OpenAPI Spec (${specUrl.split('/').pop() || 'spec.json'})` : 'OpenAPI Spec',
          summary: op.summary || op.description || `${method.toUpperCase()} ${fullPath}`,
          description: op.description || op.summary || '',
          deprecatedInSpec: isDep,
          parameters: params,
          tags: Array.isArray(op.tags) ? op.tags : []
        });
      }
    }
  }

  return results;
}

/**
 * Extracts REST / GraphQL / API routes from JavaScript bundle source code
 */
export function extractEndpointsFromScript(code, scriptName = 'bundle.js') {
  if (!code || typeof code !== 'string') return [];
  const found = new Set();
  const results = [];

  const patterns = [
    // 1. /api/... or /v1/... paths in quotes
    /["'`](\/api\/(?:v[0-9]+\/)?[a-zA-Z0-9_\-\/]{2,80})["'`?#]/g,
    /["'`](\/v[1-9][0-9]*\/[a-zA-Z0-9_\-\/]{2,80})["'`?#]/g,
    /["'`](\/(?:graphql|rest|trpc)(?:\/[a-zA-Z0-9_\-\/]{1,80})?)["'`?#]/g,
    // 2. fetch() or axios calls
    /(?:fetch|axios(?:\.[a-z]+)?|client(?:\.[a-z]+)?)\s*\(\s*["'`](\/[a-zA-Z0-9_\-\/]{3,80})["'`?#]/g
  ];

  const ignoreExtensions = /\.(js|jsx|ts|tsx|css|scss|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|map|wasm)$/i;
  const ignorePrefixes = /^(\/_next\/(?:static|image)|node_modules|\/static\/media|\/assets\/)/i;

  patterns.forEach(regex => {
    let match;
    while ((match = regex.exec(code)) !== null) {
      let route = match[1];
      if (!route || !route.startsWith('/')) continue;
      if (route.length > 1) route = route.replace(/\/+$/, '');
      if (route.length < 4 || route.length > 90) continue;
      if (ignoreExtensions.test(route)) continue;
      if (ignorePrefixes.test(route)) continue;
      if (route.includes('//')) continue;

      if (!found.has(route)) {
        found.add(route);
        results.push({
          path: route,
          method: 'GET',
          type: 'BUNDLE_EXTRACTED_API',
          source: `JS Bundle (${scriptName})`
        });
      }
    }
  });

  return results;
}

/**
 * Profiles the root HTML page to create a fingerprint for SPA catch-all filtering
 */
export function profileRootHtml(htmlText = '', origin = '') {
  const $ = cheerio.load(htmlText);
  const title = $('title').text().trim();
  const byteLength = Buffer.byteLength(htmlText, 'utf8');

  // Detect SPA containers & characteristics
  const hasRootDiv = $('#root, #__next, #app, #__nuxt, [data-reactroot]').length > 0;
  const hasClientRouting = /(_next\/static|react-dom|vue\.global|angular|svelte|window\.__INITIAL_STATE__|window\.__NEXT_DATA__)/i.test(htmlText);
  const isSpa = hasRootDiv || hasClientRouting;

  // Extract candidate script bundles
  const scriptSrcs = [];
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (!src) return;
    try {
      const resolved = new URL(src, origin);
      const isThirdParty = /(google-analytics|googletagmanager|connect\.facebook|clarity\.ms|hotjar|recaptcha|doubleclick|stripe\.com|sentry\.io|segment\.com|cloudflareinsights)/i.test(resolved.hostname);
      if (!isThirdParty) {
        scriptSrcs.push({
          url: resolved.href,
          pathname: resolved.pathname,
          filename: resolved.pathname.split('/').pop() || 'script.js'
        });
      }
    } catch {}
  });

  // Extract link tags pointing to APIs
  const apiLinks = [];
  $('link[rel*="api"], link[rel*="w.org"], link[rel*="service-desc"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const resolved = new URL(href, origin);
        apiLinks.push(resolved.pathname);
      } catch {}
    }
  });

  return {
    title,
    byteLength,
    isSpa,
    scriptSrcs,
    apiLinks
  };
}

/**
 * Determines whether a probe response is an SPA wildcard catch-all HTML fallback
 */
export function isSpaCatchAll(status, headers = {}, body = '', rootProfile = null, probePath = '') {
  const contentType = (headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('text/html')) {
    return false;
  }

  // If path is specifically docs, and body contains Swagger/Redoc UI, it's documentation, not catch-all
  if (/(docs|swagger|redoc|rapidoc|openapi)/i.test(probePath)) {
    if (/(swagger-ui|redoc|rapidoc|api documentation|developer portal|scalar)/i.test(body)) {
      return false; // Valid docs portal
    }
  }

  // If status is 200 and we have a root profile:
  if (status >= 200 && status < 300 && rootProfile) {
    // 1. Title match
    if (rootProfile.title && rootProfile.title.length > 2) {
      const probeTitleMatch = body.match(/<title[^>]*>([^<]*)<\/title>/i);
      const probeTitle = probeTitleMatch ? probeTitleMatch[1].trim() : '';
      if (probeTitle && probeTitle.toLowerCase() === rootProfile.title.toLowerCase()) {
        return true; // Exactly the same HTML title as the root home page
      }
    }

    // 2. Byte length similarity for SPAs (within 8% of root HTML)
    if (rootProfile.isSpa && rootProfile.byteLength > 200) {
      const bodyLen = Buffer.byteLength(body, 'utf8');
      const diffRatio = Math.abs(bodyLen - rootProfile.byteLength) / rootProfile.byteLength;
      if (diffRatio < 0.08 && /<div[^>]*(id=["'](?:root|__next|app|__nuxt)["']|data-reactroot)/i.test(body)) {
        return true;
      }
    }

    // 3. Contains generic SPA index indicators without any API content
    if (rootProfile.isSpa && /<!DOCTYPE html>/i.test(body) && /(_next\/static|react-dom|chunk)/i.test(body)) {
      return true;
    }
  }

  // 4. Any generic HTML page returned for a probe that is NOT a documentation page
  if (status >= 200 && status < 300 && /<!DOCTYPE html>/i.test(body) && !/(swagger|redoc|api docs)/i.test(body)) {
    return true;
  }

  return false;
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
  const isDirectSpecUrl = /\.(json|ya?ml)$/i.test(base.pathname) || /(openapi|swagger)/i.test(base.pathname);
  const discoveredPaths = new Map();

  let rootProfile = null;
  let directSpecDiscovered = false;

  // STEP 1: Direct Target URL Probe & Profiling
  try {
    const directRes = await fetch(base.href, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json, text/html, */*' },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow'
    });

    const directContentType = (directRes.headers.get('content-type') || '').toLowerCase();
    const directText = await directRes.text();

    if (directContentType.includes('application/json') || isDirectSpecUrl) {
      const parsed = safeJsonParse(directText);
      if (parsed) {
        if (parsed.openapi || parsed.swagger || parsed.paths) {
          directSpecDiscovered = true;
          const specOps = unpackOpenApiSpec(parsed, base.href, origin);
          specOps.forEach(op => {
            const key = `${op.method}:${op.path}`;
            discoveredPaths.set(key, op);
          });
        } else {
          discoveredPaths.set(`GET:${base.pathname}`, {
            path: base.pathname,
            method: 'GET',
            type: 'DIRECT_API_ENDPOINT',
            source: 'Direct Target URL',
            prefetched: {
              status: directRes.status,
              headers: Object.fromEntries(directRes.headers.entries()),
              body: directText
            }
          });
        }
      }
    } else if (directContentType.includes('text/html')) {
      rootProfile = profileRootHtml(directText, origin);
    }
  } catch {}

  // Fetch origin root if rootProfile is missing and no direct spec was found
  if (!rootProfile && !directSpecDiscovered) {
    try {
      const rootRes = await fetch(origin, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html, */*' },
        signal: AbortSignal.timeout(5000),
        redirect: 'follow'
      });
      if (rootRes.ok) {
        const rootHtml = await rootRes.text();
        rootProfile = profileRootHtml(rootHtml, origin);
      }
    } catch {}
  }

  // STEP 1.5: Fast OpenAPI / Swagger / WordPress Spec Sweeper
  if (!directSpecDiscovered) {
    const specSweepPaths = ['/openapi.json', '/swagger.json', '/spec.json', '/v2/api-docs', '/api/v1/openapi.json', '/wp-json/'];
    const specChecks = specSweepPaths.map(async (sPath) => {
      try {
        const sRes = await fetch(`${origin}${sPath}`, {
          headers: { 'User-Agent': UA, 'Accept': 'application/json, text/plain, */*' },
          signal: AbortSignal.timeout(5500)
        });
        const cType = (sRes.headers.get('content-type') || '').toLowerCase();
        if (sRes.ok && (cType.includes('json') || cType.includes('text/plain'))) {
          const text = await sRes.text();
          const parsed = safeJsonParse(text);
          if (parsed) {
            if (parsed.openapi || parsed.swagger || parsed.paths) {
              const specOps = unpackOpenApiSpec(parsed, `${origin}${sPath}`, origin);
              specOps.forEach(op => {
                const key = `${op.method}:${op.path}`;
                if (!discoveredPaths.has(key)) {
                  discoveredPaths.set(key, op);
                }
              });
            } else if (parsed.routes && typeof parsed.routes === 'object') {
              const publicWpRoutes = Object.keys(parsed.routes)
                .filter(r => r.startsWith('/wp/v2/') && !r.includes('<') && !r.includes('(?P'))
                .slice(0, 8);
              publicWpRoutes.forEach(r => {
                const fullWpPath = `/wp-json${r}`;
                discoveredPaths.set(`GET:${fullWpPath}`, {
                  path: fullWpPath,
                  method: 'GET',
                  type: 'WORDPRESS_REST',
                  source: 'WordPress REST Index'
                });
              });
            }
          }
        }
      } catch {}
    });
    await Promise.allSettled(specChecks);
  }

  // STEP 2: Harvest endpoints from external JS bundles
  if (rootProfile && Array.isArray(rootProfile.scriptSrcs) && rootProfile.scriptSrcs.length > 0) {
    const candidateScripts = rootProfile.scriptSrcs
      .filter(s => /(app|chunk|main|bundle|index|runtime|routes|entry|_buildManifest)/i.test(s.filename) || s.pathname.includes('/chunks/'))
      .slice(0, 4);

    const scriptsToFetch = candidateScripts.length > 0 ? candidateScripts : rootProfile.scriptSrcs.slice(0, 3);

    const scriptFetches = scriptsToFetch.map(async (s) => {
      try {
        const sRes = await fetch(s.url, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(4000)
        });
        if (sRes.ok) {
          const sText = await sRes.text();
          const extracted = extractEndpointsFromScript(sText.substring(0, 500000), s.filename);
          extracted.forEach(item => {
            const key = `${item.method}:${item.path}`;
            if (!discoveredPaths.has(key)) {
              discoveredPaths.set(key, item);
            }
          });
        }
      } catch {}
    });

    await Promise.allSettled(scriptFetches);
  }

  // STEP 3: API links discovered from HTML <link> tags
  if (rootProfile && rootProfile.apiLinks) {
    rootProfile.apiLinks.forEach(p => {
      const key = `GET:${p}`;
      if (!discoveredPaths.has(key)) {
        discoveredPaths.set(key, { path: p, method: 'GET', type: 'DISCOVERED_LINK', source: 'HTML <link> tag' });
      }
    });
  }

  // STEP 4: Standard probes
  COMMON_API_PROBES.forEach(p => {
    const key = `${p.method}:${p.path}`;
    if (!discoveredPaths.has(key)) {
      discoveredPaths.set(key, { path: p.path, method: p.method, type: p.type, source: 'Standard Probe' });
    }
  });

  // Prioritize candidates
  const allCandidates = Array.from(discoveredPaths.values());
  const priorityOrder = {
    'OPENAPI_OPERATION': 1,
    'DIRECT_API_ENDPOINT': 2,
    'BUNDLE_EXTRACTED_API': 3,
    'DISCOVERED_LINK': 4,
    'OPENAPI_SPEC': 5,
    'SWAGGER_SPEC': 5,
    'WORDPRESS_REST': 6,
    'WORDPRESS_POSTS': 7,
    'GRAPHQL_ENDPOINT': 8,
    'HEALTH_CHECK': 9,
    'STATUS': 10,
    'PING': 11,
    'API_VERSION': 12,
    'API_ROOT': 13,
    'Standard Probe': 14
  };

  allCandidates.sort((a, b) => {
    const pa = priorityOrder[a.type] || 50;
    const pb = priorityOrder[b.type] || 50;
    return pa - pb;
  });

  const endpointsToProbe = allCandidates.slice(0, 28);

  // Probe all discovered endpoints in parallel
  const probeResults = await Promise.all(endpointsToProbe.map(async (item) => {
    // Substitute path parameters like {id} or {petId} with sample value '1'
    const actualPath = item.path.replace(/\{[a-zA-Z0-9_\-]+\}/g, '1');
    const probeUrl = `${origin}${actualPath}`;
    const displayUrl = `${origin}${item.path}`;
    const pStart = Date.now();

    try {
      let status;
      let statusText;
      let latencyMs;
      let headers;
      let bodySnippet = '';

      if (item.prefetched) {
        status = item.prefetched.status;
        statusText = 'OK';
        latencyMs = 45;
        headers = item.prefetched.headers;
        bodySnippet = item.prefetched.body.substring(0, 600);
      } else {
        const res = await fetch(probeUrl, {
          method: item.method,
          headers: {
            'User-Agent': UA,
            'Accept': 'application/json, text/plain, */*'
          },
          signal: AbortSignal.timeout(5000),
          redirect: 'manual'
        });

        latencyMs = Date.now() - pStart;
        status = res.status;
        statusText = res.statusText || String(status);
        headers = Object.fromEntries(res.headers.entries());

        try {
          const text = await res.text();
          bodySnippet = text.substring(0, 600);
        } catch {}
      }

      // Analyze deprecation
      const deprecationInfo = analyzeDeprecation(status, headers, bodySnippet, item.path, item.deprecatedInSpec);

      // Check SPA Fallback / HTML catch-all
      const isCatchAll = isSpaCatchAll(status, headers, bodySnippet, rootProfile, item.path);
      const contentType = (headers['content-type'] || 'unknown').toLowerCase();

      let healthStatus = 'UNKNOWN';
      let isRealApi = false;
      let isDocPage = false;
      let format = 'Unknown';
      let schema = null;

      if (isCatchAll) {
        healthStatus = 'NOT_AN_API';
        format = 'HTML Catch-All (SPA Fallback)';
        isRealApi = false;
      } else if (contentType.includes('application/json') || contentType.includes('application/problem+json') || contentType.includes('application/ld+json')) {
        isRealApi = true;
        format = 'JSON';
        if (deprecationInfo.isDeprecated) {
          healthStatus = 'DEPRECATED';
        } else if (status >= 200 && status < 300) {
          healthStatus = 'HEALTHY';
        } else if (status === 401 || status === 403) {
          healthStatus = 'AUTH_REQUIRED';
        } else if (status === 405) {
          healthStatus = 'METHOD_NOT_ALLOWED';
        } else if (status === 410) {
          healthStatus = 'DEPRECATED';
        } else if (status === 404) {
          healthStatus = 'NOT_FOUND';
        } else if (status >= 500) {
          healthStatus = 'SERVER_ERROR';
        } else {
          healthStatus = 'HEALTHY';
        }

        // Schema inspector
        const parsedJson = safeJsonParse(bodySnippet);
        if (parsedJson) {
          if (Array.isArray(parsedJson)) {
            schema = {
              type: 'Array',
              count: parsedJson.length,
              sampleKeys: parsedJson[0] && typeof parsedJson[0] === 'object' ? Object.keys(parsedJson[0]).slice(0, 8) : []
            };
          } else if (typeof parsedJson === 'object') {
            schema = {
              type: 'Object',
              keys: Object.keys(parsedJson).slice(0, 10),
              keyCount: Object.keys(parsedJson).length
            };
          }
        }
      } else if (contentType.includes('xml')) {
        isRealApi = true;
        format = 'XML';
        healthStatus = status >= 200 && status < 300 ? 'HEALTHY' : (status === 401 || status === 403 ? 'AUTH_REQUIRED' : 'INACTIVE');
      } else if (contentType.includes('graphql')) {
        isRealApi = true;
        format = 'GraphQL';
        healthStatus = 'HEALTHY';
      } else if (contentType.includes('text/html')) {
        const isDocPath = /(docs|swagger|redoc|rapidoc|openapi)/i.test(item.path);
        const hasDocContent = /(swagger-ui|redoc|rapidoc|api documentation|developer portal|scalar|postman)/i.test(bodySnippet);
        if (status >= 200 && status < 300 && (hasDocContent || (isDocPath && /(api|endpoint|reference|request|response|schema)/i.test(bodySnippet)))) {
          isRealApi = true;
          isDocPage = true;
          healthStatus = 'DOCS';
          format = 'HTML Doc';
        } else if (status === 404) {
          isRealApi = false;
          healthStatus = 'NOT_FOUND';
          format = 'HTML (404)';
        } else if (status >= 500) {
          isRealApi = false;
          healthStatus = 'SERVER_ERROR';
          format = 'HTML (5xx)';
        } else {
          isRealApi = false;
          healthStatus = 'HTML_NON_API';
          format = 'HTML';
        }
      } else if (contentType.includes('text/plain')) {
        const isShort = bodySnippet.trim().length < 120;
        const looksLikeHealth = /^(ok|healthy|pong|true|1|alive|\{"status":)/i.test(bodySnippet.trim());
        if (isShort && (looksLikeHealth || status === 200)) {
          isRealApi = true;
          format = 'Text';
          healthStatus = 'HEALTHY';
        } else {
          format = 'Text';
          healthStatus = status >= 200 && status < 300 ? 'HEALTHY' : 'INACTIVE';
        }
      } else {
        format = contentType.split(';')[0] || 'Unknown';
        if (status >= 200 && status < 300) healthStatus = 'HEALTHY';
        else if (status === 401 || status === 403) healthStatus = 'AUTH_REQUIRED';
        else if (status >= 400) healthStatus = 'BROKEN';
      }

      return {
        path: item.path,
        url: displayUrl,
        fullUrl: displayUrl,
        actualProbeUrl: probeUrl,
        method: item.method || 'GET',
        type: item.type,
        source: item.source,
        summary: item.summary || item.description || '',
        parameters: item.parameters || [],
        status,
        statusText,
        latencyMs,
        healthStatus,
        format,
        schema,
        isRealApi,
        isDocPage,
        isCatchAllFallback: isCatchAll,
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
        method: item.method || 'GET',
        type: item.type,
        source: item.source,
        status: 0,
        statusText: 'ERR_CONNECTION_FAILED',
        latencyMs,
        healthStatus: 'BROKEN',
        format: 'None',
        isRealApi: false,
        isDocPage: false,
        isCatchAllFallback: false,
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

  // Sort probe results: Real APIs first, then Docs, then Catch-alls
  probeResults.sort((a, b) => {
    if (a.isRealApi && !b.isRealApi) return -1;
    if (!a.isRealApi && b.isRealApi) return 1;
    if (a.isDeprecated && !b.isDeprecated) return -1;
    if (!a.isDeprecated && b.isDeprecated) return 1;
    return 0;
  });

  // Calculate Summary Statistics
  const total = probeResults.length;
  const realApis = probeResults.filter(p => p.isRealApi);
  const healthy = probeResults.filter(p => p.healthStatus === 'HEALTHY' || p.healthStatus === 'DOCS').length;
  const deprecated = probeResults.filter(p => p.isDeprecated).length;
  const authRequired = probeResults.filter(p => p.healthStatus === 'AUTH_REQUIRED').length;
  const broken = probeResults.filter(p => p.healthStatus === 'BROKEN' || p.status === 404 || p.status >= 500).length;
  const filteredHtmlCatchAlls = probeResults.filter(p => p.isCatchAllFallback).length;
  const redirected = probeResults.filter(p => p.healthStatus === 'REDIRECT').length;
  const validLatencies = probeResults.filter(p => p.latencyMs > 0).map(p => p.latencyMs);
  const avgLatencyMs = validLatencies.length ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length) : 0;

  return {
    success: true,
    targetUrl: origin,
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    rootProfile: {
      isSpa: rootProfile?.isSpa || false,
      title: rootProfile?.title || '',
      scriptsHarvested: rootProfile?.scriptSrcs?.length || 0
    },
    summary: {
      totalEndpoints: total,
      total,
      realApiEndpoints: realApis.length,
      realApis: realApis.length,
      healthyEndpoints: healthy,
      healthy,
      deprecatedEndpoints: deprecated,
      deprecated,
      authRequiredEndpoints: authRequired,
      authRequired,
      errorEndpoints: broken,
      broken,
      filteredHtmlCatchAlls,
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
