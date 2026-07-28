import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { applyUserDataScope } from '@/utils/api/requestScope';
import { authHeaders, parseJsonSafe, extractMessage, unauthorizedResponse } from '@/lib/api/apiProxy';
import { uploadSubmitSchema, validateInput } from '@/lib/utils/inputSanitizer';
import { validateSecurity } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = await getTokenFromCookie();
  if (!token)
    return NextResponse.json({ ok: false, error: 'Unauthenticated', data: [] }, { status: 401 });

  const searchParams = new URLSearchParams(req.nextUrl.searchParams.toString());
  applyUserDataScope(req, searchParams, { gangParam: 'gangcode' });

  const url = `${BACKEND_URL}/api/report/upload-attendance${searchParams.toString() ? `?${searchParams}` : ''}`;

  const response = await fetch(url, { method: 'GET', headers: authHeaders(token) });
  const { data, parseError } = await parseJsonSafe(response);

  if (parseError) {
    console.error('Failed to parse API response:', data);
    return NextResponse.json(
      { ok: false, error: 'Failed to parse API response', data: [] },
      { status: 500 }
    );
  }

  if (!response.ok) {
    const msg = extractMessage(data);
    if (response.status === 404 || msg.toLowerCase().includes('tidak ditemukan')) {
      return NextResponse.json({ ok: true, message: 'Data tidak ditemukan', data: [] });
    }
    return NextResponse.json(
      { ok: false, error: `External API error ${response.status}: ${msg}`, data: [] },
      { status: response.status }
    );
  }

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const token = await getTokenFromCookie();
  if (!token) return unauthorizedResponse();

  try {
    const body = await req.json();
    const recordId = req.nextUrl.searchParams.get('id');
    if (!recordId) {
      return NextResponse.json(
        { ok: false, error: 'Missing required query parameter: id' },
        { status: 400 }
      );
    }
    
    // Validate dan sanitize input
    const validation = validateInput(body, uploadSubmitSchema);
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, message: validation.error },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/report/upload-attendance/${recordId}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(validation.data),
    });

    const { data, parseError } = await parseJsonSafe(response);

    if (parseError) {
      console.error('[ATTENDANCE_UPLOAD_PUT_PARSE_ERROR]', { status: response.status, data });
      return NextResponse.json(
        { ok: false, error: 'Failed to parse upstream response' },
        { status: 502 }
      );
    }

    if (!response.ok) {
      console.error('[ATTENDANCE_UPLOAD_PUT_ERROR]', { status: response.status, data });
      return NextResponse.json(
        { ok: false, error: `External API error: ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request format' },
      { status: 400 }
    );
  }
}

