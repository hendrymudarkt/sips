import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildFilteredUrl, getTokenFromCookie, BACKEND_URL } from '@/utils/api/upstreamProxy';
import { applyUserDataScope } from '@/utils/api/requestScope';
import { authHeaders, isRecord, parseJsonSafe } from '@/lib/api/apiProxy';
import { validateSecurity } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HARVEST_BASE = `${BACKEND_URL}/api/apps/panens`;

const querySchema = z
  .object({
    tanggal: z.string().optional(),
    tanggal_end: z.string().optional(),
    fcba: z.string().optional(),
    afdeling: z.string().optional(),
    status_harvesting: z.string().optional(),
    kemandoran: z.string().optional(),
    nodokumen: z.string().optional(),
    kode_karyawan: z.string().optional(),
    tph: z.string().optional(),
  })
  .passthrough();

export async function POST(req: NextRequest): Promise<NextResponse> {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const incoming = await req.formData();
  const upstream = await fetch(HARVEST_BASE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    body: incoming,
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }
  if (!upstream.ok) {
    // SECURITY: Log original error details server-side but return generic message
    // to client to prevent information leakage (CWE-209).
    console.error('[API_HARVEST_POST_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: 'Harvest submission failed' },
      { status: upstream.status }
    );
  }
  return NextResponse.json({ ok: true, data });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const rawParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const validated = querySchema.safeParse(rawParams);
  if (!validated.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid query parameters', details: validated.error.format() },
      { status: 400 }
    );
  }

  const sp = new URLSearchParams(req.nextUrl.searchParams.toString());
  applyUserDataScope(req, sp);

  const upstreamUrl = buildFilteredUrl(HARVEST_BASE, sp);

  const upstream = await fetch(upstreamUrl, {
    headers: authHeaders(token),
    cache: 'no-store',
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }

  if (!upstream.ok) {
    // SECURITY: Log original error details server-side but return generic message
    // to client to prevent information leakage (CWE-209).
    console.error('[API_HARVEST_GET_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch harvest data' },
      { status: upstream.status }
    );
  }

  if (isRecord(data) && Array.isArray(data.data)) {
    return NextResponse.json({ ok: true, data: data.data, message: data.message ?? 'OK' });
  }

  return NextResponse.json({ ok: true, data: [], message: 'OK' });
}

