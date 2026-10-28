import test from 'node:test';
import assert from 'node:assert/strict';
import { contactMessage, contactWhatsappUrl, csvFile, emailUrl, formatPhone, localizedContactMessage, localizedEmailSubject, parseImport, resolveSiteLanguage, uniqueContacts, whatsappUrl } from '../lib/client';
import type { Prospect } from '../lib/types';
import { canReuseAudit, CONTACT_SCAN_VERSION } from '../lib/audit-version';

const prospect = (): Prospect => ({
  id: 'abc123', url: 'https://negocio.org/', domain: 'negocio.org', name: 'Tienda Sur', description: 'Productos para el hogar', country: 'PE', category: 'Comercio y tiendas', status: 'active', score: 25,
  issues: [{id:'viewport', title:'Viewport ausente', detail:'Falta width=device-width.', category:'mobile', severity:'high', points:25}],
  contacts: [{ type:'email', value:'ventas@negocio.org', source:'https://negocio.org/contacto' }, { type:'phone', value:'012345678', source:'https://negocio.org/contacto' }],
  aiEvidence: { detected:false, label:'Origen IA no confirmado', evidence:[] },
  metrics: { responseMs:1000, htmlBytes:20000, viewport:false, title:true, h1:1, imageAltMissing:0, performance:null, accessibility:null },
  checkedAt:'2026-10-26T12:00:00.000Z', source:'https://negocio.org/', limitations:['Revisión del HTML público.'], stage:'new', note:'Revisar antes de contactar', previewImage:'https://negocio.org/portada.jpg', technologies:['WordPress'],
});

test('message adapts to observed issues, sender and business sector without asserting an AI origin', () => {
  const site = prospect();
  const message = contactMessage(site, ' Stack Studio ');
  assert.match(message, /Soy de Stack Studio\./);
  assert.match(message, /señales de problemas en la adaptación a celulares/);
  assert.match(message, /presentar mejor sus productos/);
  assert.ok(!message.includes('inteligencia artificial'));
  site.issues[0] = { ...site.issues[0], id:'placeholder-content', title:'Contenido de plantilla', category:'structure' };
  assert.match(contactMessage(site), /parece pendiente de personalizar/);
  site.category = 'Turismo y hoteles';
  assert.match(contactMessage(site), /consultas y reservas/);
  site.issues[0] = { ...site.issues[0], id:'content-overload', title:'Inicio con una gran concentración de contenido', category:'structure' };
  site.category = 'Salud y bienestar';
  const overloadMsg = contactMessage(site);
  assert.match(overloadMsg, /información concentrada en el inicio/);
  assert.match(overloadMsg, /agenden una cita/);
  site.issues[0] = { ...site.issues[0], id:'http', title:'La página consultada usa HTTP', category:'security' };
  site.category = 'Inmobiliarias';
  const httpMsg = contactMessage(site);
  assert.match(httpMsg, /HTTPS/);
  assert.match(httpMsg, /proyectos/);
});

test('unreachable sites use a tentative availability message, not invented design findings', () => {
  const site = { ...prospect(), status:'unreachable' as const, score:null, issues:[] };
  const message = contactMessage(site);
  assert.match(message, /quizá sea algo temporal/);
  assert.doesNotMatch(message, /cerrado|vulnerable|adaptación a celulares/);
});

test('WhatsApp and email links encode message text and reject malformed recipients', () => {
  const message = 'Hola & buenas\n¿Una propuesta? #Stack';
  const link = whatsappUrl('+51 (987) 654-321', message)!;
  assert.equal(new URL(link).hostname, 'wa.me');
  assert.equal(new URL(link).pathname, '/51987654321');
  assert.equal(new URL(link).searchParams.get('text'), message);
  for (const bad of ['javascript:51987654321', '123', '0051987654321', '+51;987654321', '+51\nBCC:12345678']) assert.equal(whatsappUrl(bad, message), null);
  const mail = emailUrl('hola+web@negocio.org', 'Tienda & Sur', message)!;
  assert.equal(new URL(mail).protocol, 'mailto:');
  assert.equal(new URL(mail).searchParams.get('body'), message);
  assert.equal(emailUrl('hola@negocio.org\r\nbcc:otra@negocio.org', 'Tienda', message), undefined);
  assert.equal(emailUrl('javascript:alert(1)', 'Tienda', message), undefined);
});

test('CSV preserves Spanish, multiline quotes and neutralizes formula-like values including leading whitespace', () => {
  const site = prospect(); site.name = '=HYPERLINK("https://evil.org")'; site.note = '  \t=SUM(1,2)\nSegunda línea';
  const csv = csvFile([site]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=HYPERLINK(""https://evil.org"")"'));
  assert.ok(csv.includes('"\'  \t=SUM(1,2)\nSegunda línea"'));
  assert.ok(csv.includes('Teléfono'));
});

test('valid JSON backup round-trips fields, local phone numbers and derives the displayed domain from URL', () => {
  const site = prospect(); site.domain = 'untrusted-display.org';
  const imported = parseImport(JSON.stringify({ version:1, prospects:[site] }));
  assert.equal(imported.length, 1); assert.equal(imported[0].domain, 'negocio.org');
  assert.equal(imported[0].contacts[1].value, '012345678');
  assert.equal(imported[0].note, site.note); assert.equal(imported[0].saved, true);
  assert.equal(imported[0].checkedAt, site.checkedAt);
});

test('cached records preserve content metrics while rejecting invalid imported counts', () => {
  const site = prospect();
  Object.assign(site.metrics, { wordCount: 4200, linkCount: 145, domElements: 1800, headingCount: 20, imageCount: 32, blockingScripts: 6 });
  const [restored] = parseImport(JSON.stringify([site]));
  assert.deepEqual(restored.metrics, site.metrics);
  for (const count of [-1, 2.5, null, '4200', 10_000_001]) {
    assert.throws(() => parseImport(JSON.stringify([{ ...site, metrics: { ...site.metrics, wordCount: count } }])));
  }
});

test('contact scan versions survive backups while legacy saved records remain readable', () => {
  const site = { ...prospect(), contactScanVersion: CONTACT_SCAN_VERSION };
  const [restored] = parseImport(JSON.stringify([site]));
  assert.equal(restored.contactScanVersion, CONTACT_SCAN_VERSION);
  assert.equal(parseImport(JSON.stringify([prospect()]))[0].contactScanVersion, undefined);
  for (const version of [0, -1, 1.5, null, '2', 1_000_001]) {
    assert.throws(() => parseImport(JSON.stringify([{ ...site, contactScanVersion: version }])));
  }
});

test('site-wide review evidence and crawl coverage survive backup and browser restoration', () => {
  const site = prospect();
  site.issues[0].sources = ['https://negocio.org/', 'https://negocio.org/servicios'];
  site.pageReviews = [
    { url: site.url, score: 25, issueIds: ['viewport'], metrics: { ...site.metrics, wordCount: 250, linkCount: 10 } },
    { url: 'https://negocio.org/servicios', score: 30, issueIds: ['viewport', 'missing-title'], metrics: { ...site.metrics, title: false, wordCount: 1200 } },
  ];
  site.crawl = { attempted: 3, failed: 1, limit: 10, limited: false };
  const [restored] = parseImport(JSON.stringify({ version: 1, prospects: [site] }));
  assert.deepEqual(restored.issues, site.issues);
  assert.deepEqual(restored.pageReviews, site.pageReviews);
  assert.deepEqual(restored.crawl, site.crawl);
  assert.equal(restored.note, site.note);
  assert.equal(restored.stage, site.stage);
  const [legacy] = parseImport(JSON.stringify([prospect()]));
  assert.equal(legacy.pageReviews, undefined);
  assert.equal(legacy.crawl, undefined);
  assert.equal(legacy.issues[0].sources, undefined);
});

test('import rejects unsafe page evidence, malformed nested reviews and inconsistent crawl coverage', () => {
  const site = prospect();
  const page = { url: site.url, score: 25, issueIds: ['viewport'], metrics: site.metrics };
  const crawl = { attempted: 3, failed: 1, limit: 10, limited: false };
  for (const badUrl of ['javascript:alert(1)', 'http://127.0.0.1/', 'https://secret.internal', 'https://user:pass@negocio.org']) {
    assert.throws(() => parseImport(JSON.stringify([{ ...site, pageReviews: [{ ...page, url: badUrl }] }])));
    assert.throws(() => parseImport(JSON.stringify([{ ...site, issues: [{ ...site.issues[0], sources: [badUrl] }] }])));
  }
  for (const badPage of [
    { ...page, score: -1 }, { ...page, score: 101 }, { ...page, score: '25' },
    { ...page, issueIds: [{}] }, { ...page, issueIds: Array(101).fill('viewport') },
    { ...page, metrics: { ...site.metrics, wordCount: 1.5 } },
    { ...page, metrics: { ...site.metrics, responseMs: -1 } },
    { ...page, metrics: { ...site.metrics, viewport: 'true' } },
  ]) assert.throws(() => parseImport(JSON.stringify([{ ...site, pageReviews: [badPage] }])));
  assert.throws(() => parseImport(JSON.stringify([{ ...site, pageReviews: Array(13).fill(page) }])));
  assert.throws(() => parseImport(JSON.stringify([{ ...site, issues: [{ ...site.issues[0], sources: Array(13).fill(site.url) }] }])));
  for (const badCrawl of [
    { ...crawl, attempted: -1 }, { ...crawl, attempted: 101 }, { ...crawl, attempted: 2.5 },
    { ...crawl, attempted: null }, { ...crawl, failed: 4 }, { ...crawl, failed: '1' },
    { ...crawl, limit: 2 }, { ...crawl, limit: 0 }, { ...crawl, limited: 1 },
  ]) assert.throws(() => parseImport(JSON.stringify([{ ...site, crawl: badCrawl }])));
});

test('search cache refreshes audits made before the current contact scan without deleting them', () => {
  const now = Date.parse('2026-10-28T12:00:00.000Z');
  const site = { ...prospect(), contactScanVersion: CONTACT_SCAN_VERSION, checkedAt: new Date(now - 1000).toISOString() };
  site.metrics.wordCount = 4200;
  assert.equal(canReuseAudit(site, now), true);
  assert.equal(canReuseAudit({ ...site, contactScanVersion: undefined }, now), false);
  assert.equal(canReuseAudit({ ...site, contactScanVersion: CONTACT_SCAN_VERSION - 1 }, now), false);
  assert.equal(canReuseAudit({ ...site, checkedAt: new Date(now - 86_400_000).toISOString() }, now), false);
  assert.equal(canReuseAudit({ ...site, checkedAt: new Date(now + 1000).toISOString() }, now), false);
  assert.equal(canReuseAudit({ ...site, status: 'blocked' }, now), false);
  assert.equal(canReuseAudit({ ...site, metrics: { ...site.metrics, wordCount: undefined } }, now), false);
  assert.equal(canReuseAudit(parseImport(JSON.stringify([site]))[0], now), true);
});

test('import rejects active links using executable protocols, credentials or local targets', () => {
  for (const badUrl of ['javascript:alert(1)', 'data:text/html,test', 'https://user:pass@negocio.org', 'http://127.1/', 'http://2130706433/', 'http://[::ffff:127.0.0.1]/', 'https://secret.internal']) {
    assert.throws(() => parseImport(JSON.stringify([{ ...prospect(), url:badUrl }])));
    const contact = prospect(); contact.contacts[0].source = badUrl;
    assert.throws(() => parseImport(JSON.stringify([contact])));
    assert.throws(() => parseImport(JSON.stringify([{ ...prospect(), previewImage:badUrl }])));
  }
});

test('import validates every rendered nested object instead of forwarding arbitrary JSON', () => {
  const cases: unknown[] = [
    { ...prospect(), description:{ surprise:true } },
    { ...prospect(), limitations:[{ surprise:true }] },
    { ...prospect(), technologies:[{ surprise:true }] },
    { ...prospect(), aiEvidence:{ detected:true, label:{ surprise:true }, evidence:[] } },
    { ...prospect(), metrics:{ ...prospect().metrics, h1:{ surprise:true } } },
    { ...prospect(), issues:[{ ...prospect().issues[0], category:'__proto__' }] },
    { ...prospect(), issues:[{ ...prospect().issues[0], points:-50 }] },
    { ...prospect(), contacts:[{ type:'email', value:'a@b.org\nbcc:c@d.org', source:'https://negocio.org' }] },
    { ...prospect(), stage:'toString' },
    { ...prospect(), status:'unreachable', score:90 },
    { ...prospect(), checkedAt:'not a date' },
    { ...prospect(), country:{ code:'PE' } },
  ];
  for (const data of cases) assert.throws(() => parseImport(JSON.stringify([data])));
  assert.throws(() => parseImport('null'));
  assert.throws(() => parseImport('{invalid JSON}'));
  assert.throws(() => parseImport(JSON.stringify([prospect(), prospect()])));
});

test('import rebuilds a known schema and never propagates extra object keys', () => {
  const data = JSON.parse(JSON.stringify(prospect()));
  Object.defineProperty(data, '__proto__', { value:{ isAdmin:true }, enumerable:true }); data.evilExtra = { payload:'unexpected' };
  const [result] = parseImport(JSON.stringify([data]));
  assert.equal(Object.hasOwn(result, '__proto__'), false);
  assert.equal(Object.hasOwn(result, 'evilExtra'), false);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
});

test('formatPhone, uniqueContacts and contactWhatsappUrl format +51 spacing, deduplicate numbers and keep predefined message', () => {
  assert.equal(formatPhone('+51932526326', 'PE'), '+51 932 526 326');
  assert.equal(formatPhone('51932526326', 'PE'), '+51 932 526 326');
  assert.equal(formatPhone('932526326', 'PE'), '+51 932 526 326');

  const deduped = uniqueContacts([
    { type: 'phone', value: '+51932526326', source: 'https://negocio.org' },
    { type: 'whatsapp', value: '51932526326', source: 'https://negocio.org/contacto' },
    { type: 'phone', value: '932526326', source: 'https://negocio.org/pie' },
    { type: 'email', value: 'Ventas@Negocio.org', source: 'https://negocio.org' },
    { type: 'email', value: 'ventas@negocio.org', source: 'https://negocio.org/contacto' },
  ], 'PE');

  assert.equal(deduped.length, 2);
  assert.equal(deduped[0].type, 'whatsapp');
  assert.equal(formatPhone(deduped[0].value, 'PE'), '+51 932 526 326');
  assert.equal(deduped[1].value, 'ventas@negocio.org');

  const msg = 'Hola, equipo de Tienda Sur.';
  const waLink = contactWhatsappUrl('932526326', msg, 'PE')!;
  assert.equal(new URL(waLink).pathname, '/51932526326');
  assert.equal(new URL(waLink).searchParams.get('text'), msg);
});

test('resolveSiteLanguage and localizedContactMessage translate outreach into site language (Afghanistan, Russia, English, Spanish)', () => {
  const base = prospect();

  const afSite = { ...base, country: 'AF', domain: 'kabulmarket.af', name: 'Kabul Market' };
  const afLang = resolveSiteLanguage(afSite);
  assert.equal(afLang, 'ps');
  const afMsg = localizedContactMessage(afSite, 'Stack', afLang);
  assert.match(afMsg, /سلام/);
  assert.match(afMsg, /Kabul Market/);

  const ruSite = { ...base, country: 'RU', domain: 'avtoservis.ru', name: 'Автосервис Москва' };
  const ruLang = resolveSiteLanguage(ruSite);
  assert.equal(ruLang, 'ru');
  const ruMsg = localizedContactMessage(ruSite, 'Stack', ruLang);
  assert.match(ruMsg, /Здравствуйте/);
  assert.match(localizedEmailSubject(ruSite.name, ruLang), /Идея/);

  const usSite = { ...base, country: 'US', domain: 'bakershop.com', name: 'Baker Shop', description: 'Welcome to our local bakery shop' };
  assert.equal(resolveSiteLanguage(usSite), 'en');
  assert.match(localizedContactMessage(usSite, 'Stack', 'en'), /Hello Baker Shop team/);

  assert.equal(resolveSiteLanguage(base), 'es');
});

test('outreach messages and JSON imports support manga, SaaS and general service categories', () => {
  const mangaSite = { ...prospect(), category: 'Manga, anime y cómics', name: 'Kaze Manga' };
  assert.match(contactMessage(mangaSite, 'Stack'), /fluidez de lectura, velocidad y experiencia/);
  const [restoredManga] = parseImport(JSON.stringify([mangaSite]));
  assert.equal(restoredManga.category, 'Manga, anime y cómics');

  const saasSite = { ...prospect(), id: 'saas01', category: 'Servicios digitales y SaaS', name: 'CloudFlow' };
  assert.match(contactMessage(saasSite, 'Stack'), /rendimiento de su plataforma/);
  const [restoredSaas] = parseImport(JSON.stringify([saasSite]));
  assert.equal(restoredSaas.category, 'Servicios digitales y SaaS');
});
