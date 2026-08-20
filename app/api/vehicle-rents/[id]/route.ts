import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { authHeaders, parseJsonSafe } from '@/lib/api/apiProxy';
import { validateSecurity } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VEHICLE_RENTS_BASE = `${BACKEND_URL}/api/apps/vehicle-rents`;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const upstream = await fetch(`${VEHICLE_RENTS_BASE}/${encodeURIComponent(String(id))}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }
  if (!upstream.ok) {
    console.error('[API_VEHICLE_RENTS_ID_GET_ERROR]', { status: upstream.status, id, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch vehicle rent record' },
      { status: upstream.status }
    );
  }
  return NextResponse.json({ ok: true, data });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const { id } = await context.params;
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const upstream = await fetch(`${VEHICLE_RENTS_BASE}/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }
  if (!upstream.ok) {
    console.error('[API_VEHICLE_RENTS_ID_PUT_ERROR]', { status: upstream.status, id, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to update vehicle rent record' },
      { status: upstream.status }
    );
  }
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const { id } = await context.params;
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const upstream = await fetch(`${VEHICLE_RENTS_BASE}/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }
  if (!upstream.ok) {
    console.error('[API_VEHICLE_RENTS_ID_DELETE_ERROR]', { status: upstream.status, id, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to delete vehicle rent record' },
      { status: upstream.status }
    );
  }
  return NextResponse.json({ ok: true, data });
}