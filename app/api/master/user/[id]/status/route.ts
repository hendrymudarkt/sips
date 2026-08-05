import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { validateSecurity } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const { id } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.status || !['Y', 'N'].includes(body.status)) {
    return NextResponse.json(
      { ok: false, error: 'Status must be "Y" or "N"'},
      { status: 400 }
    );
  }

  const upstream = await fetch(`${BACKEND_URL}/api/user/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ status: body.status }),
  });

  const data = await upstream.json();

  if (!upstream.ok) {
    console.error('[API_USER_STATUS_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to update user status' },
      { status: upstream.status }
    );
  }

  return NextResponse.json({ ok: true, data });
}
