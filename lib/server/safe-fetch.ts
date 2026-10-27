import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';
import ipaddr from 'ipaddr.js';

export class RequestError extends Error {
  constructor(message: string, public code = 'FETCH_FAILED') { super(message); this.name = 'RequestError'; }
}

export function isPublicIp(address: string): boolean {
  try {
    let ip = ipaddr.parse(address);
    if (ip.kind() === 'ipv6' && (ip as ipaddr.IPv6).isIPv4MappedAddress()) ip = (ip as ipaddr.IPv6).toIPv4Address();
    return ip.range() === 'unicast';
  } catch { return false; }
}

export function normalizeUrl(input: string): URL {
  let url: URL;
  try { url = new URL(/^[a-z][a-z\d+.-]*:/i.test(input.trim()) ? input.trim() : `https://${input.trim()}`); }
  catch { throw new RequestError('Introduce una dirección web válida.', 'INVALID_URL'); }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (url.port && !['80', '443'].includes(url.port)) || !host.includes('.') && !host.includes(':') ||
      /(?:^|\.)(?:localhost|local|internal|lan|home|test|example|invalid)$/.test(host) ||
      (ipaddr.isValid(host) && !isPublicIp(host))) {
    throw new RequestError('Solo se permiten sitios públicos HTTP o HTTPS.', 'UNSAFE_URL');
  }
  url.hash = '';
  return url;
}

export async function resolvePublicUrl(input: string | URL) {
  const url = normalizeUrl(String(input));
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = ipaddr.isValid(host)
    ? [{ address: host, family: ipaddr.parse(host).kind() === 'ipv6' ? 6 : 4 }]
    : await Promise.race([
        dns.lookup(host, { all: true, verbatim: true }),
        new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new RequestError('El dominio no responde.', 'DNS_TIMEOUT')), 3500); timer.unref(); }),
      ]);
  if (!addresses.length || addresses.some(a => !isPublicIp(a.address))) throw new RequestError('El destino no es una dirección pública permitida.', 'UNSAFE_URL');
  return { url, addresses };
}

export type PublicResponse = { url: string; status: number; headers: Record<string, string>; body: string; bytes: number; responseMs: number };

export async function safeFetch(input: string | URL, options: { timeoutMs?: number; maxBytes?: number; redirects?: number; accept?: string } = {}): Promise<PublicResponse> {
  const deadline = Date.now() + (options.timeoutMs ?? 9000);
  const started = Date.now();
  let current = normalizeUrl(String(input));
  const maxBytes = options.maxBytes ?? 1_500_000;
  for (let hop = 0; hop <= (options.redirects ?? 4); hop++) {
    const { url, addresses } = await resolvePublicUrl(current);
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new RequestError('Se agotó el tiempo de respuesta.', 'TIMEOUT');
    const response = await new Promise<PublicResponse>((resolve, reject) => {
      const transport = url.protocol === 'https:' ? https : http;
      const req = transport.request(url, {
        method: 'GET',
        headers: { 'user-agent': 'StackRadar/1.0 (+public-business-website-review)', accept: options.accept ?? 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.2', 'accept-encoding': 'identity' },
        // Pin the connection to the addresses that passed validation: no second DNS lookup.
        lookup: (_hostname, lookupOptions, callback) => {
          const selected = addresses.find(a => a.family === 4) ?? addresses[0];
          if (typeof lookupOptions === 'object' && lookupOptions.all) callback(null, [selected] as never, selected.family);
          else callback(null, selected.address, selected.family);
        },
      }, res => {
        const headers = Object.fromEntries(Object.entries(res.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value ?? '']));
        if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0)) {
          res.resume(); resolve({ url: url.href, status: res.statusCode!, headers, body: '', bytes: 0, responseMs: Date.now() - started }); return;
        }
        if (Number(headers['content-length']) > maxBytes) { res.destroy(); reject(new RequestError('La página supera el límite de lectura de 1,5 MB.', 'BODY_LIMIT')); return; }
        const chunks: Buffer[] = []; let bytes = 0;
        res.on('data', (chunk: Buffer) => { bytes += chunk.length; if (bytes > maxBytes) { res.destroy(); reject(new RequestError('La página supera el límite de lectura.', 'BODY_LIMIT')); } else chunks.push(chunk); });
        res.on('error', () => reject(new RequestError('La descarga de la página se interrumpió.', 'FETCH_FAILED')));
        res.on('end', () => {
          try {
            let body = Buffer.concat(chunks);
            const encoding = headers['content-encoding']?.toLowerCase();
            if (encoding === 'gzip') body = gunzipSync(body, { maxOutputLength: maxBytes });
            else if (encoding === 'br') body = brotliDecompressSync(body, { maxOutputLength: maxBytes });
            else if (encoding === 'deflate') body = inflateSync(body, { maxOutputLength: maxBytes });
            else if (encoding && encoding !== 'identity') throw new Error('encoding');
            resolve({ url: url.href, status: res.statusCode ?? 0, headers, body: body.toString('utf8'), bytes: body.length, responseMs: Date.now() - started });
          } catch { reject(new RequestError('No se pudo leer el contenido comprimido dentro del límite de tamaño.', 'BODY_LIMIT')); }
        });
      });
      const timer = setTimeout(() => req.destroy(new RequestError('Se agotó el tiempo de respuesta.', 'TIMEOUT')), remaining);
      req.on('close', () => clearTimeout(timer));
      req.on('error', error => reject(error instanceof RequestError ? error : new RequestError('No se pudo conectar con la web. Puede ser temporal o un bloqueo del servidor.', 'FETCH_FAILED')));
      req.end();
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.headers.location) throw new RequestError('La web redirige sin indicar destino.', 'REDIRECT');
      current = normalizeUrl(new URL(response.headers.location, current).href);
      continue;
    }
    return response;
  }
  throw new RequestError('La web redirige demasiadas veces.', 'REDIRECT');
}
