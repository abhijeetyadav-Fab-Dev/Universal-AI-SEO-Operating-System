import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default persistence path: data/omniseo_db.json relative to project root
const DEFAULT_DB_PATH = process.env.OMNISEO_DB_PATH
  ? path.resolve(process.env.OMNISEO_DB_PATH)
  : path.resolve(__dirname, '../../data/omniseo_db.json');

let activeDbPath = DEFAULT_DB_PATH;

/**
 * Get active database file path
 */
export function getDbPath() {
  return activeDbPath;
}

/**
 * Set active database file path (useful for testing or custom environments)
 */
export function setDbPath(newPath) {
  if (!newPath) {
    activeDbPath = DEFAULT_DB_PATH;
  } else {
    activeDbPath = path.resolve(newPath);
  }
  return activeDbPath;
}

/**
 * In-process promise queue mutex to guarantee serialized atomic transactions
 * and eliminate race conditions across concurrent read-modify-write calls.
 */
let queuePromise = Promise.resolve();

function withLock(action) {
  const next = queuePromise.then(
    () => action(),
    () => action()
  );
  queuePromise = next.catch(() => {});
  return next;
}

/**
 * Normalize domain string by stripping protocols, www prefixes, and paths.
 */
export function normalizeDomain(domain) {
  if (!domain || typeof domain !== 'string') return '';
  let d = domain.trim().toLowerCase();
  try {
    if (d.includes('://')) {
      d = new URL(d).hostname;
    } else {
      d = d.split('/')[0].split('?')[0].split('#')[0];
    }
  } catch {
    d = d.replace(/^https?:\/\//i, '').split('/')[0];
  }
  return d.replace(/^www\./i, '').trim();
}

/**
 * Ensure database file and parent directory exist.
 */
async function ensureDbInitialized(targetPath = activeDbPath) {
  const dir = path.dirname(targetPath);
  await fs.promises.mkdir(dir, { recursive: true });
  try {
    await fs.promises.access(targetPath, fs.constants.F_OK);
  } catch {
    const initialData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      snapshots: []
    };
    await writeDbFile(targetPath, initialData);
  }
}

/**
 * Atomically write JSON data to disk using temp file and rename strategy.
 * Includes Windows EPERM/EBUSY retry loop and safe fallback.
 */
async function writeDbFile(targetPath, data) {
  const dir = path.dirname(targetPath);
  await fs.promises.mkdir(dir, { recursive: true });

  const randomStr = crypto.randomBytes(6).toString('hex');
  const tempPath = `${targetPath}.${Date.now()}.${randomStr}.tmp`;
  const serialized = JSON.stringify(data, null, 2);

  await fs.promises.writeFile(tempPath, serialized, 'utf8');

  let renamed = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fs.promises.rename(tempPath, targetPath);
      renamed = true;
      break;
    } catch (err) {
      if (['EPERM', 'EBUSY', 'EEXIST', 'EACCES'].includes(err.code)) {
        await new Promise(res => setTimeout(res, 25 * (attempt + 1)));
      } else {
        throw err;
      }
    }
  }

  if (!renamed) {
    await fs.promises.copyFile(tempPath, targetPath);
    await fs.promises.unlink(tempPath).catch(() => {});
  }
}

/**
 * Read and parse JSON database file safely.
 */
async function readDbFile(targetPath = activeDbPath) {
  await ensureDbInitialized(targetPath);
  try {
    const raw = await fs.promises.readFile(targetPath, 'utf8');
    if (!raw || !raw.trim()) {
      return { version: '1.0', snapshots: [] };
    }
    const parsed = JSON.parse(raw);
    if (!parsed.snapshots || !Array.isArray(parsed.snapshots)) {
      parsed.snapshots = [];
    }
    return parsed;
  } catch (err) {
    console.error(`[OmniSEO Storage] Warning reading DB at ${targetPath}:`, err.message);
    return { version: '1.0', snapshots: [] };
  }
}

/**
 * Generate unique snapshot ID
 */
function generateSnapshotId() {
  const ts = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  return `snap_${ts}_${rand}`;
}

/**
 * Extract scores and issue counts flexibly from various auditResult structures.
 */
function extractSnapshotMetrics(auditResult) {
  if (!auditResult || typeof auditResult !== 'object') {
    return { overallHealth: 0, technicalScore: 0, speedScore: 0, issuesCount: 0 };
  }

  // 1. Overall Health Score
  let overallHealth = 0;
  if (typeof auditResult.overallHealth === 'number') {
    overallHealth = auditResult.overallHealth;
  } else if (typeof auditResult.canonicalModel?.overallHealth === 'number') {
    overallHealth = auditResult.canonicalModel.overallHealth;
  } else if (typeof auditResult.healthScore === 'number') {
    overallHealth = auditResult.healthScore;
  } else if (typeof auditResult.score === 'number') {
    overallHealth = auditResult.score;
  }

  // 2. Technical Score
  let technicalScore = 0;
  if (typeof auditResult.technicalScore === 'number') {
    technicalScore = auditResult.technicalScore;
  } else if (typeof auditResult.detailedPayloads?.technical?.score === 'number') {
    technicalScore = auditResult.detailedPayloads.technical.score;
  } else if (typeof auditResult.technical?.score === 'number') {
    technicalScore = auditResult.technical.score;
  } else if (typeof auditResult.techScore === 'number') {
    technicalScore = auditResult.techScore;
  }

  // 3. Speed / Performance Score
  let speedScore = 0;
  if (typeof auditResult.speedScore === 'number') {
    speedScore = auditResult.speedScore;
  } else if (typeof auditResult.performanceScore === 'number') {
    speedScore = auditResult.performanceScore;
  } else if (typeof auditResult.detailedPayloads?.pageSpeed?.performanceScore === 'number') {
    speedScore = auditResult.detailedPayloads.pageSpeed.performanceScore;
  } else if (typeof auditResult.pageSpeed?.performanceScore === 'number') {
    speedScore = auditResult.pageSpeed.performanceScore;
  } else if (typeof auditResult.cwvScore === 'number') {
    speedScore = auditResult.cwvScore;
  }

  // 4. Issues Count
  let issuesCount = 0;
  if (typeof auditResult.issuesCount === 'number') {
    issuesCount = auditResult.issuesCount;
  } else if (Array.isArray(auditResult.recommendations)) {
    issuesCount = auditResult.recommendations.length;
  } else if (Array.isArray(auditResult.issues)) {
    issuesCount = auditResult.issues.length;
  } else if (Array.isArray(auditResult.detailedPayloads?.technical?.issues)) {
    issuesCount = auditResult.detailedPayloads.technical.issues.length;
  } else if (typeof auditResult.totalIssues === 'number') {
    issuesCount = auditResult.totalIssues;
  }

  return {
    overallHealth: Math.max(0, Math.min(100, Math.round(Number(overallHealth) || 0))),
    technicalScore: Math.max(0, Math.min(100, Math.round(Number(technicalScore) || 0))),
    speedScore: Math.max(0, Math.min(100, Math.round(Number(speedScore) || 0))),
    issuesCount: Math.max(0, Math.round(Number(issuesCount) || 0))
  };
}

/**
 * Extract normalized list of issues from snapshot payload
 */
function extractIssuesList(snapshot) {
  if (!snapshot) return [];
  const payload = snapshot.payload || snapshot;
  const rawList = [];

  if (Array.isArray(payload.recommendations) && payload.recommendations.length > 0) {
    rawList.push(...payload.recommendations);
  } else if (Array.isArray(payload.issues) && payload.issues.length > 0) {
    rawList.push(...payload.issues);
  } else if (Array.isArray(payload.detailedPayloads?.technical?.issues) && payload.detailedPayloads.technical.issues.length > 0) {
    rawList.push(...payload.detailedPayloads.technical.issues);
  } else if (Array.isArray(snapshot.issues) && snapshot.issues.length > 0) {
    rawList.push(...snapshot.issues);
  }

  return rawList.map((item, index) => {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      return {
        id: `issue_${index}_${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        key: trimmed,
        title: trimmed,
        type: 'GENERAL',
        raw: item
      };
    }
    const key = (item.id || item.type || item.title || item.name || `issue_${index}`).toString().trim();
    const title = item.title || item.name || item.type || item.problem || `Issue ${index + 1}`;
    const type = item.type || item.discipline || 'GENERAL';
    return {
      id: item.id || key,
      key,
      title,
      type,
      urgency: item.urgency,
      severity: item.severity,
      priorityScore: item.priorityScore,
      raw: item
    };
  });
}

/**
 * Save an audit snapshot to persistent disk store.
 * Generates unique snapshot ID, timestamp, stores overallHealth, technical score,
 * speed score, issues count, and full audit payload.
 *
 * @param {string} domain
 * @param {object} auditResult
 * @returns {Promise<object>} Saved snapshot record
 */
export async function saveAuditSnapshot(domain, auditResult = {}) {
  // Support flexible argument order if single object passed
  let targetDomainArg = domain;
  let targetPayloadArg = auditResult;
  if (typeof domain === 'object' && domain !== null && (auditResult === undefined || Object.keys(auditResult).length === 0)) {
    targetPayloadArg = domain;
    targetDomainArg = domain.domain || domain.targetDomain || domain.canonicalModel?.targetDomain || domain.url;
  }

  return withLock(async () => {
    const targetDomain = normalizeDomain(targetDomainArg) ||
      normalizeDomain(targetPayloadArg?.canonicalModel?.targetDomain) ||
      normalizeDomain(targetPayloadArg?.targetDomain) ||
      normalizeDomain(targetPayloadArg?.domain) ||
      normalizeDomain(targetPayloadArg?.url) ||
      'unknown';

    const snapshotId = generateSnapshotId();
    const timestamp = new Date().toISOString();
    const metrics = extractSnapshotMetrics(targetPayloadArg);

    const targetUrl = targetPayloadArg?.targetUrl ||
      targetPayloadArg?.url ||
      targetPayloadArg?.canonicalModel?.targetUrl ||
      `https://${targetDomain}`;

    const summary = {
      id: snapshotId,
      snapshotId,
      domain: targetDomain,
      timestamp,
      overallHealth: metrics.overallHealth,
      technicalScore: metrics.technicalScore,
      speedScore: metrics.speedScore,
      issuesCount: metrics.issuesCount,
      targetUrl
    };

    const snapshotRecord = {
      id: snapshotId,
      snapshotId,
      domain: targetDomain,
      timestamp,
      overallHealth: metrics.overallHealth,
      technicalScore: metrics.technicalScore,
      speedScore: metrics.speedScore,
      issuesCount: metrics.issuesCount,
      summary,
      payload: targetPayloadArg
    };

    const db = await readDbFile();
    db.snapshots.push(snapshotRecord);
    db.updatedAt = timestamp;
    await writeDbFile(activeDbPath, db);

    return snapshotRecord;
  });
}

/**
 * Retrieve past audit summaries for a domain sorted by timestamp descending.
 *
 * @param {string} domain
 * @param {number} [limit=10]
 * @returns {Promise<Array<object>>}
 */
export async function getAuditHistory(domain, limit = 10) {
  return withLock(async () => {
    const targetDomain = normalizeDomain(domain);
    const db = await readDbFile();

    const filtered = db.snapshots.filter(s => {
      if (!targetDomain) return true;
      return normalizeDomain(s.domain) === targetDomain;
    });

    // Sort descending by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const maxLimit = typeof limit === 'number' && limit > 0 ? limit : 10;
    const sliced = filtered.slice(0, maxLimit);

    return sliced.map(s => {
      const summary = s.summary || {};
      return {
        id: s.id || s.snapshotId,
        snapshotId: s.snapshotId || s.id,
        domain: s.domain,
        timestamp: s.timestamp,
        overallHealth: s.overallHealth,
        technicalScore: s.technicalScore,
        speedScore: s.speedScore,
        issuesCount: s.issuesCount,
        targetUrl: summary.targetUrl || s.payload?.targetUrl || s.payload?.canonicalModel?.targetUrl || `https://${s.domain}`,
        summary: {
          ...summary,
          id: s.id || s.snapshotId,
          snapshotId: s.snapshotId || s.id,
          domain: s.domain,
          timestamp: s.timestamp,
          overallHealth: s.overallHealth,
          technicalScore: s.technicalScore,
          speedScore: s.speedScore,
          issuesCount: s.issuesCount
        }
      };
    });
  });
}

/**
 * Retrieve all audited domains with total audits count, latest health score, and last audit date.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getProjectList() {
  return withLock(async () => {
    const db = await readDbFile();
    const domainMap = new Map();

    for (const snapshot of db.snapshots) {
      const d = normalizeDomain(snapshot.domain);
      if (!d) continue;

      if (!domainMap.has(d)) {
        domainMap.set(d, []);
      }
      domainMap.get(d).push(snapshot);
    }

    const projectList = [];
    for (const [domain, snapshots] of domainMap.entries()) {
      snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const latest = snapshots[0];

      projectList.push({
        domain,
        totalAudits: snapshots.length,
        latestHealthScore: latest.overallHealth,
        latestTechnicalScore: latest.technicalScore,
        latestSpeedScore: latest.speedScore,
        lastAuditDate: latest.timestamp,
        lastAuditTimestamp: latest.timestamp,
        latestSnapshotId: latest.id || latest.snapshotId
      });
    }

    // Sort by lastAuditDate descending
    projectList.sort((a, b) => new Date(b.lastAuditDate).getTime() - new Date(a.lastAuditDate).getTime());

    return projectList;
  });
}

/**
 * Retrieve a specific audit snapshot by ID.
 *
 * @param {string} snapshotId
 * @returns {Promise<object|null>}
 */
export async function getSnapshotById(snapshotId) {
  if (!snapshotId) return null;
  return withLock(async () => {
    const db = await readDbFile();
    const found = db.snapshots.find(s => s.id === snapshotId || s.snapshotId === snapshotId);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  });
}

/**
 * Compare two audit snapshots, returning deltas for health score, performance score,
 * newly detected issues, resolved issues, and persisting issues.
 *
 * @param {string} snapshotId1 Baseline / earlier snapshot ID
 * @param {string} snapshotId2 Comparison / newer snapshot ID
 * @returns {Promise<object>}
 */
export async function compareSnapshots(snapshotId1, snapshotId2) {
  if (!snapshotId1 || !snapshotId2) {
    throw new Error('Both snapshotId1 and snapshotId2 are required for comparison.');
  }

  return withLock(async () => {
    const db = await readDbFile();
    const snap1 = db.snapshots.find(s => s.id === snapshotId1 || s.snapshotId === snapshotId1);
    const snap2 = db.snapshots.find(s => s.id === snapshotId2 || s.snapshotId === snapshotId2);

    if (!snap1) {
      throw new Error(`Snapshot with ID "${snapshotId1}" was not found.`);
    }
    if (!snap2) {
      throw new Error(`Snapshot with ID "${snapshotId2}" was not found.`);
    }

    const healthScoreDelta = snap2.overallHealth - snap1.overallHealth;
    const speedScoreDelta = snap2.speedScore - snap1.speedScore;
    const technicalScoreDelta = snap2.technicalScore - snap1.technicalScore;
    const issuesCountDelta = snap2.issuesCount - snap1.issuesCount;

    const issues1 = extractIssuesList(snap1);
    const issues2 = extractIssuesList(snap2);

    const keys1 = new Set(issues1.map(i => i.key));
    const keys2 = new Set(issues2.map(i => i.key));

    // Newly detected: present in snapshot2 but NOT in snapshot1
    const newlyDetectedIssues = issues2.filter(i => !keys1.has(i.key));

    // Resolved: present in snapshot1 but NO LONGER in snapshot2
    const resolvedIssues = issues1.filter(i => !keys2.has(i.key));

    // Persisting: present in both snapshots
    const persistingIssues = issues2.filter(i => keys1.has(i.key));

    return {
      domain: snap2.domain || snap1.domain,
      snapshotId1,
      snapshotId2,
      baseSnapshot: {
        id: snap1.id,
        snapshotId: snap1.snapshotId,
        timestamp: snap1.timestamp,
        overallHealth: snap1.overallHealth,
        technicalScore: snap1.technicalScore,
        speedScore: snap1.speedScore,
        issuesCount: snap1.issuesCount
      },
      compareSnapshot: {
        id: snap2.id,
        snapshotId: snap2.snapshotId,
        timestamp: snap2.timestamp,
        overallHealth: snap2.overallHealth,
        technicalScore: snap2.technicalScore,
        speedScore: snap2.speedScore,
        issuesCount: snap2.issuesCount
      },
      healthScoreDelta,
      performanceScoreDelta: speedScoreDelta,
      speedScoreDelta,
      technicalScoreDelta,
      issuesCountDelta,
      delta: {
        healthScore: healthScoreDelta,
        performanceScore: speedScoreDelta,
        speedScore: speedScoreDelta,
        technicalScore: technicalScoreDelta,
        issuesCount: issuesCountDelta
      },
      newlyDetectedIssues,
      resolvedIssues,
      persistingIssues,
      newIssues: newlyDetectedIssues,
      newlyDetectedCount: newlyDetectedIssues.length,
      resolvedCount: resolvedIssues.length,
      persistingCount: persistingIssues.length
    };
  });
}

/**
 * Delete a specific snapshot by ID.
 *
 * @param {string} snapshotId
 * @returns {Promise<boolean>} True if found and deleted, false otherwise
 */
export async function deleteSnapshot(snapshotId) {
  if (!snapshotId) return false;
  return withLock(async () => {
    const db = await readDbFile();
    const initialLen = db.snapshots.length;
    db.snapshots = db.snapshots.filter(s => s.id !== snapshotId && s.snapshotId !== snapshotId);
    if (db.snapshots.length !== initialLen) {
      db.updatedAt = new Date().toISOString();
      await writeDbFile(activeDbPath, db);
      return true;
    }
    return false;
  });
}

/**
 * Clear all audit history for a given domain (or all domains if empty).
 *
 * @param {string} domain
 * @returns {Promise<object>} Result summary with deletedCount
 */
export async function clearHistory(domain) {
  return withLock(async () => {
    const targetDomain = normalizeDomain(domain);
    const db = await readDbFile();
    const initialLen = db.snapshots.length;
    if (targetDomain) {
      db.snapshots = db.snapshots.filter(s => normalizeDomain(s.domain) !== targetDomain);
    } else {
      db.snapshots = [];
    }
    const deletedCount = initialLen - db.snapshots.length;
    if (deletedCount > 0) {
      db.updatedAt = new Date().toISOString();
      await writeDbFile(activeDbPath, db);
    }
    return {
      success: true,
      deletedCount,
      count: deletedCount,
      domain: targetDomain
    };
  });
}

/**
 * Reset entire database (clears all snapshots).
 *
 * @returns {Promise<boolean>}
 */
export async function resetDatabase() {
  return withLock(async () => {
    const emptyDb = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      snapshots: []
    };
    await writeDbFile(activeDbPath, emptyDb);
    return true;
  });
}

export default {
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
};
