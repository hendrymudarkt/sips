import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/utils/api/upstreamProxy';
import { authHeaders, parseJsonSafe, isRecord } from '@/lib/api/apiProxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const KENDARAAN_BASE = `${BACKEND_URL}/api/master/sips-kendaraan`;

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const url = `${KENDARAAN_BASE}?${req.nextUrl.searchParams.toString()}`;

  const upstream = await fetch(url, {
    headers: authHeaders(token),
    cache: 'no-store',
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch kendaraan data' },
      { status: upstream.status }
    );
  }

  if (Array.isArray(data)) {
    return NextResponse.json({ ok: true, data });
  }

  if (isRecord(data) && Array.isArray(data.data)) {
    return NextResponse.json({ ok: true, data: data.data as unknown[] });
  }

  return NextResponse.json({ ok: true, data: [] });
}

