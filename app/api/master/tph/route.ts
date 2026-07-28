import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { authHeaders, extractDataArray } from '@/lib/api/apiProxy';
import { applyUserDataScope } from '@/utils/api/requestScope';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type TphRow = {
  id?: string;
  notph?: string;
  fieldcode?: string;
  ancakno?: string;
  typetph?: string;
  status?: string;
  location?: string;
  fcba?: string;
  division?: string;
  ha?: string;
  tahuntanam?: string;
  bjr?: string;
  [key: string]: unknown;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const fcba = searchParams.get('fcba');
  if (!fcba) {
    return NextResponse.json({ ok: false, error: 'fcba is required' }, { status: 400 });
  }

  const upstreamParams = new URLSearchParams({ fcba });
  applyUserDataScope(req, upstreamParams);

  for (const key of ['fieldcode', 'afdeling', 'ancakno', 'notph']) {
    const v = searchParams.get(key);
    if (v) upstreamParams.append(key, v);
  }

  const upstream = await fetch(`${BACKEND_URL}/api/apps/tphs?${upstreamParams}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  });

  if (!upstream.ok) {
    // SECURITY: Log original error details server-side but return generic message
    // to client to prevent information leakage (CWE-209).
    let errorDetail = `Upstream returned ${upstream.status} ${upstream.statusText}`;
    try {
      if (upstream.headers.get('content-type')?.includes('application/json')) {
        const raw = await upstream.json();
        errorDetail = JSON.stringify(raw);
      } else {
        errorDetail = await upstream.text();
      }
    } catch {
      /* ignore */
    }
    console.error('[TPH_GET_ERROR]', {
      status: upstream.status,
      error: errorDetail,
    });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch TPH data' },
      { status: upstream.status }
    );
  }

  const raw = await upstream.json();
  const rows = extractDataArray(raw) as TphRow[];

  return NextResponse.json(
    { ok: true, data: rows },
    {
      headers: {
        // SECURITY: Use private cache for potentially sensitive scoped data (CWE-524)
        'Cache-Control': 'private, max-age=600, stale-while-revalidate=1200',
      },
    }
  );
}

