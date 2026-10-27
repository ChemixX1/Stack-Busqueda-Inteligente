import { createHash } from 'node:crypto';
import type { Audit } from '../types';
import { analyzeHtml, contactPages, extractContacts, priorityScore } from './analyze';
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
  const audit = analyzeHtml(response, country, category);
  if (audit.previewImage) try { await resolvePublicUrl(audit.previewImage); } catch { delete audit.previewImage; }
  const pages = contactPages(response.body, response.url);
  const contactResults = await Promise.allSettled(pages.map(page => fetchPage(page, { timeoutMs: 4000, maxBytes: 600000 })));
  for (const result of contactResults) if (result.status === 'fulfilled' && result.value.status === 200 && new URL(result.value.url).origin === new URL(response.url).origin && /html/i.test(result.value.headers['content-type'] ?? 'text/html')) {
    for (const contact of extractContacts(result.value.body, result.value.url)) if (!audit.contacts.some(c => c.type === contact.type && c.value === contact.value)) audit.contacts.push(contact);
  }
  audit.contacts = audit.contacts.slice(0, 12);
  if (input.usePageSpeed) await enrichPageSpeed(audit);
  return audit;
}
