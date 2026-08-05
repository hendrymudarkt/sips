import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/utils/api/upstreamProxy';
import { authHeaders } from '@/lib/api/apiProxy';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!BACKEND_URL) {
    return NextResponse.json(
      { ok: false, error: 'Backend URL is not configured' },
      { status: 500 }
    );
  }

  let url: URL;
  try {
    url = new URL(`${BACKEND_URL}/api/master/sips-businessunit`);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid backend URL configuration' },
      { status: 500 }
    );
  }

  for (const [key, value] of request.nextUrl.searchParams) {
    url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), { headers: authHeaders(token) });
  } catch (err) {
    console.error('[BUSINESS_UNITS_NETWORK_ERROR]', { url: url.toString(), error: String(err) });
    return NextResponse.json(
      { ok: false, error: 'Cannot reach backend server for business units' },
      { status: 502 }
    );
  }

  if (!response.ok) {
    // SECURITY: Log original error details server-side but return generic message
    // to client to prevent information leakage (CWE-209).
    const errorText = await response.text();
    console.error('[BUSINESS_UNITS_ERROR]', { status: response.status, error: errorText });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch business units' },
      { status: response.status }
    );
  }

  const data = await response.json();
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

