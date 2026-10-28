import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHtml, contactPages, extractContacts, priorityScore, reviewPages } from '../lib/server/analyze';
import { auditWebsite } from '../lib/server/audit';
import { CONTACT_SCAN_VERSION } from '../lib/audit-version';
import type { PublicResponse } from '../lib/server/safe-fetch';

const response = (body: string): PublicResponse => ({ url: 'https://negocio.org/', status: 200, headers: { 'content-type': 'text/html', 'strict-transport-security': 'max-age=31536000', 'content-security-policy': "default-src 'self'" }, body, bytes: Buffer.byteLength(body), responseMs: 100 });

test('contacts come from published content and valid links, excluding scripts and obvious assets', () => {
  const html = `<body><a href="mailto:VENTAS@NEGOCIO.ORG?subject=Hola">Correo</a><a href="tel:+51987654321">Llamar</a><a href="https://wa.me/51987654321">WhatsApp</a><a href="https://api.whatsapp.com/send?phone=51987654321">Otro enlace</a><p>ventas@negocio.org</p><script>const privateEmail = 'hidden@negocio.org';</script><p>hero@2x.png</p></body>`;
  const contacts = extractContacts(html, 'https://negocio.org/contacto');
  assert.equal(contacts.length, 3);
  assert.equal(contacts[0].value, 'ventas@negocio.org');
  assert.ok(contacts.every(c => c.source === 'https://negocio.org/contacto'));
  assert.ok(!contacts.some(c => c.value.includes('hidden')));
});

test('contact discovery prioritizes contact links and stays within the business website', () => {
  const pages = contactPages('<a href="/contacto">Contacto</a><a href="https://other.org/contact">Contacto</a><a href="/sobre-nosotros">Nosotros</a><a href="/contacto-2">Contacto 2</a><a href="/contacto.pdf">PDF</a>', 'https://negocio.org/');
  assert.deepEqual(pages, ['https://negocio.org/contacto', 'https://negocio.org/contacto-2', 'https://negocio.org/sobre-nosotros']);
});

test('contact links recognize Spanish labels, accessible labels, www aliases and normalized tracking URLs', () => {
  const pages = contactPages(`<a href="/empresa">Quiénes somos</a><a href="/hablar" aria-label="Contáctanos">Icono</a><a href="https://www.negocio.org/contacto?utm_source=menu#equipo">Contacto</a><a href="https://www.negocio.org/contacto#ventas">Contacto duplicado</a><a href="#contacto">Sección actual</a><a href="https://negocio.org@other.org/contact">Externo</a><a href="https://otro.negocio.org/contact">Subdominio</a><a href="https://user:password@negocio.org/contact">Credenciales</a><a href="/contacto.js">Recurso</a>`, 'https://negocio.org/');
  assert.deepEqual(pages, ['https://negocio.org/hablar', 'https://www.negocio.org/contacto', 'https://negocio.org/empresa']);
});

test('site review samples different content sections and excludes assets, account actions and external links', () => {
  const links = `<a href="/contacto">Contacto</a>${Array.from({ length: 8 }, (_, index) => `<a href="/productos/${index}">Producto ${index}</a>`).join('')}<a href="/servicios/diseno">Diseño</a><a href="/blog/guia">Guía</a><a href="/login">Login</a><a href="/logout?next=contact">Contacto</a><a href="/?action=contact">Contacto</a><a href="/carrito">Carrito</a><a href="/?add-to-cart=3">Añadir producto</a><a href="/api/contact">API</a><a href="/foto.jpg">Foto</a><a href="https://externo.org/servicios">Externo</a>`;
  const pages = reviewPages(links, 'https://negocio.org/');
  assert.deepEqual(pages.slice(0, 4), ['https://negocio.org/contacto', 'https://negocio.org/productos/0', 'https://negocio.org/servicios/diseno', 'https://negocio.org/blog/guia']);
  assert.ok(pages.every(url => !/login|logout|action=|carrito|add-to-cart|api\/|\.jpg|externo/.test(url)));
  assert.deepEqual(contactPages(links, 'https://negocio.org/'), ['https://negocio.org/contacto']);
});

test('audits follow nested business pages and retain contacts from their actual source', async () => {
  const bodies: Record<string, string> = {
    '/': '<title>Negocio</title><a href="/empresa">Nosotros</a><a href="/servicios">Servicios</a>',
    '/empresa': '<title>Empresa</title><a href="/hablar" aria-label="Contáctanos">Asesoría</a>',
    '/servicios': '<title>Servicios</title><h1>Asesoría técnica</h1>',
    '/hablar': '<title>Contacto</title><a href="mailto:ventas@negocio.org">Correo</a><a href="tel:+51987654321">Teléfono</a>',
  };
  const requested: string[] = [];
  const audit = await auditWebsite({ url: 'https://negocio.org/' }, async (input, options) => {
    const url = new URL(String(input)); requested.push(url.pathname);
    if (url.pathname !== '/') { assert.ok(options?.timeoutMs! <= 4000); assert.equal(options?.maxBytes, 600000); }
    assert.ok(Object.hasOwn(bodies, url.pathname), `Unexpected URL ${url.href}`);
    return { ...response(bodies[url.pathname]), url: url.href };
  });
  assert.ok(requested.includes('/hablar'));
  assert.deepEqual(audit.contacts.map(contact => [contact.type, contact.source]), [['email', 'https://negocio.org/hablar'], ['phone', 'https://negocio.org/hablar']]);
  assert.equal(audit.contactScanVersion, CONTACT_SCAN_VERSION);
  assert.equal(audit.pageReviews?.length, 4);
  assert.deepEqual(audit.crawl, { attempted: 4, failed: 0, limit: 10, limited: false });
});

test('an audit starting at an isolated inner URL checks home navigation for other sections', async () => {
  const bodies: Record<string, string> = {
    '/productos/bicicleta': '<title>Bicicleta</title><h1>Producto</h1>',
    '/': '<title>Negocio</title><a href="/nosotros">Nosotros</a>',
    '/nosotros': '<title>Empresa</title><a href="https://www.negocio.org/contacto">Contacto</a>',
    '/contacto': '<title>Contacto</title><p>WhatsApp: +51 987 654 321</p><a href="https://wa.me/51987654321">Chat</a>',
  };
  const audit = await auditWebsite({ url: 'https://negocio.org/productos/bicicleta' }, async input => {
    const url = new URL(String(input));
    assert.ok(Object.hasOwn(bodies, url.pathname), `Unexpected URL ${url.href}`);
    return { ...response(bodies[url.pathname]), url: url.href };
  });
  assert.ok(audit.contacts.some(contact => contact.type === 'whatsapp' && contact.source === 'https://www.negocio.org/contacto'));
  assert.equal(audit.crawl?.attempted, 4);
});

test('nested contact pages are prioritized before a long remaining catalogue queue', async () => {
  const requested: string[] = [];
  const audit = await auditWebsite({ url: 'https://negocio.org/' }, async input => {
    const url = new URL(String(input)); requested.push(url.pathname);
    const body = url.pathname === '/'
      ? `<title>Negocio</title><a href="/empresa">Nosotros</a>${Array.from({ length: 12 }, (_, index) => `<a href="/servicios/${index}">Servicio ${index}</a>`).join('')}`
      : url.pathname === '/empresa'
        ? '<title>Empresa</title><a href="/hablar" aria-label="Contacto">Escríbenos</a>'
        : url.pathname === '/hablar'
          ? '<title>Contacto</title><a href="mailto:ventas@negocio.org">Correo</a>'
          : '<title>Servicios</title><h1>Servicio</h1>';
    return { ...response(body), url: url.href };
  });
  assert.equal(requested.length, 10);
  assert.ok(requested.indexOf('/hablar') > 0 && requested.indexOf('/hablar') < 6);
  assert.deepEqual(audit.contacts.map(contact => [contact.value, contact.source]), [['ventas@negocio.org', 'https://negocio.org/hablar']]);
  assert.equal(audit.crawl?.limited, true);
});

test('crawling skips failed, blocked, non-HTML and externally redirected pages without losing successful results', async () => {
  const requested: string[] = [];
  const audit = await auditWebsite({ url: 'https://negocio.org/' }, async input => {
    const url = new URL(String(input)); requested.push(url.pathname);
    const page = { ...response('<title>Sección</title><p>falso@negocio.org</p>'), url: url.href };
    if (url.pathname === '/') return { ...page, body: '<title>Negocio</title><a href="/contacto-falla">Contacto</a><a href="/support">Soporte</a><a href="/nosotros">Nosotros</a><a href="/servicios">Servicios</a><a href="/productos">Productos</a>' };
    if (url.pathname === '/contacto-falla') throw new Error('Timeout');
    if (url.pathname === '/support') return { ...page, url: 'https://externo.org/contact' };
    if (url.pathname === '/nosotros') return { ...page, headers: { 'content-type': 'application/pdf' } };
    if (url.pathname === '/servicios') return { ...page, body: '<title>Vercel Security Checkpoint</title><p>falso@negocio.org</p>' };
    return { ...page, body: '<title>Productos</title><a href="mailto:real@negocio.org">Contacto</a>' };
  });
  assert.equal(requested.length, 6);
  assert.deepEqual(audit.contacts.map(contact => contact.value), ['real@negocio.org']);
  assert.equal(audit.crawl?.failed, 4);
  assert.equal(audit.pageReviews?.length, 2);
});

test('whole-site crawling has a ten-page cap and a two-link depth limit', async () => {
  let requested = 0;
  const capped = await auditWebsite({ url: 'https://negocio.org/' }, async input => {
    requested++;
    const url = new URL(String(input));
    return { ...response(`<title>Negocio</title>${url.pathname === '/' ? Array.from({ length: 30 }, (_, index) => `<a href="/servicios/${index}">Servicio ${index}</a>`).join('') : '<h1>Servicio</h1>'}`), url: url.href };
  });
  assert.equal(requested, 10);
  assert.equal(capped.pageReviews?.length, 10);
  assert.equal(capped.crawl?.limited, true);
  const paths: string[] = [];
  const bounded = await auditWebsite({ url: 'https://negocio.org/' }, async input => {
    const url = new URL(String(input)); paths.push(url.pathname);
    const next = url.pathname === '/' ? '/servicios' : url.pathname === '/servicios' ? '/servicios/diseno' : '/servicios/diseno/detalles';
    return { ...response(`<title>Sección</title><a href="${next}">Detalles del servicio</a>`), url: url.href };
  });
  assert.deepEqual(paths, ['/', '/servicios', '/servicios/diseno']);
  assert.equal(bounded.crawl?.limited, true);
});

test('healthy semantic HTML does not acquire invented mobile or AI findings', () => {
  const audit = analyzeHtml(response('<html><head><title>Negocio</title><meta name="description" content="Tienda local"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h1>Negocio</h1><img src="/hero.jpg" alt="Productos en exhibición"><p>Servicios profesionales</p></body></html>'), 'PE', 'Comercio y tiendas');
  assert.equal(audit.score, 0);
  assert.equal(audit.aiEvidence.detected, false);
  assert.equal(audit.status, 'active');
  assert.equal(audit.metrics.performance, null);
});

test('placeholder and mobile findings have observable evidence, builder signals are qualified', () => {
  const audit = analyzeHtml(response('<html><body><h1>Your business name</h1><p>Lorem ipsum dolor sit amet</p><img src="photo.jpg"><a href="https://lovable.dev">Lovable</a></body></html>'));
  assert.ok(audit.issues.some(i => i.id === 'viewport'));
  assert.ok(audit.issues.some(i => i.id === 'placeholder-content' && i.detail.includes('Lorem ipsum')));
  assert.ok(audit.issues.some(i => i.id === 'image-alt'));
  assert.equal(audit.aiEvidence.detected, true);
  assert.match(audit.aiEvidence.label, /confirmar/);
  assert.ok(audit.limitations.some(l => l.includes('no confirma')));
  assert.ok(audit.score! >= 65);
});

test('passive security findings do not claim a confirmed vulnerability', () => {
  const audit = analyzeHtml({ ...response('<title>Tienda</title>'), headers: {} });
  assert.match(audit.issues.find(i => i.id === 'hsts')!.detail, /no una vulnerabilidad confirmada/);
  assert.match(audit.issues.find(i => i.id === 'csp')!.detail, /no demuestra/);
});

test('audit refuses private targets instead of reporting them as business outages', async () => {
  await assert.rejects(auditWebsite({ url: 'http://192.168.1.1/' }), { code: 'UNSAFE_URL' });
});

test('blocked and unreachable websites receive no invented failure score or inactive-business assertion', async () => {
  const blocked = await auditWebsite({ url: 'https://negocio.org' }, async () => ({ ...response('Forbidden'), status: 403 }));
  assert.equal(blocked.status, 'blocked'); assert.equal(blocked.score, null); assert.equal(blocked.contacts.length, 0);
  const unavailable = await auditWebsite({ url: 'https://negocio.org' }, async () => ({ ...response('Service Unavailable'), status: 503 }));
  assert.equal(unavailable.status, 'unreachable'); assert.equal(unavailable.score, null);
  assert.ok(unavailable.limitations.some(l => l.includes('no demuestra')));
});

test('public phone labels are extracted without converting tax IDs or WhatsApp tokens into contacts', () => {
  const contacts = extractContacts(`<body><p>RUC: 20512345678</p><p>Teléfono: +51 987 654 321</p><p>Celular: 987 123 456</p><a href="https://wa.me/message/ABC123456789">Chat</a><a href="https://wa.me/51987654321/">Chat directo</a><a href="tel:+51%20987%20654%20321;ext=99">Central</a><a href="tel:pedido-123456789">Inválido</a><a href="javascript://wa.me/51999111222">Inválido</a></body>`, 'https://negocio.org/');
  assert.ok(contacts.some(c => c.type === 'phone' && c.value === '+51987654321'));
  assert.ok(contacts.some(c => c.type === 'phone' && c.value === '987123456'));
  assert.deepEqual(contacts.filter(c => c.type === 'whatsapp').map(c => c.value), ['51987654321']);
  assert.ok(!contacts.some(c => c.value.includes('20512345678') || c.value.includes('123456789')));
  assert.equal(contacts.filter(c => c.value === '+51987654321').length, 1);
});

test('mailto supports separate public recipients and excludes malformed addresses', () => {
  const contacts = extractContacts('<a href="mailto:ventas@negocio.org,info@negocio.org?subject=Hola">Contacto</a><a href="mailto:foo@bad:host.org">Inválido</a>', 'https://negocio.org/');
  assert.deepEqual(contacts.map(c => c.value), ['ventas@negocio.org', 'info@negocio.org']);
});

test('a JavaScript application shell is not ranked as a broken business website', () => {
  const audit = analyzeHtml(response('<html><head><title>Negocio</title><meta name="viewport" content="width=device-width"></head><body><div id="root"></div><script type="module" src="/assets/main.js"></script></body></html>'));
  assert.equal(audit.status, 'active');
  assert.equal(audit.score, null);
  assert.ok(!audit.issues.some(issue => issue.id === 'missing-h1'));
  assert.ok(audit.limitations.some(value => value.includes('Sin puntuación')));
});

test('empty and HTTP 200 challenge pages are unscored', async () => {
  const empty = await auditWebsite({ url: 'https://negocio.org' }, async () => response('   '));
  assert.equal(empty.status, 'unreachable');
  assert.equal(empty.score, null);
  const challenge = await auditWebsite({ url: 'https://negocio.org' }, async () => response('<html><head><title>Vercel Security Checkpoint</title></head><body>Verifying your browser</body></html>'));
  assert.equal(challenge.status, 'blocked');
  assert.equal(challenge.score, null);
});

const semanticPage = (body: string, head = '') => `<html><head><title>Negocio local</title><meta name="description" content="Servicios especializados del negocio"><meta name="viewport" content="width=device-width">${head}</head><body>${body}</body></html>`;
const paragraph = (index: number, words = 90) => `<p>Servicio ${index}. ${Array.from({ length: words }, (_, word) => `detalle${index}_${word}`).join(' ')}</p>`;

test('content-heavy homepages expose measured evidence without pretending to measure scrolling', () => {
  const body = `<main><h1>Servicios del negocio</h1>${Array.from({ length: 30 }, (_, index) => `<section><h2>Área ${index}</h2>${paragraph(index)}</section>`).join('')}${Array.from({ length: 180 }, (_, index) => `<a href="/servicio/${index}">Servicio ${index}</a>`).join('')}</main>`;
  const audit = analyzeHtml(response(semanticPage(body)));
  assert.ok(audit.metrics.wordCount! >= 2400);
  assert.equal(audit.metrics.linkCount, 180);
  assert.equal(audit.metrics.headingCount, 31);
  assert.ok(audit.issues.some(issue => issue.id === 'content-overload' && issue.detail.includes('scroll requiere')));
  assert.ok(audit.issues.some(issue => issue.id === 'link-overload'));
});

test('a long well-structured article is not automatically classified as an overloaded homepage', () => {
  const body = `<main><article><h1>Guía técnica</h1>${Array.from({ length: 30 }, (_, index) => `<h2>Capítulo ${index}</h2>${paragraph(index, 90)}`).join('')}</article></main>`;
  const audit = analyzeHtml({ ...response(semanticPage(body)), url: 'https://negocio.org/blog/guia' });
  assert.ok(audit.metrics.wordCount! >= 2400);
  assert.ok(!audit.issues.some(issue => ['content-overload', 'unstructured-content', 'text-walls'].includes(issue.id)));
});

test('hidden content, templates, navigation and script payloads do not inflate content measurements', () => {
  const hidden = `${paragraph(1, 1600)}<p>Lorem ipsum dolor sit amet</p>`;
  const audit = analyzeHtml(response(semanticPage(`<nav>${paragraph(2, 2000)}</nav><main><h1>Negocio</h1><p>Reparamos bicicletas y ofrecemos mantenimiento profesional en nuestro taller de barrio.</p><div hidden>${hidden}</div><div aria-hidden="true">${hidden}</div><div style="display: none !important">${hidden}</div><template>${hidden}</template><script>${JSON.stringify(hidden)}</script></main>`)));
  assert.ok(audit.metrics.wordCount! < 30);
  assert.ok(!audit.issues.some(issue => ['placeholder-content', 'content-overload', 'unstructured-content', 'text-walls'].includes(issue.id)));
});

test('duplicate responsive sections do not double word counts or remove nested legitimate content', () => {
  const section = `<section><section><h2>Especialidad</h2>${paragraph(1, 200)}</section></section>`;
  const single = analyzeHtml(response(semanticPage(`<main><h1>Negocio</h1>${section}</main>`)));
  const doubled = analyzeHtml(response(semanticPage(`<main><h1>Negocio</h1>${section}${section}</main>`)));
  assert.ok(single.metrics.wordCount! > 200);
  assert.equal(doubled.metrics.wordCount, single.metrics.wordCount);
  assert.ok(!doubled.issues.some(issue => issue.id === 'repeated-content'));
});

test('unstructured text, repeated paragraphs and generic copy have separate observable evidence', () => {
  const repeated = analyzeHtml(response(semanticPage(`<main><h1>Negocio</h1>${paragraph(0, 55).repeat(4)}</main>`)));
  assert.ok(repeated.issues.some(issue => issue.id === 'repeated-content' && issue.detail.includes('4 veces')));
  const unstructured = analyzeHtml(response(semanticPage(`<main><h1>Negocio</h1>${paragraph(0, 360)}${paragraph(1, 360)}</main>`)));
  assert.ok(unstructured.issues.some(issue => issue.id === 'unstructured-content'));
  assert.ok(unstructured.issues.some(issue => issue.id === 'text-walls'));
  const generic = analyzeHtml(response(semanticPage('<main><h1>Negocio</h1><p>Soluciones integrales. Somos tu mejor opción. Comprometidos con la excelencia.</p></main>')));
  assert.ok(generic.issues.some(issue => issue.id === 'generic-copy' && issue.detail.includes('Soluciones integrales')));
});

test('repetitive navigation metadata is replaced by a concrete introductory paragraph', () => {
  const html = `<head><title>Centro Español del Perú</title><meta name="description" content="centro español Personas Fecha Hora Haz tu reserva Eventos del mes Agenda mensual Policlínico Restaurante Eventos del mes Nuestras areas Tienda Eventos del mes Policlínico Restaurante Eventos del mes Nuestras areas"><meta name="viewport" content="width=device-width"></head><body><nav>Eventos Policlínico Restaurante Tienda</nav><main><h1>Centro Español del Perú</h1><p>El Centro Español del Perú ofrece actividades culturales, espacios para eventos y un restaurante de cocina española en Lima.</p></main></body>`;
  const audit = analyzeHtml(response(html));
  assert.match(audit.description, /^El Centro Español del Perú ofrece/);
  assert.ok(audit.issues.some(issue => issue.id === 'repetitive-description'));
});

test('performance evidence counts blocking classic scripts but excludes async, defer and modules', () => {
  const scripts = Array.from({ length: 5 }, (_, index) => `<script src="/blocking-${index}.js"></script>`).join('');
  const other = '<script src="/async.js" async></script><script src="/defer.js" defer></script><script src="/module.js" type="module"></script><script src="/legacy.js" nomodule></script>';
  const images = Array.from({ length: 18 }, (_, index) => `<img src="/${index}.jpg" alt="Producto ${index}">`).join('');
  const audit = analyzeHtml(response(semanticPage(`<h1>Negocio</h1>${images}<img src="/lazy.jpg" alt="Otro" loading="lazy"><img src="/hidden.jpg" hidden>`, scripts + other)));
  assert.equal(audit.metrics.blockingScripts, 5);
  assert.equal(audit.metrics.imageCount, 19);
  assert.ok(audit.issues.some(issue => issue.id === 'blocking-scripts'));
  assert.ok(audit.issues.some(issue => issue.id === 'eager-images' && issue.detail.includes('18 de 19')));
  const nonblocking = analyzeHtml(response(semanticPage('<h1>Negocio</h1>', other.repeat(5))));
  assert.equal(nonblocking.metrics.blockingScripts, 0);
  assert.ok(!nonblocking.issues.some(issue => issue.id === 'blocking-scripts'));
});

test('security checks distinguish passive links from loaded mixed resources and identify unsafe form methods', () => {
  const audit = analyzeHtml(response(semanticPage('<h1>Negocio</h1><form><input type="password" name="password"></form>', '<link rel="canonical" href="http://negocio.org/">')));
  assert.ok(!audit.issues.some(issue => issue.id === 'mixed-content'));
  assert.ok(audit.issues.some(issue => issue.id === 'password-get'));
  const insecure = analyzeHtml({ ...response(semanticPage('<h1>Negocio</h1><form action="/contact" method="post"></form>')), url: 'http://negocio.org/' });
  assert.ok(insecure.issues.some(issue => issue.id === 'form-http'));
});

test('configuration header omissions alone remain low priority and repeated structure symptoms are capped', () => {
  const audit = analyzeHtml({ ...response(semanticPage('<h1>Negocio</h1>')), headers: {} });
  assert.equal(audit.score, 4);
  assert.equal(priorityScore(Array.from({ length: 10 }, (_, index) => ({ id: String(index), title: 'Evidence', detail: 'Measured', category: 'structure' as const, severity: 'medium' as const, points: 10 }))), 45);
});

test('international contact pages and labeled phones are discoverable without inventing contacts', () => {
  const pages = contactPages('<a href="/contato">Contato</a><a href="/kontakt">Kontakt</a>', 'https://negocio.org/');
  assert.equal(pages.length, 2);
  const contacts = extractContacts('<p>Phone: +44 20 7946 0958</p><p>Téléphone: +33 1 44 55 66 77</p><p>Order: 123456789</p>', 'https://negocio.org/');
  assert.deepEqual(contacts.map(item => item.value), ['+442079460958', '+33144556677']);
});

test('obsolete visual markup and HTML language are detected without affecting clean semantic pages', () => {
  const legacy = analyzeHtml(response('<html lang="ru"><head><title>Магазин</title><meta name="viewport" content="width=device-width"></head><body><center><font color="red"><h1>Магазин мебели</h1></font></center><table><tr><td><table><tr><td>Каталог</td></tr></table></td></tr></table></body></html>'), 'RU');
  assert.equal(legacy.language, 'ru');
  assert.ok(legacy.issues.some(issue => issue.id === 'obsolete-markup'));
});
