import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { authHeaders, parseJsonSafe, unauthorizedResponse } from '@/lib/api/apiProxy';
import { harvestUploadSubmitSchema, validateInput } from '@/lib/utils/inputSanitizer';
import { toBackendDateTime } from '@/utils/helpers/datetime';
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
  // Open Harvesting SPB: ADM penuh; KSI saja (KRA tidak boleh open)
  if (!['ADM', 'ADMIN', 'KSI'].includes(userLevel)) {
    return NextResponse.json(
      { success: false, message: 'Akses ditolak. Fitur ini khusus Admin dan KSI.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json() as { data?: Array<Record<string, unknown>> };

    // Petakan ke 3 key yang dibutuhkan open_harvesting_mobile (toleran: camel/UPPER, spbno/nospb)
    const mapped = {
      data: (Array.isArray(body?.data) ? body.data : []).map((r) => ({
        spbno: String(r.spbno ?? r.nospb ?? r.SPBNO ?? '').trim(),
        fieldcode: String(r.fieldcode ?? r.FIELDCODE ?? '').trim(),
        harvestdate: toBackendDateTime(String(r.harvestdate ?? r.HARVESTDATE ?? '')),
      })),
    };

    // Validate dan sanitize input
    const validation = validateInput(mapped, harvestUploadSubmitSchema);
    if (!validation.success) {
      console.error('[API_HARVEST_OPEN_VALIDATION_ERROR]', {
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
    const response = await fetch(`${BACKEND_URL}/api/uploads/harvesting/mobile/open`, {
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
      // Pesan backend dicatat di log server saja; ke client tetap generik agar tidak bocor detail DB.
      const backendBody = data as { message?: string; error?: string };
      console.error('[API_HARVEST_OPEN_BACKEND_ERROR]', {
        status: response.status,
        message: backendBody?.message || 'no message',
        error: backendBody?.error || 'no error detail',
      });
      return NextResponse.json(
        { success: false, message: 'Failed to open harvest' },
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
