import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  saveAuditSnapshot,
  getAuditHistory,
  getProjectList,
  getSnapshotById,
  compareSnapshots,
  deleteSnapshot,
  clearHistory,
  resetDatabase,
  getDbPath,
  setDbPath,
  normalizeDomain
} from '../server/adapters/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runStorageTestSuite() {
  console.log('🧪 Starting OmniSEO-OS Storage & Audit History Verification Suite...\n');

  // Configure test database location in data/
  const testDbDir = path.resolve(__dirname, '../data');
  const testDbFile = path.resolve(testDbDir, 'omniseo_db.json');
  setDbPath(testDbFile);

  console.log(`[Storage Test] Active DB Path: ${getDbPath()}`);

  // Clean initial state for testing
  await resetDatabase();

  // Test 1: Directory Auto-Creation and DB Initialization
  console.log('Test 1: Directory Auto-Creation and Persistent File Initialization...');
  assert.ok(fs.existsSync(testDbDir), 'Directory data/ must exist or be auto-created');
  assert.ok(fs.existsSync(testDbFile), 'Database file data/omniseo_db.json must exist');
  const initialContent = JSON.parse(fs.readFileSync(testDbFile, 'utf8'));
  assert.strictEqual(initialContent.version, '1.0');
  assert.ok(Array.isArray(initialContent.snapshots));
  assert.strictEqual(initialContent.snapshots.length, 0);
  console.log('  ✅ Database initialized cleanly on disk with zero C++ dependencies.\n');

  // Test 2: Saving Audit Snapshots with Score & Metric Extraction
  console.log('Test 2: Saving Audit Snapshots & Extracting Canonical Metrics...');
  const auditResult1 = {
    canonicalModel: {
      projectId: 'proj_test_1',
      targetDomain: 'example.com',
      targetUrl: 'https://example.com/blog',
      overallHealth: 72
    },
    detailedPayloads: {
      technical: {
        score: 75,
        issues: [
          { type: 'MISSING_CANONICAL', title: 'Missing Canonical Tag', severity: 'HIGH' },
          { type: 'MISSING_ALT', title: 'Missing Image Alt Attributes', severity: 'MEDIUM' }
        ]
      },
      pageSpeed: {
        performanceScore: 65,
        cwvMetrics: { lcp: { numericValueMs: 3400 } }
      }
    },
    recommendations: [
      { type: 'CANONICAL', title: 'Add Canonical Tag', priorityScore: 28.5 },
      { type: 'CWV', title: 'Optimize Hero Asset LCP', priorityScore: 22.0 },
      { type: 'ALT', title: 'Fix Image Alt Attributes', priorityScore: 14.2 }
    ]
  };

  const snap1 = await saveAuditSnapshot('example.com', auditResult1);
  assert.ok(snap1.id && snap1.id.startsWith('snap_'), 'Snapshot must have unique ID');
  assert.strictEqual(snap1.id, snap1.snapshotId);
  assert.strictEqual(snap1.domain, 'example.com');
  assert.strictEqual(snap1.overallHealth, 72, 'Must extract overallHealth from canonicalModel');
  assert.strictEqual(snap1.technicalScore, 75, 'Must extract technicalScore');
  assert.strictEqual(snap1.speedScore, 65, 'Must extract speedScore from pageSpeed');
  assert.strictEqual(snap1.issuesCount, 3, 'Must extract issuesCount from recommendations');
  assert.ok(snap1.timestamp, 'Snapshot must have valid ISO timestamp');
  assert.deepStrictEqual(snap1.payload, auditResult1, 'Full audit payload must be preserved');
  console.log(`  ✅ Snapshot 1 saved: ID=${snap1.id}, Health=${snap1.overallHealth}, Tech=${snap1.technicalScore}, Speed=${snap1.speedScore}, Issues=${snap1.issuesCount}`);

  // Test 3: getSnapshotById Verification
  console.log('Test 3: Retrieving Specific Snapshot By ID...');
  const retrieved1 = await getSnapshotById(snap1.id);
  assert.ok(retrieved1, 'Must find snapshot by ID');
  assert.strictEqual(retrieved1.id, snap1.id);
  assert.strictEqual(retrieved1.overallHealth, 72);
  assert.strictEqual(retrieved1.domain, 'example.com');
  assert.strictEqual(retrieved1.payload.canonicalModel.targetUrl, 'https://example.com/blog');

  const nonExistent = await getSnapshotById('snap_non_existent_id');
  assert.strictEqual(nonExistent, null, 'Non-existent snapshot ID must return null');
  console.log('  ✅ getSnapshotById verified for valid and invalid IDs.\n');

  // Test 4: Saving Successive Audits for Same Domain & getAuditHistory
  console.log('Test 4: Successive Audits & getAuditHistory (Chronological Sort)...');
  // Wait a small tick to ensure timestamp differs
  await new Promise(r => setTimeout(r, 20));

  const auditResult2 = {
    canonicalModel: {
      targetDomain: 'example.com',
      overallHealth: 88
    },
    detailedPayloads: {
      technical: { score: 92 },
      pageSpeed: { performanceScore: 82 }
    },
    recommendations: [
      { type: 'CWV', title: 'Optimize Hero Asset LCP', priorityScore: 18.0 },
      { type: 'SERP', title: 'Resolve Keyword Cannibalization', priorityScore: 24.5 }
    ]
  };

  const snap2 = await saveAuditSnapshot('example.com', auditResult2);
  assert.strictEqual(snap2.overallHealth, 88);
  assert.strictEqual(snap2.issuesCount, 2);

  await new Promise(r => setTimeout(r, 20));

  const auditResult3 = {
    overallHealth: 95,
    technicalScore: 98,
    speedScore: 92,
    issuesCount: 1,
    recommendations: [
      { type: 'SERP', title: 'Resolve Keyword Cannibalization', priorityScore: 12.0 }
    ]
  };
  const snap3 = await saveAuditSnapshot('https://www.example.com/subpage', auditResult3);
  assert.strictEqual(snap3.domain, 'example.com', 'Domain normalization must strip www and subpath');
  assert.strictEqual(snap3.overallHealth, 95);

  const historyAll = await getAuditHistory('example.com', 10);
  assert.strictEqual(historyAll.length, 3, 'Must retrieve all 3 audit snapshots');
  // History must be sorted by timestamp descending (newest first)
  assert.strictEqual(historyAll[0].id, snap3.id, 'Most recent audit must be first');
  assert.strictEqual(historyAll[1].id, snap2.id, 'Second audit must be second');
  assert.strictEqual(historyAll[2].id, snap1.id, 'Oldest audit must be third');

  const historyLimited = await getAuditHistory('example.com', 2);
  assert.strictEqual(historyLimited.length, 2, 'Limit parameter must be respected');
  assert.strictEqual(historyLimited[0].id, snap3.id);
  assert.strictEqual(historyLimited[1].id, snap2.id);

  console.log(`  ✅ getAuditHistory verified: ${historyAll.length} items sorted timestamp descending.\n`);

  // Test 5: Multi-Domain Project Listing (getProjectList)
  console.log('Test 5: Multi-Domain Aggregation & getProjectList...');
  // Save snapshots for two additional domains
  await saveAuditSnapshot('yatradham.org', {
    overallHealth: 84,
    technicalScore: 89,
    speedScore: 78,
    issuesCount: 4
  });

  await new Promise(r => setTimeout(r, 20));

  await saveAuditSnapshot('github.com', {
    overallHealth: 96,
    technicalScore: 99,
    speedScore: 94,
    issuesCount: 0
  });

  const projects = await getProjectList();
  assert.strictEqual(projects.length, 3, 'Must list all 3 distinct domains');

  const exampleProj = projects.find(p => p.domain === 'example.com');
  const yatraProj = projects.find(p => p.domain === 'yatradham.org');
  const githubProj = projects.find(p => p.domain === 'github.com');

  assert.ok(exampleProj, 'example.com must be in project list');
  assert.strictEqual(exampleProj.totalAudits, 3, 'example.com must have 3 total audits');
  assert.strictEqual(exampleProj.latestHealthScore, 95, 'Latest health score must reflect snap3');

  assert.ok(yatraProj, 'yatradham.org must be in project list');
  assert.strictEqual(yatraProj.totalAudits, 1);
  assert.strictEqual(yatraProj.latestHealthScore, 84);

  assert.ok(githubProj, 'github.com must be in project list');
  assert.strictEqual(githubProj.totalAudits, 1);
  assert.strictEqual(githubProj.latestHealthScore, 96);

  // Projects should be sorted by lastAuditDate descending
  const timestamps = projects.map(p => new Date(p.lastAuditDate).getTime());
  assert.ok(timestamps[0] >= timestamps[1] && timestamps[1] >= timestamps[2], 'Projects must be sorted by last audit date descending');

  console.log('  ✅ getProjectList verified across multiple domains:');
  projects.forEach(p => console.log(`     • ${p.domain}: ${p.totalAudits} audits, Latest Health: ${p.latestHealthScore}, Last Date: ${p.lastAuditDate}`));
  console.log();

  // Test 6: Snapshot Comparison & Delta Engine (compareSnapshots)
  console.log('Test 6: Snapshot Comparison & Delta Engine...');
  // Compare snap1 (Baseline) with snap2 (Follow-up)
  // snap1 had issues: 'Add Canonical Tag', 'Optimize Hero Asset LCP', 'Fix Image Alt Attributes'
  // snap2 had issues: 'Optimize Hero Asset LCP', 'Resolve Keyword Cannibalization'
  const comparison = await compareSnapshots(snap1.id, snap2.id);

  assert.strictEqual(comparison.snapshotId1, snap1.id);
  assert.strictEqual(comparison.snapshotId2, snap2.id);
  assert.strictEqual(comparison.healthScoreDelta, 88 - 72, 'Health delta must be +16');
  assert.strictEqual(comparison.performanceScoreDelta, 82 - 65, 'Performance delta must be +17');
  assert.strictEqual(comparison.technicalScoreDelta, 92 - 75, 'Technical delta must be +17');

  // Check Newly Detected Issues
  assert.ok(Array.isArray(comparison.newlyDetectedIssues), 'Must return newlyDetectedIssues array');
  const hasNewCannibalization = comparison.newlyDetectedIssues.some(i => i.title.includes('Cannibalization') || i.key.includes('SERP'));
  assert.ok(hasNewCannibalization, 'Resolve Keyword Cannibalization must be detected as new issue');

  // Check Resolved Issues
  assert.ok(Array.isArray(comparison.resolvedIssues), 'Must return resolvedIssues array');
  const hasResolvedCanonical = comparison.resolvedIssues.some(i => i.title.includes('Canonical Tag') || i.key.includes('CANONICAL'));
  const hasResolvedAlt = comparison.resolvedIssues.some(i => i.title.includes('Alt') || i.key.includes('ALT'));
  assert.ok(hasResolvedCanonical, 'Canonical Tag issue must be flagged as resolved');
  assert.ok(hasResolvedAlt, 'Image Alt issue must be flagged as resolved');

  // Check Persisting Issues
  assert.ok(Array.isArray(comparison.persistingIssues), 'Must return persistingIssues array');
  const hasPersistingLcp = comparison.persistingIssues.some(i => i.title.includes('LCP') || i.key.includes('CWV'));
  assert.ok(hasPersistingLcp, 'LCP Hero issue must be detected as persisting');

  console.log(`  ✅ Comparison verified: Health Delta=+${comparison.healthScoreDelta}, Perf Delta=+${comparison.performanceScoreDelta}`);
  console.log(`     • Newly Detected Issues (${comparison.newlyDetectedCount}):`, comparison.newlyDetectedIssues.map(i => i.title));
  console.log(`     • Resolved Issues (${comparison.resolvedCount}):`, comparison.resolvedIssues.map(i => i.title));
  console.log(`     • Persisting Issues (${comparison.persistingCount}):`, comparison.persistingIssues.map(i => i.title));
  console.log();

  // Test 7: Snapshot Deletion (deleteSnapshot)
  console.log('Test 7: Deleting Specific Snapshot...');
  const delSuccess = await deleteSnapshot(snap2.id);
  assert.strictEqual(delSuccess, true, 'deleteSnapshot must return true on success');

  const afterDeleteSnap = await getSnapshotById(snap2.id);
  assert.strictEqual(afterDeleteSnap, null, 'Deleted snapshot must not be retrievable');

  const delNonExistent = await deleteSnapshot('invalid_snap_id');
  assert.strictEqual(delNonExistent, false, 'deleteSnapshot on invalid ID must return false');

  const historyAfterDelete = await getAuditHistory('example.com');
  assert.strictEqual(historyAfterDelete.length, 2, 'example.com must now have 2 snapshots remaining');
  console.log('  ✅ deleteSnapshot verified successfully.\n');

  // Test 8: Clearing Domain History (clearHistory)
  console.log('Test 8: Clearing History for a Domain...');
  const clearRes = await clearHistory('example.com');
  assert.strictEqual(clearRes.success, true);
  assert.strictEqual(clearRes.deletedCount, 2, 'Must delete remaining 2 snapshots for example.com');

  const emptyExampleHistory = await getAuditHistory('example.com');
  assert.strictEqual(emptyExampleHistory.length, 0, 'example.com history must now be empty');

  // Ensure other domains were NOT affected
  const remainingProjects = await getProjectList();
  assert.strictEqual(remainingProjects.length, 2, 'Remaining domains (yatradham.org, github.com) must remain intact');
  assert.ok(!remainingProjects.some(p => p.domain === 'example.com'));
  console.log('  ✅ clearHistory verified: target domain cleared while other domains preserved.\n');

  // Test 9: Concurrency & Lock Stress Test
  console.log('Test 9: Concurrency & Locking Stress Test (10 Parallel Writes)...');
  const concurrentWrites = [];
  for (let i = 0; i < 10; i++) {
    concurrentWrites.push(saveAuditSnapshot('concurrency-test.com', {
      overallHealth: 50 + i,
      technicalScore: 60 + i,
      speedScore: 70 + i,
      issuesCount: i,
      issues: [`Issue ${i}`]
    }));
  }
  const results = await Promise.all(concurrentWrites);
  assert.strictEqual(results.length, 10, 'All 10 concurrent writes must resolve');

  const concurrentHistory = await getAuditHistory('concurrency-test.com', 20);
  assert.strictEqual(concurrentHistory.length, 10, 'All 10 snapshots must be safely recorded without collision');
  console.log('  ✅ Concurrency test passed: 10 parallel atomic writes completed with zero data loss.\n');

  console.log('🎉 ALL STORAGE & AUDIT HISTORY TESTS PASSED PERFECTLY WITH CODE 0!\n');
}

runStorageTestSuite().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
