import { NextRequest, NextResponse } from 'next/server';
import { ABSENSI_BASE, buildFilteredUrl, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { parseJsonSafe } from '@/lib/api/apiProxy';
import { validateSecurity } from '@/lib/auth/security';
import { attendanceFilterSchema, attendanceApiResponseSchema } from '@/lib/validations/attendance';
import { applyUserDataScope } from '@/utils/api/requestScope';

export const dynamic = 'force-dynamic'; // no cache
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  // Parse searchParams from URL
  const searchParams = Object.fromEntries(req.nextUrl.searchParams);

  // Validate search params with Zod
  const validatedFilters = attendanceFilterSchema.safeParse(searchParams);
  if (!validatedFilters.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid search parameters', details: validatedFilters.error.flatten() },
      { status: 400 }
    );
  }

  const sp = new URLSearchParams(req.nextUrl.searchParams.toString());
  applyUserDataScope(req, sp);

  // Build URL final ke API absensi upstream
  const upstreamUrl = buildFilteredUrl(ABSENSI_BASE, sp);

  // console.log({
  //   url: upstreamUrl,
  //   params: Object.fromEntries(sp),
  // });

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const text = await upstream.text();
    let rawData: unknown = null;
    try {
      rawData = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Invalid response format from upstream' },
        { status: 502 }
      );
    }

    if (!upstream.ok) {
      // SECURITY: Log original error details server-side but return generic message
      // to client to prevent information leakage (CWE-209).
      console.error('[API_ATTENDANCE_GET_ERROR]', {
        status: upstream.status,
        data: rawData,
      });

      // 404 / "tidak ditemukan" dari upstream â†’ anggap empty dataset
      const rawRecord =
        rawData && typeof rawData === 'object' && !Array.isArray(rawData)
          ? (rawData as Record<string, unknown>)
          : null;
      const isNotFound =
        upstream.status === 404 ||
        (rawRecord !== null &&
          typeof rawRecord.message === 'string' &&
          rawRecord.message.toLowerCase().includes('tidak ditemukan'));

      if (isNotFound) {
        return NextResponse.json({ ok: true, message: 'Data tidak ditemukan', data: [] });
      }

      return NextResponse.json(
        { ok: false, error: 'Failed to fetch attendance data' },
        { status: upstream.status }
      );
    }

    // Normalize and validate response data
    let dataList: unknown[] = [];
    if (rawData && typeof rawData === 'object') {
      if ('data' in rawData && Array.isArray(rawData.data)) {
        dataList = rawData.data;
      } else if (Array.isArray(rawData)) {
        dataList = rawData;
      }
    }

    const response = {
      ok: true,
      data: dataList,
      message:
        rawData && typeof rawData === 'object' && 'message' in rawData
          ? String(rawData.message)
          : 'OK',
    };

    // Validate outgoing response
    const validatedResponse = attendanceApiResponseSchema.safeParse(response);
    if (!validatedResponse.success) {
      return NextResponse.json(
        { ok: false, error: 'Internal data validation failed' },
        { status: 500 }
      );
    }

    return NextResponse.json(validatedResponse.data);
  } catch (error) {
    console.error('[API_ATTENDANCE_GET]', error);
    return NextResponse.json({ ok: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const token = await getTokenFromCookie();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
  }

  const form = await req.formData(); // biarkan fetch set boundary multipart
  const upstream = await fetch(ABSENSI_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: form,
  });

  const { data, parseError } = await parseJsonSafe(upstream);
  if (parseError) {
    return NextResponse.json({ ok: false, error: 'Invalid response format' }, { status: 502 });
  }
  if (!upstream.ok) {
    // SECURITY: Log original error details server-side but return generic message
    // to client to prevent information leakage (CWE-209).
    console.error('[API_ATTENDANCE_POST_ERROR]', { status: upstream.status, data });
    return NextResponse.json(
      { ok: false, error: 'Attendance submission failed' },
      { status: upstream.status }
    );
  }
  return NextResponse.json({ ok: true, data });
}

