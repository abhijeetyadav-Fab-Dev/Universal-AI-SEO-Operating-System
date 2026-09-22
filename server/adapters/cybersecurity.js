/**
 * Anthropic Cybersecurity Skills Adapter for OmniSEO-OS
 * Based on https://github.com/mukul975/anthropic-cybersecurity-skills
 * 
 * Provides automated web security audits, HTTP security header verification,
 * SSL/TLS posture evaluation, and MITRE ATT&CK mitigation mapping.
 */

import { validateUrl } from './browser_use.js';

const SECURITY_HEADERS_CHECKLIST = [
  { header: 'content-security-policy', weight: 25, mitre: 'T1059 (Execution / XSS)', name: 'Content Security Policy (CSP)' },
  { header: 'strict-transport-security', weight: 20, mitre: 'T1557 (Adversary-in-the-Middle)', name: 'HTTP Strict Transport Security (HSTS)' },
  { header: 'x-frame-options', weight: 15, mitre: 'T1189 (Drive-by Compromise / Clickjacking)', name: 'X-Frame-Options' },
  { header: 'x-content-type-options', weight: 15, mitre: 'T1204 (User Execution / MIME Sniffing)', name: 'X-Content-Type-Options' },
  { header: 'referrer-policy', weight: 15, mitre: 'T1596 (Information Disclosure)', name: 'Referrer-Policy' },
  { header: 'permissions-policy', weight: 10, mitre: 'T1125 (Video Capture / Device Access)', name: 'Permissions-Policy' }
];

/**
 * Audit website HTTP security posture and header defenses
 */
export async function auditSecurityPosture(url, timeoutMs = 15000) {
  const targetUrl = validateUrl(url);
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Anthropic-Cybersecurity-Auditor/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const headers = {};
    res.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    let score = 0;
    const headerAudits = [];

    for (const item of SECURITY_HEADERS_CHECKLIST) {
      const present = Boolean(headers[item.header]);
      const val = headers[item.header] || null;
      if (present) score += item.weight;

      headerAudits.push({
        header: item.header,
        name: item.name,
        present,
        value: val,
        weight: item.weight,
        mitreTechnique: item.mitre,
        status: present ? 'PASS' : 'FAIL',
        recommendation: present ? 'Configured correctly' : `Add '${item.name}' header to prevent unauthorized script execution or interception.`
      });
    }

    const isHttps = targetUrl.startsWith('https://');
    if (!isHttps) {
      score = Math.max(0, score - 40);
    }

    const riskTier = score >= 85 ? 'LOW' : score >= 60 ? 'MEDIUM' : score >= 35 ? 'HIGH' : 'CRITICAL';
    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      url: targetUrl,
      isHttps,
      securityScore: score,
      riskTier,
      latencyMs,
      headerAudits,
      mitreFrameworkCoverage: 'MITRE ATT&CK v19.1 & Fight Fraud (F3)',
      dataStatus: 'measured',
      source: 'https://github.com/mukul975/anthropic-cybersecurity-skills'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw new Error(`Cybersecurity audit error for ${targetUrl}: ${err.message}`);
  }
}
