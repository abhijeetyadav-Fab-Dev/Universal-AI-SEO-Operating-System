/**
 * ==============================================================================
 * OmniSEO-OS MCP Server Verification Test Suite
 * Tests tool discovery, schema definitions, JSON-RPC 2.0 handshake,
 * tool execution, and child process stdio communication.
 *
 * Usage: node test/test_mcp.js
 * Expected: Exit code 0
 * ==============================================================================
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

import { TOOLS, handleToolCall, handleJsonRpcMessage } from '../server/mcp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MCP_SERVER_PATH = path.join(__dirname, '../server/mcp.js');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`  ✅ PASS: ${message}`);
}

async function runMcpTestSuite() {
  console.log('='.repeat(72));
  console.log('🧪 STARTING OMNISEO-OS MCP SERVER AUTOMATED TEST SUITE');
  console.log('='.repeat(72));

  // ─────────────────────────────────────────────────────────────────
  // TEST SECTION 1: Tool Discovery & Schema Definitions
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[SECTION 1] Tool Discovery & Schema Validation...');

  const expectedTools = [
    'audit_url',
    'get_cwv',
    'get_backlinks',
    'check_geo',
    'get_open_intel'
  ];

  assert(Array.isArray(TOOLS), 'TOOLS export is an array');
  assert(TOOLS.length === 5, `Expected 5 tools, found ${TOOLS.length}`);

  for (const expectedName of expectedTools) {
    const tool = TOOLS.find(t => t.name === expectedName);
    assert(!!tool, `Tool '${expectedName}' is registered in TOOLS list`);
    assert(typeof tool.description === 'string' && tool.description.length > 20, `Tool '${expectedName}' has a descriptive documentation string`);
    assert(tool.inputSchema && tool.inputSchema.type === 'object', `Tool '${expectedName}' has an object inputSchema`);
    assert(tool.inputSchema.properties && typeof tool.inputSchema.properties === 'object', `Tool '${expectedName}' declares schema properties`);
  }

  // Verify specific input schemas
  const auditTool = TOOLS.find(t => t.name === 'audit_url');
  assert('url' in auditTool.inputSchema.properties, 'audit_url specifies url parameter');
  assert(auditTool.inputSchema.required.includes('url'), 'audit_url marks url as required');

  const cwvTool = TOOLS.find(t => t.name === 'get_cwv');
  assert('url' in cwvTool.inputSchema.properties, 'get_cwv specifies url parameter');
  assert(cwvTool.inputSchema.required.includes('url'), 'get_cwv marks url as required');
  assert('strategy' in cwvTool.inputSchema.properties, 'get_cwv specifies strategy parameter');

  const backlinksTool = TOOLS.find(t => t.name === 'get_backlinks');
  assert('domain' in backlinksTool.inputSchema.properties, 'get_backlinks specifies domain parameter');
  assert(backlinksTool.inputSchema.required.includes('domain'), 'get_backlinks marks domain as required');

  const geoTool = TOOLS.find(t => t.name === 'check_geo');
  assert('url' in geoTool.inputSchema.properties, 'check_geo specifies url parameter');
  assert(geoTool.inputSchema.required.includes('url'), 'check_geo marks url as required');

  const openIntelTool = TOOLS.find(t => t.name === 'get_open_intel');
  assert('domain' in openIntelTool.inputSchema.properties, 'get_open_intel specifies domain parameter');
  assert(openIntelTool.inputSchema.required.includes('domain'), 'get_open_intel marks domain as required');

  // ─────────────────────────────────────────────────────────────────
  // TEST SECTION 2: JSON-RPC 2.0 Protocol In-Memory Handling
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[SECTION 2] JSON-RPC 2.0 Protocol Engine Verification...');

  // 2.1 Initialize
  const initRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  });
  assert(initRes.jsonrpc === '2.0', 'Initialize response has jsonrpc 2.0');
  assert(initRes.id === 1, 'Initialize response preserves request id 1');
  assert(initRes.result?.protocolVersion === '2024-11-05', 'Initialize specifies protocol version 2024-11-05');
  assert(initRes.result?.serverInfo?.name === 'omniseo-os-mcp', 'Initialize identifies as omniseo-os-mcp');
  assert(!!initRes.result?.capabilities?.tools, 'Initialize advertises tools capability');

  // 2.2 Initialized Notification
  const notifRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    method: 'notifications/initialized'
  });
  assert(notifRes === null, 'Initialized notification returns null (no RPC response expected)');

  // 2.3 Ping
  const pingRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 2,
    method: 'ping'
  });
  assert(pingRes.id === 2 && typeof pingRes.result === 'object', 'Ping request returns empty result object');

  // 2.4 Tools/list
  const toolsListRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/list',
    params: {}
  });
  assert(Array.isArray(toolsListRes.result?.tools), 'tools/list returns tools array');
  assert(toolsListRes.result.tools.length === 5, 'tools/list returns all 5 tools');

  // 2.5 Unknown Method Handling
  const unknownRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 4,
    method: 'non_existent_method',
    params: {}
  });
  assert(unknownRes.error?.code === -32601, 'Unknown method returns code -32601');

  // 2.6 Malformed JSON string parsing
  const parseErrRes = await handleJsonRpcMessage('{"malformed": invalid}');
  assert(parseErrRes.error?.code === -32700, 'Malformed JSON returns code -32700');

  // ─────────────────────────────────────────────────────────────────
  // TEST SECTION 3: Tool Execution & Error Handling
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[SECTION 3] Direct Tool Execution & Error Handling...');

  // 3.1 get_open_intel Tool
  console.log('  Testing tool get_open_intel...');
  const openIntelOutput = await handleToolCall('get_open_intel', { domain: 'example.com' });
  assert(openIntelOutput.success === true, 'get_open_intel returned success: true');
  assert(openIntelOutput.domain === 'example.com', 'get_open_intel confirmed domain: example.com');
  assert(openIntelOutput.openEndpoints !== undefined, 'get_open_intel returned openEndpoints map');
  assert('icannRdap' in openIntelOutput.openEndpoints, 'openEndpoints contains icannRdap');
  assert('googleDns' in openIntelOutput.openEndpoints, 'openEndpoints contains googleDns');

  // 3.2 check_geo Tool
  const geoOutput = await handleToolCall('check_geo', { url: 'https://example.com' });
  assert(geoOutput && typeof geoOutput === 'object', 'check_geo returned valid audit object');
  assert('overallGeoScore' in geoOutput || 'entityReadiness' in geoOutput, 'check_geo returned overallGeoScore or entityReadiness');

  // 3.3 audit_url Tool
  console.log('  Testing tool audit_url...');
  const auditOutput = await handleToolCall('audit_url', { url: 'https://example.com', maxPages: 1 });
  assert(auditOutput && typeof auditOutput === 'object', 'audit_url returned valid technical audit object');
  assert(typeof auditOutput.score === 'number', `audit_url score returned: ${auditOutput.score}`);
  assert('seoMeta' in auditOutput, 'audit_url contains seoMeta signals');

  // 3.4 get_cwv Tool (with fallback verification)
  console.log('  Testing tool get_cwv...');
  const cwvOutput = await handleToolCall('get_cwv', { url: 'https://example.com' });
  assert(cwvOutput && typeof cwvOutput === 'object', 'get_cwv returned structured payload');
  assert('dataStatus' in cwvOutput || 'performanceScore' in cwvOutput, 'get_cwv has dataStatus or score');

  // 3.5 get_backlinks Tool
  console.log('  Testing tool get_backlinks...');
  const backlinksOutput = await handleToolCall('get_backlinks', { domain: 'example.com' });
  assert(backlinksOutput && typeof backlinksOutput === 'object', 'get_backlinks returned structured backlink profile');
  assert('domainRating' in backlinksOutput || 'backlinks' in backlinksOutput, 'get_backlinks contains authority metrics');

  // 3.6 Tool Error Cases via tools/call
  console.log('  Testing tool error handling via tools/call...');
  const missingParamRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: {
      name: 'audit_url',
      arguments: {}
    }
  });
  assert(missingParamRes.result?.isError === true, 'Missing required argument returns isError: true');

  const unknownToolRes = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 11,
    method: 'tools/call',
    params: {
      name: 'non_existent_tool',
      arguments: {}
    }
  });
  assert(unknownToolRes.result?.isError === true, 'Unknown tool call returns isError: true');

  // ─────────────────────────────────────────────────────────────────
  // TEST SECTION 4: Stdio Child Process Integration Test
  // ─────────────────────────────────────────────────────────────────
  console.log('\n[SECTION 4] Stdio Subprocess IPC Integration Test...');

  await new Promise((resolve, reject) => {
    const child = spawn('node', [MCP_SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    const receivedMessages = [];
    const rl = readline.createInterface({ input: child.stdout, terminal: false });

    rl.on('line', (line) => {
      try {
        const parsed = JSON.parse(line);
        receivedMessages.push(parsed);

        // Step 1: When initialize response arrives, send tools/list
        if (parsed.id === 100) {
          child.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            id: 101,
            method: 'tools/list',
            params: {}
          }) + '\n');
        }

        // Step 2: When tools/list response arrives, send ping
        if (parsed.id === 101) {
          child.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            id: 102,
            method: 'ping'
          }) + '\n');
        }

        // Step 3: When ping response arrives, test is complete
        if (parsed.id === 102) {
          child.stdin.end();
        }
      } catch (err) {
        console.error('Child stdout line parse error:', line);
      }
    });

    child.stderr.on('data', (chunk) => {
      // Stderr logs from MCP server are expected and healthy
      const text = chunk.toString().trim();
      if (text.includes('[OmniSEO-OS MCP]')) {
        // Known banner log
      }
    });

    child.on('close', (code) => {
      try {
        assert(receivedMessages.length === 3, `Received 3 responses via stdio IPC (got ${receivedMessages.length})`);
        assert(receivedMessages[0].id === 100 && receivedMessages[0].result?.serverInfo?.name === 'omniseo-os-mcp', 'Subprocess initialize handshake succeeded');
        assert(receivedMessages[1].id === 101 && receivedMessages[1].result?.tools?.length === 5, 'Subprocess tools/list returned 5 tools');
        assert(receivedMessages[2].id === 102, 'Subprocess ping succeeded');
        resolve();
      } catch (e) {
        reject(e);
      }
    });

    child.on('error', reject);

    // Kick off handshake via child stdin
    child.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 100,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' }
    }) + '\n');
  });

  console.log('\n' + '='.repeat(72));
  console.log(`🎉 ALL ${passedTests}/${totalTests} MCP SERVER VERIFICATION TESTS PASSED SUCCESSFULLY!`);
  console.log('='.repeat(72));
  process.exit(0);
}

runMcpTestSuite().catch((err) => {
  console.error('\n❌ MCP TEST SUITE FAILED:', err);
  process.exit(1);
});
