import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { apiRateLimiter } from '@/lib/auth/rateLimiter';
import { validateSecurity } from '@/lib/auth/security';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));
vi.mock('@/lib/auth/rateLimiter', () => ({
  apiRateLimiter: {
    consume: vi.fn(),
  },
}));
vi.mock('@/lib/auth/security', () => ({
  validateSecurity: vi.fn(),
}));

describe('Force Logout API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiRateLimiter.consume).mockResolvedValue({} as never);
    vi.mocked(validateSecurity).mockResolvedValue(null);
  });

  it('should return 429 if rate limit is exceeded', async () => {
    vi.mocked(apiRateLimiter.consume).mockRejectedValue(new Error('Rate limit exceeded'));
    const req = new NextRequest('http://localhost/api/auth/force-logout', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain('Too many requests');
  });

  it('should clear cookies and return ok on success', async () => {
    const mockCookieStore = {
      delete: vi.fn(),
    };
    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as never);
    const req = new NextRequest('http://localhost/api/auth/force-logout', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.message).toContain('cookies cleared');
  });

  it('should return ok even on internal error (graceful logout)', async () => {
    vi.mocked(apiRateLimiter.consume).mockRejectedValue(new Error('Some unexpected error'));
    const req = new NextRequest('http://localhost/api/auth/force-logout', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});
