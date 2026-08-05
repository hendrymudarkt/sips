import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { getTokenFromCookie } from '@/utils/api/upstreamProxy';
import { cookies } from 'next/headers';
import { UserLevel } from '@/lib/constants';

vi.mock('@/utils/api/upstreamProxy', () => ({
  getTokenFromCookie: vi.fn(),
  BACKEND_URL: 'http://trusted-backend.com',
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: vi.fn(() => true),
}));

vi.mock('@/lib/security', () => ({
  validateSecurity: vi.fn(async () => null),
}));

describe('APK Upload Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    (getTokenFromCookie as Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/apk-upload', {
      method: 'POST',
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toBe('No token');
  });

  it('should return 403 if user is not an administrator', async () => {
    (getTokenFromCookie as Mock).mockResolvedValue('valid-token');
    (cookies as Mock).mockResolvedValue({
      get: vi.fn((key) => {
        if (key === 'csrf_token') return { value: 'fake-csrf' };
        if (key === 'log_id') return { value: 'user-123' };
        return undefined;
      }),
    });

    // Mock upstream profile check returning a non-admin role
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ level: UserLevel.MANDOR }),
      } as Response)
    );

    const req = new NextRequest('http://localhost/api/apk-upload', {
      method: 'POST',
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain('Forbidden');
  });

  it('should succeed if user is an administrator', async () => {
    (getTokenFromCookie as Mock).mockResolvedValue('valid-token');
    (cookies as Mock).mockResolvedValue({
      get: vi.fn((key) => {
        if (key === 'csrf_token') return { value: 'fake-csrf' };
        if (key === 'log_id') return { value: 'admin-123' };
        return undefined;
      }),
    });

    // First fetch: profile check
    // Second fetch: actual proxy call
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ level: UserLevel.ADMIN }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'APK uploaded' }),
        } as Response)
    );

    const req = new NextRequest('http://localhost/api/apk-upload', {
      method: 'POST',
      body: JSON.stringify({ filename: 'app.apk' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
