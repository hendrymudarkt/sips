import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getTokenFromCookie, BACKEND_URL } from '@/utils/api/upstreamProxy';
import { UserLevel } from '@/lib/constants';
import { validateSecurity } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const token = await getTokenFromCookie();

  if (!token) {
    return NextResponse.json({ success: false, message: 'No token' }, { status: 401 });
  }

  // SECURITY: Restricted to ADMIN/ADM only (CWE-285)
  // This endpoint returns the raw auth token to the client, bypassing httpOnly protection.
  // It should ONLY be accessible to administrators for APK upload purposes.

  // We fetch the profile from the upstream backend to verify the level securely,
  // rather than relying solely on client-side cookies which can be tampered with.
  try {
    const userId = (await cookies()).get('log_id')?.value;
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

    if (level !== UserLevel.ADMIN) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error('[AUTH_TOKEN_GET_ERROR]', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}


