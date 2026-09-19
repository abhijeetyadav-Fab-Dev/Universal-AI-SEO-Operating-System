import {
  queryWikipediaBacklinks,
  queryHackerNewsMentions,
  queryDomainRdap,
  queryGoogleDns,
  queryWikidataEntity,
  queryWikipediaSummary,
  queryWikimediaPageviews,
  queryDatamuseLsiKeywords,
  queryGoogleSuggest
} from '../server/adapters/open_apis.js';

async function verifyAllOpenApis() {
  console.log('Testing all 9 open API functions in server/adapters/open_apis.js...\n');

  // 1. Wikipedia Backlinks
  const wikiLinks = await queryWikipediaBacklinks('github.com', 3);
  console.log('1. Wikipedia Backlinks:', wikiLinks.success ? `✅ Found ${wikiLinks.count} links` : `❌ ${wikiLinks.error}`);

  // 2. Hacker News Mentions
  const hn = await queryHackerNewsMentions('github.com', 3);
  console.log('2. Hacker News Mentions:', hn.success ? `✅ Found ${hn.count} discussions` : `❌ ${hn.error}`);

  // 3. Domain RDAP
  const rdap = await queryDomainRdap('github.com');
  console.log('3. Domain RDAP (WHOIS):', rdap.success ? `✅ Age: ${rdap.domainAgeFormatted}, Registrar: ${rdap.registrar}` : `❌ ${rdap.error}`);

  // 4. Google DoH
  const doh = await queryGoogleDns('github.com', 'A');
  console.log('4. Google DNS over HTTPS:', doh.success ? `✅ DNSSEC: ${doh.dnssecValidated}, Answers: ${doh.answers.length}` : `❌ ${doh.error}`);

  // 5. Wikidata Entity
  const wikidata = await queryWikidataEntity('GitHub');
  console.log('5. Wikidata Knowledge Graph:', wikidata.success ? `✅ Primary QID: ${wikidata.primaryEntity?.id} (${wikidata.primaryEntity?.label})` : `❌ ${wikidata.error}`);

  // 6. Wikipedia Summary
  const wikiSummary = await queryWikipediaSummary('GitHub');
  console.log('6. Wikipedia Page Summary:', wikiSummary.success ? `✅ Title: ${wikiSummary.title}, Extract length: ${wikiSummary.extract?.length}` : `❌ ${wikiSummary.error}`);

  // 7. Wikimedia Pageviews
  const pageviews = await queryWikimediaPageviews('GitHub', 14);
  console.log('7. Wikimedia Pageviews:', pageviews.success ? `✅ Avg daily views: ${pageviews.avgDailyViews}` : `❌ ${pageviews.error}`);

  // 8. Datamuse LSI Keywords
  const datamuse = await queryDatamuseLsiKeywords('seo', 5);
  console.log('8. Datamuse LSI Keywords:', datamuse.success ? `✅ Words: ${datamuse.words.map(w => w.word).join(', ')}` : `❌ ${datamuse.error}`);

  // 9. Google Suggest Autocomplete
  const suggest = await queryGoogleSuggest('seo audit');
  console.log('9. Google Suggest:', suggest.success ? `✅ Suggestions count: ${suggest.suggestions.length}` : `❌ ${suggest.error}`);

  console.log('\nAll 9 Open API functions tested.');
}

verifyAllOpenApis();
