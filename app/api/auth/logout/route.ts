import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL } from '@/utils/api/upstreamProxy';
import { CookieName } from '@/lib/constants';
import { validateSecurity } from '@/lib/auth/security';

// Single source of truth; force-logout uses the same list.
const COOKIES_TO_DELETE = [
  CookieName.AUTH_TOKEN,
  CookieName.LOG_ID,
  CookieName.USER_AFDELING,
  CookieName.USER_FCBA,
  CookieName.USER_FULL_NAME,
  CookieName.USER_GANG,
  CookieName.USER_KODE,
  CookieName.USER_LEVEL,
  CookieName.USER_PHOTO,
  CookieName.USER_POSITION,
  CookieName.OPT_FCBA,
  CookieName.OPT_SECTION,
  CookieName.OPT_GANG,
  CookieName.OPT_TRIPLETS,
  CookieName.SECURE_USER_LEVEL,
  CookieName.SECURE_USER_FCBA,
  CookieName.SECURE_USER_AFDELING,
  CookieName.SECURE_USER_GANG,
  CookieName.CSRF_TOKEN,
];

export async function POST(req: NextRequest): Promise<NextResponse> {
  const securityError = await validateSecurity(req);
  if (securityError) return securityError;

  const cookieStore = await cookies();
  const token = cookieStore.get(CookieName.AUTH_TOKEN)?.value;

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const response = await fetch(`${BACKEND_URL}/api/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return NextResponse.json({ ok: false, error: 'Logout failed' }, { status: response.status });
  }

  for (const name of COOKIES_TO_DELETE) {
    cookieStore.delete(name);
  }

  return NextResponse.json({ ok: true });
}


