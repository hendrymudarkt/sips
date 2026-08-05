import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { parseJsonSafe } from '@/lib/api/apiProxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const { id } = await params;

  const upstream = await fetch(`${BACKEND_URL}/api/user/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const data = await upstream.json();

  if (!upstream.ok) {
    console.error('[API_USER_DETAIL_GET_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch user data' },
      { status: upstream.status }
    );
  }

  return NextResponse.json({ ok: true, data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const upstream = await fetch(`${BACKEND_URL}/api/user/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const { data } = await parseJsonSafe(upstream);
    console.error('[API_USER_UPDATE_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: (data as Record<string, unknown>)?.message || 'Failed to update user' },
      { status: upstream.status }
    );
  }

  const rawText = await upstream.text();
  let json: unknown = null;
  if (rawText) {
    try { json = JSON.parse(rawText); } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true, data: json });
}
