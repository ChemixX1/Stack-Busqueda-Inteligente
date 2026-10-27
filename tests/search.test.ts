import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchQuery, filterCandidates, parseBingRss, parseDuckDuckGo, searchWeb, validateSearchInput } from '../lib/server/search';
import { categories, countries } from '../lib/catalog';

const html = (url = 'https://negocio-real.pe/contacto') => `<div id="links"><div class="result"><a class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent(url)}">Negocio &amp; compañía</a><div class="result__snippet">Servicios en Lima</div></div></div>`;
const rss = '<rss version="2.0"><channel><item><title>Hotel local</title><link>https://hotel-local.pe/reservas</link><description>Habitaciones en Lima</description></item></channel></rss>';
const input = { query: 'Lima', country: 'PE', category: 'Restaurantes', limit: 1 };

function mockFetch(responses: Response[], calls: URL[]): typeof fetch {
  return (async (url: RequestInfo | URL) => {
    calls.push(new URL(String(url)));
    const response = responses.shift();
    assert.ok(response, 'Unexpected extra provider request');
    return response;
  }) as typeof fetch;
}

test('automatic discovery accepts empty inputs and rotates meaningful queries across rounds', () => {
  const defaults = validateSearchInput({ query: '', country: 'PE', category: '' });
  assert.equal(defaults.category, 'Todos los rubros');
  assert.match(buildSearchQuery(defaults), /restaurante Perú contacto/);
  assert.match(buildSearchQuery({ ...defaults, offset: 1 }), /clínica dental Perú sitio oficial/);
  assert.equal(buildSearchQuery({ ...defaults, query: 'veterinarias Lima' }), 'veterinarias Lima Perú contacto');
  assert.equal(buildSearchQuery({ ...defaults, query: 'panaderías Arequipa' }), 'panaderías Arequipa Perú contacto');
  assert.equal(buildSearchQuery({ ...defaults, query: 'Lima' }), 'Lima Perú contacto');
  const bounded = validateSearchInput({ ...input, limit: 900, offset: 900 });
  assert.equal(bounded.limit, 12); assert.equal(bounded.offset, 59);
  assert.equal(validateSearchInput({ ...input, limit: Infinity }).limit, 8);
  assert.throws(() => validateSearchInput({ query: 'x'.repeat(201) }), { code: 'INVALID_INPUT' });
  assert.throws(() => validateSearchInput({ country: 'ZZ' }), { code: 'INVALID_INPUT' });
  assert.match(buildSearchQuery(bounded), /Perú/);
});

test('all ISO regions are searchable and worldwide discovery rotates languages without a Spanish restriction', () => {
  assert.equal(countries.length, 250);
  assert.equal(new Set(countries.map(([code]) => code)).size, 250);
  for (const country of ['US', 'BR', 'FR', 'DE', 'JP', 'CN', 'IN', 'ZA', 'AU', 'NZ', 'AE', 'NG', 'TH', 'KR']) {
    const validated = validateSearchInput({ ...input, query: '', country: country.toLowerCase() });
    assert.equal(validated.country, country);
    assert.ok(buildSearchQuery(validated).length > 5);
  }
  assert.match(buildSearchQuery({ ...input, query: '', country: 'BR' }), /restaurante Brasil contato/);
  assert.match(buildSearchQuery({ ...input, query: '', country: 'DE' }), /Restaurant Deutschland Kontakt/);
  assert.match(buildSearchQuery({ ...input, query: '', country: 'JP' }), /レストラン 日本 お問い合わせ/);
  const worldwide = Array.from({ length: 24 }, (_, offset) => buildSearchQuery({ ...input, query: '', country: 'ALL', offset }));
  assert.equal(new Set(worldwide).size, 24);
  assert.match(worldwide[1], /restaurant United States contact/);
  assert.match(worldwide[2], /restaurante Brasil contato/);
  assert.match(worldwide[5], /レストラン/);
  assert.ok(worldwide.every(query => !query.includes('en español')));
  assert.match(buildSearchQuery({ ...input, query: 'Kyoto', country: 'ALL', offset: 5 }), /^Kyoto /);
  assert.doesNotMatch(buildSearchQuery({ ...input, query: 'Kyoto', country: 'ALL', offset: 1 }), /United States/);
});

test('public HTML parser unwraps search links and rejects challenge pages', () => {
  assert.deepEqual(parseDuckDuckGo(html()), [{ url: 'https://negocio-real.pe/contacto', title: 'Negocio & compañía', description: 'Servicios en Lima' }]);
  assert.deepEqual(parseDuckDuckGo('<div class="no-results">No results</div>'), []);
  assert.throws(() => parseDuckDuckGo('<form class="challenge-form"></form>'), { code: 'SEARCH_BLOCKED' });
  assert.throws(() => parseDuckDuckGo('<html><body>Unknown page</body></html>'), { code: 'SEARCH_RESPONSE' });
  assert.equal(parseDuckDuckGo(html().replace('class="result"', 'class="result result--ad"')).length, 0);
});

test('RSS parser distinguishes real empty feeds from invalid provider output', () => {
  assert.equal(parseBingRss(rss)[0].url, 'https://hotel-local.pe/reservas');
  assert.deepEqual(parseBingRss('<rss><channel></channel></rss>'), []);
  assert.throws(() => parseBingRss('<html>Please try again</html>'), { code: 'SEARCH_RESPONSE' });
});

test('candidates exclude private URLs, aggregators, articles and duplicate domains, then audit homepages', () => {
  const entries = [
    ['https://www.negocio-real.pe/contacto', 'Negocio'], ['https://negocio-real.pe/nosotros', 'Repetido'],
    ['http://127.0.0.1', 'Privado'], ['https://facebook.com/negocio', 'Red social'], ['https://www.tripadvisor.com.pe/Restaurants', 'Directorio'],
    ['https://news.pe/blog/mejores-restaurantes', 'Artículo'], ['https://listado.pe/', 'Los 10 mejores restaurantes'],
    ['https://otro-negocio.pe/catalogo.pdf', 'Documento'], ['https://otro-negocio.pe/?utm_source=search', 'Otro negocio'],
  ];
  assert.deepEqual(filterCandidates(entries.map(([url, title]) => ({ url, title, description: '' }))).map(x => x.url), ['https://www.negocio-real.pe/', 'https://otro-negocio.pe/']);
});

test('search works without credentials and uses only real provider candidates', async () => {
  const previous = process.env.BRAVE_SEARCH_API_KEY; delete process.env.BRAVE_SEARCH_API_KEY;
  try {
    const calls: URL[] = [];
    const result = await searchWeb(input, mockFetch([new Response(html())], calls));
    assert.equal(result.provider, 'DuckDuckGo'); assert.equal(result.results[0].url, 'https://negocio-real.pe/');
    assert.equal(calls.length, 1); assert.equal(calls[0].hostname, 'html.duckduckgo.com');
    assert.match(calls[0].searchParams.get('q')!, /Lima restaurante Perú contacto/);
  } finally { if (previous === undefined) delete process.env.BRAVE_SEARCH_API_KEY; else process.env.BRAVE_SEARCH_API_KEY = previous; }
});

test('blocked public search falls back to RSS without solving or bypassing the block', async () => {
  const previous = process.env.BRAVE_SEARCH_API_KEY; delete process.env.BRAVE_SEARCH_API_KEY;
  try {
    const calls: URL[] = [];
    const result = await searchWeb(input, mockFetch([new Response('<form class="challenge-form"></form>'), new Response(rss)], calls));
    assert.equal(result.provider, 'Bing RSS'); assert.equal(result.results[0].url, 'https://hotel-local.pe/');
    assert.match(result.warning!, /Bing RSS/); assert.equal(calls.length, 2);
  } finally { if (previous === undefined) delete process.env.BRAVE_SEARCH_API_KEY; else process.env.BRAVE_SEARCH_API_KEY = previous; }
});

test('search metadata identifies the actual category used by automatic discovery', async () => {
  const previous = process.env.BRAVE_SEARCH_API_KEY; delete process.env.BRAVE_SEARCH_API_KEY;
  try {
    const automatic = validateSearchInput({ query: '', country: 'PE', offset: 1, limit: 1 });
    const result = await searchWeb(automatic, mockFetch([new Response(html())], []));
    assert.equal(result.category, 'Salud y bienestar');
    assert.match(result.query, /clínica dental/);
    const freeText = await searchWeb({ ...automatic, query: 'veterinarias Lima' }, mockFetch([new Response(html())], []));
    assert.equal(freeText.category, 'Todos los rubros');
    assert.doesNotMatch(freeText.query, /restaurante|clínica dental/);
    const explicit = await searchWeb(input, mockFetch([new Response(html())], []));
    assert.equal(explicit.category, 'Restaurantes');
  } finally { if (previous === undefined) delete process.env.BRAVE_SEARCH_API_KEY; else process.env.BRAVE_SEARCH_API_KEY = previous; }
});

test('discovery supplements sparse results across providers and deduplicates homepages', async () => {
  const previous = process.env.BRAVE_SEARCH_API_KEY; delete process.env.BRAVE_SEARCH_API_KEY;
  try {
    const calls: URL[] = [];
    const result = await searchWeb({ ...input, limit: 6 }, mockFetch([new Response(html()), new Response(rss)], calls));
    assert.equal(result.provider, 'DuckDuckGo + Bing RSS');
    assert.equal(result.results.length, 2);
    assert.equal(calls.length, 2);
    const duplicate = rss.replaceAll('https://hotel-local.pe/reservas', 'https://negocio-real.pe/about');
    const unique = await searchWeb({ ...input, limit: 6 }, mockFetch([new Response(html()), new Response(duplicate)], []));
    assert.equal(unique.results.length, 1);
    assert.equal(unique.provider, 'DuckDuckGo');
    const partial = await searchWeb({ ...input, limit: 6 }, mockFetch([new Response(html()), new Response('', { status: 429 })], []));
    assert.equal(partial.results.length, 1);
    assert.match(partial.warning!, /conservados/);
  } finally { if (previous === undefined) delete process.env.BRAVE_SEARCH_API_KEY; else process.env.BRAVE_SEARCH_API_KEY = previous; }
});

test('international directories and ranking articles are excluded without removing business homepages', () => {
  const entries = [
    ['https://yellowpages.com/', 'Restaurant directory'], ['https://www.pagesjaunes.fr/', 'Annuaire'],
    ['https://justdial.com/Mumbai', 'Directory'], ['https://tabelog.com/tokyo/', 'Restaurants'],
    ['https://guide.michelin.com/', 'Restaurants Étoilés'], ['https://www.service-public.gouv.fr/', 'Titres-restaurant'],
    ['https://listing.test/', '10 best restaurants in Paris'], ['https://news.test/news/local', 'Business news'],
    ['https://hotel.example.org/contact', 'Hotel Sakura'], ['https://restaurant.example.org/', 'Best Restaurant'],
  ];
  assert.deepEqual(filterCandidates(entries.map(([url, title]) => ({ url, title, description: '' }))).map(x => x.title), ['Hotel Sakura', 'Best Restaurant']);
});

test('Brave uses supported country and language parameters for worldwide discovery', async () => {
  const previous = process.env.BRAVE_SEARCH_API_KEY; process.env.BRAVE_SEARCH_API_KEY = 'test-secret';
  try {
    for (const [country, offset, expectedLanguage, expectedCountry] of [['JP', 0, 'jp', 'JP'], ['CN', 0, 'zh-hans', 'CN'], ['PE', 0, 'es', 'ALL'], ['ALL', 1, 'en', 'ALL']] as const) {
      const calls: URL[] = [];
      await searchWeb({ ...input, country, offset }, mockFetch([Response.json({ web: { results: [{ url: 'https://business.example.org/', title: 'Business', description: '' }] } })], calls));
      assert.equal(calls[0].searchParams.get('search_lang'), expectedLanguage);
      assert.equal(calls[0].searchParams.get('country'), expectedCountry);
      assert.equal(calls[0].searchParams.get('q')?.includes('en español'), false);
    }
  } finally { if (previous === undefined) delete process.env.BRAVE_SEARCH_API_KEY; else process.env.BRAVE_SEARCH_API_KEY = previous; }
});

test('invalid Brave response falls back to public search and does not expose its key', async () => {
  const previous = process.env.BRAVE_SEARCH_API_KEY; process.env.BRAVE_SEARCH_API_KEY = 'test-secret';
  try {
    const calls: URL[] = [];
    const result = await searchWeb(input, mockFetch([new Response('not JSON'), new Response(html())], calls));
    assert.equal(result.provider, 'DuckDuckGo'); assert.equal(calls[0].hostname, 'api.search.brave.com');
    assert.equal(JSON.stringify(result).includes('test-secret'), false);
  } finally { if (previous === undefined) delete process.env.BRAVE_SEARCH_API_KEY; else process.env.BRAVE_SEARCH_API_KEY = previous; }
});

test('all blocked providers report retryable failure; empty successful feeds stay empty', async () => {
  const previous = process.env.BRAVE_SEARCH_API_KEY; delete process.env.BRAVE_SEARCH_API_KEY;
  try {
    await assert.rejects(searchWeb(input, mockFetch([new Response('', { status: 429 }), new Response('', { status: 403 })], [])), { code: 'SEARCH_RATE_LIMIT', status: 429 });
    const result = await searchWeb(input, mockFetch([new Response('<div class="no-results"></div>'), new Response('<rss><channel></channel></rss>')], []));
    assert.deepEqual(result.results, []); assert.match(result.warning!, /No se encontraron/);
    await assert.rejects(searchWeb(input, mockFetch([new Response('broken'), new Response('broken')], [])), { code: 'SEARCH_UNAVAILABLE', status: 503 });
  } finally { if (previous === undefined) delete process.env.BRAVE_SEARCH_API_KEY; else process.env.BRAVE_SEARCH_API_KEY = previous; }
});

test('internet-wide categories cover manga, digital SaaS, services, gaming and media across languages while excluding giant platforms', () => {
  assert.ok(categories.includes('Manga, anime y cómics'));
  assert.ok(categories.includes('Servicios digitales y SaaS'));
  assert.ok(categories.includes('Servicios técnicos y hogar'));
  assert.ok(categories.includes('Videojuegos y comunidades'));
  assert.ok(categories.includes('Entretenimiento y streaming'));
  assert.ok(categories.includes('Medios, blogs y portales'));

  for (const category of categories.slice(1)) {
    for (const country of ['PE', 'US', 'JP', 'ALL']) {
      const validated = validateSearchInput({ query: '', country, category, offset: 0 });
      const built = buildSearchQuery(validated);
      assert.ok(built.length >= 6, `Empty query for ${category} (${country})`);
    }
  }

  const mangaWorld = buildSearchQuery(validateSearchInput({ query: '', country: 'ALL', category: 'Manga, anime y cómics', offset: 0 }));
  assert.match(mangaWorld, /manga/i);
  assert.doesNotMatch(mangaWorld, /reservas/);

  const saasEn = buildSearchQuery(validateSearchInput({ query: '', country: 'ALL', category: 'Servicios digitales y SaaS', offset: 1 }));
  assert.match(saasEn, /SaaS|online|app/i);

  const candidates = filterCandidates([
    { url: 'https://crunchyroll.com/series/abc', title: 'Crunchyroll', description: '' },
    { url: 'https://myanimelist.net/manga/1', title: 'MAL', description: '' },
    { url: 'https://github.com/org/repo', title: 'Repo', description: '' },
    { url: 'https://g2.com/categories/crm', title: 'CRM Directory', description: '' },
    { url: 'https://mangalector-indie.org/capitulo-1', title: 'Manga Lector Indie', description: 'Lee manga online' },
    { url: 'https://saas-herramienta.io/pricing', title: 'SaaS Herramienta', description: 'Plataforma web' },
  ]);
  assert.deepEqual(candidates.map(item => item.url), ['https://mangalector-indie.org/', 'https://saas-herramienta.io/']);
});

test('manga discovery requires topic evidence and excludes dictionary and acronym matches', () => {
  const unrelated = [
    { url: 'https://lactationtraining.com/', title: 'Lactation Education Resources - LER', description: 'Education and training' },
    { url: 'https://en.wiktionary.org/wiki/manga', title: 'manga - Wiktionary', description: 'Dictionary definition' },
    { url: 'https://salud.example.org/', title: 'Leer sobre salud', description: 'Consejos de bienestar' },
  ];
  const relevant = ['Lee manga online', 'Read comics', 'Fumetti online', 'Bande dessinée', 'Novelas ligeras', '漫画を読む', '漫畫閱讀', '웹툰 플랫폼', 'قراءة مانجا', 'मंगा पढ़ें'].map((title, index) => ({
    url: `https://reader-${index}.example.org/`, title, description: '',
  }));
  const results = filterCandidates([...unrelated, ...relevant], 12, 'Manga, anime y cómics');
  assert.deepEqual(results.map(item => item.url), relevant.map(item => item.url));
  assert.equal(filterCandidates([unrelated[0]], 12, 'Educación').length, 1);
});

test('manga search supplements an irrelevant provider response with relevant fallback results', async () => {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  delete process.env.BRAVE_SEARCH_API_KEY;
  try {
    const calls: URL[] = [];
    const fallback = '<rss><channel><item><title>Read manga online</title><link>https://reader.example.org/</link><description>Comics and manga</description></item></channel></rss>';
    const result = await searchWeb({ query: '', country: 'ALL', category: 'Manga, anime y cómics', limit: 1 }, mockFetch([
      new Response(html('https://lactationtraining.com/')),
      new Response(fallback),
    ], calls));
    assert.equal(calls.length, 2);
    assert.equal(result.provider, 'Bing RSS');
    assert.deepEqual(result.results.map(item => item.url), ['https://reader.example.org/']);
  } finally {
    if (key === undefined) delete process.env.BRAVE_SEARCH_API_KEY;
    else process.env.BRAVE_SEARCH_API_KEY = key;
  }
});
