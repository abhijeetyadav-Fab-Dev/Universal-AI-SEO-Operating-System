/**
 * ==============================================================================
 * OmniSEO-OS Developer Debug Console & Telemetry Test Suite
 * Validates:
 * 1. GET /api/debug/state returns live process memory, uptime, platform, providers
 * 2. POST /api/debug/log logs custom client messages with timestamp & level
 * 3. GET /api/debug/logs retrieves rolling buffer entries with level & limit filters
 * 4. Automatic API request logging & latency interceptor
 * 5. POST /api/debug/clear resets the rolling log buffer
 * 6. GET /api/health advertises Debug Console capability
 *
 * Usage: node test/test_debug_console.js
 * Expected: Exit code 0
 * ==============================================================================
 */

import http from 'http';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  }
  passed++;
  console.log(`  ✅ PASS: ${message}`);
}

const httpRequest = (options, postData = null) => new Promise((resolve, reject) => {
  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
      } catch {
        resolve({ status: res.statusCode, headers: res.headers, text: body });
      }
    });
  });
  req.on('error', reject);
  if (postData) {
    req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
  }
  req.end();
});

async function runTestSuite() {
  console.log('🧪 Starting OmniSEO-OS Developer Debug Console & Telemetry Test Suite...\n');

  // Test 1: GET /api/debug/state
  console.log('Test 1: System Telemetry & Process State (/api/debug/state)...');
  const stateRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/debug/state',
    method: 'GET'
  });
  assert(stateRes.status === 200, 'GET /api/debug/state returns HTTP 200');
  assert(stateRes.data.success === true, 'Telemetry response indicates success');
  assert(typeof stateRes.data.server.uptimeSec === 'number', 'Server uptimeSec is a valid number');
  assert(stateRes.data.server.nodeVersion.startsWith('v'), 'Server reports valid Node.js version');
  assert(stateRes.data.server.memory.rssMb > 0, 'Server reports non-zero RSS memory');
  assert(stateRes.data.server.memory.heapUsedMb > 0, 'Server reports non-zero heapUsed memory');
  assert(typeof stateRes.data.providers === 'object', 'Server reports providers status object');
  assert(typeof stateRes.data.providers.screamingFrog === 'boolean', 'Screaming frog provider flag is boolean');
  assert(typeof stateRes.data.activeConfig.port !== 'undefined', 'Active config reports server port');

  // Test 2: POST /api/debug/log
  console.log('\nTest 2: Client Log Injection (/api/debug/log)...');
  const logMsg = `Test diagnostic message ${Date.now()}`;
  const logRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/debug/log',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    level: 'warn',
    message: logMsg,
    meta: { testRunner: 'test_debug_console.js', code: 200 }
  });
  assert(logRes.status === 200, 'POST /api/debug/log returns HTTP 200');
  assert(logRes.data.success === true, 'POST /api/debug/log returns success: true');
  assert(logRes.data.entry && logRes.data.entry.level === 'warn', 'Logged entry preserves level');
  assert(logRes.data.entry.message.includes(logMsg), 'Logged entry preserves message text');

  // Test 3: GET /api/debug/logs retrieval and filtering
  console.log('\nTest 3: Log Buffer Retrieval & Filtering (/api/debug/logs)...');
  const getLogsRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/debug/logs?limit=50',
    method: 'GET'
  });
  assert(getLogsRes.status === 200, 'GET /api/debug/logs returns HTTP 200');
  assert(getLogsRes.data.success === true, 'GET /api/debug/logs returns success: true');
  assert(Array.isArray(getLogsRes.data.logs), 'Logs field is an array');
  assert(getLogsRes.data.logs.some(l => l.message.includes(logMsg)), 'Logged message is found in buffer');

  // Test 4: Level filter
  console.log('\nTest 4: Log Buffer Level Filtering (?level=warn)...');
  const warnLogsRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/debug/logs?level=warn',
    method: 'GET'
  });
  assert(warnLogsRes.status === 200, 'GET /api/debug/logs?level=warn returns HTTP 200');
  assert(warnLogsRes.data.logs.every(l => l.level === 'warn'), 'All returned logs match warn level');

  // Test 5: Automatic API request recording
  console.log('\nTest 5: Automatic API Request Interceptor...');
  await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/settings',
    method: 'GET'
  });
  const networkLogsRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/debug/logs?limit=20',
    method: 'GET'
  });
  const foundRecordedReq = networkLogsRes.data.logs.some(l => l.message.includes('GET /api/settings'));
  assert(foundRecordedReq, 'Interceptor automatically recorded GET /api/settings');

  // Test 6: POST /api/debug/clear
  console.log('\nTest 6: Clearing Debug Log Buffer (/api/debug/clear)...');
  const clearRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/debug/clear',
    method: 'POST'
  });
  assert(clearRes.status === 200, 'POST /api/debug/clear returns HTTP 200');
  assert(clearRes.data.success === true, 'POST /api/debug/clear returns success: true');

  const afterClearLogs = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/debug/logs',
    method: 'GET'
  });
  assert(afterClearLogs.data.logs.length <= 2, 'Log buffer is cleared (contains only reset notice)');

  // Test 7: GET /api/health advertising Debug Console
  console.log('\nTest 7: Health Check Capability Verification...');
  const healthRes = await httpRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/health',
    method: 'GET'
  });
  assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
  assert(healthRes.data.capabilities.some(c => c.includes('Debug Console')), 'Health check advertises Debug Console capability');

  console.log(`\n==============================================================================`);
  console.log(`🎉 ALL DEBUG CONSOLE TESTS PASSED: ${passed}/${total} assertions verified!`);
  console.log(`==============================================================================\n`);
}

runTestSuite().catch(err => {
  console.error('\n❌ DEBUG CONSOLE TEST SUITE FAILED:', err);
  process.exit(1);
});
