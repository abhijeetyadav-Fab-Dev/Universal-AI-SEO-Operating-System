import * as cheerio from 'cheerio';

async function main() {
  const res = await fetch('https://yatradham.org/kumbh-mela-nashik/');
  const html = await res.text();
  const $ = cheerio.load(html);
  const links = [];
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && (href.startsWith('https://yatradham.org') || href.startsWith('/'))) {
      const fullUrl = href.startsWith('http') ? href : `https://yatradham.org${href}`;
      if (!links.includes(fullUrl)) links.push(fullUrl);
    }
  });
  console.log('Total internal links:', links.length);
  const relevant = links.filter(l => l.includes('nashik') || l.includes('kumbh') || l.includes('trimbak') || l.includes('dharamshala'));
  console.log('Relevant URLs:', relevant);
}

main();
