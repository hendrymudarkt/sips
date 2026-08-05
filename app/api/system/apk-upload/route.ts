import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL, getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { UserLevel } from '@/lib/constants';
import { validateSecurity } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const securityError = await validateSecurity(req);
    if (securityError) return securityError;

    const token = await getTokenFromCookie();
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token' }, { status: 401 });
    }

    // SECURITY: Restricted to ADMIN/ADM only (CWE-285)
    // Only administrators are allowed to upload APKs.
    // Verification is done against the upstream backend profile.
    const cookieStore = await cookies();
    const userId = cookieStore.get('log_id')?.value;
    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID missing' }, { status: 400 });
    }

    const profileRes = await fetch(`${BACKEND_URL}/api/user/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!profileRes.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to verify permissions' },
        { status: 500 }
      );
    }

    const profileData = await profileRes.json();
    const level = (profileData?.level || '').toUpperCase();

    if (level !== UserLevel.ADMIN && level !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const externalUrl = `${BACKEND_URL}/api/app/apk`;

    // Forward request body stream langsung ke Laravel
    const headers = new Headers();
    const contentType = req.headers.get('content-type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');

    const response = await fetch(externalUrl, {
      method: 'POST',
      headers,
      body: req.body,
      // @ts-expect-error duplex required for streaming body
      duplex: 'half',
    });

    if (!response.ok) {
      const text = await response.text();
      const details = text.length > 1200 ? text.substring(0, 1200) + '...' : text;
      console.error('âŒ Laravel error response:', details);
      return NextResponse.json(
        {
          success: false,
          message: `Laravel error (HTTP ${response.status})`,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('âŒ Proxy crash:', error.message, error.stack);
    return NextResponse.json({ success: false, message: 'Proxy error occurred' }, { status: 500 });
  }
}


