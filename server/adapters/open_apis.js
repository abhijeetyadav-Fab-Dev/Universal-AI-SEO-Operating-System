import fetch from 'node-fetch';

const DEFAULT_UA = 'OmniSEO-OS/2.0 (Open SEO Intelligence; +https://universal-ai-seo-operating-system.onrender.com; contact@omniseo.os)';

/**
 * 1. Wikipedia External Link Citations API
 * Free, open, zero-auth endpoint that discovers live Wikipedia articles citing a domain.
 */
export async function queryWikipediaBacklinks(domain, limit = 10) {
  try {
    const cleanDomain = String(domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=exturlusage&euquery=${encodeURIComponent(cleanDomain)}&euprop=title|url&eulimit=${limit}&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return { success: false, count: 0, links: [], error: `HTTP ${res.status}` };
    const data = await res.json();
    const rawList = data.query?.exturlusage || [];
    const links = rawList.map(item => ({
      title: item.title,
      articleUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
      targetUrl: item.url,
      domain: 'en.wikipedia.org',
      authority: 98,
      type: 'EDITORIAL_WIKIPEDIA',
      status: 'No-Follow',
      isToxic: false,
      source: 'Wikipedia exturlusage API (Open, Zero-Auth)'
    }));
    return { success: true, count: links.length, links, provider: 'Wikipedia Open API' };
  } catch (err) {
    return { success: false, count: 0, links: [], error: err.message };
  }
}

/**
 * 2. Hacker News Algolia Search API
 * Free, open, zero-auth endpoint for real tech backlinks, discussions, and story submissions.
 */
export async function queryHackerNewsMentions(query, limit = 10) {
  try {
    const cleanQuery = String(query || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(cleanQuery)}&tags=story&hitsPerPage=${limit}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return { success: false, count: 0, hits: [], error: `HTTP ${res.status}` };
    const data = await res.json();
    const hits = (data.hits || []).map(hit => ({
      id: hit.objectID,
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      hnUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      points: hit.points || 0,
      comments: hit.num_comments || 0,
      author: hit.author,
      createdAt: hit.created_at,
      domain: 'news.ycombinator.com',
      authority: 92,
      type: 'TECH_FORUM_COMMUNITY',
      status: 'Do-Follow',
      isToxic: false,
      source: 'Hacker News Algolia API (Open, Zero-Auth)'
    }));
    return { success: true, count: hits.length, hits, provider: 'Hacker News Algolia API' };
  } catch (err) {
    return { success: false, count: 0, hits: [], error: err.message };
  }
}

/**
 * 3. ICANN RDAP Domain Registry Protocol (Open WHOIS Replacement)
 * Free open standard JSON endpoint for registration dates, domain age, registrar, and nameservers.
 */
export async function queryDomainRdap(domain) {
  try {
    const cleanDomain = String(domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    const url = `https://rdap.org/domain/${encodeURIComponent(cleanDomain)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(7000)
    });
    if (!res.ok) return { success: false, error: `RDAP responded HTTP ${res.status}` };
    const data = await res.json();
    
    const events = data.events || [];
    const regEvent = events.find(e => e.eventAction === 'registration');
    const expEvent = events.find(e => e.eventAction === 'expiration');
    const lastChangedEvent = events.find(e => e.eventAction === 'last changed');

    let registrar = 'Unknown Registrar';
    const entities = data.entities || [];
    for (const ent of entities) {
      if (ent.roles && ent.roles.includes('registrar')) {
        const vcard = ent.vcardArray?.[1] || [];
        const fn = vcard.find(v => v[0] === 'fn');
        if (fn && fn[3]) registrar = fn[3];
        break;
      }
    }
    if (registrar === 'Unknown Registrar' && data.port43) {
      registrar = data.port43;
    }

    const regDate = regEvent ? regEvent.eventDate : null;
    let domainAgeYears = null;
    if (regDate) {
      const ageMs = Date.now() - new Date(regDate).getTime();
      domainAgeYears = (ageMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
    }

    const nameservers = (data.nameservers || []).map(ns => ns.ldhName || ns.handle || '').filter(Boolean);

    return {
      success: true,
      domain: cleanDomain,
      registrationDate: regDate,
      expirationDate: expEvent ? expEvent.eventDate : null,
      lastUpdated: lastChangedEvent ? lastChangedEvent.eventDate : null,
      domainAgeYears: domainAgeYears ? parseFloat(domainAgeYears) : null,
      domainAgeFormatted: domainAgeYears ? `${domainAgeYears} years` : 'Unknown',
      registrar,
      status: data.status || [],
      nameservers,
      provider: 'ICANN RDAP Protocol (Open, Zero-Auth)'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * 4. Google DNS-over-HTTPS (DoH) API
 * Free, open, zero-auth DNS resolver for authoritative A, AAAA, MX, and TXT records.
 */
export async function queryGoogleDns(domain, recordType = 'A') {
  try {
    const cleanDomain = String(domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    const url = `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=${encodeURIComponent(recordType)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { success: false, error: `DoH responded HTTP ${res.status}` };
    const data = await res.json();
    const answers = (data.Answer || []).map(a => ({
      name: a.name,
      type: a.type,
      ttl: a.TTL,
      data: a.data
    }));
    return {
      success: true,
      domain: cleanDomain,
      dnssecValidated: Boolean(data.AD),
      answers,
      provider: 'Google DNS-over-HTTPS (Open, Zero-Auth)'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * 5. Wikidata Knowledge Graph Search API
 * Free, open, zero-auth knowledge graph entity lookup for GEO / AEO authority audit.
 */
export async function queryWikidataEntity(entityName, limit = 5) {
  try {
    const cleanName = String(entityName || '').trim();
    if (!cleanName) return { success: false, error: 'Entity name is required' };
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(cleanName)}&language=en&limit=${limit}&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return { success: false, error: `Wikidata responded HTTP ${res.status}` };
    const data = await res.json();
    const search = (data.search || []).map(item => ({
      id: item.id, // e.g. Q364
      label: item.label,
      description: item.description || 'No description',
      conceptUri: item.concepturi || `https://www.wikidata.org/wiki/${item.id}`,
      aliases: item.aliases || []
    }));
    return {
      success: true,
      found: search.length > 0,
      primaryEntity: search[0] || null,
      allEntities: search,
      provider: 'Wikidata Knowledge Graph API (Open, Zero-Auth)'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * 6. Wikipedia Page Summary API (REST v1)
 * Free, open, zero-auth knowledge extraction for brand overview and grounding.
 */
export async function queryWikipediaSummary(articleTitle) {
  try {
    const cleanTitle = String(articleTitle || '').trim().replace(/\s+/g, '_');
    if (!cleanTitle) return { success: false, error: 'Title is required' };
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { success: false, error: `Wikipedia Summary HTTP ${res.status}` };
    const data = await res.json();
    return {
      success: true,
      title: data.title,
      description: data.description || '',
      extract: data.extract || '',
      pageUrl: data.content_urls?.desktop?.page || null,
      thumbnail: data.thumbnail?.source || null,
      provider: 'Wikimedia REST API (Open, Zero-Auth)'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * 7. Wikimedia Pageviews Metrics API
 * Free, open, zero-auth API returning daily article pageview counts as a proxy for topic interest.
 */
export async function queryWikimediaPageviews(articleTitle, days = 30) {
  try {
    const cleanTitle = String(articleTitle || '').trim().replace(/\s+/g, '_');
    const end = new Date();
    const start = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(cleanTitle)}/daily/${fmt(start)}/${fmt(end)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return { success: false, error: `Pageviews responded HTTP ${res.status}` };
    const data = await res.json();
    const items = (data.items || []).map(it => ({
      date: it.timestamp.substring(0, 8),
      views: it.views
    }));
    const totalViews = items.reduce((acc, it) => acc + it.views, 0);
    const avgDailyViews = items.length > 0 ? Math.round(totalViews / items.length) : 0;
    return {
      success: true,
      article: cleanTitle,
      daysAudited: items.length,
      totalViews,
      avgDailyViews,
      dailyTrend: items,
      provider: 'Wikimedia Analytics API (Open, Zero-Auth)'
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * 8. Datamuse Semantic Co-occurrence & LSI Keywords API
 * Free, open, zero-auth API for statistically associated search intent keywords.
 */
export async function queryDatamuseLsiKeywords(keyword, max = 10) {
  try {
    const cleanKw = String(keyword || '').trim();
    const url = `https://api.datamuse.com/words?rel_trg=${encodeURIComponent(cleanKw)}&max=${max}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { success: false, error: `Datamuse responded HTTP ${res.status}`, words: [] };
    const data = await res.json();
    const words = (Array.isArray(data) ? data : []).map(w => ({
      word: w.word,
      score: w.score || 0
    }));
    return { success: true, count: words.length, words, provider: 'Datamuse Semantic API (Open, Zero-Auth)' };
  } catch (err) {
    return { success: false, error: err.message, words: [] };
  }
}

/**
 * 9. Google Suggest Autocomplete API
 * Free open endpoint for keyword expansion and search intent discovery.
 */
export async function queryGoogleSuggest(query) {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_UA },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { success: false, suggestions: [] };
    const data = await res.json();
    const suggestions = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
    return { success: true, query, suggestions, provider: 'Google Suggest API (Open, Zero-Auth)' };
  } catch (err) {
    return { success: false, suggestions: [], error: err.message };
  }
}
