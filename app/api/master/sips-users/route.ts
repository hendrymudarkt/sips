import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { applyUserDataScope } from '@/utils/api/requestScope';
import { authHeaders, parseJsonSafe, isRecord } from '@/lib/api/apiProxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MASTER_USERS_BASE = `${BACKEND_URL}/api/master/sips-users`;

export async function GET(req: NextRequest) {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const searchParams = new URLSearchParams(req.nextUrl.searchParams.toString());
  applyUserDataScope(req, searchParams, { gangParam: 'kemandoran' });
  const url = `${MASTER_USERS_BASE}?${searchParams.toString()}`;

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
      { ok: false, error: 'Failed to fetch master users' },
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

