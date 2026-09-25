import { ERROR_KEY_SIGNALS, isRealApiData, YATRADHAM_PIPELINE_CONFIG } from '../server/adapters/yatradham_pipeline.js';
import fetch from 'node-fetch';

const BASE = process.env.BASE || 'http://localhost:4000';

async function runTests() {
  console.log('🧪 Starting YatraDham SEO Pipeline & is_real_fix Verification Suite...\n');
  let pass = 0, fail = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      pass++;
    } else {
      console.error(`❌ FAIL: ${name} [${extra}]`);
      fail++;
    }
  }

  // 1. is_real_fix.py validation rules
  console.log('--- 1. Strict is_real_data Validation Rules ---');
  assert('ERROR_KEY_SIGNALS contains standard error keys',
    ERROR_KEY_SIGNALS.has('error') &&
    ERROR_KEY_SIGNALS.has('errors') &&
    ERROR_KEY_SIGNALS.has('error_type') &&
    ERROR_KEY_SIGNALS.has('error_message') &&
    ERROR_KEY_SIGNALS.has('fault')
  );

  assert('200 OK with valid clean payload is real',
    isRealApiData(200, 'JSON', JSON.stringify({ results: [{ domain: 'yatradham.org', open_page_rank: 4.5 }] })) === true
  );

  assert('200 OK with {"error": "..."} payload is NOT real',
    isRealApiData(200, 'JSON', JSON.stringify({ error: 'Your account has run out of searches.' })) === false
  );

  assert('401 Unauthorized is NOT real even if valid JSON',
    isRealApiData(401, 'JSON', JSON.stringify({ message: 'Unauthorized' })) === false
  );

  assert('403 Forbidden is NOT real even if valid JSON',
    isRealApiData(403, 'JSON', JSON.stringify({ error: { code: 403, message: 'API not enabled' } })) === false
  );

  assert('429 Rate limited is NOT real',
    isRealApiData(429, 'JSON', JSON.stringify({ error: 'Too Many Requests' })) === false
  );

  assert('404 Not Found is NOT real',
    isRealApiData(404, 'HTML (404)', '<html>404 Not Found</html>') === false
  );

  assert('500 Server Error is NOT real',
    isRealApiData(500, 'JSON', JSON.stringify({ error: 'Internal Server Error' })) === false
  );

  assert('Empty array or empty body is NOT real',
    isRealApiData(200, 'JSON', '[]') === false &&
    isRealApiData(200, 'JSON', '{}') === false &&
    isRealApiData(200, 'JSON', '') === false
  );

  // 2. YatraDham Pipeline Catalog
  console.log('\n--- 2. YatraDham Pipeline Catalog & Endpoints Structure ---');
  assert('Pipeline config defines 10 core API groups',
    Object.keys(YATRADHAM_PIPELINE_CONFIG.groups).length === 10
  );

  const totalEndpointsInConfig = Object.values(YATRADHAM_PIPELINE_CONFIG.groups)
    .reduce((sum, g) => sum + (g.endpoints || []).length, 0);
  assert('Pipeline catalog contains exactly 21 endpoints',
    totalEndpointsInConfig === 21,
    `Found ${totalEndpointsInConfig}`
  );

  assert('Includes Google PageSpeed, CrUX, OpenPageRank, SerpApi, Ahrefs v3, Google Suggest, Datamuse',
    ['pagespeed_insights', 'crux', 'openpagerank_new', 'serpapi', 'ahrefs_v3', 'google_suggest', 'datamuse_lsi']
      .every(k => k in YATRADHAM_PIPELINE_CONFIG.groups)
  );

  // 3. Server Endpoints
  console.log('\n--- 3. Server REST APIs (/api/yatradham/*) ---');
  try {
    const epRes = await fetch(`${BASE}/api/yatradham/endpoints`);
    const epData = await epRes.json();
    assert('GET /api/yatradham/endpoints returns 200 with config',
      epRes.status === 200 && epData.success === true && !!epData.config
    );

    const skillRes = await fetch(`${BASE}/api/yatradham/skill`);
    const skillData = await skillRes.json();
    assert('GET /api/yatradham/skill returns full SKILL.md markdown',
      skillRes.status === 200 && skillData.success === true && typeof skillData.markdown === 'string' && skillData.markdown.length > 500
    );

    console.log('Testing live probe POST /api/yatradham/audit...');
    const auditRes = await fetch(`${BASE}/api/yatradham/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: 'yatradham.org',
        url: 'https://yatradham.org/dwarka-hotel-vandana.html',
        query: 'somnath temple room booking',
        delayMs: 20
      })
    });
    const auditData = await auditRes.json();
    assert('POST /api/yatradham/audit returns success with 21 endpoint results',
      auditRes.status === 200 && auditData.success === true && auditData.count === 21 && auditData.results.length === 21
    );

    assert('Audit stats correctly tally live, auth-blocked, deprecated, and rate-limited',
      typeof auditData.stats.liveUsable === 'number' &&
      typeof auditData.stats.authBlocked === 'number' &&
      typeof auditData.stats.deprecated === 'number' &&
      auditData.stats.deprecated === 2
    );

    assert('Free live endpoints (Google Suggest, Datamuse, OpenPageRank health) report 200 OK and isRealApi = true',
      auditData.results.some(r => r.path === '/complete/search' && r.status === 200 && r.isRealApi === true) &&
      auditData.results.some(r => r.path === '/words' && r.status === 200 && r.isRealApi === true) &&
      auditData.results.some(r => r.path === '/health' && r.status === 200 && r.isRealApi === true)
    );

    assert('Auth-restricted endpoints (CrUX/PageSpeed/Ahrefs) report isRealApi = false despite returning JSON error payloads',
      auditData.results.filter(r => r.status === 401 || r.status === 403).every(r => r.isRealApi === false)
    );

  } catch (err) {
    console.error('API call failed:', err);
    assert('Server APIs accessible', false, err.message);
  }

  console.log(`\n=============================================`);
  console.log(`Summary: ${pass} passed, ${fail} failed`);
  console.log(`=============================================`);

  if (fail > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
