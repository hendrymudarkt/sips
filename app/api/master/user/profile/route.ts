import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL } from '@/utils/api/upstreamProxy';
import { validateSecurity } from '@/lib/auth/security';

export async function GET(req: NextRequest) {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const userId = cookieStore.get('log_id')?.value;

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'User id missing' }, { status: 400 });
  }

  const url = `${BACKEND_URL}/api/user/${encodeURIComponent(userId)}`;

  const upstream = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  const data = await upstream.json();

  if (!upstream.ok) {
    // SECURITY: Log original error details server-side but return generic message
    // to client to prevent information leakage (CWE-209).
    console.error('[USER_PROFILE_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch profile information' },
      { status: upstream.status }
    );
  }

  return NextResponse.json({ ok: true, data });
}

