import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { BACKEND_URL } from '@/utils/api/upstreamProxy';
import { loginRateLimiter } from '@/lib/auth/rateLimiter';
import { validateCsrfToken } from '@/lib/auth/csrf';
import { CookieName } from '@/lib/constants';


const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    // === RATE LIMITING ===
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    try {
      await loginRateLimiter.consume(ip);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Too many login attempts. Try again in 1 minute.' },
        { status: 429 }
      );
    }

    // === CSRF VALIDATION ===
    const cookieStore = await cookies();
    const csrfToken = cookieStore.get('csrf_token')?.value;
    if (!csrfToken || !validateCsrfToken(request, csrfToken)) {
      return NextResponse.json({ ok: false, error: 'Invalid CSRF token' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
    }
    const { username, password } = parsed.data;

    const upstream = await fetch(`${BACKEND_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const rawText = await upstream.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      console.error('[AUTH_LOGIN_PARSE_ERROR]', { status: upstream.status, rawText: rawText?.substring(0, 200) });
      return NextResponse.json(
        { ok: false, error: 'Invalid response from authentication server' },
        { status: 502 }
      );
    }

    if (!upstream.ok) {
      // SECURITY: Log original error details server-side but return generic message
      // to client to prevent information leakage (CWE-209).
      console.error('[AUTH_LOGIN_ERROR]', { status: upstream.status, data });
      return NextResponse.json(
        { ok: false, error: 'Invalid credentials or authentication error' },
        { status: upstream.status }
      );
    }

    const token = data?.token;
    const userId = data?.user?.id;
    const userKode = data?.user?.idkaryawan;
    const userFcba = data?.user?.fcba;
    const userAfdeling = data?.user?.afdeling;
    const userGang = data?.user?.gangcode;
    const userFullName = data?.user?.fullname;
    const userLevel = data?.user?.level;
    const userPosition = data?.user?.position;
    const userPhoto = data?.user?.photo;

    if (!token || !userId) {
      return NextResponse.json({ ok: false, error: 'Invalid login response' }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true });

    // Base cookie utk auth (server-only)
    const cookieExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    const base = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      expires: cookieExpiry,
    };

    // Base cookie utk client-side info (client-readable)
    const clientBase = {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      expires: cookieExpiry,
    };

    // Set cookie auth & info user
    res.cookies.set('auth_token', String(token), base);
    res.cookies.set('log_id', String(userId), base);

    // Set CSRF token cookie (generated server-side via Web Crypto API)
    const csrfBytes = new Uint8Array(16);
    crypto.getRandomValues(csrfBytes);
    const csrfHex = Array.from(csrfBytes, b => b.toString(16).padStart(2, '0')).join('');
    res.cookies.set('csrf_token', csrfHex, {
      httpOnly: false, // Must be accessible to JavaScript for X-CSRF-Token header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      expires: cookieExpiry,
    });

    // User info disimpan di client-readable cookies
    if (userKode) res.cookies.set('user_Kode', String(userKode), clientBase);
    if (userFcba) res.cookies.set('user_Fcba', String(userFcba), clientBase);
    if (userAfdeling) res.cookies.set('user_Afdeling', String(userAfdeling), clientBase);
    if (userGang) res.cookies.set('user_Gang', String(userGang), clientBase);
    if (userFullName) res.cookies.set('user_FullName', String(userFullName), clientBase);
    if (userLevel) res.cookies.set('user_Level', String(userLevel), clientBase);
    if (userPosition) res.cookies.set('user_Position', String(userPosition), clientBase);
    if (userPhoto) res.cookies.set('user_Photo', String(userPhoto), clientBase);

    // SECURE (httpOnly) mirrored cookies for server-side authorization
    if (userLevel) res.cookies.set(CookieName.SECURE_USER_LEVEL, String(userLevel), base);
    if (userFcba) res.cookies.set(CookieName.SECURE_USER_FCBA, String(userFcba), base);
    if (userAfdeling) res.cookies.set(CookieName.SECURE_USER_AFDELING, String(userAfdeling), base);
    if (userGang) res.cookies.set(CookieName.SECURE_USER_GANG, String(userGang), base);

    return res;
  } catch (error) {
    console.error('[AUTH_LOGIN_INTERNAL_ERROR]', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}


