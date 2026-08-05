import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { authHeaders, extractDataArray } from '@/lib/api/apiProxy';
import { applyUserDataScope } from '@/utils/api/requestScope';

const ALLOWED_PARAMS = ['fcba', 'afdeling'];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // SECURITY: Enforce role-based data scoping (CWE-285)
  const params = applyUserDataScope(req, new URLSearchParams(req.nextUrl.searchParams.toString()));

  // Filter allowed params for upstream
  const upstreamParams = new URLSearchParams();
  for (const param of ALLOWED_PARAMS) {
    const value = params.get(param);
    if (value) upstreamParams.append(param, value);
  }

  const url = `${BACKEND_URL}/api/master/sips-fields${upstreamParams.toString() ? `?${upstreamParams}` : ''}`;
  const response = await fetch(url, {
    headers: authHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[FIELDS_ERROR]', { status: response.status, error: errorText });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch fields' },
      { status: response.status }
    );
  }

  const data = extractDataArray(await response.json());
  return NextResponse.json(
    { ok: true, data },
    {
      headers: {
        // SECURITY: Use private cache for potentially sensitive scoped data (CWE-524)
        'Cache-Control': 'private, max-age=600, stale-while-revalidate=1200',
      },
    }
  );
}

