import type { Audit, Contact, Issue } from '../types';
import { analyzeHtml, priorityScore } from './analyze';
import type { PublicResponse } from './safe-fetch';

const countMetrics = ['h1', 'imageAltMissing', 'wordCount', 'linkCount', 'domElements', 'headingCount', 'imageCount', 'blockingScripts'] as const;

// Each issue contributes once, using the strongest observed instance. Repeated
// headers and shared layouts must not increase priority just because we crawled more.
export function analyzeSitePages(responses: PublicResponse[], country = 'ALL', category = 'Otros'): Audit {
  if (!responses.length) throw new RangeError('Se necesita al menos una página para revisar el sitio.');
  const uniqueResponses = new Map<string, PublicResponse>();
  for (const response of responses) if (!uniqueResponses.has(response.url)) uniqueResponses.set(response.url, response);
  const pages = [...uniqueResponses.values()].map(response => analyzeHtml(response, country, category));
  const primary = pages[0];
  const evaluable = pages.filter(page => page.score !== null);
  const issues = new Map<string, Issue>();

  for (const page of evaluable) {
    for (const issue of page.issues) {
      const previous = issues.get(issue.id);
      const sources = [...new Set([...(previous?.sources ?? []), page.url])];
      issues.set(issue.id, { ...(previous && previous.points >= issue.points ? previous : issue), sources });
    }
  }

  const contacts = new Map<string, Contact>();
  for (const page of pages) {
    for (const contact of page.contacts) {
      const key = `${contact.type}:${contact.value}`;
      if (!contacts.has(key)) contacts.set(key, contact);
    }
  }

  const metrics = { ...primary.metrics };
  metrics.htmlBytes = pages.reduce((sum, page) => sum + (page.metrics.htmlBytes ?? 0), 0);
  for (const key of countMetrics) {
    const values = pages.map(page => page.metrics[key]).filter((value): value is number => typeof value === 'number');
    if (values.length) metrics[key] = values.reduce((sum, value) => sum + value, 0);
  }
  for (const key of ['title', 'viewport'] as const) {
    metrics[key] = evaluable.length ? evaluable.every(page => page.metrics[key] === true) : null;
  }

  const evidence = [...new Set(pages.flatMap(page => page.aiEvidence.evidence.map(value => `${value} [${page.url}]`.slice(0, 3000))))].slice(0, 40);
  const limitations = [...new Set(pages.flatMap(page => page.limitations.map(value =>
    value.startsWith('Sin puntuación:') || value.includes('parece depender de JavaScript') ? `${page.url}: ${value}` : value,
  )))].slice(0, 50);

  return {
    ...primary,
    score: evaluable.length ? priorityScore([...issues.values()]) : null,
    issues: [...issues.values()],
    contacts: [...contacts.values()].sort((a, b) => Number(a.type === 'phone') - Number(b.type === 'phone')).slice(0, 12),
    technologies: [...new Set(pages.flatMap(page => page.technologies ?? []))].slice(0, 50),
    aiEvidence: { detected: evidence.length > 0, label: evidence.length ? 'Indicios de herramienta IA · por confirmar' : 'Origen IA no confirmado', evidence },
    metrics,
    limitations,
    pageReviews: pages.map(page => ({ url: page.url, score: page.score, issueIds: page.score === null ? [] : page.issues.map(issue => issue.id), metrics: page.metrics })),
  };
}
