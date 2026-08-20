import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { applyUserDataScope } from '@/utils/api/requestScope';
import { authHeaders, parseJsonSafe, isRecord } from '@/lib/api/apiProxy';
import { validateSecurity } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VEHICLE_RENTS_BASE = `${BACKEND_URL}/api/apps/vehicle-rents`;

const ALLOWED_PARAMS = new Set([
  'tanggal',
  'contract_no',
  'fcba',
  'vehicle_code',
  'vehicle_name',
  'registration_no',
  'nik',
  'driver_name',
  'valid_from',
  'valid_until',
]);

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const sp = new URLSearchParams(req.nextUrl.searchParams.toString());
  applyUserDataScope(req, sp);

  const url = new URL(VEHICLE_RENTS_BASE);
  for (const [k, v] of sp.entries()) {
    if (ALLOWED_PARAMS.has(k) && v) url.searchParams.append(k, v);
  }

  const upstream = await fetch(url.toString(), {
    headers: authHeaders(token),
    cache: 'no-store',
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }

  if (!upstream.ok) {
    console.error('[API_VEHICLE_RENTS_GET_ERROR]', {
      status: upstream.status,
      url: url.toString(),
      data,
    });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch vehicle rent data' },
      { status: upstream.status }
    );
  }

  if (isRecord(data) && Array.isArray(data.data)) {
    return NextResponse.json({ ok: true, data: data.data, message: data.message ?? 'OK' });
  }

  return NextResponse.json({ ok: true, data: [], message: 'OK' });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  const upstream = await fetch(VEHICLE_RENTS_BASE, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }

  if (!upstream.ok) {
    console.error('[API_VEHICLE_RENTS_POST_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to create vehicle rent record' },
      { status: upstream.status }
    );
  }

  return NextResponse.json({ ok: true, data });
}