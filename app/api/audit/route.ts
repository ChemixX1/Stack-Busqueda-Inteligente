import { NextRequest, NextResponse } from 'next/server';
import { auditWebsite } from '@/lib/server/audit';
import { checkRequest, readBody } from '@/lib/server/api';
import { RequestError } from '@/lib/server/safe-fetch';
import { countries, categories } from '@/lib/catalog';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const limited = checkRequest(request, 'audit', 120); if (limited) return limited;
  try {
    const body = await readBody(request);
    if (typeof body.url !== 'string' || body.url.length < 4 || body.url.length > 2000) throw new RequestError('Introduce una dirección web válida.', 'INVALID_URL');
    const country = typeof body.country === 'string' && countries.some(c => c[0] === body.country) ? body.country : 'ALL';
    const category = typeof body.category === 'string' && categories.includes(body.category) ? body.category : 'Otros';
    return NextResponse.json(await auditWebsite({ url: body.url, country, category, usePageSpeed: body.usePageSpeed === true }), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : 'No se pudo procesar la dirección. Comprueba los datos e inténtalo de nuevo.', code: error instanceof RequestError ? error.code : 'AUDIT_FAILED' }, { status: 400 });
  }
}
