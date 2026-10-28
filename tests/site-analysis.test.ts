import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeHtml, priorityScore } from '../lib/server/analyze';
import { analyzeSitePages } from '../lib/server/site-analysis';
import type { PublicResponse } from '../lib/server/safe-fetch';

const html = (body: string, head = '') => `<html lang="es"><head><title>Negocio principal</title><meta name="description" content="Reparamos bicicletas y ofrecemos mantenimiento profesional en nuestro taller de barrio."><meta name="viewport" content="width=device-width">${head}</head><body>${body}</body></html>`;
const response = (body: string, path = '/', responseMs = 100): PublicResponse => ({
  url: `https://negocio.org${path}`, status: 200,
  headers: { 'content-type': 'text/html', 'strict-transport-security': 'max-age=31536000', 'content-security-policy': "default-src 'self'" },
  body, bytes: Buffer.byteLength(body), responseMs,
});
const shell = (path = '/') => response('<html><head><script src="/main.js" defer></script></head><body><div id="root"></div></body></html>', path);

test('inner-page issues affect site priority with their source while primary identity stays intact', () => {
  const home = response(html('<h1>Taller de bicicletas</h1><p>Servicio técnico y mantenimiento profesional de bicicletas en nuestro taller de Lima.</p>'));
  const contact = response(html('<h1>Contacto</h1><img src="/taller.jpg">').replace('<title>Negocio principal</title>', '<title>Contactar al taller</title>').replace('<html lang="es">', '<html lang="en">'), '/contacto', 450);
  const original = analyzeHtml(home, 'PE', 'Talleres');
  const audit = analyzeSitePages([home, contact], 'PE', 'Talleres');
  assert.equal(original.score, 0);
  assert.ok(audit.score! > original.score!);
  assert.deepEqual(audit.issues.find(issue => issue.id === 'image-alt')?.sources, [contact.url]);
  for (const key of ['id', 'url', 'domain', 'name', 'description', 'country', 'category', 'source', 'language'] as const) assert.equal(audit[key], original[key]);
  assert.equal(audit.metrics.responseMs, 100);
  assert.deepEqual(audit.pageReviews?.map(page => page.url), [home.url, contact.url]);
  assert.equal(audit.pageReviews?.[1].metrics.responseMs, 450);
  assert.equal(audit.pageReviews?.[1].metrics.imageAltMissing, 1);
});

test('repeated issues contribute only the strongest instance and record all affected pages', () => {
  const home = response(html('<h1>Taller</h1><img src="/home.jpg">'));
  const inner = response(html(`<h1>Productos</h1>${Array.from({ length: 7 }, (_, index) => `<img src="/${index}.jpg">`).join('')}`), '/productos');
  const audit = analyzeSitePages([home, inner]);
  const issue = audit.issues.find(item => item.id === 'image-alt')!;
  assert.equal(audit.issues.filter(item => item.id === 'image-alt').length, 1);
  assert.equal(issue.points, 10);
  assert.match(issue.detail, /7 de 7/);
  assert.deepEqual(issue.sources, [home.url, inner.url]);
  assert.equal(audit.score, 10);
  assert.equal(audit.score, priorityScore(audit.issues));
  const duplicated = analyzeSitePages([home, inner, inner]);
  assert.equal(duplicated.score, audit.score);
  assert.equal(duplicated.metrics.htmlBytes, audit.metrics.htmlBytes);
});

test('site metrics sum inspected documents and flag title or viewport defects on internal pages', () => {
  const home = response(html('<main><h1>Taller</h1><p>Primer servicio profesional</p><img src="/taller.jpg" alt="Taller"><a href="/contacto">Contacto</a></main>'));
  const inner = response(html('<main><h1>Contacto</h1><h2>Visítanos</h2><p>Segundo servicio especializado</p></main>').replace('<title>Negocio principal</title>', '').replace('<meta name="viewport" content="width=device-width">', ''), '/contacto');
  const audit = analyzeSitePages([home, inner]);
  const pages = [analyzeHtml(home), analyzeHtml(inner)];
  for (const key of ['htmlBytes', 'h1', 'imageAltMissing', 'wordCount', 'linkCount', 'domElements', 'headingCount', 'imageCount', 'blockingScripts'] as const) {
    assert.equal(audit.metrics[key], pages.reduce((sum, page) => sum + (page.metrics[key] ?? 0), 0), key);
  }
  assert.equal(audit.metrics.title, false);
  assert.equal(audit.metrics.viewport, false);
  assert.deepEqual(audit.pageReviews?.[0].metrics, pages[0].metrics);
  assert.deepEqual(audit.pageReviews?.[1].metrics, pages[1].metrics);
});

test('contacts, technology and AI observations from internal pages retain verifiable provenance', () => {
  const home = response(html('<h1>Taller</h1><a href="mailto:ventas@negocio.org">Correo</a>', '<meta name="generator" content="WordPress">'));
  const inner = response(html('<h1>Contacto</h1><a href="mailto:ventas@negocio.org">Correo</a><a href="mailto:soporte@negocio.org">Soporte</a><a href="https://wa.me/51987654321">WhatsApp</a><a href="https://lovable.dev">Creación</a>', '<meta name="generator" content="Shopify">'), '/contacto');
  const audit = analyzeSitePages([home, inner]);
  assert.equal(audit.contacts.length, 3);
  assert.equal(audit.contacts.find(contact => contact.value === 'ventas@negocio.org')?.source, home.url);
  assert.equal(audit.contacts.find(contact => contact.value === 'soporte@negocio.org')?.source, inner.url);
  assert.equal(audit.contacts.find(contact => contact.type === 'whatsapp')?.source, inner.url);
  assert.deepEqual(audit.technologies, ['WordPress', 'Shopify']);
  assert.equal(audit.aiEvidence.detected, true);
  assert.ok(audit.aiEvidence.evidence.some(value => value.includes('Lovable') && value.includes(inner.url)));
  assert.equal(audit.limitations.filter(value => value.startsWith('Inspección del HTML')).length, 1);
});

test('JavaScript shells cannot add guessed defects to a readable site or mask real pages', () => {
  const home = response(html('<h1>Taller</h1>'));
  const audit = analyzeSitePages([home, shell('/app')]);
  assert.equal(audit.score, 0);
  assert.equal(audit.issues.length, 0);
  assert.equal(audit.metrics.title, true);
  assert.equal(audit.metrics.viewport, true);
  assert.equal(audit.pageReviews?.[1].score, null);
  assert.deepEqual(audit.pageReviews?.[1].issueIds, []);
  assert.ok(audit.limitations.some(value => value.startsWith('https://negocio.org/app: Sin puntuación:')));
  const shellHome = analyzeSitePages([shell(), response(html('<h1>Contacto</h1><img src="/equipo.jpg">'), '/contacto')]);
  assert.equal(shellHome.score, 4);
  assert.deepEqual(shellHome.issues.map(issue => issue.id), ['image-alt']);
  assert.equal(shellHome.url, 'https://negocio.org/');
});

test('a site composed only of JavaScript shells remains unscored without fabricated findings', () => {
  const audit = analyzeSitePages([shell(), shell('/app')]);
  assert.equal(audit.score, null);
  assert.deepEqual(audit.issues, []);
  assert.equal(audit.metrics.title, null);
  assert.equal(audit.metrics.viewport, null);
  assert.ok(audit.pageReviews?.every(page => page.score === null && page.issueIds.length === 0));
  assert.throws(() => analyzeSitePages([]), RangeError);
});
