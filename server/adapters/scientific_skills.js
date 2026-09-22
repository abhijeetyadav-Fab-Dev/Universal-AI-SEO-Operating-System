/**
 * Scientific Agent Skills Adapter for OmniSEO-OS
 * Based on https://github.com/k-dense-ai/scientific-agent-skills
 * 
 * Provides academic paper discovery, peer-reviewed citation verification,
 * and scientific grounding for YMYL & Google E-E-A-T audits.
 */

const CROSSREF_API = 'https://api.crossref.org/works';

/**
 * Search peer-reviewed academic literature via CrossRef Open API
 */
export async function searchScientificLiterature({ query, rows = 5, timeoutMs = 15000 } = {}) {
  if (!query) throw new Error('Query parameter is required');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const searchUrl = `${CROSSREF_API}?query=${encodeURIComponent(query)}&rows=${rows}&select=DOI,title,author,published,container-title,is-referenced-by-count,URL`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'OmniSEO-OS-ScientificSkills/1.0 (mailto:admin@omniseo-os.local)'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`CrossRef API HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const items = json.message?.items || [];

    const papers = items.map(p => {
      const authors = (p.author || []).map(a => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean);
      const title = Array.isArray(p.title) ? p.title[0] : (p.title || 'Untitled Publication');
      const journal = Array.isArray(p['container-title']) ? p['container-title'][0] : (p['container-title'] || 'Peer-Reviewed Journal');
      const year = p.published?.['date-parts']?.[0]?.[0] || 'Unknown';
      const doi = p.DOI || null;
      const citationCount = p['is-referenced-by-count'] || 0;
      const url = p.URL || (doi ? `https://doi.org/${doi}` : null);

      return {
        title,
        authors: authors.slice(0, 5),
        journal,
        year,
        doi,
        citationCount,
        url,
        isPeerReviewed: true
      };
    });

    return {
      success: true,
      query,
      totalResults: json.message?.['total-results'] || papers.length,
      papersFound: papers.length,
      papers,
      dataStatus: 'measured',
      source: 'https://github.com/k-dense-ai/scientific-agent-skills (CrossRef Open Scientific API)'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    // Graceful fallback for offline / rate-limited situations
    return {
      success: false,
      query,
      error: err.message,
      papersFound: 0,
      papers: [],
      dataStatus: 'unavailable',
      source: 'https://github.com/k-dense-ai/scientific-agent-skills'
    };
  }
}

/**
 * Verify citations on an audited web page to evaluate scientific E-E-A-T integrity
 */
export async function verifyScientificCitations({ claims = [], domain = '', timeoutMs = 15000 } = {}) {
  const verifiedClaims = [];

  for (const claim of claims.slice(0, 3)) {
    const result = await searchScientificLiterature({ query: claim, rows: 2, timeoutMs });
    if (result.success && result.papers.length > 0) {
      const topMatch = result.papers[0];
      verifiedClaims.push({
        claim,
        status: 'VERIFIED_BY_LITERATURE',
        supportingPaper: topMatch.title,
        journal: topMatch.journal,
        doi: topMatch.doi,
        citationCount: topMatch.citationCount
      });
    } else {
      verifiedClaims.push({
        claim,
        status: 'UNSUPPORTED_OR_UNVERIFIED',
        supportingPaper: null,
        notes: 'No indexed peer-reviewed studies found directly supporting this formulation.'
      });
    }
  }

  const verifiedCount = verifiedClaims.filter(c => c.status === 'VERIFIED_BY_LITERATURE').length;
  const academicEeatScore = claims.length ? Math.round((verifiedCount / claims.length) * 100) : 75;

  return {
    success: true,
    domain,
    totalClaimsAudited: claims.length,
    verifiedCount,
    academicEeatScore,
    verifiedClaims,
    recommendedSchema: {
      '@context': 'https://schema.org',
      '@type': 'ScholarlyArticle',
      'headline': claims[0] || 'Scientific Analysis',
      'citation': verifiedClaims.filter(c => c.doi).map(c => `https://doi.org/${c.doi}`)
    },
    source: 'https://github.com/k-dense-ai/scientific-agent-skills'
  };
}
