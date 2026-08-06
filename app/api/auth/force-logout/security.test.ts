import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { apiRateLimiter } from '@/lib/auth/rateLimiter';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/auth/rateLimiter', () => ({
  apiRateLimiter: {
    consume: vi.fn(),
  },
}));

describe('Force Logout API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.mocked(apiRateLimiter.consume).mockResolvedValue({} as never);
    const mockCookieStore = {
      get: vi.fn(() => ({ value: 'valid-csrf-token' })),
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
