import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { authHeaders, parseJsonSafe, unauthorizedResponse } from '@/lib/api/apiProxy';
import { lhmSubmitSchema, validateInput } from '@/lib/utils/inputSanitizer';
import { validateSecurity } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const token = await getTokenFromCookie();
  if (!token) return unauthorizedResponse();

  try {
    const body = await req.json();

    // Validate dan sanitize input
    const validation = validateInput(body, lhmSubmitSchema);
    if (!validation.success) {
      console.error('[API_OPEN_LHM_SUBMIT_VALIDATION_ERROR]', {
        validationError: validation.error,
        body: JSON.stringify(body),
      });
      return NextResponse.json(
        {
          success: false,
          message: validation.error,
          // debug: kembalikan detail isu validasi
          issues: validation.issues || [],
        },
        { status: 400 }
      );
    }

    // Forward ke backend
    // Hanya ID dan ROWDATA yang dikirim, tanpa sanitasi karena ROWDATA
    // bisa berisi serialized data yang rusak jika kena sanitizeHtml
    const response = await fetch(`${BACKEND_URL}/api/uploads/open_lhm_data/mobile`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(validation.data),
    });

    const { data, parseError } = await parseJsonSafe(response);
    if (parseError) {
      return NextResponse.json(
        { success: false, message: 'Invalid response format from upstream' },
        { status: 502 }
      );
    }

    if (!response.ok) {
      // SECURITY: Log detailed error server-side but return generic message to client (CWE-209)
      console.error('[API_OPEN_LHM_SUBMIT_POST_ERROR]', { status: response.status, data });
      return NextResponse.json(
        {
          success: false,
          message: 'Submit failed',
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request format' },
      { status: 400 }
    );
  }
}

