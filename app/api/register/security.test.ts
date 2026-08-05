import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { apiRateLimiter } from '@/lib/rateLimiter';
import { validateCsrfToken } from '@/lib/csrf';
import { cookies } from 'next/headers';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/lib/rateLimiter', () => ({
  apiRateLimiter: {
    consume: vi.fn(),
  },
}));

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),
  safeJson: vi.fn((res) => res.json()),
}));

describe('Register API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 if rate limit is exceeded', async () => {
    vi.mocked(apiRateLimiter.consume).mockRejectedValue(new Error('Rate limit exceeded'));

    const req = new NextRequest('http://localhost/api/register', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain('Too many requests');
  });

  it('should return 403 if CSRF token is invalid', async () => {
    vi.mocked(apiRateLimiter.consume).mockResolvedValue({} as never);
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'wrong-token' }),
    } as never);
    vi.mocked(validateCsrfToken).mockReturnValue(false);

    const req = new NextRequest('http://localhost/api/register', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'some-token' },
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Invalid CSRF token');
  });

  it('should return generic error message on upstream failure (CWE-209)', async () => {
    vi.mocked(apiRateLimiter.consume).mockResolvedValue({} as never);
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'valid-csrf' }),
    } as never);
    vi.mocked(validateCsrfToken).mockReturnValue(true);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Detailed SQL error: table users not found' }),
      text: async () => JSON.stringify({ message: 'Detailed SQL error: table users not found' }),
    } as Response);

    const req = new NextRequest('http://localhost/api/register', {
      method: 'POST',
      body: new FormData()
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Registration failed');
    expect(data.message).toBeUndefined(); // Should not leak 'message' from upstream
  });
});
