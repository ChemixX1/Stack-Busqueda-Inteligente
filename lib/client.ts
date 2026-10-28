import ipaddr from 'ipaddr.js';
import { categories, countries } from './catalog';
import type { Audit, Contact, Issue, Prospect } from './types';

export { countryLanguage, hasNativeTemplate, localizedContactMessage, localizedEmailSubject, resolveSiteLanguage } from './i18n';

export function contactMessage(site: Audit, sender = 'Stack') {
  const opening = `Hola, equipo de ${site.name}. Soy de ${sender.trim() || 'Stack'}.`;
  const issue = [...site.issues].sort((a, b) => b.points - a.points)[0];
  let finding = 'Me gustaría conversar sobre cómo mejorar la experiencia de su web.';
  if (site.status === 'active' && issue) {
    const byId: Record<string, string> = {
      viewport: 'Al revisar su web encontré señales de problemas en la adaptación a celulares.',
      'fixed-width': 'Al revisar su web noté elementos con ancho fijo que podrían desbordarse en pantallas de celular.',
      'obsolete-markup': 'Al revisar su web noté elementos de maquetación antigua que sería ideal renovar con un diseño más actual.',
      'inline-styles': 'Al revisar su web observé detalles de presentación visual que ganarían mayor orden y consistencia.',
      'placeholder-content': 'Al revisar su web encontré contenido de plantilla que parece pendiente de personalizar.',
      'missing-title': 'Al revisar su web noté que falta el título principal para buscadores, lo que puede restarle visibilidad.',
      'missing-description': 'Al revisar su web observé que no cuenta con una descripción para buscadores que resuma su propuesta.',
      'repetitive-description': 'Al revisar su web noté texto repetido en su descripción de búsqueda que convendría afinar.',
      'missing-h1': 'Al revisar su web encontré detalles en la estructura y los encabezados que podrían ordenarse mejor.',
      'multiple-h1': 'Al revisar su web observé detalles en la jerarquía de títulos que podrían ordenarse mejor.',
      'heading-order': 'Al revisar su web noté saltos en el orden de títulos y secciones que podrían hacerse más claros.',
      'content-overload': 'Al revisar su web vi bastante información concentrada en el inicio, algo que se puede simplificar para guiar mejor al visitante.',
      'unstructured-content': 'Al revisar su web noté bastante texto con pocas divisiones, lo que puede dificultar ubicar rápido lo importante.',
      'text-walls': 'Al revisar su web encontré bloques de texto extensos que ganarían mucha claridad con una estructura más ligera.',
      'repeated-content': 'Al revisar su web observé bloques de contenido repetidos que podrían depurarse para dar mayor claridad.',
      'generic-copy': 'Al revisar su web vi oportunidad de aterrizar mejor qué ofrecen y qué los diferencia desde el primer vistazo.',
      'link-overload': 'Al revisar su web noté muchos enlaces en el inicio que podrían organizarse mejor para facilitar el recorrido.',
      'server-time': 'Al revisar su web detecté oportunidades para mejorar el tiempo de respuesta y la velocidad de carga.',
      'lighthouse-performance': 'Al revisar su web en modo móvil detecté oportunidades claras para mejorar la velocidad de carga.',
      'large-dom': 'Al revisar su web detecté una estructura pesada que se podría optimizar para agilizar la navegación.',
      'blocking-scripts': 'Al revisar su web detecté recursos en el inicio que podrían optimizarse para que cargue con más fluidez.',
      'many-scripts': 'Al revisar su web detecté oportunidades para aligerar la carga de recursos y hacerla más ágil.',
      'eager-images': 'Al revisar su web vi varias imágenes que podrían optimizar su carga para mejorar la rapidez.',
      'large-html': 'Al revisar su web detecté oportunidades para aligerar la página y mejorar la velocidad de carga.',
      'image-alt': 'Al revisar su web noté imágenes sin texto alternativo, un detalle útil para accesibilidad y buscadores.',
      zoom: 'Al revisar su web encontré ajustes de visualización móvil que pueden dificultar ampliar el contenido.',
      'lighthouse-accessibility': 'Al revisar su web encontré barreras que pueden dificultar su uso a algunos visitantes.',
      http: 'Al revisar su web noté que no carga con conexión segura HTTPS, algo clave para dar confianza a quienes los visitan.',
      'mixed-content': 'Al revisar su web observé recursos sin HTTPS que convendría ajustar para mantener una navegación segura.',
      'form-http': 'Al revisar su web observé formularios sin envío cifrado que sería importante revisar.',
      'password-get': 'Al revisar su web observé detalles en el envío de formularios que sería recomendable corregir.',
      hsts: 'Al revisar su web observé detalles de configuración que sería útil revisar.',
      csp: 'Al revisar su web observé detalles de configuración que sería útil revisar.',
    };
    const byCategory: Record<string, string> = {
      mobile: 'Al revisar su web encontré señales de problemas en la adaptación a celulares.',
      performance: 'Al revisar su web detecté oportunidades para mejorar la velocidad de carga.',
      structure: 'Al revisar su web encontré detalles en la estructura y el contenido que podrían mejorarse.',
      accessibility: 'Al revisar su web encontré barreras que pueden dificultar su uso a algunos visitantes.',
      security: 'Al revisar su web observé detalles de configuración que sería útil revisar.',
      availability: 'No pude acceder a su web durante una revisión; sería bueno comprobar qué ocurre.',
    };
    finding = byId[issue.id] || byCategory[issue.category] || finding;
    if (/placeholder|plantilla|relleno/i.test(issue.id + issue.title)) finding = 'Al revisar su web encontré contenido de plantilla que parece pendiente de personalizar.';
  } else if (site.status === 'unreachable') {
    finding = 'No pude acceder a su web durante una revisión; quizá sea algo temporal.';
  } else if (site.status === 'blocked') {
    finding = 'Intenté revisar su web pero tiene restringido el acceso automático; aun así me gustaría compartirles algunas ideas de mejora.';
  }
  const benefit = /comercio|tienda/i.test(site.category)
    ? 'Podemos ayudarles a presentar mejor sus productos y facilitar la compra.'
    : /restaurante|turismo|hotel/i.test(site.category)
      ? 'Podemos ayudarles a mostrar mejor su propuesta y facilitar las consultas y reservas.'
      : /salud|belleza|deporte|fitness/i.test(site.category)
        ? 'Podemos ayudarles a transmitir mayor confianza y facilitar que sus clientes agenden una cita o reserva.'
        : /inmobiliaria|construcci/i.test(site.category)
          ? 'Podemos ayudarles a mostrar mejor sus proyectos y facilitar el contacto de interesados.'
          : /manga|anime|c[oó]mic|videojuego|comunidad|entretenimiento|streaming|medio|blog|portal/i.test(site.category)
            ? 'Podemos ayudarles a optimizar la fluidez de lectura, velocidad y experiencia de su comunidad en cualquier dispositivo.'
            : /saas|digital/i.test(site.category)
              ? 'Podemos ayudarles a impulsar el rendimiento de su plataforma y mejorar la conversión de usuarios.'
              : /servicios|educaci|automotriz|tecnolog|arte|dise[ñn]o|portafolio|ong|organizaci/i.test(site.category)
                ? 'Podemos ayudarles a presentar con más claridad su propuesta y facilitar nuevas consultas.'
                : 'Podemos ayudarles a tener una web más clara, funcional y fácil de usar.';
  return `${opening}\n\n${finding} ${benefit}\n\n¿Les gustaría que les comparta una propuesta breve?`;
}

const TWO_DIGIT_CC = new Set([
  '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44',
  '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58',
  '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91',
  '92', '93', '94', '95', '98',
]);

const COUNTRY_DIAL_CODES: Record<string, string> = {
  PE: '51', MX: '52', CO: '57', CL: '56', AR: '54', ES: '34', EC: '593',
  BO: '591', PY: '595', UY: '598', VE: '58', PA: '507', CR: '506', GT: '502',
  SV: '503', HN: '504', NI: '505', DO: '1', PR: '1', US: '1', CA: '1',
  BR: '55', PT: '351', FR: '33', DE: '49', IT: '39', GB: '44',
};

function groupSubscriberDigits(digits: string): string {
  if (digits.length <= 4) return digits;
  if (digits.length % 3 === 1) {
    const head = digits.slice(0, -4).match(/.{1,3}/g) ?? [];
    return [...head, digits.slice(-4)].join(' ');
  }
  return (digits.match(/.{1,3}/g) ?? [digits]).join(' ');
}

export function resolveInternationalPhone(raw: string, country = 'ALL'): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (trimmed.startsWith('00') && digits.length >= 11) return `+${digits.slice(2)}`;
  const cc = COUNTRY_DIAL_CODES[country];
  if (cc) {
    if (digits.startsWith(cc) && digits.length - cc.length >= 8) return `+${digits}`;
    const local = digits.replace(/^0+/, '');
    if (local.length >= 8 && local.length <= 10) return `+${cc}${local}`;
  }
  if (digits.length >= 11 && !digits.startsWith('0')) return `+${digits}`;
  return digits;
}

export function formatPhone(raw: string, country = 'ALL'): string {
  const resolved = resolveInternationalPhone(raw, country);
  const digits = resolved.replace(/\D/g, '');
  if (!digits) return raw;
  if (resolved.startsWith('+') && digits.length >= 9) {
    const ccLen = digits.startsWith('1') || digits.startsWith('7') ? 1 : TWO_DIGIT_CC.has(digits.slice(0, 2)) ? 2 : 3;
    if (digits.length > ccLen + 5) {
      return `+${digits.slice(0, ccLen)} ${groupSubscriberDigits(digits.slice(ccLen))}`;
    }
  }
  return groupSubscriberDigits(digits);
}

export function contactWhatsappUrl(raw: string, message: string, country = 'ALL'): string | null {
  const resolved = resolveInternationalPhone(raw, country);
  return whatsappUrl(resolved, message) || whatsappUrl(raw, message);
}

function samePhoneNumber(a: string, b: string): boolean {
  const da = a.replace(/\D/g, '').replace(/^0+/, '');
  const db = b.replace(/\D/g, '').replace(/^0+/, '');
  if (!da || !db) return false;
  if (da === db) return true;
  if (da.length >= 8 && db.length >= 8 && Math.abs(da.length - db.length) <= 3) {
    return da.length > db.length ? da.endsWith(db) : db.endsWith(da);
  }
  return false;
}

export function uniqueContacts(contacts: Contact[], country = 'ALL'): Contact[] {
  const result: Contact[] = [];
  for (const contact of contacts) {
    if (contact.type === 'email') {
      const normalized = contact.value.trim().toLowerCase();
      if (!result.some(item => item.type === 'email' && item.value.trim().toLowerCase() === normalized)) {
        result.push({ ...contact, value: normalized });
      }
      continue;
    }
    const existingIndex = result.findIndex(item => item.type !== 'email' && samePhoneNumber(item.value, contact.value));
    if (existingIndex === -1) {
      result.push({ ...contact, value: resolveInternationalPhone(contact.value, country) });
    } else {
      const existing = result[existingIndex];
      const nextValue = resolveInternationalPhone(contact.value, country);
      const bestValue = nextValue.replace(/\D/g, '').length > existing.value.replace(/\D/g, '').length || (nextValue.startsWith('+') && !existing.value.startsWith('+'))
        ? nextValue
        : existing.value;
      result[existingIndex] = {
        ...existing,
        type: existing.type === 'whatsapp' || contact.type === 'whatsapp' ? 'whatsapp' : 'phone',
        value: bestValue,
      };
    }
  }
  return result;
}

export function whatsappUrl(phone: string, message: string) {
  if (typeof phone !== 'string' || !/^\+?[\d\s().-]+$/.test(phone.trim())) return null;
  const digits = phone.replace(/\D/g, '');
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function emailUrl(email: string, name: string, message: string, customSubject?: string) {
  if (!validEmail(email)) return undefined;
  const subject = customSubject || `Una idea para la web de ${name}`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

export function downloadFile(filename: string, value: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([value], {type}));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csvFile(items: Prospect[]) {
  const cell = (v: unknown) => { let s = String(v ?? ''); if (/^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
  return '\uFEFF' + [['Negocio', 'Web', 'País', 'Rubro', 'Problemas /100', 'Estado web', 'Correo', 'Teléfono', 'Seguimiento', 'Notas', 'Fecha', 'Evidencia'], ...items.map(s => [s.name, s.url, s.country, s.category, s.score, s.status, s.contacts.filter(c=>c.type==='email').map(c=>c.value).join('; '), s.contacts.filter(c=>c.type!=='email').map(c=>c.value).join('; '), s.stage || 'new', s.note || '', s.checkedAt, s.issues.map(i=>`${i.title}: ${i.detail}`).join(' | ')])].map(row=>row.map(cell).join(',')).join('\r\n');
}

export function parseImport(text: string): Prospect[] {
  if (text.length > 10_000_000) throw new Error('El archivo supera los 10 MB.');
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('El archivo no contiene JSON válido.'); }
  const list = Array.isArray(data) ? data : record(data).prospects;
  if (!Array.isArray(list) || list.length > 1000) throw new Error('El archivo debe contener una lista de hasta 1.000 diagnósticos.');
  const seen = new Set<string>();
  return list.map(value => {
    const s = record(value); const isDemo = s.demo === true;
    if (s.demo !== undefined && typeof s.demo !== 'boolean') invalid();
    const id = string(s.id, 80);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || seen.has(id)) throw new Error('El archivo contiene identificadores inválidos o duplicados.');
    seen.add(id);
    const url = safeWebUrl(s.url, isDemo);
    const country = string(s.country, 3); const category = string(s.category, 80);
    if (!countries.some(c => c[0] === country) || !categories.includes(category)) invalid();
    const status = oneOf(s.status, ['active', 'unreachable', 'blocked'] as const);
    const score = numberOrNull(s.score, 100);
    if (status !== 'active' && score !== null) throw new Error('Las webs sin revisar no deben tener puntuación.');
    const ai = record(s.aiEvidence);
    if (typeof ai.detected !== 'boolean') invalid();
    const checkedAt = string(s.checkedAt, 64);
    if (!Number.isFinite(Date.parse(checkedAt))) throw new Error('La fecha del diagnóstico no es válida.');
    const contacts: Contact[] = array(s.contacts, 30).map(value => {
      const c = record(value); const type = oneOf(c.type, ['email','phone','whatsapp'] as const); const valueText = string(c.value, 254);
      if (type === 'email' ? !validEmail(valueText) : type === 'whatsapp' ? !whatsappUrl(valueText, '') : !/^\+?[\d\s().-]+$/.test(valueText) || valueText.replace(/\D/g, '').length < 8 || valueText.replace(/\D/g, '').length > 15) invalid();
      return { type, value: valueText, source: safeWebUrl(c.source, isDemo) };
    });
    const issues: Issue[] = array(s.issues, 100).map(value => {
      const i = record(value); const points = numberOrNull(i.points, 100); if (points === null) invalid();
      const issue: Issue = { id: string(i.id, 120), title: string(i.title, 500), detail: string(i.detail, 5000), category: oneOf(i.category, ['structure','mobile','performance','accessibility','availability','security'] as const), severity: oneOf(i.severity, ['high','medium','low'] as const), points };
      if (i.sources !== undefined) issue.sources = array(i.sources, 12).map(source => safeWebUrl(source, isDemo));
      return issue;
    });
    const result: Prospect = {
      id, url, domain: new URL(url).hostname.replace(/^www\./, ''), name: string(s.name, 500), description: string(s.description, 5000, true), country, category, status, score, issues, contacts,
      aiEvidence: { detected: ai.detected, label: string(ai.label, 500), evidence: array(ai.evidence, 40).map(v => string(v, 3000)) },
      metrics: parseMetrics(s.metrics),
      checkedAt: new Date(checkedAt).toISOString(), source: isDemo ? string(s.source, 2000) : safeWebUrl(s.source), limitations: array(s.limitations, 50).map(v => string(v, 5000)), saved: true,
    };
    if (s.pageReviews !== undefined) result.pageReviews = array(s.pageReviews, 12).map(value => {
      const page = record(value);
      return {
        url: safeWebUrl(page.url, isDemo),
        score: numberOrNull(page.score, 100),
        issueIds: array(page.issueIds, 100).map(id => string(id, 120)),
        metrics: parseMetrics(page.metrics),
      };
    });
    if (s.crawl !== undefined) {
      const crawl = record(s.crawl);
      const attempted = integer(crawl.attempted, 100);
      const failed = integer(crawl.failed, 100);
      const limit = integer(crawl.limit, 100);
      if (limit < 1 || failed > attempted || attempted > limit || typeof crawl.limited !== 'boolean') invalid();
      result.crawl = { attempted, failed, limit, limited: crawl.limited };
    }
    if (s.contactScanVersion !== undefined) {
      const version = numberOrNull(s.contactScanVersion, 1_000_000);
      if (version === null || !Number.isInteger(version) || version < 1) invalid();
      result.contactScanVersion = version;
    }
    if (s.demo !== undefined) result.demo = isDemo;
    if (s.stage !== undefined) result.stage = oneOf(s.stage, ['new','contacted','replied','closed'] as const);
    if (s.note !== undefined) result.note = string(s.note, 50000, true);
    if (s.technologies !== undefined) result.technologies = array(s.technologies, 50).map(v => string(v, 500));
    if (s.language !== undefined) {
      const lang = string(s.language, 16);
      if (!/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})?$/.test(lang)) invalid();
      result.language = lang.toLowerCase();
    }
    if (s.previewImage !== undefined) {
      const image = safeWebUrl(s.previewImage, isDemo);
      if (!image.startsWith('https://')) invalid();
      result.previewImage = image;
    }
    return result;
  });
}

function validEmail(value: string): boolean {
  return typeof value === 'string' && value.length <= 254 && /^[a-z\d.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,63}$/i.test(value);
}
function parseMetrics(value: unknown): Audit['metrics'] {
  const metrics = record(value);
  const result: Audit['metrics'] = {
    responseMs: numberOrNull(metrics.responseMs, 3_600_000), htmlBytes: numberOrNull(metrics.htmlBytes, 1_000_000_000),
    viewport: booleanOrNull(metrics.viewport), title: booleanOrNull(metrics.title),
    h1: numberOrNull(metrics.h1, 1_000_000), imageAltMissing: numberOrNull(metrics.imageAltMissing, 1_000_000),
    performance: numberOrNull(metrics.performance, 100), accessibility: numberOrNull(metrics.accessibility, 100),
  };
  for (const key of ['wordCount', 'linkCount', 'domElements', 'headingCount', 'imageCount', 'blockingScripts'] as const) {
    if (metrics[key] !== undefined) result[key] = integer(metrics[key], 10_000_000);
  }
  return result;
}
function integer(value: unknown, max: number): number {
  const parsed = numberOrNull(value, max);
  if (parsed === null || !Number.isInteger(parsed)) invalid();
  return parsed;
}
function invalid(): never { throw new Error('El archivo no tiene el formato de Stack o contiene datos inválidos.'); }
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(); return value as Record<string, unknown>; }
function string(value: unknown, max: number, empty = false): string { if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) invalid(); return value; }
function array(value: unknown, max: number): unknown[] { if (!Array.isArray(value) || value.length > max) invalid(); return value; }
function oneOf<T extends string>(value: unknown, values: readonly T[]): T { if (typeof value !== 'string' || !values.includes(value as T)) invalid(); return value as T; }
function numberOrNull(value: unknown, max: number): number | null { if (value === null) return null; if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) invalid(); return value; }
function booleanOrNull(value: unknown): boolean | null { if (value === null || typeof value === 'boolean') return value; return invalid(); }
function safeWebUrl(value: unknown, demo = false): string {
  const input = string(value, 4000);
  let url: URL; try { url = new URL(input); } catch { return invalid(); }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80','443'].includes(url.port)) || !host.includes('.') && !host.includes(':') || /(?:^|\.)(localhost|local|internal|lan|home|test|invalid)$/.test(host) || (!demo && /(?:^|\.)example$/.test(host))) invalid();
  if (ipaddr.isValid(host)) {
    let ip = ipaddr.parse(host);
    if (ip.kind() === 'ipv6' && (ip as ipaddr.IPv6).isIPv4MappedAddress()) ip = (ip as ipaddr.IPv6).toIPv4Address();
    if (ip.range() !== 'unicast') invalid();
  }
  return url.href;
}
