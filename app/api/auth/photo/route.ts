import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { parseJsonSafe } from '@/lib/api/apiProxy';
import { validateSecurity } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const jar = await cookies();
  const userId = jar.get('log_id')?.value;
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'User id missing' }, { status: 400 });
  }

  const form = await req.formData();

  const upstream = await fetch(`${BACKEND_URL}/api/user/${encodeURIComponent(userId)}/photo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: form,
  });

  const { data, parseError } = await parseJsonSafe(upstream);

  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }

  if (!upstream.ok) {
    console.error('[API_AUTH_PHOTO_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: (data as Record<string, unknown>)?.message || 'Failed to upload photo' },
      { status: upstream.status }
    );
  }

  return NextResponse.json({ ok: true, data });
}