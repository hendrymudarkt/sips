import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PATCH } from './route';

import { NextRequest, NextResponse } from 'next/server';

import { validateSecurity } from '@/lib/auth/security';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/lib/auth/security', () => ({
  validateSecurity: vi.fn(),
}));

vi.mock('@/utils/api/upstreamProxy', () => ({
  BACKEND_URL: 'http://trusted-backend.com',
  getTokenFromCookie: vi.fn(() => Promise.resolve('valid-token')),
}));

describe('User Status API Security', () => {beforeEach(() => {vi.clearAllMocks();
  });

  const context = { params: Promise.resolve({ id: '123' }) };

  it('should return security error if validateSecurity fails', async () => {
    const errorResponse = new Response(JSON.stringify({ ok: false, error: 'Security fail' }), {
      status: 403,
    }) as unknown as NextResponse;

    vi.mocked(validateSecurity).mockResolvedValue(errorResponse);

    const req = new NextRequest('http://localhost/api/master/user/123/status', { method: 'PATCH' });
    const res = await PATCH(req, context);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Security fail');
  });

  it('should return 401 if no token', async () => {vi.mocked(validateSecurity).mockResolvedValue(null);
    const { getTokenFromCookie } = await import('@/utils/api/upstreamProxy');

    vi.mocked(getTokenFromCookie).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/master/user/123/status', { method: 'PATCH' });
    const res = await PATCH(req, context);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthenticated');
  });

  it('should return generic error message on upstream failure', async () => {vi.mocked(validateSecurity).mockResolvedValue(null);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Detailed SQL error: update failed on table users at 10.0.0.1' }),
    } as Response);

    const req = new NextRequest('http://localhost/api/master/user/123/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Y' }),
    });
    const res = await PATCH(req, context);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to update user status');
    expect(data.ok).toBe(false);
  });
});
