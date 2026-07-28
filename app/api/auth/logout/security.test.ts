import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: vi.fn(() => true),
}));

vi.mock('@/lib/rateLimiter', () => ({
  apiRateLimiter: {
    consume: vi.fn().mockResolvedValue({}),
  },
}));

describe('Logout Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 if CSRF token is missing', async () => {
    (cookies as Mock).mockResolvedValue({
      get: vi.fn((key) => {
        if (key === 'csrf_token') return undefined;
        return undefined;
      }),
    });

    const req = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Invalid CSRF token');
  });

  it('should proceed if CSRF token is valid and authenticated', async () => {
    (cookies as Mock).mockResolvedValue({
      get: vi.fn((key) => {
        if (key === 'csrf_token') return { value: 'valid-csrf' };
        if (key === 'auth_token') return { value: 'valid-auth' };
        return undefined;
      }),
      delete: vi.fn(),
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
      } as Response)
    );

    const req = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': 'valid-csrf',
      },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
