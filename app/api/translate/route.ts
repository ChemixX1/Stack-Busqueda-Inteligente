import { NextRequest, NextResponse } from 'next/server';
import { checkRequest, readBody } from '@/lib/server/api';

export const runtime = 'nodejs';
export const maxDuration = 15;

const cache = new Map<string, string>();

export async function POST(request: NextRequest) {
  const limited = checkRequest(request, 'translate', 45);
  if (limited) return limited;

  try {
    const body = await readBody(request);
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const target = typeof body.target === 'string' ? body.target.trim().toLowerCase() : '';

    if (!text || text.length > 2500 || !/^[a-z]{2,3}(?:-[a-zA-Z]{2,4})?$/.test(target)) {
      return NextResponse.json({ error: 'Parámetros de traducción inválidos.' }, { status: 400 });
    }
    if (target === 'es') {
      return NextResponse.json({ translatedText: text }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const cacheKey = `${target}:${text}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ translatedText: cached }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const endpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(endpoint, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Servicio de traducción no disponible.' }, { status: 502 });
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      return NextResponse.json({ error: 'Respuesta de traducción inválida.' }, { status: 502 });
    }

    const translatedText = data[0]
      .map((segment: unknown) => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
      .join('');

    if (!translatedText) {
      return NextResponse.json({ error: 'Traducción vacía.' }, { status: 502 });
    }

    if (cache.size >= 300) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(cacheKey, translatedText);

    return NextResponse.json({ translatedText }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudo traducir el mensaje.' }, { status: 400 });
  }
}
