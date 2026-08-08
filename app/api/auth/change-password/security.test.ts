import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest, NextResponse } from 'next/server';
import { validateSecurity } from '@/lib/auth/security';
import { changePasswordRateLimiter } from '@/lib/auth/rateLimiter';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/lib/auth/security', () => ({
  validateSecurity: vi.fn(),
}));

vi.mock('@/lib/auth/rateLimiter', () => ({
  changePasswordRateLimiter: {
    consume: vi.fn(),
  },
}));

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Change Password API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(changePasswordRateLimiter.consume).mockResolvedValue(undefined as never);
  });

  it('should return security error if validateSecurity fails', async () => {
    const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
      status: 403,
    }) as unknown as NextResponse;
    vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

    const req = new NextRequest('http://localhost/api/auth/change-password', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Security fail');
  });

  it('should return 429 if changePasswordRateLimiter limit is exceeded', async () => {
    vi.mocked(validateSecurity).mockResolvedValue(null);
    vi.mocked(changePasswordRateLimiter.consume).mockRejectedValue(
      new Error('Rate limit exceeded')
    );

    const req = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: 'oldpassword123', new_password: 'Newpassword123!' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe('Too many password change attempts. Try again in 1 minute.');
  });

  it('should return 400 if new password lacks uppercase letters', async () => {
    vi.mocked(validateSecurity).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: 'oldpassword123', new_password: 'newpassword123!' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Password harus mengandung setidaknya satu huruf besar');
  });

  it('should return 400 if new password lacks numbers', async () => {
    vi.mocked(validateSecurity).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: 'oldpassword123',
        new_password: 'Newpasswordsymbol!',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Password harus mengandung setidaknya satu angka');
  });

  it('should return 400 if new password lacks symbols', async () => {
    vi.mocked(validateSecurity).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: 'oldpassword123', new_password: 'Newpassword123' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Password harus mengandung setidaknya satu simbol');
  });

  it('should return 401 if no token', async () => {
    vi.mocked(validateSecurity).mockResolvedValue(null);
    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(() => undefined),
    } as never);

    const req = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: 'oldpassword123', new_password: 'Newpassword123!' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthenticated');
  });

  it('should return generic error message on upstream failure', async () => {
    vi.mocked(validateSecurity).mockResolvedValue(null);
    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(() => ({ value: 'valid-token' })),
    } as never);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Detailed SQL error: password hash mismatch at backend' }),
    } as Response);

    const req = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: 'oldpassword123', new_password: 'Newpassword123!' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to change password');
  });

  it('should return generic error on internal crash', async () => {
    vi.mocked(validateSecurity).mockResolvedValue(null);
    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockRejectedValue(new Error('Crash with stack trace details'));

    const req = new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: 'oldpassword123', new_password: 'Newpassword123!' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Internal server error');
  });
});
