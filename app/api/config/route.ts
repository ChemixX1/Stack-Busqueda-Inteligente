import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({ searchProvider: process.env.BRAVE_SEARCH_API_KEY?.trim() ? 'Brave + búsqueda pública' : 'DuckDuckGo + Bing', searchConfigured: true, pageSpeedConfigured: !!process.env.PAGESPEED_API_KEY?.trim() }, { headers: { 'Cache-Control': 'no-store' } });
}
