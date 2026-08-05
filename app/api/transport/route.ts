import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { applyUserDataScope } from '@/utils/api/requestScope';
import { authHeaders, isRecord, parseJsonSafe } from '@/lib/api/apiProxy';
import { sanitizeHtml, sanitizeFilename } from '@/lib/utils/inputSanitizer';
import { validateSecurity } from '@/lib/auth/security';

const PENGANGKUTAN_BASE = `${BACKEND_URL}/api/apps/pengangkutans`;

const querySchema = z
  .object({
    nopengangkutan: z.string().optional(),
    nodokumen: z.string().optional(),
    tanggal: z.string().optional(),
    tanggal_end: z.string().optional(),
    fcba: z.string().optional(),
    afdeling: z.string().optional(),
    kemandoran: z.string().optional(),
    status_pengangkutan: z.string().optional(),
  })
  .passthrough();

const ALLOWED_PARAMS = new Set([
  'nopengangkutan',
  'nospb',
  'nodokumen',
  'tanggal',
  'tanggal_end',
  'kode_karyawan_kerani',
  'kode_karyawan_driver',
  'tkbm1',
  'tkbm2',
  'tkbm3',
  'tkbm4',
  'tkbm5',
  'type_pengangkutan',
  'kode_kendaraan',
  'fcba',
  'pabrik_tujuan',
  'afdeling',
  'kemandoran',
  'tph',
  'fieldcode',
  'status_pengangkutan',
  'flag',
]);

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

  const url = new URL(PENGANGKUTAN_BASE);
  for (const [k, v] of sp.entries()) {
    if (ALLOWED_PARAMS.has(k) && v) url.searchParams.append(k, v);
  }

  const upstream = await fetch(url.toString(), {
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
    console.error('[API_PENGANGKUTANS_GET_ERROR]', {
      status: upstream.status,
      url: url.toString(),
      data,
    });
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch transport data' },
      { status: upstream.status }
    );
  }

  if (isRecord(data) && Array.isArray(data.data)) {
    return NextResponse.json({ ok: true, data: data.data, message: data.message ?? 'OK' });
  }

  return NextResponse.json({ ok: true, data: [], message: 'OK' });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  // === INPUT SANITIZATION ===
  const incoming = await req.formData();
  const form = new FormData();
  for (const [key, value] of incoming.entries()) {
    const sanitizedKey = sanitizeHtml(key);

    if (typeof value === 'string') {
      // Sanitize string values
      const sanitizedValue = sanitizeHtml(value);
      form.append(sanitizedKey, sanitizedValue);
    } else if (value instanceof File) {
      // Read file bytes and create a brand-new File to avoid
      // File serialisation issues on Vercel serverless runtime.
      const sanitizedFilename = sanitizeFilename(value.name);
      const buffer = await value.arrayBuffer();
      form.append(sanitizedKey, new File([buffer], sanitizedFilename, { type: value.type }));
    } else {
      form.append(sanitizedKey, value);
    }
  }

  // Clean internal fields before forwarding upstream
  form.delete('_csrf_token');

  const upstream = await fetch(PENGANGKUTAN_BASE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    body: form,
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }

  if (!upstream.ok) {
    // SECURITY: Log original error details server-side but return generic message
    // to client to prevent information leakage (CWE-209).
    console.error('[API_PENGANGKUTANS_POST_ERROR]', {
      status: upstream.status,
      data,
    });
    return NextResponse.json(
      { ok: false, error: 'Failed to create transport record' },
      { status: upstream.status }
    );
  }

  return NextResponse.json({ ok: true, data });
}

