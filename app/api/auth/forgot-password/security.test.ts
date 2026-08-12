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

describe('Forgot Password API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 if rate limit is exceeded', async () => {
    vi.mocked(passwordResetRateLimiter.consume).mockRejectedValue(new Error('Rate limit exceeded'));
    const req = new NextRequest('http://localhost/api/auth/forgot-password', {
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

    const req = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'some-token' },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Invalid CSRF token');
  });

  it('should return 400 for invalid body', async () => {
    vi.mocked(passwordResetRateLimiter.consume).mockResolvedValue({} as never);
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'valid-csrf' }),
    } as never);
    vi.mocked(validateCsrfToken).mockReturnValue(true);

    const req = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'valid-csrf',
      },
      body: JSON.stringify({ email: '' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  it('should always return 200 with generic message even if upstream fails (CWE-209)', async () => {
    vi.mocked(passwordResetRateLimiter.consume).mockResolvedValue({} as never);
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'valid-csrf' }),
    } as never);
    vi.mocked(validateCsrfToken).mockReturnValue(true);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'User not found' }),
    } as Response);

    const req = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'valid-csrf',
      },
      body: JSON.stringify({ email: 'john@example.com' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.message).toBe('Jika email terdaftar, link reset password telah dikirim.');
    expect(data.message).not.toContain('User not found');
  });

  it('should proxy to backend and return generic success on 200', async () => {
    vi.mocked(passwordResetRateLimiter.consume).mockResolvedValue({} as never);
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'valid-csrf' }),
    } as never);
    vi.mocked(validateCsrfToken).mockReturnValue(true);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: 'Link sent' }),
    } as Response);

    const req = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'valid-csrf',
      },
      body: JSON.stringify({ email: 'john@example.com' }),
    });
    const res = await POST(req);

    const expectedUrl = 'http://trusted-backend.com/api/forgot-password';
    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'john@example.com' }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.message).toBe('Jika email terdaftar, link reset password telah dikirim.');
  });
});
