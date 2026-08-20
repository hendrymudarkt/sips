import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/utils/api/upstreamProxy';
import { authHeaders, extractDataArray } from '@/lib/api/apiProxy';
import { applyUserDataScope } from '@/utils/api/requestScope';
import { CookieName } from '@/lib/constants';

interface KaryawanRow {
  fcba?: string | number | null;
  sectionname?: string | null;
  gangcode?: string | null;
  [key: string]: unknown;
}

const ALLOWED_PARAMS = [
  'fcba',
  'afdeling',
  'sectionname',
  'gangcode',
  'noancak',
  'fctype',
  'fccompanycode',
];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const upstreamParams = new URLSearchParams();
  for (const param of ALLOWED_PARAMS) {
    const value = req.nextUrl.searchParams.get(param);
    if (value) upstreamParams.append(param, value);
  }

  applyUserDataScope(req, upstreamParams);

  const hasExplicitFcba = req.nextUrl.searchParams.has('fcba');
  if (hasExplicitFcba) {
    const level = (req.cookies.get(CookieName.SECURE_USER_LEVEL)?.value || '').toUpperCase();
    if (level === 'MGR' || level === 'KSI' || level === 'ADM') {
      upstreamParams.set('fcba', req.nextUrl.searchParams.get('fcba')!);
    }
  }

  const url = `${BACKEND_URL}/api/apps/karyawans${upstreamParams.toString() ? `?${upstreamParams}` : ''}`;

  const upstream = await fetch(url, {
    headers: authHeaders(token),
    cache: 'no-store',
  });

  if (!upstream.ok) {
    // SECURITY: Log original error details server-side but return generic message
    // to client to prevent information leakage (CWE-209).
    const errorText = await upstream.text();
    console.error('[KARYAWANS_ERROR]', {
      status: upstream.status,
      statusText: upstream.statusText,
      error: errorText,
    });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch employee data' },
      { status: upstream.status }
    );
  }

  const raw = await upstream.json();
  const rows = extractDataArray(raw) as KaryawanRow[];
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

