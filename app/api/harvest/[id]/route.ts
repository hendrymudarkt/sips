import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { parseJsonSafe } from '@/lib/api/apiProxy';
import { validateSecurity } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HARVEST_BASE = `${BACKEND_URL}/api/apps/panens`;

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await Promise.resolve(context.params);
  const id = params.id;
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const upstream = await fetch(`${HARVEST_BASE}/${encodeURIComponent(String(id))}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }
  if (!upstream.ok) {
    // SECURITY: Log original error details server-side but return generic message
    // to client to prevent information leakage (CWE-209).
    console.error('[API_HARVEST_ID_GET_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch harvest record' },
      { status: upstream.status }
    );
  }
  return NextResponse.json({ ok: true, data });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const params = await Promise.resolve(context.params);
  const id = params.id;
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  // Forward original FormData directly to avoid File serialisation
  // issues on Vercel serverless runtime.
  const incoming = await req.formData();
  incoming.delete('_csrf_token');
  incoming.append('_method', 'PUT');

  const upstream = await fetch(`${HARVEST_BASE}/${encodeURIComponent(String(id))}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: incoming,
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }
  if (!upstream.ok) {
    // SECURITY: Log original error details server-side but return generic message
    // to client to prevent information leakage (CWE-209).
    console.error('[API_HARVEST_ID_PUT_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to update harvest record' },
      { status: upstream.status }
    );
  }
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const params = await Promise.resolve(context.params);
  const id = params.id;
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const incoming = await req.formData();
  const baDeleted = incoming.get('ba_deleted');
  if (
    !(
      baDeleted instanceof File ||
      (baDeleted && typeof (baDeleted as unknown as { name?: string }).name === 'string')
    )
  ) {
    return NextResponse.json({ ok: false, error: 'BA delete PDF wajib diisi' }, { status: 400 });
  }

  incoming.delete('_csrf_token');

  const upstream = await fetch(`${HARVEST_BASE}/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    body: incoming,
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }
  if (!upstream.ok) {
    // SECURITY: Log original error details server-side but return generic message
    // to client to prevent information leakage (CWE-209).
    console.error('[API_HARVEST_ID_DELETE_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to delete harvest record' },
      { status: upstream.status }
    );
  }
  return NextResponse.json({ ok: true, data });
}

// Accept POST with _method override so clients can upload files (Laravel expects multipart POST)
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const params = await Promise.resolve(context.params);
  const id = params.id;
  const token = await getTokenFromCookie();
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });

  const incoming = await req.formData();
  const methodOverride = (incoming.get('_method') as string | null) || '';

  if (methodOverride.toUpperCase() === 'DELETE') {
    const baDeleted = incoming.get('ba_deleted');
    if (
      !(
        baDeleted instanceof File ||
        (baDeleted && typeof (baDeleted as unknown as { name?: string }).name === 'string')
      )
    ) {
      return NextResponse.json({ ok: false, error: 'BA delete PDF wajib diisi' }, { status: 400 });
    }

    incoming.delete('_csrf_token');

    const upstream = await fetch(`${HARVEST_BASE}/${encodeURIComponent(String(id))}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      body: incoming,
    });

    const { data, parseError } = await parseJsonSafe(upstream);
    if (parseError) {
      return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
    }
    if (!upstream.ok) {
      console.error('[API_HARVEST_ID_POST_DELETE_ERROR]', { status: upstream.status, data });
      return NextResponse.json(
        { ok: false, error: 'Failed to delete harvest record' },
        { status: upstream.status }
      );
    }
    return NextResponse.json({ ok: true, data });
  }

  return NextResponse.json({ ok: false, error: 'Method Not Allowed' }, { status: 405 });
}
