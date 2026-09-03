import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { authHeaders, parseJsonSafe, unauthorizedResponse } from '@/lib/api/apiProxy';
import { harvestUploadSubmitSchema, validateInput } from '@/lib/utils/inputSanitizer';
import { validateSecurity } from '@/lib/auth/security';
import { CookieName } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const token = await getTokenFromCookie();
  if (!token) return unauthorizedResponse();

  const userLevel = req.cookies.get(CookieName.SECURE_USER_LEVEL)?.value?.toUpperCase() ?? '';
  // ponytail: dikunci sementara hanya untuk ADM; hapus blok ini untuk dibuka lagi
  if (userLevel !== 'ADM' && userLevel !== 'ADMIN') {
    return NextResponse.json(
      { success: false, message: 'Akses ditolak. Hanya Admin yang dapat mengakses fitur ini.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    // Validate dan sanitize input
    const validation = validateInput(body, harvestUploadSubmitSchema);
    if (!validation.success) {
      console.error('[API_HARVEST_SUBMIT_VALIDATION_ERROR]', {
        validationError: validation.error,
        issues: validation.issues,
        body: JSON.stringify(body).slice(0, 2000),
      });
      return NextResponse.json(
        { success: false, message: validation.error, issues: validation.issues || [] },
        { status: 400 }
      );
    }

    // Forward validated data to backend (zod-validated; no regex stripping)
    const response = await fetch(`${BACKEND_URL}/api/uploads/harvesting/mobile`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(validation.data),
    });

    const { data, parseError } = await parseJsonSafe(response);
    if (parseError) {
      return NextResponse.json(
        { success: false, message: 'Invalid response format' },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to submit harvest' },
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
