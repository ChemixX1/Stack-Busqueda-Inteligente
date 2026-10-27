import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadEnvConfig } from '@next/env';
import { searchWeb, validateSearchInput } from '../lib/server/search';
import { auditWebsite } from '../lib/server/audit';
import type { Audit, SearchResult } from '../lib/types';
import { categories, countries } from '../lib/catalog';

const help = `Stack · búsqueda automática de webs

Busca y revisa webs directamente. No necesita que la interfaz esté abierta.

npm run scan
npm run scan -- --query "restaurantes en Lima" --country PE --category "Restaurantes"
npm run scan -- --category "Turismo y hoteles" --rounds 3 --limit 12

Opciones:
  --query TEXTO       Actividad o ciudad (opcional; sin texto explora rubros).
  --urls LISTA        Revisar URLs separadas por comas, sin buscar.
  --country CODIGO    País del catálogo de Stack; por defecto PE.
  --category TEXTO    Rubro del catálogo; por defecto Todos los rubros.
  --limit NUMERO      Máximo de webs, entre 1 y 12; por defecto 6.
  --rounds NUMERO     Tandas de descubrimiento, entre 1 y 10; por defecto 3.
  --out ARCHIVO       JSON de auditorías; por defecto exports/stack-FECHA.json.
  --base-url URL      Opcional: usar una instancia local de Stack vía HTTP.
  --page-speed       Solicitar también PageSpeed, si está configurado.
  --help             Mostrar esta ayuda.

El archivo contiene un array de auditorías para importar en Stack. Nunca envía mensajes.
`;

type Options = {
  query?: string; urls?: string; country: string; category: string;
  limit: number; rounds: number; out: string; baseUrl?: string; pageSpeed: boolean;
};

function parseArgs(argv: string[]): Options | null {
  if (argv.includes('--help') || argv.includes('-h')) return null;
  const values = new Map<string, string>();
  const flags = new Set(['--page-speed']);
  const accepted = new Set(['--query', '--urls', '--country', '--category', '--limit', '--rounds', '--out', '--base-url']);
  let pageSpeed = false;
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i];
    if (flags.has(name)) { pageSpeed = true; continue; }
    if (!accepted.has(name)) throw new Error(`Opción desconocida: ${name}. Usa --help.`);
    if (values.has(name)) throw new Error(`Opción repetida: ${name}.`);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`Falta el valor de ${name}.`);
    values.set(name, value.trim());
  }
  const query = values.get('--query');
  const urls = values.get('--urls');
  if (query && urls) throw new Error('Usa --query o --urls, no ambas opciones a la vez.');
  const country = (values.get('--country') || 'PE').toUpperCase();
  if (!countries.some(([code]) => code === country)) throw new Error(`País no admitido: ${country}. Usa su código, por ejemplo PE, MX o ES.`);
  const category = values.get('--category') || 'Todos los rubros';
  if (!categories.includes(category)) throw new Error(`Rubro no admitido. Opciones: ${categories.join(', ')}.`);
  const limit = Number(values.get('--limit') || 6);
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) throw new Error('--limit debe ser un entero entre 1 y 12.');
  const rounds = Number(values.get('--rounds') || 3);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 10) throw new Error('--rounds debe ser un entero entre 1 y 10.');
  const out = values.get('--out') || `exports/stack-${new Date().toISOString().replaceAll(':', '-').replace('.', '-')}.json`;
  if (!out.toLowerCase().endsWith('.json')) throw new Error('--out debe terminar en .json.');
  const baseUrl = values.get('--base-url');
  const parsed = baseUrl ? new URL(baseUrl) : undefined;
  if (parsed) {
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('--base-url debe ser una URL HTTP(S) sin credenciales.');
  if (parsed.search || parsed.hash || (parsed.pathname !== '/' && parsed.pathname !== '')) throw new Error('--base-url debe ser el origen de Stack, sin ruta, parámetros ni fragmento.');
  }
  return {
    query, urls, country, category, limit, rounds, baseUrl: parsed?.origin, pageSpeed, out,
  };
}

async function post<T>(base: string, path: string, body: unknown, retry = true): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    throw new Error(`No se pudo conectar con ${base}. Comprueba que Stack esté en ejecución. ${error instanceof Error ? error.message : ''}`);
  }
  const text = await response.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error(`Stack devolvió una respuesta inesperada (HTTP ${response.status}). Comprueba la dirección del servidor.`); }
  if (!response.ok) {
    if (response.status === 429 && retry) {
      const seconds = Number(response.headers.get('retry-after') || 60);
      const waitMs = Number.isFinite(seconds) ? Math.max(1000, Math.min(60_000, seconds * 1000)) : 60_000;
      console.warn(`Límite temporal; reintentando en ${Math.ceil(waitMs / 1000)} s…`);
      await new Promise(resolveWait => setTimeout(resolveWait, waitMs));
      return post<T>(base, path, body, false);
    }
    const error = data && typeof data === 'object' && 'error' in data ? String(data.error) : `HTTP ${response.status}`;
    throw new Error(error);
  }
  return data as T;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) { console.log(help); return; }
  loadEnvConfig(process.cwd());
  const output = resolve(options.out);
  for (const file of [output, output.replace(/\.json$/i, '.errors.json')]) {
    try { await access(file); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
    throw new Error(`EEXIST: ya existe ${file}. Elige otro archivo con --out.`);
  }
  let urls: string[];
  const candidateCategories = new Map<string, string>();
  const failures: { url: string; error: string }[] = [];
  if (options.urls) {
    urls = [...new Set(options.urls.split(',').map(s => s.trim()).filter(Boolean))].slice(0, options.limit);
    for (const value of urls) {
      let parsed: URL;
      try { parsed = new URL(value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`); }
      catch { throw new Error(`URL inválida: ${value}.`); }
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(`URL inválida: ${value}.`);
    }
  } else {
    console.log(`Buscando: ${options.query || options.category} · ${options.country}`);
    urls = [];
    const domains = new Set<string>();
    for (let offset = 0; offset < options.rounds && urls.length < options.limit; offset++) {
      try {
        const input = { query: options.query || '', country: options.country, category: options.category, limit: options.limit, offset };
        const found = options.baseUrl
          ? await post<SearchResult>(options.baseUrl, '/api/search', input)
          : await searchWeb(validateSearchInput(input));
        if (!Array.isArray(found.results)) throw new Error('La respuesta de búsqueda no contiene resultados válidos.');
        console.log(`Tanda ${offset + 1} · ${found.provider} · ${found.results.length} candidatos`);
        if (found.warning) console.warn(found.warning);
        for (const item of found.results) {
          const domain = new URL(item.url).hostname.replace(/^www\./, '');
          if (domains.has(domain)) continue;
          domains.add(domain); urls.push(item.url);
          candidateCategories.set(item.url, found.category || options.category);
          if (urls.length === options.limit) break;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!urls.length) throw error;
        failures.push({ url: `Búsqueda: tanda ${offset + 1}`, error: message });
        console.warn(`Se conservan los candidatos de las tandas anteriores: ${message}`);
        break;
      }
      if (urls.length < options.limit && offset + 1 < options.rounds) await new Promise(resolveWait => setTimeout(resolveWait, 1500));
    }
  }
  if (!urls.length) throw new Error('No se encontraron webs. Prueba otro rubro o ciudad.');
  const audits: Audit[] = [];
  const auditedIds = new Set<string>(); const auditedDomains = new Set<string>();
  // Una petición a la vez evita ráfagas contra los sitios y límites del proveedor.
  for (const [index, url] of urls.entries()) {
    console.log(`[${index + 1}/${urls.length}] ${url}`);
    try {
      const input = {
        url, country: options.country, category: candidateCategories.get(url) || options.category, usePageSpeed: options.pageSpeed,
      };
      const audit = options.baseUrl ? await post<Audit>(options.baseUrl, '/api/audit', input) : await auditWebsite(input);
      if (!audit || typeof audit.url !== 'string' || !Array.isArray(audit.issues)) throw new Error('La auditoría no tiene el formato esperado.');
      const finalDomain = new URL(audit.url).hostname.replace(/^www\./, '');
      if (auditedIds.has(audit.id) || auditedDomains.has(finalDomain)) {
        console.log('  Ya revisada: el destino final corresponde al mismo negocio.');
        continue;
      }
      auditedIds.add(audit.id); auditedDomains.add(finalDomain);
      audits.push(audit);
      console.log(`  ${audit.status} · prioridad ${audit.score ?? 'sin evaluar'} · ${audit.contacts.length} contactos públicos`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ url, error: message });
      console.error(`  Error: ${message}`);
    }
  }
  await mkdir(dirname(output), { recursive: true });
  // No sobrescribe exportaciones anteriores por accidente.
  await writeFile(output, JSON.stringify(audits, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
  console.log(`Guardadas ${audits.length} auditorías en ${output}`);
  if (failures.length) {
    const errorsPath = output.replace(/\.json$/i, '.errors.json');
    await writeFile(errorsPath, JSON.stringify(failures, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    console.error(`${failures.length} auditorías fallaron. Detalles: ${errorsPath}`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(`Stack: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
