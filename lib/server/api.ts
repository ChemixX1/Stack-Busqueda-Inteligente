import { NextRequest, NextResponse } from 'next/server';

const windows = new Map<string, { count: number; until: number }>();

function isLocalHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

function isAllowedOrigin(request: NextRequest): boolean {
  if (request.headers.get('x-stack-client') === '1') return true;
  if (request.headers.get('sec-fetch-site') === 'same-origin') return true;
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return true;
  try {
    const parsed = new URL(origin);
    const originHost = parsed.host.toLowerCase();
    const knownHosts = [
      request.nextUrl.host,
      request.headers.get('host'),
      request.headers.get('x-forwarded-host')?.split(',')[0]?.trim(),
    ]
      .filter((value): value is string => Boolean(value))
      .map(value => value.toLowerCase());
    if (knownHosts.includes(originHost)) return true;
    if (isLocalHostname(parsed.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

export function checkRequest(request: NextRequest, scope: string, limit: number): NextResponse | null {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'La solicitud debe proceder de Stack.' }, { status: 403 });
  }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local';
  const key = `${scope}:${ip}`;
  const now = Date.now();
  if (windows.size > 1000) {
    for (const [k, v] of windows) if (v.until < now) windows.delete(k);
  }
  const entry = windows.get(key);
  if (!entry || entry.until < now) windows.set(key, { count: 1, until: now + 60000 });
  else if (entry.count >= limit) {
    return NextResponse.json(
      { error: 'Has alcanzado el límite de este minuto. Inténtalo de nuevo en un momento.' },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  } else entry.count++;
  return null;
}

export async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('content-length')) > 8000) throw new Error('La solicitud es demasiado grande.');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Falta el contenido de la solicitud.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8000) {
      await reader.cancel();
      throw new Error('La solicitud es demasiado grande.');
    }
    chunks.push(value);
  }
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Solicitud inválida.');
  return value;
}
