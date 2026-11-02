import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/auth/roleAuthorization';
import { authHeaders, isRecord, parseJsonSafe } from '@/lib/api/apiProxy';
import { validateSecurity } from '@/lib/auth/security';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEVICES_URL = `${BACKEND_URL}/api/settings/devices`;
const PAGE_SIZE = 100;

function extractDevicePage(data: unknown) {
  let page: unknown = data;

  for (let depth = 0; depth < 3; depth += 1) {
    if (isRecord(page) && Array.isArray(page.data)) {
      const currentPage = Number(page.current_page);
      const lastPage = Number(page.last_page);
      const total = Number(page.total);
      if (
        !Number.isInteger(currentPage) ||
        currentPage < 1 ||
        !Number.isInteger(lastPage) ||
        lastPage < 1 ||
        !Number.isFinite(total) ||
        total < 0
      ) {
        return null;
      }

      return {
        devices: page.data,
        pagination: {
          currentPage,
          lastPage,
          total,
          from: typeof page.from === 'number' ? page.from : null,
          to: typeof page.to === 'number' ? page.to : null,
        },
      };
    }

    if (isRecord(page) && 'data' in page) {
      page = page.data;
      continue;
    }

    return null;
  }

  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const page = req.nextUrl.searchParams.get('page') ?? '1';
  if (!/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page))) {
    return NextResponse.json({ ok: false, error: 'Invalid page number' }, { status: 400 });
  }

  const url = new URL(DEVICES_URL);
  url.searchParams.set('page', page);
  url.searchParams.set('per_page', String(PAGE_SIZE));

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (q) {
    if (q.length > 100) {
      return NextResponse.json({ ok: false, error: 'Search query is too long' }, { status: 400 });
    }
    url.searchParams.set('q', q);
  }

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      headers: authHeaders(token),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[API_DEVICES_GET_NETWORK_ERROR]', error);
    return NextResponse.json(
      { ok: false, error: 'Device service is unavailable' },
      { status: 502 }
    );
  }
  const { data, parseError } = await parseJsonSafe(upstream);

  if (parseError) {
    console.error('[API_DEVICES_GET_PARSE_ERROR]', { status: upstream.status });
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }
  if (!upstream.ok) {
    console.error('[API_DEVICES_GET_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch devices' },
      { status: upstream.status }
    );
  }

  const result = extractDevicePage(data);
  if (!result) {
    console.error('[API_DEVICES_GET_SHAPE_ERROR]', { status: upstream.status });
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, ...result });
}
