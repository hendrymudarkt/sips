import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { authHeaders, extractDataArray } from '@/lib/api/apiProxy';
import { applyUserDataScope } from '@/utils/api/requestScope';

const ALLOWED_PARAMS = ['fccode', 'fcba'];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 🛡️  GUARD: Jangan hapus block ini. Parameter `fcba` sengaja dipertahankan
  //     eksplisit untuk keperluan destination/assistensi, meskipun
  //     applyUserDataScope akan meng-override-nya dengan FCBA user.
  // ────────────────────────────────────────────────────────────────────────────
  const hasExplicitFcba = req.nextUrl.searchParams.has('fcba');

  const params = applyUserDataScope(req, new URLSearchParams(req.nextUrl.searchParams.toString()));

  if (hasExplicitFcba) {
    params.set('fcba', req.nextUrl.searchParams.get('fcba')!);
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Filter allowed params for upstream
  const upstreamParams = new URLSearchParams();
  for (const param of ALLOWED_PARAMS) {
    const value = params.get(param);
    if (value) upstreamParams.append(param, value);
  }

  const url = `${BACKEND_URL}/api/master/sips-section${upstreamParams.toString() ? `?${upstreamParams}` : ''}`;
  const response = await fetch(url, {
    headers: authHeaders(token),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SECTIONS_ERROR]', { status: response.status, error: errorText });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch sections' },
      { status: response.status }
    );
  }

  const data = extractDataArray(await response.json());
  return NextResponse.json({ ok: true, data });
}

