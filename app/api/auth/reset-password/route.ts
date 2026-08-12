import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { BACKEND_URL } from '@/utils/api/upstreamProxy';
import { passwordResetRateLimiter } from '@/lib/auth/rateLimiter';
import { validateCsrfToken } from '@/lib/auth/csrf';

const resetPasswordSchema = z
  .object({
    email: z.string().min(1, 'Email wajib diisi').max(255, 'Email terlalu panjang'),
    token: z.string().min(1, 'Token wajib diisi').max(255, 'Token tidak valid'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .max(200, 'Password maksimal 200 karakter'),
    password_confirmation: z
      .string()
      .min(8, 'Konfirmasi password minimal 8 karakter')
      .max(200, 'Konfirmasi password maksimal 200 karakter'),
  })
  .refine(data => data.password === data.password_confirmation, {
    message: 'Konfirmasi password tidak cocok',
    path: ['password_confirmation'],
  });

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
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { email, token, password, password_confirmation } = parsed.data;

    const upstream = await fetch(`${BACKEND_URL}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, token, password, password_confirmation }),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any = {};
    try {
      data = await upstream.json();
    } catch {
      console.error('[RESET_PASSWORD_PARSE_ERROR]', { status: upstream.status });
      return NextResponse.json(
        { ok: false, error: 'Terjadi kesalahan. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    if (!upstream.ok) {
      // SECURITY: Log original error details server-side but return generic
      // message to prevent information leakage (CWE-209).
      console.error('[RESET_PASSWORD_ERROR]', { status: upstream.status, data });

      // The token path is safe to surface: the token itself is the proof of
      // legitimacy, so revealing that it is invalid/expired leaks nothing.
      if (upstream.status === 400 || upstream.status === 422) {
        return NextResponse.json(
          { ok: false, error: 'Token tidak valid atau sudah kedaluwarsa.' },
          { status: upstream.status }
        );
      }

      return NextResponse.json(
        { ok: false, error: 'Terjadi kesalahan. Silakan coba lagi.' },
        { status: upstream.status }
      );
    }

    return NextResponse.json({ ok: true, message: 'Password berhasil diubah.' });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Terjadi kesalahan. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
