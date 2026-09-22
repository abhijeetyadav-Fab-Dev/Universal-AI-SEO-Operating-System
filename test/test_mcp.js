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
    'get_open_intel',
    'audit_helpful_content',
    'submit_indexnow',
    'detect_orphan_pages',
    'get_crux_history',
    'query_free_llm',
    'browser_use_crawl',
    'manage_agent_memory',
    'generate_seo_diagram',
    'verify_scientific_citations',
    'run_agent_harness',
    'audit_security_posture'
  ];

  assert(Array.isArray(TOOLS), 'TOOLS export is an array');
  assert(TOOLS.length === 16, `Expected 16 tools, found ${TOOLS.length}`);

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

  const helpfulTool = TOOLS.find(t => t.name === 'audit_helpful_content');
  assert('url' in helpfulTool.inputSchema.properties, 'audit_helpful_content specifies url parameter');
  assert(helpfulTool.inputSchema.required.includes('url'), 'audit_helpful_content marks url as required');

  const indexnowTool = TOOLS.find(t => t.name === 'submit_indexnow');
  assert('host' in indexnowTool.inputSchema.properties, 'submit_indexnow specifies host parameter');
  assert('urlList' in indexnowTool.inputSchema.properties, 'submit_indexnow specifies urlList parameter');
  assert(indexnowTool.inputSchema.required.includes('host'), 'submit_indexnow marks host as required');

  const orphansTool = TOOLS.find(t => t.name === 'detect_orphan_pages');
  assert('sitemapUrls' in orphansTool.inputSchema.properties, 'detect_orphan_pages specifies sitemapUrls parameter');
  assert('crawledUrls' in orphansTool.inputSchema.properties, 'detect_orphan_pages specifies crawledUrls parameter');
  assert(orphansTool.inputSchema.required.includes('sitemapUrls'), 'detect_orphan_pages marks sitemapUrls as required');

  const cruxTool = TOOLS.find(t => t.name === 'get_crux_history');
  assert('url' in cruxTool.inputSchema.properties, 'get_crux_history specifies url parameter');
  assert(cruxTool.inputSchema.required.includes('url'), 'get_crux_history marks url as required');

  const freeLlmTool = TOOLS.find(t => t.name === 'query_free_llm');
  assert('prompt' in freeLlmTool.inputSchema.properties, 'query_free_llm specifies prompt parameter');
  assert(freeLlmTool.inputSchema.required.includes('prompt'), 'query_free_llm marks prompt as required');

  const browserTool = TOOLS.find(t => t.name === 'browser_use_crawl');
  assert('url' in browserTool.inputSchema.properties, 'browser_use_crawl specifies url parameter');
  assert(browserTool.inputSchema.required.includes('url'), 'browser_use_crawl marks url as required');

  const memoryTool = TOOLS.find(t => t.name === 'manage_agent_memory');
  assert('action' in memoryTool.inputSchema.properties, 'manage_agent_memory specifies action parameter');
  assert(memoryTool.inputSchema.required.includes('action'), 'manage_agent_memory marks action as required');

  const diagramTool = TOOLS.find(t => t.name === 'generate_seo_diagram');
  assert('type' in diagramTool.inputSchema.properties, 'generate_seo_diagram specifies type parameter');
  assert(diagramTool.inputSchema.required.includes('type'), 'generate_seo_diagram marks type as required');

  const scientificTool = TOOLS.find(t => t.name === 'verify_scientific_citations');
  assert('claims' in scientificTool.inputSchema.properties, 'verify_scientific_citations specifies claims parameter');
  assert(scientificTool.inputSchema.required.includes('claims'), 'verify_scientific_citations marks claims as required');

  const harnessTool = TOOLS.find(t => t.name === 'run_agent_harness');
  assert('suite' in harnessTool.inputSchema.properties, 'run_agent_harness specifies suite parameter');

  const secTool = TOOLS.find(t => t.name === 'audit_security_posture');
  assert('url' in secTool.inputSchema.properties, 'audit_security_posture specifies url parameter');
  assert(secTool.inputSchema.required.includes('url'), 'audit_security_posture marks url as required');

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
  assert(toolsListRes.result.tools.length === 16, 'tools/list returns all 16 tools');

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

  // 3.6 audit_helpful_content Tool
  console.log('  Testing tool audit_helpful_content...');
  const draftHtml = `<!DOCTYPE html><html><head><title>Original Technical SEO Guide</title></head><body><h1>Original Technical SEO Guide</h1><p>Written by Dr. Alice Vance, PhD.</p><a href="/author/alice">Author Bio</a><p>Our testing methodology evaluated 50 high-traffic enterprise websites using open benchmarks.</p><table><tr><th>Site</th><th>LCP</th></tr><tr><td>Alpha</td><td>1.2s</td></tr></table><p>Official RFC documentation confirms the architecture standards.</p></body></html>`;
  const helpfulOutput = await handleToolCall('audit_helpful_content', { url: 'https://example.com', html: draftHtml });
  assert(helpfulOutput && typeof helpfulOutput === 'object', 'audit_helpful_content returned valid object');
  assert('overallScore' in helpfulOutput, 'audit_helpful_content has overallScore');
  assert('verdict' in helpfulOutput, 'audit_helpful_content has verdict');
  assert('dimensions' in helpfulOutput && 'who' in helpfulOutput.dimensions, 'audit_helpful_content includes dimensions');

  // 3.7 submit_indexnow Tool
  console.log('  Testing tool submit_indexnow...');
  const indexnowOutput = await handleToolCall('submit_indexnow', { host: 'example.com', urlList: ['https://example.com/blog/seo-guide'] });
  assert(indexnowOutput && typeof indexnowOutput === 'object', 'submit_indexnow returned structured receipt');
  assert(indexnowOutput.host === 'example.com', 'submit_indexnow preserved host');
  assert('status' in indexnowOutput || 'submittedUrls' in indexnowOutput, 'submit_indexnow contains status or submittedUrls');

  // 3.8 detect_orphan_pages Tool
  console.log('  Testing tool detect_orphan_pages...');
  const orphansOutput = await handleToolCall('detect_orphan_pages', {
    sitemapUrls: ['https://example.com/home', 'https://example.com/orphan-article'],
    crawledUrls: ['https://example.com/home', 'https://example.com/about']
  });
  assert(orphansOutput && typeof orphansOutput === 'object', 'detect_orphan_pages returned structured report');
  assert(Array.isArray(orphansOutput.orphans), 'detect_orphan_pages returns orphans array');
  assert(orphansOutput.orphans.includes('https://example.com/orphan-article'), 'detect_orphan_pages correctly identified orphan URL');
  assert(orphansOutput.unindexed.includes('https://example.com/about'), 'detect_orphan_pages correctly identified unindexed URL');

  // 3.9 get_crux_history Tool
  console.log('  Testing tool get_crux_history...');
  const cruxOutput = await handleToolCall('get_crux_history', { url: 'https://web.dev', collectionPeriodCount: 5 });
  assert(cruxOutput && typeof cruxOutput === 'object', 'get_crux_history returned structured object');
  assert(cruxOutput.success === true, 'get_crux_history succeeded');
  assert('snapshot' in cruxOutput && 'history' in cruxOutput, 'get_crux_history contains snapshot and history');
  assert('visUrl' in cruxOutput && cruxOutput.visUrl.includes('cruxvis.withgoogle.com'), 'get_crux_history provides CrUX Vis deep link');

  // 3.10 query_free_llm Tool
  console.log('  Testing tool query_free_llm...');
  const freeLlmOutput = await handleToolCall('query_free_llm', { prompt: 'Recommend a 3-step SEO checklist' });
  assert(freeLlmOutput && typeof freeLlmOutput === 'object', 'query_free_llm returned structured object');
  assert(freeLlmOutput.success === true, 'query_free_llm succeeded');
  assert(typeof freeLlmOutput.response === 'string' && freeLlmOutput.response.length > 5, 'query_free_llm produced response');
  assert(freeLlmOutput.provenance.includes('FreeLLMAPI'), 'query_free_llm indicates FreeLLMAPI provenance');

  // 3.11 browser_use_crawl Tool
  console.log('  Testing tool browser_use_crawl...');
  const browserOutput = await handleToolCall('browser_use_crawl', { url: 'https://example.com' });
  assert(browserOutput && typeof browserOutput === 'object', 'browser_use_crawl returned structured object');
  assert(browserOutput.success === true, 'browser_use_crawl succeeded');
  assert(Array.isArray(browserOutput.interactiveElements), 'browser_use_crawl returned interactive elements array');

  // 3.12 manage_agent_memory Tool
  console.log('  Testing tool manage_agent_memory...');
  const memWrite = await handleToolCall('manage_agent_memory', {
    action: 'remember',
    key: 'test_mcp_key',
    value: 'High LCP is typically caused by unoptimized hero images.',
    type: 'semantic'
  });
  assert(memWrite && memWrite.success === true, 'manage_agent_memory remember succeeded');

  const memRecall = await handleToolCall('manage_agent_memory', {
    action: 'recall',
    query: 'LCP hero images'
  });
  assert(memRecall && memRecall.success === true, 'manage_agent_memory recall succeeded');
  assert(memRecall.count > 0, 'manage_agent_memory recalled stored memory');

  const memStats = await handleToolCall('manage_agent_memory', { action: 'stats' });
  assert(memStats && memStats.totalMemories > 0, 'manage_agent_memory stats returned valid counts');

  // 3.13 generate_seo_diagram Tool
  console.log('  Testing tool generate_seo_diagram...');
  const diagramOutput = await handleToolCall('generate_seo_diagram', { type: 'site_architecture' });
  assert(diagramOutput && diagramOutput.success === true, 'generate_seo_diagram succeeded');
  assert(typeof diagramOutput.mermaid === 'string' && diagramOutput.mermaid.includes('graph TD'), 'generate_seo_diagram returned Mermaid syntax');

  // 3.14 verify_scientific_citations Tool
  console.log('  Testing tool verify_scientific_citations...');
  const scientificOutput = await handleToolCall('verify_scientific_citations', { claims: ['Web performance affects user cognitive load'] });
  assert(scientificOutput && scientificOutput.success === true, 'verify_scientific_citations succeeded');
  assert(Array.isArray(scientificOutput.verifiedClaims), 'verify_scientific_citations returned claims array');

  // 3.15 run_agent_harness Tool
  console.log('  Testing tool run_agent_harness...');
  const harnessOutput = await handleToolCall('run_agent_harness', { suite: 'schema_integrity' });
  assert(harnessOutput && harnessOutput.success === true, 'run_agent_harness succeeded');
  assert(harnessOutput.passRate === '100%', 'run_agent_harness achieved 100% pass rate');

  // 3.16 audit_security_posture Tool
  console.log('  Testing tool audit_security_posture...');
  const secOutput = await handleToolCall('audit_security_posture', { url: 'https://example.com' });
  assert(secOutput && secOutput.success === true, 'audit_security_posture succeeded');
  assert('securityScore' in secOutput && 'headerAudits' in secOutput, 'audit_security_posture returned header audits');

  // 3.17 Tool Error Cases via tools/call
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
        assert(receivedMessages[1].id === 101 && receivedMessages[1].result?.tools?.length === 16, 'Subprocess tools/list returned 16 tools');
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
