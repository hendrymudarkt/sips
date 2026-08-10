import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { CookieName, UserLevel } from '@/lib/constants';

const PUBLIC_PATHS = new Set<string>(['/', '/login', '/register', '/forgot-password', '/offline']);
const isProduction = process.env.NODE_ENV === 'production';

function generateRandomHex(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, length * 2);
}

const normalizeLevel = (level: string) => {
  const upperLevel = level.toUpperCase();
  return upperLevel === 'ADMIN' ? UserLevel.ADMIN : upperLevel;
};

const setDefaultLocale = (response: NextResponse, request: NextRequest) => {
  if (!request.cookies.has(CookieName.NEXT_LOCALE)) {
    response.cookies.set({
      name: CookieName.NEXT_LOCALE,
      value: 'id',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }
};

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_TOKEN_LENGTH = 32;

function setCsrfCookie(response: NextResponse, request: NextRequest) {
  const hasCsrf = request.cookies.get(CSRF_COOKIE_NAME);
  if (!hasCsrf) {
    const token = generateRandomHex(CSRF_TOKEN_LENGTH / 2);
    const cookieExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours (match login route)
    response.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: token,
      httpOnly: false, // Must be accessible to JavaScript for X-CSRF-Token header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      expires: cookieExpiry,
    });
  }
}

export function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.has(pathname);

  const response = NextResponse.next();

  setDefaultLocale(response, request);

  // Set CSRF token for all requests (if not already set)
  setCsrfCookie(response, request);

  // === SECURITY HEADERS ===
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=()'
  );
  const backendUrl = process.env.BACKEND_URL ? new URL(process.env.BACKEND_URL) : null;
  const backendOrigin = backendUrl ? backendUrl.origin : '';
  const backendOriginHttps = backendOrigin ? backendOrigin.replace('http://', 'https://') : '';

  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
    : '';
  const gisOrigin = process.env.NEXT_PUBLIC_GIS_URL
    ? new URL(process.env.NEXT_PUBLIC_GIS_URL).origin
    : '';
  const gisOriginHttps = gisOrigin ? gisOrigin.replace('http://', 'https://') : '';

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://img.daisyui.com ${backendOriginHttps}`.trim(),
    `font-src 'self' data:`,
    `connect-src 'self'${siteOrigin ? ` ${siteOrigin}` : ''} ${backendOrigin} ${backendOriginHttps}`.trim(),
    `frame-src 'self' https://vercel.live${gisOrigin ? ` ${gisOrigin}${gisOriginHttps && gisOriginHttps !== gisOrigin ? ` ${gisOriginHttps}` : ''}` : ''}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    `form-action 'self' https://www.google.com${gisOrigin ? ` ${gisOrigin}` : ''}${siteOrigin ? ` ${siteOrigin}` : ''}`,
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);
  if (isProduction) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // === CORS HEADERS ===
  // Hanya izinkan CORS untuk API routes di production
  if (pathname.startsWith('/api/') && isProduction) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const origin = request.headers.get('origin');

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-CSRF-Token'
      );
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  }

  // Skip static files and Next.js internals.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.match(/\.(png|jpg|svg|css|js|ico|txt|json)$/)
  ) {
    return response;
  }

  // Skip API authentication routes.
  if (pathname.startsWith('/api/auth')) {
    return response;
  }

  const token = request.cookies.get(CookieName.AUTH_TOKEN)?.value;

  // Redirect unauthenticated private routes to login.
  if (!isPublic && !token) {
    const url = new URL('/', origin);
    url.searchParams.set('redirect', pathname);
    const redirectRes = NextResponse.redirect(url);
    setDefaultLocale(redirectRes, request);
    return redirectRes;
  }

  // Redirect authenticated users away from public auth pages.
  if (isPublic && token) {
    const redirectRes = NextResponse.redirect(new URL('/dashboard', origin));
    setDefaultLocale(redirectRes, request);
    return redirectRes;
  }

  // Server-side role-based access control
  // SECURITY: Prioritize secure httpOnly cookies for role verification (CWE-807)
  const levelRaw =
    request.cookies.get(CookieName.SECURE_USER_LEVEL)?.value ||
    request.cookies.get(CookieName.USER_LEVEL)?.value ||
    '';
  const level = normalizeLevel(levelRaw);

  const redirectForbidden = () => {
    const redirectRes = NextResponse.redirect(new URL('/dashboard', origin));
    setDefaultLocale(redirectRes, request);
    return redirectRes;
  };

  // Restrict LHM approval access to permitted roles.
  if (pathname.startsWith('/approval/lhm')) {
    if (
      level !== UserLevel.ADMIN &&
      level !== UserLevel.MANDOR &&
      level !== UserLevel.MD1 &&
      level !== UserLevel.ASISTEN &&
      level !== UserLevel.KSI &&
      level !== UserLevel.MANAGER
    ) {
      return redirectForbidden();
    }
  }

  if (pathname.startsWith('/open/lhm')) {
    if (level !== UserLevel.ADMIN && level !== UserLevel.KSI) {
      return redirectForbidden();
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next|api/health|.*\\.(?:png|jpg|jpeg|svg|webp|avif|gif|ico|css|js|mjs|woff2?|ttf|otf)).*)',
  ],
};

