import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth/roleAuthorization';
import { authHeaders, isRecord, parseJsonSafe } from '@/lib/api/apiProxy';
import { validateSecurity } from '@/lib/auth/security';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEVICES_URL = `${BACKEND_URL}/api/settings/devices`;
const ALLOWED_STATUSES = new Set(['active', 'inactive', 'suspended']);

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ ok: false, error: 'Invalid device ID' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('status' in body) ||
    typeof body.status !== 'string' ||
    !ALLOWED_STATUSES.has(body.status)
  ) {
    return NextResponse.json({ ok: false, error: 'Invalid device status' }, { status: 400 });
  }

  let upstream: Response;
  try {
    const update =
      body.status === 'active'
        ? { status: body.status, registered_at: new Date().toISOString() }
        : { status: body.status };
    upstream = await fetch(`${DEVICES_URL}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(update),
    });
  } catch (error) {
    console.error('[API_DEVICES_PATCH_NETWORK_ERROR]', { id, error });
    return NextResponse.json(
      { ok: false, error: 'Device service is unavailable' },
      { status: 502 }
    );
  }
  const { data, parseError } = await parseJsonSafe(upstream);

  if (parseError) {
    console.error('[API_DEVICES_PATCH_PARSE_ERROR]', { id, status: upstream.status });
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }
  if (!upstream.ok || (isRecord(data) && data.success === false)) {
    console.error('[API_DEVICES_PATCH_ERROR]', { id, status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to update device access' },
      { status: upstream.ok ? 502 : upstream.status }
    );
  }

  return NextResponse.json({ ok: true, data });
}
