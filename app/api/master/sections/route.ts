import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { authHeaders, extractDataArray } from '@/lib/api/apiProxy';
import { applyUserDataScope } from '@/utils/api/requestScope';
import { CookieName } from '@/lib/constants';

const ALLOWED_PARAMS = ['fccode', 'fcba'];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ðŸ›¡ï¸  GUARD: Jangan hapus block ini. Parameter `fcba` sengaja dipertahankan
  //     eksplisit untuk keperluan destination/assistensi, meskipun
  //     applyUserDataScope akan meng-override-nya dengan FCBA user.
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const hasExplicitFcba = req.nextUrl.searchParams.has('fcba');

  const params = applyUserDataScope(req, new URLSearchParams(req.nextUrl.searchParams.toString()));

  // SECURITY: Only FCBA-level roles (MGR/KSI/ADM) may explicitly target another
  // fcba (destination/assistance). Lower roles keep the fcba their scope assigns;
  // allowing them to override scoping was a CWE-285 bypass.
  if (hasExplicitFcba) {
    const level = (req.cookies.get(CookieName.SECURE_USER_LEVEL)?.value || '').toUpperCase();
    if (level === 'MGR' || level === 'KSI' || level === 'ADM') {
      params.set('fcba', req.nextUrl.searchParams.get('fcba')!);
    }
  }
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

