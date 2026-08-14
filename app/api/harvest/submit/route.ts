import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { authHeaders, parseJsonSafe, unauthorizedResponse } from '@/lib/api/apiProxy';
import { harvestSubmitSchema, validateInput } from '@/lib/utils/inputSanitizer';
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
    const validation = validateInput(body, harvestSubmitSchema);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }

    // Forward validated data to backend (zod-validated; no regex stripping)
    const response = await fetch(`${BACKEND_URL}/api/uploads/harvesting`, {
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

