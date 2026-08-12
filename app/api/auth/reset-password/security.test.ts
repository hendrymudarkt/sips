import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { passwordResetRateLimiter } from '@/lib/auth/rateLimiter';
import { validateCsrfToken } from '@/lib/auth/csrf';
import { cookies } from 'next/headers';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/lib/auth/rateLimiter', () => ({
  passwordResetRateLimiter: {
    consume: vi.fn(),
  },
}));

vi.mock('@/lib/auth/csrf', () => ({
  validateCsrfToken: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
}));

describe('Reset Password API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 if rate limit is exceeded', async () => {
    vi.mocked(passwordResetRateLimiter.consume).mockRejectedValue(new Error('Rate limit exceeded'));
    const req = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain('Too many attempts');
  });

  it('should return 403 if CSRF token is invalid', async () => {
    vi.mocked(passwordResetRateLimiter.consume).mockResolvedValue({} as never);
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'wrong-token' }),
    } as never);
    vi.mocked(validateCsrfToken).mockReturnValue(false);

    const req = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'some-token' },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Invalid CSRF token');
  });

  it('should return 400 when passwords do not match', async () => {
    vi.mocked(passwordResetRateLimiter.consume).mockResolvedValue({} as never);
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'valid-csrf' }),
    } as never);
    vi.mocked(validateCsrfToken).mockReturnValue(true);

    const req = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'valid-csrf',
      },
      body: JSON.stringify({
        email: 'john@example.com',
        token: 'sometoken',
        password: 'rahasia123',
        password_confirmation: 'berbeda123',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('tidak cocok');
  });

  it('should return 400 with generic invalid-token message on upstream 400 (CWE-209)', async () => {
    vi.mocked(passwordResetRateLimiter.consume).mockResolvedValue({} as never);
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'valid-csrf' }),
    } as never);
    vi.mocked(validateCsrfToken).mockReturnValue(true);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Token expired: abc123' }),
    } as Response);

    const req = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'valid-csrf',
      },
      body: JSON.stringify({
        email: 'john@example.com',
        token: 'invalidtoken',
        password: 'rahasia123',
        password_confirmation: 'rahasia123',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBe('Token tidak valid atau sudah kedaluwarsa.');
    expect(data.message).toBeUndefined();
  });

  it('should proxy to backend and return success on 200', async () => {
    vi.mocked(passwordResetRateLimiter.consume).mockResolvedValue({} as never);
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'valid-csrf' }),
    } as never);
    vi.mocked(validateCsrfToken).mockReturnValue(true);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'Password changed' }),
    } as Response);

    const req = new NextRequest('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'valid-csrf',
      },
      body: JSON.stringify({
        email: 'john@example.com',
        token: 'sometoken',
        password: 'rahasia123',
        password_confirmation: 'rahasia123',
      }),
    });
    const res = await POST(req);

    const expectedUrl = 'http://trusted-backend.com/api/reset-password';
    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'john@example.com',
          token: 'sometoken',
          password: 'rahasia123',
          password_confirmation: 'rahasia123',
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.message).toBe('Password berhasil diubah.');
  });
});
