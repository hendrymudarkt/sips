import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { BACKEND_URL } from '@/utils/api/upstreamProxy';
import { passwordResetRateLimiter } from '@/lib/auth/rateLimiter';
import { validateCsrfToken } from '@/lib/auth/csrf';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').max(255, 'Email terlalu panjang'),
});

const SUCCESS_MESSAGE = 'Jika email terdaftar, link reset password telah dikirim.';

export async function POST(request: NextRequest) {
  try {
    // === RATE LIMITING ===
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    try {
      await passwordResetRateLimiter.consume(ip);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Too many attempts. Try again in 1 minute.' },
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
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { email } = parsed.data;

    const upstream = await fetch(`${BACKEND_URL}/api/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await upstream.json().catch(() => null);

    // SECURITY: Log original error details server-side but always return the
    // same generic success message to the client to prevent user enumeration
    // (CWE-209 / CWE-203). Whether or not the email exists must be
    // indistinguishable to an attacker.
    if (!upstream.ok) {
      console.error('[FORGOT_PASSWORD_ERROR]', { status: upstream.status, data });
    }

    return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE });
  } catch {
    // SECURITY: Also return the generic message on internal errors to keep the
    // response indistinguishable from a successful submission.
    return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE });
  }
}
