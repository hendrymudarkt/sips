import { NextRequest, NextResponse } from 'next/server';
import { ABSENSI_BASE, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { parseJsonSafe, authHeaders, proxyFormDataPut, proxyFormDataDelete, proxyFormDataPost } from '@/lib/api/apiProxy';
import { validateSecurity } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const id = params.id;
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const upstream = await fetch(`${ABSENSI_BASE}/${encodeURIComponent(String(id))}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }
  if (!upstream.ok) {
    console.error('[API_ATTENDANCE_ID_GET_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch attendance record' },
      { status: upstream.status }
    );
  }
  return NextResponse.json({ ok: true, data });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const params = await context.params;
  const id = params.id;
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const incoming = await req.formData();
  return proxyFormDataPut(
    `${ABSENSI_BASE}/${encodeURIComponent(String(id))}`,
    token,
    incoming,
    'API_ATTENDANCE_ID'
  );
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const params = await context.params;
  const id = params.id;
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const incoming = await req.formData();
  return proxyFormDataDelete(
    `${ABSENSI_BASE}/${encodeURIComponent(String(id))}`,
    token,
    incoming,
    'API_ATTENDANCE_ID'
  );
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const params = await context.params;
  const id = params.id;
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const incoming = await req.formData();
  const methodOverride = (incoming.get('_method') as string | null) || '';

  if (methodOverride.toUpperCase() === 'DELETE') {
    return proxyFormDataPost(
      `${ABSENSI_BASE}/${encodeURIComponent(String(id))}`,
      token,
      incoming,
      'API_ATTENDANCE_ID'
    );
  }

  return NextResponse.json({ ok: false, error: 'Method Not Allowed' }, { status: 405 });
}


