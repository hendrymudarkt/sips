import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { parseJsonSafe } from '@/lib/api/apiProxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
) {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const upstream = await fetch(`${BACKEND_URL}/api/user/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const data = await upstream.json();

  if (!upstream.ok) {
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch profile' },
      { status: upstream.status }
    );
  }

  return NextResponse.json({ ok: true, data });
}

export async function PUT(req: NextRequest) {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const body = await req.json();

  const upstream = await fetch(`${BACKEND_URL}/api/user/profile`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const { data, parseError } = await parseJsonSafe(upstream);

  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }

  if (!upstream.ok) {
    console.error('[API_PROFILE_UPDATE_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: (data as Record<string, unknown>)?.message || 'Failed to update profile' },
      { status: upstream.status }
    );
  }

  return NextResponse.json({ ok: true, data });
}
