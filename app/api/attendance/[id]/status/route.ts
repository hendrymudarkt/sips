import { NextRequest, NextResponse } from 'next/server';
import { ABSENSI_BASE, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { validateSecurity } from '@/lib/auth/security';
import { authHeaders, parseJsonSafe, unauthorizedResponse } from '@/lib/api/apiProxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const params = await context.params;
  const { id } = params;

  try {
    const token = await getTokenFromCookie();
    if (!token) return unauthorizedResponse();

    const body = await req.json();

    const res = await fetch(`${ABSENSI_BASE}/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    });

    const { data, parseError } = await parseJsonSafe(res);

    if (parseError) {
      console.error('[API_ATTENDANCE_STATUS_PARSE_ERROR]', { status: res.status, data });
      return NextResponse.json(
        { ok: false, error: 'Failed to parse upstream response' },
        { status: 502 }
      );
    }

    if (!res.ok) {
      console.error('[API_ATTENDANCE_STATUS_PATCH_ERROR]', { status: res.status, data });
      return NextResponse.json(
        { ok: false, error: 'Failed to update attendance status' },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error('Error PATCH /api/attendance/[id]/status:', err);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


