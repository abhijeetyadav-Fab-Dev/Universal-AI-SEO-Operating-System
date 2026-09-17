/**
 * Intent Classifier & Workflow Planner
 * Interprets natural language queries, detects target entities (domain, URLs, keywords, competitors),
 * classifies intents (Technical, Keywords, SERP, Competitors, Backlinks, GEO/AEO, Drop/Performance),
 * and generates a deterministic multi-agent execution plan with cost and confidence estimates.
 */

export function parseAndPlan(query, context = {}) {
  const normalizedQuery = (query || '').trim().toLowerCase();
  
  // Extract entities
  const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
  const rawUrls = query.match(urlRegex) || [];
  const cleanUrls = rawUrls.map(u => u.startsWith('http') ? u : `https://${u}`);
  
  const targetDomain = context.domain || (cleanUrls.length > 0 ? new URL(cleanUrls[0]).hostname : null);
  const targetUrl = cleanUrls[0] || (targetDomain ? `https://${targetDomain}` : null);

  // Intent Detection
  const intents = [];
  if (/speed|pagespeed|lighthouse|cwv|lcp|cls|inp|core web vitals|slow|fast/i.test(normalizedQuery)) {
    intents.push('CWV_PERFORMANCE');
  }
  if (/audit|crawl|broken|404|redirect|technical|index|canonical|robots|sitemap|meta|title/i.test(normalizedQuery)) {
    intents.push('TECHNICAL_AUDIT');
  }
  if (/keyword|search volume|cluster|cannibalization|ranking|intent|commercial/i.test(normalizedQuery)) {
    intents.push('KEYWORD_INTELLIGENCE');
  }
  if (/competitor|gap|versus|vs|compare/i.test(normalizedQuery)) {
    intents.push('COMPETITOR_GAP');
  }
  if (/backlink|referring|domain rating|authority|link profile/i.test(normalizedQuery)) {
    intents.push('BACKLINK_AUDIT');
  }
  if (/ai search|geo|aeo|chatgpt|perplexity|gemini|llm citation|mention/i.test(normalizedQuery)) {
    intents.push('GEO_AEO_VISIBILITY');
  }
  if (/drop|decline|loss|traffic fall|fell|decreased/i.test(normalizedQuery)) {
    intents.push('TRAFFIC_DROP_DIAGNOSTIC');
  }

  if (/trend|google trends|rising|breakout|search volume|volume|cpc|popularity|seasonality/i.test(normalizedQuery)) {
    intents.push('GOOGLE_TRENDS_VOLUME');
  }

  // When an audit or diagnostic is requested, include full suite of specialist agents
  if (intents.includes('TECHNICAL_AUDIT') || intents.includes('TRAFFIC_DROP_DIAGNOSTIC')) {
    if (!intents.includes('GOOGLE_TRENDS_VOLUME')) intents.push('GOOGLE_TRENDS_VOLUME');
    if (!intents.includes('KEYWORD_INTELLIGENCE')) intents.push('KEYWORD_INTELLIGENCE');
    if (!intents.includes('CWV_PERFORMANCE')) intents.push('CWV_PERFORMANCE');
    if (!intents.includes('BACKLINK_AUDIT')) intents.push('BACKLINK_AUDIT');
    if (!intents.includes('GEO_AEO_VISIBILITY')) intents.push('GEO_AEO_VISIBILITY');
  }

  // Fallback if generic
  if (intents.length === 0) {
    intents.push('TECHNICAL_AUDIT', 'KEYWORD_INTELLIGENCE', 'CWV_PERFORMANCE', 'GOOGLE_TRENDS_VOLUME', 'BACKLINK_AUDIT', 'GEO_AEO_VISIBILITY');
  }

  // Build Execution Steps
  const agents = [];
  let estimatedCredits = 0;

  if (intents.includes('GOOGLE_TRENDS_VOLUME') || intents.includes('KEYWORD_INTELLIGENCE') || intents.includes('TRAFFIC_DROP_DIAGNOSTIC')) {
    agents.push({
      id: 'agent_google_trends',
      name: 'Google Trends & Search Volume Engine',
      role: 'Extract search volume, 12-month interest curve, CPC, and rising/breakout queries',
      provider: 'Google Trends & Search Volume Adapter',
      costCredits: 0
    });
  }

  if (intents.includes('TECHNICAL_AUDIT') || intents.includes('TRAFFIC_DROP_DIAGNOSTIC')) {
    agents.push({
      id: 'agent_technical_crawler',
      name: 'Deep Technical Crawler & On-Page Auditor',
      role: 'Crawl HTML, extract headers, check HTTP codes, canonicals, schema tags, headings, and indexability',
      provider: 'Internal High-Speed Cheerio Scraper',
      costCredits: 1
    });
    estimatedCredits += 1;
  }

  if (intents.includes('CWV_PERFORMANCE') || intents.includes('TRAFFIC_DROP_DIAGNOSTIC')) {
    agents.push({
      id: 'agent_psi_cwv',
      name: 'Google PageSpeed Insights & CWV Inspector',
      role: 'Analyze Field & Lab Core Web Vitals (LCP, CLS, INP, TTFB, Speed Index)',
      provider: 'Google PSI Free Open API',
      costCredits: 0
    });
  }

  if (intents.includes('KEYWORD_INTELLIGENCE') || intents.includes('COMPETITOR_GAP') || intents.includes('TRAFFIC_DROP_DIAGNOSTIC')) {
    agents.push({
      id: 'agent_serp_keyword',
      name: 'SERP & Keyword Intelligence Analyst',
      role: 'Analyze search queries, search intent, ranking distribution, and PAA (People Also Ask)',
      provider: 'Unified SERP Adapter (SerpApi / DataForSEO / Mock Engine)',
      costCredits: 2
    });
    estimatedCredits += 2;
  }

  if (intents.includes('BACKLINK_AUDIT') || intents.includes('COMPETITOR_GAP') || intents.includes('TECHNICAL_AUDIT')) {
    agents.push({
      id: 'agent_backlink',
      name: 'Ahrefs/Semrush Backlink & Authority Engine',
      role: 'Inspect Domain Rating, backlink velocity, top referring domains, toxic flags, and link gap',
      provider: 'OmniSEO Open Backlink Adapter (Ahrefs/Moz Architecture)',
      costCredits: 1
    });
    estimatedCredits += 1;
  }

  if (intents.includes('GEO_AEO_VISIBILITY') || intents.includes('TRAFFIC_DROP_DIAGNOSTIC') || intents.includes('TECHNICAL_AUDIT')) {
    agents.push({
      id: 'agent_geo_aeo',
      name: 'GEO/AEO AI Search Visibility Engine',
      role: 'Simulate & audit AI-search citation readiness, structured entity prominence, and Perplexity/ChatGPT answer inclusion',
      provider: 'OmniSEO AI-Visibility Benchmark Engine',
      costCredits: 1
    });
    estimatedCredits += 1;
  }

  // Extract clean keyword/topic from query (ignoring command verbs and audit phrases)
  let cleanKeyword = null;
  const quotedMatch = query.match(/["']([^"']+)["']/);
  if (quotedMatch) {
    cleanKeyword = quotedMatch[1].trim();
  } else {
    const rawWithoutUrls = query.replace(urlRegex, '');
    const stripped = rawWithoutUrls
      .replace(/\b(audit|check|inspect|analyze|find|why|how|did|organic|traffic|drop|decline|loss|after|core update|core web vitals|serp rankings|ai search visibility|seo|visibility|cwv|lcp|cls|inp|technical|canonical|rankings|and|the|for|on|in|to|with|vs)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (stripped.length > 2 && !/^(dates and booking|booking)$/i.test(stripped)) {
      cleanKeyword = stripped;
    }
  }

  return {
    query,
    detectedEntities: {
      targetUrl,
      targetDomain,
      extractedUrls: cleanUrls,
      keywords: cleanKeyword
    },
    intents,
    executionPlan: {
      agents,
      estimatedRunTimeSeconds: agents.length * 1.5,
      totalCredits: estimatedCredits,
      requiresApproval: false
    }
  };
}
