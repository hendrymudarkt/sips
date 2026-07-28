import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { authHeaders, parseJsonSafe, proxyFormDataPut, proxyFormDataDelete, proxyFormDataPost } from '@/lib/api/apiProxy';
import { validateSecurity } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TRANSPORT_BASE = `${BACKEND_URL}/api/apps/pengangkutans`;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const upstream = await fetch(`${TRANSPORT_BASE}/${encodeURIComponent(String(id))}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });
  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }
  if (!upstream.ok) {
    console.error('[API_TRANSPORTS_ID_GET_ERROR]', {
      status: upstream.status,
      id,
      data,
    });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch transport record' },
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

  const incoming = await req.formData();
  return proxyFormDataPut(
    `${TRANSPORT_BASE}/${encodeURIComponent(String(id))}`,
    token,
    incoming,
    'API_TRANSPORTS_ID'
  );
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

  const incoming = await req.formData();
  return proxyFormDataDelete(
    `${TRANSPORT_BASE}/${encodeURIComponent(String(id))}`,
    token,
    incoming,
    'API_TRANSPORTS_ID'
  );
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const { id } = await context.params;
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const incoming = await req.formData();
  const methodOverride = (incoming.get('_method') as string | null) || '';
  if (methodOverride.toUpperCase() !== 'DELETE') {
    return NextResponse.json({ ok: false, error: 'Method not supported' }, { status: 405 });
  }

  return proxyFormDataPost(
    `${TRANSPORT_BASE}/${encodeURIComponent(String(id))}`,
    token,
    incoming,
    'API_TRANSPORTS_ID'
  );
}


