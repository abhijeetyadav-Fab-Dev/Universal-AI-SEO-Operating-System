import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE = process.env.BASE || 'http://127.0.0.1:4000';

const elements = new Map();
let anon = 0;
const stamps = new Map(); // panelId -> stamp element

function makeEl(id) {
  const t = {
    _id: id, innerHTML: '', innerText: '', value: '', children: [],
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, contains: () => false, toggle() {} },
    appendChild(c) { this.children.push(c); return c; },
    insertBefore(c) { this.children.unshift(c); if (c && c.className === 'prov-stamp') this._stamp = c; return c; },
    removeChild() {}, remove() {}, click() {}, focus() {}, scrollIntoView() {},
    querySelector(sel) {
      if (sel === ':scope > .prov-stamp' || sel === '.prov-stamp') return this._stamp || null;
      if (sel === 'tbody') { if (!this._tbody) this._tbody = makeEl(id + '::tbody'); return this._tbody; }
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    getAttribute: () => null, setAttribute() {},
    insertAdjacentHTML(pos, html) { if (pos === 'beforeend') this.innerHTML += html; else this.innerHTML = html + this.innerHTML; },
  };
  return t;
}

const documentStub = {
  getElementById(id) { if (!elements.has(id)) elements.set(id, makeEl(id)); return elements.get(id); },
  createElement(tag) { return makeEl('anon-' + tag + '-' + (anon++)); },
  querySelector(sel) {
    if (sel.startsWith('#')) {
      const id = sel.slice(1).split(/[\s.]/)[0];
      const el = documentStub.getElementById(id);
      if (sel.includes('.prov-stamp')) return el._stamp || null;
      return el;
    }
    if (sel.includes('.prov-stamp')) return null;
    return null;
  },
  querySelectorAll() { return []; },
  body: makeEl('body'),
  addEventListener() {}, execCommand() { return true; },
};

const realFetch = global.fetch;
const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  URL, URLSearchParams, URLPattern: undefined,
  fetch: (url, opts) => realFetch(String(url).startsWith('http') ? url : BASE + url, opts),
  alert: (m) => { sandbox.__alerts = (sandbox.__alerts || []).push(m); },
  Blob: class Blob { constructor(parts, opts) { this.parts = parts; this.opts = opts; } },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { clipboard: { writeText: async () => {} }, userAgent: 'node-test' },
  document: documentStub,
  performance: { now: () => Date.now() },
  __elements: elements,
};
sandbox.window = sandbox;
sandbox.window.codeSnippets = {};
sandbox.window.isSecureContext = true;
sandbox.window.print = () => {};
sandbox.globalThis = sandbox;

const htmlPath = path.join(__dirname, '../public/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
// the big inline script is the largest block
let big = scriptMatch.map(m => m[1]).sort((a, b) => b.length - a.length)[0];
console.log('inline script size:', big.length);

const ctx = vm.createContext(sandbox);
vm.runInContext(big, ctx, { filename: 'inline-app.js' });

(async () => {
  const run = (code) => vm.runInContext(code, ctx);
  // 1) run plan
  run(`document.getElementById('queryInput').value = 'https://example.com'; runPlan();`);
  await new Promise(r => setTimeout(r, 2500));
  console.log('plan ok:', !!run('currentPlan'));

  // 2) execute
  run('runExecution()');
  await new Promise(r => setTimeout(r, 12000)); // PSI 429 is fast; leave margin

  const el = (id) => elements.get(id);
  const stampOf = (panelId) => {
    const p = elements.get(panelId);
    return p && p._stamp ? p._stamp.innerHTML : (p && p.children.find(c => c._id && c._id.startsWith('anon')) ? '' : '(no stamp)');
  };
  // stamps: stampPanel inserts a created div; capture via children
  const stampText = (panelId) => {
    const p = elements.get(panelId);
    if (!p) return '(panel missing)';
    const st = p.children.find(c => c && c.classList && (c._isStamp || (c.innerHTML || '').includes('prov-')));
    return st ? st.innerHTML : (p._stamp ? p._stamp.innerHTML : '(no stamp)');
  };

  let pass = 0, fail = 0;
  const check = (name, cond, extra = '') => {
    console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  [' + String(extra).slice(0, 120) + ']' : ''));
    cond ? pass++ : fail++;
  };

  const val = (id, prop = 'innerText') => { const e = el(id); return e ? e[prop] : '(missing)'; };

  check('results section shown', val('resultsSection', 'style') !== undefined && (el('resultsSection')?.innerHTML !== undefined));
  check('health score set (measured crawl)', /^\d+\/100$/.test(val('valHealth')), val('valHealth'));
  check('tech score set', val('valTechScore') !== '--' && val('valTechScore') !== 'N/A', val('valTechScore'));
  check('CWV tile shows — when PSI unavailable (not fake score)', val('valSpeedScore') === '—', val('valSpeedScore'));
  check('CWV tile sub mentions unavailability', /PSI unavailable/.test(val('valSpeedLcp')), val('valSpeedLcp'));
  check('CWV provider tag set', /unavailable|PageSpeed/.test(val('cwvProviderTag')), val('cwvProviderTag'));
  check('CWV LCP value is — (not invented 2.8s)', val('cwvLcpVal') === '—', val('cwvLcpVal'));
  check('CWV unavailable banner shown', el('cwvUnavailableBanner') && el('cwvUnavailableBanner').style.display === 'block' && /fixed build|PSI/.test(el('cwvUnavailableBanner').innerText), el('cwvUnavailableBanner')?.innerText?.slice(0, 80));
  check('GEO panel stamped SIMULATED', /prov-simulated/.test(stampText('panelGeo')));
  check('Trends panel stamped SIMULATED', /prov-simulated/.test(stampText('panelTrends')));
  check('Backlinks panel stamped SIMULATED', /prov-simulated/.test(stampText('panelBacklinks')));
  check('CWV panel stamped UNAVAILABLE', /prov-unavailable/.test(stampText('panelCwv')));
  check('On-page panel stamped MEASURED', /prov-measured/.test(stampText('panelOnpage')));
  check('Inbox panel stamped MEASURED', /prov-measured/.test(stampText('panelInbox')));
  check('GEO score rendered (simulated but visible+badged)', /^\d+$/.test(val('valGeoScore')), val('valGeoScore'));
  check('on-page title from real crawl', /Example Domain/.test((val('tblTitle') || '') + (el('tblTitle')?.innerHTML || '')), (val('tblTitle') || el('tblTitle')?.innerHTML || '').slice(0, 60));
  check('robots badge live', /✅|❌/.test(val('robotsStatusBadge')), val('robotsStatusBadge'));
  check('radar SSL from live probe', /HTTPS|HTTP only/.test(val('radarSslStatus')), val('radarSslStatus'));
  check('radar compression from live probe', /br|gzip|No compression/.test(val('radarCompression')), val('radarCompression'));
  check('radar canonical from live probe', /Self-Canonical|No canonical|Canonical:/.test(val('radarCanonical')), val('radarCanonical'));
  check('GSC tab stamped SIMULATED (awaiting probes)', /prov-simulated/.test(stampText('tabGscRank')) || /awaiting/i.test(''));
  // give companion probes (domain/gsc/rank/brand/head-eeat) more time
  await new Promise(r => setTimeout(r, 12000));
  check('Domain tab stamped SIMULATED', /prov-simulated/.test(stampText('tabDomain')), stampText('tabDomain').slice(0, 80));
  check('GSC tab stamped SIMULATED', /prov-simulated/.test(stampText('tabGscRank')), stampText('tabGscRank').slice(0, 80));
  check('Brand tab stamped SIMULATED', /prov-simulated/.test(stampText('tabBrand')), stampText('tabBrand').slice(0, 80));
  check('Head/E-E-A-T tab stamped MEASURED + HEURISTIC', /prov-measured/.test(stampText('tabHeadEeat')) && /prov-heuristic/.test(stampText('tabHeadEeat')), stampText('tabHeadEeat').slice(0, 100));
  check('GSC clicks rendered from API', !['--'].includes(val('gscClicks')) && /\d/.test(val('gscClicks')), val('gscClicks'));
  check('backlinks DR rendered from API (badged simulated)', /\d/.test(val('sideDrVal')), val('sideDrVal'));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
