import { NextRequest, NextResponse } from 'next/server';
import { checkRequest, readBody } from '@/lib/server/api';
import { searchWeb, SearchError, validateSearchInput } from '@/lib/server/search';
export const runtime = 'nodejs';
export const maxDuration = 40;
export async function POST(request: NextRequest) {
  const limited = checkRequest(request, 'search', 45); if (limited) return limited;
  try { return NextResponse.json(await searchWeb(validateSearchInput(await readBody(request))), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) {
    if (error instanceof SearchError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    return NextResponse.json({ error: 'No se pudo procesar la búsqueda. Comprueba los datos e inténtalo de nuevo.' }, { status: 400 });
  }
}
