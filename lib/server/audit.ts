import { createHash } from 'node:crypto';
import type { Audit } from '../types';
import { contactPages, reviewPages, isSameContactSite, priorityScore } from './analyze';
import { CONTACT_SCAN_VERSION } from '../audit-version';
import { analyzeSitePages } from './site-analysis';
import { normalizeUrl, RequestError, resolvePublicUrl, safeFetch, type PublicResponse } from './safe-fetch';

function unavailable(url: URL, country: string, category: string, status: Audit['status'], detail: string, response?: PublicResponse): Audit {
  return { id: createHash('sha256').update(url.hostname.replace(/^www\./, '')).digest('hex').slice(0, 16), url: url.href, domain: url.hostname.replace(/^www\./, ''), name: url.hostname.replace(/^www\./, ''), description: 'No fue posible obtener una descripción verificable en esta consulta.', country, category, status, score: null,
    issues: [{ id: 'availability', title: status === 'blocked' ? 'La web limita la revisión automática' : 'No accesible en esta consulta', detail, category: 'availability', severity: 'low', points: 0 }], contacts: [], aiEvidence: { detected: false, label: 'Origen IA no confirmado', evidence: [] },
    metrics: { responseMs: response?.responseMs ?? null, htmlBytes: response?.bytes ?? null, viewport: null, title: null, h1: null, imageAltMissing: null, performance: null, accessibility: null }, checkedAt: new Date().toISOString(), source: url.href,
    limitations: ['Un error de conexión o bloqueo no demuestra que el negocio haya cerrado ni que la web esté inactiva para todos.', 'No se asigna puntuación sin obtener contenido verificable.'],
  };
}

async function enrichPageSpeed(audit: Audit) {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) { audit.limitations.push('Medición móvil de Lighthouse pendiente: requiere configurar PAGESPEED_API_KEY.'); return; }
  const api = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  api.searchParams.set('url', audit.url); api.searchParams.set('strategy', 'mobile'); api.searchParams.set('key', apiKey);
  api.searchParams.append('category', 'performance'); api.searchParams.append('category', 'accessibility');
  try {
    const res = await fetch(api, { signal: AbortSignal.timeout(19000), cache: 'no-store' });
    if (!res.ok) throw new Error('provider');
    const data = await res.json(); const categories = data.lighthouseResult?.categories;
    for (const key of ['performance', 'accessibility'] as const) {
      const score = categories?.[key]?.score;
      if (typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 1) audit.metrics[key] = Math.round(score * 100);
    }
    if (audit.metrics.performance !== null && audit.metrics.performance < 50) audit.issues.push({ id: 'lighthouse-performance', title: 'Rendimiento móvil bajo en Lighthouse', detail: `PageSpeed Insights devolvió ${audit.metrics.performance}/100 en una prueba móvil de laboratorio. Puede variar entre ejecuciones y no representa todos los dispositivos.`, category: 'performance', severity: 'high', points: 15 });
    if (audit.metrics.accessibility !== null && audit.metrics.accessibility < 80) audit.issues.push({ id: 'lighthouse-accessibility', title: 'Mejoras de accesibilidad detectadas', detail: `PageSpeed Insights devolvió ${audit.metrics.accessibility}/100. Una prueba automática no sustituye una auditoría completa de accesibilidad.`, category: 'accessibility', severity: 'medium', points: 10 });
    if (audit.score !== null) audit.score = priorityScore(audit.issues);
    audit.limitations.push('Lighthouse se ejecutó en modo móvil. Es una prueba de laboratorio, no una evaluación estética ni una prueba de penetración.');
  } catch { audit.limitations.push('PageSpeed no pudo completar la prueba móvil en esta consulta. Las métricas permanecen sin evaluar.'); }
}

async function crawlWebsite(initial: PublicResponse, fetchPage: typeof safeFetch) {
  const base = new URL(initial.url);
  const pageKey = (value: string) => {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}${url.search}`;
  };
  const visited = new Set([pageKey(base.href)]);
  const analyzed = new Set(visited);
  const pages: PublicResponse[] = [initial];
  const candidates = (response: PublicResponse, depth: number) => {
    const contacts = new Set(contactPages(response.body, response.url));
    return reviewPages(response.body, response.url).map(url => ({ url, depth, priority: contacts.has(url) ? 0 : 1 }));
  };
  const queue = candidates(initial, 1);
  // Search results may point to an article or product without the site's navigation.
  const home = new URL('/', base).href;
  if (home !== base.href && !queue.some(page => page.url === home)) queue.unshift({ url: home, depth: 0, priority: 0 });
  const deadline = Date.now() + 12000;
  let attempted = 0; let failed = 0; let depthLimited = false;
  while (queue.length && attempted < 9 && Date.now() < deadline) {
    queue.sort((a, b) => a.priority - b.priority);
    const batch: { url: string; depth: number }[] = [];
    while (queue.length && batch.length < 3 && attempted + batch.length < 9) {
      const page = queue.shift()!;
      const key = pageKey(page.url);
      if (visited.has(key)) continue;
      visited.add(key); batch.push(page);
    }
    attempted += batch.length;
    const results = await Promise.allSettled(batch.map(page => fetchPage(page.url, { timeoutMs: Math.max(1, Math.min(4000, deadline - Date.now())), maxBytes: 600000 })));
    for (let index = 0; index < results.length; index++) {
      const result = results[index];
      if (result.status !== 'fulfilled') { failed++; continue; }
      const page = result.value;
      if (page.status < 200 || page.status >= 300 || !isSameContactSite(new URL(page.url), base) ||
          !/html/i.test(page.headers['content-type'] ?? 'text/html') || !page.body.trim() ||
          /<title>[^<]*(?:just a moment|access denied|attention required|robot check|checking your browser|vercel security checkpoint|verify you are human)/i.test(page.body)) { failed++; continue; }
      const key = pageKey(page.url);
      if (analyzed.has(key)) continue;
      visited.add(key); analyzed.add(key); pages.push(page);
      if (batch[index].depth < 2) {
        for (const candidate of candidates(page, batch[index].depth + 1)) {
          if (!visited.has(pageKey(candidate.url)) && !queue.some(item => pageKey(item.url) === pageKey(candidate.url))) queue.push(candidate);
        }
      } else if (reviewPages(page.body, page.url).some(url => !visited.has(pageKey(url)))) depthLimited = true;
    }
  }
  return { pages, attempted: attempted + 1, failed, limited: depthLimited || queue.some(page => !visited.has(pageKey(page.url))) };
}

export async function auditWebsite(input: { url: string; country?: string; category?: string; usePageSpeed?: boolean }, fetchPage: typeof safeFetch = safeFetch): Promise<Audit> {
  const url = normalizeUrl(input.url); const country = input.country ?? 'ALL'; const category = input.category ?? 'Otros';
  let response: PublicResponse;
  try { response = await fetchPage(url); }
  catch (error) {
    if (error instanceof RequestError && ['INVALID_URL', 'UNSAFE_URL'].includes(error.code)) throw error;
    return unavailable(url, country, category, 'unreachable', error instanceof RequestError ? error.message : 'No se pudo resolver o conectar con el dominio.');
  }
  if ([401, 403, 429].includes(response.status) || /<title>[^<]*(?:just a moment|access denied|attention required|robot check|checking your browser|vercel security checkpoint|verify you are human)/i.test(response.body)) return unavailable(new URL(response.url), country, category, 'blocked', `La respuesta HTTP ${response.status} o la página de protección impidió revisar el contenido. No se intentó eludirla.`, response);
  if (response.status >= 400 || response.status < 200) return unavailable(new URL(response.url), country, category, 'unreachable', `El servidor devolvió HTTP ${response.status}. Comprueba la dirección y vuelve a intentarlo.`, response);
  if (response.headers['content-type'] && !/html|xhtml/i.test(response.headers['content-type'])) return unavailable(new URL(response.url), country, category, 'unreachable', 'El destino no devolvió una página HTML que pueda analizarse.', response);
  if (!response.body.trim()) return unavailable(new URL(response.url), country, category, 'unreachable', 'El servidor devolvió una respuesta vacía. No hay contenido para evaluar.', response);
  const crawl = await crawlWebsite(response, fetchPage);
  const audit = analyzeSitePages(crawl.pages, country, category);
  audit.crawl = { attempted: crawl.attempted, failed: crawl.failed, limit: 10, limited: crawl.limited };
  audit.contactScanVersion = CONTACT_SCAN_VERSION;
  audit.limitations.push(`La revisión analizó ${crawl.pages.length} página${crawl.pages.length === 1 ? '' : 's'} del sitio, siguiendo enlaces internos hasta dos niveles (máximo diez páginas y doce segundos de exploración). Es una muestra de las secciones accesibles, no una revisión exhaustiva de todas las URL.`);
  if (crawl.failed) audit.limitations.push(`${crawl.failed} página${crawl.failed === 1 ? '' : 's'} interna${crawl.failed === 1 ? '' : 's'} no ${crawl.failed === 1 ? 'pudo' : 'pudieron'} revisarse en esta consulta; puede haber hallazgos o contactos que no se hayan podido leer.`);
  if (!audit.contacts.length) audit.limitations.push('No se encontraron contactos en el HTML de las páginas revisadas. Esto no confirma que la web carezca de ellos: pueden publicarse en otras secciones o cargarse con JavaScript.');
  if (audit.previewImage) try { await resolvePublicUrl(audit.previewImage); } catch { delete audit.previewImage; }
  if (input.usePageSpeed) await enrichPageSpeed(audit);
  return audit;
}
